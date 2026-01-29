/**
 * File Security Validator
 *
 * Validação de segurança para uploads de arquivos PPTX
 * Protege contra: magic bytes inválidos, ZIP bombs, path traversal
 */

import JSZip from 'jszip';
import { logger } from '@lib/logger';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  details: {
    magicBytes: boolean;
    zipBomb: boolean;
    pathTraversal: boolean;
  };
}

/**
 * Valida arquivo PPTX com múltiplas camadas de segurança
 *
 * @param buffer - Buffer do arquivo a validar
 * @returns Resultado da validação
 */
export async function validatePPTXFile(buffer: Buffer): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    valid: true,
    details: {
      magicBytes: false,
      zipBomb: false,
      pathTraversal: false
    }
  };

  try {
    // Check 1: Magic bytes
    if (!isValidPPTXMagicBytes(buffer)) {
      return {
        valid: false,
        error: 'Arquivo não é um ZIP válido (PPTX corrompido ou formato inválido)',
        details: result.details
      };
    }
    result.details.magicBytes = true;

    // Check 2: Load ZIP and validate structure
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch (error) {
      logger.warn('Failed to load ZIP file', {
        service: 'FileValidator',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        valid: false,
        error: 'Arquivo PPTX corrompido ou inválido',
        details: result.details
      };
    }

    // Check 3: ZIP bomb protection
    try {
      await validateZipBomb(zip, buffer);
      result.details.zipBomb = true;
    } catch (error) {
      logger.warn('ZIP bomb detected', {
        service: 'FileValidator',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        details: result.details
      };
    }

    // Check 4: Path traversal attack
    if (hasPathTraversal(zip)) {
      logger.warn('Path traversal detected in ZIP', {
        service: 'FileValidator'
      });

      return {
        valid: false,
        error: 'Arquivo contém caminhos maliciosos (path traversal detectado)',
        details: result.details
      };
    }
    result.details.pathTraversal = true;

    logger.info('File validation passed', {
      service: 'FileValidator',
      fileSize: buffer.length,
      details: result.details
    });

    return result;

  } catch (error) {
    logger.error('File validation error', error instanceof Error ? error : new Error(String(error)), {
      service: 'FileValidator'
    });

    return {
      valid: false,
      error: 'Erro ao validar arquivo',
      details: result.details
    };
  }
}

/**
 * Verifica magic bytes do arquivo ZIP (PPTX é um ZIP)
 *
 * Magic bytes válidos para ZIP:
 * - 50 4B 03 04 (local file header)
 * - 50 4B 05 06 (end of central directory)
 * - 50 4B 07 08 (spanned archive)
 */
function isValidPPTXMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  const magic = buffer.slice(0, 4);

  // Verificar assinatura ZIP: PK\x03\x04 ou PK\x05\x06 ou PK\x07\x08
  return (
    magic[0] === 0x50 && // 'P'
    magic[1] === 0x4B && // 'K'
    (magic[2] === 0x03 || magic[2] === 0x05 || magic[2] === 0x07)
  );
}

/**
 * Valida ZIP bomb (arquivo comprimido malicioso)
 *
 * Proteções:
 * - Compression ratio máximo de 100x
 * - Tamanho descompactado máximo de 500MB
 */
async function validateZipBomb(zip: JSZip, buffer: Buffer): Promise<void> {
  let totalUncompressed = 0;

  zip.forEach((relativePath, file) => {
    // Acumular tamanho descompactado
    const rawData = (file as { _data?: { uncompressedSize?: number } })._data;
    const size = typeof rawData?.uncompressedSize === 'number' ? rawData.uncompressedSize : 0;
    totalUncompressed += size;
  });

  const compressionRatio = totalUncompressed / buffer.length;

  // Check 1: Compression ratio suspicioso (> 100x)
  if (compressionRatio > 100) {
    throw new Error(
      `ZIP bomb detectado: taxa de compressão suspeita (${compressionRatio.toFixed(1)}x > 100x)`
    );
  }

  // Check 2: Tamanho descompactado muito grande (> 500MB)
  const MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024; // 500MB
  if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
    const sizeMB = (totalUncompressed / (1024 * 1024)).toFixed(1);
    throw new Error(
      `ZIP bomb detectado: arquivo descompactado muito grande (${sizeMB}MB > 500MB)`
    );
  }

  logger.debug('ZIP bomb validation passed', {
    service: 'FileValidator',
    compressionRatio: compressionRatio.toFixed(2),
    uncompressedSizeMB: (totalUncompressed / (1024 * 1024)).toFixed(2)
  });
}

/**
 * Detecta path traversal em nomes de arquivos do ZIP
 *
 * Bloqueia:
 * - Caminhos relativos: ../../../etc/passwd
 * - Caminhos absolutos: /etc/passwd ou C:\Windows\system32
 */
function hasPathTraversal(zip: JSZip): boolean {
  let hasMalicious = false;

  zip.forEach((relativePath) => {
    // Check for path traversal patterns
    if (relativePath.includes('../') || relativePath.includes('..\\')) {
      logger.warn('Path traversal detected', {
        service: 'FileValidator',
        path: relativePath,
        pattern: 'relative_traversal'
      });
      hasMalicious = true;
    }

    // Check for absolute paths (Unix)
    if (relativePath.startsWith('/')) {
      logger.warn('Absolute path detected', {
        service: 'FileValidator',
        path: relativePath,
        pattern: 'absolute_unix'
      });
      hasMalicious = true;
    }

    // Check for absolute paths (Windows)
    if (/^[A-Z]:[\\\/]/i.test(relativePath)) {
      logger.warn('Absolute Windows path detected', {
        service: 'FileValidator',
        path: relativePath,
        pattern: 'absolute_windows'
      });
      hasMalicious = true;
    }

    // Check for null bytes (path truncation attack)
    if (relativePath.includes('\0')) {
      logger.warn('Null byte detected in path', {
        service: 'FileValidator',
        path: relativePath,
        pattern: 'null_byte'
      });
      hasMalicious = true;
    }
  });

  return hasMalicious;
}

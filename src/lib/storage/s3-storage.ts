import AWS from 'aws-sdk';
import { createReadStream, createWriteStream, promises as fsPromises } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configurar AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export interface UploadResult {
  url: string;
  key: string;
  etag: string;
  size: number;
}

export interface S3Config {
  bucket: string;
  region: string;
  acl: 'private' | 'public-read' | 'public-read-write';
}

export class S3StorageService {
  private bucket: string;
  private region: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET!;
    this.region = process.env.AWS_REGION!;
  }

  /**
   * Upload de arquivo para S3
   */
  async uploadFile(
    filePath: string,
    key?: string,
    contentType?: string,
    isPublic: boolean = true,
  ): Promise<UploadResult> {
    const fileKey = key || this.generateFileKey(filePath);
    const acl = isPublic ? 'public-read' : 'private';

    try {
      // Upload do arquivo
      const result = await s3
        .upload({
          Bucket: this.bucket,
          Key: fileKey,
          Body: createReadStream(filePath),
          ContentType: contentType || this.getContentType(filePath),
          ACL: acl,
          Metadata: {
            originalName: filePath.split('/').pop() || 'unknown',
            uploadedAt: new Date().toISOString(),
          },
        })
        .promise();

      return {
        url: result.Location,
        key: result.Key,
        etag: result.ETag!,
        size: 0, // Obter do arquivo local
      };
    } catch (error) {
      console.error('Erro no upload S3:', error);
      throw new Error(`Falha no upload para S3: ${error.message}`);
    }
  }

  /**
   * Upload de buffer para S3
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType?: string,
    isPublic: boolean = true,
  ): Promise<UploadResult> {
    const fileKey = this.generateFileKey(fileName);
    const acl = isPublic ? 'public-read' : 'private';

    try {
      const result = await s3
        .upload({
          Bucket: this.bucket,
          Key: fileKey,
          Body: buffer,
          ContentType: contentType || this.getContentType(fileName),
          ACL: acl,
          Metadata: {
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        })
        .promise();

      return {
        url: result.Location,
        key: result.Key,
        etag: result.ETag!,
        size: buffer.length,
      };
    } catch (error) {
      console.error('Erro no upload de buffer S3:', error);
      throw new Error(`Falha no upload de buffer para S3: ${error.message}`);
    }
  }

  /**
   * Download de arquivo do S3
   */
  async downloadFile(key: string, localPath: string): Promise<string> {
    try {
      const result = await s3
        .getObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      // Salvar arquivo localmente
      await fsPromises.writeFile(localPath, result.Body as Buffer);

      return localPath;
    } catch (error) {
      console.error('Erro no download S3:', error);
      throw new Error(`Falha no download do S3: ${error.message}`);
    }
  }

  /**
   * Download de arquivo como buffer
   */
  async downloadBuffer(key: string): Promise<Buffer> {
    try {
      const result = await s3
        .getObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      return result.Body as Buffer;
    } catch (error) {
      console.error('Erro no download de buffer S3:', error);
      throw new Error(`Falha no download de buffer do S3: ${error.message}`);
    }
  }

  /**
   * Listar arquivos em um diretório
   */
  async listFiles(prefix: string, maxKeys: number = 100): Promise<AWS.S3.ObjectList> {
    try {
      const result = await s3
        .listObjectsV2({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys,
        })
        .promise();

      return result.Contents || [];
    } catch (error) {
      console.error('Erro ao listar arquivos S3:', error);
      throw new Error(`Falha ao listar arquivos do S3: ${error.message}`);
    }
  }

  /**
   * Deletar arquivo do S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await s3
        .deleteObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
    } catch (error) {
      console.error('Erro ao deletar arquivo S3:', error);
      throw new Error(`Falha ao deletar arquivo do S3: ${error.message}`);
    }
  }

  /**
   * Deletar múltiplos arquivos
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      const deleteParams: AWS.S3.DeleteObjectsRequest = {
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      };

      await s3.deleteObjects(deleteParams).promise();
    } catch (error) {
      console.error('Erro ao deletar múltiplos arquivos S3:', error);
      throw new Error(`Falha ao deletar múltiplos arquivos do S3: ${error.message}`);
    }
  }

  /**
   * Verificar se arquivo existe
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obter metadados do arquivo
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const result = await s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      return result;
    } catch (error) {
      console.error('Erro ao obter metadados S3:', error);
      throw new Error(`Falha ao obter metadados do S3: ${error.message}`);
    }
  }

  /**
   * Gerar URL assinada para acesso privado
   */
  getSignedUrl(key: string, expiresIn: number = 3600): string {
    return s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  /**
   * Gerar URL de upload presignada
   */
  getUploadSignedUrl(key: string, contentType: string, expiresIn: number = 3600): string {
    return s3.getSignedUrl('putObject', {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Expires: expiresIn,
      ACL: 'public-read',
    });
  }

  /**
   * Copiar arquivo dentro do S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await s3
        .copyObject({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourceKey}`,
          Key: destinationKey,
          ACL: 'public-read',
        })
        .promise();
    } catch (error) {
      console.error('Erro ao copiar arquivo S3:', error);
      throw new Error(`Falha ao copiar arquivo do S3: ${error.message}`);
    }
  }

  /**
   * Mover arquivo (copiar + deletar original)
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
  }

  /**
   * Gerar chave única para arquivo
   */
  private generateFileKey(fileName: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    const extension = fileName.split('.').pop() || '';
    const baseName = fileName.split('.').slice(0, -1).join('.');

    return `uploads/${timestamp}/${uuid}-${baseName}.${extension}`;
  }

  /**
   * Obter content type baseado na extensão
   */
  private getContentType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();

    const contentTypes: { [key: string]: string } = {
      mp4: 'video/mp4',
      avi: 'video/avi',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };

    return contentTypes[extension!] || 'application/octet-stream';
  }

  /**
   * Obter URL pública do arquivo
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Calcular tamanho total de diretório
   */
  async getDirectorySize(prefix: string): Promise<number> {
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      const result = await s3
        .listObjectsV2({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
        .promise();

      if (result.Contents) {
        totalSize += result.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      }

      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    return totalSize;
  }

  /**
   * Limpar arquivos antigos
   */
  async cleanupOldFiles(prefix: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const files = await this.listFiles(prefix, 1000);
    const filesToDelete: string[] = [];

    files.forEach((file) => {
      if (file.LastModified && file.LastModified < cutoffDate) {
        filesToDelete.push(file.Key!);
      }
    });

    if (filesToDelete.length > 0) {
      await this.deleteFiles(filesToDelete);
    }

    return filesToDelete.length;
  }
}

// Singleton instance
export const s3Storage = new S3StorageService();

export default s3Storage;

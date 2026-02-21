/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 GERADOR DE CHAVES VAPID PARA PUSH NOTIFICATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gera chaves VAPID (Voluntary Application Server Identification) para
 * habilitar Web Push Notifications no sistema.
 * 
 * Versão: 1.0
 * Data: 10/10/2025
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

class VapidKeyGenerator {
  private log(message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[level]}${icons[level]} ${message}${colors.reset}`);
  }

  /**
   * Gera par de chaves VAPID
   */
  generateVapidKeys(): VapidKeys {
    this.log('\n🔐 Gerando chaves VAPID...', 'info');

    // Gerar par de chaves usando ECDSA P-256
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'der'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der'
      }
    });

    // Converter para base64 URL-safe
    const publicKeyBase64 = this.bufferToBase64Url(publicKey);
    const privateKeyBase64 = this.bufferToBase64Url(privateKey);

    this.log('✅ Chaves VAPID geradas com sucesso!', 'success');
    this.log(`   Public Key length: ${publicKeyBase64.length} chars`, 'info');
    this.log(`   Private Key length: ${privateKeyBase64.length} chars`, 'info');

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64
    };
  }

  /**
   * Converte Buffer para Base64 URL-safe
   */
  private bufferToBase64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Atualiza arquivo .env com as chaves VAPID
   */
  updateEnvFile(keys: VapidKeys): void {
    this.log('\n📝 Atualizando arquivo .env...', 'info');

    const envPath = path.join(process.cwd(), '..', '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      this.log('   .env existente encontrado', 'info');
    } else {
      this.log('   Criando novo arquivo .env', 'info');
    }

    // Remover chaves VAPID antigas se existirem
    envContent = envContent
      .split('\n')
      .filter(line => {
        const key = line.split('=')[0].trim();
        return key !== 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' &&
               key !== 'VAPID_PUBLIC_KEY' &&
               key !== 'VAPID_PRIVATE_KEY' &&
               key !== 'VAPID_SUBJECT';
      })
      .join('\n');

    // Adicionar seção VAPID
    const vapidSection = `
# ═══════════════════════════════════════════════════════════════
# 🔔 PUSH NOTIFICATIONS (VAPID)
# ═══════════════════════════════════════════════════════════════
# Chaves geradas em: ${new Date().toISOString()}

# Public Key (usado no cliente)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"

# Private Key (usado no servidor - MANTENHA SEGURO!)
VAPID_PUBLIC_KEY="${keys.publicKey}"
VAPID_PRIVATE_KEY="${keys.privateKey}"

# Subject (email de contato do administrador)
VAPID_SUBJECT="admin@cursostecno.com.br"
`;

    // Adicionar ao final do arquivo
    envContent = envContent.trim() + '\n' + vapidSection;

    // Salvar arquivo
    fs.writeFileSync(envPath, envContent);

    this.log('✅ Arquivo .env atualizado com sucesso!', 'success');
    this.log(`   Localização: ${envPath}`, 'info');
  }

  /**
   * Cria arquivo de backup do .env
   */
  createBackup(): void {
    const envPath = path.join(process.cwd(), '..', '.env');
    
    if (fs.existsSync(envPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(process.cwd(), '..', `.env.backup-${timestamp}`);
      
      fs.copyFileSync(envPath, backupPath);
      this.log(`📦 Backup criado: .env.backup-${timestamp}`, 'info');
    }
  }

  /**
   * Exibe as chaves geradas
   */
  displayKeys(keys: VapidKeys): void {
    this.log('\n╔═══════════════════════════════════════════════════════════════════╗', 'info');
    this.log('║                    🔐 CHAVES VAPID GERADAS                       ║', 'info');
    this.log('╚═══════════════════════════════════════════════════════════════════╝\n', 'info');

    this.log('📋 PUBLIC KEY (Cliente):', 'info');
    this.log(`   ${keys.publicKey}\n`, 'success');

    this.log('🔒 PRIVATE KEY (Servidor - NÃO COMPARTILHE!):', 'warning');
    this.log(`   ${keys.privateKey}\n`, 'success');

    this.log('💡 Uso:', 'info');
    this.log('   • Public Key: Usado no navegador para subscrição', 'info');
    this.log('   • Private Key: Usado no servidor para enviar notificações', 'info');
    this.log('   • Ambas as chaves foram adicionadas ao arquivo .env\n', 'info');
  }

  /**
   * Valida chaves VAPID existentes
   */
  validateExistingKeys(): boolean {
    this.log('\n🔍 Verificando chaves VAPID existentes...', 'info');

    const envPath = path.join(process.cwd(), '..', '.env');
    
    if (!fs.existsSync(envPath)) {
      this.log('   Arquivo .env não encontrado', 'warning');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasPublicKey = envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY=');
    const hasPrivateKey = envContent.includes('VAPID_PRIVATE_KEY=');

    if (hasPublicKey && hasPrivateKey) {
      this.log('   ✅ Chaves VAPID encontradas no .env', 'success');
      
      // Extrair e validar tamanho
      const publicKeyMatch = envContent.match(/NEXT_PUBLIC_VAPID_PUBLIC_KEY="([^"]+)"/);
      if (publicKeyMatch && publicKeyMatch[1].length >= 80) {
        this.log('   ✅ Public Key válida', 'success');
        return true;
      } else {
        this.log('   ⚠️ Public Key inválida ou muito curta', 'warning');
        return false;
      }
    }

    this.log('   ⚠️ Chaves VAPID não encontradas', 'warning');
    return false;
  }

  /**
   * Execução principal
   */
  async run(): Promise<void> {
    this.log('\n╔═══════════════════════════════════════════════════════════════════╗', 'info');
    this.log('║                                                                   ║', 'info');
    this.log('║           🔐 GERADOR DE CHAVES VAPID v1.0                        ║', 'info');
    this.log('║                                                                   ║', 'info');
    this.log('╚═══════════════════════════════════════════════════════════════════╝', 'info');

    // Validar chaves existentes
    const hasValidKeys = this.validateExistingKeys();

    if (hasValidKeys) {
      this.log('\n⚠️ ATENÇÃO: Chaves VAPID já existem no arquivo .env', 'warning');
      this.log('   Gerar novas chaves irá invalidar as subscrições existentes.', 'warning');
      this.log('   Use --force para regenerar as chaves.\n', 'info');
      
      const forceRegenerate = process.argv.includes('--force');
      if (!forceRegenerate) {
        this.log('✅ Chaves VAPID já configuradas. Nada a fazer.', 'success');
        return;
      }
    }

    // Criar backup do .env
    this.createBackup();

    // Gerar novas chaves
    const keys = this.generateVapidKeys();

    // Atualizar .env
    this.updateEnvFile(keys);

    // Exibir chaves
    this.displayKeys(keys);

    // Instruções finais
    this.log('╔═══════════════════════════════════════════════════════════════════╗', 'info');
    this.log('║                    📝 PRÓXIMOS PASSOS                            ║', 'info');
    this.log('╚═══════════════════════════════════════════════════════════════════╝\n', 'info');

    this.log('1. Reinicie o servidor Next.js:', 'info');
    this.log('   cd ../estudio_ia_videos/app', 'info');
    this.log('   npm run dev\n', 'info');

    this.log('2. As Push Notifications estarão habilitadas', 'success');
    this.log('3. Os usuários poderão se inscrever para receber notificações\n', 'success');

    this.log('⚠️ IMPORTANTE:', 'warning');
    this.log('   • Não compartilhe a PRIVATE KEY', 'warning');
    this.log('   • Não commite o arquivo .env no Git', 'warning');
    this.log('   • Adicione .env ao .gitignore\n', 'warning');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const generator = new VapidKeyGenerator();
generator.run().catch(console.error);

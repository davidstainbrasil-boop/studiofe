
import dotenv from 'dotenv';
// Carregar envs ANTES de importar qualquer serviço que as utilize na inicialização
dotenv.config({ path: '.env.local' });

import { EmailService } from './src/lib/services/email-service';

async function testEmail() {
  console.log('Iniciando teste de envio de email...');
  
  // Instanciar manualmente para garantir que pega as envs carregadas agora
  const emailService = new EmailService();
  
  const to = 'delivered@resend.dev'; 
  const name = 'Test User';

  console.log(`Tentando enviar email de boas-vindas para: ${to}`);
  
  try {
    const success = await emailService.sendWelcomeEmail(to, name);
    
    if (success) {
      console.log('✅ Email enviado com sucesso!');
    } else {
      console.error('❌ Falha ao enviar email. Verifique os logs.');
    }
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testEmail();

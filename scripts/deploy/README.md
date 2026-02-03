# 📚 Scripts de Deploy - Documentação

## 🎯 Visão Geral

Este diretório contém scripts automatizados para deploy completo do MVP Video TécnicoCursos v7 no VPS Hostinger.

---

## 📁 Arquivos Disponíveis

### 1. `complete-deploy.sh` ⭐ **PRINCIPAL**
**Script completo que faz TUDO automaticamente**

**O que faz:**
- ✅ Atualiza sistema Ubuntu
- ✅ Instala Docker e Docker Compose
- ✅ Configura firewall (UFW)
- ✅ Cria swap de 4GB
- ✅ Cria usuário `deploy` com sudo
- ✅ Configura SSH com chave
- ✅ Clona repositório do GitHub
- ✅ Configura Redis
- ✅ Ajusta Nginx para aceitar qualquer IP
- ✅ Inicia containers Docker

**Como usar:**
```bash
# No VPS (como root)
curl -fsSL https://raw.githubusercontent.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7/main/scripts/deploy/complete-deploy.sh | bash
```

---

### 2. `vps-initial-setup.sh`
**Setup inicial do VPS (sem deploy da aplicação)**

**O que faz:**
- Instala Docker
- Configura firewall
- Cria usuário deploy
- Configura SSH

**Quando usar:**
- Quando você só quer preparar o VPS
- Antes do primeiro deploy

---

### 3. `deploy-production.sh`
**Deploy apenas da aplicação (VPS já configurado)**

**O que faz:**
- Clona/atualiza repositório
- Cria arquivos necessários
- Inicia containers

**Quando usar:**
- VPS já está configurado
- Apenas quer fazer deploy/atualização da app

---

### 4. `diagnose.sh` 🔍
**Diagnóstico completo do sistema**

**O que verifica:**
- ✅ Docker instalado e rodando
- ✅ Containers em execução
- ✅ Portas abertas (80, 443)
- ✅ Firewall configurado
- ✅ Nginx funcionando
- ✅ App respondendo
- ✅ Redis funcionando
- ✅ Arquivos de configuração

**Como usar:**
```bash
cd /opt/mvp/_MVP_Video_TecnicoCursos_v7
curl -fsSL https://raw.githubusercontent.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7/main/scripts/deploy/diagnose.sh | bash
```

---

### 5. `quick-fix.sh` 🔧
**Correções rápidas para problemas comuns**

**O que corrige:**
- ✅ Ajusta `server_name` do Nginx
- ✅ Libera porta 80 no firewall
- ✅ Reinicia containers

**Como usar:**
```bash
cd /opt/mvp/_MVP_Video_TecnicoCursos_v7
curl -fsSL https://raw.githubusercontent.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7/main/scripts/deploy/quick-fix.sh | bash
```

---

### 6. `deploy-now.ps1` (Windows)
**Script PowerShell para Windows**

**O que faz:**
- Verifica conectividade com VPS
- Executa deploy remoto via SSH

**Como usar:**
```powershell
cd c:\xampp\htdocs\_MVP_Video_TecnicoCursos_v7
.\scripts\deploy\deploy-now.ps1
```

---

## 🚀 Fluxo Recomendado

### Primeira Vez (VPS Novo)

1. **Conectar no VPS:**
   ```powershell
   ssh root@168.231.90.64
   ```

2. **Executar deploy completo:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7/main/scripts/deploy/complete-deploy.sh | bash
   ```

3. **Se pedir `.env.production`:**
   ```bash
   cd /opt/mvp/_MVP_Video_TecnicoCursos_v7
   nano .env.production
   # Preencher variáveis e salvar
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. **Verificar:**
   ```bash
   curl http://localhost/api/health
   ```

---

### Atualizações Futuras

```bash
cd /opt/mvp/_MVP_Video_TecnicoCursos_v7
git pull origin main
git lfs pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🐛 Troubleshooting

### Problema: Porta 80 não responde

**Solução:**
```bash
# Executar diagnóstico
curl -fsSL https://raw.githubusercontent.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7/main/scripts/deploy/diagnose.sh | bash

# Ou correção rápida
curl -fsSL https://raw.githubusercontent.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7/main/scripts/deploy/quick-fix.sh | bash
```

### Problema: Containers não iniciam

**Verificar logs:**
```bash
cd /opt/mvp/_MVP_Video_TecnicoCursos_v7
docker compose -f docker-compose.prod.yml logs
```

**Rebuild completo:**
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

### Problema: Nginx com erro de configuração

**Verificar:**
```bash
docker exec mvp-videos-nginx nginx -t
```

**Corrigir server_name:**
```bash
cd /opt/mvp/_MVP_Video_TecnicoCursos_v7
sed -i 's/server_name cursostecno.com.br www.cursostecno.com.br;/server_name _;/' nginx/conf.d/app.conf
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 📋 Checklist de Deploy

- [ ] VPS acessível via SSH
- [ ] Script `complete-deploy.sh` executado
- [ ] `.env.production` configurado
- [ ] Containers rodando (`docker ps`)
- [ ] Porta 80 respondendo (`curl http://localhost/api/health`)
- [ ] Firewall configurado (`ufw status`)
- [ ] Nginx funcionando (`docker logs mvp-videos-nginx`)

---

## 🔗 Links Úteis

- **Repositório:** https://github.com/jessegabrielstain-debug/_MVP_Video_TecnicoCursos_v7
- **VPS IP:** 168.231.90.64
- **Documentação Completa:** `DEPLOY.md`
- **Início Rápido:** `INICIO_RAPIDO.md`

---

## 💡 Dicas

1. **Sempre execute o diagnóstico primeiro** se algo não funcionar
2. **Mantenha `.env.production` seguro** - nunca commite no Git
3. **Use `git lfs pull`** após clonar para baixar arquivos grandes
4. **Monitore logs** com `docker compose logs -f`
5. **Faça backup** antes de atualizações importantes

---

## 🆘 Suporte

Se os scripts não resolverem, verifique:
1. Logs dos containers: `docker compose logs`
2. Status do Docker: `systemctl status docker`
3. Firewall: `ufw status`
4. Conectividade: `curl http://localhost/api/health`

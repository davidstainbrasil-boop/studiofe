
# 🌐 Configuração CDN (Cloudflare)

Este documento detalha a configuração do CDN Cloudflare para o Estúdio IA de Vídeos.

---

## 📋 Objetivo

Otimizar a entrega de assets estáticos (JavaScript, CSS, imagens, vídeos) através de CDN global, reduzindo latência e custos de bandwidth.

---

## 🔧 Configuração

### 1. DNS Setup

#### A. Adicionar domínio ao Cloudflare
1. Acessar [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Clicar em "Add a Site"
3. Inserir domínio: `cursostecno.com.br`
4. Selecionar plano: **Free** (ou Pro para features avançadas)

#### B. Atualizar Nameservers
Atualizar DNS do registrador para apontar para Cloudflare:
```
NS1: alex.ns.cloudflare.com
NS2: dana.ns.cloudflare.com
```

#### C. Criar DNS Records
| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | @ | 104.21.xx.xx | Proxied |
| CNAME | www | cursostecno.com.br | Proxied |

---

### 2. Page Rules

#### A. Cache Everything (Assets Estáticos)
**URL:** `cursostecno.com.br/_next/*`

**Settings:**
- Cache Level: **Cache Everything**
- Edge Cache TTL: **1 month**
- Browser Cache TTL: **1 day**

#### B. Cache Vídeos Renderizados
**URL:** `cursostecno.com.br/videos/*`

**Settings:**
- Cache Level: **Cache Everything**
- Edge Cache TTL: **1 week**
- Browser Cache TTL: **1 day**

#### C. Bypass Cache (APIs Dinâmicas)
**URL:** `cursostecno.com.br/api/*`

**Settings:**
- Cache Level: **Bypass**
- Disable Performance

---

### 3. Caching Configuration

#### A. Browser Cache TTL
```
Configuration > Caching > Browser Cache TTL: 4 hours
```

#### B. Cache by Device Type
Habilitado para servir versões mobile/desktop diferentes:
```
Configuration > Caching > Cache by Device Type: Enabled
```

#### C. Custom Cache Keys
Incluir query strings específicas:
```
Configuration > Caching > Custom Cache Key
- Include query string: version, locale
- Exclude: session, token
```

---

### 4. Performance Optimization

#### A. Auto Minify
```
Speed > Optimization > Auto Minify
- JavaScript: ✅ Enabled
- CSS: ✅ Enabled
- HTML: ✅ Enabled
```

#### B. Brotli Compression
```
Speed > Optimization > Brotli: ✅ Enabled
```

#### C. HTTP/2 & HTTP/3
```
Network > HTTP/2: ✅ Enabled
Network > HTTP/3 (QUIC): ✅ Enabled
```

#### D. Early Hints
```
Speed > Optimization > Early Hints: ✅ Enabled
```

---

### 5. Security Settings

#### A. SSL/TLS
```
SSL/TLS > Overview > Encryption mode: Full (strict)
SSL/TLS > Edge Certificates > Always Use HTTPS: ✅ Enabled
SSL/TLS > Edge Certificates > Minimum TLS Version: TLS 1.2
```

#### B. Firewall Rules
```
Security > WAF > Firewall Rules

Rule 1: Block malicious bots
- Expression: (cf.threat_score gt 30)
- Action: Block

Rule 2: Rate limit API
- Expression: (http.request.uri.path contains "/api/")
- Action: Rate Limit (100 req/min)
```

#### C. Security Headers
```
Security > HTTP Response Headers

X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

### 6. Analytics & Monitoring

#### A. Web Analytics
```
Analytics > Web Analytics: ✅ Enabled
- Track page views, visitors, performance
```

#### B. Cache Analytics
```
Analytics > Caching > Cache Analytics
- Monitor HIT rate, bandwidth saved
- Target HIT rate: > 80%
```

---

## 🚀 Invalidação de Cache

### A. Invalidação Manual (Dashboard)
1. Acessar Cloudflare Dashboard
2. Caching > Configuration > Purge Cache
3. Selecionar:
   - **Purge Everything** (limpa todo cache)
   - **Custom Purge** (limpa URLs específicas)

### B. Invalidação Automática (API)
Incluída no GitHub Actions workflow:

```yaml
- name: Invalidate CDN cache
  run: |
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

### C. Invalidação Programática (Node.js)
```typescript
import fetch from 'node-fetch'

async function invalidateCache() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          'https://cursostecno.com.br/_next/static/css/app.css',
          'https://cursostecno.com.br/_next/static/js/main.js',
        ]
      })
    }
  )
  
  const data = await response.json()
  console.log('Cache invalidation:', data.success ? 'SUCCESS' : 'FAILED')
}
```

---

## 📊 Métricas Esperadas

### Performance
- **HIT Rate:** > 80%
- **Bandwidth Savings:** > 60%
- **TTFB (Time to First Byte):** < 200ms
- **FCP (First Contentful Paint):** < 1.5s

### Cache Distribution
- `/_next/static/*`: **95% HIT rate**
- `/videos/*`: **85% HIT rate**
- `/api/*`: **0% HIT rate** (bypass)

---

## 🔍 Troubleshooting

### Cache não está funcionando
1. Verificar Page Rules estão ativas
2. Confirmar que URLs estão no formato correto
3. Checar se `Cache-Control` headers estão sendo enviados pelo servidor

### Assets não atualizando
1. Invalidar cache manualmente
2. Verificar versioning de assets (usar hash nos filenames)
3. Ajustar Browser Cache TTL para valores menores durante desenvolvimento

### HIT rate baixo
1. Analisar quais URLs estão com MISS
2. Ajustar Page Rules para incluir esses paths
3. Verificar se query strings estão impedindo cache

---

## 🌍 Localizações de Edge

Cloudflare possui **310+ data centers** globais:

**Principais para Brasil:**
- São Paulo (GRU)
- Rio de Janeiro (GIG)
- Fortaleza (FOR)
- Porto Alegre (POA)

**Latência esperada:**
- Brasil: **< 20ms**
- América Latina: **< 50ms**
- América do Norte: **< 100ms**
- Europa: **< 150ms**

---

## 📞 Suporte

**Dashboard:** https://dash.cloudflare.com  
**Docs:** https://developers.cloudflare.com  
**Support:** https://support.cloudflare.com  
**Community:** https://community.cloudflare.com

---

## 🔐 Credenciais (Secrets)

Armazenar no GitHub Secrets:
```
CLOUDFLARE_ZONE_ID=<zone-id>
CLOUDFLARE_API_TOKEN=<api-token>
```

Para obter API Token:
1. Cloudflare Dashboard > My Profile > API Tokens
2. Create Token > Edit zone DNS
3. Zone Resources: Include > Specific zone > cursostecno.com.br
4. Copiar token e adicionar ao GitHub Secrets

---

**Última atualização:** 2025-10-02  
**Versão:** 1.0.0

# Validação de assets em produção

## Comandos de build e start

```bash
npm run build
NODE_ENV=production npm run start
```

## Verificação automática de assets

```bash
node check-assets.mjs https://cursostecno.com.br
```

O verificador valida:
- Status HTTP 200/2xx para todos os assets
- MIME correto para CSS e JS

## Verificação direta por curl

```bash
curl -I https://cursostecno.com.br/_next/static/css/app/layout.css
curl -I https://cursostecno.com.br/_next/static/chunks/main-app.js
```

## Exemplo de Nginx

```
location ^~ /_next/static/ {
  alias /var/www/SEU_APP/.next/static/;
  access_log off;
  add_header Cache-Control "public, max-age=31536000, immutable";
  try_files $uri =404;
}

location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

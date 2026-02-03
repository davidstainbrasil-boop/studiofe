#!/bin/bash
# 🔒 SSL Certificate Setup with Let's Encrypt
# MVP Vídeos TécnicoCursos - Automated SSL Configuration
# Usage: ./setup-ssl.sh [domain] [email]

set -e

# Configuration
DOMAIN="${1:-cursostecno.com.br}"
EMAIL="${2:-admin@cursostecno.com.br}"
STAGING="${3:-false}"
NGINX_CONTAINER="mvp-videos-nginx"
CERTBOT_IMAGE="certbot/certbot:latest"
WEBROOT_PATH="/var/www/certbot"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verify prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker ps | grep -q "$NGINX_CONTAINER"; then
        log_warn "Nginx container not running. Starting it..."
        docker compose -f docker-compose.prod.yml up -d nginx
        sleep 5
    fi
    
    log_info "Prerequisites OK"
}

# Create webroot directory for ACME challenge
setup_webroot() {
    log_info "Setting up webroot for ACME challenge..."
    
    mkdir -p "./certbot/www"
    mkdir -p "./certbot/conf"
    
    # Create temporary nginx config for initial cert
    cat > "./infrastructure/nginx/conf.d/temp-acme.conf" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF
    
    log_info "Webroot configured"
}

# Obtain certificate
obtain_certificate() {
    log_info "Obtaining SSL certificate for $DOMAIN..."
    
    STAGING_FLAG=""
    if [ "$STAGING" = "true" ]; then
        log_warn "Using Let's Encrypt STAGING environment"
        STAGING_FLAG="--staging"
    fi
    
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        $CERTBOT_IMAGE certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        $STAGING_FLAG
    
    if [ $? -eq 0 ]; then
        log_info "Certificate obtained successfully!"
    else
        log_error "Failed to obtain certificate"
        exit 1
    fi
}

# Setup certificate renewal cron job
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > "./scripts/renew-ssl.sh" << 'EOF'
#!/bin/bash
# SSL Certificate Auto-Renewal Script
# Run via cron: 0 0 * * * /opt/mvp-videos/scripts/renew-ssl.sh

DOMAIN="cursostecno.com.br"
LOG_FILE="/var/log/ssl-renewal.log"

echo "[$(date)] Starting SSL renewal check" >> "$LOG_FILE"

docker run --rm \
    -v "/opt/mvp-videos/certbot/conf:/etc/letsencrypt" \
    -v "/opt/mvp-videos/certbot/www:/var/www/certbot" \
    certbot/certbot renew --quiet

if [ $? -eq 0 ]; then
    echo "[$(date)] Renewal check complete" >> "$LOG_FILE"
    
    # Reload Nginx if cert was renewed
    docker exec mvp-videos-nginx nginx -s reload
    echo "[$(date)] Nginx reloaded" >> "$LOG_FILE"
else
    echo "[$(date)] Renewal failed!" >> "$LOG_FILE"
fi
EOF

    chmod +x "./scripts/renew-ssl.sh"
    
    # Add cron job (runs daily at 3 AM)
    CRON_JOB="0 3 * * * /opt/mvp-videos/scripts/renew-ssl.sh"
    
    log_info "To enable automatic renewal, add this to crontab:"
    echo "  $CRON_JOB"
    
    log_info "Renewal script created at ./scripts/renew-ssl.sh"
}

# Update Nginx to use SSL
configure_nginx_ssl() {
    log_info "Configuring Nginx for SSL..."
    
    # Remove temporary ACME config
    rm -f "./infrastructure/nginx/conf.d/temp-acme.conf"
    
    # Update docker-compose to mount certificates
    log_info "Updating docker-compose volumes for SSL..."
    
    # Copy certificates to nginx ssl directory
    mkdir -p "./infrastructure/nginx/ssl"
    
    # Create symlinks script for production
    cat > "./scripts/link-ssl-certs.sh" << EOF
#!/bin/bash
# Link Let's Encrypt certificates to Nginx
ln -sf /opt/mvp-videos/certbot/conf/live/$DOMAIN/fullchain.pem /opt/mvp-videos/infrastructure/nginx/ssl/fullchain.pem
ln -sf /opt/mvp-videos/certbot/conf/live/$DOMAIN/privkey.pem /opt/mvp-videos/infrastructure/nginx/ssl/privkey.pem
ln -sf /opt/mvp-videos/certbot/conf/live/$DOMAIN/chain.pem /opt/mvp-videos/infrastructure/nginx/ssl/chain.pem
EOF
    chmod +x "./scripts/link-ssl-certs.sh"
    
    # Reload Nginx
    docker exec $NGINX_CONTAINER nginx -t && \
    docker exec $NGINX_CONTAINER nginx -s reload
    
    log_info "Nginx SSL configuration complete!"
}

# Verify SSL setup
verify_ssl() {
    log_info "Verifying SSL setup..."
    
    # Wait for Nginx to reload
    sleep 3
    
    # Test HTTPS
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --insecure)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        log_info "✅ HTTPS is working (HTTP $HTTP_CODE)"
    else
        log_warn "HTTPS returned HTTP $HTTP_CODE"
    fi
    
    # Test certificate validity
    echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null
    
    log_info "SSL verification complete"
}

# Main execution
main() {
    echo "=========================================="
    echo "  🔒 Let's Encrypt SSL Setup"
    echo "  Domain: $DOMAIN"
    echo "  Email: $EMAIL"
    echo "=========================================="
    
    check_prerequisites
    setup_webroot
    obtain_certificate
    setup_renewal
    configure_nginx_ssl
    verify_ssl
    
    echo ""
    log_info "🎉 SSL setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify https://$DOMAIN works"
    echo "  2. Add cron job for auto-renewal"
    echo "  3. Test certificate with SSL Labs: https://www.ssllabs.com/ssltest/"
    echo ""
}

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [domain] [email] [staging]"
    echo ""
    echo "Arguments:"
    echo "  domain   - Domain name (default: cursostecno.com.br)"
    echo "  email    - Contact email for Let's Encrypt"
    echo "  staging  - Use staging environment (true/false)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 cursostecno.com.br admin@cursostecno.com.br"
    echo "  $0 cursostecno.com.br admin@cursostecno.com.br true"
    exit 0
fi

main

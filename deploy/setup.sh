#!/bin/bash
set -e

echo "=== AppIconMock Server Setup ==="

# Create directory
mkdir -p /home/bilvas/appiconmock/storage/{exports,uploads,ai}
chown -R bilvas:bilvas /home/bilvas/appiconmock

# Install Nginx config
cp deploy/nginx-appiconmock.conf /etc/nginx/sites-available/appiconmock
ln -sf /etc/nginx/sites-available/appiconmock /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Install SSL
certbot --nginx -d appiconmock.com -d www.appiconmock.com --non-interactive --agree-tos -m admin@appiconmock.com

# Setup PM2
sudo -u bilvas pm2 start ecosystem.config.cjs
sudo -u bilvas pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u bilvas --hp /home/bilvas

echo "=== Done. Visit https://appiconmock.com ==="

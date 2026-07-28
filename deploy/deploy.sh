#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Syncing..."
rsync -avz --delete --exclude node_modules --exclude .git --exclude .next/cache --exclude storage \
  .next/ package.json package-lock.json ecosystem.config.cjs prisma/ public/ lib/ app/ components/ stores/ \
  root@67.217.56.26:/home/bilvas/appiconmock/

echo "Migrating + restarting..."
ssh root@67.217.56.26 "cd /home/bilvas/appiconmock && npm ci --omit=dev && npx prisma migrate deploy && sudo -u bilvas pm2 reload appiconmock"

echo "Deployed to https://appiconmock.com"

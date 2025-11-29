#!/usr/bin/env bash

if [ "$ENABLE_AUTO_SYNC" = false ]; then
    echo "🔄 Auto sync is disabled"
    exit 0
fi

echo "🔄 Pulling latest changes from remote repository"
git pull

echo "🔄 Setting up aliases"
echo 'alias k=kubectl' >>~/.bashrc

echo "🔄 Installing dependencies"
yarn

echo "🔄 Initializing Projen"
yarn projen

echo "🔄 Building cdktf project"
yarn tf@build

echo "🔄 Installing terraform providers"
yarn tf@install

echo "✅ Synchronization is complete"
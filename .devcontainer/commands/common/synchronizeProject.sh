#!/usr/bin/env bash

if [ "$ENABLE_AUTO_SYNC" = false ]; then
    echo "🔄 Auto sync is disabled"
    exit 0
fi

echo "🔄 Pulling latest changes from remote repository"
git pull

echo "🔄 Setting up aliases"
BASHRC_FILE="$HOME/.bashrc"
touch "$BASHRC_FILE"
sed -i \
    -e '/^alias k=kubectl$/d' \
    -e '/^alias h=helm$/d' \
    -e '/^alias d=docker$/d' \
    "$BASHRC_FILE"
{
    echo "alias k=kubectl"
    echo "alias h=helm"
    echo "alias d=docker"
} >> "$BASHRC_FILE"

echo "🔄 Installing dependencies"
corepack yarn

echo "🔄 Initializing Projen"
yarn projen

echo "🔄 Building cdktf project"
yarn tf@build

echo "🔄 Installing terraform providers"
yarn tf@install

echo "✅ Synchronization is complete"
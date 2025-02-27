#!/usr/bin/env bash

echo Changing owner of paths that mounted by named volumes
sudo chown -R $USER:$USER $volumePathsToChangeOwner

echo Updating apt package manager
sudo apt update -y
sudo apt upgrade -y

echo Installing OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults

echo Installing apt packages
sudo apt install -y \
    netcat-openbsd

echo Installing global npm packages
npm install -g \
    npm@latest

echo Pulling latest changes from remote repository
git pull

echo Initialize Projen
yarn && yarn projen


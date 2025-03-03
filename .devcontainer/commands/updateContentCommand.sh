#!/usr/bin/env bash

echo Create directories if does not exist
mkdir -p $dirPathsToChangeOwner

echo Changing owner of paths that mounted by named volumes
sudo chown -R $USER:$USER $dirPathsToChangeOwner

echo Updating apt package manager
sudo apt update -y
sudo apt upgrade -y

echo Installing OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults

echo Installing Helm CLI
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

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


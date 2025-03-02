#!/usr/bin/env bash

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




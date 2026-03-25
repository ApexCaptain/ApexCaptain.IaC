#!/usr/bin/env bash

echo "🔄 Changing owner of directories $DIR_PATHS_TO_CHANGE_OWNER to $USER"
sudo chown -R $USER:$USER $DIR_PATHS_TO_CHANGE_OWNER

echo "🔄 Updating apt package manager"
sudo apt update -y
sudo apt upgrade -y

echo "🔄 Installing apt packages"
sudo apt install -y \
    netcat-openbsd \
    iputils-ping \
    parallel

install_oci() {
    echo "🔄 Installing OCI CLI"
    bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
}

install_helm() {
    echo "🔄 Installing Helm CLI"
    bash -c "$(curl -L https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3)"
}

install_npm_packages() {
    echo "🔄 Installing global npm packages"
    npm install -g \ 
        npm@latest \ 
        @google/gemini-cli
}

install_coder_cli() {
    echo "🔄 Installing Coder CLI"
    curl -L https://coder.com/install.sh | sh
}

export -f install_oci install_helm install_npm_packages install_coder_cli
parallel --jobs 10 ::: install_oci install_helm install_npm_packages install_coder_cli

echo "🔄 Start synchronization"
./.devcontainer/commands/common/synchronizeProject.sh
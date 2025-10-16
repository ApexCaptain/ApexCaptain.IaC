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

export -f install_oci install_helm install_npm_packages
parallel --jobs 10 ::: install_oci install_helm install_npm_packages

echo "🔄 Copying kubeconfig files"
mkdir -p $CONTAINER_KUBE_CONFIG_DIR_PATH
cp $CONTAINER_SECRETS_DIR_PATH/k8s/* $CONTAINER_KUBE_CONFIG_DIR_PATH

echo "🔄 Start synchronization"
./.devcontainer/commands/common/synchronizeProject.sh
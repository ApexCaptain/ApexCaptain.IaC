#!/usr/bin/env bash

# System Arguments
SECRETS_DIR_PATH=/mnt/c/secrets
SECRETS_ENV_DIR_PATH=$SECRETS_DIR_PATH/env
MERGED_ENV_FILE_PATH=.devcontainer/.env

# DevContainer Arguments
localWorkspaceFolder=$1  
containerWorkspaceFolder=$2 
localWorkspaceFolderBasename=$3   
containerWorkspaceFolderBasename=$4   

# Create docker-compose.deb.yml arg
cat > $MERGED_ENV_FILE_PATH <<EOL
# Original DevContainer Arguments
localWorkspaceFolder = $localWorkspaceFolder
containerWorkspaceFolder = $containerWorkspaceFolder
localWorkspaceFolderBasename =  $localWorkspaceFolderBasename
containerWorkspaceFolderBasename = $containerWorkspaceFolderBasename 

# Named Volume Arguments
CONTAINER_NODE_MODULES_DIR_PATH = ${containerWorkspaceFolder}/node_modules

# Unonymous Volume Arguments
HOST_WORKSTATION_KUBE_CONFIG_FILE_PATH = $HOME/.kube/config
CONTAINER_WORKSTATION_KUBE_CONFIG_FILE_PATH = ${containerWorkspaceFolder}/.kube/workstation.config

HOST_SECRETS_DIR_PATH=$SECRETS_DIR_PATH
CONTAINER_SECRETS_DIR_PATH=$containerWorkspaceFolder/.secrets

# Merged env
EOL

for file in $SECRETS_ENV_DIR_PATH/*.env;
do
    if [ -f "$file" ]; then
        echo "# ${file##*/}" >> "$MERGED_ENV_FILE_PATH"
        cat "$file" >> "$MERGED_ENV_FILE_PATH"
        echo "" >> "$MERGED_ENV_FILE_PATH"
    fi
done
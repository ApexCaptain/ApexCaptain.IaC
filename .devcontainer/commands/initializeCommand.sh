#!/usr/bin/env bash

# DevContainer Arguments
localWorkspaceFolder=$1  
containerWorkspaceFolder=$2 
localWorkspaceFolderBasename=$3   
containerWorkspaceFolderBasename=$4   

# System Arguments (depend on workstation settings)
SECRETS_DIR_PATH=$HOME/google-drive/secrets 
SECRETS_ENV_DIR_PATH=$SECRETS_DIR_PATH/env
MERGED_ENV_FILE_PATH=.devcontainer/.env
TMP_ABS_DIR_PATH=$containerWorkspaceFolder/../../generatedSecrets


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
CONTAINER_KUBE_CONFIG_DIR_PATH = ${containerWorkspaceFolder}/.kube
CONTAINER_WORKSTATION_KUBE_CONFIG_FILE_PATH = ${containerWorkspaceFolder}/.kube/workstation.config

TMP_ABS_DIR_PATH=$TMP_ABS_DIR_PATH
HOST_SECRETS_DIR_PATH=$SECRETS_DIR_PATH
CONTAINER_SECRETS_DIR_PATH=$containerWorkspaceFolder/.secrets
OCI_CLI_CONFIG_FILE=$TMP_ABS_DIR_PATH/oci.config

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
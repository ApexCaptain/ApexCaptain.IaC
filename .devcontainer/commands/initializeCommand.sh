#!/usr/bin/env bash

# DevContainer Arguments
localWorkspaceFolder=$1  
containerWorkspaceFolder=$2 
localWorkspaceFolderBasename=$3   
containerWorkspaceFolderBasename=$4   
devcontainerId=$5

# Create env for docker-compose 
cat > .devcontainer/.env <<EOL

# Original DevContainer Arguments
localWorkspaceFolder = $1 
containerWorkspaceFolder = $containerWorkspaceFolder
localWorkspaceFolderBasename =  $localWorkspaceFolderBasename
containerWorkspaceFolderBasename = $containerWorkspaceFolderBasename 
devcontainerId = $devcontainerId

# Workspace
## Anonymous Volume Arguments
devContainerTerraformOutputDirHostPath = /devContainer/${localWorkspaceFolderBasename}/tfOutputs
devContainerTerraformOutputDirContainerPath = ${containerWorkspaceFolder}/generated

# Named Volume Arguments
nodeModulesVolumeContainerPath = ${containerWorkspaceFolder}/node_modules

EOL
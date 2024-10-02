#!/usr/bin/env bash

# DevContainer Arguments
localWorkspaceFolder=$1  
containerWorkspaceFolder=$2 
localWorkspaceFolderBasename=$3   
containerWorkspaceFolderBasename=$4   

# Create env for docker-compose 
cat > .devcontainer/.env <<EOL

# Original DevContainer Arguments
localWorkspaceFolder = $localWorkspaceFolder
containerWorkspaceFolder = $containerWorkspaceFolder
localWorkspaceFolderBasename =  $localWorkspaceFolderBasename
containerWorkspaceFolderBasename = $containerWorkspaceFolderBasename 

# Named Volume Arguments
nodeModulesVolumeContainerPath = ${containerWorkspaceFolder}/node_modules

EOL
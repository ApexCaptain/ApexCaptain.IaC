#!/usr/bin/env bash

echo Changing owner of paths that mounted by named volumes
sudo chown $USER:$USER $volumePathsToChangeOwner

echo Updating apt package
sudo apt update -y
sudo apt upgrade -y

echo Installing global npm packages
npm install -g \
    npm@latest
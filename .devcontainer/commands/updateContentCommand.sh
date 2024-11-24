#!/usr/bin/env bash

echo Changing owner of paths that mounted by named volumes
sudo chown -R $USER:$USER $volumePathsToChangeOwner

echo Updating apt package manager
sudo apt update -y
sudo apt upgrade -y

echo Installing apt packages
sudo apt install -y \
    sshpass

echo Installing global npm packages
npm install -g \
    npm@latest

echo Initialize Projen
yarn && yarn projen
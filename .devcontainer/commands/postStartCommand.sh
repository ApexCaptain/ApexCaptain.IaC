#!/usr/bin/env bash

echo Creating directories $dirPathsToChangeOwner
mkdir -p $dirPathsToChangeOwner

echo Changing owner of directories $dirPathsToChangeOwner to $USER
sudo chown -R $USER:$USER $dirPathsToChangeOwner

echo Pulling latest changes from remote repository
git pull

echo Initialize Projen
yarn && yarn projen
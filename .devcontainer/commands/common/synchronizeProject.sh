#!/usr/bin/env bash

echo Pulling latest changes from remote repository
git pull

echo Initialize Projen
yarn && yarn projen
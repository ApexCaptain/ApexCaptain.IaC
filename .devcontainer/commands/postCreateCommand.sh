#!/usr/bin/env bash

# Change owner of paths that mounted by named volumes
sudo chown $USER:$USER $volumePathsToChangeOwner
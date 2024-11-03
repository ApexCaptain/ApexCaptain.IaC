#!/usr/bin/env bash

echo Update APT
sudo apt-get update -y
sudo apt-get upgrade -y

echo Install gocryptfs
sudo apt-get install -y gocryptfs

echo Mount secrets


SECRET_VAULT_DIR_PATH=.devcontainer/secrets
SECRET_SOURCE_DIR_PATH=$HOME/secrets


fusermount -u $SECRET_SOURCE_DIR_PATH

rm -rf $SECRET_SOURCE_DIR_PATH
mkdir $SECRET_SOURCE_DIR_PATH

gocryptfs -allow_other $SECRET_VAULT_DIR_PATH $SECRET_SOURCE_DIR_PATH

MERGED_ENV_FILE_PATH=.devcontainer/.env
SOURCE_ENV_DIR_PATH=.devcontainer/env

rm -f "$MERGED_ENV_FILE_PATH"

# DevContainer Arguments
localWorkspaceFolder=$1  
containerWorkspaceFolder=$2 
localWorkspaceFolderBasename=$3   
containerWorkspaceFolderBasename=$4   

# Create env for docker-compose 
cat > $MERGED_ENV_FILE_PATH <<EOL
# Original DevContainer Arguments
localWorkspaceFolder = $localWorkspaceFolder
containerWorkspaceFolder = $containerWorkspaceFolder
localWorkspaceFolderBasename =  $localWorkspaceFolderBasename
containerWorkspaceFolderBasename = $containerWorkspaceFolderBasename 

# Named Volume Arguments
nodeModulesVolumeContainerPath = ${containerWorkspaceFolder}/node_modules
containerWorkstationKubeconfigFilePath = ${containerWorkspaceFolder}/.kube/workstation.config

# Merged env
EOL

for file in $SOURCE_ENV_DIR_PATH/*.env;
do
    if [ -f "$file" ]; then
        echo "# ${file##*/}" >> "$MERGED_ENV_FILE_PATH"
        cat "$file" >> "$MERGED_ENV_FILE_PATH"
        echo "" >> "$MERGED_ENV_FILE_PATH"
    fi
done




# #!/bin/bash

# # 통합 파일 경로 설정
# OUTPUT_FILE="../merged.env"

# # 기존 통합 파일 삭제 (이미 존재하는 경우)
# rm -f "$OUTPUT_FILE"

# # 모든 .env 파일을 하나로 통합
# for file in ../env/*.env; do
#     if [ -f "$file" ]; then
#         echo "# ${file##*/}" >> "$OUTPUT_FILE"  # 각 파일명 주석 추가
#         cat "$file" >> "$OUTPUT_FILE"           # 파일 내용 추가
#         echo "" >> "$OUTPUT_FILE"               # 파일 사이에 빈 줄 추가
#     fi
# done

# echo "모든 .env 파일이 $OUTPUT_FILE 파일로 통합되었습니다."

#!/bin/bash



disconnectedDevContainerMapDirPath='${main_dir_path}'
mkdir -p "$disconnectedDevContainerMapDirPath"

logOutFilePath=$disconnectedDevContainerMapDirPath/disconnected-devcontainer-map.log
disconnectedDevContainerMapTmpFilePath=$disconnectedDevContainerMapDirPath/disconnected-devcontainer-map.tmp
disconnectedDevContainerMapFilePath=$disconnectedDevContainerMapDirPath/disconnected-devcontainer-map.txt

# pgrep 패턴은 합쳐 쓰지 않음 — Coder argv에 연속 토큰이 들어가면 다른 bash -c 스크립트가 오탐됨
_eh1='extension'
_eh2='Host'

# Docker가 실행되고 있는지 확인
if ! docker ps > /dev/null 2>&1; then
    echo "Docker is not running, skip the script" >> "$logOutFilePath"
    exit 0
fi

declare -A disconnectedDevContainerMap
if [ -f "$disconnectedDevContainerMapFilePath" ]; then
    source "$disconnectedDevContainerMapFilePath"
fi

echo "Starting DevContainer Cleaner at $(date +%Y-%m-%dT%H:%M:%S) " >> "$logOutFilePath"

get_container_name() {
    docker inspect --format '{{slice .Name 1}}' "$1"
}

while IFS= read -r eachDevContainerId; do
    [[ -z "$eachDevContainerId" ]] && continue
    containerName=$(get_container_name "$eachDevContainerId")

    isContainerRunning=$(docker inspect -f '{{ .State.Running }}' "$eachDevContainerId")

    # Container가 실행중이 아닌 경우
    if [ "$isContainerRunning" != "true" ]; then
        # 기존에 스테일 마크가 있는 경우 제거
        if [ -n "$${disconnectedDevContainerMap["$eachDevContainerId"]}" ]; then
            echo "Container \"$containerName\" is not running, clear the stale mark" >> "$logOutFilePath"
            unset disconnectedDevContainerMap["$eachDevContainerId"]
        fi
        continue
    fi

    # 컨테이너 안에 IDE 확장 프로세스가 있으면(사용자 존재)
    if docker exec "$eachDevContainerId" pgrep -f "$_eh1$_eh2" >/dev/null 2>&1; then
        # 기존에 스테일 마크가 있는 경우 제거
        if [ -n "$${disconnectedDevContainerMap["$eachDevContainerId"]}" ]; then
            echo "Container \"$containerName\" is active, clear the stale mark" >> "$logOutFilePath"
            unset disconnectedDevContainerMap["$eachDevContainerId"]
        fi
        continue
    fi

    # 실행 중인데 위 확장 프로세스가 없음(사용자 없음), 스테일 마크도 없을 때
    if [ -z "$${disconnectedDevContainerMap["$eachDevContainerId"]}" ]; then
        echo "Container \"$containerName\" is inactive, mark this as stale" >> "$logOutFilePath"
        disconnectedDevContainerMap["$eachDevContainerId"]=$(date +%Y-%m-%dT%H:%M:%S)
    fi


done <<< "$(docker ps -aq --filter "label=devcontainer.config_file")"

for eachDevContainerId in "$${!disconnectedDevContainerMap[@]}"; do

    [[ -z "$eachDevContainerId" ]] && continue

    # 컨테이너가 이미 rm 된 경우 맵에만 남아 있을 수 있음 → inspect 실패 시 항목 제거
    projectLabel=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$eachDevContainerId" 2>/dev/null) || {
        echo "Map entry \"$${eachDevContainerId}\" no longer exists (removed), clear stale mark" >> "$logOutFilePath"
        unset disconnectedDevContainerMap["$eachDevContainerId"]
        continue
    }

    # docker ps는 label 부정 필터가 없어서: 프로젝트 전체 − skip=true
    derivedContainers=$(
        comm -23 \
            <(docker ps -q --filter "label=com.docker.compose.project=$projectLabel" | sort -u) \
            <(docker ps -q --filter "label=com.docker.compose.project=$projectLabel" --filter "label=devcontainer-cleaner.skip=true" | sort -u)
    )
    disconnectedTime=$${disconnectedDevContainerMap[$eachDevContainerId]}
    disconnectedEpoch=$(date -d "$disconnectedTime" +%s 2>/dev/null) || {
        echo "Map entry \"$${eachDevContainerId}\": invalid disconnectedTime \"$disconnectedTime\", clear stale mark" >> "$logOutFilePath"
        unset disconnectedDevContainerMap["$eachDevContainerId"]
        continue
    }
    now=$(date +%s)

    if (( now - disconnectedEpoch >= ${wait_seconds} )); then
        if [ -z "$derivedContainers" ]; then
            containerName=$(get_container_name "$eachDevContainerId")
            echo "Stopping devContainer \"$containerName\"" >> "$logOutFilePath"
            docker stop "$eachDevContainerId" > /dev/null 2>&1
        else
            namesForLog=()
            for stopCid in $derivedContainers; do
                [[ -z "$stopCid" ]] && continue
                namesForLog+=("\"$(get_container_name "$stopCid")\"")
            done
            echo "Stopping devContainers $${namesForLog[*]} (compose project=$projectLabel)" >> "$logOutFilePath"
            docker stop $derivedContainers > /dev/null 2>&1
        fi
        unset disconnectedDevContainerMap["$eachDevContainerId"]
    fi

done


declare -p disconnectedDevContainerMap > "$disconnectedDevContainerMapTmpFilePath"
mv "$disconnectedDevContainerMapTmpFilePath" "$disconnectedDevContainerMapFilePath"
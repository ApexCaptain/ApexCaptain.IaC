#!/bin/bash

workspaceStatusMapDirPath='${main_dir_path}'

mkdir -p "$workspaceStatusMapDirPath"

logOutFilePath=$workspaceStatusMapDirPath/workspace-status-map.log
workspaceStatusMapTmpFilePath=$workspaceStatusMapDirPath/workspace-status-map.tmp
workspaceStatusMapFilePath=$workspaceStatusMapDirPath/workspace-status-map.txt


echo "Starting Auto Stop Workspace at $(date +%Y-%m-%dT%H:%M:%S) " >> "$logOutFilePath"

declare -A workspaceStatusMap
if [ -f "$workspaceStatusMapFilePath" ]; then
    source "$workspaceStatusMapFilePath"
fi

# Docker가 실행되고 있는지 확인
if ! docker ps > /dev/null 2>&1; then
    echo "Docker is not running, skip the script" >> "$logOutFilePath"
    unset workspaceStatusMap["last_inactive_date"]
    exit 0
fi

# running 상태의 Container가 1개라도 있을 경우 즉시 종료
if docker ps | grep -qE 'Up'; then
    echo "Running containers found, skip the script" >> "$logOutFilePath"
    unset workspaceStatusMap["last_inactive_date"]
    exit 0
fi

# 접속자가 있을 경우 — pgrep -f, 패턴은 변수로만 합침(스크립트 argv에 검색 토큰 연속 문자열이 없게)
_eh1='extension'
_eh2='Host'
if pgrep -af "$_eh1$_eh2" >/dev/null 2>&1; then
    # 기존에 스테일 마크가 있는 경우 제거
    if [ -n "$${workspaceStatusMap["last_inactive_date"]}" ]; then
        # Coder는 스크립트 본문이 실행 프로세스 argv에 실리므로, ps grep과 겹치는 부분 문자열을 로그에 넣지 말 것
        echo "Workspace is active (IDE extension process), clear inactive mark" >> "$logOutFilePath"
        unset workspaceStatusMap["last_inactive_date"]
    fi
# 접속자가 없을 경우
else
    # 기존에 스테일 마크가 없는 경우 마크 추가
    if [ -z "$${workspaceStatusMap["last_inactive_date"]}" ]; then
        workspaceStatusMap["last_inactive_date"]=$(date +%Y-%m-%dT%H:%M:%S)
        echo "Workspace inactive, mark inactive since \"$${workspaceStatusMap["last_inactive_date"]}\"" >> "$logOutFilePath"
    fi
    inactiveTime=$${workspaceStatusMap["last_inactive_date"]}
    inactiveEpoch=$(date -d "$inactiveTime" +%s 2>/dev/null) || {
        echo "Invalid last_inactive_date \"$inactiveTime\", reset and use current time" >> "$logOutFilePath"
        unset workspaceStatusMap["last_inactive_date"]
        inactiveEpoch=$(date +%s)
    }
    now=$(date +%s)
    elapsed=$((now - inactiveEpoch))
    if (( elapsed >= ${wait_seconds} )); then
        echo "Inactive threshold reached (${wait_seconds}s, elapsed $${elapsed}s), scheduling stop for workspace \"$CODER_WORKSPACE_NAME\"" >> "$logOutFilePath"
        (
            sleep 5
            coder stop $CODER_WORKSPACE_NAME -y
        ) &
    fi
fi

declare -p workspaceStatusMap > "$workspaceStatusMapTmpFilePath"
mv "$workspaceStatusMapTmpFilePath" "$workspaceStatusMapFilePath"

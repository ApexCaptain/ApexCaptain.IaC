resource "coder_agent" "main" {
  os             = "linux"
  arch           = "amd64"
  startup_script = <<-EOT
    set -e

    sudo apt-get install -y \
      curl

    # Install DevContainers CLI
    curl -fsSL https://raw.githubusercontent.com/devcontainers/cli/main/scripts/install.sh | sh -s -- --prefix /tmp/devcontainer-cli
    sudo cp -R /tmp/devcontainer-cli/* /usr

    # Start Dockerd in the background.
    sudo dockerd >/tmp/dockerd.log 2>&1 &

    # Rebase README and assets
    sudo rm -f $HOME/${var.workspace_directory_name}/README.md
    sudo rm -rf $HOME/${var.workspace_directory_name}/assets
    if [ "${data.coder_parameter.include_readme.value}" = "true" ]; then
      cp /etc/coder-workspace-readme/README.md $HOME/${var.workspace_directory_name}/README.md
      mkdir -p "$HOME/${var.workspace_directory_name}/assets/home"
      for f in /etc/coder-workspace-readme/assets/*; do
        [ -f "$f" ] && cp "$f" "$HOME/${var.workspace_directory_name}/assets/home/"
      done
      sudo chown root:root "$HOME/${var.workspace_directory_name}/README.md"
      sudo chown -R root:root "$HOME/${var.workspace_directory_name}/assets"
    fi

    # Copy default bashrc file if not exists
    if [ ! -f $HOME/.bashrc ]; then
      cp /etc/coder-workspace-files/bashrc $HOME/.bashrc
    fi

    # On-start directory and files
    onStartDirectory="$HOME/${var.workspace_directory_name}/.on-start"
    onStartScript="$onStartDirectory/init.sh"
    onStartLog="$onStartDirectory/init.log"
    
    # Create Workspace Directory
    mkdir -p "$onStartDirectory"

    # Create on-start script if not exists
    if [ ! -f "$onStartScript" ]; then
      echo "#!/bin/bash" > "$onStartScript"
      echo "# 여기에 필요한 스크립트를 작성합니다." >> "$onStartScript"
      echo "echo 'Hello, World!'" >> "$onStartScript"
      chmod +x "$onStartScript"
    fi

    # Clear init.log
    : > "$onStartLog"

    # Execute on-start script and mirror log to terminal.
    # Avoid pipe+tee here because background processes in init.sh may keep pipe FDs open.
    
    printf '\n---------------------\n시작 스크립트 실행중...\n---------------------\n\n'

    tail -n 0 -f "$onStartLog" &
    tailPid=$!

    set +e
    bash "$onStartScript" >> "$onStartLog" 2>&1
    scriptExitCode=$?
    set -e

    sleep 0.2
    kill "$tailPid" >/dev/null 2>&1 || true
    wait "$tailPid" 2>/dev/null || true

    printf '\n---------------------\n시작 스크립트 완료.\n---------------------\n\n'

  EOT

  metadata {
    display_name = "CPU Usage"
    key          = "0_cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "RAM Usage"
    key          = "1_ram_usage"
    script       = "coder stat mem"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "Home Disk"
    key          = "2_home_disk"
    script       = "coder stat disk --path $${HOME}"
    interval     = 60
    timeout      = 1
  }

  metadata {
    display_name = "Docker Disk"
    key          = "3_docker_disk"
    script       = "coder stat disk --path /var/lib/docker"
    interval     = 60
    timeout      = 1
  }

  metadata {
    display_name = "Load Average"
    key          = "4_load_host"
    script   = <<EOT
      echo "`cat /proc/loadavg | awk '{ print $1 }'` `nproc`" | awk '{ printf "%0.2f", $1/$2 }'
    EOT
    interval = 10
    timeout  = 1
  }
}

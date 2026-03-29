resource "coder_script" "install-devcontainers-cli" {
    agent_id = coder_agent.main.id
    display_name = "Install DevContainers CLI"
    icon = local.icons_base64_data_url["devcontainer.png"]
    script = <<EOF
        #!/bin/bash
        sudo apt-get install -y \
            curl
        curl -fsSL https://raw.githubusercontent.com/devcontainers/cli/main/scripts/install.sh | sh -s -- --prefix /tmp/devcontainer-cli
        sudo cp -R /tmp/devcontainer-cli/* /usr
    EOF
    run_on_start = true
}

resource "coder_script" "run-dockerd" { 
    agent_id = coder_agent.main.id
    display_name = "Run Dockerd"
    script = <<EOF
        #!/bin/bash
        sudo dockerd >/tmp/dockerd.log 2>&1 &
    EOF
    run_on_start = true
}

resource "coder_script" "lifecycle-on-start-script" {
    agent_id = coder_agent.main.id
    display_name = "Lifecycle On Start Script"
    icon = local.icons_base64_data_url["start.png"]
    script = <<EOF
        #!/bin/bash

        # OnStart Directory 생성
        mkdir -p ${local.directory_paths.lifecycle_scripts_directory}

        # OnStart Script 생성
        if [ ! -f ${local.file_paths.lifecycle_scripts.on_start_script} ]; then
            echo "#!/bin/bash" > ${local.file_paths.lifecycle_scripts.on_start_script}
            echo "echo 'OnStart : Hello, World!'" >> ${local.file_paths.lifecycle_scripts.on_start_script}
            chmod +x ${local.file_paths.lifecycle_scripts.on_start_script}
        fi

        # OnStop Script 생성
        if [ ! -f ${local.file_paths.lifecycle_scripts.on_stop_script} ]; then
            echo "#!/bin/bash" > ${local.file_paths.lifecycle_scripts.on_stop_script}
            echo "echo 'OnStop : Hello, World!'" >> ${local.file_paths.lifecycle_scripts.on_stop_script}
            chmod +x ${local.file_paths.lifecycle_scripts.on_stop_script}
        fi

        # OnStart Log 초기화
        : > ${local.file_paths.lifecycle_scripts.on_start_log}

        echo "Started At : $(date)" >> ${local.file_paths.lifecycle_scripts.on_start_log}

        tail -n 0 -f ${local.file_paths.lifecycle_scripts.on_start_log} &
        tailPid=$!

        set +e
        bash ${local.file_paths.lifecycle_scripts.on_start_script} >> ${local.file_paths.lifecycle_scripts.on_start_log} 2>&1
        scriptExitCode=$?
        set -e

        sleep 0.2
        kill "$tailPid" >/dev/null 2>&1 || true
        wait "$tailPid" 2>/dev/null || true

    EOF
    run_on_start = true
}

resource "coder_script" "lifecycle-on-stop-script" {
    agent_id = coder_agent.main.id
    display_name = "Lifecycle On Stop Script"
    icon = local.icons_base64_data_url["stop.png"]
    script = <<EOF
        #!/bin/bash

        # OnStop Log 초기화
        : > ${local.file_paths.lifecycle_scripts.on_stop_log}

        echo "Stopped At : $(date)" >> ${local.file_paths.lifecycle_scripts.on_stop_log}

        tail -n 0 -f ${local.file_paths.lifecycle_scripts.on_stop_log} &
        tailPid=$!

        set +e
        bash ${local.file_paths.lifecycle_scripts.on_stop_script} >> ${local.file_paths.lifecycle_scripts.on_stop_log} 2>&1
        scriptExitCode=$?
        set -e

        sleep 0.2
        kill "$tailPid" >/dev/null 2>&1 || true
        wait "$tailPid" 2>/dev/null || true
    EOF
    run_on_stop = true
}

resource "coder_script" "copy-default-bashrc" {
    agent_id = coder_agent.main.id
    display_name = "Copy Default Bashrc"
    script = <<EOF
        #!/bin/bash
        if [ ! -f ${local.file_paths.default_bashrc} ]; then
            echo '${local.files["default.bashrc"]}' | base64 -d > ${local.file_paths.default_bashrc}
        fi
    EOF
    run_on_start = true
}

resource "coder_script" "devcontainer-cleaner" {
    count = data.coder_parameter.enable_devcontainer_cleaner.value ? 1 : 0
    agent_id = coder_agent.main.id
    display_name = "DevContainer Cleaner"
    script = templatefile(local.template_paths["devContainer-cleaner.sh.tpl"], {
        wait_seconds = data.coder_parameter.devcontainer_cleaner_wait_mins[0].value * 60
        main_dir_path = local.directory_paths.devcontainer_cleaner_directory
    })
    # Every 1 minute
    cron = "0 */1 * * * *"
    log_path = "/tmp/devcontainer-cleaner.log"
}
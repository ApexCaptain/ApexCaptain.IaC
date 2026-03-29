data "coder_parameter" "cpu" {
  name         = "cpu"
  display_name = "CPU"
  description  = "사용 가능한 최대 CPU 코어 수입니다."
  default      = "2"
  icon         = local.icons_base64_data_url["cpu.png"]
  mutable      = true
  option {
    name  = "2 Cores"
    value = "2"
  }
  option {
    name  = "4 Cores"
    value = "4"
  }
  option {
    name  = "6 Cores"
    value = "6"
  }
  option {
    name  = "8 Cores"
    value = "8"
  }
  order = 1
}

data "coder_parameter" "memory" {
  name         = "memory"
  display_name = "Memory"
  description  = "사용 가능한 최대 메모리(GB) 입니다."
  default      = "4"
  icon         = local.icons_base64_data_url["ram.png"]
  mutable      = true
  option {
    name  = "4 GB"
    value = "4"
  }
  option {
    name  = "6 GB"
    value = "6"
  }
  option {
    name  = "8 GB"
    value = "8"
  }
  order = 2
}

data "coder_parameter" "home_disk_size" {
  name         = "home_disk_size"
  display_name = "홈 디스크 사이즈 (GB)"
  description  = "최소: 10 GB, 최대: 50 GB. 디스크 사이즈는 확장만 가능합니다."
  default      = "10"
  type         = "number"
  icon         = local.icons_base64_data_url["ssd.png"]
  mutable      = true
  validation {
    min = 10
    max = 50
    monotonic = "increasing"
  }
  order = 3
}

data "coder_parameter" "docker_disk_size" {
  name         = "docker_disk_size"
  display_name = "Docker 디스크 사이즈 (GB)"
  description  = "최소: 10 GB, 최대: 50 GB. 디스크 사이즈는 확장만 가능합니다."
  default      = "10"
  type         = "number"
  icon         = local.icons_base64_data_url["ssd.png"]
  mutable      = true
  validation {
    min = 10
    max = 50
    monotonic = "increasing"
  }
  order = 4
}

data "coder_parameter" "additional_ides" {
  name         = "additional_ides"
  display_name = "IDE"
  mutable      = true
  default      = "[\"vscode-desktop\"]"
  form_type    = "multi-select"
  type         = "list(string)"
  icon         = local.icons_base64_data_url["development.png"]

  option {
    name  = "VS Code (Desktop)"
    value = "vscode-desktop"
    icon = local.icons_base64_data_url["vscode.png"]
  }
  option {
    name  = "VS Code (Web)"
    value = "vscode-web"
    icon  = local.icons_base64_data_url["vscode.png"]
  }
  option {
    name  = "Terminal"
    value = "terminal"
    icon = "/icon/terminal.svg"
  }
  option {
    name  = "Cursor"
    value = "cursor"
    icon = "/icon/cursor.svg"
  }


  order        = 5

}

data "coder_parameter" "fuse_count" { 
  name         = "fuse_count"
  display_name = "Fuse Device 수"
  description  = "Fuse Device 수를 선택합니다. Rclone과 같은 도구를 사용해 Google Drive, OneDrive 등을 마운트할 때 사용됩니다."
  default      = "0"
  type         = "number"
  icon         = local.icons_base64_data_url["cloud.png"]
  mutable      = true
  order        = 6
  validation {
    min = 0
    max = var.device_plugin_fuse_count_limit
  }
}

data "coder_parameter" "auto_stop_workspace" {
  name         = "auto_stop_workspace"
  display_name = "Auto Stop Workspace"
  description  = "비활성 상태일 때 워크스페이스를 종료합니다. Workspace 내부에 Running 상태의 Container가 있을 경우 동작하지 않습니다"
  default      = true
  type         = "bool"
  icon         = local.icons_base64_data_url["stop.png"]
  mutable      = true
  order        = 7
}

data "coder_parameter" "auto_stop_workspace_wait_mins" {
  count = data.coder_parameter.auto_stop_workspace.value ? 1 : 0
  name         = "auto_stop_workspace_wait_mins"
  display_name = "Auto Stop Workspace 대기 시간 (분)"
  description  = "비활성 상태로 유지된 시간이 이 값을 초과하면 워크스페이스를 자동으로 종료합니다."
  default      = 10
  type         = "number"
  icon         = local.icons_base64_data_url["time.png"]
  mutable      = true
  validation {
    min = 10
  }
  order        = 8
}

data "coder_parameter" "enable_devcontainer_cleaner" {
  name         = "enable_devcontainer_cleaner"
  display_name = "DevContainer Cleaner 활성화"
  description  = "미사용 DevContainer를 정기적으로 종료합니다. 'devcontainer-cleaner.skip=true' 라벨로 특정 컨테이너를 제외할 수 있습니다."
  default      = true
  type         = "bool"
  icon         = local.icons_base64_data_url["cleaning.png"]
  mutable      = true
  order        = 9
}

data "coder_parameter" "devcontainer_cleaner_wait_mins" {
  count = data.coder_parameter.enable_devcontainer_cleaner.value ? 1 : 0
  name         = "devcontainer_cleaner_wait_mins"
  display_name = "DevContainer Cleaner 대기 시간 (분)"
  description  = "비활성 상태로 유지된 시간이 이 값을 초과하면 미사용 DevContainer로 간주해 자동으로 종료(Stop)합니다."
  default      = 5
  type         = "number"
  icon         = local.icons_base64_data_url["time.png"]
  mutable      = true
  validation {
    min = 5
  }
  order        = 10
}

data "coder_workspace" "me" {}

data "coder_workspace_owner" "me" {}
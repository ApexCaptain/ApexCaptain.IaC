data "coder_parameter" "cpu" {
  name         = "cpu"
  display_name = "CPU"
  description  = "사용 가능한 최대 CPU 코어 수입니다."
  default      = "4"
  icon         = local.icons_base64_data_url["cpu.png"]
  mutable      = true
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
  display_name = "추가 IDE 선택"
  description  = "기본 IDE(VsCode Desktop) 이외 추가로 설치할 IDE를 선택합니다."
  mutable      = true
  default      = "[]"
  form_type    = "multi-select"
  type         = "list(string)"
  icon         = local.icons_base64_data_url["development.png"]

  option {
    name  = "VS Code Web"
    value = "vscode-web"
    icon  = local.icons_base64_data_url["vscode.png"]
  }
  option {
    name  = "Cursor"
    value = "cursor"
    icon = "/icon/cursor.svg"
  }
  order        = 5

}

data "coder_parameter" "include_readme" {
  name         = "include_readme"
  display_name = "README 포함"
  description  = "README 파일을 Workspace에 포함할지 여부입니다. Disable 할 경우 기존 README 파일은 삭제됩니다."
  default      = true
  type         = "bool"
  icon         = local.icons_base64_data_url["document.png"]
  mutable      = true
  order        = 6
}


data "coder_workspace" "me" {}

data "coder_workspace_owner" "me" {}
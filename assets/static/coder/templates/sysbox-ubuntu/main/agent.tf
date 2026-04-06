resource "coder_agent" "main" {
  os             = "linux"
  arch           = "amd64"

  display_apps {
    port_forwarding_helper = true
    ssh_helper = true
    vscode = contains(local.selected_additional_ides, "vscode-desktop")
    vscode_insiders = false
    web_terminal = contains(local.selected_additional_ides, "terminal")
  }

  metadata {
    display_name = "CPU Usage"
    key          = "0_cpu_usage"
    script       = "coder stat cpu --host"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "RAM Usage"
    key          = "1_ram_usage"
    script       = "coder stat mem --host"
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


# https://registry.coder.com/modules/coder/cursor
module "cursor" {
  count    = contains(local.selected_additional_ides, "cursor") ? data.coder_workspace.me.start_count : 0
  source   = "registry.coder.com/coder/cursor/coder"
  version  = "1.4.1"
  agent_id = coder_agent.main.id
  folder   = "/home/coder/${var.workspace_directory_name}"
}

# https://registry.coder.com/modules/coder/vscode-web
module "vscode-web" {
  count          = contains(local.selected_additional_ides, "vscode-web") ? data.coder_workspace.me.start_count : 0
  source         = "registry.coder.com/coder/vscode-web/coder"
  version        = "1.5.0"
  agent_id       = coder_agent.main.id
  accept_license = true
  folder         = "/home/coder/${var.workspace_directory_name}"
  subdomain      = false
  disable_trust  = true
}

# https://registry.coder.com/modules/coder/coder-login
module "coder-login" {
  count    = data.coder_workspace.me.start_count
  source   = "registry.coder.com/coder/coder-login/coder"
  version  = "1.1.1"
  agent_id = coder_agent.main.id
}

# https://registry.coder.com/modules/thezoker/nodejs
module "nodejs" {
  count    = data.coder_workspace.me.start_count
  source   = "registry.coder.com/thezoker/nodejs/coder"
  version  = "1.0.13"
  agent_id = coder_agent.main.id
}
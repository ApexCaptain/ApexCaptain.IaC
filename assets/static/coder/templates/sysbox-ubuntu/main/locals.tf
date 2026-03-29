locals {
  selected_additional_ides = jsondecode(data.coder_parameter.additional_ides.value)

  directory_paths = {
    lifecycle_scripts_directory = "$HOME/${var.workspace_directory_name}/.lifecycle-scripts"
    devcontainer_cleaner_directory = "/tmp/devcontainer-cleaner"
    auto_stop_workspace_directory = "/tmp/auto-stop-workspace"
  }

  file_paths = {
    default_bashrc = "$HOME/.bashrc"
    lifecycle_scripts = {
      on_start_script = "${local.directory_paths.lifecycle_scripts_directory}/on-start.sh"
      on_start_log = "${local.directory_paths.lifecycle_scripts_directory}/on-start.log"
      on_stop_script = "${local.directory_paths.lifecycle_scripts_directory}/on-stop.sh"
      on_stop_log = "${local.directory_paths.lifecycle_scripts_directory}/on-stop.log"
    }
  }

  # @Note https://coder.ayteneve93.com/icons 에 있는지 우선 찾아보고 없으면 png 파일 추가
  icons_base64_data_url = {
    for eachPngFile in fileset("./assets/icons", "**.png") :
    eachPngFile => "data:image/png;base64,${filebase64("./assets/icons/${eachPngFile}")}" 
  }

  files = {
    for eachFile in fileset("./assets/files", "**") :
    eachFile => filebase64("./assets/files/${eachFile}")
  }

  template_paths = {
    for eachTemplate in fileset("./assets/templates", "**") :
    eachTemplate => "./assets/templates/${eachTemplate}"
  }
}
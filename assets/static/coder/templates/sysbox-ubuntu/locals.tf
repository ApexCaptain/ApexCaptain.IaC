locals {
  selected_additional_ides = jsondecode(data.coder_parameter.additional_ides.value)

  
  # @Note https://coder.ayteneve93.com/icons에 있는지 우선 찾아보고 없으면 png 파일 추가
  icons_base64_data_url = {
    for eachPngFile in fileset("./assets/icons", "*.png") :
    eachPngFile => "data:image/png;base64,${filebase64("./assets/icons/${eachPngFile}")}" 
  }
}
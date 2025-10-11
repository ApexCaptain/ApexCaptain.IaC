C:\WINDOWS\System32\OneDriveSetup.exe /uninstall
$appNamesToDelete = @(
    "Clipchamp.Clipchamp",
    "Microsoft.BingNews",
    "Microsoft.BingSearch",
    "Microsoft.BingWeather",
    "Microsoft.GamingApp",
    "Microsoft.MicrosoftOfficeHub",
    "Microsoft.MicrosoftSolitaireCollection",
    "Microsoft.MicrosoftStickyNotes",
    "Microsoft.OutlookForWindows",
    "Microsoft.PowerAutomateDesktop",
    "Microsoft.Todos",
    "Microsoft.WebMediaExtensions",
    "Microsoft.Windows.Photos",
    "Microsoft.WindowsAlarms",
    "Microsoft.WindowsCalculator",
    "Microsoft.WindowsCamera",
    "Microsoft.WindowsFeedbackHub",
    "Microsoft.WindowsSoundRecorder",
    "Microsoft.Xbox.TCUI",
    "MicrosoftCorporationII.QuickAssist",
    "MSTeams",
    "Microsoft.Copilot",
    "Microsoft.ZuneMusic",
    "Microsoft.ScreenSketch",
    "Microsoft.WindowsAppRuntime.1.3",
    "Microsoft.Paint",
    "Microsoft.YourPhone",
    "Microsoft.Windows.DevHome",
    "Microsoft.XboxGamingOverlay",
    "Microsoft.XboxSpeechToTextOverlay",
    "Microsoft.WindowsStore",
    "Microsoft.XboxIdentityProvider"
)
Write-Host 'Removing unnecessary apps...'
foreach ($eachAppNameToDelete in $appNamesToDelete) {
    Get-AppxPackage | Where-Object { $_.Name -eq $eachAppNameToDelete } | Remove-AppxPackage
}
Write-Host 'Unnecessary apps removal completed.'
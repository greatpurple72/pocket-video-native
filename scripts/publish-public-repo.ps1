param(
  [string]$RepoName = "ios-video-browser"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$gh = "C:\Program Files\GitHub CLI\gh.exe"

if (-not (Test-Path $gh)) {
  throw "GitHub CLI was not found at $gh"
}

Set-Location $root

$authStatus = & $gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run 'gh auth login --web' first."
}

$userJson = & $gh api user
$user = $userJson | ConvertFrom-Json

if (-not (Test-Path ".git")) {
  git init | Out-Null
}

$currentName = git config user.name
if (-not $currentName) {
  $resolvedName = if ($user.name) { $user.name } else { $user.login }
  git config user.name $resolvedName
}

$currentEmail = git config user.email
if (-not $currentEmail) {
  $primaryEmail = $null
  try {
    $emails = (& $gh api user/emails) | ConvertFrom-Json
    $primaryEmail = ($emails | Where-Object { $_.primary } | Select-Object -First 1 -ExpandProperty email)
  } catch {
    $primaryEmail = $null
  }

  if (-not $primaryEmail) {
    $primaryEmail = "$($user.login)@users.noreply.github.com"
  }

  git config user.email $primaryEmail
}

$status = git status --porcelain
if ($status) {
  git add .
  git commit -m "Set up unsigned iOS IPA build workflow"
}

git branch -M main

$remoteExists = git remote | Select-String -SimpleMatch "origin"
if (-not $remoteExists) {
  & $gh repo create $RepoName --public --source . --remote origin --push
} else {
  git push -u origin main
}

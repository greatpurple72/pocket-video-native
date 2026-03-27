# Pocket Video

Pocket Video is a personal-use iPhone video browser and player prototype.

## Current app direction

- Non-fullscreen mode behaves like a lightweight browser shell
- Fullscreen mode provides gesture-first playback controls
- Direct media links can be cached for offline playback
- The project is built with Expo and React Native

## Local development

Install dependencies and run the Expo development server:

```bash
npm install
npm start
```

This still works well for rapid UI iteration with Expo Go.

## Native iPhone install path without owning a Mac

This repository now includes a GitHub Actions workflow that builds an unsigned iOS IPA on a macOS runner:

- Workflow file: `.github/workflows/build-ios-unsigned-ipa.yml`
- Build script: `scripts/build-unsigned-ios-ipa.sh`

The intended flow is:

1. Push this project to a GitHub repository
2. Open the GitHub Actions tab
3. Run `Build Unsigned iOS IPA`
4. Download the `unsigned-ios-ipa` artifact
5. Open Sideloadly on Windows
6. Sign the IPA with your regular Apple ID and install it on your iPhone

If GitHub CLI is installed and authenticated on Windows, you can publish the local folder as a public repository with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/publish-public-repo.ps1
```

## What the workflow does

- Runs on `macos-latest`
- Installs Node dependencies with `npm ci`
- Generates the native iOS project with `expo prebuild`
- Installs CocoaPods
- Builds an unsigned iPhone archive with Xcode code signing disabled
- Packages the `.app` bundle into an unsigned `.ipa`
- Uploads the `.ipa` as a GitHub Actions artifact

## Important limitations

- This is a custom unsigned IPA path, not the standard Expo device build flow
- GitHub Actions gives you the macOS build machine in the cloud; it does not remove the need for Xcode itself
- Sideloadly still requires a normal Apple ID to sign and install the IPA
- Free Apple ID sideloading still has the usual 7-day refresh and app-count limits
- The workflow has not been executed from this Windows machine, so the final proof step is the first GitHub Actions run

## Local verification completed here

- `npm exec tsc -- --noEmit`
- Scheme auto-detection logic was spot-checked locally with sample Xcode output

## Repository paths

- App entry: `App.tsx`
- GitHub Actions workflow: `.github/workflows/build-ios-unsigned-ipa.yml`
- Unsigned IPA build script: `scripts/build-unsigned-ios-ipa.sh`

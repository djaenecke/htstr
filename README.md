# Htstr

A custom web player for Hitster card game with enhanced playback controls.

**Live App:** https://djaenecke.github.io/htstr/

## Features

- Scan original Hitster QR codes (all editions supported)
- Configurable playback duration (15/30/45/60 seconds or full song)
- Start position options: from beginning, random, 1st half, 2nd half
- Visual countdown effect for last 10 seconds
- Works on mobile (Android/iOS) as installable PWA

## Supported Editions

- Germany (multiple editions)
- France
- Netherlands
- Nordics
- Poland
- Hungary
- Canada

## Requirements

- Spotify Premium account
- Modern browser with camera access
- Must be added as user in the Spotify Developer App (see below)

## Installation

### On Phone (recommended)

1. Open https://djaenecke.github.io/htstr/ in Chrome/Safari
2. Tap "Add to Home Screen" (share menu on iOS, browser menu on Android)
3. Open the app from your home screen
4. Log in with Spotify

### On Desktop

Just open https://djaenecke.github.io/htstr/ in any modern browser.

## Access

This app uses a Spotify Developer App in development mode. To use it, your Spotify account must be added to the allowed users list.

**To request access:** Contact the app owner with your Spotify email address.

## How It Works

1. Configure playback settings (duration, start position)
2. Tap "Start Scanning"
3. Point camera at a Hitster card QR code
4. Music plays automatically via Spotify
5. Tap "Scan Again" for the next card

## Local Development

```bash
git clone https://github.com/djaenecke/htstr.git
cd htstr
python3 -m http.server 8000
# Open http://127.0.0.1:8000
```

To use locally, create your own Spotify Developer App and update the `clientId` in `app.js`.

## Credits

- Card database from [songseeker-hitster-playlists](https://github.com/andygruber/songseeker-hitster-playlists)
- Uses [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- QR scanning via [jsQR](https://github.com/cozmo/jsQR)

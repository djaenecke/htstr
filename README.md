# Htstr

A custom web player for Hitster card game with enhanced playback controls.

**Live App:** https://djaenecke.github.io/htstr/

## Features

- Scan original Hitster QR codes (all editions auto-detected)
- Configurable playback duration (15/30/45/60 seconds or full song)
- Start position options: from beginning, random, 1st half, 2nd half
- Play/Pause and Rewind controls
- Visual countdown effect for last 10 seconds (pulsing red)
- Flip card to reveal artist, year, and title after playback
- Optional edition display
- Works on mobile (Android/iOS) as installable PWA

## Supported Editions

| Edition | Name |
|---------|------|
| DE | Original Game |
| DE-AAAA0007 | Schlager Party |
| DE-AAAA0012 | Summer Hits |
| DE-AAAA0015 | Guilty Pleasures |
| DE-AAAA0019 | Bingo |
| DE-AAAA0025 | Rock |
| DE-AAAA0026 | Movies & TV Soundtracks |
| DE-AAAA0039 | Christmas |
| DE-AAAA0040 | Celebration |
| DE-AAAA0042 | Holiday Mix |
| FR | Original (FR) |
| FR-AAAA0031 | Chansons Francaises |
| NL | 100% NL |
| Nordics | Nordic Edition |
| PL-AAAE0001 | Polish Edition |
| HU-AAAE0003 | Hungarian Edition |
| CA-AAAD0001 | Canadian Edition |

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
5. Use Play/Pause to control playback, Rewind to restart from the beginning
6. When playback ends, tap the card to reveal artist, year, and title
7. Tap "Scan" for the next card

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

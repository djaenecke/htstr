// Configuration
const CONFIG = {
    clientId: '1d537507d95248e9a3264b0dff4cc552',
    redirectUri: window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000/'
        : 'https://djaenecke.github.io/htstr/',
    scopes: [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-modify-playback-state',
        'user-read-playback-state'
    ].join(' ')
};

// PKCE Helper Functions
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, v => chars[v % chars.length]).join('');
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    bytes.forEach(b => str += String.fromCharCode(b));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const hashed = await sha256(verifier);
    return base64urlencode(hashed);
}

// All available editions
const EDITIONS = [
    'hitster-de-aaaa0007', 'hitster-de-aaaa0012', 'hitster-de-aaaa0015',
    'hitster-de-aaaa0019', 'hitster-de-aaaa0025', 'hitster-de-aaaa0026',
    'hitster-de-aaaa0039', 'hitster-de-aaaa0040', 'hitster-de-aaaa0042',
    'hitster-de', 'hitster-fr-aaaa0031', 'hitster-fr', 'hitster-nl',
    'hitster-nordics', 'hitster-pl-aaae0001', 'hitster-hu-aaae0003',
    'hitster-ca-aaad0001'
];

// App State
const state = {
    accessToken: null,
    player: null,
    deviceId: null,
    cardData: {}, // { 'edition-key': { cardNum: {...} } }
    currentTrack: null,
    playbackTimer: null,
    settings: {
        duration: 30,
        startPosition: 'start' // 'start', 'random', 'first-half', 'second-half'
    }
};

// DOM Elements
const elements = {
    loginScreen: document.getElementById('login-screen'),
    settingsScreen: document.getElementById('settings-screen'),
    mainScreen: document.getElementById('main-screen'),
    loginBtn: document.getElementById('login-btn'),
    startGameBtn: document.getElementById('start-game-btn'),
    backToSettingsBtn: document.getElementById('back-to-settings-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    scannerContainer: document.getElementById('scanner-container'),
    scannerVideo: document.getElementById('scanner-video'),
    playerContainer: document.getElementById('player-container'),
    trackInfo: document.getElementById('track-info'),
    progressFill: document.getElementById('progress-fill'),
    timeDisplay: document.getElementById('time-display'),
    playBtn: document.getElementById('play-btn'),
    stopBtn: document.getElementById('stop-btn'),
    rescanBtn: document.getElementById('rescan-btn'),
    statusMessage: document.getElementById('status-message'),
    durationSelect: document.getElementById('duration-select'),
    positionSelect: document.getElementById('position-select'),
    card: document.getElementById('card'),
    cardArtist: document.querySelector('.card-artist'),
    cardYear: document.querySelector('.card-year'),
    cardTitle: document.querySelector('.card-title')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    loadSettings();

    // Check for OAuth callback with authorization code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // Exchange code for token
        const verifier = localStorage.getItem('code_verifier');
        if (verifier) {
            try {
                const token = await exchangeCodeForToken(code, verifier);
                state.accessToken = token.access_token;
                localStorage.setItem('spotify_token', token.access_token);
                localStorage.setItem('spotify_token_expires', Date.now() + token.expires_in * 1000);
                if (token.refresh_token) {
                    localStorage.setItem('spotify_refresh_token', token.refresh_token);
                }
                localStorage.removeItem('code_verifier');
            } catch (e) {
                console.error('Token exchange failed', e);
                showStatus('Login failed', true);
            }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check for existing token
    if (!state.accessToken) {
        const storedToken = localStorage.getItem('spotify_token');
        const expires = localStorage.getItem('spotify_token_expires');
        if (storedToken && expires && Date.now() < parseInt(expires)) {
            state.accessToken = storedToken;
        }
    }

    if (state.accessToken) {
        await initSpotify();
    } else {
        showScreen('login');
    }

    setupEventListeners();
    await loadCardData();
}

async function exchangeCodeForToken(code, verifier) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CONFIG.clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: CONFIG.redirectUri,
            code_verifier: verifier
        })
    });

    if (!response.ok) {
        throw new Error('Token exchange failed');
    }
    return response.json();
}

function loadSettings() {
    const saved = localStorage.getItem('hitster_settings');
    if (saved) {
        Object.assign(state.settings, JSON.parse(saved));
    }
    elements.durationSelect.value = state.settings.duration;
    elements.positionSelect.value = state.settings.startPosition;
}

function saveSettings() {
    state.settings.duration = parseInt(elements.durationSelect.value) || 30;
    state.settings.startPosition = elements.positionSelect.value;
    localStorage.setItem('hitster_settings', JSON.stringify(state.settings));
}

function setupEventListeners() {
    elements.loginBtn.addEventListener('click', () => login());
    elements.startGameBtn.addEventListener('click', () => {
        saveSettings();
        showScreen('main');
        startScanning();
    });
    elements.backToSettingsBtn.addEventListener('click', () => {
        stopScanning();
        stopPlayback();
        showScreen('settings');
    });
    elements.logoutBtn.addEventListener('click', logout);
    elements.playBtn.addEventListener('click', playCurrentTrack);
    elements.stopBtn.addEventListener('click', stopPlayback);
    elements.rescanBtn.addEventListener('click', startScanning);
    elements.card.addEventListener('click', flipCard);
}

function showScreen(name) {
    elements.loginScreen.classList.toggle('hidden', name !== 'login');
    elements.settingsScreen.classList.toggle('hidden', name !== 'settings');
    elements.mainScreen.classList.toggle('hidden', name !== 'main');
}

function showStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = isError ? 'error' : '';
    setTimeout(() => elements.statusMessage.textContent = '', 5000);
}

// Spotify Auth with PKCE
async function login() {
    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem('code_verifier', verifier);

    const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
        client_id: CONFIG.clientId,
        response_type: 'code',
        redirect_uri: CONFIG.redirectUri,
        scope: CONFIG.scopes,
        code_challenge_method: 'S256',
        code_challenge: challenge
    });
    window.location.href = authUrl;
}

function logout() {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expires');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('code_verifier');
    state.accessToken = null;
    if (state.player) {
        state.player.disconnect();
    }
    showScreen('login');
}

// Spotify Player
async function initSpotify() {
    showStatus('Connecting to Spotify...');

    window.onSpotifyWebPlaybackSDKReady = () => {
        state.player = new Spotify.Player({
            name: 'Htstr',
            getOAuthToken: cb => cb(state.accessToken),
            volume: 0.8
        });

        state.player.addListener('ready', ({ device_id }) => {
            state.deviceId = device_id;
            showStatus('Connected to Spotify');
            showScreen('settings');
        });

        state.player.addListener('not_ready', () => {
            showStatus('Device went offline', true);
        });

        state.player.addListener('authentication_error', () => {
            showStatus('Authentication failed', true);
            logout();
        });

        state.player.addListener('account_error', () => {
            showStatus('Premium account required', true);
        });

        state.player.connect();
    };

    // Trigger SDK ready if already loaded
    if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady();
    }
}

// Card Data
async function loadCardData() {
    showStatus('Loading card databases...');
    let totalCards = 0;

    for (const edition of EDITIONS) {
        try {
            const response = await fetch(`data/${edition}.csv`);
            if (!response.ok) continue;

            const text = await response.text();
            const lines = text.trim().split('\n');

            state.cardData[edition] = {};

            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length >= 6) {
                    const cardNum = parseInt(cols[0]);
                    state.cardData[edition][cardNum] = {
                        title: cols[1],
                        artist: cols[2],
                        year: cols[3],
                        isrc: cols[5]
                    };
                    totalCards++;
                }
            }
        } catch (e) {
            console.warn(`Failed to load ${edition}`, e);
        }
    }
    console.log(`Loaded ${totalCards} cards from ${Object.keys(state.cardData).length} editions`);
    showStatus('');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// QR Scanner
let scannerStream = null;
let scannerAnimationId = null;

async function startScanning() {
    stopPlayback();
    elements.playerContainer.classList.add('hidden');
    elements.scannerContainer.classList.remove('hidden');
    // Reset card to back side
    elements.card.classList.remove('flipped', 'flippable');

    try {
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        elements.scannerVideo.srcObject = scannerStream;
        await elements.scannerVideo.play();

        requestAnimationFrame(scanFrame);
    } catch (e) {
        showStatus('Camera access denied', true);
        console.error(e);
    }
}

function stopScanning() {
    if (scannerAnimationId) {
        cancelAnimationFrame(scannerAnimationId);
        scannerAnimationId = null;
    }
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
    elements.scannerVideo.srcObject = null;
    elements.scannerContainer.classList.add('hidden');
}

function scanFrame() {
    if (!scannerStream) return;

    const video = elements.scannerVideo;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        scannerAnimationId = requestAnimationFrame(scanFrame);
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
        const cardInfo = parseHitsterUrl(code.data);
        if (cardInfo) {
            stopScanning();
            handleCard(cardInfo);
            return;
        }
    }

    scannerAnimationId = requestAnimationFrame(scanFrame);
}

function parseHitsterUrl(url) {
    // Match patterns like: http://www.hitstergame.com/de/aaaa0026/00040
    const match = url.match(/hitstergame\.com\/([a-z]+)(?:-[a-z]+)?\/([a-z0-9]+)\/(\d+)/i);
    if (match) {
        return {
            locale: match[1],      // e.g., 'de', 'fr', 'nl'
            edition: match[2],      // e.g., 'aaaa0026'
            cardNumber: parseInt(match[3])
        };
    }
    return null;
}

function findCardEdition(locale, edition, cardNumber) {
    // Map locale codes to CSV locale prefixes
    const localeMap = {
        'de': 'de',
        'fr': 'fr',
        'nl': 'nl',
        'pl': 'pl',
        'hu': 'hu',
        'ca': 'ca',
        'en': 'nordics', // fallback
        'se': 'nordics',
        'no': 'nordics',
        'dk': 'nordics',
        'fi': 'nordics'
    };

    const csvLocale = localeMap[locale] || locale;

    // Try specific edition first: hitster-{locale}-{edition}
    const specificKey = `hitster-${csvLocale}-${edition}`;
    if (state.cardData[specificKey] && state.cardData[specificKey][cardNumber]) {
        return { key: specificKey, card: state.cardData[specificKey][cardNumber] };
    }

    // Try generic locale: hitster-{locale}
    const genericKey = `hitster-${csvLocale}`;
    if (state.cardData[genericKey] && state.cardData[genericKey][cardNumber]) {
        return { key: genericKey, card: state.cardData[genericKey][cardNumber] };
    }

    // Try nordics as fallback
    if (state.cardData['hitster-nordics'] && state.cardData['hitster-nordics'][cardNumber]) {
        return { key: 'hitster-nordics', card: state.cardData['hitster-nordics'][cardNumber] };
    }

    return null;
}

async function handleCard(cardInfo) {
    const result = findCardEdition(cardInfo.locale, cardInfo.edition, cardInfo.cardNumber);

    if (!result) {
        showStatus(`Card #${cardInfo.cardNumber} (${cardInfo.edition}) not found`, true);
        startScanning();
        return;
    }

    const card = result.card;
    showStatus(`Found: Card #${cardInfo.cardNumber}`);
    elements.trackInfo.textContent = `Card #${cardInfo.cardNumber}`;
    elements.playerContainer.classList.remove('hidden');

    // Set up card display (back facing up, not flippable yet)
    elements.cardArtist.textContent = card.artist;
    elements.cardYear.textContent = card.year;
    elements.cardTitle.textContent = card.title;
    elements.card.classList.remove('flipped', 'flippable');

    // Search Spotify for track by ISRC
    try {
        const track = await searchSpotifyByISRC(card.isrc);
        if (track) {
            state.currentTrack = {
                uri: track.uri,
                duration: track.duration_ms,
                name: track.name,
                artist: track.artists[0].name
            };
            elements.trackInfo.textContent = `Card #${cardInfo.cardNumber} - Ready`;
            playCurrentTrack();
        } else {
            showStatus('Track not found on Spotify', true);
        }
    } catch (e) {
        showStatus('Spotify search failed', true);
        console.error(e);
    }
}

async function searchSpotifyByISRC(isrc) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=isrc:${isrc}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${state.accessToken}` }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
        }
        throw new Error('Search failed');
    }

    const data = await response.json();
    return data.tracks.items[0] || null;
}

async function playCurrentTrack() {
    if (!state.currentTrack || !state.deviceId) return;

    const track = state.currentTrack;
    const isFullSong = state.settings.duration === 0;
    const duration = isFullSong ? track.duration : state.settings.duration * 1000;

    // Calculate start position based on setting
    let startPosition = 0;
    if (!isFullSong && track.duration > duration && state.settings.startPosition !== 'start') {
        const maxStart = track.duration - duration;
        const halfPoint = track.duration / 2;

        switch (state.settings.startPosition) {
            case 'first-half':
                // Random position in first half, but ensure playback fits
                startPosition = Math.floor(Math.random() * Math.min(halfPoint, maxStart));
                break;
            case 'second-half':
                // Random position in second half, but clamp to ensure playback fits
                const minStart = Math.min(halfPoint, maxStart);
                startPosition = minStart + Math.floor(Math.random() * (maxStart - minStart + 1));
                break;
            case 'random':
                startPosition = Math.floor(Math.random() * maxStart);
                break;
        }
    }

    try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [track.uri],
                position_ms: startPosition
            })
        });

        elements.playBtn.disabled = true;
        elements.trackInfo.textContent = `Card - Playing...`;

        // Start progress timer
        const startTime = Date.now();
        const endTime = startTime + duration;
        const countdownThreshold = 10000; // 10 seconds

        if (state.playbackTimer) clearInterval(state.playbackTimer);
        state.playbackTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const progress = Math.min(100, (elapsed / duration) * 100);

            elements.progressFill.style.width = `${progress}%`;
            elements.timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;

            // Add countdown effect for last 10 seconds
            if (remaining <= countdownThreshold && remaining > 0) {
                elements.playerContainer.classList.add('countdown');
                elements.progressFill.classList.add('countdown');
            }

            if (remaining <= 0) {
                stopPlayback();
            }
        }, 100);

    } catch (e) {
        showStatus('Playback failed', true);
        console.error(e);
    }
}

async function stopPlayback() {
    if (state.playbackTimer) {
        clearInterval(state.playbackTimer);
        state.playbackTimer = null;
    }

    elements.progressFill.style.width = '0%';
    elements.progressFill.classList.remove('countdown');
    elements.playerContainer.classList.remove('countdown');
    elements.playBtn.disabled = false;

    if (state.player) {
        try {
            await state.player.pause();
        } catch (e) {
            console.error('Pause failed', e);
        }
    }

    if (state.currentTrack) {
        elements.trackInfo.textContent = `Card - Tap card to reveal`;
        elements.card.classList.add('flippable');
    }
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function flipCard() {
    if (elements.card.classList.contains('flippable')) {
        elements.card.classList.add('flipped');
        elements.trackInfo.textContent = `Card - Revealed`;
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}

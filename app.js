// Pania Music Player - Main Application JavaScript
// Configuration
const API_BASE_URL = 'https://api-o27g4vauhq-uc.a.run.app';
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH5QP9XuvvqLrbzaQ0rV9WfSVHYOBKQgJZUTzTQeSpzyUSQbSxIkJUlPFc67K8k2aIDuB5mcPrjHMU/pub?output=csv';

// DOM elements
const audio = document.getElementById('audio');
const titleEl = document.getElementById('title');
const poetEl = document.getElementById('poet');
const lyricsEl = document.getElementById('lyrics');
const apiStatusEl = document.getElementById('apiStatus');
const clickHintEl = document.getElementById('click-hint');
const likeBtn = document.getElementById('likeBtn');
const dislikeBtn = document.getElementById('dislikeBtn');
const playlistAddBtn = document.getElementById('playlistAddBtn');
const playlistModal = document.getElementById('playlistModal');
const userNameEl = document.getElementById('userName');
const userStatusEl = document.getElementById('userStatus');
const userAvatarEl = document.getElementById('userAvatar');

// Global variables
let playlist = [];
let currentIndex = 0;
let currentSong = null;
let userPlaylist = [];
let isPlayingUserPlaylist = false;
let userPlaylistIndex = 0;
let telegramUser = null;
let isInTelegram = false;
let telegramWebApp = null;

// Enhanced Telegram Integration
function initializeTelegram() {
    console.log('🚀 Initializing Telegram Web App...');
    
    // Check if Telegram Web App is available
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        telegramWebApp = window.Telegram.WebApp;
        isInTelegram = true;
        
        console.log('✅ Telegram Web App detected');
        
        // Initialize Telegram Web App
        telegramWebApp.ready();
        
        // Set app colors
        telegramWebApp.setHeaderColor('#667eea');
        telegramWebApp.setBackgroundColor('#ff6b6b');
        
        // Get user data
        if (telegramWebApp.initDataUnsafe && telegramWebApp.initDataUnsafe.user) {
            telegramUser = telegramWebApp.initDataUnsafe.user;
            console.log(`👤 Telegram user found: ${telegramUser.first_name} (ID: ${telegramUser.id})`);
            
            // Enable closing confirmation if needed
            telegramWebApp.enableClosingConfirmation();
            
            updateUserInterface(telegramUser, true);
        } else {
            console.log('⚠️ Telegram user data not available');
            createDemoUser();
        }
    } else {
        console.log('⚠️ Telegram Web App not available - running in browser mode');
        isInTelegram = false;
        createDemoUser();
    }
}

function createDemoUser() {
    telegramUser = {
        id: 'demo_user_' + Math.random().toString(36).substr(2, 5),
        first_name: 'کاربر آزمایشی',
        last_name: '',
        username: 'demo_user',
        language_code: 'fa',
        is_demo: true
    };
    
    console.log(`🔧 Demo user created: ${telegramUser.id}`);
    updateUserInterface(telegramUser, false);
}

function updateUserInterface(user, isTelegramUser) {
    const displayName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    userNameEl.textContent = displayName;
    
    if (isTelegramUser) {
        userStatusEl.innerHTML = 'کاربر تلگرام <span class="telegram-badge">TG</span>';
        
        // Try to load user photo
        loadTelegramUserPhoto(user);
    } else {
        userStatusEl.textContent = 'حالت آزمایشی';
        
        // Use first letter as avatar
        const firstLetter = user.first_name ? user.first_name[0].toUpperCase() : '👤';
        userAvatarEl.textContent = firstLetter;
    }
    
    console.log(`👤 User interface updated: ${displayName} (${isTelegramUser ? 'Telegram' : 'Demo'})`);
}

function loadTelegramUserPhoto(user) {
    // Create avatar with first letter as fallback
    const firstLetter = user.first_name ? user.first_name[0].toUpperCase() : '👤';
    userAvatarEl.textContent = firstLetter;
    
    // Note: Photo loading would require bot integration
    console.log('📸 Using text avatar (photo loading requires bot integration)');
}

// API Functions
async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            updateAPIStatus(true);
            return await response.json();
        } else {
            throw new Error(`API Error: ${response.status}`);
        }
    } catch (error) {
        updateAPIStatus(false);
        throw error;
    }
}

async function sendToAPI(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            updateAPIStatus(true);
            return await response.json();
        } else {
            throw new Error(`API Error: ${response.status}`);
        }
    } catch (error) {
        updateAPIStatus(false);
        return null;
    }
}

function updateAPIStatus(isOnline) {
    if (isOnline) {
        apiStatusEl.className = 'api-status online';
        apiStatusEl.textContent = '🟢';
    } else {
        apiStatusEl.className = 'api-status offline';
        apiStatusEl.textContent = '🔴';
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Enhanced Shuffle Algorithm - Prevents consecutive same titles
function intelligentShuffle(songs) {
    console.log('🔀 Starting intelligent shuffle...');
    
    if (songs.length < 2) return songs;
    
    // Simple shuffle first
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Fix consecutive duplicates
    let fixed = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (fixed && attempts < maxAttempts) {
        fixed = false;
        attempts++;
        
        for (let i = 1; i < shuffled.length; i++) {
            if (shuffled[i].title === shuffled[i - 1].title) {
                // Find a different song to swap with
                for (let j = i + 1; j < shuffled.length; j++) {
                    if (shuffled[j].title !== shuffled[i - 1].title && 
                        (j === shuffled.length - 1 || shuffled[j].title !== shuffled[j + 1].title)) {
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        fixed = true;
                        break;
                    }
                }
                if (fixed) break;
            }
        }
    }
    
    console.log(`🔀 Intelligent shuffle completed (${attempts} attempts to fix duplicates)`);
    return shuffled;
}

// Dynamic title updates
function updatePageTitle(songTitle) {
    if (songTitle) {
        document.title = `${songTitle} - Pania Music Player`;
    } else {
        document.title = 'Pania Music Player';
    }
}

// BLACKLIST FUNCTIONS
function isSongBlacklisted(songId) {
    const blacklist = JSON.parse(localStorage.getItem('blacklistedSongs') || '[]');
    return blacklist.includes(songId);
}

function addToBlacklist(songId) {
    try {
        let blacklist = JSON.parse(localStorage.getItem('blacklistedSongs') || '[]');
        if (!blacklist.includes(songId)) {
            blacklist.push(songId);
            localStorage.setItem('blacklistedSongs', JSON.stringify(blacklist));
            console.log(`🚫 Song ${songId} added to blacklist`);
        }
    } catch (error) {
        console.error('Error adding to blacklist:', error);
    }
}

function showSkipOverlay() {
    const overlay = document.getElementById('skipOverlay');
    if (overlay) {
        overlay.classList.add('show');
        setTimeout(() => {
            overlay.classList.remove('show');
        }, 2000);
    }
}

// ENHANCED MUSIC FUNCTIONS WITH SKIP
async function rateSong(type) {
    if (!currentSong || !currentSong.title) {
        showToast('هیچ آهنگی در حال پخش نیست!', 'error');
        return;
    }
    
    if (type === 'dislike') {
        // SKIP FUNCTIONALITY
        // 1. Add visual feedback
        dislikeBtn.classList.add('btn-feedback');
        
        // 2. Show skip overlay
        showSkipOverlay();
        
        // 3. Add to blacklist immediately
        addToBlacklist(currentSong.id);
        
        // 4. Skip to next song
        skipToNext();
        
        // 5. Show success message
        showToast('شعر رد شد و دیگر پخش نخواهد شد!', 'success');
        
        // 6. Remove feedback animation
        setTimeout(() => {
            dislikeBtn.classList.remove('btn-feedback');
        }, 600);
        
    } else if (type === 'like') {
        // Visual feedback
        likeBtn.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
        likeBtn.innerHTML = '✅ پسندیدم';
        showToast('آهنگ پسندیده شد!', 'success');
    }
    
    // Send rating to API
    const data = {
        userId: telegramUser.id.toString(),
        songTitle: currentSong.title,
        songId: currentSong.id || null,
        poet: currentSong.poet || 'Unknown',
        rating: type,
        timestamp: new Date().toISOString()
    };
    
    const result = await sendToAPI('/rate-song', data);
    if (result) {
        console.log(`✅ Song ${type}d successfully`);
    }
}

// ENHANCED SKIP FUNCTION
function skipToNext() {
    // Stop current audio
    audio.pause();
    audio.currentTime = 0;
    
    // Show loading state
    titleEl.classList.add('loading');
    lyricsEl.classList.add('loading');
    titleEl.textContent = 'در حال بارگذاری...';
    lyricsEl.textContent = 'در حال بارگذاری شعر بعدی...';
    
    // Find next non-blacklisted song
    playNextNonBlacklisted();
}

// ENHANCED PLAY NEXT WITH BLACKLIST SUPPORT
function playNextNonBlacklisted() {
    let attempts = 0;
    const maxAttempts = playlist.length;
    
    while (attempts < maxAttempts) {
        if (isPlayingUserPlaylist) {
            // Playing user's saved playlist
            userPlaylistIndex = (userPlaylistIndex + 1) % userPlaylist.length;
            const song = userPlaylist[userPlaylistIndex];
            
            if (!isSongBlacklisted(song.id)) {
                audio.src = song.url;
                audio.play().catch(e => {
                    console.error('Playback error:', e);
                    setTimeout(() => playNextNonBlacklisted(), 1000);
                });
                updateDisplay(song);
                console.log(`⏭️ Playing next from user playlist: ${song.title}`);
                return;
            }
        } else {
            // Playing main shuffled playlist
            currentIndex = (currentIndex + 1) % playlist.length;
            const song = playlist[currentIndex];
            
            if (!isSongBlacklisted(song.id)) {
                audio.src = song.url;
                audio.play().catch(e => {
                    console.error('Playback error:', e);
                    setTimeout(() => playNextNonBlacklisted(), 1000);
                });
                updateDisplay(song);
                console.log(`⏭️ Playing next song: ${song.title}`);
                return;
            }
        }
        attempts++;
    }
    
    // If all songs are blacklisted, show message and play anyway
    showToast('همه اشعار رد شده‌اند! پخش آخرین شعر...', 'error');
    playNext(); // Use original function as fallback
}

// Original playNext function (fallback)
function playNext() {
    if (isPlayingUserPlaylist) {
        // Playing user's saved playlist
        userPlaylistIndex = (userPlaylistIndex + 1) % userPlaylist.length;
        const song = userPlaylist[userPlaylistIndex];
        audio.src = song.url;
        audio.play().catch(e => {
            console.error('Playback error:', e);
            setTimeout(playNext, 1000);
        });
        updateDisplay(song);
        console.log(`⏭️ Playing next from user playlist: ${song.title} (${userPlaylistIndex + 1}/${userPlaylist.length})`);
    } else {
        // Playing main shuffled playlist
        currentIndex = (currentIndex + 1) % playlist.length;
        const song = playlist[currentIndex];
        audio.src = song.url;
        audio.play().catch(e => {
            console.error('Playback error:', e);
            setTimeout(playNext, 1000);
        });
        updateDisplay(song);
        console.log(`⏭️ Playing next song: ${song.title} (${currentIndex + 1}/${playlist.length})`);
    }
}

async function togglePlaylistSong() {
    if (!currentSong || !currentSong.title) {
        showToast('هیچ آهنگی در حال پخش نیست!', 'error');
        return;
    }

    if (!currentSong.id) {
        showToast('خطا: شناسه آهنگ یافت نشد!', 'error');
        return;
    }

    const songId = currentSong.id;
    const isInPlaylist = userPlaylist.some(song => song.id === songId);

    if (isInPlaylist) {
        // Remove from playlist
        const result = await sendToAPI('/remove-from-playlist', {
            userId: telegramUser.id.toString(),
            songId: songId
        });

        if (result && result.success) {
            userPlaylist = userPlaylist.filter(song => song.id !== songId);
            updatePlaylistButton();
            showToast('از پلی لیست حذف شد!', 'success');
        } else {
            showToast('خطا در حذف از پلی لیست!', 'error');
        }
    } else {
        // Add to playlist
        const data = {
            userId: telegramUser.id.toString(),
            songId: currentSong.id,
            songTitle: currentSong.title,
            poet: currentSong.poet || 'Unknown',
            url: currentSong.url,
            lyric: currentSong.lyric || '',
            timestamp: new Date().toISOString()
        };

        const result = await sendToAPI('/add-to-playlist', data);

        if (result && result.success) {
            userPlaylist.push(currentSong);
            updatePlaylistButton();
            showToast('به پلی لیست اضافه شد!', 'success');
        } else {
            showToast('خطا در افزودن به پلی لیست!', 'error');
        }
    }
}

function updatePlaylistButton() {
    if (!currentSong || !currentSong.id) return;

    const isInPlaylist = userPlaylist.some(song => song.id === currentSong.id);
    
    if (isInPlaylist) {
        playlistAddBtn.textContent = '✅ در پلی لیست';
        playlistAddBtn.classList.add('added');
        playlistAddBtn.title = 'حذف از پلی لیست';
    } else {
        playlistAddBtn.textContent = '➕ افزودن';
        playlistAddBtn.classList.remove('added');
        playlistAddBtn.title = 'افزودن به پلی لیست';
    }
}

function updateDisplay(song) {
    currentSong = song;
    titleEl.textContent = song.title || 'بدون عنوان';
    poetEl.textContent = song.poet || 'ناشناس';
    lyricsEl.innerHTML = (song.lyric || 'بدون شعر').replace(/\n/g, '<br>');
    
    // Update page title
    updatePageTitle(song.title);
    
    // Remove loading class
    titleEl.classList.remove('loading');
    lyricsEl.classList.remove('loading');
    
    // Reset button states
    resetButtonStates();
    
    // Update playlist button
    updatePlaylistButton();
    
    console.log(`🎵 Display updated: ${song.title} (ID: ${song.id || 'NO ID'})`);
}

function resetButtonStates() {
    // Reset like button
    likeBtn.style.background = 'linear-gradient(45deg, #00b894, #55efc4)';
    likeBtn.innerHTML = '👍 پسندیدم';
    
    // Reset dislike button
    dislikeBtn.innerHTML = '<span class="btn-text"><span class="skip-icon">⏭️</span><span>رد کردن</span></span>';
}

// Playlist Management Functions
async function loadUserPlaylist() {
    if (!telegramUser) {
        console.log('⚠️ Cannot load playlist - no user');
        return;
    }
    
    try {
        const playlist = await fetchFromAPI(`/get-playlist?userId=${telegramUser.id}`);
        userPlaylist = Array.isArray(playlist) ? playlist : [];
        updatePlaylistButton();
        console.log(`✅ Loaded ${userPlaylist.length} songs from playlist`);
    } catch (error) {
        console.error('Error loading playlist:', error);
        userPlaylist = [];
    }
}

async function togglePlaylist() {
    if (!telegramUser) {
        showToast('لطفاً ابتدا وارد شوید!', 'error');
        return;
    }

    const isOpen = playlistModal.classList.contains('show');
    
    if (isOpen) {
        playlistModal.classList.remove('show');
    } else {
        playlistModal.classList.add('show');
        await displayPlaylist();
    }
}

async function displayPlaylist() {
    const content = document.getElementById('playlistContent');
    content.innerHTML = '<div class="playlist-loading">در حال بارگذاری...</div>';
    
    try {
        const playlist = await fetchFromAPI(`/get-playlist?userId=${telegramUser.id}`);
        userPlaylist = Array.isArray(playlist) ? playlist : [];

        if (userPlaylist.length === 0) {
            content.innerHTML = `
                <div class="empty-playlist">
                    <div class="icon">🎵</div>
                    <h3>پلی لیست شما خالی است</h3>
                    <p>آهنگ‌های مورد علاقه خود را اضافه کنید</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <button class="play-all-btn" onclick="playAllPlaylist()">
                ▶️ پخش همه (${userPlaylist.length} آهنگ)
            </button>
            ${userPlaylist.map(song => `
                <div class="playlist-item">
                    <div class="playlist-item-info">
                        <h4>${song.title}</h4>
                        <p>شاعر: ${song.poet || 'نامشخص'}</p>
                    </div>
                    <div class="playlist-item-actions">
                        <button class="play-btn" onclick="playFromPlaylist('${song.id}')">پخش</button>
                        <button class="remove-btn" onclick="removeFromPlaylist('${song.id}')">حذف</button>
                    </div>
                </div>
            `).join('')}
        `;

        console.log(`✅ Playlist displayed with ${userPlaylist.length} songs`);

    } catch (error) {
        console.error('Error displaying playlist:', error);
        content.innerHTML = `
            <div class="empty-playlist">
                <div class="icon">❌</div>
                <h3>خطا در بارگذاری پلی لیست</h3>
                <p>لطفا دوباره تلاش کنید</p>
            </div>
        `;
    }
}

// Play all playlist functionality
async function playAllPlaylist() {
    if (userPlaylist.length === 0) {
        showToast('پلی لیست خالی است!', 'error');
        return;
    }

    // Switch to playlist mode
    isPlayingUserPlaylist = true;
    userPlaylistIndex = 0;
    
    // Close modal
    playlistModal.classList.remove('show');
    
    // Start playing first song
    const firstSong = userPlaylist[0];
    currentSong = firstSong;
    audio.src = firstSong.url;
    
    try {
        await audio.play();
        updateDisplay(firstSong);
        showToast(`شروع پخش پلی لیست - ${userPlaylist.length} آهنگ`, 'success');
        console.log(`🎵 Started playing user playlist: ${firstSong.title}`);
    } catch (error) {
        console.error('Error playing playlist:', error);
        showToast('خطا در پخش پلی لیست!', 'error');
    }
}

async function playFromPlaylist(songId) {
    const songIndex = userPlaylist.findIndex(s => s.id === songId);
    if (songIndex === -1) {
        showToast('آهنگ یافت نشد!', 'error');
        return;
    }

    // Switch to playlist mode
    isPlayingUserPlaylist = true;
    userPlaylistIndex = songIndex;
    
    // Close modal
    playlistModal.classList.remove('show');

    const song = userPlaylist[songIndex];
    currentSong = song;
    audio.src = song.url;
    
    try {
        await audio.play();
        updateDisplay(song);
        showToast(`در حال پخش: ${song.title}`, 'success');
        console.log(`▶️ Playing from playlist: ${song.title}`);
    } catch (error) {
        console.error('Error playing song:', error);
        showToast('خطا در پخش آهنگ!', 'error');
    }
}

async function removeFromPlaylist(songId) {
    try {
        const result = await sendToAPI('/remove-from-playlist', {
            userId: telegramUser.id.toString(),
            songId: songId
        });

        if (result && result.success) {
            userPlaylist = userPlaylist.filter(song => song.id !== songId);
            await displayPlaylist();
            updatePlaylistButton();
            showToast('از پلی لیست حذف شد!', 'success');
        } else {
            showToast('خطا در حذف از پلی لیست!', 'error');
        }
    } catch (error) {
        console.error('Error removing from playlist:', error);
        showToast('خطا در حذف از پلی لیست!', 'error');
    }
}

// Event listeners
audio.addEventListener('ended', playNextNonBlacklisted); // Use blacklist-aware function

// Click to play (handle autoplay restrictions)
document.body.addEventListener('click', (e) => {
    // Don't trigger auto-play when clicking on buttons or modals
    if (e.target.closest('.action-btn') || e.target.closest('.api-status') || 
        e.target.closest('.top-bar') || e.target.closest('.modal')) {
        return;
    }
    
    if (audio.paused && playlist.length > 0) {
        audio.play().catch(e => console.error('Initial playback failed:', e));
        clickHintEl.style.display = 'none';
        console.log('▶️ User initiated playback');
    }
}, { once: true });

// Close modal when clicking outside
playlistModal.addEventListener('click', (e) => {
    if (e.target === playlistModal) {
        togglePlaylist();
    }
});

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', function(e) {
    // Skip with right arrow, 's' key, or spacebar
    if (e.key === 'ArrowRight' || e.key === 's' || e.key === ' ') {
        e.preventDefault();
        rateSong('dislike');
    }
    // Like with left arrow or 'l' key  
    else if (e.key === 'ArrowLeft' || e.key === 'l') {
        e.preventDefault();
        rateSong('like');
    }
});

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Pania Music Player...');
    
    // Initialize Telegram first
    initializeTelegram();
    
    // Test API connection
    setTimeout(() => {
        fetchFromAPI('/health').then(() => {
            console.log('✅ API health check passed');
        }).catch(() => {
            console.log('❌ API health check failed');
        });
    }, 1000);

    // Load user playlist after user is initialized
    setTimeout(() => {
        if (telegramUser) {
            loadUserPlaylist();
        }
    }, 2000);
    
    // Load CSV and initialize music
    console.log('📊 Starting CSV download...');
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            console.log(`📊 CSV loaded: ${results.data.length} rows`);
            
            const songs = results.data
                .map(row => ({
                    id: row.id?.trim() || row.ID?.trim() || `auto_${Math.random().toString(36).substr(2, 9)}`,
                    title: row.title?.trim(),
                    poet: row.poet?.trim(),
                    lyric: row.lyric?.trim(),
                    url: row.url?.trim()
                }))
                .filter(song => song.url && song.title && song.url.startsWith('http'));

            console.log(`🎵 Valid songs found: ${songs.length}`);

            if (songs.length === 0) {
                titleEl.textContent = 'خطا';
                titleEl.classList.remove('loading');
                lyricsEl.textContent = 'هیچ آهنگ معتبری یافت نشد';
                lyricsEl.classList.remove('loading');
                return;
            }

            // Use intelligent shuffle to prevent consecutive same titles
            playlist = intelligentShuffle(songs);
            
            // Start with first NON-BLACKLISTED song
            let startIndex = 0;
            while (startIndex < playlist.length && isSongBlacklisted(playlist[startIndex].id)) {
                startIndex++;
            }
            
            if (startIndex >= playlist.length) {
                console.log('⚠️ All songs are blacklisted, starting with first song anyway');
                startIndex = 0;
            }
            
            currentIndex = startIndex;
            const firstSong = playlist[currentIndex];
            audio.src = firstSong.url;
            updateDisplay(firstSong);
            
            // Try to play, but handle autoplay restrictions
            audio.play().catch(e => {
                console.log('⚠️ Autoplay blocked - showing click hint');
                clickHintEl.style.display = 'block';
            });
            
            console.log(`✅ Player initialized with ${playlist.length} songs (started at index ${startIndex})`);
        },
        error: function(error) {
            console.error('❌ CSV loading failed:', error);
            titleEl.textContent = 'خطا در بارگذاری';
            titleEl.classList.remove('loading');
            lyricsEl.textContent = 'خطا در بارگذاری CSV';
            lyricsEl.classList.remove('loading');
        }
    });
});

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
        apiStatusEl.textContent = '🟢 API Online';
    } else {
        apiStatusEl.className = 'api-status offline';
        apiStatusEl.textContent = '🔴 API Offline';
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

// Music Functions
async function rateSong(type) {
    if (!currentSong || !currentSong.title) {
        showToast('هیچ آهنگی در حال پخش نیست!', 'error');
        return;
    }
    
    // Visual feedback
    if (type === 'like') {
        likeBtn.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
        showToast('آهنگ پسندیده شد!', 'success');
    } else {
        dislikeBtn.style.background = 'linear-gradient(45deg, #c0392b, #e55656)';
        showToast('آهنگ نپسندیده شد!', 'success');
    }
    
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
    
    // Update playlist button
    updatePlaylistButton();
    
    console.log(`🎵 Display updated: ${song.title} (ID: ${song.id || 'NO ID'})`);
}

// Enhanced playNext with playlist support
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

// NEW: Play all playlist functionality
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
audio.addEventListener('ended', playNext);

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
            
            // Start with first song from shuffled playlist
            currentIndex = 0;
            const firstSong = playlist[currentIndex];
            audio.src = firstSong.url;
            updateDisplay(firstSong);
            
            // Try to play, but handle autoplay restrictions
            audio.play().catch(e => {
                console.log('⚠️ Autoplay blocked - showing click hint');
                clickHintEl.style.display = 'block';
            });
            
            console.log(`✅ Player initialized with ${playlist.length} songs`);
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
// Enhanced rateSong function with skip functionality
async function rateSong(rating) {
    const currentSong = getCurrentSongData(); // You'll need to implement this based on your current song tracking
    
    try {
        if (rating === 'dislike') {
            // 1. Add visual feedback immediately
            const dislikeBtn = document.getElementById('dislikeBtn');
            dislikeBtn.classList.add('btn-feedback');
            
            // 2. Show skip overlay
            showSkipOverlay();
            
            // 3. Immediately skip to next song
            await skipToNextSong();
            
            // 4. Add to blacklist
            await addToBlacklist(currentSong.id);
            
            // 5. Record the dislike rating (optional)
            await recordRating(currentSong.id, 'dislike');
            
            // 6. Show success message
            showToast('شعر رد شد و دیگر پخش نخواهد شد', 'success');
            
            // 7. Remove feedback animation
            setTimeout(() => {
                dislikeBtn.classList.remove('btn-feedback');
            }, 600);
            
        } else if (rating === 'like') {
            // Handle like as before
            await recordRating(currentSong.id, 'like');
            showToast('شعر به لیست مورد علاقه‌های شما اضافه شد!', 'success');
            
            // Update UI
            const likeBtn = document.getElementById('likeBtn');
            likeBtn.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
            likeBtn.innerHTML = '✅ پسندیدم';
        }
        
    } catch (error) {
        console.error('Rating error:', error);
        showToast('خطا در عملیات', 'error');
    }
}

// Get current song data - you'll need to adapt this to your current implementation
function getCurrentSongData() {
    // This should return the current song object with at least an 'id' property
    // Example implementation:
    return {
        id: window.currentSongId || Date.now(), // Use your actual song ID
        title: document.getElementById('title').textContent,
        poet: document.getElementById('poet').textContent
    };
}

// Skip to next song immediately
async function skipToNextSong() {
    const audio = document.getElementById('audio');
    
    // Stop current audio
    audio.pause();
    audio.currentTime = 0;
    
    // Show loading state
    document.getElementById('lyrics').classList.add('loading');
    document.getElementById('title').classList.add('loading');
    document.getElementById('lyrics').textContent = 'در حال بارگذاری شعر بعدی...';
    document.getElementById('title').textContent = 'در حال بارگذاری...';
    
    // Load next song - adapt this to your existing function
    try {
        await loadNextSong(); // You'll need to implement this or adapt your existing function
    } catch (error) {
        console.error('Error loading next song:', error);
        showToast('خطا در بارگذاری شعر بعدی', 'error');
    }
}

// Add song to user's permanent blacklist
async function addToBlacklist(songId) {
    try {
        // Store in local storage for immediate effect
        let blacklist = JSON.parse(localStorage.getItem('blacklistedSongs') || '[]');
        if (!blacklist.includes(songId)) {
            blacklist.push(songId);
            localStorage.setItem('blacklistedSongs', JSON.stringify(blacklist));
        }
        
        // Also send to server if you have an API endpoint
        // Uncomment and adapt this if you have a server API:
        /*
        const response = await fetch('/api/blacklist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: getUserId(), // Implement this function
                songId: songId,
                action: 'add'
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update server blacklist');
        }
        */
        
    } catch (error) {
        console.error('Error adding to blacklist:', error);
        // Even if server fails, local storage will work
    }
}

// Check if song is blacklisted before playing
function isSongBlacklisted(songId) {
    const blacklist = JSON.parse(localStorage.getItem('blacklistedSongs') || '[]');
    return blacklist.includes(songId);
}

// Show skip overlay
function showSkipOverlay() {
    const overlay = document.getElementById('skipOverlay');
    overlay.classList.add('show');
    
    // Hide after 2 seconds
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 2000);
}

// Enhanced loadNextSong function that respects blacklist
async function loadNextSong() {
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop
    
    while (attempts < maxAttempts) {
        // Get a random song using your existing method
        const song = await getRandomSong(); // You'll need to implement this or use your existing function
        
        if (!isSongBlacklisted(song.id)) {
            // Load this song
            await loadSong(song); // You'll need to implement this or use your existing function
            return;
        }
        
        attempts++;
    }
    
    // If all songs seem blacklisted, show message and load anyway
    showToast('همه اشعار پیشنهادی قبلاً رد شده‌اند', 'error');
    const song = await getRandomSong();
    await loadSong(song);
}

// Example implementations you'll need to adapt to your existing code:

// Get random song - adapt this to your API
async function getRandomSong() {
    // This is just an example - replace with your actual API call
    try {
        const response = await fetch('/api/random-song'); // Your API endpoint
        const song = await response.json();
        return song;
    } catch (error) {
        console.error('Error fetching random song:', error);
        // Return a dummy song for testing
        return {
            id: Date.now(),
            title: 'شعر تست',
            poet: 'شاعر تست',
            lyrics: 'این یک شعر تست است...',
            audio: ''
        };
    }
}

// Load song - adapt this to your existing implementation
async function loadSong(song) {
    // Update UI
    document.getElementById('title').textContent = song.title;
    document.getElementById('poet').textContent = song.poet;
    document.getElementById('lyrics').textContent = song.lyrics;
    
    // Store current song ID for blacklisting
    window.currentSongId = song.id;
    
    // Load audio if available
    const audio = document.getElementById('audio');
    if (song.audio) {
        audio.src = song.audio;
        audio.load();
    }
    
    // Remove loading state
    document.getElementById('lyrics').classList.remove('loading');
    document.getElementById('title').classList.remove('loading');
    
    // Reset buttons
    resetButtonStates();
}

// Reset button states when loading new song
function resetButtonStates() {
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    const playlistBtn = document.getElementById('playlistAddBtn');
    
    // Reset like button
    likeBtn.style.background = 'linear-gradient(45deg, #00b894, #55efc4)';
    likeBtn.innerHTML = '👍 پسندیدم';
    
    // Reset playlist button
    playlistBtn.classList.remove('added');
    playlistBtn.innerHTML = '➕ افزودن';
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Record rating (optional - adapt to your API)
async function recordRating(songId, rating) {
    try {
        // Store locally
        let ratings = JSON.parse(localStorage.getItem('songRatings') || '{}');
        ratings[songId] = rating;
        localStorage.setItem('songRatings', JSON.stringify(ratings));
        
        // Send to server if you have an API
        // await fetch('/api/rate', { ... });
        
    } catch (error) {
        console.error('Error recording rating:', error);
    }
}

// Initialize enhanced functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add keyboard shortcuts for better UX
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
    
    console.log('Skip functionality initialized');
});


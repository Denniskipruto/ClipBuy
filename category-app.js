/*
  ClipBuy App Configuration
  -------------------------
  This file contains the entire front-end logic for a dynamic video-based auction
  landing page. The app is structured into configuration, storage helpers,
  rendering utilities, interaction wiring, and page lifecycle initialization.
*/

// Page configuration defines metadata and which feed is shown for each page route.
// This mapping drives the rendered page title, hero state, and selected video feed.
const pageConfig = {
  home: {
    title: 'ClipBuy',
    heroImage: 'norbert-kowalczyk-DltiuHDZ_Tw-unsplash.jpg',
    showCategories: true,
  },
  live: {
    title: 'ClipBuy Live',
    heroImage: 'norbert-kowalczyk-DltiuHDZ_Tw-unsplash.jpg',
    comingSoon: true,
  },
  phones: {
    title: 'Phones Video Feed',
    feedKey: 'phones',
  },
  clothing: {
    title: 'Clothing Video Feed',
    feedKey: 'clothing',
  },
  sneakers: {
    title: 'Sneakers Video Feed',
    feedKey: 'sneakers',
  },
  tvs: {
    title: 'TVs Video Feed',
    feedKey: 'tvs',
  },
  'video-feed': {
    title: 'Vertical Video Feed',
    feedKey: 'video-feed',
  },
};

// Navigation links used in the header menu.
const navLinks = [
  { href: '#hero', label: 'Home' },
  { href: '#categories', label: 'Categories' },
  { href: 'live.html', label: 'Live' },
  { href: 'deals.html', label: 'Deals' },
];

const STORAGE_USERS = 'clipbuy-users';
const STORAGE_SESSION = 'clipbuy-session';
const STORAGE_BIDS = 'clipbuy-bids';
let currentPageKey = 'home';
let activeAuthMode = 'login';

/*
  Local storage helpers
  ---------------------
  Store and retrieve user data in the browser so auth state and bids
  persist while the user navigates between pages or refreshes the app.
  - users list
  - active session
  - saved bids history
*/

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getActiveUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SESSION));
  } catch {
    return null;
  }
}

function setActiveUser(username) {
  localStorage.setItem(STORAGE_SESSION, JSON.stringify({ username }));
}

function clearActiveUser() {
  localStorage.removeItem(STORAGE_SESSION);
}

function saveBid(bid) {
  try {
    const bids = JSON.parse(localStorage.getItem(STORAGE_BIDS) || '[]');
    bids.push(bid);
    localStorage.setItem(STORAGE_BIDS, JSON.stringify(bids));
  } catch {
    localStorage.setItem(STORAGE_BIDS, JSON.stringify([bid]));
  }
}

function loadBids() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_BIDS) || '[]');
  } catch {
    return [];
  }
}

function getMyBids() {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return [];
  }
  return loadBids().filter((bid) => bid.username === activeUser.username);
}

function getActiveLabel() {
  const activeUser = getActiveUser();
  return activeUser ? `Logged in as ${activeUser.username}` : 'Not signed in';
}

function getAuthButtonLabel() {
  return getActiveUser() ? 'Logout' : 'Login';
}

const simulatedUsers = ['GadgetGuru', 'StyleScout', 'SneakerFiend', 'HomeCinephile', 'PixelPro', 'TrendWatcher', 'AudioAce', 'LuxeLover'];
let chatSimTimer = null;
let countdownTimer = null;
let outbidTimer = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function findFeedItem(title) {
  const normalized = title.toLowerCase();
  for (const key of Object.keys(feedData)) {
    const list = feedData[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item.title.toLowerCase() === normalized) {
        return item;
      }
    }
  }
  return null;
}

function stopCountdownInterval() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function stopChatSimulation() {
  if (chatSimTimer) {
    clearInterval(chatSimTimer);
    chatSimTimer = null;
  }
}

function stopOutbidSimulation() {
  if (outbidTimer) {
    clearInterval(outbidTimer);
    outbidTimer = null;
  }
}

/*
  Audio and visual feedback utilities
  -----------------------------------
  Provide interaction feedback for the auction interface.
  - playBellSound: success and bid confirmation
  - playOutbidSound / playWarningSound: auction alerts
  - flashFireFeedback / flashHeartFeedback: visual badges for actions
*/

function playBellSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.28);
  } catch (error) {
    console.warn('Bell sound unavailable', error);
  }
}

function flashFireFeedback(section) {
  const badge = document.createElement('span');
  badge.className = 'fire-feedback';
  badge.textContent = '🔥 Bid placed!';
  section.appendChild(badge);
  requestAnimationFrame(() => badge.classList.add('visible'));
  setTimeout(() => {
    badge.classList.remove('visible');
    setTimeout(() => badge.remove(), 300);
  }, 900);
}

function flashHeartFeedback(section) {
  const badge = document.createElement('span');
  badge.className = 'heart-feedback';
  badge.textContent = '❤️ Outbid!';
  section.appendChild(badge);
  requestAnimationFrame(() => badge.classList.add('visible'));
  setTimeout(() => {
    badge.classList.remove('visible');
    setTimeout(() => badge.remove(), 300);
  }, 1100);
}

function playOutbidSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
  } catch (error) {
    console.warn('Outbid sound unavailable', error);
  }
}

function playWarningSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.22);
  } catch (error) {
    console.warn('Warning sound unavailable', error);
  }
}

function updateBuyNowButton(section) {
  const currentBidEl = section.querySelector('[data-current-bid]');
  const buyNowBtn = section.querySelector('.buy-now');
  if (!currentBidEl || !buyNowBtn) return;

  const currentValue = Number(currentBidEl.textContent.replace(/[^0-9]/g, ''));
  const buyNowPrice = currentValue + 150;
  buyNowBtn.dataset.buyNow = buyNowPrice;
  buyNowBtn.textContent = `Buy now $${buyNowPrice.toLocaleString()}`;
}

function closeAuctionSection(section) {
  section.dataset.closed = 'true';
  const bidNowBtn = section.querySelector('[data-bid-now]');
  const buyNowBtn = section.querySelector('.buy-now');
  const quickBids = section.querySelectorAll('.quick-bid');
  const customBidInput = section.querySelector('[data-custom-bid]');
  const messageEl = section.querySelector('.auction-message');
  const countdownEl = section.querySelector('[data-countdown]');

  if (bidNowBtn) {
    bidNowBtn.disabled = true;
    bidNowBtn.classList.add('disabled');
  }
  if (buyNowBtn) {
    buyNowBtn.disabled = true;
    buyNowBtn.classList.add('disabled');
  }
  quickBids.forEach((button) => {
    button.disabled = true;
    button.classList.remove('active');
  });
  if (customBidInput) {
    customBidInput.disabled = true;
  }
  if (countdownEl) {
    countdownEl.textContent = 'Closed';
  }
  if (messageEl) {
    messageEl.textContent = 'Auction closed';
  }
}

function startChatSimulation() {
  stopChatSimulation();
  chatSimTimer = setInterval(() => {
    const sections = Array.from(document.querySelectorAll('.feed-section')).filter((section) => section.dataset.closed !== 'true');
    if (!sections.length) return;
    const section = sections[randomInt(0, sections.length - 1)];
    const item = findFeedItem(section.dataset.title || '');
    if (!item || !item.chatPool?.length) return;
    const chatThread = section.querySelector('.chat-thread');
    const randomMsg = item.chatPool[randomInt(0, item.chatPool.length - 1)];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
      <strong>${randomMsg.author}</strong><span>${time}</span>
      <p>${randomMsg.message}</p>
    `;
    chatThread.appendChild(messageEl);
    chatThread.scrollTop = chatThread.scrollHeight;
  }, 6500);
}

function simulateOutbid() {
  const sections = Array.from(document.querySelectorAll('.feed-section')).filter((section) => section.dataset.closed !== 'true');
  if (!sections.length) return;
  const section = sections[randomInt(0, sections.length - 1)];
  const countdownEl = section.querySelector('[data-countdown]');
  if (!countdownEl || countdownEl.textContent === 'Timed out' || countdownEl.textContent === 'Closed') return;
  const currentBidEl = section.querySelector('[data-current-bid]');
  const highestEl = section.querySelector('.highest-bidder');
  if (!currentBidEl || !highestEl) return;
  const currentValue = Number(currentBidEl.textContent.replace(/[^0-9]/g, ''));
  const raise = randomInt(10, 45) * 5;
  const nextBid = currentValue + raise;
  const nextUser = simulatedUsers[randomInt(0, simulatedUsers.length - 1)];
  const activeUser = getActiveUser();
  const wasUserHighest = activeUser && highestEl.textContent === activeUser.username;

  currentBidEl.textContent = `$${nextBid.toLocaleString()}`;
  highestEl.textContent = nextUser;
  highestEl.dataset.highestBidder = nextUser;
  updateBuyNowButton(section);

  const messageEl = section.querySelector('.auction-message');
  if (messageEl) {
    messageEl.textContent = `${nextUser} just outbid the highest offer!`;
    setTimeout(() => {
      if (messageEl.textContent && messageEl.textContent.includes('outbid')) {
        messageEl.textContent = '';
      }
    }, 2400);
  }

  if (wasUserHighest && activeUser) {
    flashHeartFeedback(section);
    playOutbidSound();
  }
}

function startOutbidSimulation() {
  stopOutbidSimulation();
  outbidTimer = setInterval(simulateOutbid, 11000);
}

function refreshMyBidsPanel() {
  const panel = document.querySelector('.my-bids-panel');
  if (!panel) return;
  const body = panel.querySelector('.my-bids-body');
  const headerUser = panel.querySelector('.my-bids-header span');
  const activeUser = getActiveUser();
  if (!body || !headerUser) return;

  if (!activeUser) {
    headerUser.textContent = 'Login to track bids';
    body.innerHTML = '<p>Please log in to save and view bids.</p>';
    return;
  }

  const bids = getMyBids();
  headerUser.textContent = activeUser.username;
  body.innerHTML = `<ul>${bids.slice(-5).reverse().map((bid) => `<li><strong>${bid.item}</strong> — $${bid.amount.toLocaleString()} <span>${new Date(bid.at).toLocaleString()}</span></li>`).join('') || '<li>No bids yet.</li>'}</ul>`;
}

function registerUser(username, password) {
  const trimmedName = username.trim();
  if (!trimmedName || !password) {
    return { success: false, message: 'Enter a username and password.' };
  }

  const existing = loadUsers().find((user) => user.username === trimmedName);
  if (existing) {
    return { success: false, message: 'That username is already taken.' };
  }

  const users = loadUsers();
  users.push({ username: trimmedName, password });
  saveUsers(users);
  setActiveUser(trimmedName);
  return { success: true };
}

function loginUser(username, password) {
  const trimmedName = username.trim();
  if (!trimmedName || !password) {
    return { success: false, message: 'Enter a username and password.' };
  }

  const user = loadUsers().find((item) => item.username === trimmedName && item.password === password);
  if (!user) {
    return { success: false, message: 'Invalid username or password.' };
  }

  setActiveUser(trimmedName);
  return { success: true };
}

function filterFeedSections(query) {
  const filter = query.trim().toLowerCase();
  const sections = document.querySelectorAll('.feed-section');
  sections.forEach((section) => {
    const title = section.dataset.title || '';
    const tags = section.dataset.tags || '';
    const visible = !filter || title.includes(filter) || tags.includes(filter);
    section.style.display = visible ? '' : 'none';
  });
}

/*
  Category and feed data
  ----------------------
  Static content used by the renderer to build pages.
  - categories: home page category cards
  - feedData: auction item definitions for each feed page
*/

const categories = [
  {
    href: 'phones.html',
    image: 'rami-al-zayat-w33-zg-dNL4-unsplash.jpg',
    title: 'Phones',
    description: 'Latest devices with premium mobile experiences.',
  },
  {
    href: 'clothing.html',
    image: 'keagan-henman-xPJYL0l5Ii8-unsplash.jpg',
    title: 'Clothing',
    description: 'Styles curated for every season and look.',
  },
  {
    href: 'sneakers.html',
    image: 'himal-rana-4RJTBGP3YwQ-unsplash.jpg',
    title: 'Sneakers',
    description: 'Heat on the streets with exclusive drops.',
  },
  {
    href: 'tvs.html',
    image: 'oscar-nord-Sd87V72cJEU-unsplash.jpg',
    title: 'TVs',
    description: 'Immersive entertainment for your living room.',
  },
];

const feedData = {
  default: [
    {
      video: 'video.mp4',
      title: 'iPhone 15 Pro Max',
      tags: ['Apple', 'A17 Pro', '48MP'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=256&q=80',
        name: 'AppleStore',
        followers: '12.1K followers',
      },
      auction: {
        currentBid: 1199,
        countdown: 52,
        highestBidder: '@PhoneLife',
        quickBids: [1225, 1249, 1275, 1299],
        startingBid: 1200,
      },
      chat: [
        { author: 'MobileMaven', time: '9:04 AM', message: 'That Pro camera is insanely crisp.' },
        { author: 'JessTech', time: '9:05 AM', message: 'Does it come with AppleCare?' },
        { author: 'CoreUser', time: '9:06 AM', message: 'I need the larger battery for travel.' },
      ],
      chatPool: [
        { author: 'UltraUser', message: 'The display looks so bright in the live demo.' },
        { author: 'DataDriven', message: 'I’m curious if the charging speed is better than last year.' },
        { author: 'TMOFan', message: 'Can it handle 5G on every carrier?' },
      ],
    },
    {
      video: '5770155-hd_1920_1080_25fps.mp4',
      title: 'Samsung Galaxy S24 Ultra',
      tags: ['Android', '200MP', 'S Pen'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1523475496153-3d6cc735df3b?auto=format&fit=crop&w=256&q=80',
        name: 'GalaxyMall',
        followers: '9.9K followers',
      },
      auction: {
        currentBid: 1095,
        countdown: 68,
        highestBidder: '@GalaxyGuru',
        quickBids: [1109, 1125, 1145, 1160],
        startingBid: 1100,
      },
      chat: [
        { author: 'SPenFan', time: '10:12 AM', message: 'That large zoom lens is perfect for travel.' },
        { author: 'Andi', time: '10:13 AM', message: 'Anyone know if it supports 45W charging?' },
        { author: 'OneUI', time: '10:14 AM', message: 'The software looks super smooth in motion.' },
      ],
      chatPool: [
        { author: 'CameraKing', message: 'I need this for low-light night shots.' },
        { author: 'FanBoy', message: 'The S Pen integration is a game changer.' },
        { author: 'GadgetGal', message: 'How’s the battery with heavy use?' },
      ],
    },
    {
      video: '3692634-hd_1920_1080_30fps.mp4',
      title: 'Google Pixel 8 Pro',
      tags: ['Tensor G3', 'Magic Editor', 'AI'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=256&q=80',
        name: 'PixelPulse',
        followers: '6.4K followers',
      },
      auction: {
        currentBid: 899,
        countdown: 58,
        highestBidder: '@PixelPro',
        quickBids: [915, 930, 945, 960],
        startingBid: 900,
      },
      chat: [
        { author: 'AIGeek', time: '11:02 AM', message: 'Pixel’s AI camera edits are so slick.' },
        { author: 'CamLover', time: '11:03 AM', message: 'Please show the macro shots again.' },
        { author: 'BatteryBuff', time: '11:04 AM', message: 'How long does it last on a 4K stream?' },
      ],
      chatPool: [
        { author: 'MagicMike', message: 'Those photo previews are crisp.' },
        { author: 'GPhotos', message: 'I want the live text translation feature.' },
        { author: 'AndroidAnna', message: 'Does it work with all the new Pixel cases?' },
      ],
    },
  ],
  phones: [
    {
      video: '12441653_1080_1920_30fps.mp4',
      title: 'iPhone 15 Pro Max',
      tags: ['Apple', 'A17 Pro', '48MP'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=256&q=80',
        name: 'AppleStore',
        followers: '12.1K followers',
      },
      auction: {
        currentBid: 1199,
        countdown: 52,
        highestBidder: '@PhoneLife',
        quickBids: [1225, 1249, 1275, 1299],
        startingBid: 1200,
      },
      chat: [
        { author: 'MobileMaven', time: '9:04 AM', message: 'That Pro camera is insanely crisp.' },
        { author: 'JessTech', time: '9:05 AM', message: 'Does it come with AppleCare?' },
        { author: 'CoreUser', time: '9:06 AM', message: 'I need the larger battery for travel.' },
      ],
      chatPool: [
        { author: 'UltraUser', message: 'The display looks so bright in the live demo.' },
        { author: 'DataDriven', message: 'I’m curious if the charging speed is better than last year.' },
        { author: 'TMOFan', message: 'Can it handle 5G on every carrier?' },
      ],
    },
    {
      video: '5770155-hd_1920_1080_25fps.mp4',
      title: 'Samsung Galaxy S24 Ultra',
      tags: ['Android', '200MP', 'S Pen'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1523475496153-3d6cc735df3b?auto=format&fit=crop&w=256&q=80',
        name: 'GalaxyMall',
        followers: '9.9K followers',
      },
      auction: {
        currentBid: 1095,
        countdown: 68,
        highestBidder: '@GalaxyGuru',
        quickBids: [1109, 1125, 1145, 1160],
        startingBid: 1100,
      },
      chat: [
        { author: 'SPenFan', time: '10:12 AM', message: 'That large zoom lens is perfect for travel.' },
        { author: 'Andi', time: '10:13 AM', message: 'Anyone know if it supports 45W charging?' },
        { author: 'OneUI', time: '10:14 AM', message: 'The software looks super smooth in motion.' },
      ],
      chatPool: [
        { author: 'CameraKing', message: 'I need this for low-light night shots.' },
        { author: 'FanBoy', message: 'The S Pen integration is a game changer.' },
        { author: 'GadgetGal', message: 'How’s the battery with heavy use?' },
      ],
    },
    {
      video: '3692634-hd_1920_1080_30fps.mp4',
      title: 'Google Pixel 8 Pro',
      tags: ['Tensor G3', 'Magic Editor', 'AI'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=256&q=80',
        name: 'PixelPulse',
        followers: '6.4K followers',
      },
      auction: {
        currentBid: 899,
        countdown: 58,
        highestBidder: '@PixelPro',
        quickBids: [915, 930, 945, 960],
        startingBid: 900,
      },
      chat: [
        { author: 'AIGeek', time: '11:02 AM', message: 'Pixel’s AI camera edits are so slick.' },
        { author: 'CamLover', time: '11:03 AM', message: 'Please show the macro shots again.' },
        { author: 'BatteryBuff', time: '11:04 AM', message: 'How long does it last on a 4K stream?' },
      ],
      chatPool: [
        { author: 'MagicMike', message: 'Those photo previews are crisp.' },
        { author: 'GPhotos', message: 'I want the live text translation feature.' },
        { author: 'AndroidAnna', message: 'Does it work with all the new Pixel cases?' },
      ],
    },
  ],
  tvs: [
    {
      video: '15799014_2160_3840_24fps.mp4',
      title: 'LG C3 OLED 65"',
      tags: ['OLED', 'Dolby Vision', '4K'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=256&q=80',
        name: 'OLED House',
        followers: '7.3K followers',
      },
      auction: {
        currentBid: 1799,
        countdown: 62,
        highestBidder: '@HomeCinephile',
        quickBids: [1815, 1830, 1850, 1875],
        startingBid: 1800,
      },
      chat: [
        { author: 'CinemaSam', time: '12:08 PM', message: 'Wow the black levels are perfect on this panel.' },
        { author: 'GameNerd', time: '12:09 PM', message: 'Is there a low input lag mode for consoles?' },
        { author: 'FrameFan', time: '12:10 PM', message: 'I love how thin it looks on the wall.' },
      ],
      chatPool: [
        { author: 'MovieJunkie', message: 'This is ideal for late-night streaming.' },
        { author: 'SoundGuy', message: 'Does the TV support HDMI 2.1 for PS5?' },
        { author: 'StreamQueen', message: 'The colors look so natural here.' },
      ],
    },
    {
      video: '15279536_2160_3840_24fps.mp4',
      title: 'Samsung S95C QD-OLED 55"',
      tags: ['Quantum', 'HDR', 'Smart TV'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=256&q=80',
        name: 'VisionSource',
        followers: '8.7K followers',
      },
      auction: {
        currentBid: 1499,
        countdown: 48,
        highestBidder: '@ScreenPro',
        quickBids: [1510, 1535, 1560, 1580],
        startingBid: 1500,
      },
      chat: [
        { author: 'Cinephile', time: '1:02 PM', message: 'Probably the best contrast I’ve seen in this price range.' },
        { author: 'TechTalk', time: '1:03 PM', message: 'How are the smart TV apps running?' },
        { author: 'RGBFan', time: '1:04 PM', message: 'This would be perfect for my movie room.' },
      ],
      chatPool: [
        { author: 'TVCritic', message: 'That picture depth is unreal.' },
        { author: 'GamerGirl', message: 'Is this good for 4K gaming?' },
        { author: 'HomeSetup', message: 'Nice, I need a screen upgrade.' },
      ],
    },
    {
      video: '14527856_2160_3840_24fps.mp4',
      title: 'Sony A80L 77"',
      tags: ['Bravia', 'Acoustic Surface', '4K'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=256&q=80',
        name: 'CineMax',
        followers: '6.8K followers',
      },
      auction: {
        currentBid: 2199,
        countdown: 54,
        highestBidder: '@ScreenGenius',
        quickBids: [2210, 2235, 2260, 2285],
        startingBid: 2200,
      },
      chat: [
        { author: 'Audiophile', time: '2:14 PM', message: 'Love the sound on this one with the built-in speakers.' },
        { author: 'StreamFan', time: '2:15 PM', message: 'Those blacks are pure.' },
        { author: 'HomeBuilder', time: '2:16 PM', message: 'This would look amazing in a media room.' },
      ],
      chatPool: [
        { author: 'VisualVibes', message: 'That screen looks buttery smooth.' },
        { author: 'MovieLover', message: 'Can it handle Dolby Atmos passthrough?' },
        { author: 'RoomDesign', message: 'Gorgeous panel for interior design.' },
      ],
    },
  ],
  clothing: [
    {
      video: '14646171_1920_1080_25fps.mp4',
      title: 'Apex Performance Jacket',
      tags: ['Waterproof', 'Lightweight', 'Layerable'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=256&q=80',
        name: 'UrbanFit',
        followers: '7.1K followers',
      },
      auction: {
        currentBid: 159,
        countdown: 70,
        highestBidder: '@StyleScout',
        quickBids: [165, 170, 175, 180],
        startingBid: 160,
      },
      chat: [
        { author: 'RainReady', time: '10:05 AM', message: 'That jacket looks perfect for early morning hikes.' },
        { author: 'FitTips', time: '10:07 AM', message: 'Is it true it packs down small?' },
        { author: 'TrendSpot', time: '10:09 AM', message: 'I love the reflective trim.' },
      ],
      chatPool: [
        { author: 'LayerUp', message: 'That material looks incredibly breathable.' },
        { author: 'TrailBlazer', message: 'Great for city and trail use.' },
        { author: 'WeatherGuy', message: 'How warm is it without adding bulk?' },
      ],
    },
    {
      video: '5913737-hd_1080_1920_25fps.mp4',
      title: 'Urban Denim Jacket',
      tags: ['Vintage', 'Stone Wash', 'Relaxed Fit'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=256&q=80',
        name: 'DenimCo',
        followers: '5.8K followers',
      },
      auction: {
        currentBid: 95,
        countdown: 55,
        highestBidder: '@DenimDiva',
        quickBids: [100, 105, 110, 115],
        startingBid: 98,
      },
      chat: [
        { author: 'StyleGeek', time: '11:20 AM', message: 'This jacket has such a clean vintage feel.' },
        { author: 'FitFinder', time: '11:22 AM', message: 'Is it true to size or should I size up?' },
        { author: 'DenimLover', time: '11:24 AM', message: 'Perfect for layering in fall.' },
      ],
      chatPool: [
        { author: 'StreetStylz', message: 'That wash is exactly what I wanted.' },
        { author: 'OutfitCheck', message: 'Love the contrast stitching.' },
        { author: 'Wardrobe', message: 'Looks great with sneakers or boots.' },
      ],
    },
    {
      video: '7577395-uhd_2160_3840_24fps.mp4',
      title: 'Luxe Knit Hoodie',
      tags: ['Soft', 'Cozy', 'Limited'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
        name: 'CloudWear',
        followers: '6.2K followers',
      },
      auction: {
        currentBid: 88,
        countdown: 60,
        highestBidder: '@CozyCorner',
        quickBids: [92, 96, 100, 104],
        startingBid: 90,
      },
      chat: [
        { author: 'SoftTouch', time: '12:01 PM', message: 'That hoodie looks incredibly comfy.' },
        { author: 'GymGirl', time: '12:03 PM', message: 'Perfect for post-workout lounging.' },
        { author: 'StyleFeed', time: '12:05 PM', message: 'I’m vibing the neutral tone.' },
      ],
      chatPool: [
        { author: 'SnugBug', message: 'Hopefully it comes in more colors.' },
        { author: 'Seasonal', message: 'It looks so plush.' },
        { author: 'LayerLine', message: 'This is great for chilly evenings.' },
      ],
    },
  ],
  sneakers: [
    {
      video: '7884046-uhd_4096_2160_25fps.mp4',
      title: 'Nike Air Max 270',
      tags: ['Comfort', 'Air Unit', 'Streetwear'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1519741491130-2d6d0e44d7b3?auto=format&fit=crop&w=256&q=80',
        name: 'KicksZone',
        followers: '10.8K followers',
      },
      auction: {
        currentBid: 160,
        countdown: 66,
        highestBidder: '@SneakerFiend',
        quickBids: [165, 170, 175, 180],
        startingBid: 165,
      },
      chat: [
        { author: 'RunClub', time: '1:14 PM', message: 'These look perfect for walking and gym days.' },
        { author: 'SoleMate', time: '1:16 PM', message: 'Love the colorway.' },
        { author: 'StreetHeat', time: '1:18 PM', message: 'Are they true to size?' },
      ],
      chatPool: [
        { author: 'LaceUp', message: 'I need these for everyday wear.' },
        { author: 'DropAlert', message: 'This release is fire.' },
        { author: 'ShoeFits', message: 'The sole looks super cushioned.' },
      ],
    },
    {
      video: '15314003_1080_1920_24fps.mp4',
      title: 'Adidas Ultraboost 22',
      tags: ['Boost', 'Running', 'Lifestyle'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=256&q=80',
        name: 'RunClub',
        followers: '9.3K followers',
      },
      auction: {
        currentBid: 170,
        countdown: 58,
        highestBidder: '@BoostBuddy',
        quickBids: [175, 180, 185, 190],
        startingBid: 175,
      },
      chat: [
        { author: 'RoadRunner', time: '2:00 PM', message: 'These are perfect for long runs.' },
        { author: 'ComfortZone', time: '2:02 PM', message: 'The knit upper looks breathable.' },
        { author: 'SneakerHead', time: '2:04 PM', message: 'I want this with the matching joggers.' },
      ],
      chatPool: [
        { author: 'StrideStar', message: 'The BOOST cushion is legendary.' },
        { author: 'FitPro', message: 'Great choice for training days.' },
        { author: 'UrbanStep', message: 'That colorway is clean.' },
      ],
    },
    {
      video: '4380323-hd_1080_1920_30fps (1).mp4',
      title: 'Jordan 1 Retro High',
      tags: ['Retro', 'Court Purple', 'Lifestyle'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1528701800489-2f23aefa34c2?auto=format&fit=crop&w=256&q=80',
        name: 'HeritageSneaks',
        followers: '11.4K followers',
      },
      auction: {
        currentBid: 225,
        countdown: 64,
        highestBidder: '@Jumpman',
        quickBids: [230, 235, 240, 245],
        startingBid: 230,
      },
      chat: [
        { author: 'RetroVibe', time: '3:10 PM', message: 'These are a must-cop for Jordan fans.' },
        { author: 'HoopsFan', time: '3:12 PM', message: 'That purple trim is insane.' },
        { author: 'StyleDrop', time: '3:14 PM', message: 'I’d wear these with denim or track pants.' },
      ],
      chatPool: [
        { author: 'SneakerTalk', message: 'Those are going to sell out fast.' },
        { author: 'CourtSide', message: 'Classic shape and color!' },
        { author: 'LaceLoop', message: 'I wonder if these fit narrow feet well.' },
      ],
    },
  ],
  'video-feed': [
    {
      video: 'PixVerse_V6_Image_Text_720P_the_glass_head_exp.mp4',
      title: 'Studio Microphone Pro',
      tags: ['Podcast', 'USB', 'Cardioid'],
      seller: {
        avatar: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=256&q=80',
        name: 'AudioAce',
        followers: '8.0K followers',
      },
      auction: {
        currentBid: 249,
        countdown: 58,
        highestBidder: '@PodcastPaul',
        quickBids: [255, 265, 275, 285],
        startingBid: 250,
      },
      chat: [
        { author: 'StreamStar', time: '4:02 PM', message: 'Love the clean sound in the sample.' },
        { author: 'MixMaster', time: '4:04 PM', message: 'Does it work with OBS directly?' },
        { author: 'VoicePro', time: '4:06 PM', message: 'Neat setup for home studio recording.' },
      ],
      chatPool: [
        { author: 'BroadcastBea', message: 'That mic looks so crisp in the visual.' },
        { author: 'AudioNerd', message: 'Would this pair well with a pop filter?' },
        { author: 'PluggedIn', message: 'Great for stream and podcast setups.' },
      ],
    },
  ],
};

const dom = {
  app: document.getElementById('app'),
};

/*
  Rendering helpers
  -----------------
  Build the DOM structure for the app using template strings.
  This section constructs the page shell, feed items, search bar, auth modal,
  and reusable UI fragments.
*/

function renderNav() {
  return `
    <header class="navbar">
      <div class="brand"><span>Clip</span>Buy</div>
      <button class="menu-toggle" aria-label="Open navigation menu" aria-expanded="false" type="button" aria-controls="main-navigation">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav class="nav-links" id="main-navigation">
        ${navLinks.map((link) => `<a href="${link.href}">${link.label}</a>`).join('')}
      </nav>
      <div class="nav-actions">
        <span class="user-status">${getActiveLabel()}</span>
        <button class="auth-toggle" type="button">${getAuthButtonLabel()}</button>
      </div>
    </header>
  `;
}

function renderHero(heroImage) {
  return `
    <section class="hero" id="hero">
      ${renderNav()}
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="label-pill"></span>
          <h1>Shop through <span>video</span></h1>
          <p>Discover products in action from real sellers. Watch, shop, and enjoy a better way to buy.</p>
          <a href="#categories" class="cta-btn">Start Shopping</a>
        </div>
        <div class="hero-visual">
          <img src="${heroImage}" alt="Product mockup">
        </div>
      </div>
    </section>
  `;
}

function renderCategories() {
  return `
    <section class="categories-panel" id="categories">
      <h2>Categories to explore</h2>
      <div class="categories-grid">
        ${categories
          .map(
            (category) => `
          <a href="${category.href}" style="text-decoration: none; color: inherit;">
            <div class="category-card">
              <img src="${category.image}" alt="${category.title}">
              <div class="category-info">
                <h3>${category.title}</h3>
                <p>${category.description}</p>
                <div class="cta-arrow">→</div>
              </div>
            </div>
          </a>`
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderTags(tags) {
  return tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join('');
}

function renderChatMessages(chat) {
  return chat
    .map(
      (message) => `
        <div class="chat-message">
          <strong>${message.author}</strong><span>${message.time}</span>
          <p>${message.message}</p>
        </div>`
    )
    .join('');
}

function renderBackHome() {
  return `<a class="back-home" href="index.html">← Back home</a>`;
}

function renderSearchBar() {
  return `
    <section class="search-panel">
      <input class="search-input" type="search" placeholder="Search items..." aria-label="Search items" />
    </section>
  `;
}

function renderMyBidsToggle() {
  return `<button type="button" class="my-bids-toggle hidden">Show my bids</button>`;
}

function renderMyBidsPanel() {
  const bids = getMyBids();
  const activeUser = getActiveUser();
  const listItems = bids
    .slice(-5)
    .reverse()
    .map(
      (bid) => `<li><strong>${bid.item}</strong> — $${bid.amount.toLocaleString()} <span>${new Date(bid.at).toLocaleString()}</span></li>`
    )
    .join('');

  return `
    <section class="my-bids-panel">
      <div class="my-bids-header">
        <h2>My bids</h2>
        <div class="my-bids-header-actions">
          <span>${activeUser ? activeUser.username : 'Login to track bids'}</span>
          <button type="button" class="my-bids-close" aria-label="Close bidding history">×</button>
        </div>
      </div>
      <div class="my-bids-body">
        ${activeUser ? `<ul>${listItems || '<li>No bids yet.</li>'}</ul>` : '<p>Please log in to save and view bids.</p>'}
      </div>
    </section>
  `;
}

function refreshMyBidsPanel() {
  const panel = document.querySelector('.my-bids-panel');
  if (!panel) return;
  const body = panel.querySelector('.my-bids-body');
  const activeUser = getActiveUser();
  if (!body) return;
  if (!activeUser) {
    panel.querySelector('.my-bids-header span').textContent = 'Login to track bids';
    body.innerHTML = '<p>Please log in to save and view bids.</p>';
    return;
  }

  const bids = getMyBids();
  panel.querySelector('.my-bids-header span').textContent = activeUser.username;
  body.innerHTML = `<ul>${bids.slice(-5).reverse().map((bid) => `<li><strong>${bid.item}</strong> — $${bid.amount.toLocaleString()} <span>${new Date(bid.at).toLocaleString()}</span></li>`).join('') || '<li>No bids yet.</li>'}</ul>`;
}

function renderAuthModal() {
  return `
    <div class="auth-modal-overlay hidden" id="auth-modal">
      <div class="auth-modal">
        <button type="button" class="auth-close" aria-label="Close auth dialog">×</button>
        <h2>Login or Register</h2>
        <div class="auth-tabs">
          <button type="button" class="auth-tab active" data-mode="login">Login</button>
          <button type="button" class="auth-tab" data-mode="register">Register</button>
        </div>
        <form class="auth-form" id="auth-form">
          <label>
            Username
            <input name="username" type="text" autocomplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="cta-btn auth-submit" type="submit">Login</button>
          <p class="auth-message"></p>
        </form>
      </div>
    </div>
  `;
}

function renderFeedSection(item, index) {
  return `
    <section class="feed-section" id="feed-${index + 1}" data-title="${item.title.toLowerCase()}" data-tags="${item.tags.join(' ').toLowerCase()}" data-highest="${item.auction.highestBidder}" data-closed="false" data-joined="false">
      <div class="section-left">
        <div class="video-block">
          <video src="${item.video}" controls autoplay muted playsinline loop></video>
        </div>
        <div class="section-copy">
          <h1>${item.title}</h1>
          <div class="tag-row">${renderTags(item.tags)}</div>
          <div class="seller-row">
            <div class="seller-profile">
              <div class="seller-avatar">
                <img src="${item.seller.avatar}" alt="Seller avatar">
              </div>
              <div class="seller-meta">
                <strong>${item.seller.name}</strong>
                <span>${item.seller.followers}</span>
              </div>
            </div>
            <div class="action-buttons">
              <button type="button" class="like-button">Like</button>
              <button type="button" class="share-button">Share</button>
              <button type="button" class="follow-button">Follow</button>
            </div>
          </div>
        </div>
      </div>
      <div class="section-right">
        <div class="glass-panel" data-feed="auction-${index + 1}">
          <div class="panel-title">Auction</div>
          <div class="stat-row">
            <div>
              <span class="stat-label">Current bid</span>
              <span class="stat-value" data-current-bid="${item.auction.currentBid}">$${item.auction.currentBid.toLocaleString()}</span>
            </div>
            <div>
              <span class="stat-label">Time left</span>
              <span class="stat-value" data-countdown="${item.auction.countdown}">00:${String(item.auction.countdown).padStart(2, '0')}</span>
            </div>
          </div>
          <div class="stat-row">
            <div>
              <span class="stat-label">Highest bidder</span>
              <span class="stat-value highest-bidder" data-highest-bidder="${item.auction.highestBidder}" style="font-size:1.1rem;">${item.auction.highestBidder}</span>
            </div>
          </div>
          <div class="auction-message"></div>
          <div class="quick-bid-grid">
            ${item.auction.quickBids
              .map((bid) => `<button type="button" class="quick-bid" data-bid="${bid}">$${bid.toLocaleString()}</button>`)
              .join('')}
          </div>
          <div class="bid-entry">
            <span>$</span>
            <input type="number" min="0" step="5" value="${item.auction.startingBid}" data-custom-bid>
          </div>
          <button type="button" class="join-auction">Join Auction</button>
          <button type="button" class="bid-action" data-bid-now>Bid Now</button>
          <button type="button" class="buy-now" data-buy-now="${item.auction.currentBid + 150}">Buy now $${(item.auction.currentBid + 150).toLocaleString()}</button>
          <button type="button" class="auction-close">Close Auction</button>
          <div class="joined-badge hidden">Joined</div>
        </div>
        <div class="glass-panel" data-feed="chat-${index + 1}">
          <div class="panel-title">Live Chat</div>
          <div class="chat-thread">
            ${renderChatMessages(item.chat)}
          </div>
          <form class="chat-form" data-chat-form>
            <input type="text" placeholder="Send a message..." autocomplete="off">
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderPage(pageKey) {
  const page = pageConfig[pageKey] || pageConfig.home;
  document.title = page.title;

  if (page.comingSoon) {
    dom.app.innerHTML = `
      <main class="coming-soon-page">
        ${renderBackHome()}
        <section class="coming-soon-card">
          <span class="label-pill">Live auctions launching soon</span>
          <h1>Live bidding is almost here</h1>
          <p>We’re putting the finishing touches on the live auction experience. Check back soon to join the next big drop.</p>
        </section>
      </main>
    `;
    attachInteractions();
    return;
  }

  if (page.showCategories) {
    dom.app.innerHTML = `
      <div class="page">
        ${renderHero(page.heroImage)}
        ${renderCategories()}
        ${renderAuthModal()}
      </div>
    `;
  } else {
    const feedKey = page.feedKey || 'default';
    const feedItems = feedData[feedKey] || feedData.default;
    dom.app.innerHTML = `
      <main class="feed-container">
        ${renderBackHome()}
        ${renderSearchBar()}
        ${renderMyBidsToggle()}
        ${renderMyBidsPanel()}
        <div class="feed-list">
          ${feedItems.map(renderFeedSection).join('')}
        </div>
        ${renderAuthModal()}
      </main>
    `;
  }

  attachInteractions();
}

function showAuthModal() {
  const overlay = document.getElementById('auth-modal');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  switchAuthMode(activeAuthMode);
}

function hideAuthModal() {
  const overlay = document.getElementById('auth-modal');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function switchAuthMode(mode) {
  activeAuthMode = mode;
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  const submit = document.querySelector('.auth-submit');
  if (submit) {
    submit.textContent = mode === 'register' ? 'Register' : 'Login';
  }
  const title = document.querySelector('.auth-modal h2');
  if (title) {
    title.textContent = mode === 'register' ? 'Create account' : 'Login to place bids';
  }
  const message = document.querySelector('.auth-message');
  if (message) {
    message.textContent = '';
  }
}

function updateAuthUi() {
  const activeUser = getActiveUser();
  const status = document.querySelector('.user-status');
  const authButton = document.querySelector('.auth-toggle');
  const bidButtons = document.querySelectorAll('.bid-action');
  const buyNowButtons = document.querySelectorAll('.buy-now');

  if (status) {
    status.textContent = getActiveLabel();
  }
  if (authButton) {
    authButton.textContent = getAuthButtonLabel();
  }

  bidButtons.forEach((button) => {
    button.disabled = !activeUser;
    button.classList.toggle('disabled', !activeUser);
    button.title = activeUser ? 'Place your bid' : 'Login to place bids';
  });

  buyNowButtons.forEach((button) => {
    button.disabled = !activeUser;
    button.classList.toggle('disabled', !activeUser);
    button.title = activeUser ? 'Buy now' : 'Login to buy now';
  });
}

/*
  DOM interaction wiring
  ----------------------
  Attach event listeners and initialize runtime behavior.
  This section wires up navigation, authentication, search filtering,
  bidding actions, chat submission, countdown timers, and simulated activity.
*/

function attachInteractions() {
  stopCountdownInterval();
  stopChatSimulation();
  stopOutbidSimulation();

  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const authToggle = document.querySelector('.auth-toggle');
  const authOverlay = document.getElementById('auth-modal');
  const authClose = document.querySelector('.auth-close');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForm = document.getElementById('auth-form');
  const searchInput = document.querySelector('.search-input');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.addEventListener('click', (event) => {
      if (event.target.tagName === 'A') {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (authToggle) {
    authToggle.addEventListener('click', () => {
      if (getActiveUser()) {
        clearActiveUser();
        renderPage(currentPageKey);
      } else {
        showAuthModal();
      }
    });
  }

  if (authClose) {
    authClose.addEventListener('click', hideAuthModal);
  }

  if (authOverlay) {
    authOverlay.addEventListener('click', (event) => {
      if (event.target === authOverlay) {
        hideAuthModal();
      }
    });
  }

  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      switchAuthMode(tab.dataset.mode);
    });
  });

  if (authForm) {
    authForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(authForm);
      const username = formData.get('username')?.toString() || '';
      const password = formData.get('password')?.toString() || '';
      const message = document.querySelector('.auth-message');
      let result = { success: false, message: '' };

      if (activeAuthMode === 'register') {
        result = registerUser(username, password);
      } else {
        result = loginUser(username, password);
      }

      if (message) {
        message.textContent = result.message || '';
      }

      if (result.success) {
        hideAuthModal();
        renderPage(currentPageKey);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filterFeedSections(event.target.value);
    });
  }

  const myBidsClose = document.querySelector('.my-bids-close');
  const myBidsToggle = document.querySelector('.my-bids-toggle');

  if (myBidsClose) {
    myBidsClose.addEventListener('click', () => {
      const panel = document.querySelector('.my-bids-panel');
      panel?.classList.add('hidden');
      myBidsToggle?.classList.remove('hidden');
    });
  }

  if (myBidsToggle) {
    myBidsToggle.addEventListener('click', () => {
      const panel = document.querySelector('.my-bids-panel');
      panel?.classList.remove('hidden');
      myBidsToggle.classList.add('hidden');
    });
  }

  const countdownElements = document.querySelectorAll('[data-countdown]');
  const buyNowButtons = document.querySelectorAll('.buy-now');
  const countdownSections = document.querySelectorAll('.feed-section');
  const auctionSections = document.querySelectorAll('[data-feed^="auction"]');
  const likeButtons = document.querySelectorAll('.like-button');
  const chatForms = document.querySelectorAll('[data-chat-form]');
  const feedVideos = document.querySelectorAll('.video-block video');

  const timerValues = Array.from(countdownElements).map((element) => Date.now() + Number(element.dataset.countdown) * 1000);

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function updateCountdowns() {
    countdownElements.forEach((element, index) => {
      const remaining = timerValues[index] - Date.now();
      const section = element.closest('[data-feed^="auction"]');
      const bidNowBtn = section?.querySelector('[data-bid-now]');
      const messageEl = section?.querySelector('.auction-message');
      const highestEl = section?.querySelector('.highest-bidder');
      const countdownClosed = section?.dataset.closed === 'true';
      const activeUser = getActiveUser();
      const joined = section?.dataset.joined === 'true';

      if (countdownClosed) {
        if (element) {
          element.textContent = 'Closed';
        }
        return;
      }

      if (remaining <= 10000 && joined && !section.dataset.warned) {
        playWarningSound();
        section.dataset.warned = 'true';
      }

      if (remaining <= 0) {
        element.textContent = 'Timed out';
        if (bidNowBtn) {
          bidNowBtn.disabled = true;
          bidNowBtn.classList.add('disabled');
        }
        if (messageEl) {
          messageEl.textContent = 'Timed out';
        }
        if (highestEl && activeUser && highestEl.textContent === activeUser.username && section.dataset.ended !== 'true') {
          playBellSound();
          section.dataset.ended = 'true';
          if (messageEl) {
            messageEl.textContent = `🎉 ${activeUser.username} won this auction!`;
          }
        }
        return;
      }

      element.textContent = formatTime(remaining);
      if (bidNowBtn) {
        const shouldEnable = Boolean(activeUser) && joined;
        bidNowBtn.disabled = !shouldEnable;
        bidNowBtn.classList.toggle('disabled', !shouldEnable);
      }
      const buyNowBtn = section?.querySelector('.buy-now');
      if (buyNowBtn) {
        const shouldEnable = Boolean(activeUser) && joined;
        buyNowBtn.disabled = !shouldEnable;
        buyNowBtn.classList.toggle('disabled', !shouldEnable);
      }
      const quickBids = section?.querySelectorAll('.quick-bid');
      quickBids?.forEach((button) => {
        const shouldEnable = Boolean(activeUser) && joined;
        button.disabled = !shouldEnable;
      });
      const customBidInput = section?.querySelector('[data-custom-bid]');
      if (customBidInput) {
        customBidInput.disabled = !Boolean(activeUser) || !joined;
      }
      if (messageEl && messageEl.textContent === 'Timed out') {
        messageEl.textContent = '';
      }
    });
  }

  if (countdownElements.length) {
    updateCountdowns();
    countdownTimer = setInterval(updateCountdowns, 1000);
  }

  feedVideos.forEach((video) => {
    const videoBlock = video.closest('.video-block');
    const adjustAspect = () => {
      if (!videoBlock || !video.videoWidth || !video.videoHeight) {
        return;
      }
      videoBlock.style.aspectRatio = video.videoHeight > video.videoWidth ? '9 / 16' : '16 / 9';
    };

    if (video.readyState >= 1) {
      adjustAspect();
    } else {
      video.addEventListener('loadedmetadata', adjustAspect, { once: true });
    }
  });

  likeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.add('liked');
      setTimeout(() => button.classList.remove('liked'), 450);
    });
  });

  auctionSections.forEach((section) => {
    const currentBidEl = section.querySelector('[data-current-bid]');
    const customBidInput = section.querySelector('[data-custom-bid]');
    const bidNowBtn = section.querySelector('[data-bid-now]');
    const buyNowBtn = section.querySelector('.buy-now');
    const joinButton = section.querySelector('.join-auction');
    const joinedBadge = section.querySelector('.joined-badge');
    const quickBids = section.querySelectorAll('.quick-bid');
    const messageEl = section.querySelector('.auction-message');

    quickBids.forEach((button) => {
      button.addEventListener('click', () => {
        quickBids.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        if (customBidInput) {
          customBidInput.value = button.dataset.bid;
        }
      });
    });

    const closeButton = section.querySelector('.auction-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        const activeUser = getActiveUser();
        if (!activeUser) {
          showAuthModal();
          return;
        }
        closeAuctionSection(section);
      });
    }

    if (joinButton) {
      joinButton.addEventListener('click', () => {
        const activeUser = getActiveUser();
        if (!activeUser) {
          showAuthModal();
          return;
        }
        section.dataset.joined = 'true';
        joinButton.disabled = true;
        joinButton.classList.add('disabled');
        joinButton.textContent = 'Joined';
        joinedBadge?.classList.remove('hidden');
        if (bidNowBtn) {
          bidNowBtn.disabled = false;
          bidNowBtn.classList.remove('disabled');
        }
        if (buyNowBtn) {
          buyNowBtn.disabled = false;
          buyNowBtn.classList.remove('disabled');
        }
        quickBids.forEach((button) => {
          button.disabled = false;
        });
        if (customBidInput) {
          customBidInput.disabled = false;
        }
        if (messageEl) {
          messageEl.textContent = 'You joined this auction.';
        }
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', () => {
        const activeUser = getActiveUser();
        if (!activeUser) {
          showAuthModal();
          return;
        }
        if (section.dataset.closed === 'true') return;

        const buyNowPrice = Number(buyNowBtn.dataset.buyNow || 0);
        const highestEl = section.querySelector('.highest-bidder');
        if (currentBidEl) {
          currentBidEl.textContent = `$${buyNowPrice.toLocaleString()}`;
        }
        if (highestEl) {
          highestEl.textContent = activeUser.username;
          highestEl.dataset.highestBidder = activeUser.username;
        }
        const itemTitle = section.closest('.feed-section')?.dataset.title || 'Unknown item';
        saveBid({ username: activeUser.username, amount: buyNowPrice, item: itemTitle, at: new Date().toISOString() });
        closeAuctionSection(section);
        if (messageEl) {
          messageEl.textContent = `🎯 ${activeUser.username} bought this instantly for $${buyNowPrice.toLocaleString()}`;
        }
        playBellSound();
        refreshMyBidsPanel();
      });
    }

    if (bidNowBtn && customBidInput && currentBidEl) {
      bidNowBtn.addEventListener('click', () => {
        const activeUser = getActiveUser();
        if (!activeUser) {
          showAuthModal();
          return;
        }

        if (messageEl && messageEl.textContent === 'Timed out') {
          return;
        }

        const bidValue = Number(customBidInput.value);
        const currentValue = Number(currentBidEl.textContent.replace(/[^0-9]/g, ''));
        if (bidValue > currentValue && section.dataset.joined === 'true') {
          currentBidEl.textContent = `$${bidValue.toLocaleString()}`;
          const highestEl = section.querySelector('.highest-bidder');
          if (highestEl) {
            highestEl.textContent = activeUser.username;
            highestEl.dataset.highestBidder = activeUser.username;
          }
          const itemTitle = section.closest('.feed-section')?.dataset.title || 'Unknown item';
          saveBid({ username: activeUser.username, amount: bidValue, item: itemTitle, at: new Date().toISOString() });
          playBellSound();
          if (messageEl) {
            messageEl.textContent = `🔥 ${activeUser.username} placed $${bidValue.toLocaleString()}`;
            setTimeout(() => {
              if (messageEl.textContent && messageEl.textContent.startsWith('🔥')) {
                messageEl.textContent = '';
              }
            }, 2700);
          }
          flashFireFeedback(section);
          updateBuyNowButton(section);
          refreshMyBidsPanel();
        }
      });
    }
  });

  chatForms.forEach((form) => {
    const thread = form.closest('.glass-panel').querySelector('.chat-thread');
    const input = form.querySelector('input');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;

      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const messageEl = document.createElement('div');
      messageEl.className = 'chat-message';
      messageEl.innerHTML = `
        <strong>You</strong><span>${time}</span>
        <p>${value}</p>
      `;

      thread.appendChild(messageEl);
      input.value = '';
      thread.scrollTop = thread.scrollHeight;
    });
  });

  updateAuthUi();
  refreshMyBidsPanel();
  startChatSimulation();
  startOutbidSimulation();
}

function init() {
  const pageKey = document.body.dataset.page || window.location.pathname.split('/').pop().replace('.html', '') || 'home';
  currentPageKey = pageKey;
  renderPage(pageKey);
}

window.addEventListener('DOMContentLoaded', init);

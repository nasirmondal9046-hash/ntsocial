const EXTRA4 = {
  en: {
    seen: 'Seen', sent: 'Sent', callMsg: 'Video call', join: 'Join',
    youBlocked: 'You blocked this account. Unblock to send messages.',
    cantMsg: 'You cannot message this account.',
    pin: 'Pin', unpin: 'Unpin', mute: 'Mute messages', unmute: 'Unmute messages',
    block: 'Block', unblock: 'Unblock', blockedEmpty: 'No blocked accounts', blockQ: 'Block this account?'
  },
  bn: {
    seen: 'দেখেছে', sent: 'পাঠানো হয়েছে', callMsg: 'ভিডিও কল', join: 'যোগ দিন',
    youBlocked: 'আপনি এই অ্যাকাউন্ট ব্লক করেছেন। মেসেজ পাঠাতে আনব্লক করুন।',
    cantMsg: 'আপনি এই অ্যাকাউন্টে মেসেজ পাঠাতে পারবেন না।',
    pin: 'পিন করুন', unpin: 'পিন খুলুন', mute: 'মেসেজ মিউট করুন', unmute: 'মিউট খুলুন',
    block: 'ব্লক করুন', unblock: 'আনব্লক করুন', blockedEmpty: 'কোনো ব্লক করা অ্যাকাউন্ট নেই', blockQ: 'এই অ্যাকাউন্ট ব্লক করবেন?'
  }
};
Object.keys(EXTRA4).forEach(l => Object.assign(T[l], EXTRA4[l]));

const EXTRA5 = {
  en: { editProfile: 'Edit profile', nameLbl: 'Name', handleLbl: 'User ID', bioLbl: 'Bio',
    handleTaken: 'This User ID is already taken',
    handleBad: 'User ID: use only small letters, numbers, . and _ (at least 3)' },
  bn: { editProfile: 'প্রোফাইল এডিট করুন', nameLbl: 'নাম', handleLbl: 'ইউজার আইডি', bioLbl: 'বায়ো',
    handleTaken: 'এই ইউজার আইডি আগেই নেওয়া হয়েছে',
    handleBad: 'ইউজার আইডি: শুধু ইংরেজি ছোট অক্ষর, সংখ্যা, . ও _ (কমপক্ষে ৩টি)' }
};
Object.keys(EXTRA5).forEach(l => Object.assign(T[l], EXTRA5[l]));

const EXTRA6 = {
  en: { newReel: 'New reel', editCover: 'Edit cover', hashtags: '# Hashtags',
    capHashPh: 'Write a caption and add hashtags...',
    hideLikeReel: 'Hide like count on this reel', hideCommentReel: 'Hide comment count on this reel',
    hideShareReel: 'Hide share count on this reel', commentsTitle: 'Comments',
    linkCopied: 'Link copied', coverSet: 'Cover selected ✓', noComments: 'No comments yet' },
  bn: { newReel: 'নতুন রিল', editCover: 'কভার এডিট করুন', hashtags: '# হ্যাশট্যাগ',
    capHashPh: 'ক্যাপশন লিখুন ও হ্যাশট্যাগ দিন...',
    hideLikeReel: 'এই রিলের লাইক সংখ্যা লুকান', hideCommentReel: 'এই রিলের কমেন্ট সংখ্যা লুকান',
    hideShareReel: 'এই রিলের শেয়ার সংখ্যা লুকান', commentsTitle: 'কমেন্ট',
    linkCopied: 'লিংক কপি হয়েছে', coverSet: 'কভার বাছাই হয়েছে ✓', noComments: 'এখনো কোনো কমেন্ট নেই' }
};
Object.keys(EXTRA6).forEach(l => Object.assign(T[l], EXTRA6[l]));

const LANGS = { bn: 'বাংলা', en: 'English', hi: 'हिन्दी', ar: 'العربية', ur: 'اردو' };

let lang = 'en';
try { lang = localStorage.getItem('ntlang') || 'en'; } catch (e) {}
if (!T[lang]) lang = 'en';

function tr(k, n) {
  return String((T[lang] && T[lang][k]) || T.en[k] || k).replace('{n}', n);
}

let me = null, myName = '', following = [], posts = [], unsubs = [];
let allUsers = [], usersMap = {}, profUid = null, profTab = 'all';
let other = null, chatUnsub = null, loaded = false, signing = false;
let reelIds = '', reelEls = {}, chatsMeta = {};
let menuPost = null, viewerPost = null, roomRedraw = null, cmId = null;
let pendingFile = null, coverData = '', nrUrl = '';

const ms = x => (x && x.toMillis) ? x.toMillis() : (x === null ? Date.now() : 0);

function isUnread(m) {
  if (!m || !m.lastFrom || !me || m.lastFrom === me.uid) return false;
  return ms(m.lastT) > ms(m['seen_' + me.uid]);
}

const watcher = new IntersectionObserver(entries => {
  entries.forEach(en => {
    const v = en.target;
    if (en.isIntersecting && en.intersectionRatio >= 0.6) v.play().catch(() => {});
    else v.pause();
  });
}, { threshold: [0, 0.6] });

const viewed = new Set();
const viewWatcher = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting || en.intersectionRatio < 0.6) return;
    const id = en.target._pid;
    if (!id || !me || viewed.has(id)) return;
    viewed.add(id);
    updateDoc(doc(db, 'posts', id), { viewers: arrayUnion(me.uid) }).catch(() => {});
  });
}, { threshold: [0.6] });

function showErr(e) {
  $('err').textContent = 'Error: ' + (e && e.message ? e.message : e);
}

function setStatus(t) {
  $('status').textContent = t;
}

function show(loggedIn) {
  $('auth').style.display = loggedIn ? 'none' : 'block';
  $('app').style.display = loggedIn ? 'block' : 'none';
}

function stopChat() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
}

function thumbOf(u, square) {
  const p = square ? '/upload/so_0,w_400,h_400,c_fill/' : '/upload/so_0,w_800/';
  return u.replace('/upload/', p).replace(/\.[^./]+$/, '.jpg');
}

function closeViewer() {
  const v = $('vVid');
  v.pause();
  v.removeAttribute('src');
  v.style.display = 'none';
  $('viewer').style.display = 'none';
}

function myList(k) {
  return ((usersMap[me.uid] || {})[k]) || [];
}

function hiddenUid(uid) {
  return myList('blocked').includes(uid) || (((usersMap[uid] || {}).blocked) || []).includes(me.uid);
}

function handleOf(u) {
  if (u && u.handle) return u.handle;
  const base = (u && u.email) ? u.email.split('@')[0] : ((u && u.name) || 'user');
  return base.toLowerCase().replace(/[^a-z0-9._]/g, '') || 'user';
}

function ago(x) {
  const t = (x && x.toMillis) ? x.toMillis() : (typeof x === 'number' ? x : (x === null ? Date.now() : 0));
  if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return tr('tNow');
  if (s < 3600) return tr('tMin', Math.floor(s / 60));
  if (s < 86400) return tr('tHour', Math.floor(s / 3600));
  if (s < 604800) return tr('tDay', Math.floor(s / 86400));
  return tr('tWeek', Math.floor(s / 604800));
}

function fmt(n) {
  if (n >= 10000) return Math.round(n / 1000) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function toast(t) {
  const b = $('setToast');
  b.textContent = t;
  b.style.display = 'block';
  setTimeout(() => { b.style.display = 'none'; }, 1800);
}

function avatar(u, big) {
  const d = document.createElement('div');
  d.className = 'av' + (big ? ' big' : '');
  if (u && u.photo) d.style.backgroundImage = `url("${u.photo}")`;
  else d.textContent = ((u && u.name) || '?').charAt(0).toUpperCase();
  return d;
}

function fillLang(sel) {
  sel.innerHTML = '';
  Object.keys(LANGS).forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = LANGS[k];
    sel.append(o);
  });
  sel.onchange = () => setLang(sel.value);
}

function setLang(l) {
  lang = l;
  try { localStorage.setItem('ntlang', l); } catch (e) {}
  applyLang();
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar' || lang === 'ur') ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i]').forEach(e => { e.textContent = tr(e.dataset.i); });
  document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = tr(e.dataset.ph); });
  $('langAuth').value = lang;
  $('langProf').value = lang;
  reelIds = '';
  if (me) {
    render();
    renderReels();
    renderList();
    renderProfile();
    renderBadge();
    if ($('settings').style.display === 'block') renderSettings();
  }
}

function setView(v) {
  $('feed').style.display = v === 'feed' ? 'block' : 'none';
  $('reels').style.display = v === 'reels' ? 'block' : 'none';
  $('chatWrap').style.display = v === 'list' ? 'block' : 'none';
  $('profile').style.display = v === 'profile' ? 'grid' : 'none';
  $('room').style.display = v === 'room' ? 'block' : 'none';
  $('nav').style.display = v === 'room' ? 'none' : 'flex';
  $('msgBar').style.display = v === 'room' ? 'flex' : 'none';
  closeViewer();
  if (v !== 'reels') document.querySelectorAll('#reels video').forEach(x => x.pause());
  if (v !== 'room') stopChat();

  document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
  let act = '';
  if (v === 'feed') act = 'goHome';
  else if (v === 'reels') act = 'goReels';
  else if (v === 'list' || v === 'room') act = 'goChat';
  else if (v === 'profile' && me && profUid === me.uid) act = 'goProfile';
  if (act) $(act).classList.add('on');
}

function renderNavAv() {
  if (!me) return;
  const box = $('navAv');
  box.innerHTML = '';
  box.append(avatar(usersMap[me.uid] || { name: myName }));
}

function renderBadge() {
  if (!me) return;
  const muted = myList('muted');
  const blocked = myList('blocked');
  const n = Object.keys(chatsMeta).filter(id => {
    const ou = id.split('_').find(x => x !== me.uid);
    return isUnread(chatsMeta[id]) && !muted.includes(ou) && !blocked.includes(ou);
  }).length;
  const b = $('chatDot');
  b.style.display = n ? 'flex' : 'none';
  b.textContent = n > 9 ? '9+' : String(n);
}

$('signup').onclick = async () => {
  const name = $('uname').value.trim();
  if (!name) { $('msg').textContent = tr('needName'); return; }
  signing = true;
  try {
    const c = await createUserWithEmailAndPassword(auth, $('email').value.trim(), $('pass').value);
    await setDoc(doc(db, 'users', c.user.uid), { name: name, email: c.user.email, following: [] });
  } catch (e) { $('msg').textContent = e.message; }
  signing = false;
};

$('login').onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, $('email').value.trim(), $('pass').value);
  } catch (e) { $('msg').textContent = e.message; }
};

$('logout').onclick = () => signOut(auth);

$('goHome').onclick = () => setView('feed');
$('goReels').onclick = () => setView('reels');
$('goChat').onclick = () => setView('list');
$('goProfile').onclick = () => openProfile(me.uid);
$('back').onclick = () => { $('emojiBox').style.display = 'none'; setView('list'); };
$('pBack').onclick = () => setView('feed');
$('vClose').onclick = closeViewer;
$('chatSearch').oninput = () => renderList();
$('tabAll').onclick = () => { profTab = 'all'; renderProfile(); };
$('tabVid').onclick = () => { profTab = 'video'; renderProfile(); };

onAuthStateChanged(auth, user => {
  unsubs.forEach(f => f());
  unsubs = [];
  stopChat();
  me = user;
  loaded = false;
  posts = [];
  usersMap = {};
  allUsers = [];
  chatsMeta = {};
  profUid = null;
  profTab = 'all';
  reelIds = '';
  reelEls = {};
  watcher.disconnect();
  $('reels').innerHTML = '';
  $('err').textContent = '';
  $('msg').textContent = '';
  setStatus('');
  if (!user) { show(false); return; }
  show(true);
  setView('feed');
  myName = user.email.split('@')[0];
  render();
  renderNavAv();
  renderBadge();

  unsubs.push(onSnapshot(doc(db, 'users', user.uid), s => {
    const d = s.data() || {};
    following = d.following || [];
    if (d.name) {
      myName = d.name;
    } else if (!signing) {
      setDoc(doc(db, 'users', user.uid),
        { name: myName, email: user.email }, { merge: true }).catch(showErr);
    }
    render();
    renderReels();
    renderProfile();
    renderNavAv();
  }, showErr));

  unsubs.push(onSnapshot(query(collection(db, 'posts'), orderBy('t', 'desc')), s => {
    posts = s.docs.map(d => ({ id: d.id, ...d.data() }));
    loaded = true;
    render();
    renderReels();
    renderProfile();
  }, showErr));

  unsubs.push(onSnapshot(collection(db, 'users'), s => {
    usersMap = {};
    s.docs.forEach(d => { usersMap[d.id] = { uid: d.id, ...d.data() }; });
    allUsers = Object.values(usersMap)
      .filter(u => u.uid !== user.uid)
      .map(u => ({ ...u, name: u.name || 'user' }));
    renderList();
    render();
    renderProfile();
    renderNavAv();
    renderBadge();
  }, showErr));

  unsubs.push(onSnapshot(
    query(collection(db, 'chats'), where('users', 'array-contains', user.uid)),
    s => {
      chatsMeta = {};
      s.docs.forEach(d => { chatsMeta[d.id] = d.data(); });
      renderBadge();
      renderList();
    }, showErr));
});

function renderList() {
  const box = $('chatList');
  box.innerHTML = '';
  if (!me) return;
  const q = $('chatSearch').value.trim().toLowerCase();
  const blocked = myList('blocked');
  const pinned = myList('pinned');
  const muted = myList('muted');
  const list = allUsers
    .filter(u => !blocked.includes(u.uid) && u.name.toLowerCase().includes(q))
    .sort((a, b) => (pinned.includes(b.uid) ? 1 : 0) - (pinned.includes(a.uid) ? 1 : 0));
  if (list.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = allUsers.length === 0 ? tr('noUsers') : tr('noResults');
    box.append(e);
    return;
  }
  list.forEach(u => {
    const m = chatsMeta[[me.uid, u.uid].sort().join('_')];
    const isMuted = muted.includes(u.uid);
    const unread = isUnread(m) && !isMuted;
    let sub = u.bio || tr('tapMsg');
    let cls = '';
    if (m && m.last) {
      if (m.lastFrom === me.uid) {
        const sm = ms(m['seen_' + u.uid]);
        const lm = ms(m.lastT);
        const seenIt = sm && sm >= lm;
        sub = (seenIt ? tr('seen') : tr('sent')) + ' · ' + ago(seenIt ? m['seen_' + u.uid] : m.lastT);
        if (seenIt) cls = ' seen';
      } else {
        sub = m.last;
      }
    }
    const r = document.createElement('div');
    r.className = 'urow';
    const av = avatar(u);
    av.onclick = ev => { ev.stopPropagation(); openProfile(u.uid); };
    const col = document.createElement('div');
    const n = document.createElement('div');
    n.className = 'uname';
    n.textContent = (pinned.includes(u.uid) ? '📌 ' : '') + u.name + (isMuted ? ' 🔕' : '');
    const s = document.createElement('div');
    s.className = 'usub' + cls + (unread ? ' new' : '');
    s.textContent = sub;
    col.append(n, s);
    r.append(av, col);
    if (unread) {
      const dot = document.createElement('span');
      dot.className = 'udot';
      r.append(dot);
    }
    r.onclick = () => openRoom(u);
    box.append(r);
  });
    }

function openProfile(uid) {
  profUid = uid;
  profTab = 'all';
  setView('profile');
  renderProfile();
  window.scrollTo(0, 0);
}

function openViewer(p) {
  viewerPost = p;
  $('vMenu').style.display = (me && p.uid === me.uid) ? 'block' : 'none';
  const v = $('vVid');
  if (p.type === 'video') {
    $('vImg').style.display = 'none';
    v.style.display = 'block';
    v.src = p.video;
    v.play().catch(() => {});
  } else {
    v.pause();
    v.removeAttribute('src');
    v.style.display = 'none';
    $('vImg').style.display = 'block';
    $('vImg').style.backgroundImage = `url("${p.img}")`;
  }
  $('vCap').textContent = p.cap || '';
  $('viewer').style.display = 'flex';
}

function renderProfile() {
  if (!me || !profUid) return;
  const u = usersMap[profUid] || {};
  const mine = profUid === me.uid;

  $('pAvBox').innerHTML = '';
  $('pAvBox').append(avatar(u, true));

  const pn = $('pName');
  pn.innerHTML = '';
  pn.append(document.createTextNode(u.name || ''));
  const hd = document.createElement('div');
  hd.className = 'hd';
  hd.textContent = '@' + handleOf(u);
  pn.append(hd);

  $('pBio').textContent = u.bio || '';

  const userPosts = posts.filter(p => p.uid === profUid);
  const followers = Object.values(usersMap)
    .filter(x => (x.following || []).includes(profUid)).length;
  $('stPosts').textContent = userPosts.length;
  $('stFollowers').textContent = followers;
  $('stFollowing').textContent = (u.following || []).length;

  $('pEdit').style.display = mine ? 'block' : 'none';
  $('gear').style.display = mine ? 'block' : 'none';
  $('pBack').style.display = mine ? 'none' : 'block';

  const fb = $('pFollow');
  if (mine) {
    fb.style.display = 'none';
  } else {
    fb.style.display = 'block';
    fb.textContent = following.includes(profUid) ? tr('following') : tr('follow');
  }

  $('tabAll').classList.toggle('on', profTab === 'all');
  $('tabVid').classList.toggle('on', profTab === 'video');

  const shown = profTab === 'video' ? userPosts.filter(p => p.type === 'video') : userPosts;
  const g = $('pGrid');
  g.innerHTML = '';
  if (shown.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.style.gridColumn = '1 / -1';
    e.textContent = tr('noPosts');
    g.append(e);
    return;
  }
  shown.forEach(p => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    if (p.type === 'video') {
      tile.classList.add('isvid');
      tile.style.backgroundImage = `url("${p.cover || thumbOf(p.video, true)}")`;
    } else if (p.img) {
      tile.style.backgroundImage = `url("${p.img}")`;
    }
    tile.onclick = () => openViewer(p);
    const vc = document.createElement('span');
    vc.className = 'tcount';
    vc.textContent = '👁 ' + (p.viewers || []).length + '   ❤ ' + (p.likes || []).length;
    tile.append(vc);
    g.append(tile);
  });
}

$('pFollow').onclick = () => {
  const isF = following.includes(profUid);
  setDoc(doc(db, 'users', me.uid),
    { following: isF ? arrayRemove(profUid) : arrayUnion(profUid) }, { merge: true }).catch(showErr);
};

$('pfile').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !me) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(im.width, im.height);
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 200;
      c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 200, 200);
      setDoc(doc(db, 'users', me.uid),
        { photo: c.toDataURL('image/jpeg', 0.7) }, { merge: true }).catch(showErr);
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
};

function openEditP() {
  const u = usersMap[me.uid] || {};
  $('nameIn').value = u.name || myName;
  $('handleIn').value = handleOf(u);
  $('bioIn2').value = u.bio || '';
  $('editMsg').textContent = '';
  $('editP').style.display = 'block';
}

function closeEditP() {
  $('editP').style.display = 'none';
}

$('editBtn').onclick = openEditP;
$('editBack').onclick = closeEditP;

$('editSave').onclick = () => {
  const name = $('nameIn').value.trim();
  const h = $('handleIn').value.trim().toLowerCase();
  if (!name) { $('editMsg').textContent = tr('needName'); return; }
  if (!/^[a-z0-9._]{3,30}$/.test(h)) { $('editMsg').textContent = tr('handleBad'); return; }
  const taken = Object.values(usersMap).some(x => x.uid !== me.uid && handleOf(x) === h);
  if (taken) { $('editMsg').textContent = tr('handleTaken'); return; }
  setDoc(doc(db, 'users', me.uid),
    { name: name, handle: h, bio: $('bioIn2').value.trim() }, { merge: true })
    .then(closeEditP)
    .catch(showErr);
};

function chatId(u) {
  return [me.uid, u.uid].sort().join('_');
}

function markSeen(u) {
  setDoc(doc(db, 'chats', chatId(u)),
    { users: [me.uid, u.uid], ['seen_' + me.uid]: serverTimestamp() },
    { merge: true }).catch(showErr);
}

function canSend() {
  if (!other) return false;
  if (myList('blocked').includes(other.uid)) { alert(tr('youBlocked')); return false; }
  if (((usersMap[other.uid] || {}).blocked || []).includes(me.uid)) { alert(tr('cantMsg')); return false; }
  return true;
}

async function pushMsg(obj, preview) {
  if (!canSend()) return;
  const cid = chatId(other);
  try {
    await addDoc(collection(db, 'chats', cid, 'msgs'),
      { from: me.uid, t: serverTimestamp(), ...obj });
    await setDoc(doc(db, 'chats', cid), {
      users: [me.uid, other.uid], last: preview, lastFrom: me.uid,
      lastT: serverTimestamp(), ['seen_' + me.uid]: serverTimestamp()
    }, { merge: true });
  } catch (e) { showErr(e); }
}

function openRoom(u) {
  other = u;
  $('roomName').textContent = u.name;
  const ra = $('roomAv');
  ra.innerHTML = '';
  ra.append(avatar(u));
  $('emojiBox').style.display = 'none';
  setView('room');
  $('msgs').innerHTML = '';
  const cid = chatId(u);
  let first = true, lastId = '', msgsDocs = [], meta = {};

  const draw = () => {
    const box = $('msgs');
    box.innerHTML = '';
    const blockedByMe = myList('blocked').includes(u.uid);
    let lastMine = null;
    msgsDocs.forEach(d => {
      const m = d.data();
      const mineMsg = m.from === me.uid;
      if (!mineMsg && blockedByMe) return;
      let el;
      if (m.type === 'image' && m.img) {
        el = document.createElement('img');
        el.className = 'mimg ' + (mineMsg ? 'mine' : 'theirs');
        el.src = m.img;
        el.onclick = () => openViewer({ type: 'image', img: m.img, cap: '', uid: '' });
      } else if (m.type === 'call' && typeof m.text === 'string' && m.text.indexOf('https://meet.jit.si/') === 0) {
        el = document.createElement('a');
        el.className = 'mcall ' + (mineMsg ? 'mine' : 'theirs');
        el.href = m.text;
        el.target = '_blank';
        el.rel = 'noopener';
        el.textContent = '📹 ' + tr('callMsg') + ' · ' + tr('join');
      } else {
        el = document.createElement('div');
        el.className = 'm ' + (mineMsg ? 'mine' : 'theirs');
        el.textContent = m.text || '';
      }
      box.append(el);
      if (mineMsg) lastMine = m;
    });
    if (lastMine) {
      const st = document.createElement('div');
      st.className = 'mst';
      const sm = ms(meta['seen_' + u.uid]);
      const lm = ms(lastMine.t);
      st.textContent = (sm && sm >= lm)
        ? tr('seen') + ' · ' + ago(meta['seen_' + u.uid])
        : tr('sent');
      box.append(st);
    }
    if (blockedByMe) {
      const n = document.createElement('div');
      n.className = 'empty';
      n.textContent = tr('youBlocked');
      box.append(n);
    }
  };

  const u1 = onSnapshot(
    query(collection(db, 'chats', cid, 'msgs'), orderBy('t')),
    s => {
      msgsDocs = s.docs;
      const last = s.docs[s.docs.length - 1];
      if (first || (last && last.id !== lastId && last.data().from !== me.uid)) markSeen(u);
      first = false;
      lastId = last ? last.id : '';
      draw();
      window.scrollTo(0, document.body.scrollHeight);
    },
    showErr
  );
  const u2 = onSnapshot(doc(db, 'chats', cid), s => {
    meta = s.data() || {};
    draw();
  }, showErr);

  roomRedraw = draw;
  chatUnsub = () => { u1(); u2(); roomRedraw = null; };
}

$('send').onclick = () => {
  const v = $('msgIn').value.trim();
  if (!v) return;
  if (!canSend()) return;
  $('msgIn').value = '';
  pushMsg({ type: 'text', text: v }, v);
};

$('chatFile').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !canSend()) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, 800 / im.width);
      const c = document.createElement('canvas');
      c.width = im.width * s;
      c.height = im.height * s;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      pushMsg({ type: 'image', img: c.toDataURL('image/jpeg', 0.6) }, '📷');
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
};

$('callBtn').onclick = () => {
  if (!canSend()) return;
  const room = 'NTSocial' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const link = 'https://meet.jit.si/' + room;
  pushMsg({ type: 'call', text: link }, '📹 ' + tr('callMsg'));
  window.open(link, '_blank');
};

const EMO = ['😀', '😂', '🥰', '😍', '😘', '😊', '😉', '😎', '🤔', '😢', '😭', '😡', '👍', '👎', '🙏', '👏', '💪', '🔥', '❤️', '💔', '🎉', '🌹', '🎁', '⭐', '😴', '🤣', '😇', '🥳', '😅', '🙌', '👌', '✌️', '🤝', '💯', '✨', '🌙', '☀️', '🍕', '⚽', '🎵'];
const emojiBox = $('emojiBox');
EMO.forEach(em => {
  const s = document.createElement('span');
  s.textContent = em;
  s.onclick = () => { $('msgIn').value += em; };
  emojiBox.append(s);
});
$('emojiBtn').onclick = () => {
  emojiBox.style.display = emojiBox.style.display === 'flex' ? 'none' : 'flex';
};

function toggleList(key, uid) {
  const has = myList(key).includes(uid);
  return setDoc(doc(db, 'users', me.uid),
    { [key]: has ? arrayRemove(uid) : arrayUnion(uid) }, { merge: true });
}

function setBlock(uid, on) {
  setDoc(doc(db, 'users', me.uid),
    { blocked: on ? arrayUnion(uid) : arrayRemove(uid) }, { merge: true })
    .then(() => {
      reelIds = '';
      renderReels();
      render();
      renderList();
      renderBadge();
      if (roomRedraw) roomRedraw();
      if ($('blocked').style.display === 'block') renderBlocked();
    })
    .catch(showErr);
}

function openOpt() {
  if (!other) return;
  $('cPin').textContent = myList('pinned').includes(other.uid) ? tr('unpin') : tr('pin');
  $('cMute').textContent = myList('muted').includes(other.uid) ? tr('unmute') : tr('mute');
  $('cBlock').textContent = myList('blocked').includes(other.uid) ? tr('unblock') : tr('block');
  $('csheet').style.display = 'flex';
}

function closeCs() {
  $('csheet').style.display = 'none';
}

$('optBtn').onclick = openOpt;
$('cCancel').onclick = closeCs;
$('csheet').onclick = e => { if (e.target.id === 'csheet') closeCs(); };
$('cPin').onclick = () => { closeCs(); toggleList('pinned', other.uid).catch(showErr); };
$('cMute').onclick = () => { closeCs(); toggleList('muted', other.uid).catch(showErr); };
$('cBlock').onclick = () => {
  closeCs();
  const uid = other.uid;
  if (myList('blocked').includes(uid)) setBlock(uid, false);
  else if (confirm(tr('blockQ'))) setBlock(uid, true);
};

function renderBlocked() {
  const box = $('blkList');
  box.innerHTML = '';
  const ids = myList('blocked');
  if (ids.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = tr('blockedEmpty');
    box.append(e);
    return;
  }
  ids.forEach(uid => {
    const u = usersMap[uid] || { name: 'user' };
    const r = document.createElement('div');
    r.className = 'brow';
    const nm = document.createElement('div');
    nm.className = 'bn';
    nm.textContent = u.name || 'user';
    const b = document.createElement('button');
    b.className = 'ubtn';
    b.textContent = tr('unblock');
    b.onclick = () => setBlock(uid, false);
    r.append(avatar(u), nm, b);
    box.append(r);
  });
}

function openBlocked() {
  renderBlocked();
  $('blocked').style.display = 'block';
}

function closeBlocked() {
  $('blocked').style.display = 'none';
}

$('blkBack').onclick = closeBlocked;

function openMenu(p) {
  menuPost = p;
  $('sheet').style.display = 'flex';
}

function closeMenu() {
  $('sheet').style.display = 'none';
  menuPost = null;
}

$('mCancel').onclick = closeMenu;
$('sheet').onclick = e => { if (e.target.id === 'sheet') closeMenu(); };
$('vMenu').onclick = () => { if (viewerPost) openMenu(viewerPost); };

$('mEdit').onclick = () => {
  const p = menuPost;
  closeMenu();
  if (!p) return;
  const v = prompt(tr('editPrompt'), p.cap || '');
  if (v === null) return;
  reelIds = '';
  updateDoc(doc(db, 'posts', p.id), { cap: v.trim() }).catch(showErr);
  if (viewerPost && viewerPost.id === p.id) $('vCap').textContent = v.trim();
};

$('mDel').onclick = () => {
  const p = menuPost;
  closeMenu();
  if (!p) return;
  if (!confirm(tr('confirmDel'))) return;
  closeViewer();
  deleteDoc(doc(db, 'posts', p.id)).catch(showErr);
};

function loadSeen() {
  try { return JSON.parse(localStorage.getItem('ntseen_' + me.uid) || '{}'); } catch (e) { return {}; }
}

function saveSeen(o) {
  try { localStorage.setItem('ntseen_' + me.uid, JSON.stringify(o)); } catch (e) {}
  }

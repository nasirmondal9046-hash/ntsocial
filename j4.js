function getEvents() {
  const ev = [];
  posts.filter(p => p.uid === me.uid).forEach(p => {
    (p.comments || []).map((c, i) => ({ c: c, i: i })).reverse().forEach(x => {
      if (x.c.name !== myName) {
        ev.push({ id: 'c_' + p.id + '_' + x.i, type: 'c', name: x.c.name || '', text: x.c.text || '', t: x.c.t || 0, post: p });
      }
    });
    (p.likes || []).forEach(u => {
      if (u !== me.uid) {
        ev.push({ id: 'l_' + p.id + '_' + u, type: 'l', name: (usersMap[u] || {}).name || 'user', text: '', t: (p.likeT || {})[u] || 0, post: p });
      }
    });
  });
  return ev;
}

function markAllSeen() {
  const all = {};
  getEvents().forEach(e => { all[e.id] = true; });
  saveSeen(all);
}

function renderNotif() {
  const box = $('notifList');
  box.innerHTML = '';
  const evs = getEvents();
  const seen = loadSeen();
  if (evs.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = tr('nEmpty');
    box.append(e);
    return;
  }
  evs.forEach(ev => {
    const r = document.createElement('div');
    r.className = 'nrow' + (seen[ev.id] ? '' : ' nnew');
    const tx = document.createElement('div');
    tx.className = 'ntext';
    tx.textContent = (ev.type === 'l' ? tr('nLiked') : tr('nCommented'))
      .replace('{name}', ev.name).replace('{text}', ev.text) + (ev.t ? '  ·  ' + ago(ev.t) : '');
    const th = document.createElement('div');
    th.className = 'nthumb';
    const p = ev.post;
    const src = p.type === 'video' ? (p.cover || thumbOf(p.video, true)) : p.img;
    if (src) th.style.backgroundImage = `url("${src}")`;
    r.append(tx, th);
    r.onclick = () => { closeNotif(); openViewer(p); };
    box.append(r);
  });
}

function openNotif() {
  $('notif').style.display = 'block';
  renderNotif();
  markAllSeen();
  $('bellDot').style.display = 'none';
}

function closeNotif() {
  $('notif').style.display = 'none';
}

function updateNotif() {
  if (!me) return;
  if ($('notif').style.display === 'block') {
    renderNotif();
    markAllSeen();
    $('bellDot').style.display = 'none';
    return;
  }
  const seen = loadSeen();
  const n = getEvents().filter(e => !seen[e.id]).length;
  const b = $('bellDot');
  b.style.display = n ? 'flex' : 'none';
  b.textContent = n > 9 ? '9+' : String(n);
}

$('bell').onclick = openNotif;
$('notifBack').onclick = closeNotif;

const SETS = [
  { h: 'sHow', items: [['saved', '🔖'], ['archive', '🕘'], ['activity', '📈'], ['notifs', '🔔'], ['timeMgmt', '⏱️']] },
  { h: 'sWho', items: [['privacy', '🔒'], ['closeFriends', '⭐'], ['blocked', '🚫'], ['storyLive', '📍']] },
  { h: 'sInteract', items: [['messages', '✉️'], ['tags', '@'], ['comments', '💬'], ['sharing', '🔁'], ['restricted', '🙈'], ['limit', '⚠️'], ['hidden', 'Aa'], ['invite', '➕']] },
  { h: 'sContent', items: [['favorites', '☆'], ['muted', '🔕'], ['contentPref', '🎞️'], ['likeCounts', '🤍']] },
  { h: 'sApp', items: [['device', '📱'], ['archiving', '⬇️'], ['access', '♿'], ['langSet', '🌐'], ['data', '📶']] },
  { h: 'sMore', items: [['orders', '🧾'], ['logoutS', '↩️']] }
];

const langRowEl = $('langRow');

function renderSettings() {
  const box = $('setList');
  box.innerHTML = '';
  SETS.forEach((g, gi) => {
    if (gi > 0) {
      const sp = document.createElement('div');
      sp.className = 'sep';
      box.append(sp);
    }
    const h = document.createElement('div');
    h.className = 'sh';
    h.textContent = tr(g.h);
    box.append(h);
    g.items.forEach(it => {
      const key = it[0];
      const r = document.createElement('div');
      r.className = 'si';
      const ic = document.createElement('span');
      ic.className = 'sic';
      ic.textContent = it[1];
      if (key === 'langSet') {
        r.append(ic, langRowEl);
        box.append(r);
        return;
      }
      const lb = document.createElement('div');
      lb.className = 'sx';
      lb.textContent = tr('s_' + key);
      r.append(ic, lb);
      if (key === 'likeCounts') {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!(usersMap[me.uid] || {}).hideLikes;
        cb.onchange = () => setDoc(doc(db, 'users', me.uid),
          { hideLikes: cb.checked }, { merge: true }).catch(showErr);
        r.append(cb);
      } else if (key === 'blocked') {
        r.onclick = openBlocked;
      } else if (key === 'logoutS') {
        r.onclick = () => { closeSettings(); signOut(auth); };
      } else {
        r.onclick = () => toast(tr('soon'));
      }
      box.append(r);
    });
  });
}

function openSettings() {
  renderSettings();
  $('settings').style.display = 'block';
}

function closeSettings() {
  $('settings').style.display = 'none';
}

$('gear').onclick = openSettings;
$('setBack').onclick = closeSettings;

function buildPost(p) {
  let cur = p;
  const el = document.createElement('div');
  el.className = 'post';
  el.innerHTML = `<div class="user"><span class="un"></span></div>
    <div class="media"></div>
    <div class="actions"><span class="like"></span></div>
    <div class="count lk"></div>
    <div class="count cap"><b></b> </div>
    <div class="comments"></div>
    <input class="cin">
    <button class="cbtn"></button>`;

  el.querySelector('.cin').placeholder = tr('commentPh');
  el.querySelector('.cbtn').textContent = tr('postBtn');

  const un = el.querySelector('.un');
  const liveU = usersMap[p.uid] || { name: p.name };
  const shownName = liveU.name || p.name || '';
  un.append(avatar(liveU), document.createTextNode(shownName));
  un.onclick = () => openProfile(p.uid);

  if (p.uid === me.uid) {
    const mb = document.createElement('button');
    mb.className = 'mbtn';
    mb.textContent = '⋯';
    mb.onclick = () => openMenu(cur);
    el.querySelector('.user').append(mb);
  }

  el._pid = p.id;
  if (p.uid !== me.uid) viewWatcher.observe(el);

  const ph = document.createElement('div');
  ph.className = 'photo';
  if (p.img) ph.style.background = `url("${p.img}") center/cover`;
  el.querySelector('.media').append(ph);

  el.querySelector('.cap b').textContent = shownName;
  el.querySelector('.cap').append(p.cap || '');

  const tm = document.createElement('div');
  tm.className = 'count';
  tm.style.color = '#737373';
  tm.style.fontSize = '12px';
  tm.textContent = ago(p.t);
  el.querySelector('.cap').after(tm);

  const fill = q => {
    cur = q;
    const likes = q.likes || [];
    const liked = likes.includes(me.uid);
    el.querySelector('.like').textContent = liked ? '❤️' : '🤍';
    const hide = !!(usersMap[q.uid] || {}).hideLikes && q.uid !== me.uid;
    el.querySelector('.lk').textContent =
      (hide ? '' : tr('likes', likes.length) + '  ·  ') + '👁 ' + (q.viewers || []).length;

    const cm = el.querySelector('.comments');
    cm.innerHTML = '';
    (q.comments || []).forEach(c => {
      const d = document.createElement('div');
      d.className = 'count';
      const b = document.createElement('b');
      b.textContent = c.name || '';
      d.append(b, ' ' + (c.text || ''));
      cm.append(d);
    });

    const old = el.querySelector('.fbtn');
    if (old) old.remove();
    if (q.uid !== me.uid) {
      const isF = following.includes(q.uid);
      const fb = document.createElement('button');
      fb.className = 'fbtn';
      fb.textContent = isF ? tr('following') : tr('follow');
      fb.onclick = () => setDoc(doc(db, 'users', me.uid),
        { following: isF ? arrayRemove(q.uid) : arrayUnion(q.uid) }, { merge: true }).catch(showErr);
      el.querySelector('.user').append(fb);
    }
  };
  fill(p);
  el._fill = fill;

  el.querySelector('.like').onclick = () => {
    const liked = (cur.likes || []).includes(me.uid);
    updateDoc(doc(db, 'posts', cur.id), {
      likes: liked ? arrayRemove(me.uid) : arrayUnion(me.uid),
      ['likeT.' + me.uid]: Date.now()
    }).catch(showErr);
  };

  el.querySelector('.cbtn').onclick = () => {
    const inp = el.querySelector('.cin');
    const v = inp.value.trim();
    if (!v) return;
    inp.value = '';
    updateDoc(doc(db, 'posts', cur.id),
      { comments: arrayUnion({ name: myName, text: v, t: Date.now() }) }).catch(showErr);
  };

  return el;
}

function render() {
  const feed = $('feed');
  feed.innerHTML = '';
  updateNotif();
  if (!me) return;

  if (!loaded) {
    feed.innerHTML = '<div class="empty">' + tr('loading') + '</div>';
    return;
  }
  const list = posts.filter(p => p.type !== 'video' && !hiddenUid(p.uid));
  if (list.length === 0) {
    feed.innerHTML = '<div class="empty">' + tr('noPosts') + '</div>';
    return;
  }
  list.forEach(p => {
    try { feed.append(buildPost(p)); }
    catch (e) { showErr(e); }
  });
}

const SHARE_SVG = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M21 3L3 10.5l7 3 3 7z"/><path d="M10 13.5L21 3"/></svg>';

function renderCm() {
  const box = $('cmList');
  box.innerHTML = '';
  const p = posts.find(x => x.id === cmId);
  const list = p ? (p.comments || []) : [];
  if (list.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = tr('noComments');
    box.append(e);
    return;
  }
  list.forEach(c => {
    const d = document.createElement('div');
    d.className = 'cmr';
    const b = document.createElement('b');
    b.textContent = c.name || '';
    d.append(b, ' ' + (c.text || ''));
    if (c.t) {
      const t = document.createElement('span');
      t.className = 'ct';
      t.textContent = '  ·  ' + ago(c.t);
      d.append(t);
    }
    box.append(d);
  });
  box.scrollTop = box.scrollHeight;
}

function refreshCm() {
  if (cmId && $('cmSheet').style.display === 'flex') renderCm();
}

function openCm(p) {
  cmId = p.id;
  renderCm();
  $('cmSheet').style.display = 'flex';
}

function closeCm() {
  $('cmSheet').style.display = 'none';
  cmId = null;
}

$('cmClose').onclick = closeCm;
$('cmSheet').onclick = e => { if (e.target.id === 'cmSheet') closeCm(); };
$('cmSend').onclick = () => {
  const v = $('cmIn').value.trim();
  if (!v || !cmId) return;
  $('cmIn').value = '';
  updateDoc(doc(db, 'posts', cmId),
    { comments: arrayUnion({ name: myName, text: v, t: Date.now() }) }).catch(showErr);
};

async function sharePost(p) {
  const link = location.origin + location.pathname + '#p=' + p.id;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'NT Social', text: p.cap || 'NT Social', url: link });
    } else {
      await navigator.clipboard.writeText(link);
      toast(tr('linkCopied'));
    }
  } catch (e) { return; }
  updateDoc(doc(db, 'posts', p.id), { sharers: arrayUnion(me.uid) }).catch(() => {});
}

function rb(icon) {
  const b = document.createElement('div');
  b.className = 'rb';
  const ic = document.createElement('div');
  ic.className = 'ic';
  ic.innerHTML = icon;
  const n = document.createElement('div');
  b.append(ic, n);
  return { b: b, ic: ic, n: n };
}

function buildReel(p) {
  let cur = p;
  const el = document.createElement('div');
  el.className = 'reel';

  const v = document.createElement('video');
  v.src = p.video;
  v.poster = p.cover || thumbOf(p.video, false);
  v.loop = true;
  v.muted = true;
  v.playsInline = true;
  v.preload = 'metadata';
  v.onclick = () => { if (v.paused) v.play().catch(() => {}); else v.pause(); };
  watcher.observe(v);
  el.append(v);

  const shade = document.createElement('div');
  shade.className = 'rshade';
  el.append(shade);

  const mt = document.createElement('button');
  mt.className = 'rmute';
  mt.textContent = '🔇';
  mt.onclick = () => { v.muted = !v.muted; mt.textContent = v.muted ? '🔇' : '🔊'; };
  el.append(mt);

  if (p.uid === me.uid) {
    const mb = document.createElement('button');
    mb.className = 'rmenu';
    mb.textContent = '⋯';
    mb.onclick = () => openMenu(cur);
    el.append(mb);
  }

  const col = document.createElement('div');
  col.className = 'rcol';
  const bl = rb('🤍');
  const bc = rb('💬');
  const bs = rb(SHARE_SVG);
  bl.b.onclick = () => {
    const liked = (cur.likes || []).includes(me.uid);
    updateDoc(doc(db, 'posts', cur.id), {
      likes: liked ? arrayRemove(me.uid) : arrayUnion(me.uid),
      ['likeT.' + me.uid]: Date.now()
    }).catch(showErr);
  };
  bc.b.onclick = () => openCm(cur);
  bs.b.onclick = () => sharePost(cur);
  col.append(bl.b, bc.b, bs.b);
  el.append(col);

  const info = document.createElement('div');
  info.className = 'rinfo';
  const rn = document.createElement('div');
  rn.className = 'rn';
  const u0 = usersMap[p.uid] || { name: p.name };
  const av = avatar(u0);
  av.onclick = () => openProfile(p.uid);
  const nm = document.createElement('span');
  nm.textContent = '@' + handleOf(u0);
  rn.append(av, nm);
  const cap = document.createElement('div');
  cap.className = 'rcap';
  cap.textContent = p.cap || '';
  const tm = document.createElement('div');
  tm.className = 'rt';
  tm.textContent = ago(p.t);
  info.append(rn, cap, tm);
  el.append(info);

  const fill = q => {
    cur = q;
    const own = q.uid === me.uid;
    const owner = usersMap[q.uid] || {};
    const likes = q.likes || [];
    bl.ic.textContent = likes.includes(me.uid) ? '❤️' : '🤍';
    bl.n.textContent = (!own && (q.hideLikes || owner.hideLikes)) ? '' : fmt(likes.length);
    bc.n.textContent = (!own && q.hideComments) ? '' : fmt((q.comments || []).length);
    bs.n.textContent = (!own && q.hideShares) ? '' : fmt((q.sharers || []).length);

    const old = rn.querySelector('.rfollow');
    if (old) old.remove();
    if (!own) {
      const isF = following.includes(q.uid);
      const fb = document.createElement('button');
      fb.className = 'rfollow';
      fb.textContent = isF ? tr('following') : tr('follow');
      fb.onclick = () => setDoc(doc(db, 'users', me.uid),
        { following: isF ? arrayRemove(q.uid) : arrayUnion(q.uid) }, { merge: true }).catch(showErr);
      rn.append(fb);
    }
  };
  fill(p);
  el._fill = fill;
  el._pid = p.id;
  if (p.uid !== me.uid) viewWatcher.observe(el);

  return el;
}

function renderReels() {
  const box = $('reels');
  if (!me) return;
  if (!loaded) {
    box.innerHTML = '<div class="empty">' + tr('loading') + '</div>';
    return;
  }
  const list = posts.filter(p => p.type === 'video' && !hiddenUid(p.uid));
  if (list.length === 0) {
    watcher.disconnect();
    box.innerHTML = '<div class="empty">' + tr('noReels') + '</div>';
    reelIds = '';
    reelEls = {};
    refreshCm();
    return;
  }
  const ids = list.map(p => p.id).join(',');
  if (ids === reelIds) {
    list.forEach(p => { if (reelEls[p.id]) reelEls[p.id]._fill(p); });
    refreshCm();
    return;
  }
  reelIds = ids;
  watcher.disconnect();
  box.innerHTML = '';
  reelEls = {};
  list.forEach(p => {
    try {
      const el = buildReel(p);
      reelEls[p.id] = el;
      box.append(el);
    } catch (e) { showErr(e); }
  });
  refreshCm();
}

function uploadImage(f) {
  const cap = prompt(tr('captionPrompt')) || '';
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = async () => {
      const s = Math.min(1, 700 / im.width);
      const c = document.createElement('canvas');
      c.width = im.width * s;
      c.height = im.height * s;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      try {
        await addDoc(collection(db, 'posts'), {
          uid: me.uid, name: myName, type: 'image',
          img: c.toDataURL('image/jpeg', 0.6),
          cap: cap, likes: [], comments: [], t: serverTimestamp()
        });
      } catch (err) { showErr(err); }
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}

function uploadVideo(f) {
  if (f.size > 50 * 1024 * 1024) {
    alert(tr('bigVideo'));
    return;
  }
  pendingFile = f;
  coverData = '';
  if (nrUrl) URL.revokeObjectURL(nrUrl);
  nrUrl = URL.createObjectURL(f);
  const v = $('nrVid');
  v.removeAttribute('poster');
  v.src = nrUrl;
  $('nrCap').value = '';
  $('nrHideLikes').checked = false;
  $('nrHideCmts').checked = false;
  $('nrHideShares').checked = false;
  $('nrNote').textContent = '';
  $('newReel').style.display = 'block';
}

function closeNewReel() {
  const v = $('nrVid');
  v.pause();
  v.removeAttribute('src');
  if (nrUrl) { URL.revokeObjectURL(nrUrl); nrUrl = ''; }
  $('newReel').style.display = 'none';
}

$('nrBack').onclick = () => { closeNewReel(); pendingFile = null; };
$('nrCoverBtn').onclick = () => $('nrCoverFile').click();

$('nrCoverFile').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, 480 / im.width);
      const c = document.createElement('canvas');
      c.width = im.width * s;
      c.height = im.height * s;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      coverData = c.toDataURL('image/jpeg', 0.7);
      $('nrVid').poster = coverData;
      $('nrNote').textContent = tr('coverSet');
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
};

$('nrHash').onclick = () => {
  const t = $('nrCap');
  t.value += (t.value && !/\s$/.test(t.value) ? ' ' : '') + '#';
  t.focus();
};

function sendVideo(f, opts) {
  const fd = new FormData();
  fd.append('file', f);
  fd.append('upload_preset', PRESET);
  const x = new XMLHttpRequest();
  x.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUD + '/video/upload');
  x.upload.onprogress = ev => {
    if (ev.lengthComputable) {
      setStatus(tr('uploading', Math.round(ev.loaded / ev.total * 100)));
    }
  };
  x.onload = async () => {
    try {
      const r = JSON.parse(x.responseText);
      if (!r.secure_url) throw new Error((r.error && r.error.message) || 'Upload failed');
      await addDoc(collection(db, 'posts'), {
        uid: me.uid, name: myName, type: 'video', video: r.secure_url,
        cap: opts.cap, cover: opts.cover,
        hideLikes: opts.hideLikes, hideComments: opts.hideComments, hideShares: opts.hideShares,
        likes: [], comments: [], sharers: [], t: serverTimestamp()
      });
      setStatus('');
    } catch (err) {
      setStatus('');
      showErr(err);
    }
  };
  x.onerror = () => {
    setStatus('');
    showErr(tr('uploadFail'));
  };
  x.send(fd);
}

$('nrPost').onclick = () => {
  const f = pendingFile;
  if (!f) return;
  const opts = {
    cap: $('nrCap').value.trim(),
    cover: coverData,
    hideLikes: $('nrHideLikes').checked,
    hideComments: $('nrHideCmts').checked,
    hideShares: $('nrHideShares').checked
  };
  closeNewReel();
  pendingFile = null;
  sendVideo(f, opts);
};

$('file').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !me) return;
  if (f.type.indexOf('video/') === 0) uploadVideo(f);
  else uploadImage(f);
};

$('logout').addEventListener('click', () => {
  closeNotif();
  closeSettings();
  closeBlocked();
  closeCs();
  closeEditP();
  closeNewReel();
  closeCm();
  closeMenu();
});

$('langProf').addEventListener('change', () => {
  if ($('settings').style.display === 'block') renderSettings();
});

fillLang($('langAuth'));
fillLang($('langProf'));
applyLang();

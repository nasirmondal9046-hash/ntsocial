const ADMIN_UIDS = ['RzXMw3V7P6ZLhQT5DwGj09sreZv1'];

Object.assign(T.en, {
  qTitle: 'Review videos', qEmpty: 'Nothing waiting for review', qApprove: 'Approve', qDelete: 'Delete',
  qSent: 'Video sent. It will appear after the admin approves it.', qConfirm: 'Delete this video?'
});
Object.assign(T.bn, {
  qTitle: 'ভিডিও যাচাই', qEmpty: 'যাচাইয়ের অপেক্ষায় কিছু নেই', qApprove: 'অনুমোদন দিন', qDelete: 'মুছে দিন',
  qSent: 'ভিডিও পাঠানো হয়েছে। অ্যাডমিন অনুমোদন দিলে দেখা যাবে।', qConfirm: 'এই ভিডিও মুছে ফেলবেন?'
});

let queueItems = [], queueUnsub = null;

function isAdmin() {
  return !!me && ADMIN_UIDS.includes(me.uid);
}

const qStyle = document.createElement('style');
qStyle.textContent =
  '#qBtn{position:relative;cursor:pointer;font-size:22px;display:none}' +
  '#qDot{position:absolute;top:-8px;inset-inline-end:-8px;min-width:18px;height:18px;box-sizing:border-box;padding:0 4px;border-radius:9px;background:#ff3040;color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center}' +
  '#qPanel{position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:8;overflow-y:auto}' +
  '#qTop{position:sticky;top:0;z-index:1;background:#fff;display:flex;align-items:center;gap:12px;padding:12px 16px;font-weight:600;border-bottom:1px solid #efefef}' +
  '#qTop button{background:none;border:none;font-size:22px}' +
  '.qc{padding:12px 16px;border-bottom:1px solid #efefef}' +
  '.qc video{width:100%;max-height:60vh;background:#000;border-radius:12px;display:block;margin:8px 0}' +
  '.qh{font-weight:600;font-size:14px}' +
  '.qh span{color:#737373;font-weight:400;font-size:12px}' +
  '.qb{display:flex;gap:10px;margin-top:8px}' +
  '.qb button{flex:1;border:none;border-radius:8px;padding:10px;font-weight:600;font-size:14px}' +
  '.qa{background:#0095f6;color:#fff}' +
  '.qd{background:#efefef;color:#ed4956}';
document.head.appendChild(qStyle);

const qBtn = document.createElement('span');
qBtn.id = 'qBtn';
qBtn.innerHTML = '🛡️<span id="qDot"></span>';
$('hr').insertBefore(qBtn, $('bell'));

const qPanel = document.createElement('div');
qPanel.id = 'qPanel';
qPanel.style.display = 'none';
qPanel.innerHTML = '<div id="qTop"><button id="qBack">←</button><span id="qTitle"></span></div><div id="qList"></div>';
$('app').appendChild(qPanel);

function updateQueueBtn() {
  const admin = isAdmin();
  qBtn.style.display = admin ? 'block' : 'none';
  const d = $('qDot');
  d.style.display = (admin && queueItems.length) ? 'flex' : 'none';
  d.textContent = queueItems.length > 9 ? '9+' : String(queueItems.length);
}

function renderQueue() {
  $('qTitle').textContent = tr('qTitle');
  const box = $('qList');
  box.innerHTML = '';
  if (queueItems.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = tr('qEmpty');
    box.append(e);
    return;
  }
  queueItems.forEach(it => {
    const c = document.createElement('div');
    c.className = 'qc';
    const h = document.createElement('div');
    h.className = 'qh';
    h.textContent = '@' + handleOf(usersMap[it.uid] || { name: it.name }) + '  ';
    const tm = document.createElement('span');
    tm.textContent = ago(it.t);
    h.append(tm);
    const v = document.createElement('video');
    v.src = it.video;
    v.poster = it.cover || thumbOf(it.video, false);
    v.controls = true;
    v.playsInline = true;
    v.preload = 'metadata';
    const cap = document.createElement('div');
    cap.textContent = it.cap || '';
    const b = document.createElement('div');
    b.className = 'qb';
    const ok = document.createElement('button');
    ok.className = 'qa';
    ok.textContent = tr('qApprove');
    ok.onclick = () => approveItem(it);
    const del = document.createElement('button');
    del.className = 'qd';
    del.textContent = tr('qDelete');
    del.onclick = () => {
      if (confirm(tr('qConfirm'))) deleteDoc(doc(db, 'queue', it.id)).catch(showErr);
    };
    b.append(ok, del);
    c.append(h, v, cap, b);
    box.append(c);
  });
}

async function approveItem(it) {
  try {
    await addDoc(collection(db, 'posts'), {
      uid: it.uid, name: it.name || '', type: 'video', video: it.video,
      cap: it.cap || '', cover: it.cover || '',
      hideLikes: !!it.hideLikes, hideComments: !!it.hideComments, hideShares: !!it.hideShares,
      likes: [], comments: [], sharers: [], t: serverTimestamp()
    });
    await deleteDoc(doc(db, 'queue', it.id));
  } catch (e) { showErr(e); }
}

qBtn.onclick = () => {
  renderQueue();
  qPanel.style.display = 'block';
};
$('qBack').onclick = () => {
  qPanel.style.display = 'none';
  document.querySelectorAll('#qList video').forEach(x => x.pause());
};
$('logout').addEventListener('click', () => { qPanel.style.display = 'none'; });

onAuthStateChanged(auth, user => {
  if (queueUnsub) { queueUnsub(); queueUnsub = null; }
  queueItems = [];
  updateQueueBtn();
  if (user && ADMIN_UIDS.includes(user.uid)) {
    queueUnsub = onSnapshot(query(collection(db, 'queue'), orderBy('t', 'desc')), s => {
      queueItems = s.docs.map(d => ({ id: d.id, ...d.data() }));
      updateQueueBtn();
      if (qPanel.style.display === 'block') renderQueue();
    }, showErr);
  }
});

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
      const admin = isAdmin();
      await addDoc(collection(db, admin ? 'posts' : 'queue'), {
        uid: me.uid, name: myName, type: 'video', video: r.secure_url,
        cap: opts.cap, cover: opts.cover,
        hideLikes: opts.hideLikes, hideComments: opts.hideComments, hideShares: opts.hideShares,
        likes: [], comments: [], sharers: [], t: serverTimestamp()
      });
      if (admin) {
        setStatus('');
      } else {
        setStatus(tr('qSent'));
        setTimeout(() => setStatus(''), 8000);
      }
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

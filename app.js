/**
 * Gather — Community Events
 * Firebase Auth + Firestore backend
 *
 * Replace the firebaseConfig below with your project config from Firebase Console.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Replace with your Firebase project config from Firebase Console > Project settings
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA75BZNubv4JkA9l5PIKn253fpxBeKQMAk",
  authDomain: "event-discovery-platform-c0d2f.firebaseapp.com",
  projectId: "event-discovery-platform-c0d2f",
  storageBucket: "event-discovery-platform-c0d2f.firebasestorage.app",
  messagingSenderId: "291227525859",
  appId: "1:291227525859:web:bbf916dbeac27b9d14dbd6",
  measurementId: "G-4EWY5X37DR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- State ---
let events = [];
let rsvps = [];
let me = null;
let filt = 'All';

const emoji = { Tech: '⚡', Arts: '🎨', Sports: '🏅', Education: '📚', Music: '🎵', Food: '🍜' };

// --- Utils ---
function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function fmtT(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function v(id) {
  const el = document.getElementById(id);
  return (el && el.value ? el.value : '').trim();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// --- Firestore: load events & rsvps ---
async function loadEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Fetch up to 100 upcoming events to prevent unbounded queries
  const q = query(
    collection(db, 'events'),
    where('date', '>=', today.toISOString().split('T')[0]),
    orderBy('date', 'asc'),
    limit(100)
  );
  const snap = await getDocs(q);
  events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function loadRsvps() {
  // Only load RSVPs for the events currently in view
  if (events.length === 0) {
    rsvps = [];
    return;
  }

  // Firestore `in` queries are limited to 10 items.
  // We'll chunk the event IDs to fetch RSVPs efficiently.
  const eventIds = events.map(e => e.id);
  const chunkedIds = [];
  for (let i = 0; i < eventIds.length; i += 10) {
    chunkedIds.push(eventIds.slice(i, i + 10));
  }

  const allRsvps = [];
  for (const chunk of chunkedIds) {
    const rsvpQuery = query(collection(db, 'rsvps'), where('eid', 'in', chunk));
    const snap = await getDocs(rsvpQuery);
    allRsvps.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  rsvps = allRsvps;
}

// --- Auth state ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    let displayName = user.displayName || '';
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      displayName = userSnap.data().displayName || displayName;
    }
    me = { id: user.uid, email: user.email, name: displayName || user.email?.split('@')[0] || 'User' };
  } else {
    me = null;
  }
  await loadEvents();
  await loadRsvps();
  renderNav();
  renderStats();
  renderEvents();
});

// --- UI: render ---
function renderNav() {
  const nr = document.getElementById('navR');
  if (!nr) return;
  if (!me) {
    nr.innerHTML =
      '<button class="btn btn-g" onclick="openAuth(\'login\')">Log in</button><button class="btn btn-p" onclick="openAuth(\'register\')">Sign up</button>';
  } else {
    const i = (me.name || 'U')[0].toUpperCase();
    nr.innerHTML = `<button class="btn btn-p btn-sm" onclick="open_('crOv')">+ Post Event</button><div class="av-w"><button class="av" onclick="toggleDD()">${i}</button><div class="udd" id="udd"><button onclick="openDash()">My Events</button><button class="danger" onclick="logout()">Log out</button></div></div>`;
  }
}

function toggleDD() {
  document.getElementById('udd')?.classList.toggle('open');
}

function renderStats() {
  const hEv = document.getElementById('hEv');
  const hUs = document.getElementById('hUs');
  if (hEv) hEv.textContent = events.length;
  if (hUs) hUs.textContent = [...new Set(events.map((e) => e.uid))].length;
}

function setFilter(cat, el) {
  filt = cat;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderEvents();
}

function getFiltered() {
  const q = (document.getElementById('srch')?.value || '').trim().toLowerCase();
  // Events are already filtered by date >= today from Firestore
  return events
    .filter((ev) => {
      if (filt !== 'All' && ev.cat !== filt) return false;
      if (q && !ev.name.toLowerCase().includes(q) && !(ev.desc || '').toLowerCase().includes(q)) return false;
      return true;
    });
}

function renderEvents() {
  const f = getFiltered();
  const g = document.getElementById('grid');
  const secC = document.getElementById('secC');
  if (!g) return;
  if (secC) secC.textContent = `${f.length} event${f.length !== 1 ? 's' : ''} found`;
  if (!f.length) {
    g.innerHTML =
      '<div class="empty"><div class="empty-i">📭</div><div class="empty-t">No Events Found</div><div class="empty-s">Try a different search or category.</div></div>';
    return;
  }
  g.innerHTML = f
    .map((ev, i) => {
      const rc = rsvps.filter((r) => r.eid === ev.id).length;
      const d = new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const thumb = ev.img ? `<div class="c-thumb" style="background-image:url('${esc(ev.img)}')"></div>` : '';
      return `<div class="card" onclick="openDetail('${esc(ev.id)}')" style="animation-delay:${i * 0.04}s">
      ${thumb}
      <span class="ca">↗</span>
      <span class="badge b${ev.cat}">${emoji[ev.cat] || '📌'} ${ev.cat}</span>
      <div class="c-title">${esc(ev.name)}</div>
      <div class="c-meta">
        <div class="c-mr"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${d} · ${fmtT(ev.time)}</div>
        <div class="c-mr"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>${esc(ev.loc)}</div>
      </div>
      <div class="c-foot">
        <div class="c-by">by <strong>${esc(ev.by)}</strong></div>
        ${rc ? `<div class="c-rv">${rc} GOING</div>` : ''}
      </div>
    </div>`;
    })
    .join('');
}

function openDetail(id) {
  const ev = events.find((e) => e.id === id);
  if (!ev) return;
  const d = new Date(ev.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const rc = rsvps.filter((r) => r.eid === id).length;
  const has = me && rsvps.some((r) => r.eid === id && r.uid === me.id);
  const isOwner = !!(me && ev.uid === me.id);
  const detImg = ev.img
    ? `<div class="det-img" style="background-image:url('${esc(ev.img)}')"></div>`
    : '';
  const detH = document.getElementById('detH');
  const detB = document.getElementById('detB');
  if (detH) {
    detH.innerHTML = `
    ${detImg}
    <span class="badge b${ev.cat}">${emoji[ev.cat] || '📌'} ${ev.cat}</span>
    <div class="det-ttl">${esc(ev.name)}</div>
    <div class="det-g">
      <div class="di"><div class="dl">Date & Time</div><div class="dv">${d}<br>${fmtT(ev.time)}</div></div>
      <div class="di"><div class="dl">Location</div><div class="dv">${esc(ev.loc)}</div></div>
      <div class="di"><div class="dl">Organiser</div><div class="dv">${esc(ev.by)}</div></div>
      <div class="di"><div class="dl">Attendees</div><div class="dv">${rc} going</div></div>
    </div>`;
  }
  const rb = me
    ? `<button class="btn ${has ? 'btn-g rv-btn done' : 'btn-p rv-btn'}" onclick="toggleRSVP('${esc(id)}')">${has ? "✓ You're Going — Cancel RSVP" : "RSVP — I'm Going"}</button>`
    : `<button class="btn btn-g rv-btn" onclick="close_('detOv');openAuth('login')">Log in to RSVP</button>`;
  const delBtn = isOwner
    ? `<button class="b-del" style="width:100%;margin-top:10px;padding:13px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase" onclick="close_('detOv');deleteEvent('${esc(id)}')">Delete event</button>`
    : '';
  if (detB) detB.innerHTML = `<div class="dlbl">About this event</div><div class="dtxt">${esc(ev.desc)}</div>${rb}${delBtn}`;
  open_('detOv');
}

async function toggleRSVP(eid) {
  if (!me) return;
  const existing = rsvps.find((r) => r.eid === eid && r.uid === me.id);
  try {
    if (existing) {
      await deleteDoc(doc(db, 'rsvps', existing.id));
      toast('RSVP cancelled.');
    } else {
      await addDoc(collection(db, 'rsvps'), { eid, uid: me.id });
      toast("You're going! 🎉");
    }
  } catch (err) {
    toast(err.message || 'Something went wrong.', true);
    return;
  }
  await loadRsvps();
  openDetail(eid);
  renderEvents();
}

// --- Auth modals ---
function openAuth(mode) {
  const aTag = document.getElementById('aTag');
  const aTtl = document.getElementById('aTtl');
  const aBody = document.getElementById('aBody');
  if (aTag) aTag.textContent = mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT';
  if (aTtl) aTtl.textContent = mode === 'login' ? 'Welcome Back' : 'Join Gather';
  if (aBody) {
    aBody.innerHTML =
      mode === 'login'
        ? `
    <div class="fg"><label>Email</label><input type="email" id="aE" placeholder="you@example.com"></div>
    <div class="fg"><label>Password</label><input type="password" id="aP" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <button class="btn btn-p" style="width:100%;padding:12px;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-top:4px" onclick="doLogin()">Log In</button>
    <div class="m-lnk">No account? <a onclick="openAuth('register')">Sign up</a></div>`
        : `<div class="fg"><label>Display Name</label><input type="text" id="aN" placeholder="Your name"></div>
    <div class="fg"><label>Email</label><input type="email" id="aE" placeholder="you@example.com"></div>
    <div class="fg"><label>Password</label><input type="password" id="aP" placeholder="Min 6 characters" onkeydown="if(event.key==='Enter')doRegister()"></div>
    <button class="btn btn-p" style="width:100%;padding:12px;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-top:4px" onclick="doRegister()">Create Account</button>
    <div class="m-lnk">Have an account? <a onclick="openAuth('login')">Log in</a></div>`;
  }
  open_('authOv');
  setTimeout(() => document.querySelector('#authOv input')?.focus(), 80);
}

async function doLogin() {
  const e = v('aE');
  const p = v('aP');
  if (!e || !p) {
    toast('Please fill in all fields.', true);
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, e, p);
    close_('authOv');
    toast(`Welcome back, ${me?.name || '!'} 👋`);
  } catch (err) {
    toast(err.message || 'Invalid email or password.', true);
  }
}

async function doRegister() {
  const n = v('aN');
  const e = v('aE');
  const p = v('aP');
  if (!n || !e || !p) {
    toast('Please fill in all fields.', true);
    return;
  }
  if (p.length < 6) {
    toast('Password must be at least 6 characters.', true);
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    await updateProfile(cred.user, { displayName: n });
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: n,
      email: e,
    });
    close_('authOv');
    toast(`Welcome, ${n}! 🎉`);
  } catch (err) {
    toast(err.message || 'Registration failed.', true);
  }
}

async function logout() {
  try {
    await signOut(auth);
    toast('Logged out.');
  } catch (err) {
    toast(err.message || 'Logout failed.', true);
  }
  renderNav();
}

// --- Create event ---
async function createEvent() {
  if (!me) {
    toast('Please log in first.', true);
    return;
  }
  const name = v('cN');
  const desc = v('cD');
  const date = v('cDt');
  const time = v('cTm');
  const loc = v('cL');
  const cat = v('cC');
  if (!name || !desc || !date || !time || !loc || !cat) {
    toast('Please fill in all required fields.', true);
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(date) < today) {
    toast('Event date must be in the future.', true);
    return;
  }
  const imgUrl = v('cI');
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      name,
      desc,
      date,
      time,
      loc,
      cat,
      uid: me.id,
      by: me.name,
      img: imgUrl || null,
    });
    close_('crOv');
    ['cN', 'cD', 'cDt', 'cTm', 'cL', 'cI'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const cC = document.getElementById('cC');
    if (cC) cC.selectedIndex = 0;
    const cLen = document.getElementById('cLen');
    if (cLen) cLen.textContent = '0';
    toast('Event published! 🚀');
    await loadEvents();
    renderEvents();
    renderStats();
  } catch (err) {
    console.error('Create event failed:', err);
    const msg = err.code === 'permission-denied'
      ? 'Permission denied. Check Firestore rules — allow write when request.auth != null.'
      : (err.message || 'Failed to publish event.');
    toast(msg, true);
  }
}

// --- Dashboard ---
function openDash() {
  document.getElementById('udd')?.classList.remove('open');
  if (!me) return;
  const my = events.filter((e) => e.uid === me.id);
  const dashB = document.getElementById('dashB');
  if (!dashB) return;
  if (!my.length) {
    dashB.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--mut)"><div style="font-size:36px;margin-bottom:12px">📅</div><div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px">No Events Yet</div><div style="font-size:13px;margin-top:6px">Post your first event to see it here.</div><button class="btn btn-p" style="margin-top:20px" onclick="close_('dashOv');open_('crOv')">+ Post Event</button></div>`;
  } else {
    dashB.innerHTML = my
      .map((ev) => {
        const d = new Date(ev.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const rc = rsvps.filter((r) => r.eid === ev.id).length;
        return `<div class="di-row"><div class="di-info"><div class="di-name">${esc(ev.name)}</div><div class="di-meta">${ev.cat} · ${d} · ${ev.loc} · ${rc} going</div></div><button class="b-del" onclick="deleteEvent('${esc(ev.id)}')">Delete</button></div>`;
      })
      .join('');
  }
  open_('dashOv');
}

async function deleteEvent(id) {
  if (!confirm('Delete this event? This cannot be undone.')) return;

  const originalHtml = event.target.innerHTML;
  event.target.innerHTML = 'Deleting...';
  event.target.disabled = true;

  try {
    const batch = writeBatch(db);

    // 1. Get all RSVPs for this event
    const rsvpSnap = await getDocs(query(collection(db, 'rsvps'), where('eid', '==', id)));

    // 2. Add RSVP deletions to batch
    for (const d of rsvpSnap.docs) {
      batch.delete(doc(db, 'rsvps', d.id));
    }

    // 3. Add Event deletion to batch
    batch.delete(doc(db, 'events', id));

    // 4. Commit atomic batch
    await batch.commit();

    toast('Event deleted successfully.');

    // Remove from local state immediately to avoid full reload
    events = events.filter(e => e.id !== id);
    rsvps = rsvps.filter(r => r.eid !== id);

    renderEvents();
    renderStats();
    openDash();
  } catch (err) {
    toast(err.message || 'Failed to delete event.', true);
    event.target.innerHTML = originalHtml;
    event.target.disabled = false;
  }
}

// --- Modals ---
function open_(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function close_(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
function bgClose(e, id) {
  if (e.target.id === id) close_(id);
}

function toast(msg, err = false) {
  const toasts = document.getElementById('toasts');
  if (!toasts) return;
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// --- Init: bind description char count and debounced search ---
function bindCreateForm() {
  const cD = document.getElementById('cD');
  const cLen = document.getElementById('cLen');
  if (cD && cLen) {
    cD.addEventListener('input', () => {
      cLen.textContent = cD.value.length;
    });
  }
  const srch = document.getElementById('srch');
  if (srch) {
    srch.addEventListener('input', debounce(renderEvents, 300));
  }
}

// --- Global listeners & expose to window for inline handlers ---
document.addEventListener('click', (e) => {
  if (!e.target.closest('.av-w')) document.getElementById('udd')?.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['authOv', 'crOv', 'detOv', 'dashOv'].forEach((id) => {
      const el = document.getElementById(id);
      if (el?.classList.contains('open')) close_(id);
    });
  }
});

// Expose for onclick attributes
window.openAuth = openAuth;
window.open_ = open_;
window.close_ = close_;
window.bgClose = bgClose;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.logout = logout;
window.toggleDD = toggleDD;
window.setFilter = setFilter;
window.renderEvents = renderEvents;
window.openDetail = openDetail;
window.toggleRSVP = toggleRSVP;
// Use publishEvent to avoid clashing with native document.createEvent
window.publishEvent = createEvent;
window.openDash = openDash;
window.deleteEvent = deleteEvent;

bindCreateForm();

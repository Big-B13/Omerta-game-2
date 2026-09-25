/* Omertà — The Climb. UI. */
(function () {
'use strict';
const E1 = window.Engine, E = window.Engine2;
const $ = id => document.getElementById(id);
const COLORS = ['#b4332a', '#2f6fbf', '#2e8a5b', '#c47a12', '#6a3fa0', '#c45a1a', '#d8d4cc', '#3a8a8a'];
const RANKS = { soldier: 'Soldier', capo: 'Capo', underboss: 'Underboss', consigliere: 'Consigliere', don: 'Don' };

let G = null, mapG = null, base = null;
let cam = { x: 0, y: 0, z: 4 };
let mode = null; // {kind:'build', type}
let hover = null;
const cvs = $('map'), ctx = cvs.getContext('2d');

/* ---------- map backdrop from the territory engine ---------- */
function buildBackdrop(seed) {
  mapG = E1.createGame({ seed });
  const W = E1.W, H = E1.H;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const regionTone = { jersey: [74, 66, 52], manhattan: [92, 84, 66], bronx: [78, 72, 58], queens: [86, 80, 64], brooklyn: [84, 74, 58], staten: [72, 66, 54], havana: [96, 86, 66] };
  const distRegion = {};
  mapG.districts.forEach(dd => { const hit = E.DIST.find(x => x.name === dd.name); if (hit) distRegion[dd.name] = hit.region; });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * E1.W + x, o = i * 4;
    const t = mapG.terrain[i];
    let r, g, b;
    if (t === E1.WATER) { r = 16 + (x * 3 + y) % 7; g = 26 + (y % 5); b = 42; }
    else {
      const tone = regionTone[distRegion[mapG.district[i]] || 'manhattan'] || [88, 80, 64];
      const n = ((x * 13 + y * 7) % 9) - 4;
      r = tone[0] + n; g = tone[1] + n; b = tone[2] + n - 4;
      if (t === E1.BRIDGE) { r = 150; g = 140; b = 120; }
    }
    d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
  }
  // district borders
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = mapG.idx(x, y);
    if (mapG.terrain[i] !== E1.LAND) continue;
    const dn = mapG.district[i];
    if (mapG.district[i + 1] !== dn || mapG.district[i + E1.W] !== dn) {
      const o = i * 4; d[o] *= 0.72; d[o + 1] *= 0.72; d[o + 2] *= 0.72;
    }
  }
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  off.getContext('2d').putImageData(img, 0, 0);
  base = off;
  return mapG.rackets.map(r => ({ t: r.type, x: r.x, y: r.y, d: r.district }));
}

/* ---------- camera ---------- */
function fit() {
  const r = cvs.parentElement.getBoundingClientRect();
  cvs.width = r.width; cvs.height = r.height;
  cam.z = Math.min(cvs.width / E1.W, cvs.height / E1.H);
  cam.x = (cvs.width - E1.W * cam.z) / 2;
  cam.y = (cvs.height - E1.H * cam.z) / 2;
}
function world(px, py) { return { x: (px - cam.x) / cam.z, y: (py - cam.y) / cam.z }; }
function screen(x, y) { return { x: x * cam.z + cam.x, y: y * cam.z + cam.y }; }

/* ---------- rendering ---------- */
function draw() {
  if (!G) return;
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, cam.x, cam.y, E1.W * cam.z, E1.H * cam.z);

  // ownership tint per racket's neighbourhood: a soft disc
  G.rackets.forEach(r => {
    if (!r.owner && r.torchedUntil <= G.week) return;
    const p = screen(r.x, r.y);
    const rad = 9 * cam.z;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, 7);
    if (r.torchedUntil > G.week) { ctx.fillStyle = 'rgba(40,30,24,.55)'; }
    else { const c = G.fam(r.owner).color; ctx.fillStyle = hexA(c, .32); }
    ctx.fill();
  });

  // district labels
  if (cam.z >= 2.4) {
    ctx.textAlign = 'center';
    ctx.font = Math.max(9, cam.z * 2.1) + 'px Georgia';
    E.DIST.forEach(d => {
      const p = screen(d.x, d.y - 7);
      ctx.fillStyle = 'rgba(20,16,12,.55)';
      const w = ctx.measureText(d.name).width;
      ctx.fillRect(p.x - w / 2 - 3, p.y - 9, w + 6, 13);
      ctx.fillStyle = '#efe6d6cc';
      ctx.fillText(d.name, p.x, p.y);
    });
  }

  // rackets
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  G.rackets.forEach(r => {
    const p = screen(r.x, r.y);
    const rad = Math.max(9, cam.z * 2.4);
    const info = G.RACKETS[r.type];
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, 7);
    ctx.fillStyle = r.owner ? '#1a1612' : '#262019';
    ctx.fill();
    ctx.lineWidth = r === hover ? 3 : 1.5;
    ctx.strokeStyle = r.owner ? G.fam(r.owner).color : '#6b5b45';
    if (r.torchedUntil > G.week) ctx.strokeStyle = '#5a4636';
    ctx.stroke();
    ctx.font = Math.max(11, rad * 1.1) + 'px serif';
    ctx.fillStyle = r.torchedUntil > G.week ? '#8a7355' : '#efe6d6';
    ctx.fillText(r.torchedUntil > G.week ? '\u{1F4A8}' : info.icon, p.x, p.y + 1);
  });

  // buildings
  G.buildings.forEach(b => {
    const d = E.DID[b.district];
    const owned = G.rackets.filter(r => r.district === b.district);
    const spot = owned[b.id % Math.max(1, owned.length)] || d;
    const p = screen(spot.x + 5, spot.y + 5);
    ctx.font = Math.max(10, cam.z * 2.2) + 'px serif';
    ctx.fillText(G.BUILDINGS[b.type].icon, p.x, p.y);
  });

  // build-mode hint
  if (mode && mode.kind === 'build') {
    ctx.fillStyle = '#c9a45c';
    ctx.font = '13px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText('Click one of your districts to build a ' + G.BUILDINGS[mode.type].name + '  (Esc to cancel)', 12, cvs.height - 12);
  }
  ctx.textBaseline = 'alphabetic';
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
}

/* ---------- hit testing ---------- */
function racketAt(px, py) {
  const w = world(px, py);
  let best = null, bd = 1e9;
  G.rackets.forEach(r => {
    const dx = r.x - w.x, dy = r.y - w.y, dd = dx * dx + dy * dy;
    if (dd < bd && dd < 36) { bd = dd; best = r; }
  });
  return best;
}

/* ---------- panels ---------- */
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', 2400);
}
function act(fn) { const r = fn(); if (typeof r === 'string') toast(r); refresh(); }

function leftPanel() {
  const you = G.youPerson();
  const boss = G.made.find(m => m.id === G.boss);
  let h = '<h2>THE CREW</h2>';
  h += '<div class="muted" style="margin-bottom:6px">You answer to ' + (boss && !boss.dead && you.role !== 'don' ? boss.name + ', your capo.' : 'nobody. The chair is yours.') + '</div>';
  G.crew(1).forEach(m => {
    const you2 = m.id === G.you;
    h += '<div class="card"><div class="row"><span>' + G.SPECS[m.spec].icon + ' <b>' + (you2 ? 'You — ' : '') + m.name + '</b></span><span class="rankpill">' + RANKS[m.role].toUpperCase() + '</span></div>';
    h += '<div class="sub">' + G.SPECS[m.spec].name + ': ' + G.SPECS[m.spec].desc + '</div>';
    if (!you2) h += '<div class="loy" title="loyalty"><i style="width:' + m.loyalty + '%;background:' + (m.loyalty < 35 ? '#c45b4a' : '#7da36a') + '"></i></div>';
    h += '</div>';
  });
  for (let i = G.crew(1).length; i < 4; i++) h += '<div class="seat">empty seat at the table</div>';

  const step = G.nextRank();
  h += '<h2>THE CLIMB</h2><div class="card">';
  if (!step) h += '<b>You are the Don.</b><div class="sub">Take 60% of the city\'s rackets, or finish every rival family.</div>';
  else {
    const ok = G.canPromote();
    h += '<div class="row"><b>' + RANKS[you.role] + ' → ' + step.title + '</b></div>';
    h += '<div class="sub">' + (ok === true ? 'The family will back you.' : ok) + '</div>';
    h += '<div style="margin-top:6px"><button ' + (ok === true ? '' : 'disabled') + ' data-act="promote">Make your move</button></div>';
  }
  h += '</div>';

  h += '<h2>RECRUIT A MADE MAN</h2>';
  if (!G.candidates.length) h += '<div class="muted">Nobody is looking for a button this week.</div>';
  G.candidates.forEach((c, i) => {
    h += '<div class="card"><div class="row"><span>' + G.SPECS[c.spec].icon + ' <b>' + c.name + '</b></span><button data-act="recruit" data-i="' + i + '">$' + c.ask.toLocaleString() + '</button></div>';
    h += '<div class="sub">' + G.SPECS[c.spec].name + ': ' + G.SPECS[c.spec].desc + ' · around for ' + c.weeks + ' more week' + (c.weeks > 1 ? 's' : '') + '</div></div>';
  });

  h += '<h2>BUILD</h2><div class="buildgrid">';
  G.BUILD_ORDER.forEach(t => {
    const b = G.BUILDINGS[t];
    const on = mode && mode.kind === 'build' && mode.type === t;
    h += '<div class="card ' + (on ? 'on' : '') + '" data-act="buildmode" data-t="' + t + '"><b>' + b.icon + ' ' + b.name + '</b><div class="sub">$' + G.buildCost(t).toLocaleString() + ' · ' + b.desc + '</div></div>';
  });
  h += '</div>';

  h += '<h2>OPERATIONS</h2>';
  h += '<div class="card"><div class="row"><span>\u{1F4E8} <b>Bribe the precinct</b></span><button data-act="bribe">$' + Math.round(150 + G.heat * 18 * (G.hasSpec(1, 'fixer') ? .5 : 1)).toLocaleString() + '</button></div>';
  h += '<div class="sub">−30 heat. The cops look away for 3 weeks.</div></div>';
  h += '<div class="muted">Firebomb, Heist, Intimidate and hits are on the map and the Families panel — if your crew has the right man for it.</div>';
  $('left').innerHTML = h;
}

function rightPanel() {
  let h = '<h2>SIT-DOWNS</h2>';
  if (!G.offers.length) h += '<div class="muted">No messages from the other families.</div>';
  G.offers.forEach((o, i) => {
    const f = G.fam(o.from);
    h += '<div class="card"><b>' + f.name + '</b> offers a truce, ' + o.weeks + ' weeks.<div class="btns" style="margin-top:6px"><button data-act="offer" data-i="' + i + '" data-y="1">Accept</button><button data-act="offer" data-i="' + i + '" data-y="0">Refuse</button></div></div>';
  });

  h += '<h2>THE FAMILIES</h2>';
  G.fams.forEach(f => {
    if (!f || f.isPlayer || !f.alive) return;
    const share = Math.round(100 * G.racketCount(f.id) / G.rackets.length);
    const war = G.atWarWith(f.id);
    const truce = G.truceBetween(1, f.id);
    h += '<div class="card fam" style="--c:' + f.color + '"><div class="row"><b>' + f.name + '</b><span class="share">' + share + '%</span></div>';
    h += '<div class="sub">' + f.don + ' · ' + G.racketCount(f.id) + ' rackets · ' + f.soldiers + ' soldiers' + (war ? ' · <b style="color:#c45b4a">AT WAR</b>' : '') + (truce ? ' · truce' : '') + '</div>';
    h += '<div class="bar"><i style="width:' + share + '%;background:' + f.color + '"></i></div>';
    h += '<div class="btns"><button data-act="truce" data-f="' + f.id + '"' + (truce ? ' disabled' : '') + '>Truce</button>';
    h += '<button data-act="heist" data-f="' + f.id + '"' + (G.hasSpec(1, 'safecracker') ? '' : ' disabled') + '>Heist</button>';
    h += '<button data-act="hitlist" data-f="' + f.id + '">Order a hit…</button></div>';
    if (f._open) {
      G.crew(f.id).forEach(m => {
        const cost = m.role === 'don' ? 2500 : (m.role === 'underboss' || m.role === 'consigliere') ? 1400 : 700;
        h += '<div class="sub" style="margin-top:4px">' + G.SPECS[m.spec].icon + ' ' + m.name + ' · ' + RANKS[m.role] + ' <button data-act="hit" data-m="' + m.id + '" style="margin-left:6px">$' + cost.toLocaleString() + '</button></div>';
      });
    }
    h += '</div>';
  });

  h += '<h2>CRIME RINGS</h2><div class="muted">Own every racket of one kind.</div>';
  const rings = G.ringHeld(1);
  Object.keys(G.RINGS).forEach(k => {
    const rg = G.RINGS[k];
    h += '<div class="ring ' + (rings[k] ? '' : 'off') + '"><span class="ic">' + G.RACKETS[rg.need].icon + '</span><span><b>' + rg.name + '</b> ' + (rings[k] ? '— held' : '— ' + G.held(1, rg.need) + '/' + G.totalOf(rg.need)) + '<br><span class="muted">' + rg.desc + '</span></span></div>';
  });
  $('right').innerHTML = h;
}

function newsPanel() {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  $('dateline').textContent = 'LATE CITY EDITION · ' + months[(G.week - 1) % 12] + ' ' + (1955 + Math.floor((G.week - 1) / 52)) + ' · WEEK ' + G.week;
  $('newsList').innerHTML = G.log.slice(0, 40).map(l =>
    '<div class="entry ' + l.kind + '"><span class="wk">W' + l.week + '</span>' + l.text + '</div>').join('');
}

function topBar() {
  $('sWeek').textContent = G.week;
  $('sCash').textContent = '$' + G.cash.toLocaleString();
  const inc = G.income(1), up = G.upkeep(1);
  $('sIncome').innerHTML = (inc - up < 0 ? '−' : '+') + '$' + Math.abs(inc - up).toLocaleString() + '<small>/wk</small>';
  $('sSol').innerHTML = G.soldiers + '<small> / ' + G.cap(1) + '</small>';
  $('sHeat').textContent = Math.round(G.heat);
  $('heatbar').firstChild.style.width = G.heat + '%';
  $('sRank').textContent = RANKS[G.rank()];
  $('sMoves').textContent = G.actionsLeft;
  $('brandSub').textContent = G.playerName.toUpperCase() + ' FAMILY · 1955';
}

function refresh() {
  if (!G) return;
  topBar(); leftPanel(); rightPanel(); newsPanel(); draw();
  if (G.phase === 'over') endScreen();
}

/* ---------- input ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || !G) return;
  const a = b.dataset.act;
  if (a === 'promote') act(() => G.promote());
  else if (a === 'recruit') act(() => G.recruit(+b.dataset.i));
  else if (a === 'bribe') act(() => G.bribe());
  else if (a === 'truce') act(() => G.requestTruce(+b.dataset.f));
  else if (a === 'heist') act(() => G.heist(+b.dataset.f));
  else if (a === 'hit') act(() => G.hit(+b.dataset.m));
  else if (a === 'offer') act(() => G.acceptOffer(+b.dataset.i, b.dataset.y === '1'));
  else if (a === 'hitlist') { const f = G.fam(+b.dataset.f); f._open = !f._open; refresh(); }
  else if (a === 'buildmode') {
    mode = (mode && mode.type === b.dataset.t) ? null : { kind: 'build', type: b.dataset.t };
    refresh();
  }
});

cvs.addEventListener('mousemove', e => {
  if (!G) return;
  const rect = cvs.getBoundingClientRect();
  if (drag.on) {
    cam.x += e.clientX - drag.x; cam.y += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; draw(); return;
  }
  const r = racketAt(e.clientX - rect.left, e.clientY - rect.top);
  if (r !== hover) { hover = r; draw(); }
  const tip = $('tooltip');
  if (!r) { tip.style.display = 'none'; return; }
  const info = G.RACKETS[r.type];
  const owner = r.owner ? G.fam(r.owner).name : 'neutral';
  let extra = '';
  if (r.torchedUntil > G.week) extra = '<br>Burned out for ' + (r.torchedUntil - G.week) + ' more weeks.';
  else if (r.owner !== 1) extra = '<br>Costs ' + G.attackCost(r) + ' soldiers to take.' + (G.canReach(r.district) || (r.owner && G.atWarWith(r.owner)) ? '' : '<br>Too far — expand closer first.');
  else extra = '<br>Pays $' + Math.round(info.base * (G.ringHeld(1).income ? 1.25 : 1) * (G.hasSpec(1, 'earner') ? 1.15 : 1)) + '/week.';
  const ops = [];
  if (r.owner && r.owner !== 1 && G.hasSpec(1, 'arsonist')) ops.push('F: firebomb ($600)');
  if (r.owner && r.owner !== 1 && G.hasSpec(1, 'enforcer')) ops.push('I: intimidate');
  tip.innerHTML = '<b>' + info.icon + ' ' + info.name + '</b><br>' + E.DID[r.district].name + ' · ' + owner + extra + (ops.length ? '<br>' + ops.join(' · ') : '');
  tip.style.display = 'block';
  tip.style.left = Math.min(e.clientX - rect.left + 14, cvs.width - 270) + 'px';
  tip.style.top = Math.min(e.clientY - rect.top + 14, cvs.height - 90) + 'px';
});
cvs.addEventListener('mouseleave', () => { hover = null; $('tooltip').style.display = 'none'; draw(); });

const drag = { on: false, x: 0, y: 0, moved: false };
cvs.addEventListener('mousedown', e => { drag.on = true; drag.moved = false; drag.x = e.clientX; drag.y = e.clientY; });
window.addEventListener('mouseup', e => {
  if (!drag.on) return; drag.on = false;
  if (drag.moved || !G) return;
  const rect = cvs.getBoundingClientRect();
  const r = racketAt(e.clientX - rect.left, e.clientY - rect.top);
  if (mode && mode.kind === 'build') {
    if (r && G.presence(1, r.district)) act(() => G.build(mode.type, r.district));
    else if (r) toast('You need a racket in ' + E.DID[r.district].name + ' first.');
    mode = null; refresh();
    return;
  }
  if (r && r.owner !== 1 && r.torchedUntil <= G.week) act(() => G.take(r.id));
});
window.addEventListener('mousemove', () => { if (drag.on) drag.moved = true; });
cvs.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = cvs.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const w = world(px, py);
  cam.z = Math.max(1.2, Math.min(14, cam.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
  cam.x = px - w.x * cam.z; cam.y = py - w.y * cam.z;
  draw();
}, { passive: false });

window.addEventListener('keydown', e => {
  if (!G || e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { mode = null; refresh(); }
  else if (e.key === 'Enter') endWeek();
  else if ((e.key === 'f' || e.key === 'F') && hover && hover.owner && hover.owner !== 1) act(() => G.firebomb(hover.id));
  else if ((e.key === 'i' || e.key === 'I') && hover && hover.owner && hover.owner !== 1) act(() => G.intimidate(hover.id));
});

function endWeek() {
  if (!G || G.phase === 'over') return;
  G.endWeek();
  mode = null;
  refresh();
}
$('bEnd').addEventListener('click', endWeek);

/* ---------- start / end ---------- */
let chosen = COLORS[0], diff = 'capo';
function startScreen() {
  const sw = $('swatches');
  sw.innerHTML = COLORS.map(c => '<i data-c="' + c + '" style="background:' + c + '"' + (c === chosen ? ' class="on"' : '') + '></i>').join('');
  sw.onclick = e => { const i = e.target.closest('i'); if (!i) return; chosen = i.dataset.c; startScreen(); };
  $('diffSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; diff = b.dataset.d; [...$('diffSeg').children].forEach(x => x.classList.toggle('on', x === b)); };
}
$('bStart').addEventListener('click', () => {
  const seed = Date.now() % 1e9;
  const mapRackets = buildBackdrop(seed);
  G = E.createGame({
    seed, difficulty: diff, mapRackets,
    playerName: $('inName').value.trim() || 'Russo',
    firstName: $('inFirst').value.trim() || 'Sonny',
    playerColor: chosen,
  });
  $('overlay').style.display = 'none';
  fit();
  const home = E.DID[G.startDistrict];
  const p = screen(home.x, home.y);
  cam.z = 5;
  cam.x = cvs.width / 2 - home.x * cam.z;
  cam.y = cvs.height / 2 - home.y * cam.z;
  refresh();
});
window.addEventListener('resize', () => { if (G) { fit(); draw(); } });

function endScreen() {
  const win = G.result === 'win';
  $('overlay').style.display = 'flex';
  $('overlay').innerHTML = '<div class="box" id="endbox"><h1>' + (win ? 'THE CITY IS YOURS' : 'YOUR LUCK RAN OUT') + '</h1>'
    + '<p class="how">' + (win
      ? 'Don ' + G.youPerson().first + ' ' + G.playerName + ' took ' + G.week + ' weeks to own New York.'
      : 'The ' + G.playerName + ' crew is finished. Week ' + G.week + '.') + '</p>'
    + '<p class="how">Rackets held: ' + G.racketCount(1) + ' of ' + G.rackets.length + '<br>Fights won: ' + G.stats.fightsWon + ' of ' + G.stats.fights + '<br>Earned: $' + G.stats.earned.toLocaleString() + '</p>'
    + '<button class="go" onclick="location.reload()">PLAY AGAIN</button></div>';
}
$('bHelp').addEventListener('click', () => toast('Click a racket to take it. Drag to pan, scroll to zoom. F firebombs, I intimidates, Enter ends the week.'));

startScreen();
})();

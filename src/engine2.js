/* Omertà — The Climb. Turn-based crime empire, 1955.
   Empire of Sin city management + Godfather 2 family tree & recruitment.
   No DOM; runs in the browser and in Node. */
(function (root) {
'use strict';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuffle = (rng, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- districts & connections (hand-authored geography) ---------- */
const DIST = [
  { id: 'paterson', name: 'Paterson', x: 30, y: 14, region: 'jersey' },
  { id: 'newark', name: 'Newark', x: 24, y: 60, region: 'jersey' },
  { id: 'hoboken', name: 'Hoboken', x: 60, y: 36, region: 'jersey' },
  { id: 'jerseycity', name: 'Jersey City', x: 50, y: 74, region: 'jersey' },
  { id: 'bayonne', name: 'Bayonne', x: 38, y: 97, region: 'jersey' },
  { id: 'harlem', name: 'Harlem', x: 81, y: 15, region: 'manhattan' },
  { id: 'midtown', name: 'Midtown', x: 77, y: 40, region: 'manhattan' },
  { id: 'hellskitchen', name: "Hell's Kitchen", x: 71, y: 56, region: 'manhattan' },
  { id: 'littleitaly', name: 'Little Italy', x: 69, y: 70, region: 'manhattan' },
  { id: 'wallstreet', name: 'Wall Street', x: 66, y: 81, region: 'manhattan' },
  { id: 'southbronx', name: 'South Bronx', x: 100, y: 15, region: 'bronx' },
  { id: 'fordham', name: 'Fordham', x: 118, y: 9, region: 'bronx' },
  { id: 'pelham', name: 'Pelham', x: 135, y: 8, region: 'bronx' },
  { id: 'astoria', name: 'Astoria', x: 95, y: 37, region: 'queens' },
  { id: 'longislandcity', name: 'Long Island City', x: 90, y: 55, region: 'queens' },
  { id: 'flushing', name: 'Flushing', x: 132, y: 42, region: 'queens' },
  { id: 'jamaica', name: 'Jamaica', x: 145, y: 60, region: 'queens' },
  { id: 'bayside', name: 'Bayside', x: 160, y: 46, region: 'queens' },
  { id: 'williamsburg', name: 'Williamsburg', x: 95, y: 78, region: 'brooklyn' },
  { id: 'redhook', name: 'Red Hook Docks', x: 81, y: 92, region: 'brooklyn' },
  { id: 'flatbush', name: 'Flatbush', x: 114, y: 92, region: 'brooklyn' },
  { id: 'brownsville', name: 'Brownsville', x: 136, y: 87, region: 'brooklyn' },
  { id: 'bensonhurst', name: 'Bensonhurst', x: 94, y: 106, region: 'brooklyn' },
  { id: 'coney', name: 'Coney Island', x: 118, y: 110, region: 'brooklyn' },
  { id: 'staten', name: 'Staten Island', x: 52, y: 124, region: 'staten' },
  { id: 'havana', name: 'Old Havana', x: 180, y: 122, region: 'havana' },
  { id: 'vedado', name: 'Vedado', x: 198, y: 124, region: 'havana' },
  { id: 'tropicana', name: 'Tropicana', x: 210, y: 130, region: 'havana' },
];
const DID = {}; DIST.forEach((d, i) => { d.i = i; DID[d.id] = d; });

const EDGES = [
  ['paterson', 'hoboken'], ['paterson', 'newark'], ['hoboken', 'newark'], ['hoboken', 'jerseycity'],
  ['newark', 'jerseycity'], ['jerseycity', 'bayonne'],
  ['harlem', 'midtown'], ['midtown', 'hellskitchen'], ['hellskitchen', 'littleitaly'], ['littleitaly', 'wallstreet'],
  ['harlem', 'southbronx'], ['southbronx', 'fordham'], ['fordham', 'pelham'],
  ['midtown', 'astoria'], ['astoria', 'longislandcity'], ['astoria', 'flushing'], ['flushing', 'bayside'],
  ['flushing', 'jamaica'], ['longislandcity', 'williamsburg'], ['longislandcity', 'jamaica'],
  ['hellskitchen', 'hoboken'], ['littleitaly', 'jerseycity'], ['wallstreet', 'redhook'],
  ['williamsburg', 'redhook'], ['williamsburg', 'flatbush'], ['flatbush', 'brownsville'],
  ['flatbush', 'bensonhurst'], ['brownsville', 'jamaica'], ['brownsville', 'coney'],
  ['bensonhurst', 'coney'], ['bensonhurst', 'redhook'],
  ['bayonne', 'staten'], ['bensonhurst', 'staten'],
  ['havana', 'vedado'], ['vedado', 'tropicana'],
];
const adj = {}; DIST.forEach(d => adj[d.id] = []);
EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

/* ---------- data tables ---------- */
const RACKETS = {
  numbers: { name: 'Numbers Racket', icon: '\u{1F3B2}', base: 90, risk: 1, ring: 'income' },
  loan: { name: 'Loan Sharking', icon: '\u{1F4B5}', base: 130, risk: 1, ring: 'build' },
  club: { name: 'Nightclub', icon: '\u{1F378}', base: 170, risk: 1, ring: 'recruit' },
  union: { name: 'Dock Union', icon: '\u{2693}', base: 150, risk: 2, ring: 'muscle' },
  casino: { name: 'Casino', icon: '\u{1F3B0}', base: 340, risk: 2, ring: 'skim' },
  narco: { name: 'Narcotics', icon: '\u{1F48A}', base: 420, risk: 3, ring: 'fear' },
};
const RACKET_ORDER = ['numbers', 'loan', 'club', 'union', 'casino', 'narco'];

const RINGS = {
  income: { name: 'Numbers Ring', need: 'numbers', desc: '+25% income from every racket' },
  build: { name: 'Loan Ring', need: 'loan', desc: 'Buildings cost 30% less' },
  recruit: { name: 'Nightlife Ring', need: 'club', desc: 'New faces appear twice as often' },
  muscle: { name: 'Union Ring', need: 'union', desc: 'Your soldiers fight 25% harder' },
  skim: { name: 'Casino Ring', need: 'casino', desc: '+$250 skimmed off the top every week' },
  fear: { name: 'Fear Ring', need: 'narco', desc: 'Rivals are much slower to attack you' },
};

const BUILDINGS = {
  safehouse: { name: 'Safehouse', icon: '\u{1F3E0}', cost: 1200, desc: '+8 soldiers on the street' },
  front: { name: 'Front Business', icon: '\u{1F3EA}', cost: 1500, desc: '+$120 a week, looks legitimate' },
  guards: { name: 'Guard Post', icon: '\u{1F6E1}', cost: 900, desc: 'This district is much harder to take' },
  still: { name: 'Speakeasy Still', icon: '\u{1F943}', cost: 1100, desc: '+$80 a week, +1 heat' },
};
const BUILD_ORDER = ['safehouse', 'front', 'guards', 'still'];

const ROLES = {
  don: { name: 'Don', rank: 5, slots: 1 },
  underboss: { name: 'Underboss', rank: 4, slots: 1 },
  consigliere: { name: 'Consigliere', rank: 4, slots: 1 },
  capo: { name: 'Capo', rank: 3, slots: 3 },
  soldier: { name: 'Soldier', rank: 2, slots: 99 },
};

const SPECS = {
  bruiser: { name: 'Bruiser', icon: '\u{1F4AA}', desc: 'Hits harder in a fight. Attacks cost fewer soldiers.' },
  arsonist: { name: 'Arsonist', icon: '\u{1F525}', desc: 'Unlocks Firebomb: burn a rival racket to the ground.' },
  safecracker: { name: 'Safecracker', icon: '\u{1F4BC}', desc: 'Unlocks Heist: crack a rival counting room.' },
  medic: { name: 'Medic', icon: '\u{1F489}', desc: 'Wounded soldiers recover twice as fast.' },
  diplomat: { name: 'Diplomat', icon: '\u{1F91D}', desc: 'Truces last longer. Rivals trust you more.' },
  earner: { name: 'Earner', icon: '\u{1F4B0}', desc: 'Every racket you hold pays 15% more.' },
  enforcer: { name: 'Enforcer', icon: '\u{1F5E1}', desc: 'Unlocks Intimidate: scare a rival off a racket, no fight.' },
  fixer: { name: 'Fixer', icon: '\u{1F4DE}', desc: 'Bribes cost half. Raids end a week sooner.' },
};
const SPEC_ORDER = Object.keys(SPECS);

const FIRST = ['Vito', 'Sal', 'Carmine', 'Rocco', 'Angelo', 'Tommy', 'Frankie', 'Louie', 'Nicky', 'Paulie', 'Joey', 'Sonny', 'Carlo', 'Mickey', 'Tony', 'Gino', 'Al', 'Benny', 'Dominic', 'Enzo', 'Rico', 'Marco', 'Luca', 'Silvio', 'Ralphie', 'Johnny', 'Pete', 'Vinny', 'Eddie', 'Salvatore', 'Giuseppe', 'Arturo', 'Emilio', 'Rafael', 'Hector', 'Pablo', 'Manuel'];
const LAST = ['Moretti', 'Gallo', 'Costa', 'Ricci', 'Bruno', 'De Luca', 'Romano', 'Vitale', 'Conti', 'Rinaldi', 'Esposito', 'Ferrara', 'Marino', 'Greco', 'Lombardi', 'Russo', 'Caruso', 'Pellegrino', 'Mancini', 'Barone', 'Santangelo', 'Rizzo', 'Carbone', 'Delgado', 'Suarez', 'Vega', 'Herrera', 'Navarro', 'Castillo', 'Morales'];
const NICKS = ['the Bull', 'Big Paulie', 'Fingers', 'the Barber', 'Stitches', 'Sparky', 'the Ace', 'Little Nicky', 'the Mouth', 'Two-Times', 'the Hammer', 'Smiles', 'the Priest', 'No-Nose', 'Lucky', 'the Whale', 'Icepick', 'the Count', 'Doc', 'the Kid', 'Bananas', 'the Blade', 'Champagne', 'the Architect', 'Knuckles'];

const FAMILIES = [
  { id: 1, name: 'Russo', don: 'Vincenzo Russo', color: '#b4332a', region: null, isPlayer: true },
  { id: 2, name: 'Santangelo', don: 'Pietro Santangelo', color: '#6a3fa0', region: 'manhattan' },
  { id: 3, name: 'Rizzo', don: 'Vincenzo Rizzo', color: '#2f6fbf', region: 'jersey' },
  { id: 4, name: 'Carbone', don: 'Rocco Carbone', color: '#c47a12', region: 'brooklyn' },
  { id: 5, name: 'Vitale', don: 'Carlo Vitale', color: '#2e8a5b', region: 'queens' },
  { id: 6, name: 'Barone', don: 'Emilio Barone', color: '#8a3030', region: 'bronx' },
  { id: 7, name: 'Delgado', don: 'Ram\u00f3n Delgado', color: '#c45a1a', region: 'havana' },
];

const BOSS_SPEC = { 2: 'diplomat', 3: 'bruiser', 4: 'earner', 5: 'enforcer', 6: 'arsonist', 7: 'safecracker' };
const BOSS_STYLE = { 2: 'cautious', 3: 'aggressive', 4: 'greedy', 5: 'aggressive', 6: 'vindictive', 7: 'cautious' };

const DIFF = {
  soldato: { aiCash: 0.85, aiSoldiers: 0.8, aggro: 0.7, heatMult: 0.7, name: 'Soldato' },
  capo: { aiCash: 1, aiSoldiers: 1, aggro: 1, heatMult: 1, name: 'Capo' },
  don: { aiCash: 1.3, aiSoldiers: 1.35, aggro: 1.5, heatMult: 1.25, name: 'Don' },
};

/* ---------- combat resolution ---------- */
function fight(att, def, opts) {
  opts = opts || {};
  let a = att.soldiers * (1 + 0.12 * (att.bruisers || 0)) * (att.muscle || 1);
  let d = def.soldiers * (def.guarded ? 1.6 : 1) * (opts.bridge ? 1.35 : 1);
  if (a <= 0) return { win: false, attLoss: 0, defLoss: 0, margin: 0 };
  const ratio = a / Math.max(1, d);
  const win = ratio > 1.05;
  const attLoss = Math.round(att.soldiers * clamp(0.18 + 0.22 / Math.max(0.5, ratio), 0.12, 0.62));
  const defLoss = Math.round(def.soldiers * clamp(0.25 * ratio, 0.1, 0.85));
  return { win, attLoss, defLoss, margin: ratio };
}

/* ---------- the game ---------- */
function createGame(opts) {
  opts = opts || {};
  const rng = mulberry32((opts.seed | 0) || (Date.now() % 1e9));
  const diff = DIFF[opts.difficulty] || DIFF.capo;
  const G = {
    rng, diff, difficulty: opts.difficulty || 'capo',
    week: 1, phase: 'play', result: null, actionsLeft: 2,
    playerName: opts.playerName || 'Russo',
    heat: 0, cash: 600, soldiers: 14, wounded: 0,
    precinct: 0, // bribed-quiet weeks remaining
    log: [], offers: [], news: [],
    rackets: [], buildings: [],
    fams: [], made: [], nextId: 1,
    truce: {}, // famId -> week it expires
    known: {}, // famId -> how much you've learned
    stats: { earned: 0, spent: 0, taken: 0, lost: 0, fights: 0, fightsWon: 0 },
  };

  /* --- rackets from the map generator --- */
  const mapRackets = opts.mapRackets || [];
  mapRackets.forEach(r => {
    const d = DIST.find(dd => dd.name === r.d);
    if (!d) return;
    G.rackets.push({ id: G.rackets.length, type: r.t, district: d.id, x: r.x, y: r.y, owner: 0, guarded: false, torchedUntil: 0 });
  });

  /* --- families & their starting crews --- */
  function person(famId, role, spec, fixed) {
    const p = {
      id: G.nextId++, fam: famId, role, spec,
      first: fixed ? fixed.first : pick(rng, FIRST),
      last: fixed ? fixed.last : pick(rng, LAST),
      nick: fixed ? fixed.nick : pick(rng, NICKS),
      loyalty: fixed ? 100 : 55 + Math.floor(rng() * 40),
      skill: 40 + Math.floor(rng() * 50),
      weeks: 0,
    };
    p.name = p.first + ' "' + p.nick + '" ' + p.last;
    return p;
  }
  FAMILIES.forEach(def => {
    const f = {
      id: def.id, name: def.id === 1 ? G.playerName : def.name,
      don: def.id === 1 ? ('Don ' + G.playerName) : def.don,
      color: opts.playerColor && def.id === 1 ? opts.playerColor : def.color,
      region: def.region, isPlayer: !!def.isPlayer, alive: true,
      cash: Math.round((def.isPlayer ? 0 : 4000 + Math.floor(rng() * 2500)) * (def.isPlayer ? 1 : diff.aiCash)),
      soldiers: Math.round((def.isPlayer ? 0 : 26 + Math.floor(rng() * 14)) * (def.isPlayer ? 1 : diff.aiSoldiers)),
      heat: 0, wounded: 0, precinct: 0,
      style: BOSS_STYLE[def.id] || 'cautious',
      home: null, memory: {}, // famId -> grudge weeks
    };
    G.fams[def.id] = f;
    if (!def.isPlayer) {
      const dn = def.don.replace(/^Don |^Se\u00f1or /, '').split(' ');
      G.made.push(person(def.id, 'don', BOSS_SPEC[def.id], { first: dn[0], last: dn[dn.length - 1], nick: 'the Don' }));
      G.made.push(person(def.id, 'underboss', pick(rng, SPEC_ORDER)));
      G.made.push(person(def.id, 'consigliere', pick(rng, ['diplomat', 'fixer', 'earner'])));
      for (let i = 0; i < 2; i++) G.made.push(person(def.id, 'capo', pick(rng, SPEC_ORDER)));
      for (let i = 0; i < 3; i++) G.made.push(person(def.id, 'soldier', pick(rng, SPEC_ORDER)));
    }
  });

  /* player starts as one soldier with a crew of three, answering to a boss */
  const you = person(1, 'soldier', 'earner', { first: opts.firstName || 'Sonny', last: G.playerName, nick: opts.nick || 'the Kid' });
  you.loyalty = 100; you.skill = 62;
  G.you = you.id;
  G.made.push(you);
  const boss = person(1, 'capo', 'enforcer', { first: 'Sal', last: 'Greco', nick: 'the Whale' });
  boss.loyalty = 70;
  G.boss = boss.id;
  G.made.push(boss);
  G.made.push(person(1, 'soldier', pick(rng, ['bruiser', 'safecracker', 'medic']), null));
  G.made.push(person(1, 'soldier', pick(rng, ['arsonist', 'diplomat', 'fixer']), null));

  /* --- who owns what at the start --- */
  const byRegion = {};
  DIST.forEach(d => { (byRegion[d.region] = byRegion[d.region] || []).push(d.id); });
  // each AI family owns its home district outright and has a footprint in its region
  G.fams.forEach(f => {
    if (!f || f.isPlayer) return;
    const regionDists = byRegion[f.region] || [];
    f.home = regionDists[0];
    const mine = G.rackets.filter(r => regionDists.includes(r.district));
    shuffle(rng, mine).slice(0, Math.ceil(mine.length * 0.8)).forEach(r => r.owner = f.id);
    // a guard post on the home district
    G.buildings.push({ id: G.buildings.length, type: 'guards', district: f.home, owner: f.id });
    G.buildings.push({ id: G.buildings.length, type: 'front', district: f.home, owner: f.id });
  });
  // a few neutral buildings sprinkled in
  shuffle(rng, DIST.filter(d => d.region !== 'havana')).slice(0, 4).forEach(d => {
    if (!G.buildings.some(b => b.district === d.id && b.type === 'safehouse'))
      G.buildings.push({ id: G.buildings.length, type: 'safehouse', district: d.id, owner: 0 });
  });

  /* the crew's own small corner: one racket next door to nothing, in Little Italy */
  // the player's starter neighbourhood: a district with neutral rackets, plus its
  // neighbours stay neutral so week one has somewhere to expand
  const candidates = DIST.filter(d => d.region !== 'havana' && G.rackets.some(r => r.district === d.id && r.owner === 0));
  const home = pick(rng, candidates);
  G.startDistrict = home.id;
  const reserved = new Set([home.id, ...(adj[home.id] || [])]);
  G.rackets.forEach(r => { if (r.owner && reserved.has(r.district)) r.owner = 0; });
  const first = G.rackets.find(r => r.district === home.id);
  first.owner = 1;

  /* ---------- queries ---------- */
  const fam = id => G.fams[id];
  const crew = id => G.made.filter(m => m.fam === id && !m.dead);
  const hasSpec = (id, s) => crew(id).some(m => m.spec === s);
  const specCount = (id, s) => crew(id).filter(m => m.spec === s).length;
  const racketCount = id => G.rackets.filter(r => r.owner === id && r.torchedUntil <= G.week).length;
  const held = (id, type) => G.rackets.filter(r => r.owner === id && r.type === type && r.torchedUntil <= G.week).length;
  const totalOf = type => G.rackets.filter(r => r.type === type).length;
  const ringHeld = id => {
    const out = {};
    for (const k in RINGS) out[k] = totalOf(RINGS[k].need) > 0 && held(id, RINGS[k].need) === totalOf(RINGS[k].need);
    return out;
  };
  const districtsOf = id => [...new Set(G.rackets.filter(r => r.owner === id).map(r => r.district))];
  const presence = (id, distId) => G.rackets.some(r => r.owner === id && r.district === distId);
  const guarded = distId => G.buildings.some(b => b.type === 'guards' && b.district === distId && b.owner && fam(b.owner).alive);
  const buildingCount = (id, type) => G.buildings.filter(b => b.owner === id && b.type === type).length;
  const atWar = id => G.fams.some(f => f && f.alive && !f.isPlayer && f.id !== id && warBetween(id, f.id));

  function reachable(id) {
    const mine = new Set(districtsOf(id));
    const out = new Set(mine);
    mine.forEach(d => (adj[d] || []).forEach(n => out.add(n)));
    return out;
  }
  function warBetween(a, b) { return !truceBetween(a, b) && (fam(a).memory[b] || 0) > 0 && (fam(b).memory[a] || 0) > 0 ? true : (fam(a).memory[b] > 0 || fam(b).memory[a] > 0); }
  function truceBetween(a, b) { return (G.truce[a + '-' + b] || 0) > G.week || (G.truce[b + '-' + a] || 0) > G.week; }
  function grudge(a, b, weeks) { const f = fam(a); f.memory[b] = Math.max(f.memory[b] || 0, weeks); }

  function income(id) {
    const f = fam(id);
    const rings = ringHeld(id);
    let money = 0;
    G.rackets.forEach(r => {
      if (r.owner !== id || r.torchedUntil > G.week) return;
      let v = Math.round(RACKETS[r.type].base * 0.6);
      if (rings.income) v *= 1.25;
      if (hasSpec(id, 'earner')) v *= 1.15;
      money += v;
    });
    money += buildingCount(id, 'front') * 120;
    money += buildingCount(id, 'still') * 80;
    if (rings.skim) money += 250;
    const heat = f.isPlayer ? G.heat : f.heat;
    if (heat >= 50) money *= 0.75;
    if (heat >= 75) money *= 0.8;
    return Math.round(money);
  }
  function upkeep(id) {
    const f = fam(id);
    const n = f.isPlayer ? G.soldiers : f.soldiers;
    return n * 4 + crew(id).length * 25;
  }
  function cap(id) { return 10 + racketCount(id) * 3 + buildingCount(id, 'safehouse') * 8 + crew(id).length * 2; }

  function heatOf(id) { return fam(id).isPlayer ? G.heat : fam(id).heat; }
  function addHeat(id, n) {
    if (fam(id).isPlayer) G.heat = clamp(G.heat + n, 0, 100);
    else fam(id).heat = clamp(fam(id).heat + n, 0, 100);
  }
  function cashOf(id) { return fam(id).isPlayer ? G.cash : fam(id).cash; }
  function addCash(id, n) { if (fam(id).isPlayer) G.cash += n; else fam(id).cash += n; }
  function soldiersOf(id) { return fam(id).isPlayer ? G.soldiers : fam(id).soldiers; }
  function addSoldiers(id, n) {
    if (fam(id).isPlayer) G.soldiers = Math.max(0, G.soldiers + n);
    else fam(id).soldiers = Math.max(0, fam(id).soldiers + n);
  }

  /* ---------- the climb ---------- */
  const RANK_UP = [
    { from: 'soldier', to: 'capo', need: { rackets: 4, cash: 4000 }, title: 'Capo' },
    { from: 'capo', to: 'underboss', need: { rackets: 8, districts: 4, cash: 12000 }, title: 'Underboss' },
    { from: 'underboss', to: 'don', need: { rackets: 22, districts: 10, respect: 130 }, title: 'Don' },
  ];
  function youPerson() { return G.made.find(m => m.id === G.you); }
  function rank() { return youPerson().role; }
  function respect() {
    let r = 0;
    crew(1).forEach(m => { if (m.id !== G.you) r += m.loyalty / 5; });
    r += racketCount(1) * 3;
    r += G.stats.fightsWon * 4;
    return Math.round(r);
  }
  function nextRank() { return RANK_UP.find(s => s.from === rank()) || null; }
  function canPromote() {
    const s = nextRank();
    if (!s) return null;
    const need = s.need;
    if (need.rackets && racketCount(1) < need.rackets) return 'Control ' + need.rackets + ' rackets (you have ' + racketCount(1) + ')';
    if (need.districts && districtsOf(1).length < need.districts) return 'Hold rackets in ' + need.districts + ' districts (you have ' + districtsOf(1).length + ')';
    if (need.cash && G.cash < need.cash) return 'Bankroll of $' + need.cash.toLocaleString() + ' (you have $' + G.cash.toLocaleString() + ')';
    if (need.respect && respect() < need.respect) return 'Respect of ' + need.respect + ' (you have ' + respect() + ')';
    return true;
  }
  function promote() {
    const ok = canPromote();
    if (ok !== true) return ok || "You're already the Don.";
    const s = nextRank();
    const you = youPerson();
    you.role = s.to;
    if (s.to === 'don') {
      // the old boss steps aside — or doesn't
      const b = G.made.find(m => m.id === G.boss);
      if (b && !b.dead) {
        if (b.loyalty < 45) {
          b.role = 'soldier'; b.loyalty = 10;
          log('Sal Greco refuses to kiss the ring. He walks out with half the crew\'s cash.', 'bad', true);
          G.cash = Math.floor(G.cash / 2);
        } else {
          b.role = 'consigliere';
          log('Sal Greco kisses your ring and stays on as Consigliere. The ' + G.playerName + ' family is born.', 'good', true);
        }
      }
      G.fams[1].don = 'Don ' + you.first + ' ' + G.playerName;
      news('THE NEW DON', you.name + ' takes the chair. The ' + G.playerName + ' family is now a name that matters in this city.');
    } else {
      log('You make ' + s.title + '. The old neighbourhood starts calling you by it.', 'good', true);
      news(s.title.toUpperCase(), you.name + ' is now a ' + s.title + ' in the ' + G.playerName + ' crew.');
    }
    return true;
  }

  /* ---------- recruiting (Godfather 2 style: they come to you) ---------- */
  G.candidates = [];
  function rollCandidates() {
    const rings = ringHeld(1);
    const n = (rings.recruit ? 2 : 1) + (rank() === 'don' ? 1 : 0);
    G.candidates = [];
    const have = {};
    crew(1).forEach(m => have[m.spec] = (have[m.spec] || 0) + 1);
    for (let i = 0; i < n; i++) {
      // bias toward specialties the crew lacks
      const pool = SPEC_ORDER.filter(s => (have[s] || 0) < 2);
      const spec = pool.length && rng() < 0.7 ? pick(rng, pool) : pick(rng, SPEC_ORDER);
      const c = person(0, 'soldier', spec);
      c.ask = Math.round(700 * (1 + 0.5 * crew(1).length) * (0.8 + c.skill / 250));
      c.weeks = 3;
      G.candidates.push(c);
    }
  }
  function recruitCost() { return null; }
  function recruit(idx) {
    const c = G.candidates[idx];
    if (!c) return 'Nobody there.';
    if (crew(1).length >= 10) return 'The table only seats ten.';
    if (G.cash < c.ask) return 'He wants $' + c.ask.toLocaleString() + ' to come over. You\'re short.';
    G.cash -= c.ask; G.stats.spent += c.ask;
    c.fam = 1; c.loyalty = 60 + Math.floor(rng() * 25); c.weeks = 0;
    G.made.push(c);
    G.candidates.splice(idx, 1);
    log(c.name + ' gets his button. ' + SPECS[c.spec].name + '.', 'good', true);
    return true;
  }

  /* ---------- building ---------- */
  function buildCost(type) {
    const n = buildingCount(1, type);
    let c = BUILDINGS[type].cost * (1 + 0.6 * n);
    if (ringHeld(1).build) c *= 0.7;
    if (hasSpec(1, 'fixer')) c *= 0.9;
    return Math.round(c);
  }
  function build(type, distId) {
    if (!BUILDINGS[type]) return 'Unknown.';
    if (!presence(1, distId)) return 'You need a racket in that district first.';
    if (G.buildings.some(b => b.owner === 1 && b.type === type && b.district === distId)) return 'You already have one there.';
    const c = buildCost(type);
    if (G.cash < c) return 'Costs $' + c.toLocaleString() + '.';
    G.cash -= c; G.stats.spent += c;
    G.buildings.push({ id: G.buildings.length, type, district: distId, owner: 1 });
    log('You open a ' + BUILDINGS[type].name + ' in ' + DID[distId].name + '.', 'good', true);
    return true;
  }

  /* ---------- taking rackets ---------- */
  function attackCost(r) {
    // what it takes to win, not the minimum to show up
    const defense = r.owner ? Math.max(6, Math.round(soldiersOf(r.owner) * 0.3)) : 2;
    let soldiers = Math.ceil(defense * 1.3);
    if (r.owner) soldiers += Math.floor(soldiersOf(r.owner) / 20);
    if (guarded(r.district) && r.owner && G.buildings.some(b => b.type === 'guards' && b.district === r.district && b.owner === r.owner)) soldiers += 6;
    if (hasSpec(1, 'bruiser')) soldiers = Math.max(3, soldiers - 2);
    return soldiers;
  }
  function canReach(distId) { return reachable(1).has(distId); }
  function atWarWith(id) { return (fam(id).memory[1] || 0) > 0; }

  function take(racketId, fightIt) {
    const r = G.rackets[racketId];
    if (!r) return 'No such racket.';
    if (r.owner === 1) return 'That one is already yours.';
    if (r.torchedUntil > G.week) return 'That place is still ashes.';
    if (r.secureUntil > G.week) return 'They just took it and the place is crawling with their soldiers. Give it a few weeks.';
    const revenge = r.owner && (fam(r.owner).memory[1] || 0) > 0;
    if (!canReach(r.district) && !revenge) return 'Too far. Take something closer first.';
    if (r.owner && truceBetween(1, r.owner)) return 'You have a truce with the ' + fam(r.owner).name + ' family.';
    const need = attackCost(r);
    if (G.soldiers < need) return 'You need ' + need + ' soldiers on the street. You have ' + G.soldiers + '.';
    if (G.actionsLeft <= 0) return 'Your crew is spent for the week. End the week to move again.';
    if (!r.owner) {
      G.soldiers -= Math.min(2, G.soldiers > 4 ? 1 : 0);
      r.owner = 1; G.stats.taken++;
      addHeat(1, RACKETS[r.type].risk);
      log('You muscle in on the ' + RACKETS[r.type].name + ' in ' + DID[r.district].name + '.', 'good', true);
      G.actionsLeft--;
      return true;
    }
    const res = fight(
      { soldiers: need, bruisers: specCount(1, 'bruiser'), muscle: ringHeld(1).muscle ? 1.25 : 1 },
      { soldiers: Math.max(6, Math.round(soldiersOf(r.owner) * 0.3)), guarded: G.buildings.some(b => b.type === 'guards' && b.district === r.district && b.owner === r.owner) });
    G.stats.fights++;
    if (fightIt) G.pendingFight = { kind: 'take', racketId, res, need };
    return applyTake(r, res, need);
  }
  function applyTake(r, res, need) {
    const owner = r.owner;
    addSoldiers(1, -Math.min(G.soldiers, res.attLoss));
    addSoldiers(owner, -res.defLoss);
    G.wounded += Math.round(res.attLoss * 0.4);
    if (res.win) {
      r.owner = 1; G.stats.taken++; G.stats.fightsWon++;
      addHeat(1, RACKETS[r.type].risk + 2);
      grudge(owner, 1, 8);
      log('The ' + RACKETS[r.type].name + ' in ' + DID[r.district].name + ' is yours. The ' + fam(owner).name + ' family lost ' + res.defLoss + ' soldiers.', 'good', true);
      if (racketCount(owner) === 0) eliminate(owner, 1);
    } else {
      addHeat(1, 3);
      grudge(owner, 1, 5);
      log('You were beaten back from ' + DID[r.district].name + '. ' + res.attLoss + ' of your soldiers are down.', 'bad', true);
    }
    G.actionsLeft--;
    checkEnd();
    return res.win ? true : 'Beaten back.';
  }

  /* ---------- operations ---------- */
  function firebomb(racketId) {
    if (!hasSpec(1, 'arsonist')) return 'You need an Arsonist in the crew.';
    const r = G.rackets[racketId];
    if (!r || r.owner === 0) return 'Nothing there to burn.';
    if (r.owner === 1) return "That's your own place.";
    if (truceBetween(1, r.owner)) return 'Not during a truce.';
    if (G.cash < 600) return 'Costs $600.';
    G.cash -= 600; G.stats.spent += 600;
    r.torchedUntil = G.week + 4;
    addHeat(1, 12);
    grudge(r.owner, 1, 10);
    log('The ' + RACKETS[r.type].name + ' in ' + DID[r.district].name + ' burns. The ' + fam(r.owner).name + ' family will not forget it.', 'warn', true);
    return true;
  }
  function heist(famId) {
    if (!hasSpec(1, 'safecracker')) return 'You need a Safecracker.';
    const f = fam(famId);
    if (!f || !f.alive || f.isPlayer) return 'No.';
    if (truceBetween(1, famId)) return 'Not during a truce.';
    if (G.cash < 300) return 'Costs $300 to set up.';
    G.cash -= 300;
    const rings = ringHeld(1);
    const chance = 0.45 + specCount(1, 'safecracker') * 0.12 + (hasSpec(1, 'fixer') ? 0.1 : 0);
    if (rng() < chance) {
      const haul = Math.round(f.cash * (0.18 + rng() * 0.2));
      f.cash -= haul; G.cash += haul; G.stats.earned += haul;
      addHeat(1, 8);
      grudge(famId, 1, 7);
      log('The counting room cracks. $' + haul.toLocaleString() + ' out of the ' + f.name + ' family.', 'good', true);
      return true;
    }
    addHeat(1, 10);
    grudge(famId, 1, 6);
    log('The heist on the ' + f.name + ' family goes wrong. Your man gets out, barely.', 'bad', true);
    return 'Blown.';
  }
  function hit(madeId) {
    const m = G.made.find(x => x.id === madeId);
    if (!m || m.dead) return 'Nobody to hit.';
    if (m.fam === 1) return "We don't hit our own.";
    if (truceBetween(1, m.fam)) return 'Not during a truce.';
    const cost = m.role === 'don' ? 2500 : m.role === 'underboss' || m.role === 'consigliere' ? 1400 : 700;
    if (G.cash < cost) return 'A job like that costs $' + cost.toLocaleString() + '.';
    G.cash -= cost; G.stats.spent += cost;
    const chance = m.role === 'don' ? 0.34 : m.role === 'soldier' ? 0.72 : 0.55;
    addHeat(1, m.role === 'don' ? 25 : 14);
    if (rng() < chance) {
      m.dead = true; m.deadWeek = G.week;
      grudge(m.fam, 1, m.role === 'don' ? 30 : 12);
      log(m.name + ' is found in the trunk of a Chrysler. The ' + fam(m.fam).name + ' family is in mourning.', 'warn', true);
      news('HIT', m.name + ' of the ' + fam(m.fam).name + ' family was killed this week.');
      if (m.role === 'don') {
        const heir = crew(m.fam).sort((a, b) => ROLES[b.role].rank - ROLES[a.role].rank)[0];
        if (heir) { heir.role = 'don'; fam(m.fam).don = heir.first + ' ' + heir.last; log(heir.name + ' takes the chair.', 'info', true); }
        else eliminate(m.fam, 1);
      }
      return true;
    }
    grudge(m.fam, 1, 9);
    log('The hitter missed ' + m.name + '. Now they know it was you.', 'bad', true);
    return 'Missed.';
  }
  function intimidate(racketId) {
    if (!hasSpec(1, 'enforcer')) return 'You need an Enforcer.';
    const r = G.rackets[racketId];
    if (!r || !r.owner || r.owner === 1) return 'Nobody to lean on.';
    if (truceBetween(1, r.owner)) return 'Not during a truce.';
    if (!canReach(r.district)) return 'Too far away to lean on.';
    const strength = soldiersOf(1) + crew(1).length * 4;
    const theirs = soldiersOf(r.owner) * 0.5 + 10;
    if (strength > theirs && rng() < 0.6) {
      const prev = r.owner;
      r.owner = 1; G.stats.taken++;
      addHeat(1, 4);
      grudge(prev, 1, 6);
      log('The ' + fam(prev).name + ' crew walks away from the ' + RACKETS[r.type].name + ' in ' + DID[r.district].name + '. No shots fired.', 'good', true);
      return true;
    }
    addHeat(1, 3);
    grudge(r.owner, 1, 4);
    log('They laughed at your man in ' + DID[r.district].name + '. It will have to be done the hard way.', 'bad', true);
    return 'Refused.';
  }
  function bribe() {
    let cost = Math.round(150 + G.heat * 18);
    if (hasSpec(1, 'fixer')) cost = Math.round(cost * 0.5);
    if (G.cash < cost) return 'The precinct wants $' + cost.toLocaleString() + '.';
    G.cash -= cost; G.stats.spent += cost;
    G.heat = Math.max(0, G.heat - 30);
    G.precinct = Math.max(G.precinct, 3);
    log('An envelope crosses a desk. The precinct looks the other way for a few weeks.', 'good', true);
    return true;
  }
  function truceWeeks() { return hasSpec(1, 'diplomat') ? 10 : 6; }
  function requestTruce(famId) {
    const f = fam(famId);
    if (!f || !f.alive) return 'No such family.';
    if (truceBetween(1, famId)) return 'You already have a truce.';
    const gr = f.memory[1] || 0;
    const chance = clamp(0.62 - gr * 0.05 + (hasSpec(1, 'diplomat') ? 0.15 : 0) - (f.style === 'vindictive' ? 0.2 : 0), 0.08, 0.85);
    if (rng() < chance) {
      G.truce['1-' + famId] = G.week + truceWeeks();
      f.memory[1] = Math.max(0, gr - 4);
      log('The ' + f.name + ' family agrees to a sit-down. Peace for ' + truceWeeks() + ' weeks.', 'good', true);
      return true;
    }
    log('Don ' + f.don.split(' ').slice(-1)[0] + ' sends your man back with nothing.', 'bad', true);
    return 'Refused.';
  }

  /* ---------- elimination & victory ---------- */
  function eliminate(id, by) {
    const f = fam(id);
    if (!f.alive) return;
    f.alive = false;
    G.rackets.forEach(r => { if (r.owner === id) r.owner = by && rng() < 0.6 ? by : 0; });
    G.buildings.forEach(b => { if (b.owner === id) b.owner = by || 0; });
    if (by) addCash(by, Math.round(f.cash * 0.5));
    crew(id).forEach(m => m.dead = true);
    const msg = 'The ' + f.name + ' family is finished.' + (by === 1 ? ' Their rackets fall to you.' : '');
    log(msg, by === 1 ? 'good' : 'info', true);
    news('A FAMILY FALLS', 'The ' + f.name + ' family has been wiped off the map of New York.');
    checkEnd();
  }
  function checkEnd() {
    if (G.phase === 'over') return;
    const you = youPerson();
    if (!you || you.dead) { G.phase = 'over'; G.result = 'dead'; return; }
    if (rank() === 'don') {
      const share = racketCount(1) / G.rackets.length;
      const rivals = G.fams.filter(f => f && f.alive && !f.isPlayer).length;
      // the biggest family in the city, and big enough to be called the boss of it
      const biggest = !G.fams.some(f => f && f.alive && !f.isPlayer && racketCount(f.id) > racketCount(1));
      if (rivals === 0 || (share >= 0.3 && biggest) || share >= 0.5) { G.phase = 'over'; G.result = 'win'; }
    }
  }

  /* ---------- the week ---------- */
  function endWeek() {
    if (G.phase === 'over') return;
    const events = [];
    // income & upkeep for everyone
    G.fams.forEach(f => {
      if (!f || !f.alive) return;
      const inc = income(f.id), up = upkeep(f.id);
      addCash(f.id, inc - up);
      if (f.isPlayer) { G.stats.earned += inc; G.stats.spent += up; }
      // soldiers recover and recruit toward cap
      const wounded = f.isPlayer ? G.wounded : f.wounded;
      const heal = Math.ceil(wounded * (hasSpec(f.id, 'medic') ? 0.6 : 0.3));
      if (f.isPlayer) { G.wounded = Math.max(0, G.wounded - heal); G.soldiers += heal; }
      else { f.wounded = Math.max(0, f.wounded - heal); f.soldiers += heal; }
      const room = cap(f.id) - soldiersOf(f.id);
      if (room > 0 && cashOf(f.id) > 200) {
        const hire = Math.min(room, 2 + Math.floor(rng() * 3));
        addSoldiers(f.id, hire);
        addCash(f.id, -hire * 40);
      }
      // heat decays; raids
      let h = heatOf(f.id);
      h = Math.max(0, h - (f.precinct > 0 ? 8 : 4));
      if (f.isPlayer) G.heat = h; else f.heat = h;
      if (f.precinct > 0) f.precinct--;
      if (f.isPlayer && G.precinct > 0) G.precinct--;
      if (h >= 80 && f.precinct <= 0 && rng() < 0.5) {
        const mine = G.rackets.filter(r => r.owner === f.id && r.torchedUntil <= G.week);
        if (mine.length) {
          const r = pick(rng, mine);
          r.torchedUntil = G.week + 3;
          addCash(f.id, -Math.round(cashOf(f.id) * 0.15));
          events.push({ fam: f.id, text: 'The precinct raided the ' + RACKETS[r.type].name + ' in ' + DID[r.district].name + '.' });
        }
      }
      // grudges fade
      Object.keys(f.memory).forEach(k => { f.memory[k] -= 1; if (f.memory[k] <= 0) delete f.memory[k]; });
    });
    if (G.precinct > 0) G.precinct--;

    // loyalty drifts with payday
    crew(1).forEach(m => {
      if (m.id === G.you) return;
      m.weeks++;
      const broke = G.cash < 0;
      m.loyalty = clamp(m.loyalty + (broke ? -6 : 1) + (m.weeks > 20 ? -1 : 0), 0, 100);
      if (m.loyalty <= 5 && rng() < 0.4) {
        m.dead = true;
        events.push({ fam: 1, text: m.name + ' walked away from the family. Loyalty runs out.' });
      }
    });

    // candidates age out and refresh every 3rd week
    G.candidates.forEach(c => c.weeks--);
    G.candidates = G.candidates.filter(c => c.weeks > 0);
    if (G.week % 3 === 0) rollCandidates();

    aiTurns(events);

    // bankrupt families bleed soldiers
    G.fams.forEach(f => {
      if (!f || !f.alive || f.isPlayer) return;
      if (f.cash < -500) { f.soldiers = Math.max(0, f.soldiers - 3); f.cash = 0; }
      if (racketCount(f.id) === 0 && f.soldiers < 4) eliminate(f.id, 0);
    });

    G.week++;
    G.actionsLeft = rank() === 'don' ? 3 : 2;
    events.forEach(e => log(e.text, e.fam === 1 ? 'bad' : 'info', e.fam === 1));
    // weekly summary line
    const inc = income(1), up = upkeep(1);
    log('Week ' + G.week + '. The rackets brought in $' + inc.toLocaleString() + '; the crew cost $' + up.toLocaleString() + '.', 'info', true);
    checkEnd();
    if (G.phase === 'over') {
      if (G.result === 'win') news('THE CITY IS YOURS', 'Don ' + youPerson().first + ' ' + G.playerName + ' controls New York.');
    }
    return events;
  }

  /* ---------- AI ---------- */
  function aiTurns(events) {
    const order = shuffle(rng, G.fams.filter(f => f && f.alive && !f.isPlayer).map(f => f.id));
    order.forEach(id => {
      const f = fam(id);
      const rings = ringHeld(id);
      const fear = ringHeld(1).fear && f.memory[1] ? 0.5 : 1;
      let moves = G.week < 5 ? 2 : 1;
      const tryTake = (r, bias) => {
        if (moves <= 0 || !r || r.owner === id) return false;
        if (r.owner && truceBetween(id, r.owner)) return false;
        if (r.owner === 1 && truceBetween(1, id)) return false;
        const reach = new Set(districtsOf(id));
        districtsOf(id).forEach(d => (adj[d] || []).forEach(n => reach.add(n)));
        if (!reach.has(r.district)) return false;
        const defense = r.owner ? Math.max(6, Math.round(soldiersOf(r.owner) * 0.4)) : 4;
        const guarded = r.owner && G.buildings.some(b => b.type === 'guards' && b.district === r.district && b.owner === r.owner);
        // send enough to actually win: a third more than whatever is defending it
        const need = Math.ceil(defense * (guarded ? 2.4 : 1.5));
        if (f.soldiers < need + 6) return false;
        if (r.owner === 1) {
          const provoked = (f.memory[1] || 0) > 0;
          // once you are a real presence, the families stop tolerating you
          const threat = racketCount(1) >= 8;
          const chance = provoked ? 0.6 : threat ? 0.4 : 0.2;
          if (rng() > chance * diff.aggro * fear * bias) return false;
          if (f.soldiers < need + 8) return false;
        }
        if (r.owner && r.owner !== 1) {
          // don't pile onto a family that is already on the ropes — it keeps the city contested
          if (racketCount(r.owner) <= 3) return false;
          const grudge = (f.memory[r.owner] || 0) > 0;
          if (!grudge && rng() > 0.2 * diff.aggro) return false;
        }
        const res = fight({ soldiers: need }, { soldiers: defense, guarded });
        f.soldiers = Math.max(0, f.soldiers - res.attLoss);
        if (r.owner) addSoldiers(r.owner, -res.defLoss);
        if (res.win) {
          const prev = r.owner;
          r.owner = id;
          if (prev) {
            grudge(prev, id, 7);
            r.secureUntil = G.week + 3;
            if (prev === 1) events.push({ fam: 1, text: 'The ' + f.name + ' family takes your ' + RACKETS[r.type].name + ' in ' + DID[r.district].name + '.' });
          }
          if (prev && racketCount(prev) === 0 && prev !== 1) eliminate(prev, id);
          moves--;
          return true;
        } else if (r.owner === 1) {
          grudge(1, id, 4);
          events.push({ fam: 1, text: 'You beat back a ' + f.name + ' crew in ' + DID[r.district].name + '.' });
          moves--;
        }
        return false;
      };
      // revenge first
      if ((f.memory[1] || 0) > 2) {
        const mine = G.rackets.filter(r => r.owner === 1);
        if (mine.length) tryTake(pick(rng, mine), 1.4);
      }
      // expand into neutrals and weak neighbours
      const reach = new Set();
      districtsOf(id).forEach(d => { reach.add(d); (adj[d] || []).forEach(n => reach.add(n)); });
      const targets = G.rackets.filter(r => r.owner !== id && r.torchedUntil <= G.week && reach.has(r.district));
      const weakness = o => o === 0 ? -1 : o === 1 ? 1 : 1 / (racketCount(o) + 1);
      targets.sort((a, b) => weakness(a.owner) - weakness(b.owner) || rng() - 0.5);
      for (const r of targets) { if (moves <= 0) break; tryTake(r, f.style === 'aggressive' ? 1.3 : 0.8); }
      // build if rich
      if (f.cash > 3500 && moves > 0) {
        const home = districtsOf(id)[0];
        if (home && !G.buildings.some(b => b.owner === id && b.district === home && b.type === 'front')) {
          G.buildings.push({ id: G.buildings.length, type: 'front', district: home, owner: id });
          f.cash -= 1500;
        }
      }
      // occasionally propose a truce to the player when losing
      if (f.memory[1] && racketCount(id) < 3 && rng() < 0.3) {
        G.offers.push({ from: id, kind: 'truce', weeks: 6, expires: G.week + 2 });
      }
    });
  }

  function acceptOffer(i, yes) {
    const o = G.offers[i];
    if (!o) return 'Nothing on the table.';
    G.offers.splice(i, 1);
    if (!yes) { log('You send the ' + fam(o.from).name + ' messenger away.', 'info', true); return true; }
    if (o.kind === 'truce') {
      G.truce['1-' + o.from] = G.week + o.weeks;
      fam(o.from).memory[1] = 0;
      log('A truce with the ' + fam(o.from).name + ' family. ' + o.weeks + ' quiet weeks.', 'good', true);
    }
    return true;
  }

  /* ---------- log ---------- */
  function log(text, kind, relevant) {
    G.log.unshift({ week: G.week, text, kind: kind || 'info', relevant: !!relevant });
    if (G.log.length > 200) G.log.pop();
  }
  function news(headline, text) { G.news.unshift({ week: G.week, headline, text }); }

  rollCandidates();
  log('Week 1. You run numbers out of a social club in ' + DID[G.startDistrict].name + '. Sal Greco takes his cut and calls you "kid".', 'info', true);
  news('CITY DESK', 'It is the spring of 1955. Six families hold New York, and one of them holds Havana. Nobody has heard of you yet.');

  /* ---------- public surface ---------- */
  const api = { DIST, DID, adj, RACKETS, RACKET_ORDER, RINGS, BUILDINGS, BUILD_ORDER, ROLES, SPECS, SPEC_ORDER, RANK_UP,
    fam, crew, hasSpec, specCount, racketCount, held, totalOf, ringHeld, districtsOf, presence, reachable,
    income, upkeep, cap, heatOf, cashOf, soldiersOf, respect, rank, nextRank, canPromote, promote,
    recruit, buildCost, build, attackCost, canReach, atWarWith, take, firebomb, heist, hit, intimidate, bribe, requestTruce,
    truceBetween, acceptOffer, endWeek, youPerson, fight };
  Object.keys(api).forEach(k => G[k] = api[k]);
  G.startDistrictName = () => DID[G.startDistrict].name;
  return G;
}

const api = { createGame, DIST, DID, RACKETS, BUILDINGS, SPECS, ROLES, RINGS, fight };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.Engine2 = api;
})(typeof window !== 'undefined' ? window : globalThis);

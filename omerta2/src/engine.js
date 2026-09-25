// ============================================================================
//  OMERTÀ: THE FIVE BOROUGHS — game engine (no DOM; runs in browser or node)
// ============================================================================
const Engine = (function () {
  'use strict';
  const W = 220, H = 140, N = W * H;
  const WATER = 0, LAND = 1, BRIDGE = 2;
  const TICK = 0.1; // seconds per simulation tick

  // ---------------------------------------------------------------- data ---
  const RACKETS = {
    numbers: { name: 'Numbers Racket', icon: '🎲', income: 5, ring: '+20% income' },
    loan:    { name: 'Loan Sharking',  icon: '💵', income: 8, ring: 'Buildings 25% cheaper' },
    club:    { name: 'Nightclub',      icon: '🍸', income: 10, ring: '+25% soldier recruitment' },
    union:   { name: 'Dock Union',     icon: '⚓', income: 9, ring: 'Your turf is 30% harder to take' },
    casino:  { name: 'Casino',         icon: '🎰', income: 22, ring: '+$60/s skim' },
    narco:   { name: 'Narcotics',      icon: '💊', income: 28, heat: 0.08, ring: '+20% attack power (but double heat)' },
  };
  const BUILDINGS = {
    safehouse: { name: 'Safehouse',      icon: '🏚️', cost: 400, key: 'Q', desc: '+2,000 max soldiers' },
    front:     { name: 'Front Business', icon: '🏪', cost: 500, key: 'W', desc: '+$10/s laundered income' },
    guard:     { name: 'Guard Post',     icon: '🛡️', cost: 300, key: 'E', desc: 'Turf within 8 blocks is 2.5× harder to take' },
    docks:     { name: 'Docks',          icon: '⛴️', cost: 600, key: 'R', desc: 'Send boats across water. Must touch water.' },
  };
  const SPECS = {
    bruiser:     { name: 'Bruiser',     icon: '👊', desc: 'Attacks cost 15% fewer soldiers' },
    arsonist:    { name: 'Arsonist',    icon: '🔥', desc: 'Unlocks Firebomb' },
    safecracker: { name: 'Safecracker', icon: '🔓', desc: 'Unlocks Heist' },
    medic:       { name: 'Medic',       icon: '🩺', desc: '+25% soldier recruitment' },
    engineer:    { name: 'Engineer',    icon: '🔧', desc: 'Buildings 25% cheaper' },
    consigliere: { name: 'Consigliere', icon: '🎩', desc: 'Bribes ½ price, heat fades 2× faster, better truce odds' },
  };
  const NICKS = {
    bruiser: ['the Bull', 'Knuckles', 'Hammer', 'the Ox', 'Big Paulie'],
    arsonist: ['Matches', 'Sparky', 'the Torch', 'Smokey'],
    safecracker: ['Fingers', 'the Ghost', 'Silk', 'Tumblers'],
    medic: ['Doc', 'Stitches', 'the Priest'],
    engineer: ['Books', 'the Architect', 'Wrench'],
    consigliere: ['the Professor', 'Counselor', 'the Fox', 'Two-Tone'],
  };
  const FIRST = ['Sal', 'Vito', 'Tommy', 'Frankie', 'Sonny', 'Carmine', 'Paulie', 'Rocco', 'Luca', 'Nicky', 'Joey', 'Aldo', 'Enzo', 'Gino', 'Mario', 'Benny', 'Louie', 'Tony', 'Vinnie', 'Dom', 'Fredo', 'Artie', 'Mikey', 'Ralphie'];
  const LAST = ['Russo', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rinaldi', 'Lombardi', 'Moretti', 'Fontana', 'Serra'];

  const AI_FAMILIES = [
    { name: 'Barone',     don: 'Don Emilio Barone',     color: [52, 92, 168] },
    { name: 'Vitale',     don: 'Don Carlo Vitale',      color: [96, 138, 52] },
    { name: 'Carbone',    don: 'Don Rocco Carbone',     color: [205, 158, 38] },
    { name: 'Santangelo', don: 'Don Pietro Santangelo', color: [128, 72, 150] },
    { name: 'Rizzo',      don: 'Don Vincenzo Rizzo',    color: [36, 146, 146] },
    { name: 'Delgado',    don: 'Señor Ramón Delgado',   color: [222, 104, 40], havana: true },
  ];

  const DIFFICULTY = {
    easy:   { regen: 0.8,  attackAt: 0.72, playerBias: 0.0, think: 2.4 },
    normal: { regen: 1.0,  attackAt: 0.58, playerBias: 0.25, think: 1.7 },
    hard:   { regen: 1.2,  attackAt: 0.48, playerBias: 0.6, think: 1.2 },
  };

  // ---------------------------------------------------------------- map ----
  // Rough, stylised 1950s New York + Havana (grid units, 220 × 140)
  const POLYS = {
    jersey:    [[0, 0], [70, 0], [72, 10], [70, 24], [67, 40], [63, 58], [58, 76], [54, 92], [48, 104], [40, 108], [0, 110]],
    manhattan: [[76, 6], [82, 3], [86, 10], [85, 24], [81, 42], [76, 62], [71, 78], [67, 86], [63, 84], [64, 74], [68, 58], [72, 40], [75, 22]],
    bronx:     [[90, 0], [142, 0], [144, 12], [134, 22], [118, 25], [100, 24], [93, 20], [89, 10]],
    queens:    [[89, 30], [118, 30], [150, 29], [166, 37], [172, 55], [162, 68], [140, 72], [112, 71], [96, 69], [85, 60], [85, 44]],
    brooklyn:  [[82, 70], [96, 69], [112, 71], [140, 72], [152, 86], [146, 104], [130, 114], [106, 117], [88, 111], [78, 98], [73, 86]],
    staten:    [[40, 116], [56, 110], [66, 113], [68, 125], [58, 135], [44, 135], [35, 127]],
    havana:    [[172, 114], [196, 110], [218, 116], [219, 134], [200, 139], [178, 138], [166, 128]],
  };
  const BRIDGES = [
    ['George Washington Bridge', [69, 16], [79, 16]],
    ['Lincoln Tunnel', [62, 60], [70, 60]],
    ['Harlem River Bridge', [84, 17], [93, 15]],
    ['Triborough Bridge', [108, 22], [108, 33]],
    ['Queensboro Bridge', [79, 49], [89, 49]],
    ['Brooklyn Bridge', [67, 81], [78, 83]],
    ['Verrazzano Bridge', [80, 102], [64, 116]],
    ['Bayonne Bridge', [44, 104], [47, 115]],
  ];
  // name, x, y, rackets
  const DISTRICTS = [
    ['Paterson', 30, 14, ['loan', 'numbers']],
    ['Newark', 24, 60, ['narco', 'numbers']],
    ['Hoboken', 60, 36, ['union', 'numbers']],
    ['Jersey City', 50, 74, ['union', 'club']],
    ['Bayonne', 38, 97, ['union']],
    ['Harlem', 81, 15, ['narco', 'club']],
    ['Midtown', 77, 40, ['club', 'loan']],
    ["Hell's Kitchen", 71, 56, ['numbers', 'club']],
    ['Little Italy', 69, 70, ['loan', 'numbers']],
    ['Wall Street', 66, 81, ['loan']],
    ['South Bronx', 100, 15, ['narco', 'numbers']],
    ['Fordham', 118, 9, ['numbers', 'loan']],
    ['Pelham', 135, 8, ['numbers']],
    ['Astoria', 95, 37, ['numbers', 'club']],
    ['Long Island City', 90, 55, ['union', 'numbers']],
    ['Flushing', 132, 42, ['loan', 'numbers']],
    ['Jamaica', 145, 60, ['numbers', 'narco']],
    ['Bayside', 160, 46, ['numbers']],
    ['Williamsburg', 95, 78, ['loan', 'numbers']],
    ['Red Hook Docks', 81, 92, ['union', 'union']],
    ['Flatbush', 114, 92, ['numbers', 'club']],
    ['Brownsville', 136, 87, ['narco', 'numbers']],
    ['Bensonhurst', 94, 106, ['numbers', 'loan']],
    ['Coney Island', 118, 110, ['club', 'numbers']],
    ['Staten Island', 52, 124, ['numbers', 'union']],
    ['Old Havana', 180, 122, ['casino', 'club']],
    ['Vedado', 198, 124, ['casino', 'casino']],
    ['Tropicana', 210, 130, ['casino', 'narco']],
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function makeNoise(rng) {
    const S = 32, g = new Float32Array(S * S);
    for (let i = 0; i < g.length; i++) g[i] = rng() * 2 - 1;
    const sm = t => t * t * (3 - 2 * t);
    return function (x, y) {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0);
      const v = (a, b) => g[((b & (S - 1)) * S) + (a & (S - 1))];
      const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx;
      const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx;
      return a + (b - a) * fy;
    };
  }

  function buildMap(rng) {
    const terrain = new Uint8Array(N);
    const n1 = makeNoise(rng), n2 = makeNoise(rng);
    const polys = Object.values(POLYS);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const jx = x + 0.5 + n1(x / 7, y / 7) * 2.2 + n1(x / 2.5 + 50, y / 2.5) * 0.6;
      const jy = y + 0.5 + n2(x / 7, y / 7) * 2.2 + n2(x / 2.5, y / 2.5 + 50) * 0.6;
      for (const p of polys) if (pointInPoly(jx, jy, p)) { terrain[y * W + x] = LAND; break; }
    }
    // bridges
    const bridges = [];
    for (const [name, a, b] of BRIDGES) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy), steps = Math.ceil(len * 3);
      const ux = dx / len, uy = dy / len;
      const tiles = [];
      for (let s = -6; s <= steps + 6; s++) {
        const t = s / steps;
        const px = a[0] + dx * t, py = a[1] + dy * t;
        for (const off of [0, 0.7]) {
          const qx = Math.floor(px - uy * off), qy = Math.floor(py + ux * off);
          if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
          const i = qy * W + qx;
          if (terrain[i] === WATER && s >= -2 && s <= steps + 2) { terrain[i] = BRIDGE; tiles.push(i); }
        }
      }
      if (tiles.length) {
        const mid = tiles[tiles.length >> 1];
        bridges.push({ name, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, mid });
      }
    }
    // remove tiny islands (< 12 tiles)
    const seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (terrain[i] === WATER || seen[i]) continue;
      const comp = [i]; seen[i] = 1;
      for (let k = 0; k < comp.length; k++) {
        const c = comp[k], x = c % W, y = (c / W) | 0;
        const nb = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < H - 1 ? c + W : -1];
        for (const j of nb) if (j >= 0 && !seen[j] && terrain[j] !== WATER) { seen[j] = 1; comp.push(j); }
      }
      if (comp.length < 12) for (const c of comp) terrain[c] = WATER;
    }
    // districts: nearest seed
    const district = new Uint8Array(N).fill(255);
    for (let i = 0; i < N; i++) {
      if (terrain[i] === WATER) continue;
      const x = i % W, y = (i / W) | 0;
      let best = 0, bd = 1e9;
      for (let d = 0; d < DISTRICTS.length; d++) {
        const dd = (DISTRICTS[d][1] - x) ** 2 + (DISTRICTS[d][2] - y) ** 2;
        if (dd < bd) { bd = dd; best = d; }
      }
      // Havana districts only on Havana island and vice-versa
      district[i] = best;
    }
    return { terrain, district, bridges };
  }

  // -------------------------------------------------------------- game -----
  function createGame(opts) {
    opts = opts || {};
    const rng = mulberry32(opts.seed || (Math.random() * 1e9) | 0);
    const { terrain, district, bridges } = buildMap(rng);
    const diff = DIFFICULTY[opts.difficulty || 'normal'];
    const G = {
      W, H, N, WATER, LAND, BRIDGE, RACKETS, BUILDINGS, SPECS,
      terrain, district, bridges, districts: DISTRICTS.map(d => ({ name: d[0], x: d[1], y: d[2] })),
      owner: new Uint8Array(N), racketAt: new Int16Array(N).fill(-1), buildingAt: new Array(N).fill(null),
      coastal: new Uint8Array(N), coastalList: [],
      rackets: [], buildings: [], fams: [null], attacks: [], boats: [], effects: [], log: [], offers: [],
      dirty: [], time: 0, tickN: 0, phase: 'spawn', result: null, rings: {}, candidates: [],
      landCount: 0, rng, diff, nextAttackId: 1, nextBoatId: 1, speed: 1,
    };
    const { owner, racketAt, buildingAt, coastal } = G;

    for (let i = 0; i < N; i++) {
      if (terrain[i] === WATER) continue;
      G.landCount++;
      if (terrain[i] === LAND) {
        const x = i % W, y = (i / W) | 0;
        if ((x > 0 && terrain[i - 1] === WATER) || (x < W - 1 && terrain[i + 1] === WATER) ||
            (y > 0 && terrain[i - W] === WATER) || (y < H - 1 && terrain[i + W] === WATER)) { coastal[i] = 1; G.coastalList.push(i); }
      }
    }

    // ---- helpers
    function nbrs(i, out) {
      const x = i % W; let n = 0;
      if (x > 0) out[n++] = i - 1;
      if (x < W - 1) out[n++] = i + 1;
      if (i >= W) out[n++] = i - W;
      if (i < N - W) out[n++] = i + W;
      return n;
    }
    const NB = new Int32Array(4), NB2 = new Int32Array(4);
    const pick = arr => arr[(rng() * arr.length) | 0];
    const dist2 = (a, b) => { const dx = a % W - b % W, dy = ((a / W) | 0) - ((b / W) | 0); return dx * dx + dy * dy; };
    G.isHavana = i => (i % W) > 160 && ((i / W) | 0) > 106;

    // ---- rackets
    DISTRICTS.forEach((d, di) => {
      const tiles = [];
      for (let i = 0; i < N; i++) if (district[i] === di && terrain[i] === LAND && !coastal[i]) tiles.push(i);
      for (const type of d[3]) {
        for (let tries = 0; tries < 60 && tiles.length; tries++) {
          const i = pick(tiles);
          if (G.rackets.some(r => dist2(r.i, i) < 25)) continue;
          racketAt[i] = G.rackets.length;
          G.rackets.push({ i, type, raidedUntil: 0, district: d[0] });
          break;
        }
      }
    });

    // ---- families
    function makeFam(id, def, isPlayer) {
      return {
        id, name: def.name, don: def.don, color: def.color, isPlayer, havana: !!def.havana,
        alive: true, troops: 0, maxTroops: 600, cash: 500, tiles: 0, compound: -1,
        crew: [], spec: {}, heat: 0, truces: {}, grudge: {}, cool: { firebomb: 0, heist: 0, hit: 0, truce: 0, relocate: 0 },
        bcount: { safehouse: 0, front: 0, guard: 0, docks: 0 }, income: 0, regen: 0,
        racketCount: 0, nextThink: 0, nextRaid: 0, labelX: 0, labelY: 0, stats: { tilesTaken: 0, peak: 0 },
      };
    }
    const pname = (opts.playerName || 'Russo').trim().slice(0, 18) || 'Russo';
    const player = makeFam(1, { name: pname, don: 'Don ' + pname, color: opts.playerColor || [178, 34, 34] }, true);
    G.fams.push(player);
    G.player = player;
    AI_FAMILIES.forEach((def, k) => {
      let d = def;
      if (opts.playerColor && def.color.join() === opts.playerColor.join()) d = Object.assign({}, def, { color: [178, 34, 34] });
      const f = makeFam(k + 2, d, false);
      f.ai = { ratio: 0.35 + rng() * 0.2, attackAt: diff.attackAt + (rng() - 0.5) * 0.1 };
      G.fams.push(f);
    });

    function updateSpecs(F) {
      F.spec = {};
      for (const c of F.crew) F.spec[c.spec] = (F.spec[c.spec] || 0) + 1;
    }

    function addLog(text, kind, relevant) {
      G.log.push({ t: G.time, text, kind: kind || 'info', relevant: relevant !== false });
      if (G.log.length > 80) G.log.shift();
    }
    G.addLog = addLog;

    // ---- ownership
    function setOwner(i, o) {
      const old = owner[i];
      if (old === o) return;
      if (old) G.fams[old].tiles--;
      if (o) { G.fams[o].tiles++; G.fams[o].stats.tilesTaken++; }
      owner[i] = o;
      G.dirty.push(i);
    }
    function blob(center, fid, radius) {
      const q = [center], depth = new Map([[center, 0]]);
      for (let k = 0; k < q.length; k++) {
        const c = q[k], d = depth.get(c);
        if (owner[c] === 0) setOwner(c, fid);
        if (d >= radius) continue;
        const n = nbrs(c, NB);
        for (let m = 0; m < n; m++) {
          const j = NB[m];
          if (terrain[j] !== LAND || depth.has(j) || owner[j] !== 0) continue;
          if (dist2(j, center) > radius * radius) continue;
          depth.set(j, d + 1); q.push(j);
        }
      }
    }
    function validSpawn(i, minDist) {
      if (terrain[i] !== LAND || owner[i] !== 0 || racketAt[i] >= 0) return false;
      for (let f = 1; f < G.fams.length; f++) {
        const F = G.fams[f];
        if (F.compound >= 0 && dist2(F.compound, i) < minDist * minDist) return false;
      }
      for (const r of G.rackets) if (dist2(r.i, i) < 9) return false;
      return true;
    }
    G.canSpawnAt = i => i >= 0 && i < N && terrain[i] === LAND && racketAt[i] < 0;
    G.placePlayer = function (i) {
      if (!G.canSpawnAt(i) || G.phase !== 'spawn') return false;
      // clear previous
      if (player.compound >= 0) for (let k = 0; k < N; k++) if (owner[k] === 1) setOwner(k, 0);
      player.compound = i;
      blob(i, 1, 5);
      return true;
    };

    G.start = function () {
      if (player.compound < 0) return false;
      for (let f = 2; f < G.fams.length; f++) {
        const F = G.fams[f];
        let placed = false;
        for (let md = 30; md >= 8 && !placed; md -= 4) {
          for (let tries = 0; tries < 400; tries++) {
            const i = (rng() * N) | 0;
            if (F.havana !== G.isHavana(i)) continue;
            if (validSpawn(i, F.havana ? Math.min(md, 14) : md)) { F.compound = i; blob(i, F.id, 5); placed = true; break; }
          }
        }
        if (!placed) F.alive = false;
      }
      for (let f = 1; f < G.fams.length; f++) {
        const F = G.fams[f];
        recalc(F);
        F.troops = 700;
        F.nextThink = 2 + rng() * 2;
      }
      refreshCandidates();
      G.phase = 'play';
      addLog(`The ${player.name} family plants its flag in ${G.districts[district[player.compound]].name}. The other families take notice.`, 'major');
      return true;
    };

    // ---- economy
    function recalc(F) {
      F.maxTroops = 500 + F.tiles * 5 + F.bcount.safehouse * 2000;
    }
    function buildCost(F, type) {
      let c = BUILDINGS[type].cost * (1 + 0.5 * F.bcount[type]);
      if (F.spec.engineer) c *= 0.75;
      if (G.rings.loan === F.id) c *= 0.75;
      return Math.round(c);
    }
    function recruitCost(F) { return Math.round(700 * (1 + 0.6 * F.crew.length)); }
    function bribeCost(F) { return Math.round((200 + F.heat * 12) * (F.spec.consigliere ? 0.5 : 1)); }
    function hitCost(F) { return 600; }
    const FIREBOMB_COST = 900, FIREBOMB_CD = 45, HEIST_CD = 60, HIT_CD = 20;
    G.buildCost = buildCost; G.recruitCost = recruitCost; G.bribeCost = bribeCost; G.hitCost = hitCost;
    G.FIREBOMB_COST = FIREBOMB_COST;

    function econTick(F, dt) {
      recalc(F);
      const p = F.troops / F.maxTroops;
      let r = F.maxTroops * 0.03 * (4 * Math.max(p, 0.1) * (1 - Math.min(p, 1)));
      r += 2;
      if (F.spec.medic) r *= 1 + 0.25 * F.spec.medic;
      if (G.rings.club === F.id) r *= 1.25;
      if (!F.isPlayer) r *= diff.regen;
      if (p >= 1) r = 0;
      F.regen = r;
      F.troops = Math.min(F.maxTroops, F.troops + r * dt);
      if (F.troops > F.maxTroops) F.troops -= (F.troops - F.maxTroops) * 0.2 * dt;

      let inc = F.tiles * 0.02 + F.bcount.front * 10;
      let narco = 0;
      for (const rk of G.rackets) {
        if (owner[rk.i] !== F.id || rk.raidedUntil > G.time) continue;
        inc += RACKETS[rk.type].income;
        if (rk.type === 'narco') narco++;
      }
      if (G.rings.numbers === F.id) inc *= 1.2;
      if (G.rings.casino === F.id) inc += 60;
      if (F.heat > 50) inc *= 0.75;
      if (!F.isPlayer) inc *= (0.85 + diff.regen * 0.15);
      F.income = inc;
      F.cash += inc * dt;

      addHeat(F, narco * 0.08 * dt);
      F.heat = Math.max(0, F.heat - (F.spec.consigliere ? 0.7 : 0.35) * dt);
      F.stats.peak = Math.max(F.stats.peak, F.tiles);
    }
    function addHeat(F, h) {
      if (G.rings.narco === F.id) h *= 2;
      F.heat = Math.min(100, F.heat + h);
    }

    function secondTick() {
      // building counts
      for (let f = 1; f < G.fams.length; f++) G.fams[f].bcount = { safehouse: 0, front: 0, guard: 0, docks: 0 };
      for (const b of G.buildings) { const o = owner[b.i]; if (o) G.fams[o].bcount[b.type]++; }
      // racket counts + rings
      for (let f = 1; f < G.fams.length; f++) G.fams[f].racketCount = 0;
      const byType = {};
      for (const rk of G.rackets) {
        const o = owner[rk.i];
        if (o) G.fams[o].racketCount++;
        (byType[rk.type] = byType[rk.type] || []).push(o);
      }
      for (const t in byType) {
        const os = byType[t];
        const holder = os.every(o => o && o === os[0]) ? os[0] : 0;
        if (holder !== (G.rings[t] || 0)) {
          if (holder) addLog(`${G.fams[holder].name.toUpperCase()} FAMILY CORNERS THE ${RACKETS[t].name.toUpperCase()} RING! (${RACKETS[t].ring})`, 'major');
          else if (G.rings[t]) addLog(`The ${G.fams[G.rings[t]].name} family loses its grip on the ${RACKETS[t].name} ring.`, G.rings[t] === 1 ? 'bad' : 'info', G.rings[t] === 1);
          G.rings[t] = holder;
        }
      }
      // police raids
      for (let f = 1; f < G.fams.length; f++) {
        const F = G.fams[f];
        if (!F.alive) continue;
        if (F.heat >= 80 && G.time >= F.nextRaid) {
          F.nextRaid = G.time + 15;
          const mine = G.rackets.filter(r => owner[r.i] === F.id && r.raidedUntil <= G.time);
          F.troops *= 0.9;
          if (mine.length) {
            const r = pick(mine);
            r.raidedUntil = G.time + 30;
            addLog(`POLICE RAID! Cops shut down the ${F.name} ${RACKETS[r.type].name} in ${r.district}.`, F.isPlayer ? 'bad' : 'info', F.isPlayer);
          } else addLog(`Police sweep hits ${F.name} soldiers on the street.`, F.isPlayer ? 'bad' : 'info', F.isPlayer);
        }
        // labels
        let sx = 0, sy = 0, n = 0;
        for (let i = 0; i < N; i += 1) if (owner[i] === f) { sx += i % W; sy += (i / W) | 0; n++; }
        if (n) {
          const cx = sx / n, cy = sy / n;
          // snap to nearest owned tile
          let best = -1, bd = 1e9;
          const R = 30;
          for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++)
            for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
              const i = y * W + x;
              if (owner[i] !== f) continue;
              const d = (x - cx) ** 2 + (y - cy) ** 2;
              if (d < bd) { bd = d; best = i; }
            }
          if (best >= 0) { F.labelX = best % W + 0.5; F.labelY = ((best / W) | 0) + 0.5; }
          else { F.labelX = F.compound % W; F.labelY = (F.compound / W) | 0; }
        }
      }
      // offers expire
      G.offers = G.offers.filter(o => o.expires > G.time && G.fams[o.from].alive);
      // candidates refresh
      if (G.time >= G.candRefresh) refreshCandidates();
      checkEnd();
    }

    // ---- crew
    function makeCandidate(spec) {
      spec = spec || pick(Object.keys(SPECS));
      return { name: pick(FIRST), nick: pick(NICKS[spec]), last: pick(LAST), spec };
    }
    function refreshCandidates() {
      const specs = Object.keys(SPECS).sort(() => rng() - 0.5).slice(0, 3);
      G.candidates = specs.map(s => makeCandidate(s));
      G.candRefresh = G.time + 90;
    }
    G.refreshCandidates = refreshCandidates;
    G.recruit = function (F, idx) {
      if (F.crew.length >= 4) return 'Your crew is full (4 made men).';
      const c = recruitCost(F);
      if (F.cash < c) return 'Not enough cash.';
      const cand = F.isPlayer ? G.candidates[idx] : makeCandidate();
      if (!cand) return 'No candidate.';
      F.cash -= c;
      F.crew.push(cand);
      updateSpecs(F);
      if (F.isPlayer) {
        G.candidates.splice(idx, 1);
        if (!G.candidates.length) refreshCandidates();
        addLog(`${cand.name} "${cand.nick}" ${cand.last} gets his button. Welcome to the family, ${SPECS[cand.spec].name.toLowerCase()}.`, 'good');
      }
      return true;
    };

    // ---- buildings
    G.canBuild = function (F, type, i) {
      if (i < 0 || i >= N) return 'Invalid spot.';
      if (owner[i] !== F.id) return 'You can only build on your own turf.';
      if (terrain[i] !== LAND) return 'Can\'t build on a bridge.';
      if (buildingAt[i] || racketAt[i] >= 0 || F.compound === i) return 'That block is taken.';
      if (type === 'docks' && !coastal[i]) return 'Docks must be built on the waterfront.';
      for (const b of G.buildings) if (dist2(b.i, i) < 5) return 'Too close to another building.';
      if (F.cash < buildCost(F, type)) return 'Not enough cash.';
      return true;
    };
    G.build = function (F, type, i) {
      const ok = G.canBuild(F, type, i);
      if (ok !== true) return ok;
      F.cash -= buildCost(F, type);
      const b = { i, type };
      G.buildings.push(b);
      buildingAt[i] = b;
      F.bcount[type]++;
      G.dirty.push(i);
      if (F.isPlayer) addLog(`New ${BUILDINGS[type].name.toLowerCase()} opens in ${G.districts[district[i]].name}.`, 'good');
      return true;
    };
    function destroyBuilding(b) {
      G.buildings.splice(G.buildings.indexOf(b), 1);
      buildingAt[b.i] = null;
      G.dirty.push(b.i);
    }

    // ---- combat
    G.isTruce = (a, b) => a && b && (G.fams[a].truces[b] || 0) > G.time;
    function guardMult(D, i) {
      for (const b of G.buildings) {
        if (b.type !== 'guard' || owner[b.i] !== D.id) continue;
        if (dist2(b.i, i) <= 64) return 2.5;
      }
      return 1;
    }
    function tileCost(A, D, i) {
      let c;
      if (!D) { c = racketAt[i] >= 0 ? 40 : 2.5; }
      else {
        const dens = D.troops / Math.max(1, D.tiles);
        c = 2 + dens * 1.5;
        if (racketAt[i] >= 0) c *= 2;
        if (i === D.compound) c = 300 + Math.max(D.troops, D.maxTroops * 0.7) * 0.8;
        else if (dist2(i, D.compound) <= 9) c *= 2.5;
        c *= guardMult(D, i);
        if (G.rings.union === D.id) c *= 1.3;
      }
      if (terrain[i] === BRIDGE) c *= 2.5;
      let atk = 1 - 0.15 * (A.spec.bruiser || 0);
      if (G.rings.narco === A.id) atk *= 0.8;
      return c * Math.max(0.5, atk);
    }
    G.tileCost = tileCost;
    function adjacentTo(i, fid) {
      const n = nbrs(i, NB2);
      for (let m = 0; m < n; m++) if (owner[NB2[m]] === fid) return true;
      return false;
    }
    function computeFrontier(a, d) {
      const s = new Set();
      for (let i = 0; i < N; i++) {
        if (owner[i] !== d || terrain[i] === WATER) continue;
        if (adjacentTo(i, a)) s.add(i);
      }
      return s;
    }
    G.borders = function (a, d) {
      for (let i = 0; i < N; i++) if (owner[i] === d && terrain[i] !== WATER && adjacentTo(i, a)) return true;
      return false;
    };

    G.launchAttack = function (F, d, troops) {
      if (!F.alive || d === F.id) return 'Invalid target.';
      if (d && !G.fams[d].alive) return 'That family is finished.';
      if (d && G.isTruce(F.id, d)) return `You have a truce with the ${G.fams[d].name} family.`;
      troops = Math.floor(Math.min(troops, F.troops));
      if (troops < 1) return 'Not enough soldiers.';
      let a = G.attacks.find(x => x.att === F.id && x.def === d);
      if (!a) {
        const fr = computeFrontier(F.id, d);
        if (!fr.size) return 'noborder';
        a = { id: G.nextAttackId++, att: F.id, def: d, troops: 0, frontier: fr, start: G.time };
        G.attacks.push(a);
      }
      F.troops -= troops;
      a.troops += troops;
      if (d) {
        const D = G.fams[d];
        addHeat(F, 2.5);
        D.grudge[F.id] = G.time;
        if (D.isPlayer) addLog(`The ${F.name} family moves ${Math.round(troops).toLocaleString()} soldiers against your turf!`, 'bad');
        else if (F.isPlayer && a.troops === troops) addLog(`War! You send ${troops.toLocaleString()} soldiers against the ${D.name} family.`, 'war');
      } else addHeat(F, 0.2);
      return true;
    };
    G.retreat = function (F, a) {
      const k = G.attacks.indexOf(a);
      if (k < 0 || a.att !== F.id) return;
      F.troops += a.troops * 0.8;
      G.attacks.splice(k, 1);
    };

    function conquer(i, o) {
      const old = owner[i];
      setOwner(i, o);
      if (racketAt[i] >= 0) {
        const rk = G.rackets[racketAt[i]];
        const A = G.fams[o];
        addHeat(A, 2);
        if (A.isPlayer) addLog(`You muscle in on the ${RACKETS[rk.type].name} in ${rk.district}.`, 'good');
        else if (old === 1) addLog(`The ${A.name} family takes your ${RACKETS[rk.type].name} in ${rk.district}!`, 'bad');
      }
      if (old) {
        const D = G.fams[old];
        if (D.compound === i || D.tiles <= 0) eliminate(old, o);
      }
    }

    function eliminate(fid, by) {
      const D = G.fams[fid];
      if (!D.alive) return;
      D.alive = false;
      const B = by ? G.fams[by] : null;
      let n = 0;
      const cpd = D.compound;
      for (let i = 0; i < N; i++) if (owner[i] === fid) {
        if (by && dist2(i, cpd) <= 900) { setOwner(i, by); n++; } else setOwner(i, 0);
      }
      if (B) {
        B.cash += D.cash * 0.5;
        B.troops = Math.min(B.troops + D.troops * 0.3, B.maxTroops * 1.5);
      }
      D.troops = 0; D.cash = 0; D.crew = []; updateSpecs(D);
      G.attacks = G.attacks.filter(a => {
        if (a.att === fid) return false;
        if (a.def === fid) { G.fams[a.att].troops += a.troops; return false; }
        return true;
      });
      G.boats = G.boats.filter(b => b.att !== fid);
      if (D.isPlayer) {
        addLog(`YOUR COMPOUND HAS FALLEN. The ${B ? B.name : 'rival'} family takes everything.`, 'bad');
        G.result = { win: false, reason: `The ${B ? B.name : 'rival'} family stormed your compound.` };
        G.phase = 'over';
      } else {
        addLog(`${D.don.toUpperCase()} GUNNED DOWN! The ${D.name} family is no more${B ? ` — the ${B.name}s absorb ${n.toLocaleString()} blocks, the rest is up for grabs` : ''}.`, 'major');
      }
    }

    function removeAttack(a) {
      const k = G.attacks.indexOf(a);
      if (k >= 0) G.attacks.splice(k, 1);
    }
    function attackTick() {
      const arr = [];
      for (const a of G.attacks.slice()) {
        if (G.attacks.indexOf(a) < 0) continue;
        const A = G.fams[a.att], D = a.def ? G.fams[a.def] : null;
        if (!A.alive || (D && !D.alive)) { removeAttack(a); continue; }
        if ((G.tickN + a.id) % 12 === 0) a.frontier = computeFrontier(a.att, a.def);
        if (!a.frontier.size || a.troops < 1) {
          A.troops = Math.min(A.troops + a.troops, A.maxTroops * 1.2);
          removeAttack(a);
          continue;
        }
        arr.length = 0;
        for (const i of a.frontier) {
          let s = 0;
          const n = nbrs(i, NB);
          for (let m = 0; m < n; m++) if (owner[NB[m]] === a.att) s++;
          arr.push([i, s + rng() * 2.2]);
        }
        arr.sort((p, q) => q[1] - p[1]);
        const k2 = Math.max(1, Math.min(7, Math.ceil(arr.length * 0.035)));
        for (let m = 0; m < k2 && m < arr.length; m++) {
          const i = arr[m][0];
          if (owner[i] !== a.def || !adjacentTo(i, a.att)) { a.frontier.delete(i); continue; }
          const c = tileCost(A, D, i);
          if (a.troops < c) {
            // last push: chance proportional to what's left
            const lucky = !(D && i === D.compound) && rng() < a.troops / c;
            a.troops = 0;
            if (!lucky) break;
          } else a.troops -= c;
          if (D) {
            const dens = D.troops / Math.max(1, D.tiles);
            D.troops = Math.max(0, D.troops - (dens * 0.6 + 0.3));
          }
          conquer(i, a.att);
          if (!A.alive || (D && !D.alive) || G.attacks.indexOf(a) < 0) break;
          a.frontier.delete(i);
          const n = nbrs(i, NB);
          for (let q = 0; q < n; q++) {
            const j = NB[q];
            if (owner[j] === a.def && terrain[j] !== WATER) a.frontier.add(j);
          }
          if (a.troops <= 0) break;
        }
        if (a.troops < 1) removeAttack(a);
      }
    }

    // ---- boats
    G.nearestDocks = function (F, i) {
      let best = null, bd = 1e9;
      for (const b of G.buildings) {
        if (b.type !== 'docks' || owner[b.i] !== F.id) continue;
        const d = dist2(b.i, i);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    };
    G.sendBoat = function (F, i, troops) {
      if (terrain[i] === WATER) return 'Pick a spot on land.';
      if (owner[i] === F.id) return 'That is already your turf.';
      if (!coastal[i]) return 'Boats can only land on the waterfront.';
      const d = owner[i];
      if (d && G.isTruce(F.id, d)) return `You have a truce with the ${G.fams[d].name} family.`;
      const dk = G.nearestDocks(F, i);
      if (!dk) return 'You need Docks to send boats.';
      troops = Math.floor(Math.min(troops, F.troops));
      if (troops < 10) return 'Not enough soldiers.';
      F.troops -= troops;
      const sx = dk.i % W + 0.5, sy = ((dk.i / W) | 0) + 0.5, tx = i % W + 0.5, ty = ((i / W) | 0) + 0.5;
      G.boats.push({ id: G.nextBoatId++, att: F.id, x: sx, y: sy, sx, sy, tx, ty, target: i, troops, speed: 7 });
      addHeat(F, 1);
      if (F.isPlayer) addLog(`A boat with ${troops.toLocaleString()} soldiers leaves the docks.`, 'war');
      else if (d === 1) addLog(`Lookouts spot a ${F.name} boat heading for your waterfront!`, 'bad');
      return true;
    };
    function boatTick(dt) {
      for (let k = G.boats.length - 1; k >= 0; k--) {
        const b = G.boats[k];
        const A = G.fams[b.att];
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        const step = b.speed * dt;
        if (d > step) { b.x += dx / d * step; b.y += dy / d * step; continue; }
        G.boats.splice(k, 1);
        if (!A.alive) continue;
        const i = b.target, def = owner[i];
        if (def === A.id) { A.troops += b.troops; continue; }
        if (def && G.isTruce(A.id, def)) { A.troops += b.troops; continue; }
        const D = def ? G.fams[def] : null;
        const c = tileCost(A, D, i);
        if (b.troops < c) {
          if (A.isPlayer) addLog('Your landing party was cut down on the beach.', 'bad');
          continue;
        }
        b.troops -= c;
        conquer(i, A.id);
        if (!A.alive) continue;
        if (def && !G.fams[def].alive) { A.troops += b.troops; continue; }
        let a = G.attacks.find(x => x.att === A.id && x.def === def);
        if (!a) { a = { id: G.nextAttackId++, att: A.id, def, troops: 0, frontier: computeFrontier(A.id, def), start: G.time }; G.attacks.push(a); }
        a.troops += b.troops;
        if (A.isPlayer) addLog(`Your boat lands in ${G.districts[district[i]].name}. Beachhead secured!`, 'good');
        else if (def === 1) addLog(`The ${A.name} family lands soldiers in ${G.districts[district[i]].name}!`, 'bad');
      }
    }

    // ---- operations
    G.firebomb = function (F, i) {
      if (!F.spec.arsonist) return 'You need an Arsonist in your crew.';
      if (F.cool.firebomb > G.time) return `Your arsonist is lying low (${Math.ceil(F.cool.firebomb - G.time)}s).`;
      if (F.cash < FIREBOMB_COST) return 'Not enough cash.';
      const d = owner[i];
      if (!d || d === F.id) return 'Target a rival family\'s turf.';
      if (G.isTruce(F.id, d)) return `You have a truce with the ${G.fams[d].name} family.`;
      F.cash -= FIREBOMB_COST;
      F.cool.firebomb = G.time + FIREBOMB_CD;
      const D = G.fams[d];
      const cx = i % W, cy = (i / W) | 0, R = 5;
      let burned = 0, bld = 0;
      for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
        const j = y * W + x;
        const o = owner[j];
        if (!o || o === F.id) continue;
        if (G.isTruce(F.id, o)) continue;
        const O = G.fams[o];
        if (j === O.compound) continue;
        const dens = O.troops / Math.max(1, O.tiles);
        O.troops = Math.max(0, O.troops - dens * 1.5);
        if (buildingAt[j]) { destroyBuilding(buildingAt[j]); bld++; }
        setOwner(j, 0);
        burned++;
        if (O.tiles <= 0) eliminate(o, F.id);
      }
      addHeat(F, 20);
      D.grudge[F.id] = G.time;
      G.effects.push({ type: 'fire', x: cx + 0.5, y: cy + 0.5, r: R, t: G.time });
      const where = G.districts[district[i]].name;
      if (F.isPlayer) addLog(`FIRE IN ${where.toUpperCase()}! ${burned} ${D.name} blocks burned${bld ? `, ${bld} building${bld > 1 ? 's' : ''} destroyed` : ''}.`, 'war');
      else if (d === 1) addLog(`ARSON! The ${F.name} family torches your turf in ${where}${bld ? ` and ${bld} building${bld > 1 ? 's' : ''}` : ''}.`, 'bad');
      else addLog(`Mysterious blaze guts ${D.name} blocks in ${where}.`, 'info', false);
      return true;
    };
    G.heist = function (F, d) {
      if (!F.spec.safecracker) return 'You need a Safecracker in your crew.';
      if (F.cool.heist > G.time) return `Your safecracker needs time (${Math.ceil(F.cool.heist - G.time)}s).`;
      const D = G.fams[d];
      if (!D || !D.alive || d === F.id) return 'Invalid target.';
      if (G.isTruce(F.id, d)) return `You have a truce with the ${D.name} family.`;
      F.cool.heist = G.time + HEIST_CD;
      D.grudge[F.id] = G.time;
      if (rng() < 0.75) {
        const amt = Math.round(Math.min(D.cash * 0.3, 4000));
        D.cash -= amt; F.cash += amt;
        addHeat(F, 10);
        if (F.isPlayer) addLog(`Clean job! Your safecracker lifts $${amt.toLocaleString()} from the ${D.name} counting room.`, 'good');
        else if (d === 1) addLog(`Your counting room was cracked! The ${F.name} family stole $${amt.toLocaleString()}.`, 'bad');
      } else {
        addHeat(F, 15);
        if (F.isPlayer) addLog(`The heist on the ${D.name}s went sideways. Cops are asking questions.`, 'bad');
      }
      return true;
    };
    G.hit = function (F, d) {
      const D = G.fams[d];
      if (!D || !D.alive || d === F.id) return 'Invalid target.';
      if (G.isTruce(F.id, d)) return `You have a truce with the ${D.name} family.`;
      if (!D.crew.length) return `The ${D.name} family has no made men to hit.`;
      if (F.cool.hit > G.time) return `Wait ${Math.ceil(F.cool.hit - G.time)}s before ordering another hit.`;
      const c = hitCost(F);
      if (F.cash < c) return 'Not enough cash.';
      F.cash -= c;
      F.cool.hit = G.time + HIT_CD;
      addHeat(F, 8);
      D.grudge[F.id] = G.time;
      const chance = Math.min(0.8, 0.5 + 0.1 * (F.spec.bruiser || 0));
      if (rng() < chance) {
        const k = (rng() * D.crew.length) | 0;
        const v = D.crew.splice(k, 1)[0];
        updateSpecs(D);
        if (F.isPlayer) addLog(`${v.name} "${v.nick}" ${v.last} of the ${D.name} family sleeps with the fishes.`, 'war');
        else if (d === 1) addLog(`HIT! Your ${SPECS[v.spec].name.toLowerCase()} ${v.name} "${v.nick}" ${v.last} was whacked by the ${F.name} family.`, 'bad');
        else addLog(`${D.name} capo found dead in a Cadillac trunk.`, 'info', false);
      } else {
        addHeat(F, 6);
        if (F.isPlayer) addLog(`The hit on the ${D.name} family failed. They know it was you.`, 'bad');
        else if (d === 1) addLog(`Your men foiled a ${F.name} hit attempt.`, 'good');
      }
      return true;
    };
    const RELOCATE_COST = 1000, RELOCATE_CD = 90;
    G.RELOCATE_COST = RELOCATE_COST;
    G.relocate = function (F, i) {
      if (F.cool.relocate > G.time) return `The Don just moved. Wait ${Math.ceil(F.cool.relocate - G.time)}s.`;
      if (owner[i] !== F.id) return 'The Don can only move to your own turf.';
      if (terrain[i] !== LAND || racketAt[i] >= 0 || buildingAt[i]) return 'Pick an empty block.';
      if (F.cash < RELOCATE_COST) return 'Not enough cash.';
      F.cash -= RELOCATE_COST;
      F.cool.relocate = G.time + RELOCATE_CD;
      const old = F.compound;
      F.compound = i;
      G.dirty.push(old, i);
      if (F.isPlayer) addLog(`The Don goes to the mattresses — new compound in ${G.districts[district[i]].name}.`, 'good');
      else addLog(`${F.don} slips out of town. Word is he's holed up in ${G.districts[district[i]].name}.`, 'info', false);
      return true;
    };
    G.threatToCompound = function (F) {
      // nearest hostile tile within 12 of the compound (or -1)
      const cx = F.compound % W, cy = (F.compound / W) | 0, R = 12;
      let best = -1, bd = 1e9;
      for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++)
        for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++) {
          const j = y * W + x, o = owner[j];
          if (!o || o === F.id || G.isTruce(F.id, o)) continue;
          const d = (x - cx) ** 2 + (y - cy) ** 2;
          if (d < bd) { bd = d; best = j; }
        }
      return best < 0 ? null : { tile: best, dist: Math.sqrt(bd) };
    };

    G.bribe = function (F) {
      const c = bribeCost(F);
      if (F.heat < 5) return 'The cops aren\'t even looking at you.';
      if (F.cash < c) return 'Not enough cash.';
      F.cash -= c;
      F.heat = Math.max(0, F.heat - 35);
      if (F.isPlayer) addLog(`An envelope finds its way to the precinct captain. Heat drops.`, 'good');
      return true;
    };
    G.requestTruce = function (F, d) {
      const D = G.fams[d];
      if (!D || !D.alive) return 'Invalid.';
      if (G.isTruce(F.id, d)) return 'Already at peace.';
      if (F.cool.truce > G.time) return `The Dons won't sit down again so soon (${Math.ceil(F.cool.truce - G.time)}s).`;
      F.cool.truce = G.time + 30;
      const strength = (F.troops + F.tiles * 5) / (D.troops + D.tiles * 5 + 1);
      let p = 0.15 + Math.min(0.5, strength * 0.3);
      if (G.attacks.some(a => a.att === d && a.def !== F.id && a.def)) p += 0.2;
      if ((D.grudge[F.id] || -1e9) > G.time - 30) p -= 0.25;
      if (F.spec.consigliere) p += 0.2;
      if (rng() < p) { makeTruce(F.id, d, 120); addLog(`The ${F.name} and ${D.name} families embrace at a sit-down. 2-minute truce.`, 'good'); return true; }
      addLog(`${D.don} refuses to sit down with you.`, 'bad');
      return false;
    };
    function makeTruce(a, b, sec) {
      G.fams[a].truces[b] = G.time + sec;
      G.fams[b].truces[a] = G.time + sec;
      G.attacks = G.attacks.filter(x => {
        if ((x.att === a && x.def === b) || (x.att === b && x.def === a)) { G.fams[x.att].troops += x.troops; return false; }
        return true;
      });
    }
    G.acceptOffer = function (k, yes) {
      const o = G.offers[k];
      if (!o) return;
      G.offers.splice(k, 1);
      if (yes) { makeTruce(1, o.from, 120); addLog(`You accept ${G.fams[o.from].don}'s offer. 2-minute truce.`, 'good'); }
      else { G.fams[o.from].grudge[1] = G.time; addLog(`You spit on ${G.fams[o.from].don}'s offer.`, 'war'); }
    };

    // ---- AI
    function aiThink(F) {
      const cnt = new Map(), edge = new Map();
      let ownSample = [], coastSample = [], seen = 0, cseen = 0;
      for (let i = 0; i < N; i++) {
        if (owner[i] !== F.id) continue;
        seen++;
        if (terrain[i] === LAND && !buildingAt[i] && racketAt[i] < 0 && i !== F.compound) {
          if (ownSample.length < 20) ownSample.push(i); else if (rng() < 20 / seen) ownSample[(rng() * 20) | 0] = i;
          if (coastal[i]) { cseen++; if (coastSample.length < 10) coastSample.push(i); else if (rng() < 10 / cseen) coastSample[(rng() * 10) | 0] = i; }
        }
        const n = nbrs(i, NB);
        for (let m = 0; m < n; m++) {
          const j = NB[m], o = owner[j];
          if (o === F.id || terrain[j] === WATER) continue;
          cnt.set(o, (cnt.get(o) || 0) + 1);
          if (!edge.has(o) || rng() < 0.05) edge.set(o, j);
        }
      }
      const p = F.troops / F.maxTroops;
      const myAttacks = G.attacks.filter(a => a.att === F.id).length;
      const P = G.player;

      // --- attack
      if (p > F.ai.attackAt && myAttacks < 2) {
        if (cnt.get(0) > 0 && (rng() < 0.8 || cnt.size === 1)) {
          G.launchAttack(F, 0, F.troops * F.ai.ratio);
        } else {
          let best = 0, bs = -1e9;
          for (const [o] of cnt) {
            if (!o) continue;
            const D = G.fams[o];
            if (G.isTruce(F.id, o)) continue;
            let s = F.troops / (D.troops + 1);
            if (D.isPlayer) s += diff.playerBias;
            if ((F.grudge[o] || -1e9) > G.time - 60) s += 0.4;
            s += (cnt.get(o) / 200);
            if (s > bs) { bs = s; best = o; }
          }
          if (best && (bs > 0.9 || p > 0.92)) G.launchAttack(F, best, F.troops * (bs > 1.5 ? 0.5 : 0.35));
          else if ((cnt.size === 0 || (!cnt.get(0) && p > 0.85)) && F.bcount.docks && G.boats.filter(b => b.att === F.id).length < 1) {
            // go by sea
            let target = -1;
            for (let t = 0; t < 60; t++) {
              const j = pick(G.coastalList), o = owner[j];
              if (o === F.id || (o && G.isTruce(F.id, o))) continue;
              if (!o) { target = j; break; }
              if (target < 0 && G.fams[o].troops < F.troops) target = j;
            }
            if (target >= 0) G.sendBoat(F, target, F.troops * 0.4);
          }
        }
      }

      // --- build
      const hostileNb = [...cnt.keys()].some(o => o && !G.isTruce(F.id, o));
      let want = null;
      if (!F.bcount.docks && coastSample.length && (!cnt.get(0) || F.havana) && (F.havana || rng() < 0.4)) want = 'docks';
      else {
        const r = rng();
        want = r < 0.4 ? 'safehouse' : r < 0.75 ? 'front' : (hostileNb ? 'guard' : 'front');
      }
      if (F.cash > buildCost(F, want) + 100) {
        const spots = want === 'docks' ? coastSample : ownSample;
        for (const s of spots) if (G.build(F, want, s) === true) break;
      }

      // --- crew
      if (F.crew.length < 3 && F.cash > recruitCost(F) + 300 && rng() < 0.3) G.recruit(F);

      // --- operations
      const rivals = [...cnt.keys()].filter(o => o && !G.isTruce(F.id, o));
      if (F.spec.arsonist && F.cool.firebomb <= G.time && F.cash > FIREBOMB_COST + 600 && rivals.length && rng() < 0.25) {
        let t = rivals.reduce((a, b) => (G.fams[b].troops > G.fams[a].troops ? b : a));
        if (rivals.includes(1) && rng() < 0.3 + diff.playerBias) t = 1;
        const j = edge.get(t);
        if (j !== undefined && owner[j] === t) G.firebomb(F, j);
      }
      if (F.spec.safecracker && F.cool.heist <= G.time && rng() < 0.25) {
        const others = G.fams.filter(x => x && x.alive && x.id !== F.id && !G.isTruce(F.id, x.id));
        if (others.length) { const t = others.reduce((a, b) => (b.cash > a.cash ? b : a)); if (t.cash > 800) G.heist(F, t.id); }
      }
      if (F.cash > 2000 && rng() < 0.05 + diff.playerBias * 0.05) {
        const t = (rng() < 0.5 && P.alive && P.crew.length && !G.isTruce(F.id, 1)) ? P : pick(G.fams.filter(x => x && x.alive && x.id !== F.id && x.crew.length));
        if (t && !G.isTruce(F.id, t.id)) G.hit(F, t.id);
      }
      if (F.heat > 65 && F.cash > bribeCost(F) + 300) G.bribe(F);

      // --- protect the Don
      if (F.cool.relocate <= G.time && F.cash > RELOCATE_COST && ownSample.length) {
        const th = G.threatToCompound(F);
        if (th && th.dist < 7 && G.attacks.some(a => a.def === F.id)) {
          let best = -1, bd = -1;
          for (const s2 of ownSample) { const d = dist2(s2, th.tile); if (d > bd) { bd = d; best = s2; } }
          if (best >= 0 && bd > 150) G.relocate(F, best);
        }
      }

      // --- diplomacy with player
      const underAttack = G.attacks.some(a => a.att === 1 && a.def === F.id);
      if (underAttack && F.troops < P.troops * 0.6 && rng() < 0.12 && !G.offers.some(o => o.from === F.id) && !G.isTruce(F.id, 1)) {
        G.offers.push({ from: F.id, expires: G.time + 15 });
        addLog(`${F.don} sends a messenger: he wants a sit-down.`, 'info');
      }
    }

    function checkEnd() {
      if (G.phase !== 'play') return;
      const P = G.player;
      const share = P.tiles / G.landCount;
      const aliveAI = G.fams.filter(f => f && !f.isPlayer && f.alive);
      if (share >= 0.6 || aliveAI.length === 0) {
        G.phase = 'over';
        G.result = { win: true, reason: aliveAI.length === 0 ? 'Every rival Don is dead or in exile.' : 'You control 60% of the city.' };
        addLog(`${P.don.toUpperCase()} IS CROWNED BOSS OF ALL BOSSES.`, 'major');
        return;
      }
      for (const F of aliveAI) if (F.tiles / G.landCount >= 0.6) {
        G.phase = 'over';
        G.result = { win: false, reason: `${F.don} now controls the city. You've been pushed out.` };
      }
    }

    // ---- main tick
    G.tick = function () {
      if (G.phase !== 'play') return;
      G.time += TICK; G.tickN++;
      for (let f = 1; f < G.fams.length; f++) { const F = G.fams[f]; if (F.alive) econTick(F, TICK); }
      attackTick();
      boatTick(TICK);
      for (let f = 2; f < G.fams.length; f++) {
        const F = G.fams[f];
        if (!F.alive || G.phase !== 'play') continue;
        if (G.time >= F.nextThink) { F.nextThink = G.time + diff.think * (0.7 + rng() * 0.6); aiThink(F); }
      }
      if (G.tickN % 10 === 0) secondTick();
      G.effects = G.effects.filter(e => G.time - e.t < 2);
    };
    G.aiThink = aiThink;
    G.secondTick = secondTick;
    G.computeFrontier = computeFrontier;
    return G;
  }

  return { createGame, W, H, N, WATER, LAND, BRIDGE, RACKETS, BUILDINGS, SPECS, TICK };
})();
if (typeof module !== 'undefined') module.exports = Engine;

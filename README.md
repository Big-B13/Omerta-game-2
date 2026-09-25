# Omertà — The Climb (1955)

A single-player mafia strategy game. You start as a soldier with one racket and
climb the family tree — Capo, Underboss, Don — while six rival families do the
same. Empire of Sin's city management, Godfather 2's family and recruitment.

## Play
Open `index.html` in any modern browser. Nothing to install.

## How a week works
You get two moves a week (three once you are Don). Taking a racket costs a move
and soldiers. Then press End Week: the rackets pay out, your crew's loyalty
drifts, and every rival family makes its moves.

- Click a racket on the map to take it. Empty ones are cheap; a family's racket
  means a fight.
- Drag to pan, scroll to zoom.
- Build (safehouse, front, guard post, still) on a district where you hold a racket.
- Recruit made men from the left panel. Each specialty unlocks something:
  Arsonist (F to firebomb), Safecracker (heists), Enforcer (I to intimidate),
  Medic, Diplomat, Earner, Fixer, Bruiser.
- Bribe the precinct when heat gets high, or the cops raid your rackets.
- Ask a family for a truce, order a hit, or crack their counting room from the
  Families panel.

## Winning
Become the Don, then either hold the biggest share of the city's rackets or
finish every rival family. Lose the crew's loyalty, or your own life, and it is
over.

## Source
- `src/engine2.js` — the game, no DOM, also runs in Node
- `src/ui2.js` — map, panels, input
- `src/engine.js` — the New York map generator the city is drawn from
- `python3 build.py` rebuilds `index.html`

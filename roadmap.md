# Drink Up! — Roadmap

> Last updated: 2026-03-13

---

## Phase 1: Core Gameplay Loop ✅

Everything needed for a playable bartending game with guests, drinks, and consequences.

| ID | Feature | Status |
|----|---------|--------|
| 1A | Chatting system (Space on drinking guest, reveals traits/preferences) | ✅ Done |
| 1B | Guest Card HUD (Vue panel when facing guest — name, bars, traits, preference) | ✅ Done |
| 1C | Drink preferences per guest (preferred drink bonus, chat reveals) | ✅ Done |
| 1D | Cut-off card item + card holder appliance | ✅ Done |
| 1E | Overserve detection — server logic, police attention, raids | ✅ Done |
| 1F | Fight system (drunk + unhappy → fight, AOE happiness drop, player resolves) | ✅ Done |
| 1G | Slip & fall system (drunk guest + mess → slip chance) | ✅ Done |
| 1H | Shift cycle (service → closing → prep) + shift summary + menu/stock config | ✅ Done |
| 1I | Queue system (table guests walk to bar queue, get served, return to seat) | ✅ Done |
| 1J | Event toast system (19 event types) | ✅ Done |

---

## Phase 2: Incomplete Mechanics ✅

Features that were partially wired up but missing logic, feedback, or integration.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 2A | Overserve visual feedback | Red screen flash + shake on overserve. Triggered via `Level.triggerOverserveFlash()` from GUEST_OVERSERVED event. | ✅ Done |
| 2B | HIGHROLLER trait effect | 1.5x tip multiplier applied in Engine serve logic (Engine.ts:552-554). | ✅ Done |
| 2C | CLEANLY trait effect | CLEANLY guests skip mess creation entirely (Engine.ts:1257). | ✅ Done |
| 2D | Trash system (BIN + TRASH_BAG) | BIN accepts items, creates TRASH_BAG on pickup, dump at entrance. Full cycle works. | ✅ Done |
| 2E | Extra player starting money | 2nd+ player joining adds `moneyPerExtraPlayer` ($100) via `Engine.addMoney()`. | ✅ Done |
| 2F | Glass type sub-menu | Deferred — requires glass-recipe enforcement design first. GRAB_VARIANTS infrastructure ready. | ⏳ Deferred |

---

## Phase 3: Economy & Tipping ✅

Give money more meaning. Currently serve = flat menu price, no variance.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 3A | Tip system | Tips based on: guest happiness, serve speed, preferred drink served, HIGHROLLER multiplier (2B). Separate tip display from base price in toast. | ✅ Done |
| 3B | Shift-end expenses | Restock (proportional to depletion), breakage ($25/fight), waste (drinks left on surfaces). Calculated before shift summary, displayed in ShiftSummary.vue. | ✅ Done |
| 3C | Reputation → guest quality | Three tiers (LOW/NORMAL/HIGH) based on reputation. HIGH = gold outline, more positive traits, +10 patience/happiness, 1.3x tips. LOW = more negative traits, -10 patience/happiness, 0.7x tips. Visible in GuestCardHUD. | ✅ Done |
| 3D | Upgrades (between shifts) | 3 upgrades: Fast Sink (3 lvl, wash speed), Stock Capacity (3 lvl, +5/+10/+15), Extra Queue (2 lvl, +3/+6 slots). Keyboard-nav panel during prep. 11 tests. | ✅ Done |

---

## Phase 4: Depth & Systems 🍹

Interlocking systems that make each shift feel different and each guest feel like a person. Full design in `.claude/plans/gleaming-bouncing-muffin.md`.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 4.1 | Personality system | 7 deadly sins/virtues as continuous floats [0,1]. Gaussian generation per tier. Composite traits derived from thresholds. All behavioral formulas use floats directly (fight threshold, tip mult, mess chance, sip rate, chat bonus). | ✅ Done |
| 4.2 | Dual slot system | 2 slots per seat (food+drink, or 2 drinks, or 2 food). Gluttony drives chance of double orders. Independent progress per slot. | Not started |
| 4.3 | Multi-step drinks | Garnish Station + Shaker appliances. 4 complexity tiers (simple/standard/cocktail/signature). 8 new recipes. Pride influences what guests choose to order. | Not started |
| 4.4 | Food system | Kitchen Window appliance (stocked source with sub-menu). Pretzels/Nachos/Sliders. Food slows drunkenness accumulation (not reduces). Gluttony-driven food ordering. | Not started |
| 4.5 | Population pool + regulars | 1000 townsfolk generated on session start. Bar affinity score drives spawning. Regulars (5+ visits) get name tags, "the usual", quick-serve recognition bonus. | Not started |
| 4.6 | Party system + group dynamics + atmosphere | Mood sync within radius (envy/kindness driven). Party mood averaging. Fight cascade (wrath > 0.7 nearby guests may join). Bar atmosphere score (0-100) affects happiness decay. | Not started |
| 4.7 | Special events | Per-shift random modifier (~40% chance). Happy Hour, VIP Night, Trivia Night, Health Inspector, Live Music, Sports Night. Announced during prep. | Not started |
| 4.8 | Tray system + combo | Tray Stand upgrade (carry 2/3 items). Combo system: consecutive serves within 5s build tip bonus (10%→25%→50%). | Not started |
| 4.9 | New upgrades | Tray Stand (2 lvl), Kitchen (2 lvl), Garnish Station (1 lvl), Shaker (1 lvl), Jukebox (2 lvl). Appliance upgrades place during prep. | Not started |
| 4.10 | Compendium system | Persistent collection tracker: Townsfolk (1000), Drinks, Appliances, Composite Traits, Events. Multi-bar vision (dive bar, cocktail lounge, etc.) for completionists. | Not started |

---

## Phase 5: Polish & Juice 🎨

Feel, feedback, and presentation.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 5A | Sound effects | Pour sounds, glass clink, cash register, crowd ambience, fight sounds, police siren, last call bell. Use Howler.js or Web Audio API. | Not started |
| 5B | Music | Background bar music, phase-specific tracks (upbeat service, mellow closing, prep planning). Volume control in HUD. | Not started |
| 5C | Sprite art | Replace colored rectangles/pills with actual pixel art or SVG sprites. Bartender, guests, appliances, items, drinks. | Not started |
| 5D | Animations | Pour animation at appliances, glass slide on counter, guest drinking animation, fight dust cloud, slip pratfall, cash float on tip. | Not started |
| 5E | Tutorial / onboarding | First-shift guided walkthrough: move, grab glass, craft drink, serve guest, clean up. Highlight system for interactable objects. | Not started |
| 5F | Responsive UI | Scale canvas + HUD for different screen sizes. Mobile touch controls (virtual d-pad + action buttons). | Not started |

---

## Phase 6: Multiplayer & Metagame 🌐

Make co-op deeper and add reasons to keep playing.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 6A | Role specialization | Optional roles: Bartender (crafting speed bonus), Barback (movement speed bonus), Bouncer (fight resolve speed, can eject guests). Role select on join. | Not started |
| 6B | Competitive mode | Split bar — each player has their own section + shared guests. Score based on individual tips + shared reputation. | Not started |
| 6C | Progression / unlocks | Cross-session progression: unlock new drink recipes, bar layouts, cosmetics. Persistent via localStorage or simple backend. | Not started |
| 6D | Leaderboards | Per-shift stats: fastest serve, most tips, most overserves. End-of-shift awards screen. | Not started |
| 6E | Spectator mode improvements | Camera controls, guest info on hover, live stats overlay for spectators. | Not started |

---

## Widget System (architectural refactor) ✅

Config-driven appliance behavior. All 13 appliance types ported. Engine.ts switch trees and DrinkCrafter.ts removed.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| W1 | Widget framework | `Widget` class, `IWidgetConfig`, `IWidgetContext`, Engine delegation via `instanceof Widget` | ✅ Done |
| W2 | BIN port | First Widget-backed appliance — trash collect mode, 3 top slots, place-only | ✅ Done |
| W3 | CARD_HOLDER port | Infinite `sourceItem = CUT_OFF_CARD`, `returnableItems = [CUT_OFF_CARD]`, no slots | ✅ Done |
| W4 | GLASS_SHELF port | `sourceItem = GLASS`, stock tracked, `returnableItems = [GLASS]` | ✅ Done |
| W5 | COUNTER port | 1 top slot, 1 south seat, place/pickup | ✅ Done |
| W6 | TABLE / HIGHTOP port | Seats only (4 per-edge seats), no slots | ✅ Done |
| W7 | SERVICE_BAR port | 8 top slots, normal mode (place + pickup via `getItem`) | ✅ Done |
| W8 | DRAFT / WINE / LIQUOR port | `storageVariants`, craft via sub-menu, stock tracked | ✅ Done |
| W9 | SINK / ICE_WELL port | Transforms: ICE_WELL instant (spirit→HIGHBALL), SINK timed (`startTimedInteract`) | ✅ Done |
| W10 | BAR_QUEUE port | 6 top slots, 3-wide, normal mode | ✅ Done |
| W11 | Remove old Engine.ts switch tree | Deleted legacy grab/craft switch trees + DrinkCrafter.ts | ✅ Done |
| W-D1 | Wine bottles / kegs | Storage → surface → pour until empty. Kegs = big bottles. | Deferred |
| W-D2 | User-configurable sizing + level editor | Dev tool for building appliances; user placement between shifts (prep phase) | Deferred |

---

## Priority Order

**Immediate**: Phase 4.2–4.4 — dual slots, multi-step drinks, food system. These are structural changes everything else builds on.

**Medium-term**: Phase 4.5–4.7 — population pool, group dynamics, events. Social depth and shift variety.

**Later**: Phase 4.8–4.10 — tray/combo, upgrades, compendium. Quality-of-life and long-term goals.

**Long-term**: Phase 5 (polish) + Phase 6 (multiplayer depth) once Phase 4 systems are solid.

---

## Notes

- Each phase item should be its own commit or small PR
- Update this file when items are completed or priorities shift
- Full design document: `.claude/plans/gleaming-bouncing-muffin.md` — detailed specs, formulas, feedback loops
- Test suite: 45 in-browser tests (`__TEST.runAll()`) + 254 Vitest unit tests (`npx vitest run`) — add tests for new features
- Build validation: `npx vite build` (not `npm run build`)

# Drink Up! — Roadmap

> Last updated: 2026-03-11

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

## Phase 3: Economy & Tipping 💰

Give money more meaning. Currently serve = flat menu price, no variance.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 3A | Tip system | Tips based on: guest happiness, serve speed, preferred drink served, HIGHROLLER multiplier (2B). Separate tip display from base price in toast. | Not started |
| 3B | Shift-end expenses | Deduct costs at shift end: ingredient waste (unsold stock), breakage (fights), fines (raids already deduct). Makes prep-phase menu config matter more. | Not started |
| 3C | Reputation → guest quality | Higher rep attracts wealthier guests (bigger tips, more HIGHROLLER). Lower rep attracts cheaper/rowdier guests (more VIOLENT, MESSY). Guest "tier" system. | Not started |
| 3D | Upgrades (between shifts) | Spend money on permanent improvements: faster sink, larger stock capacity, extra queue slots, auto-restock, better glasses (slower patience decay). Prep-phase upgrade panel. | Not started |

---

## Phase 4: Content & Variety 🍹

More things to make and do behind the bar.

| ID | Feature | Detail | Status |
|----|---------|--------|--------|
| 4A | Food / snacks | New appliance (kitchen window or snack shelf). Serving food slows drunkenness gain, adds happiness. Pairs with certain drinks. | Not started |
| 4B | Multi-step cocktails | Recipes requiring 2+ appliance steps (e.g., glass → liquor rail → ice well → garnish station). New appliance: garnish station. | Not started |
| 4C | Special events | Random per-shift modifiers: Happy Hour (2x speed, 1.5x guests), VIP Guest (big tipper, specific order), Trivia Night (guests stay longer, order more), Ladies' Night (drink discounts, more guests). | Not started |
| 4D | Guest group dynamics | Groups share happiness influence. If one member fights/leaves angry, others get unhappy. Group orders (everyone orders at once). | Not started |
| 4E | Seasonal / rotating menu | Certain drinks only available some shifts. Limited ingredients force menu planning. Specials board with bonus price. | Not started |

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

**Immediate**: Phase 3 — economy gives the game a goal and makes decisions matter. Widget migration is complete (all 13 types ported).

**Medium-term**: Phase 4 + 5 — content and polish in parallel.

**Long-term**: Phase 6 — multiplayer depth once core is solid. Widget deferred items (W-D1, W-D2) fit here too.

---

## Notes

- Each phase item should be its own commit or small PR
- Update this file when items are completed or priorities shift
- Test suite: 45 in-browser tests (`__TEST.runAll()`) + 217 Vitest unit tests (`npx vitest run`) — add tests for new features
- Build validation: `npx vite build` (not `npm run build`)

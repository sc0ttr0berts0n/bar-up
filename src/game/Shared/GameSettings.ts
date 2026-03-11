const GameSettings = {
  // Grid
  tileSize: 48,
  gridWidth: 20,
  gridHeight: 15,

  // Timing
  tickRate: 60,
  updateRate: 20,

  // Players
  maxPlayers: 3,
  playerMoveSpeed: 6, // tiles per second
  interactDuration: 0.3, // seconds for timed interactions
  washDuration: 1.0, // seconds to wash a dirty glass at the sink

  // Guests
  guestMoveSpeed: 3, // tiles per second
  guestSpawnInterval: 30, // seconds between party arrivals (solo baseline)
  maxPartySize: 4,
  maxConcurrentGuests: 8, // cap total guests in the bar (solo baseline)
  playerCountGuestScale: [1.0, 1.5, 2.0] as number[], // multiplier per player count (1p, 2p, 3p)
  partySizeWeights: [40, 35, 15, 10] as number[], // % chance for party of 1,2,3,4
  counterPreferMaxPartySize: 2, // parties <= this size prefer bar counter over tables
  queuePatienceDecayRate: 0.3, // per second while QUEUED
  decidingDuration: [5, 10] as [number, number], // min/max seconds for first order
  reorderPauseDuration: [20, 35] as [number, number], // min/max seconds between drinks
  drinkingDuration: [30, 60] as [number, number],
  waitingPatience: 45, // seconds before happiness tanks

  // Shift phases (seconds)
  servicePhaseDuration: 300,
  closingPhaseDuration: 90,
  prepPhaseDuration: 150,

  // Economy
  startingMoney: 500,
  moneyPerExtraPlayer: 100,

  // Patience (urgency — drives leaving)
  patienceMax: 100,
  patienceStarting: 60,
  patienceServeBonus: 40, // rapid recovery when served a drink
  patienceDecayRate: 0.5, // per second while SLIPPED (generic)
  patienceWaitingForDrinkDecayRate: 0.25, // per second while waiting after order taken
  patienceOrderTakenBonus: 10, // patience boost when order is taken
  patienceReadyDecayRate: 0.3, // per second while in READY_TO_ORDER past timer

  // Happiness (satisfaction — drives reputation)
  happinessMax: 100,
  happinessStarting: 60,
  happinessServeBonus: 10, // small satisfaction boost when served

  // Reputation
  reputationPerHappyGuest: 2,
  reputationPerSadGuest: -3,

  // Drunkenness
  sipsPerDrink: 5, // discrete sips per drink
  sipDrunkenness: 0.06, // drunkenness gained per sip
  drunkennessDecayRate: 0.003, // passive decay per second (metabolism)
  drunkGoalRange: [0.2, 1.2] as [number, number], // min/max drunk goal per guest
  drunkCoastDuration: [15, 30] as [number, number], // seconds to coast when over goal
  drunkLeaveChance: 0.4, // chance to leave vs coast when over goal

  // Messes
  messChanceBase: 0.1, // base chance of mess when finishing a drink
  messChanceDrunkBonus: 0.3, // added chance per 1.0 drunkenness

  // Chatting
  chatHappinessBonus: 5, // happiness gained per chat interaction
  chatRevealBaseChance: 0.2, // base chance to reveal info on chat
  chatRevealChancePerChat: 0.2, // additional chance per previous chat
  chatInitialCooldown: [5, 15] as [number, number], // seconds before first chat available
  chatCooldownRange: [10, 30] as [number, number], // seconds between chats

  // Drink Preferences
  preferredDrinkBonus: 15, // extra happiness when serving preferred drink

  // Overserve
  overserveDrunkennessThreshold: 0.8, // drunkenness level that triggers overserve
  overserveReputationPenalty: -2, // reputation hit per overserve

  // Police
  policeAttentionDecayRate: 0.02, // per second (50s to decay 1 point)
  policeWarningThreshold: 3, // attention level that triggers warning
  policeRaidThreshold: 5, // attention level that triggers a raid
  policeRaidMoneyPenalty: 200,
  policeRaidReputationPenalty: -5,
  policeRaidDuration: 30, // seconds — no new guests during raid

  // Waiting at door
  waitingAtDoorTimeout: 15, // seconds before party gives up waiting

  // Traits
  lightweightDrunkMultiplier: 1.5,
  lushDrunkMultiplier: 0.7,
  messyMessMultiplier: 1.5,
  impatientTimerMultiplier: 0.6,
  impatientFastServeBonus: 10,
  highrollerTipMultiplier: 1.5,

  // Bar Fight (VIOLENT trait)
  fightDrunkThreshold: 0.7,
  fightHappinessThreshold: 25,
  fightAoeRadius: 3, // tiles
  fightAoeHappinessDrop: 15,
  fightTimeoutSeconds: 20,

  // Slip & Fall
  slipDrunkThreshold: 0.4,
  slipHappinessPenalty: 15,
  slipChance: 0.5, // chance to slip when drunk guest walks through mess

  // Last Call
  lastCallTimeRemaining: 60, // seconds before end of service to trigger last call
  lastCallOrderChance: 0.6, // chance a guest decides to order one more drink
  lastCallChugSpeedMultiplier: 2.0, // how fast drinking guests chug during last call
  lastCallDecideSpeed: 3.0, // seconds for last-call deciding (fast)
  overtimeHardCap: 60, // max seconds overtime can last
} as const;

export default GameSettings;

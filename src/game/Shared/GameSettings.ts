const GameSettings = {
  // Grid
  tileSize: 48,
  gridWidth: 20,
  gridHeight: 15,

  // Timing
  tickRate: 60,
  updateRate: 20,

  // Players
  maxPlayers: 4,
  playerMoveSpeed: 6, // tiles per second
  interactDuration: 0.3, // seconds for timed interactions

  // Guests
  guestMoveSpeed: 3, // tiles per second
  guestSpawnInterval: 15, // seconds between party arrivals during service
  maxPartySize: 4,
  maxConcurrentGuests: 16, // cap total guests in the bar at once
  partySizeWeights: [40, 35, 15, 10] as number[], // % chance for party of 1,2,3,4
  counterPreferMaxPartySize: 2, // parties <= this size prefer bar counter over tables
  queueHappinessDecayRate: 0.3, // per second while QUEUED
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

  // Happiness
  happinessMax: 100,
  happinessStarting: 60,
  happinessServeBonus: 25,
  happinessDecayRate: 0.5, // per second while in WAITING_FOR_ORDER
  happinessReadyDecayRate: 0.3, // per second while in READY_TO_ORDER past timer

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

  // Drink Preferences
  preferredDrinkBonus: 15, // extra happiness when serving preferred drink

  // Overserve
  overserveDrunkennessThreshold: 0.8, // drunkenness level that triggers overserve
  overserveReputationPenalty: -2, // reputation hit per overserve

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
} as const;

export default GameSettings;

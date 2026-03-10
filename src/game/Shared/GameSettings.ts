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
  guestSpawnInterval: 8, // seconds between party arrivals during service
  maxPartySize: 2,
  maxConcurrentGuests: 8, // cap total guests in the bar at once
  decidingDuration: [3, 6] as [number, number], // min/max seconds for first order
  reorderPauseDuration: [15, 25] as [number, number], // min/max seconds between drinks
  drinkingDuration: [6, 12] as [number, number],
  waitingPatience: 30, // seconds before happiness tanks

  // Shift phases (seconds)
  servicePhaseDuration: 150,
  closingPhaseDuration: 60,
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
  baseDrunkennessRate: 0.05, // drunkenness gained per second while drinking
  drunkennessAcceleration: 0.25, // multiplier increase per completed order
} as const;

export default GameSettings;

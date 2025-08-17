import { AbstractTemplate } from '@/common/abstract/abstract.template';

/** Server visibility: 2 = public, 1 = friends only, 0 = not listed. */
export enum ServerVisibility {
  NotListed = 0,
  FriendsOnly = 1,
  Public = 2,
}

/** Player Killing Settings. */
export enum PlayerKillingMode {
  NoKilling = 0,
  KillAlliesOnly = 1,
  KillStrangersOnly = 2,
  KillEveryone = 3,
}

/** Enemy difficulty. */
export enum EnemyDifficulty {
  Normal = 0,
  Feral = 1,
}

/** Feral sense level. */
export enum ZombieFeralSenseLevel {
  Off = 0,
  Day = 1,
  Night = 2,
  All = 3,
}

/** Movement speed tier. */
export enum MoveSpeedTier {
  Walk = 0,
  Jog = 1,
  Run = 2,
  Sprint = 3,
  Nightmare = 4,
}

/** Death penalty mode. */
export enum DeathPenaltyMode {
  None = 0,
  ClassicXPPenalty = 1,
  Injured = 2,
  PermanentDeath = 3,
}

/** Drop on death behavior. */
export enum DropOnDeathOption {
  Nothing = 0,
  Everything = 1,
  ToolbeltOnly = 2,
  BackpackOnly = 3,
  DeleteAll = 4,
}

/** Drop on quit behavior. */
export enum DropOnQuitOption {
  Nothing = 0,
  Everything = 1,
  ToolbeltOnly = 2,
  BackpackOnly = 3,
}

/** Land claim decay mode. */
export enum LandClaimDecayMode {
  SlowLinear = 0,
  FastExponential = 1,
  None = 2,
}

/** Supported RWG sizes. */
export enum WorldGenSizeOption {
  S6144 = 6144,
  S8192 = 8192,
  S10240 = 10240,
}

/** Region selection. */
export enum RegionOption {
  NorthAmericaEast = 'NorthAmericaEast',
  NorthAmericaWest = 'NorthAmericaWest',
  CentralAmerica = 'CentralAmerica',
  SouthAmerica = 'SouthAmerica',
  Europe = 'Europe',
  Russia = 'Russia',
  Asia = 'Asia',
  MiddleEast = 'MiddleEast',
  Africa = 'Africa',
  Oceania = 'Oceania',
}

/** Game mode. */
export enum GameModeOption {
  GameModeSurvival = 'GameModeSurvival',
}

/** View distance allowed values. */
export enum ViewDistance {
  D6 = 6,
  D7 = 7,
  D8 = 8,
  D9 = 9,
  D10 = 10,
  D11 = 11,
  D12 = 12,
}

/** Allow spawn near friend options. */
export enum AllowSpawnNearFriendOption {
  Disabled = 0,
  Always = 1,
  ForestOnly = 2,
}

/** Storm frequency options. */
export enum StormFrequencyOption {
  Off = 0,
  F50 = 50,
  F100 = 100,
  F150 = 150,
  F200 = 200,
  F300 = 300,
  F400 = 400,
  F500 = 500,
}

/** Game difficulty 0 (easiest) to 5 (hardest). */
export enum GameDifficultyLevel {
  Easiest = 0,
  Easy = 1,
  Normal = 2,
  Hard = 3,
  VeryHard = 4,
  Hardest = 5,
}

export type SdtdServerConfigXmlTemplateVars = {
  /**
   * Whatever you want the name of the server to be.
   */
  ServerName: string;
  /**
   * Whatever you want the server description to be, shown in the server browser.
   */
  ServerDescription: string;
  /**
   * Website URL for the server, shown in the server browser as a clickable link.
   */
  ServerWebsiteURL: string;
  /**
   * Password to gain entry to the server.
   */
  ServerPassword: string;
  /**
   * If set, users will see this message on join and must confirm before continuing.
   * For complex changes, edit the "serverjoinrulesdialog" window in XUi.
   */
  ServerLoginConfirmationText: string;
  /**
   * The region this server is in.
   * Values: NorthAmericaEast, NorthAmericaWest, CentralAmerica, SouthAmerica, Europe, Russia, Asia, MiddleEast, Africa, Oceania.
   */
  Region: RegionOption;
  /**
   * Primary language for players on this server. Use the English name (e.g., "German").
   */
  Language: string;

  // Networking
  /**
   * Port the server listens on. Keep within 26900–26905 or 27015–27020 for LAN discovery.
   */
  ServerPort: number;
  /**
   * Server visibility: 2 = public, 1 = friends, 0 = not listed.
   */
  ServerVisibility: ServerVisibility;
  /**
   * Disabled networking protocols (comma-separated). Possible values: LiteNetLib, SteamNetworking.
   */
  ServerDisabledNetworkProtocols: string;
  /**
   * Max speed in KiB/s for world transfer to a client on first connect. Max ~1300.
   */
  ServerMaxWorldTransferSpeedKiBs: number;

  // Slots
  /** Maximum concurrent players. */
  ServerMaxPlayerCount: number;
  /** Reserved slots count (only for players with specific permission level). */
  ServerReservedSlots: number;
  /** Required permission level to use reserved slots. */
  ServerReservedSlotsPermission: number;
  /** Admins can still join even if server reached MaxPlayerCount. */
  ServerAdminSlots: number;
  /** Required permission level to use admin slots. */
  ServerAdminSlotsPermission: number;

  // Admin interfaces
  /** Enable/disable the web dashboard. */
  WebDashboardEnabled: boolean;
  /** Port of the web dashboard. */
  WebDashboardPort: number;
  /**
   * External URL to the web dashboard if behind a reverse proxy.
   * Needs the full URL (e.g., "https://domain.tld:1234/").
   */
  WebDashboardUrl: string;
  /** Enable/disable rendering of the map to tile images while exploring. */
  EnableMapRendering: boolean;

  /** Enable/disable the telnet interface. */
  TelnetEnabled: boolean;
  /** Port of the telnet server. */
  TelnetPort: number;
  /** Password to gain entry to telnet. If empty, server listens only on loopback. */
  TelnetPassword: string;
  /** After this many wrong telnet passwords from one client, block that client. */
  TelnetFailedLoginLimit: number;
  /** How long the telnet block persists (seconds). */
  TelnetFailedLoginsBlocktime: number;

  /** Show a terminal window for log output / command input (Windows only). */
  TerminalWindowEnabled: boolean;

  // Folder and file locations
  /** Server admin file name. Path relative to UserDataFolder/Saves. */
  AdminFileName: string;

  // Other technical settings
  /** Enables/Disables crossplay. */
  ServerAllowCrossplay: boolean;
  /** Enables/Disables EasyAntiCheat. */
  EACEnabled: boolean;
  /** Ignore EOS sanctions when allowing players to join. */
  IgnoreEOSSanctions: boolean;
  /**
   * Hide logging of command execution.
   * 0 = show everything, 1 = hide only from Telnet/ControlPanel, 2 = also hide from remote clients, 3 = hide everything.
   */
  HideCommandExecutionLog: number;
  /**
   * Max map chunks that can be uncovered per player. Max map file size per player is (x * 512 Bytes).
   */
  MaxUncoveredMapChunksPerPlayer: number;
  /** If disabled, a player can join with any selected profile; if true, they join with the last profile. */
  PersistentPlayerProfiles: boolean;
  /**
   * In-game days since visiting a chunk before it resets to original state if not revisited or protected.
   */
  MaxChunkAge: number;
  /**
   * Maximum disk space allowance for each saved game (MB). Negative disables the limit.
   */
  SaveDataLimit: number;

  // World
  /** World name: "RWG" or existing world name in the Worlds folder. */
  GameWorld: string;
  /** RWG seed used for generating a new world. */
  WorldGenSeed: string;
  /** RWG world width/height. Supported: 6144–10240, multiple of 2048. */
  WorldGenSize: WorldGenSizeOption;
  /** Game name (affects save game name and decoration seed). */
  GameName: string;
  /** Game mode, e.g., "GameModeSurvival". */
  GameMode: GameModeOption;

  // Difficulty
  /** 0–5 (0 easiest, 5 hardest). */
  GameDifficulty: GameDifficultyLevel;
  /** Player block damage percentage (whole number). */
  BlockDamagePlayer: number;
  /** AI block damage percentage (whole number). */
  BlockDamageAI: number;
  /** AI block damage during blood moons percentage (whole number). */
  BlockDamageAIBM: number;
  /** XP gain multiplier percentage (whole number). */
  XPMultiplier: number;
  /** If player level <= this, a safe zone (no enemies) is created when spawned. */
  PlayerSafeZoneLevel: number;
  /** Hours in world time the safe zone exists. */
  PlayerSafeZoneHours: number;

  // Game Rules
  /** Cheat mode on/off. */
  BuildCreate: boolean;
  /** Real-time minutes per in-game day. */
  DayNightLength: number;
  /** In-game hours the sun shines per day. */
  DayLightLength: number;
  /** Enables biome hazards and loot stage caps to promote biome progression. */
  BiomeProgression: boolean;
  /** Adjusts the frequency of storms. 0% turns them off. */
  StormFreq: StormFrequencyOption;
  /**
   * Penalty after dying.
   * 0 = Nothing, 1 = Default: Classic XP Penalty, 2 = Injured, 3 = Permanent Death.
   */
  DeathPenalty: DeathPenaltyMode;
  /** On death: 0 = nothing, 1 = everything, 2 = toolbelt only, 3 = backpack only, 4 = delete all. */
  DropOnDeath: DropOnDeathOption;
  /** On quit: 0 = nothing, 1 = everything, 2 = toolbelt only, 3 = backpack only. */
  DropOnQuit: DropOnQuitOption;
  /** Bedroll dead zone radius (box radius). */
  BedrollDeadZoneSize: number;
  /** Real-world days a bedroll stays active after owner was last online. */
  BedrollExpiryTime: number;
  /**
   * First-time join near friend option.
   * 0 = Disabled, 1 = Always, 2 = Only near friends in forest biome.
   */
  AllowSpawnNearFriend: AllowSpawnNearFriendOption;

  // Performance related
  /** Max zombies on entire map at once. High impact on performance. */
  MaxSpawnedZombies: number;
  /** Max animals. Increasing helps with many players spread out. */
  MaxSpawnedAnimals: number;
  /** Max view distance a client may request (6–12). High impact on memory/perf. */
  ServerMaxAllowedViewDistance: ViewDistance;
  /** Max amount of Chunk mesh layers enqueued during mesh generation. */
  MaxQueuedMeshLayers: number;

  // Zombie settings
  /** Enable/disable enemy spawning. */
  EnemySpawnMode: boolean;
  /** 0 = Normal, 1 = Feral. */
  EnemyDifficulty: EnemyDifficulty;
  /** 0–3 (Off, Day, Night, All). */
  ZombieFeralSense: ZombieFeralSenseLevel;
  /** 0–4 (walk, jog, run, sprint, nightmare). */
  ZombieMove: MoveSpeedTier;
  /** 0–4 (walk, jog, run, sprint, nightmare). */
  ZombieMoveNight: MoveSpeedTier;
  /** 0–4 (walk, jog, run, sprint, nightmare). */
  ZombieFeralMove: MoveSpeedTier;
  /** 0–4 (walk, jog, run, sprint, nightmare). */
  ZombieBMMove: MoveSpeedTier;
  /** Blood moon frequency in days; 0 disables blood moons. */
  BloodMoonFrequency: number;
  /** Random deviation in days from BloodMoonFrequency. */
  BloodMoonRange: number;
  /** Hour that the red day number begins on a blood moon day; -1 to never show. */
  BloodMoonWarning: number;
  /** Max zombies alive per player during a blood moon horde (subject to game stage/party). */
  BloodMoonEnemyCount: number;

  // Loot
  /** Loot abundance percentage (whole number). */
  LootAbundance: number;
  /** Loot respawn days (whole number). */
  LootRespawnDays: number;
  /** Airdrop frequency in game-hours; 0 = never. */
  AirDropFrequency: number;
  /** If a marker is added to map/compass for air drops. */
  AirDropMarker: boolean;

  // Multiplayer
  /** Distance for party shared kill XP and quest objective credit. */
  PartySharedKillRange: number;
  /** Player killing: 0 = No Killing, 1 = Kill Allies Only, 2 = Kill Strangers Only, 3 = Kill Everyone. */
  PlayerKillingMode: PlayerKillingMode;

  // Land claim options
  /** Maximum allowed land claims per player. */
  LandClaimCount: number;
  /** Size in blocks protected by a keystone. */
  LandClaimSize: number;
  /** Keystones must be this many blocks apart (unless friends). */
  LandClaimDeadZone: number;
  /** Real-world days a player can be offline before claims expire. */
  LandClaimExpiryTime: number;
  /** 0 = Slow (Linear), 1 = Fast (Exponential), 2 = None. */
  LandClaimDecayMode: LandClaimDecayMode;
  /** Claim area block hardness multiplier when a player is online; 0 means infinite. */
  LandClaimOnlineDurabilityModifier: number;
  /** Claim area block hardness multiplier when a player is offline; 0 means infinite. */
  LandClaimOfflineDurabilityModifier: number;
  /** Minutes after logout that area transitions from online to offline hardness. */
  LandClaimOfflineDelay: number;

  // Dynamic Mesh
  /** Is Dynamic Mesh system enabled. */
  DynamicMeshEnabled: boolean;
  /** Is Dynamic Mesh system only active in player LCB areas. */
  DynamicMeshLandClaimOnly: boolean;
  /** Dynamic Mesh LCB chunk radius. */
  DynamicMeshLandClaimBuffer: number;
  /** How many items can be processed concurrently (higher uses more RAM). */
  DynamicMeshMaxItemCache: number;

  // Twitch
  /** Required permission level to use Twitch integration on the server. */
  TwitchServerPermission: number;
  /** If the server allows Twitch actions during a blood moon. */
  TwitchBloodMoonAllowed: boolean;

  /** Limits quests that contribute to tier progression per day; others still grant rewards. */
  QuestProgressionDailyLimit: number;
};

export class SdtdServerConfigXmlTemplate extends AbstractTemplate<SdtdServerConfigXmlTemplateVars> {
  templateFileName = '7dtd.serverConfig.xml.tpl';
  defaultVars: SdtdServerConfigXmlTemplateVars = {
    ServerName: 'My Game Host',
    ServerDescription: 'A 7 Days to Die server',
    ServerWebsiteURL: '',
    ServerPassword: '',
    ServerLoginConfirmationText: '',
    Region: RegionOption.NorthAmericaEast,
    Language: 'English',
    ServerPort: 26900,
    ServerVisibility: ServerVisibility.Public,
    ServerDisabledNetworkProtocols: 'SteamNetworking',
    ServerMaxWorldTransferSpeedKiBs: 512,
    ServerMaxPlayerCount: 8,
    ServerReservedSlots: 0,
    ServerReservedSlotsPermission: 100,
    ServerAdminSlots: 0,
    ServerAdminSlotsPermission: 0,
    WebDashboardEnabled: false,
    WebDashboardPort: 8080,
    WebDashboardUrl: '',
    EnableMapRendering: false,
    TelnetEnabled: true,
    TelnetPort: 8081,
    TelnetPassword: '',
    TelnetFailedLoginLimit: 10,
    TelnetFailedLoginsBlocktime: 10,
    TerminalWindowEnabled: true,
    AdminFileName: 'serveradmin.xml',
    ServerAllowCrossplay: false,
    EACEnabled: true,
    IgnoreEOSSanctions: false,
    HideCommandExecutionLog: 0,
    MaxUncoveredMapChunksPerPlayer: 131072,
    PersistentPlayerProfiles: false,
    MaxChunkAge: -1,
    SaveDataLimit: -1,
    GameWorld: 'Navezgane',
    WorldGenSeed: 'MyGame',
    WorldGenSize: WorldGenSizeOption.S6144,
    GameName: 'MyGame',
    GameMode: GameModeOption.GameModeSurvival,
    GameDifficulty: GameDifficultyLevel.Easy,
    BlockDamagePlayer: 100,
    BlockDamageAI: 100,
    BlockDamageAIBM: 100,
    XPMultiplier: 100,
    PlayerSafeZoneLevel: 5,
    PlayerSafeZoneHours: 5,
    BuildCreate: false,
    DayNightLength: 60,
    DayLightLength: 18,
    BiomeProgression: true,
    StormFreq: StormFrequencyOption.F100,
    DeathPenalty: DeathPenaltyMode.ClassicXPPenalty,
    DropOnDeath: DropOnDeathOption.Everything,
    DropOnQuit: DropOnQuitOption.Nothing,
    BedrollDeadZoneSize: 15,
    BedrollExpiryTime: 45,
    AllowSpawnNearFriend: AllowSpawnNearFriendOption.ForestOnly,
    MaxSpawnedZombies: 64,
    MaxSpawnedAnimals: 50,
    ServerMaxAllowedViewDistance: ViewDistance.D12,
    MaxQueuedMeshLayers: 1000,
    EnemySpawnMode: true,
    EnemyDifficulty: EnemyDifficulty.Normal,
    ZombieFeralSense: ZombieFeralSenseLevel.Off,
    ZombieMove: MoveSpeedTier.Walk,
    ZombieMoveNight: MoveSpeedTier.Sprint,
    ZombieFeralMove: MoveSpeedTier.Sprint,
    ZombieBMMove: MoveSpeedTier.Sprint,
    BloodMoonFrequency: 7,
    BloodMoonRange: 0,
    BloodMoonWarning: 8,
    BloodMoonEnemyCount: 8,
    LootAbundance: 100,
    LootRespawnDays: 7,
    AirDropFrequency: 72,
    AirDropMarker: true,
    PartySharedKillRange: 100,
    PlayerKillingMode: PlayerKillingMode.KillEveryone,
    LandClaimCount: 5,
    LandClaimSize: 41,
    LandClaimDeadZone: 30,
    LandClaimExpiryTime: 7,
    LandClaimDecayMode: LandClaimDecayMode.SlowLinear,
    LandClaimOnlineDurabilityModifier: 4,
    LandClaimOfflineDurabilityModifier: 4,
    LandClaimOfflineDelay: 0,
    DynamicMeshEnabled: true,
    DynamicMeshLandClaimOnly: true,
    DynamicMeshLandClaimBuffer: 3,
    DynamicMeshMaxItemCache: 3,
    TwitchServerPermission: 90,
    TwitchBloodMoonAllowed: false,
    QuestProgressionDailyLimit: 4,
  };
}

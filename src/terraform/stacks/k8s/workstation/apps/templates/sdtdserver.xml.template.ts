import { AbstractTemplate } from '@/common';
import path from 'path';

/**
 * @interface StdserverXmlTemplateVars
 * @description Interface for server configuration variables.
 */
interface SdtdserverXmlTemplateVars {
  /** @description Whatever you want the name of the server to be. */
  serverName?: string;
  /** @description Whatever you want the server description to be, will be shown in the server browser. */
  serverDescription?: string;
  /** @description Website URL for the server, will be shown in the server browser as a clickable link. */
  serverWebsiteURL?: string;
  /** @description Password to gain entry to the server. */
  serverPassword?: string;
  /** @description If set, the user will see the message during joining the server and has to confirm it before continuing. */
  serverLoginConfirmationText?: string;
  /** @description The region this server is in. */
  region?: string;
  /** @description Primary language for players on this server. */
  language?: string;
  /** @description Port you want the server to listen on. */
  serverPort?: number;
  /** @description Visibility of this server: 2 = public, 1 = only shown to friends, 0 = not listed. */
  serverVisibility?: number;
  /** @description Networking protocols that should not be used. */
  serverDisabledNetworkProtocols?: string;
  /** @description Maximum speed in kiB/s the world is transferred at to a client on first connect. */
  serverMaxWorldTransferSpeedKiBs?: number;
  /** @description Maximum Concurrent Players. */
  serverMaxPlayerCount?: number;
  /** @description Out of the MaxPlayerCount this many slots can only be used by players with a specific permission level. */
  serverReservedSlots?: number;
  /** @description Required permission level to use reserved slots above. */
  serverReservedSlotsPermission?: number;
  /** @description This many admins can still join even if the server has reached MaxPlayerCount. */
  serverAdminSlots?: number;
  /** @description Required permission level to use the admin slots above. */
  serverAdminSlotsPermission?: number;
  /** @description Enable/disable the web dashboard. */
  webDashboardEnabled?: boolean;
  /** @description Port of the web dashboard. */
  webDashboardPort?: number;
  /** @description External URL to the web dashboard if not just using the public IP of the server. */
  webDashboardUrl?: string;
  /** @description Enable/disable rendering of the map to tile images while exploring it. */
  enableMapRendering?: boolean;
  /** @description Enable/Disable the telnet. */
  telnetEnabled?: boolean;
  /** @description Port of the telnet server. */
  telnetPort?: number;
  /** @description Password to gain entry to telnet interface. */
  telnetPassword?: string;
  /** @description After this many wrong passwords from a single remote client, the client will be blocked from connecting to the Telnet interface. */
  telnetFailedLoginLimit?: number;
  /** @description How long will the block persist (in seconds). */
  telnetFailedLoginsBlocktime?: number;
  /** @description Show a terminal window for log output / command input (Windows only). */
  terminalWindowEnabled?: boolean;
  /** @description Server admin file name. Path relative to UserDataFolder/Saves. */
  adminFileName?: string;
  /** @description Enables/Disables crossplay. */
  serverAllowCrossplay?: boolean;
  /** @description Enables/Disables EasyAntiCheat. */
  eacEnabled?: boolean;
  /** @description Ignore EOS sanctions when allowing players to join. */
  ignoreEOSSanctions?: boolean;
  /** @description Hide logging of command execution. */
  hideCommandExecutionLog?: number;
  /** @description Override how many chunks can be uncovered on the ingame map by each player. */
  maxUncoveredMapChunksPerPlayer?: number;
  /** @description If disabled, a player can join with any selected profile. */
  persistentPlayerProfiles?: boolean;
  /** @description The number of in-game days which must pass since visiting a chunk before it will reset to its original state. */
  maxChunkAge?: number;
  /** @description The maximum disk space allowance for each saved game in megabytes (MB). */
  saveDataLimit?: number;
  /** @description "RWG" or any already existing world name in the Worlds folder. */
  gameWorld?: string;
  /** @description If RWG, this is the seed for the generation of the new world. */
  worldGenSeed?: string;
  /** @description If RWG, this controls the width and height of the created world. */
  worldGenSize?: number;
  /** @description Whatever you want the game name to be. */
  gameName?: string;
  /** @description Game mode, e.g., GameModeSurvival. */
  gameMode?: string;
  /** @description Game difficulty: 0 - 5, 0=easiest, 5=hardest. */
  gameDifficulty?: number;
  /** @description How much damage do players to blocks (percentage in whole numbers). */
  blockDamagePlayer?: number;
  /** @description How much damage do AIs to blocks (percentage in whole numbers). */
  blockDamageAI?: number;
  /** @description How much damage do AIs during blood moons to blocks (percentage in whole numbers). */
  blockDamageAIBM?: number;
  /** @description XP gain multiplier (percentage in whole numbers). */
  xpMultiplier?: number;
  /** @description If a player is less or equal this level, he will create a safe zone (no enemies) when spawned. */
  playerSafeZoneLevel?: number;
  /** @description Hours in world time this safe zone exists. */
  playerSafeZoneHours?: number;
  /** @description Cheat mode on/off. */
  buildCreate?: boolean;
  /** @description Real time minutes per in game day. */
  dayNightLength?: number;
  /** @description In game hours the sun shines per day. */
  dayLightLength?: number;
  /** @description Penalty after dying. */
  deathPenalty?: number;
  /** @description What to drop on death. */
  dropOnDeath?: number;
  /** @description What to drop on quit. */
  dropOnQuit?: number;
  /** @description Size of bedroll deadzone, no zombies will spawn inside this area. */
  bedrollDeadZoneSize?: number;
  /** @description Number of real world days a bedroll stays active after owner was last online. */
  bedrollExpiryTime?: number;
  /** @description This setting covers the entire map. There can only be this many zombies on the entire map at one time. */
  maxSpawnedZombies?: number;
  /** @description If your server has a large number of players, you can increase this limit to add more wildlife. */
  maxSpawnedAnimals?: number;
  /** @description Max view distance a client may request. */
  serverMaxAllowedViewDistance?: number;
  /** @description Maximum amount of Chunk mesh layers that can be enqueued during mesh generation. */
  maxQueuedMeshLayers?: number;
  /** @description Enable/Disable enemy spawning. */
  enemySpawnMode?: boolean;
  /** @description Enemy difficulty: 0 = Normal, 1 = Feral. */
  enemyDifficulty?: number;
  /** @description Zombie feral sense: 0-3 (Off, Day, Night, All). */
  zombieFeralSense?: number;
  /** @description Zombie move speed: 0-4 (walk, jog, run, sprint, nightmare). */
  zombieMove?: number;
  /** @description Zombie move speed at night: 0-4 (walk, jog, run, sprint, nightmare). */
  zombieMoveNight?: number;
  /** @description Zombie feral move speed: 0-4 (walk, jog, run, sprint, nightmare). */
  zombieFeralMove?: number;
  /** @description Zombie blood moon move speed: 0-4 (walk, jog, run, sprint, nightmare). */
  zombieBMMove?: number;
  /** @description What frequency (in days) should a blood moon take place. */
  bloodMoonFrequency?: number;
  /** @description How many days can the actual blood moon day randomly deviate from the above setting. */
  bloodMoonRange?: number;
  /** @description The Hour number that the red day number begins on a blood moon day. */
  bloodMoonWarning?: number;
  /** @description Number of zombies that can be alive at any time PER PLAYER during a blood moon horde. */
  bloodMoonEnemyCount?: number;
  /** @description Loot abundance percentage in whole numbers. */
  lootAbundance?: number;
  /** @description Days in whole numbers for loot to respawn. */
  lootRespawnDays?: number;
  /** @description How often airdrop occur in game-hours, 0 == never. */
  airDropFrequency?: number;
  /** @description Sets if a marker is added to map/compass for air drops. */
  airDropMarker?: boolean;
  /** @description The distance you must be within to receive party shared kill xp and quest party kill objective credit. */
  partySharedKillRange?: number;
  /** @description Player Killing Settings: 0 = No Killing, 1 = Kill Allies Only, 2 = Kill Strangers Only, 3 = Kill Everyone. */
  playerKillingMode?: number;
  /** @description Maximum allowed land claims per player. */
  landClaimCount?: number;
  /** @description Size in blocks that is protected by a keystone. */
  landClaimSize?: number;
  /** @description Keystones must be this many blocks apart. */
  landClaimDeadZone?: number;
  /** @description The number of real world days a player can be offline before their claims expire. */
  landClaimExpiryTime?: number;
  /** @description Controls how offline players land claims decay. */
  landClaimDecayMode?: number;
  /** @description How much protected claim area block hardness is increased when a player is online. */
  landClaimOnlineDurabilityModifier?: number;
  /** @description How much protected claim area block hardness is increased when a player is offline. */
  landClaimOfflineDurabilityModifier?: number;
  /** @description The number of minutes after a player logs out that the land claim area hardness transitions from online to offline. */
  landClaimOfflineDelay?: number;
  /** @description Is Dynamic Mesh system enabled. */
  dynamicMeshEnabled?: boolean;
  /** @description Is Dynamic Mesh system only active in player LCB areas. */
  dynamicMeshLandClaimOnly?: boolean;
  /** @description Dynamic Mesh LCB chunk radius. */
  dynamicMeshLandClaimBuffer?: number;
  /** @description How many items can be processed concurrently, higher values use more RAM. */
  dynamicMeshMaxItemCache?: number;
  /** @description Required permission level to use twitch integration on the server. */
  twitchServerPermission?: number;
  /** @description If the server allows twitch actions during a blood moon. */
  twitchBloodMoonAllowed?: boolean;
  /** @description Limits the number of quests that contribute to quest tier progression a player can complete each day. */
  questProgressionDailyLimit?: number;
}

export class SdtdserverXmlTemplate extends AbstractTemplate<SdtdserverXmlTemplateVars> {
  templateFilePath = path.join(
    process.cwd(),
    'assets/templates/sdtdserver.xml.tpl',
  );

  defaultVars: Required<SdtdserverXmlTemplateVars> = {
    serverName: '7DaysToDie',
    serverDescription: '7 Days to Die server',
    serverWebsiteURL: '',
    serverPassword: '',
    serverLoginConfirmationText: '',
    region: 'NorthAmericaEast',
    language: 'English',
    serverPort: 26900,
    serverVisibility: 2,
    serverDisabledNetworkProtocols: 'SteamNetworking',
    serverMaxWorldTransferSpeedKiBs: 512,
    serverMaxPlayerCount: 8,
    serverReservedSlots: 0,
    serverReservedSlotsPermission: 100,
    serverAdminSlots: 0,
    serverAdminSlotsPermission: 0,
    webDashboardEnabled: true,
    webDashboardPort: 8080,
    webDashboardUrl: '',
    enableMapRendering: true,
    telnetEnabled: true,
    telnetPort: 8081,
    telnetPassword: '',
    telnetFailedLoginLimit: 10,
    telnetFailedLoginsBlocktime: 10,
    terminalWindowEnabled: true,
    adminFileName: 'serveradmin.xml',
    serverAllowCrossplay: false,
    eacEnabled: true,
    ignoreEOSSanctions: false,
    hideCommandExecutionLog: 0,
    maxUncoveredMapChunksPerPlayer: 131072,
    persistentPlayerProfiles: false,
    maxChunkAge: -1,
    saveDataLimit: -1,
    gameWorld: 'Navezgane',
    worldGenSeed: 'asdf',
    worldGenSize: 6144,
    gameName: 'My Game',
    gameMode: 'GameModeSurvival',
    gameDifficulty: 1,
    blockDamagePlayer: 100,
    blockDamageAI: 100,
    blockDamageAIBM: 100,
    xpMultiplier: 100,
    playerSafeZoneLevel: 5,
    playerSafeZoneHours: 5,
    buildCreate: false,
    dayNightLength: 60,
    dayLightLength: 18,
    deathPenalty: 1,
    dropOnDeath: 1,
    dropOnQuit: 0,
    bedrollDeadZoneSize: 15,
    bedrollExpiryTime: 45,
    maxSpawnedZombies: 64,
    maxSpawnedAnimals: 50,
    serverMaxAllowedViewDistance: 12,
    maxQueuedMeshLayers: 1000,
    enemySpawnMode: true,
    enemyDifficulty: 0,
    zombieFeralSense: 0,
    zombieMove: 0,
    zombieMoveNight: 3,
    zombieFeralMove: 3,
    zombieBMMove: 3,
    bloodMoonFrequency: 7,
    bloodMoonRange: 0,
    bloodMoonWarning: 8,
    bloodMoonEnemyCount: 8,
    lootAbundance: 100,
    lootRespawnDays: 7,
    airDropFrequency: 72,
    airDropMarker: true,
    partySharedKillRange: 100,
    playerKillingMode: 3,
    landClaimCount: 3,
    landClaimSize: 41,
    landClaimDeadZone: 30,
    landClaimExpiryTime: 7,
    landClaimDecayMode: 0,
    landClaimOnlineDurabilityModifier: 4,
    landClaimOfflineDurabilityModifier: 4,
    landClaimOfflineDelay: 0,
    dynamicMeshEnabled: true,
    dynamicMeshLandClaimOnly: true,
    dynamicMeshLandClaimBuffer: 3,
    dynamicMeshMaxItemCache: 3,
    twitchServerPermission: 90,
    twitchBloodMoonAllowed: false,
    questProgressionDailyLimit: 4,
  };
}

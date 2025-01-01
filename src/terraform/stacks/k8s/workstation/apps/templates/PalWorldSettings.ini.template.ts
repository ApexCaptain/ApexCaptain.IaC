import { AbstractTemplate } from '@/common';
import path from 'path';

interface PalWorldSettingsIniTemplateVars {
  /**
   * @description Day time speed modifier
   * @default 1.000000
   */
  dayTimeSpeedRate?: number;

  /**
   * @description Night time speed modifier
   * @default 1.000000
   */
  nightTimeSpeedRate?: number;

  /**
   * @description Experience rate modifier
   * @default 1.000000
   */
  expRate?: number;

  /**
   * @description Pal catch rate modifier
   * @default 1.000000
   */
  palCaptureRate?: number;

  /**
   * @description Pal spawn rate modifier
   * @default 1.000000
   */
  palSpawnNumRate?: number;

  /**
   * @description Pal damage-dealt modifier
   * @default 1.000000
   */
  palDamageRateAttack?: number;

  /**
   * @description Pal damage-received modifier
   * @default 1.000000
   */
  palDamageRateDefense?: number;

  /**
   * @description Player damage-dealt modifier
   * @default 1.000000
   */
  playerDamageRateAttack?: number;

  /**
   * @description Player damage-received modifier
   * @default 1.000000
   */
  playerDamageRateDefense?: number;

  /**
   * @description Player hunger modifier
   * @default 1.000000
   */
  playerStomachDecreaceRate?: number;

  /**
   * @description Player stamina modifier
   * @default 1.000000
   */
  playerStaminaDecreaceRate?: number;

  /**
   * @description Player health regeneration rate modifier
   * @default 1.000000
   */
  playerAutoHPRegeneRate?: number;

  /**
   * @description Player sleeping health regeneration rate modifier
   * @default 1.000000
   */
  playerAutoHpRegeneRateInSleep?: number;

  /**
   * @description Pal hunger modifier
   * @default 1.000000
   */
  palStomachDecreaceRate?: number;

  /**
   * @description Pal stamina modifier
   * @default 1.000000
   */
  palStaminaDecreaceRate?: number;

  /**
   * @description Pal health regeneration rate modifier
   * @default 1.000000
   */
  palAutoHPRegeneRate?: number;

  /**
   * @description Built object health rate modifier
   * @default 1.000000
   */
  buildObjectHpRate?: number;

  /**
   * @description Pal sleeping health regeneration rate modifier
   * @default 1.000000
   */
  palAutoHpRegeneRateInSleep?: number;

  /**
   * @description Built object damage rate modifier
   * @default 1.000000
   */
  buildObjectDamageRate?: number;

  /**
   * @description Built object decay rate modifier (for built objects outside of Bases)
   * @default 1.000000
   */
  buildObjectDeteriorationDamageRate?: number;

  /**
   * @description Resource collection drop rate modifier
   * @default 1.000000
   */
  collectionDropRate?: number;

  /**
   * @description Resource node (trees, rocks, ores, etc.) health modifier
   * @default 1.000000
   */
  collectionObjectHpRate?: number;

  /**
   * @description Resource node (trees, rocks, ores, etc.) respawn rate modifier
   * @default 1.000000
   */
  collectionObjectRespawnSpeedRate?: number;

  /**
   * @description Enemy dropped Item multiplier
   * @default 1.000000
   */
  enemyDropItemRate?: number;

  /**
   * @description The loss penalty (Items, equipment, Pals) applied on Player death
   * @default All
   */
  deathPenalty?: string;

  /**
   * @description Enable player-to-player damage
   * @default False
   */
  bEnablePlayerToPlayerDamage?: boolean;

  /**
   * @description Enable friendly fire
   * @default False
   */
  bEnableFriendlyFire?: boolean;

  /**
   * @description Enable base-invasion attacks
   * @default True
   */
  bEnableInvaderEnemy?: boolean;

  /**
   * @description TBD
   * @default False
   */
  bActiveUNKO?: boolean;

  /**
   * @description Enable aim assist for game pads (such as controllers)
   * @default True
   */
  bEnableAimAssistPad?: boolean;

  /**
   * @description Enable aim assist for mouse & keyboard
   * @default False
   */
  bEnableAimAssistKeyboard?: boolean;

  /**
   * @description TBD
   * @default 3000
   */
  dropItemMaxNum?: number;

  /**
   * @description TBD
   * @default 100
   */
  dropItemMaxNum_UNKO?: number;

  /**
   * @description Max number of total base camps on the map (cumulative count of all Guild Bases)
   * @default 128
   */
  baseCampMaxNum?: number;

  /**
   * @description Max number of base Pal workers
   * @default 15
   */
  baseCampWorkerMaxNum?: number;

  /**
   * @description Amount of time dropped Items exist before they despawn (in hours)
   * @default 1.000000
   */
  dropItemAliveMaxHours?: number;

  /**
   * @description Enable disbanding Guilds when none of the member players have been online (based on duration specified by AutoResetGuildTimeNoOnlinePlayers)
   * @default False
   */
  bAutoResetGuildNoOnlinePlayers?: boolean;

  /**
   * @description How quickly an inactive Guild will be disbanded
   * @default 72.000000
   */
  autoResetGuildTimeNoOnlinePlayers?: number;

  /**
   * @description Max number of players allowed in a Guild
   * @default 20
   */
  guildPlayerMaxNum?: number;

  /**
   * @description Max number of base camps in a Guild
   * @default 4
   */
  baseCampMaxNumInGuild?: number;

  /**
   * @description Base hatch time for eggs with the max hatch duration (lesser eggs hatch in less time)
   * @default 72.000000
   */
  palEggDefaultHatchingTime?: number;

  /**
   * @description Work speed rate modifier
   * @default 1.000000
   */
  workSpeedRate?: number;

  /**
   * @description TBD
   * @default False
   */
  bIsMultiplay?: boolean;

  /**
   * @description Enable PvP
   * @default False
   */
  bIsPvP?: boolean;

  /**
   * @description Allow players to pick up Items dropped on death by players from Guilds other than their own
   * @default False
   */
  bCanPickupOtherGuildDeathPenaltyDrop?: boolean;

  /**
   * @description TBD
   * @default True
   */
  bEnableNonLoginPenalty?: boolean;

  /**
   * @description Enable fast traveling to Bases and Great Eagle Statues
   * @default True
   */
  bEnableFastTravel?: boolean;

  /**
   * @description TBD
   * @default True
   */
  bIsStartLocationSelectByMap?: boolean;

  /**
   * @description Enable player characters remaining in-game after logging out
   * @default False
   */
  bExistPlayerAfterLogout?: boolean;

  /**
   * @description TBD
   * @default False
   */
  bEnableDefenseOtherGuildPlayer?: boolean;

  /**
   * @description Max co-operative play party size
   * @default 4
   */
  coopPlayerMaxNum?: number;

  /**
   * @description Max number of concurrent players on the server
   * @default 32
   */
  serverPlayerMaxNum?: number;

  /**
   * @description Server name
   * @default "Default Palworld Server"
   */
  serverName?: string;

  /**
   * @description Server description text
   * @default "Default Palworld Server"
   */
  serverDescription?: string;

  /**
   * @description Server admin password
   * @default ""
   */
  adminPassword?: string;

  /**
   * @description Server password
   * @default ""
   */
  serverPassword?: string;

  /**
   * @description Server port
   * @default 8211
   */
  publicPort?: number;

  /**
   * @description Server IP
   * @default ""
   */
  publicIP?: string;

  /**
   * @description TBD
   * @default true
   */
  rconEnabled?: boolean;

  /**
   * @description TBD
   * @default 25575
   */
  rconPort?: number;

  /**
   * @description TBD
   * @default ""
   */
  region?: string;

  /**
   * @description TBD
   * @default True
   */
  bUseAuth?: boolean;

  /**
   * @description TBD
   * @default https://api.palworldgame.com/api/banlist.txt
   */
  banListURL?: string;

  /**
   * @description Auto-save interval in minutes
   * @default 30.000000
   */
  autoSaveSpan?: number;

  /**
   * @description Enable hardcore mode
   * @default False
   */
  bHardcore?: boolean;

  /**
   * @description TBD
   * @default False
   */
  bPalLost?: boolean;

  /**
   * @description Hide other guild's base camp area effects
   * @default False
   */
  bInvisibleOtherGuildBaseCampAreaFX?: boolean;

  /**
   * @description Limit build area
   * @default False
   */
  bBuildAreaLimit?: boolean;

  /**
   * @description Item weight rate modifier
   * @default 1.000000
   */
  itemWeightRate?: number;

  /**
   * @description Enable REST API
   * @default False
   */
  restAPIEnabled?: boolean;

  /**
   * @description REST API port
   * @default 8212
   */
  restAPIPort?: number;

  /**
   * @description Show player list
   * @default False
   */
  bShowPlayerList?: boolean;

  /**
   * @description Chat post limit per minute
   * @default 10
   */
  chatPostLimitPerMinute?: number;

  /**
   * @description Allowed connection platform
   * @default "Steam"
   */
  allowConnectPlatform?: string;

  /**
   * @description Use backup save data
   * @default True
   */
  bIsUseBackupSaveData?: boolean;

  /**
   * @description Log format type
   * @default "Text"
   */
  logFormatType?: string;

  /**
   * @description Supply drop interval
   * @default 180
   */
  supplyDropSpan?: number;

  /**
   * @description Enable predator boss Pal
   * @default True
   */
  enablePredatorBossPal?: boolean;

  /**
   * @description Maximum building limit number
   * @default 0
   */
  maxBuildingLimitNum?: number;

  /**
   * @description Server replicate pawn cull distance
   * @default 15000.000000
   */
  serverReplicatePawnCullDistance?: number;
}

export class PalWorldSettingsIniTemplate extends AbstractTemplate<PalWorldSettingsIniTemplateVars> {
  templateFilePath = path.join(
    process.cwd(),
    'assets/templates/PalWorldSettings.ini.tpl',
  );

  defaultVars: Required<PalWorldSettingsIniTemplateVars> = {
    dayTimeSpeedRate: 1.0,
    nightTimeSpeedRate: 1.0,
    expRate: 1.0,
    palCaptureRate: 1.0,
    palSpawnNumRate: 1.0,
    palDamageRateAttack: 1.0,
    palDamageRateDefense: 1.0,
    playerDamageRateAttack: 1.0,
    playerDamageRateDefense: 1.0,
    playerStomachDecreaceRate: 1.0,
    playerStaminaDecreaceRate: 1.0,
    playerAutoHPRegeneRate: 1.0,
    playerAutoHpRegeneRateInSleep: 1.0,
    palStomachDecreaceRate: 1.0,
    palStaminaDecreaceRate: 1.0,
    palAutoHPRegeneRate: 1.0,
    palAutoHpRegeneRateInSleep: 1.0,
    buildObjectHpRate: 1.0,
    buildObjectDamageRate: 1.0,
    buildObjectDeteriorationDamageRate: 1.0,
    collectionDropRate: 1.0,
    collectionObjectHpRate: 1.0,
    collectionObjectRespawnSpeedRate: 1.0,
    enemyDropItemRate: 1.0,
    deathPenalty: 'All',
    bEnablePlayerToPlayerDamage: false,
    bEnableFriendlyFire: false,
    bEnableInvaderEnemy: true,
    bActiveUNKO: false,
    bEnableAimAssistPad: true,
    bEnableAimAssistKeyboard: false,
    dropItemMaxNum: 3000,
    dropItemMaxNum_UNKO: 100,
    baseCampMaxNum: 128,
    baseCampWorkerMaxNum: 15,
    dropItemAliveMaxHours: 1.0,
    bAutoResetGuildNoOnlinePlayers: false,
    autoResetGuildTimeNoOnlinePlayers: 72.0,
    guildPlayerMaxNum: 20,
    baseCampMaxNumInGuild: 4,
    palEggDefaultHatchingTime: 72.0,
    workSpeedRate: 1.0,
    bIsMultiplay: false,
    bIsPvP: false,
    bCanPickupOtherGuildDeathPenaltyDrop: false,
    bEnableNonLoginPenalty: true,
    bEnableFastTravel: true,
    bIsStartLocationSelectByMap: true,
    bExistPlayerAfterLogout: false,
    bEnableDefenseOtherGuildPlayer: false,
    coopPlayerMaxNum: 4,
    serverPlayerMaxNum: 32,
    serverName: 'Default Palworld Server',
    serverDescription: 'Default Palworld Server',
    adminPassword: '',
    serverPassword: '',
    publicPort: 8211,
    publicIP: '',
    rconEnabled: true,
    rconPort: 25575,
    region: '',
    bUseAuth: true,
    banListURL: 'https://api.palworldgame.com/api/banlist.txt',
    autoSaveSpan: 30.0,
    bHardcore: false,
    bPalLost: false,
    bInvisibleOtherGuildBaseCampAreaFX: false,
    bBuildAreaLimit: false,
    itemWeightRate: 1.0,
    restAPIEnabled: false,
    restAPIPort: 8212,
    bShowPlayerList: false,
    chatPostLimitPerMinute: 10,
    allowConnectPlatform: 'Steam',
    bIsUseBackupSaveData: true,
    logFormatType: 'Text',
    supplyDropSpan: 180,
    enablePredatorBossPal: true,
    maxBuildingLimitNum: 0,
    serverReplicatePawnCullDistance: 15000.0,
  };
}

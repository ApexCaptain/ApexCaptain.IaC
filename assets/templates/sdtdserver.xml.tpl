<?xml version="1.0"?>
<ServerSettings>
	<!-- GENERAL SERVER SETTINGS -->

	<!-- Server representation -->
	<property name="ServerName"                        value="${serverName}"/>                        <!-- Whatever you want the name of the server to be. -->
	<property name="ServerDescription"                 value="${serverDescription}"/>                 <!-- Whatever you want the server description to be, will be shown in the server browser. -->
	<property name="ServerWebsiteURL"                  value="${serverWebsiteURL}"/>                  <!-- Website URL for the server, will be shown in the server browser as a clickable link -->
	<property name="ServerPassword"                    value="${serverPassword}"/>                    <!-- Password to gain entry to the server -->
	<property name="ServerLoginConfirmationText"       value="${serverLoginConfirmationText}"/>       <!-- If set, the user will see the message during joining the server and has to confirm it before continuing. -->
	<property name="Region"                            value="${region}"/>                            <!-- The region this server is in. -->
	<property name="Language"                          value="${language}"/>                          <!-- Primary language for players on this server. -->

	<!-- Networking -->
	<property name="ServerPort"                        value="${serverPort}"/>                        <!-- Port you want the server to listen on. -->
	<property name="ServerVisibility"                  value="${serverVisibility}"/>                  <!-- Visibility of this server: 2 = public, 1 = only shown to friends, 0 = not listed. -->
	<property name="ServerDisabledNetworkProtocols"    value="${serverDisabledNetworkProtocols}"/>    <!-- Networking protocols that should not be used. -->
	<property name="ServerMaxWorldTransferSpeedKiBs"   value="${serverMaxWorldTransferSpeedKiBs}"/>   <!-- Maximum speed in kiB/s the world is transferred at to a client on first connect. -->

	<!-- Slots -->
	<property name="ServerMaxPlayerCount"              value="${serverMaxPlayerCount}"/>              <!-- Maximum Concurrent Players -->
	<property name="ServerReservedSlots"               value="${serverReservedSlots}"/>               <!-- Out of the MaxPlayerCount this many slots can only be used by players with a specific permission level -->
	<property name="ServerReservedSlotsPermission"     value="${serverReservedSlotsPermission}"/>     <!-- Required permission level to use reserved slots above -->
	<property name="ServerAdminSlots"                  value="${serverAdminSlots}"/>                  <!-- This many admins can still join even if the server has reached MaxPlayerCount -->
	<property name="ServerAdminSlotsPermission"        value="${serverAdminSlotsPermission}"/>        <!-- Required permission level to use the admin slots above -->

	<!-- Admin interfaces -->
	<property name="WebDashboardEnabled"               value="${webDashboardEnabled}"/>               <!-- Enable/disable the web dashboard -->
	<property name="WebDashboardPort"                  value="${webDashboardPort}"/>                  <!-- Port of the web dashboard -->
	<property name="WebDashboardUrl"                   value="${webDashboardUrl}"/>                   <!-- External URL to the web dashboard if not just using the public IP of the server. -->
	<property name="EnableMapRendering"                value="${enableMapRendering}"/>                <!-- Enable/disable rendering of the map to tile images while exploring it. -->

	<property name="TelnetEnabled"                     value="${telnetEnabled}"/>                     <!-- Enable/Disable the telnet -->
	<property name="TelnetPort"                        value="${telnetPort}"/>                        <!-- Port of the telnet server -->
	<property name="TelnetPassword"                    value="${telnetPassword}"/>                    <!-- Password to gain entry to telnet interface. -->
	<property name="TelnetFailedLoginLimit"            value="${telnetFailedLoginLimit}"/>            <!-- After this many wrong passwords from a single remote client, the client will be blocked from connecting to the Telnet interface -->
	<property name="TelnetFailedLoginsBlocktime"       value="${telnetFailedLoginsBlocktime}"/>       <!-- How long will the block persist (in seconds) -->

	<property name="TerminalWindowEnabled"             value="${terminalWindowEnabled}"/>             <!-- Show a terminal window for log output / command input (Windows only) -->

	<!-- Folder and file locations -->
	<property name="AdminFileName"                     value="${adminFileName}"/>                     <!-- Server admin file name. Path relative to UserDataFolder/Saves -->
	<!-- <property name="UserDataFolder"               value="absolute path" /> -->                    <!-- Use this to override where the server stores all user data, including RWG generated worlds and saves. -->

	<!-- Other technical settings -->
	<property name="ServerAllowCrossplay"              value="${serverAllowCrossplay}"/>              <!-- Enables/Disables crossplay -->
	<property name="EACEnabled"                        value="${eacEnabled}"/>                        <!-- Enables/Disables EasyAntiCheat -->
	<property name="IgnoreEOSSanctions"                value="${ignoreEOSSanctions}"/>                <!-- Ignore EOS sanctions when allowing players to join -->
	<property name="HideCommandExecutionLog"           value="${hideCommandExecutionLog}"/>           <!-- Hide logging of command execution. -->
	<property name="MaxUncoveredMapChunksPerPlayer"    value="${maxUncoveredMapChunksPerPlayer}"/>    <!-- Override how many chunks can be uncovered on the ingame map by each player. -->
	<property name="PersistentPlayerProfiles"          value="${persistentPlayerProfiles}"/>          <!-- If disabled, a player can join with any selected profile. -->
	<property name="MaxChunkAge"                       value="${maxChunkAge}"/>                       <!-- The number of in-game days which must pass since visiting a chunk before it will reset to its original state. -->
	<property name="SaveDataLimit"                     value="${saveDataLimit}"/>                     <!-- The maximum disk space allowance for each saved game in megabytes (MB). -->

	<!-- GAMEPLAY -->
	
	<!-- World -->
	<property name="GameWorld"                         value="${gameWorld}"/>                         <!-- "RWG" or any already existing world name in the Worlds folder. -->
	<property name="WorldGenSeed"                      value="${worldGenSeed}"/>                      <!-- If RWG, this is the seed for the generation of the new world. -->
	<property name="WorldGenSize"                      value="${worldGenSize}"/>                      <!-- If RWG, this controls the width and height of the created world. -->
	<property name="GameName"                          value="${gameName}"/>                          <!-- Whatever you want the game name to be. -->
	<property name="GameMode"                          value="${gameMode}"/>                          <!-- Game mode, e.g., GameModeSurvival. -->

	<!-- Difficulty -->
	<property name="GameDifficulty"                    value="${gameDifficulty}"/>                    <!-- Game difficulty: 0 - 5, 0=easiest, 5=hardest. -->
	<property name="BlockDamagePlayer"                 value="${blockDamagePlayer}"/>                 <!-- How much damage do players to blocks (percentage in whole numbers). -->
	<property name="BlockDamageAI"                     value="${blockDamageAI}"/>                     <!-- How much damage do AIs to blocks (percentage in whole numbers). -->
	<property name="BlockDamageAIBM"                   value="${blockDamageAIBM}"/>                   <!-- How much damage do AIs during blood moons to blocks (percentage in whole numbers). -->
	<property name="XPMultiplier"                      value="${xpMultiplier}"/>                      <!-- XP gain multiplier (percentage in whole numbers). -->
	<property name="PlayerSafeZoneLevel"               value="${playerSafeZoneLevel}"/>               <!-- If a player is less or equal this level, he will create a safe zone (no enemies) when spawned. -->
	<property name="PlayerSafeZoneHours"               value="${playerSafeZoneHours}"/>               <!-- Hours in world time this safe zone exists. -->

	<!--  -->
	<property name="BuildCreate"                       value="${buildCreate}"/>                       <!-- Cheat mode on/off -->
	<property name="DayNightLength"                    value="${dayNightLength}"/>                    <!-- Real time minutes per in game day. -->
	<property name="DayLightLength"                    value="${dayLightLength}"/>                    <!-- In game hours the sun shines per day. -->
	<property name="DeathPenalty"                      value="${deathPenalty}"/>                      <!-- Penalty after dying. -->
	<property name="DropOnDeath"                       value="${dropOnDeath}"/>                       <!-- What to drop on death. -->
	<property name="DropOnQuit"                        value="${dropOnQuit}"/>                        <!-- What to drop on quit. -->
	<property name="BedrollDeadZoneSize"               value="${bedrollDeadZoneSize}"/>               <!-- Size of bedroll deadzone, no zombies will spawn inside this area. -->
	<property name="BedrollExpiryTime"                 value="${bedrollExpiryTime}"/>                 <!-- Number of real world days a bedroll stays active after owner was last online. -->

	<!-- Performance related -->
	<property name="MaxSpawnedZombies"                 value="${maxSpawnedZombies}"/>                 <!-- This setting covers the entire map. There can only be this many zombies on the entire map at one time. -->
	<property name="MaxSpawnedAnimals"                 value="${maxSpawnedAnimals}"/>                 <!-- If your server has a large number of players, you can increase this limit to add more wildlife. -->
	<property name="ServerMaxAllowedViewDistance"      value="${serverMaxAllowedViewDistance}"/>      <!-- Max view distance a client may request. -->
	<property name="MaxQueuedMeshLayers"               value="${maxQueuedMeshLayers}"/>               <!-- Maximum amount of Chunk mesh layers that can be enqueued during mesh generation. -->

	<!-- Zombie settings -->
	<property name="EnemySpawnMode"                    value="${enemySpawnMode}"/>                    <!-- Enable/Disable enemy spawning -->
	<property name="EnemyDifficulty"                   value="${enemyDifficulty}"/>                   <!-- Enemy difficulty: 0 = Normal, 1 = Feral. -->
	<property name="ZombieFeralSense"                  value="${zombieFeralSense}"/>                  <!-- Zombie feral sense: 0-3 (Off, Day, Night, All). -->
	<property name="ZombieMove"                        value="${zombieMove}"/>                        <!-- Zombie move speed: 0-4 (walk, jog, run, sprint, nightmare). -->
	<property name="ZombieMoveNight"                   value="${zombieMoveNight}"/>                   <!-- Zombie move speed at night: 0-4 (walk, jog, run, sprint, nightmare). -->
	<property name="ZombieFeralMove"                   value="${zombieFeralMove}"/>                   <!-- Zombie feral move speed: 0-4 (walk, jog, run, sprint, nightmare). -->
	<property name="ZombieBMMove"                      value="${zombieBMMove}"/>                      <!-- Zombie blood moon move speed: 0-4 (walk, jog, run, sprint, nightmare). -->
	<property name="BloodMoonFrequency"                value="${bloodMoonFrequency}"/>                <!-- What frequency (in days) should a blood moon take place. -->
	<property name="BloodMoonRange"                    value="${bloodMoonRange}"/>                    <!-- How many days can the actual blood moon day randomly deviate from the above setting. -->
	<property name="BloodMoonWarning"                  value="${bloodMoonWarning}"/>                  <!-- The Hour number that the red day number begins on a blood moon day. -->
	<property name="BloodMoonEnemyCount"               value="${bloodMoonEnemyCount}"/>               <!-- Number of zombies that can be alive at any time PER PLAYER during a blood moon horde. -->

	<!-- Loot -->
	<property name="LootAbundance"                     value="${lootAbundance}"/>                     <!-- Loot abundance percentage in whole numbers. -->
	<property name="LootRespawnDays"                   value="${lootRespawnDays}"/>                   <!-- Days in whole numbers for loot to respawn. -->
	<property name="AirDropFrequency"                  value="${airDropFrequency}"/>                  <!-- How often airdrop occur in game-hours, 0 == never. -->
	<property name="AirDropMarker"                     value="${airDropMarker}"/>                     <!-- Sets if a marker is added to map/compass for air drops. -->

	<!-- Multiplayer -->
	<property name="PartySharedKillRange"              value="${partySharedKillRange}"/>              <!-- The distance you must be within to receive party shared kill xp and quest party kill objective credit. -->
	<property name="PlayerKillingMode"                 value="${playerKillingMode}"/>                 <!-- Player Killing Settings: 0 = No Killing, 1 = Kill Allies Only, 2 = Kill Strangers Only, 3 = Kill Everyone. -->

	<!-- Land claim options -->
	<property name="LandClaimCount"                    value="${landClaimCount}"/>                    <!-- Maximum allowed land claims per player. -->
	<property name="LandClaimSize"                     value="${landClaimSize}"/>                     <!-- Size in blocks that is protected by a keystone. -->
	<property name="LandClaimDeadZone"                 value="${landClaimDeadZone}"/>                 <!-- Keystones must be this many blocks apart. -->
	<property name="LandClaimExpiryTime"               value="${landClaimExpiryTime}"/>               <!-- The number of real world days a player can be offline before their claims expire. -->
	<property name="LandClaimDecayMode"                value="${landClaimDecayMode}"/>                <!-- Controls how offline players land claims decay. -->
	<property name="LandClaimOnlineDurabilityModifier" value="${landClaimOnlineDurabilityModifier}"/> <!-- How much protected claim area block hardness is increased when a player is online. -->
	<property name="LandClaimOfflineDurabilityModifier" value="${landClaimOfflineDurabilityModifier}"/> <!-- How much protected claim area block hardness is increased when a player is offline. -->
	<property name="LandClaimOfflineDelay"             value="${landClaimOfflineDelay}"/>             <!-- The number of minutes after a player logs out that the land claim area hardness transitions from online to offline. -->

	<property name="DynamicMeshEnabled"                value="${dynamicMeshEnabled}"/>                <!-- Is Dynamic Mesh system enabled -->
	<property name="DynamicMeshLandClaimOnly"          value="${dynamicMeshLandClaimOnly}"/>          <!-- Is Dynamic Mesh system only active in player LCB areas -->
	<property name="DynamicMeshLandClaimBuffer"        value="${dynamicMeshLandClaimBuffer}"/>        <!-- Dynamic Mesh LCB chunk radius -->
	<property name="DynamicMeshMaxItemCache"           value="${dynamicMeshMaxItemCache}"/>           <!-- How many items can be processed concurrently, higher values use more RAM -->

	<property name="TwitchServerPermission"            value="${twitchServerPermission}"/>            <!-- Required permission level to use twitch integration on the server -->
	<property name="TwitchBloodMoonAllowed"            value="${twitchBloodMoonAllowed}"/>            <!-- If the server allows twitch actions during a blood moon. -->

	<property name="QuestProgressionDailyLimit"        value="${questProgressionDailyLimit}"/>        <!-- Limits the number of quests that contribute to quest tier progression a player can complete each day. -->
</ServerSettings>
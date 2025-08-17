const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const modsNotToDeleteOnStart =
  process.env.MODS_NOT_TO_DELETE_ON_START.split(',');
const targetModDirPath = process.env.TARGET_MOD_DIR_PATH;
const serverSideModsDirPath = process.env.SERVER_SIDE_MODS_DIR_PATH;
const bothSidesModsDirPath = process.env.BOTH_SIDES_MODS_DIR_PATH;

fs.readdirSync(targetModDirPath).forEach(modName => {
  const modDirPath = path.join(targetModDirPath, modName);
  if (!modsNotToDeleteOnStart.includes(modName)) {
    execSync(`rm -rf "${modDirPath}"`);
  }
});

fs.readdirSync(serverSideModsDirPath)
  .filter(modelName => modelName != 'lost+found')
  .forEach(modelName => {
    const modDirPath = path.join(serverSideModsDirPath, modelName);
    const targetPath = path.join(targetModDirPath, modelName);
    fs.cpSync(modDirPath, targetPath, { recursive: true });
  });

fs.readdirSync(bothSidesModsDirPath)
  .filter(modelName => modelName != 'lost+found')
  .forEach(modelName => {
    const modDirPath = path.join(bothSidesModsDirPath, modelName);
    const targetPath = path.join(targetModDirPath, modelName);
    fs.cpSync(modDirPath, targetPath, { recursive: true });
  });

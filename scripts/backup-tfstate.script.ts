import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const secretsDir = path.join(process.cwd(), '.secrets');
const tfStateSrcDir = path.join(secretsDir, 'terraform');
const tfStateBackupDir = path.join(secretsDir, 'backups', 'terraform');

// 백업 디렉토리가 없으면 생성
if (!fs.existsSync(tfStateBackupDir)) {
  fs.mkdirSync(tfStateBackupDir, { recursive: true });
}

const backupFilePostfix = '.tfstate.backup.zip';
const backupFileRetentionCount = 10;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-MM-SS 형식
const backupFileName = `${timestamp}${backupFilePostfix}`;
const backupFilePath = path.join(tfStateBackupDir, backupFileName);

// 소스 디렉토리가 존재하는지 확인
if (!fs.existsSync(tfStateSrcDir)) {
  console.error(`Error: Source directory does not exist: ${tfStateSrcDir}`);
  process.exit(1);
}

try {
  // zip 명령어로 압축
  const zipCommand = `zip -r "${backupFilePath}" .`;
  execSync(zipCommand, { cwd: tfStateSrcDir, stdio: 'inherit' });
  console.log(`✅ Backup created successfully: ${backupFileName}`);

  // 기존 백업 파일들을 날짜순으로 정렬하여 최대 10개만 유지
  const backupFiles = fs
    .readdirSync(tfStateBackupDir)
    .filter(file => file.endsWith(backupFilePostfix))
    .map(file => ({
      name: file,
      path: path.join(tfStateBackupDir, file),
      stats: fs.statSync(path.join(tfStateBackupDir, file)),
    }))
    .sort(
      (front, rear) => rear.stats.mtime.getTime() - front.stats.mtime.getTime(),
    ); // 최신순 정렬

  // 10개를 초과하는 오래된 백업 파일들 삭제
  if (backupFiles.length > backupFileRetentionCount) {
    const filesToDelete = backupFiles.slice(backupFileRetentionCount);
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Deleted old backup: ${file.name}`);
    }
    console.log(
      `📊 Kept ${backupFiles.length - filesToDelete.length} recent backups`,
    );
  } else {
    console.log(`📊 Total backups: ${backupFiles.length}`);
  }
} catch (error) {
  console.error('❌ Error creating backup:', error);
  process.exit(1);
}

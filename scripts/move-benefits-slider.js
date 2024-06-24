const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/js/benefits-slider/index.ts');
const backupPath = filePath + '.bak';

function moveFile() {
  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, backupPath);
    console.log('Moved benefits-slider file');
  }
}

function restoreFile() {
  if (fs.existsSync(backupPath)) {
    fs.renameSync(backupPath, filePath);
    console.log('Restored benefits-slider file');
  }
}

if (process.argv[2] === 'move') {
  moveFile();
} else if (process.argv[2] === 'restore') {
  restoreFile();
}

process.on('exit', restoreFile);

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/js/benefits-slider/index.ts');

if (fs.existsSync(filePath)) {
  fs.renameSync(filePath, filePath + '.bak');
}

process.on('exit', () => {
  if (fs.existsSync(filePath + '.bak')) {
    fs.renameSync(filePath + '.bak', filePath);
  }
});

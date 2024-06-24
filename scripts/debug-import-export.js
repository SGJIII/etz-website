const fs = require('fs');
const path = require('path');

function checkFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkFiles(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (/import .* from |export /.test(content)) {
        console.log(`File with import/export: ${fullPath}`);
      }
    }
  });
}

checkFiles(path.join(__dirname, '../src'));

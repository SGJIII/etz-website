// load-env.js
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envFiles = ['.env.development', '.env.staging'];

envFiles.forEach(file => {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.error(`Environment file ${envPath} not found.`);
  }
});

// Log loaded environment variables for debugging
console.log('Loaded environment variables:', process.env);

const path = require('path'); // Ensure path is imported before use
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.staging') });

const express = require('express');
const serverless = require('serverless-http');
const { supabase } = require('../../src/lib/supabase'); // Adjust the path as necessary

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../../dist')));

// Dynamic route for asset pages
app.get('/asset/:coin', async (req, res) => {
  const coinName = req.params.coin.replace('-ira', '');

  console.log(`Fetching data for coin: ${coinName}`); // Add logging

  const { data: coins, error } = await supabase
    .from('coins')
    .select('*');

  if (error) {
    console.error(`Error fetching coins: ${error.message}`);
    res.status(500).send('Error fetching coin data');
    return;
  }

  const coin = coins.find(c => c.coin_name.toLowerCase() === coinName.toLowerCase());

  if (!coin) {
    console.error('Coin not found');
    res.status(404).send('Coin not found');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en-US">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>${coin.coin_name} IRA Details - How to avoid taxes on ${coin.coin_name} trading | ETZ Soft </title>
        <link rel="stylesheet" href="/styles/index.css">
        <link rel="stylesheet" href="/styles/index.desktop.css">
        <link rel="stylesheet" href="/styles/index.mobile.css">
        <link rel="stylesheet" href="/styles/index.tablet.css">
      </head>
      <body>
        <div class="coin-page">
          <h1>${coin.coin_name} (${coin.coin_base}) IRA</h1>
          <p>${coin.ai_content}</p>
          <img src="${coin.logo_url}" alt="${coin.coin_name}">
        </div>
      </body>
    </html>
  `;

  res.send(htmlContent);
});

// Export the serverless handler for Netlify
module.exports.handler = serverless(app);

// If running locally, start the server
if (process.env.LOCAL_DEV) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

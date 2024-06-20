const path = require('path'); // Ensure path is imported before use
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.staging') });

const express = require('express');
const serverless = require('serverless-http');
const { supabase } = require('../../src/lib/supabase'); // Adjust the path as necessary

const app = express();
const PORT = process.env.PORT || 3000;

// Set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../src/pages'));

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

  // Render the EJS template with coin data
  res.render('coin', {
    coin: {
      coin_name: coin.coin_name || 'Default Coin Name',
      coin_base: coin.coin_base || 'Default Coin Base',
      ai_content: coin.ai_content || 'Default AI Content',
      logo_url: coin.logo_url || '/default-logo.png'
    },
    title: coin.coin_name ? coin.coin_name + ' IRA Details' : 'Default Title',
    description: coin.coin_name ? 'How to avoid taxes on ' + coin.coin_name + ' trading' : 'Default Description'
  });
});

// Export the serverless handler for Netlify
module.exports.handler = serverless(app);

// If running locally, start the server
if (process.env.LOCAL_DEV) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

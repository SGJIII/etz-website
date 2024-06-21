const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const { supabase } = require('../../src/lib/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../../dist')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../src/pages'));

app.get('/asset/:coin', async (req, res) => {
    const coinName = req.params.coin.replace('-ira', '');
    console.log(`Fetching data for coin: ${coinName}`);

    const { data: coins, error } = await supabase.from('coins').select('*');

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

    const title = `${coin.coin_name} IRA Details - How to avoid taxes on ${coin.coin_name} trading | ETZ Soft`;
    const description = `How to avoid taxes on ${coin.coin_name} trading`;

    console.log({ coin, title, description });

    res.render('coin', { coin, title, description });
});

module.exports.handler = serverless(app);

if (process.env.LOCAL_DEV) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

/* eslint @typescript-eslint/no-var-requires: "off" */
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./.env.staging" });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and Key are required.");
  process.exit(1);
}

console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key: ${supabaseKey}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const coins = [
  { id: 1, name: "Bitcoin", symbol: "BTC" },
  { id: 2, name: "Ethereum", symbol: "ETH" },
  // Add more coins as needed
];

const fetchCoinData = async (coin) => {
  const url = `https://api.coinbase.com/v2/currencies/${coin.symbol.toLowerCase()}`;
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    return response.data.data;
  } catch (error) {
    console.error(
      `Error fetching data for coin ${coin.name}: ${error.message}`
    );
    return null;
  }
};

const updateCoinData = async () => {
  for (const coin of coins) {
    const data = await fetchCoinData(coin);
    if (!data) {
      console.log(`Skipping coin: ${coin.name} due to failed data fetch.`);
      continue;
    }

    const content = `About ${coin.name} (${coin.symbol}): ${data.name} is a ${data.type}.`;
    console.log(`Fetched content for ${coin.name}: ${content}`);

    const { data: updateData, error } = await supabase
      .from("coins")
      .update({ scraped_content: content })
      .eq("id", coin.id);

    if (error) {
      console.error(
        `Error updating content for coin ${coin.name}: ${error.message}`
      );
    } else {
      console.log(`Successfully updated content for coin: ${coin.name}`);
    }

    // Delay between requests to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};

const main = async () => {
  console.log("Starting the data fetching process...");
  await updateCoinData();
  console.log("Done.");
};

main();

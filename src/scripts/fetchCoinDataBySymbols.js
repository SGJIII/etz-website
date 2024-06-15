/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch the complete list of coins from CoinGecko API
const fetchAllCoins = async (backoff = 1000) => {
  const url = `https://api.coingecko.com/api/v3/coins/list`;
  try {
    const response = await axios.get(url);
    if (response.data.length > 0) {
      return response.data;
    } else {
      console.warn(`No data found from CoinGecko API`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn(`Rate limited. Retrying in ${backoff}ms...`);
      await delay(backoff);
      return fetchAllCoins(Math.min(backoff * 2, 60000));
    } else {
      console.error(`Error fetching CoinGecko data:`, error);
      return null;
    }
  }
};

// Update CoinGecko IDs in the database
const updateCoinGeckoIdsBySymbols = async () => {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("id, coin_name, coin_base, coingecko_id");
  if (error) {
    console.error("Error fetching coins from database:", error);
    return;
  }

  // Fetch the complete list of coins from CoinGecko
  const allCoins = await fetchAllCoins();
  if (!allCoins) return;

  // Create a map from symbol to CoinGecko ID
  const coinSymbolMap = {};
  allCoins.forEach((coin) => {
    coinSymbolMap[coin.symbol.toUpperCase()] = coin;
  });

  // Identify duplicates and prepare for update
  const duplicateCoinBaseToCoinMap = new Map();
  const coinIdCount = {};

  for (const coin of coins) {
    if (coin.coingecko_id) {
      if (!coinIdCount[coin.coingecko_id]) {
        coinIdCount[coin.coingecko_id] = 0;
      }
      coinIdCount[coin.coingecko_id] += 1;
    }
  }

  for (const coin of coins) {
    if (
      coin.coingecko_id &&
      coinIdCount[coin.coingecko_id] > 1 &&
      coin.coin_base
    ) {
      if (!duplicateCoinBaseToCoinMap.has(coin.coin_base)) {
        duplicateCoinBaseToCoinMap.set(coin.coin_base, []);
      }
      duplicateCoinBaseToCoinMap.get(coin.coin_base).push(coin);
    }
  }

  for (const [coin_base, coinList] of duplicateCoinBaseToCoinMap.entries()) {
    const coinGeckoCoin = coinSymbolMap[coin_base.toUpperCase()];

    if (
      coinGeckoCoin &&
      coinGeckoCoin.name.toLowerCase().includes(coin_base.toLowerCase())
    ) {
      const coinGeckoId = coinGeckoCoin.id;
      for (const coin of coinList) {
        const coingeckoGraphEndpoint = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart`;

        const { data, error: updateError } = await supabase
          .from("coins")
          .update({
            coingecko_id: coinGeckoId,
            coingecko_graph_endpoint: coingeckoGraphEndpoint,
          })
          .eq("id", coin.id);

        if (updateError) {
          console.error(
            "Error updating CoinGecko ID and endpoint:",
            updateError
          );
        } else {
          console.log(
            `Successfully updated CoinGecko ID and endpoint for coin: ${coin.coin_name}`
          );
        }

        await delay(500); // Delay to handle rate limiting
      }
    } else {
      console.warn(`No accurate CoinGecko ID found for symbol: ${coin_base}`);
    }
  }
};

// Main function to run the script
const main = async () => {
  await updateCoinGeckoIdsBySymbols();
  console.log("Done.");
};

main();

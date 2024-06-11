/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Search CoinGecko for a coin's ID with exponential backoff
const searchCoinGecko = async (symbol, retries = 5, delayMs = 1000) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${symbol}`
    );
    const coins = response.data.coins;
    if (coins.length > 0) {
      return coins[0].id;
    } else {
      console.error(`CoinGecko ID not found for symbol: ${symbol}`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      if (retries > 0) {
        console.warn(
          `Rate limit exceeded for symbol ${symbol}. Retrying in ${
            delayMs / 1000
          } seconds...`
        );
        await delay(delayMs); // Exponential backoff
        return await searchCoinGecko(symbol, retries - 1, delayMs * 2); // Double the delay each retry
      } else {
        console.error(
          `Failed to fetch CoinGecko ID for symbol ${symbol} after multiple retries.`
        );
        return null;
      }
    } else {
      console.error(`Error searching CoinGecko for symbol ${symbol}:`, error);
      return null;
    }
  }
};

// Update CoinGecko ID and graph endpoint in the database
const updateCoinGeckoId = async () => {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("id, coin_name");
  if (error) {
    console.error("Error fetching coins from database:", error);
    return;
  }

  for (const coin of coins) {
    const coinGeckoId = await searchCoinGecko(coin.coin_name);
    if (!coinGeckoId) continue;

    const coingeckoGraphEndpoint = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart`;

    const { data, error: updateError } = await supabase
      .from("coins")
      .update({
        coingecko_id: coinGeckoId,
        coingecko_graph_endpoint: coingeckoGraphEndpoint,
      })
      .eq("id", coin.id);

    if (updateError) {
      console.error("Error updating CoinGecko ID and endpoint:", updateError);
    } else {
      console.log(
        `Successfully updated CoinGecko ID and endpoint for coin: ${coin.coin_name}`
      );
    }

    await delay(10000); // Delay to handle rate limiting
  }
};

// Main function to run the script
const main = async () => {
  await updateCoinGeckoId();
  console.log("Done.");
};

main();

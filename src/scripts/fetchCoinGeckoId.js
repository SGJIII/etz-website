/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Search CoinGecko for a coin's ID with exponential backoff
const searchCoinGecko = async (name, retries = 5, delayMs = 1000) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${name}`
    );
    const coins = response.data.coins;
    if (coins.length > 0) {
      return coins[0].id;
    } else {
      console.error(`CoinGecko ID not found for name: ${name}`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      if (retries > 0) {
        console.warn(
          `Rate limit exceeded for name ${name}. Retrying in ${
            delayMs / 1000
          } seconds...`
        );
        await delay(delayMs); // Exponential backoff
        return await searchCoinGecko(name, retries - 1, delayMs * 2); // Double the delay each retry
      } else {
        console.error(
          `Failed to fetch CoinGecko ID for name ${name} after multiple retries.`
        );
        return null;
      }
    } else {
      console.error(`Error searching CoinGecko for name ${name}:`, error);
      return null;
    }
  }
};

// Fetch and update CoinGecko IDs in bulk
const fetchAndUpdateCoinGeckoIds = async () => {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("id, coin_name, coingecko_id");
  if (error) {
    console.error("Error fetching coins from database:", error);
    return;
  }

  const coinNameToIdMap = new Map();

  // Identify duplicates
  for (const coin of coins) {
    if (coin.coingecko_id) {
      if (!coinNameToIdMap.has(coin.coingecko_id)) {
        coinNameToIdMap.set(coin.coingecko_id, []);
      }
      coinNameToIdMap.get(coin.coingecko_id).push(coin);
    }
  }

  // Process duplicates
  for (const [coingecko_id, coinList] of coinNameToIdMap.entries()) {
    if (coinList.length > 1) {
      for (const coin of coinList) {
        console.warn(
          `Duplicate CoinGecko ID found for ${coingecko_id}. Re-fetching for ${coin.coin_name}.`
        );
        const coinGeckoId = await searchCoinGecko(coin.coin_name);
        if (!coinGeckoId) continue;

        // Check if the new coingecko_id already exists in the database
        const { data: existingCoin, error: existingCoinError } = await supabase
          .from("coins")
          .select("id")
          .eq("coingecko_id", coinGeckoId);

        if (existingCoinError) {
          console.error(
            "Error checking existing CoinGecko ID:",
            existingCoinError
          );
          continue;
        }

        if (existingCoin.length > 0) {
          console.warn(
            `CoinGecko ID ${coinGeckoId} already exists. Skipping update for ${coin.coin_name}.`
          );
          continue;
        }

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

        await delay(10000); // Delay to handle rate limiting
      }
    }
  }
};

// Main function to run the script
const main = async () => {
  await fetchAndUpdateCoinGeckoIds();
  console.log("Done.");
};

main();

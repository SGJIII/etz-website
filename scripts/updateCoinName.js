/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../src/lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch coin data from CoinGecko API
const fetchCoinData = async (coingecko_id, backoff = 1000) => {
  const url = `https://api.coingecko.com/api/v3/coins/${coingecko_id}`;
  try {
    const response = await axios.get(url);
    if (response.data) {
      const { name } = response.data;
      return { name };
    } else {
      console.warn(`No data found for coingecko_id: ${coingecko_id}`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn(`Rate limited. Retrying ${coingecko_id} in ${backoff}ms...`);
      await delay(backoff);
      return fetchCoinData(coingecko_id, Math.min(backoff * 2, 60000));
    } else {
      console.error(
        `Error fetching CoinGecko data for ${coingecko_id}:`,
        error
      );
      return null;
    }
  }
};

// Update coin name in the database
const updateCoinName = async (coin, coinData, backoff = 1000) => {
  try {
    const { data, error } = await supabase
      .from("coins")
      .update({ coin_name: coinData.name })
      .eq("coingecko_id", coin.coingecko_id);

    if (error) {
      if (error.code === "429") {
        console.warn(
          `Rate limited. Retrying ${coin.coingecko_id} in ${backoff}ms...`
        );
        await delay(backoff);
        return updateCoinName(coin, coinData, Math.min(backoff * 2, 60000));
      } else {
        console.error("Error updating coin name in database:", error);
      }
    } else {
      console.log(`Successfully updated coin name for ${coin.coingecko_id}`);
    }
  } catch (error) {
    console.warn(
      `Error updating coin name in database. Retrying ${coin.coingecko_id} in ${backoff}ms...`
    );
    await delay(backoff);
    return updateCoinName(coin, coinData, Math.min(backoff * 2, 60000));
  }
};

// Main function to run the script
const main = async () => {
  console.log("Fetching coins from Supabase...");
  const { data: coins, error } = await supabase
    .from("coins")
    .select("id, coingecko_id");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return;
  }

  console.log(`Fetched ${coins.length} coins from Supabase.`);

  for (const coin of coins) {
    const coinData = await fetchCoinData(coin.coingecko_id);
    if (coinData) {
      await updateCoinName(coin, coinData);
      await delay(500); // Delay to prevent rate limiting issues
    }
  }

  console.log("Done.");
};

main();

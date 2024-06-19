/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../src/lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch coin data from CoinGecko API for multiple coins
const fetchAllCoinData = async (coinIds, backoff = 1000) => {
  const url = `https://api.coingecko.com/api/v3/coins/markets`;
  try {
    const response = await axios.get(url, {
      params: {
        vs_currency: "usd",
        ids: coinIds.join(","),
      },
    });

    if (response.data.length > 0) {
      const coinDataMap = {};
      response.data.forEach(({ id, name, image, market_cap_rank }) => {
        coinDataMap[id] = { name, image, market_cap_rank };
      });
      return coinDataMap;
    } else {
      console.warn(`No data found for coins: ${coinIds.join(",")}`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn(`Rate limited. Retrying in ${backoff}ms...`);
      await delay(backoff);
      return fetchAllCoinData(coinIds, Math.min(backoff * 2, 60000));
    } else {
      console.error(
        `Error fetching CoinGecko data for coins: ${coinIds.join(",")}:`,
        error
      );
      return null;
    }
  }
};

// Add or update coins in the database
const updateCoinData = async (coin, coinData, backoff = 1000) => {
  try {
    const updateFields = {
      market_cap_rank: coinData.market_cap_rank,
    };

    if (!coin.logo_url) {
      updateFields.logo_url = coinData.image;
    }

    const { data, error } = await supabase
      .from("coins")
      .update(updateFields)
      .eq("coingecko_id", coin.coingecko_id);

    if (error) {
      if (error.code === "429") {
        console.warn(
          `Rate limited. Retrying ${coin.coingecko_id} in ${backoff}ms...`
        );
        await delay(backoff);
        return updateCoinData(coin, coinData, Math.min(backoff * 2, 60000));
      } else if (error.code === "23505") {
        console.warn(
          `Duplicate coin name for ${coin.coingecko_id}. Skipping update for coin_name.`
        );
        return;
      } else {
        console.error("Error updating coin in database:", error);
      }
    } else {
      console.log(`Successfully updated coin: ${coin.coingecko_id}`);
    }
  } catch (error) {
    console.warn(
      `Error updating coin in database. Retrying ${coin.coingecko_id} in ${backoff}ms...`
    );
    await delay(backoff);
    return updateCoinData(coin, coinData, Math.min(backoff * 2, 60000));
  }
};

// Main function to run the script
const main = async () => {
  console.log("Fetching coins from Supabase...");
  const { data: coins, error } = await supabase
    .from("coins")
    .select("*")
    .is("market_cap_rank", null)
    .not("coingecko_id", "is", null); // Only fetch coins with a coingecko_id

  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return;
  }

  console.log(`Fetched ${coins.length} coins from Supabase.`);

  const coinIds = coins.map((coin) => coin.coingecko_id);
  const coinDataMap = await fetchAllCoinData(coinIds);

  if (coinDataMap) {
    for (const coin of coins) {
      const coinData = coinDataMap[coin.coingecko_id];
      if (coinData) {
        await updateCoinData(coin, coinData);
      }
    }
  }

  console.log("Done.");
};

main();

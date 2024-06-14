/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch coin data from CoinGecko API
const fetchCoinData = async (coin, backoff = 1000) => {
  const url = `https://api.coingecko.com/api/v3/coins/markets`;
  try {
    const response = await axios.get(url, {
      params: {
        vs_currency: "usd",
        ids: coin.coingecko_id,
      },
    });

    if (response.data.length > 0) {
      const { image } = response.data[0];
      return image;
    } else {
      console.warn(`No data found for coin: ${coin.coingecko_id}`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn(
        `Rate limited. Retrying ${coin.coingecko_id} in ${backoff}ms...`
      );
      await delay(backoff);
      return fetchCoinData(coin, Math.min(backoff * 2, 60000));
    } else {
      console.error(
        `Error fetching CoinGecko data for ${coin.coingecko_id}:`,
        error
      );
      return null;
    }
  }
};

// Add or update coins in the database
const updateCoinIcon = async (coin, iconUrl, backoff = 1000) => {
  try {
    const { data, error } = await supabase
      .from("coins")
      .update({ logo_url: iconUrl })
      .eq("coingecko_id", coin.coingecko_id);

    if (error) {
      if (error.code === "429") {
        console.warn(
          `Rate limited. Retrying ${coin.coingecko_id} in ${backoff}ms...`
        );
        await delay(backoff);
        return updateCoinIcon(coin, iconUrl, Math.min(backoff * 2, 60000));
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
    return updateCoinIcon(coin, iconUrl, Math.min(backoff * 2, 60000));
  }
};

// Main function to run the script
const main = async () => {
  console.log("Fetching coins from Supabase...");
  const { data: coins, error } = await supabase
    .from("coins")
    .select("*")
    .is("logo_url", null)
    .not("coin_base", "is", null)
    .not("ai_content", "is", null)
    .not("coingecko_id", "is", null); // Only fetch coins with a coingecko_id

  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return;
  }

  console.log(`Fetched ${coins.length} coins from Supabase.`);

  for (const coin of coins) {
    const iconUrl = await fetchCoinData(coin);
    if (iconUrl) {
      await updateCoinIcon(coin, iconUrl);
      await delay(500); // Delay to prevent rate limiting issues
    }
  }

  console.log("Done.");
};

main();

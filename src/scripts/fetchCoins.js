/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../lib/supabase");

// Delay function to handle rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch coins from Coinbase API with pagination
const fetchCoins = async () => {
  let allCoins = [];
  let url = "https://api.coinbase.com/v2/assets/prices?base=USD";

  while (url && allCoins.length < 500) {
    try {
      const response = await axios.get(url);
      const coins = response.data.data;

      if (!coins.length) break;

      allCoins = allCoins.concat(coins);

      // Handle pagination
      const nextPage = response.data.pagination.next_uri;
      url = nextPage ? `https://api.coinbase.com${nextPage}` : null;
    } catch (error) {
      console.error("Error fetching coins from Coinbase:", error);
      break;
    }

    await delay(1000); // Delay to prevent rate limiting issues
  }

  // Ensure we only keep unique coins based on their 'base' attribute
  const uniqueCoins = Array.from(
    new Map(allCoins.map((coin) => [coin.base, coin])).values()
  );

  return uniqueCoins.slice(0, 500);
};

// Add or update coins in the database
const upsertCoinsToDatabase = async (coins) => {
  for (const coin of coins) {
    const { data, error } = await supabase
      .from("coins")
      .upsert([{ coin_name: coin.base }], { onConflict: ["coin_name"] });

    if (error) {
      console.error("Error upserting coin to database:", error);
    } else {
      console.log(`Successfully upserted coin: ${coin.base}`);
    }

    await delay(1000); // Delay to prevent rate limiting issues
  }
};

// Main function to run the script
const main = async () => {
  const { data: existingCoins, error: fetchError } = await supabase
    .from("coins")
    .select("*");
  if (fetchError) {
    console.error("Error fetching existing coins:", fetchError);
  } else {
    console.log("Existing coins in database:", existingCoins);
  }

  const coins = await fetchCoins();
  console.log("Fetched coins:", coins);
  await upsertCoinsToDatabase(coins);
  console.log("Done.");
};

main();

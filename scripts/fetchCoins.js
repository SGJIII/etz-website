/* eslint @typescript-eslint/no-var-requires: "off" */
require("dotenv").config({ path: "./.env.staging" });
const axios = require("axios");
const { supabase } = require("../src/lib/supabase");

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

      if (!coins || coins.length === 0) {
        console.error("No coins data received from Coinbase");
        break;
      }

      allCoins = allCoins.concat(coins);

      // Handle pagination
      const nextPage = response.data.pagination.next_uri;
      url = nextPage ? `https://api.coinbase.com${nextPage}` : null;
    } catch (error) {
      console.error("Error fetching coins from Coinbase:", error.message);
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
    try {
      const { data, error } = await supabase.from("coins").upsert(
        {
          coin_name: coin.base, // Ensure this matches your database schema
          coin_base: coin.base,
          coinbase_product_id: `${coin.base}-USD`,
        },
        { onConflict: ["coin_name"] } // Ensure this matches your conflict resolution column
      );

      if (error) {
        console.error(
          `Error upserting coin to database: ${coin.base}`,
          error.message
        );
      } else {
        console.log(`Successfully upserted coin: ${coin.base}`);
        console.log("Upsert result:", data); // Log the data returned by the upsert
      }
    } catch (error) {
      console.error(`Error during upsert of coin: ${coin.base}`, error.message);
    }

    await delay(1000); // Delay to prevent rate limiting issues
  }
};

// Main function to run the script
const main = async () => {
  try {
    const { data: existingCoins, error: fetchError } = await supabase
      .from("coins")
      .select("*");
    if (fetchError) {
      console.error("Error fetching existing coins:", fetchError.message);
    } else {
      console.log("Existing coins in database:", existingCoins.length);
    }

    const coins = await fetchCoins();
    console.log("Fetched coins from Coinbase:", coins.length);
    await upsertCoinsToDatabase(coins);
    console.log("Done.");
  } catch (error) {
    console.error("Error in main function:", error.message);
  }
};

main();

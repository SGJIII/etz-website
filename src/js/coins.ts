import axios from "axios";
import { supabase } from "../lib/supabase";

const corsProxy = process.env.REACT_APP_CORS_PROXY;

interface Coin {
  id: number;
  coingecko_id: string;
  coin_name: string;
  currentPrice: number;
  priceChange24h: string;
  priceChange7d: string;
  volume: number;
  marketCap: number;
}

// Queue to manage requests
const requestQueue: (() => Promise<any>)[] = [];
let isProcessingQueue = false;

// Utility function to introduce delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to process the request queue
async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      await task();
      await delay(2000); // Adjust the delay to ensure we stay within rate limits
    }
  }

  isProcessingQueue = false;
}

// Function to add tasks to the queue
function addToQueue(task: () => Promise<any>) {
  requestQueue.push(task);
  processQueue();
}

// Function to fetch coin data
async function fetchCoinData(coin: Coin): Promise<Coin> {
  console.log(`Fetching data for coin: ${coin.coingecko_id}`);
  try {
    const response = await axios.get(
      `${corsProxy}https://api.coingecko.com/api/v3/coins/${coin.coingecko_id}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days: 30,
        },
      }
    );
    console.log(`Received data for coin: ${coin.coingecko_id}`);
    const prices = response.data.prices;
    const currentPrice = prices[prices.length - 1][1];
    const price24hAgo = prices[prices.length - 24][1];
    const price7dAgo = prices[prices.length - 24 * 7][1];
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    const priceChange7d = ((currentPrice - price7dAgo) / price7dAgo) * 100;

    return {
      ...coin,
      currentPrice,
      priceChange24h: priceChange24h.toFixed(2),
      priceChange7d: priceChange7d.toFixed(2),
      volume:
        response.data.total_volumes[response.data.total_volumes.length - 1][1],
      marketCap:
        response.data.market_caps[response.data.market_caps.length - 1][1],
    };
  } catch (error) {
    console.error(
      `Error fetching CoinGecko data for ${coin.coingecko_id}:`,
      error
    );
    return coin;
  }
}

// Function to get coins and process them in chunks
export async function getCoins(): Promise<Coin[]> {
  console.log("Fetching coins from Supabase...");
  const { data: coins, error } = await supabase.from("coins").select("*");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return [];
  }
  console.log(`Fetched ${coins.length} coins from Supabase.`);

  const enhancedCoins: Coin[] = [];

  for (const coin of coins) {
    addToQueue(async () => {
      const enhancedCoin = await fetchCoinData(coin);
      enhancedCoins.push(enhancedCoin);
    });
  }

  // Wait until all tasks are processed
  while (isProcessingQueue || requestQueue.length > 0) {
    await delay(1000);
  }

  console.log("All coins have been processed.");
  return enhancedCoins;
}

import axios from "axios";
import { supabase } from "../lib/supabase";

const corsProxy = process.env.REACT_APP_CORS_PROXY;

interface Coin {
  id: number;
  coin_name: string;
  coinbase_product_id: string;
  coin_base: string;
  coingecko_id: string;
  currentPrice?: number;
  priceChange1d?: string;
  priceChange7d?: string;
  priceChange30d?: string;
  volume?: number;
  marketCap?: number;
  logo_url?: string;
  ai_content?: string;
}

// Queue to manage requests
const requestQueue: Set<() => Promise<void>> = new Set();
let isProcessingQueue = false;

// Utility function to introduce delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to process the request queue
async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.size > 0) {
    const task = requestQueue.values().next().value;
    if (task) {
      requestQueue.delete(task);
      console.log(`Processing task for coin`);
      await task();
      await delay(350); // Adjust the delay to ensure we stay within rate limits
    }
  }

  isProcessingQueue = false;
}

// Function to add tasks to the queue
function addToQueue(task: () => Promise<void>) {
  requestQueue.add(task);
  if (!isProcessingQueue) {
    processQueue();
  }
}

// Function to fetch historical data
async function fetchHistoricalData(
  product_id: string,
  days: number
): Promise<any[]> {
  const now = new Date();
  const end = Math.floor(now.getTime() / 1000);
  const start = end - days * 86400;
  const url = `${corsProxy}https://api.exchange.coinbase.com/products/${product_id}/candles`;

  const response = await axios.get(url, {
    params: {
      granularity: 86400,
      start,
      end,
    },
  });

  return response.data;
}

// Function to fetch coin data from Coinbase API
async function fetchCoinData(
  coin: Coin,
  tableBody: HTMLElement,
  retries = 5,
  backoff = 1000
): Promise<void> {
  console.log(`Fetching data for coin: ${coin.coin_name}`);
  try {
    // Fetch historical data
    const [candles1d, candles7d, candles30d] = await Promise.all([
      fetchHistoricalData(coin.coinbase_product_id, 1),
      fetchHistoricalData(coin.coinbase_product_id, 7),
      fetchHistoricalData(coin.coinbase_product_id, 30),
    ]);

    const currentPrice = candles1d[candles1d.length - 1][4];
    const volume = candles1d.reduce((acc, candle) => acc + candle[5], 0);

    const priceChange1d =
      ((currentPrice - candles1d[0][4]) / candles1d[0][4]) * 100;
    const priceChange7d =
      ((currentPrice - candles7d[0][4]) / candles7d[0][4]) * 100;
    const priceChange30d =
      ((currentPrice - candles30d[0][4]) / candles30d[0][4]) * 100;

    const enhancedCoin: Coin = {
      ...coin,
      currentPrice,
      priceChange1d: priceChange1d.toFixed(2),
      priceChange7d: priceChange7d.toFixed(2),
      priceChange30d: priceChange30d.toFixed(2),
      volume,
      marketCap: 0, // Placeholder for market cap
    };

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><img src="${enhancedCoin.logo_url}" alt="${
      enhancedCoin.coin_name
    }" width="24" height="24" /></td>
      <td><a href="/coin/${enhancedCoin.coin_name.toLowerCase()}">${
      enhancedCoin.coin_name
    }</a></td>
      <td>$${enhancedCoin.currentPrice?.toFixed(2) || "N/A"}</td>
      <td>${enhancedCoin.priceChange1d}</td>
      <td>${enhancedCoin.priceChange7d}</td>
      <td>${enhancedCoin.priceChange30d}</td>
      <td>$${enhancedCoin.volume?.toLocaleString() || "N/A"}</td>
      <td>$${enhancedCoin.marketCap?.toLocaleString() || "N/A"}</td>
    `;
    tableBody.appendChild(row);
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.error(`Coin not found on Coinbase: ${coin.coin_name}`);
    } else if (error.response && error.response.status === 429 && retries > 0) {
      console.warn(
        `Rate limited. Retrying ${coin.coin_name} in ${backoff}ms...`
      );
      await delay(backoff);
      return fetchCoinData(
        coin,
        tableBody,
        retries - 1,
        Math.min(backoff * 2, 60000)
      );
    } else {
      console.error(
        `Error fetching Coinbase data for ${coin.coin_name}:`,
        error
      );
    }
  }
}

// Function to get coins and process them in chunks
export async function getCoins(): Promise<void> {
  console.log("Fetching coins from Supabase...");
  const { data: coins, error } = await supabase
    .from("coins")
    .select("*")
    .neq("ai_content", null)
    .neq("coin_base", null)
    .neq("logo_url", null);
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return;
  }
  console.log(`Fetched ${coins.length} coins from Supabase.`);

  const tableBody = document.querySelector("tbody");
  if (!tableBody) return;

  // Adding tasks to the queue and ensuring each coin is processed only once
  coins.forEach((coin) => {
    if (!coin.coin_name) {
      console.warn(`Skipping coin with undefined coin_name: ${coin.coin_name}`);
      return;
    }
    addToQueue(() => fetchCoinData(coin, tableBody));
  });

  // Wait until all tasks are processed
  while (isProcessingQueue || requestQueue.size > 0) {
    await delay(1000);
  }

  console.log("All coins have been processed.");
}

import axios from "axios";
import { supabase } from "../lib/supabase";

const corsProxy = process.env.REACT_APP_CORS_PROXY;

interface Coin {
  id: number;
  coinbase_id: string;
  coin_name: string;
  logo_url?: string;
  currentPrice?: number;
  priceChange1d?: string;
  priceChange7d?: string;
  priceChange30d?: string;
  volume?: number;
  marketCap?: number;
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
      await delay(350); // Adjust the delay to stay within the rate limit
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

// Function to fetch coin data with exponential backoff
async function fetchCoinData(
  coin: Coin,
  tableBody: HTMLElement,
  retries = 10, // Maximum retries for up to ~60 seconds
  backoff = 1000
): Promise<void> {
  console.log(`Fetching data for coin: ${coin.coinbase_id}`);
  try {
    const response = await axios.get(
      `${corsProxy}https://api.coinbase.com/v2/assets/search`,
      {
        params: {
          base: coin.coinbase_id,
          limit: 1,
        },
      }
    );
    console.log(`Received data for coin: ${coin.coinbase_id}`);
    const data = response.data.data[0];
    const currentPrice = data.latest;
    const price1dAgo = data.latest - data["1d"];
    const price7dAgo = data.latest - data["7d"];
    const price30dAgo = data.latest - data["30d"];
    const priceChange1d = ((currentPrice - price1dAgo) / price1dAgo) * 100;
    const priceChange7d = ((currentPrice - price7dAgo) / price7dAgo) * 100;
    const priceChange30d = ((currentPrice - price30dAgo) / price30dAgo) * 100;

    const enhancedCoin: Coin = {
      ...coin,
      logo_url: data.image_url,
      currentPrice,
      priceChange1d: priceChange1d.toFixed(2),
      priceChange7d: priceChange7d.toFixed(2),
      priceChange30d: priceChange30d.toFixed(2),
      volume: data.volume_24h,
      marketCap: data.market_cap,
    };

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><img src="${enhancedCoin.logo_url}" alt="${
      enhancedCoin.coin_name
    } logo" width="24" height="24"/></td>
      <td><a href="/coin/${enhancedCoin.coin_name.toLowerCase()}">${
      enhancedCoin.coin_name
    }</a></td>
      <td>$${enhancedCoin.currentPrice?.toFixed(2) || "N/A"}</td>
      <td>${enhancedCoin.priceChange1d || "N/A"}%</td>
      <td>${enhancedCoin.priceChange7d || "N/A"}%</td>
      <td>${enhancedCoin.priceChange30d || "N/A"}%</td>
      <td>$${enhancedCoin.volume?.toLocaleString() || "N/A"}</td>
      <td>$${enhancedCoin.marketCap?.toLocaleString() || "N/A"}</td>
    `;
    tableBody.appendChild(row);
  } catch (error: any) {
    if (error.response && error.response.status === 429 && retries > 0) {
      console.warn(
        `Rate limited. Retrying ${coin.coinbase_id} in ${backoff}ms...`
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
        `Error fetching Coinbase data for ${coin.coinbase_id}:`,
        error
      );
    }
  }
}

// Function to get coins and process them in chunks
export async function getCoins(): Promise<void> {
  console.log("Fetching coins from Supabase...");
  const { data: coins, error } = await supabase.from("coins").select("*");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return;
  }
  console.log(`Fetched ${coins.length} coins from Supabase.`);

  const tableBody = document.querySelector("tbody");
  if (!tableBody) return;

  // Adding tasks to the queue and ensuring each coin is processed only once
  coins.forEach((coin) => {
    addToQueue(() => fetchCoinData(coin, tableBody));
  });

  // Wait until all tasks are processed
  while (isProcessingQueue || requestQueue.size > 0) {
    await delay(1000);
  }

  console.log("All coins have been processed.");
}

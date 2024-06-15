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
  priceChange24h?: string;
  volume?: number;
  logo_url?: string;
  ai_content?: string;
  market_cap_rank?: number;
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
      await delay(500); // Increased delay to prevent rate limiting
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

// Function to fetch coin data from Coinbase API
async function fetchCoinData(
  coin: Coin,
  tableBody: HTMLElement,
  retries = 5,
  backoff = 1000
): Promise<void> {
  console.log(`Fetching data for coin: ${coin.coin_name}`);
  try {
    let currentPrice = 1.0;
    let volume = 0;
    let priceChange24h = "0";

    // Special case for USDC
    if (coin.coin_name !== "USD Coin") {
      const statsResponse = await axios.get(
        `${corsProxy}https://api.exchange.coinbase.com/products/${coin.coinbase_product_id}/stats`
      );

      const stats24h = statsResponse.data.stats_24hour;

      currentPrice = parseFloat(stats24h.last);
      volume = parseFloat(stats24h.volume);
      const open = parseFloat(stats24h.open);
      const last = parseFloat(stats24h.last);

      if (open && last) {
        priceChange24h = (((last - open) / open) * 100).toFixed(2);
      }
    }

    const enhancedCoin: Coin = {
      ...coin,
      currentPrice,
      priceChange24h,
      volume,
    };

    const formattedVolume = formatVolume(enhancedCoin.volume ?? 0);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><img src="${enhancedCoin.logo_url}" alt="${
      enhancedCoin.coin_name
    }" width="24" height="24" /></td>
      <td><a href="/coin/${enhancedCoin.coin_name.toLowerCase()}">${
      enhancedCoin.coin_name
    }</a></td>
      <td>$${enhancedCoin.currentPrice?.toFixed(2) || "N/A"}</td>
      <td>${enhancedCoin.priceChange24h}%</td>
      <td>$${formattedVolume}</td>
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

function formatVolume(volume: number): string {
  if (volume >= 1e12) {
    return (volume / 1e12).toFixed(1) + "T";
  } else if (volume >= 1e9) {
    return (volume / 1e9).toFixed(1) + "B";
  } else if (volume >= 1e6) {
    return (volume / 1e6).toFixed(1) + "M";
  } else {
    return volume.toFixed(0);
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
    .neq("logo_url", null)
    .order("market_cap_rank", { ascending: true });
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

  // Ensure USDC is included
  const usdc = coins.find((coin) => coin.coin_name === "USD Coin");
  if (usdc) {
    addToQueue(() => fetchCoinData(usdc, tableBody));
  }

  // Wait until all tasks are processed
  while (isProcessingQueue || requestQueue.size > 0) {
    await delay(1000);
  }

  console.log("All coins have been processed.");
}

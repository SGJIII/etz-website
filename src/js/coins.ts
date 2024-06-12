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

const queue: (() => Promise<any>)[] = [];
let isProcessingQueue = false;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (queue.length > 0) {
    const task = queue.shift();
    if (task) {
      await task();
      await delay(2000); // Adjust the delay as needed
    }
  }

  isProcessingQueue = false;
}

function addToQueue(task: () => Promise<any>) {
  queue.push(task);
  processQueue();
}

async function fetchCoinData(coin: Coin): Promise<Coin> {
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

export async function getCoins(): Promise<Coin[]> {
  const { data: coins, error } = await supabase.from("coins").select("*");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return [];
  }

  const enhancedCoins: Coin[] = [];

  for (const coin of coins) {
    addToQueue(async () => {
      const enhancedCoin = await fetchCoinData(coin);
      enhancedCoins.push(enhancedCoin);
    });
  }

  // Wait until all tasks are processed
  while (isProcessingQueue || queue.length > 0) {
    await delay(1000);
  }

  return enhancedCoins;
}

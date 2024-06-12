import axios from "axios";
import axiosRetry from "axios-retry";
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

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
  retryCondition: (error) => {
    return error.response ? error.response.status === 429 : false;
  },
});

export async function getCoins(): Promise<Coin[]> {
  const { data: coins, error } = await supabase.from("coins").select("*");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return [];
  }

  // Fetch coins in chunks to avoid hitting the rate limit
  const chunkSize = 10;
  const enhancedCoins: Coin[] = [];

  for (let i = 0; i < coins.length; i += chunkSize) {
    const chunk = coins.slice(i, i + chunkSize);
    const enhancedChunk = await Promise.all(
      chunk.map(async (coin: Coin) => {
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
          const priceChange24h =
            ((currentPrice - price24hAgo) / price24hAgo) * 100;
          const priceChange7d =
            ((currentPrice - price7dAgo) / price7dAgo) * 100;

          return {
            ...coin,
            currentPrice,
            priceChange24h: priceChange24h.toFixed(2),
            priceChange7d: priceChange7d.toFixed(2),
            volume:
              response.data.total_volumes[
                response.data.total_volumes.length - 1
              ][1],
            marketCap:
              response.data.market_caps[
                response.data.market_caps.length - 1
              ][1],
          };
        } catch (error) {
          console.error(
            `Error fetching CoinGecko data for ${coin.coingecko_id}:`,
            error
          );
          return coin;
        }
      })
    );
    enhancedCoins.push(...enhancedChunk);
  }

  return enhancedCoins;
}

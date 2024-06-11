import axios from "axios";
import { supabase } from "../lib/supabase";

interface Coin {
  id: number;
  coin_name: string;
  currentPrice: number;
  priceChange24h: string;
  priceChange7d: string;
  volume: number;
  marketCap: number;
}

export async function getCoins(): Promise<Coin[]> {
  const { data: coins, error } = await supabase.from("coins").select("*");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return [];
  }

  const enhancedCoins = await Promise.all(
    coins.map(async (coin: Coin) => {
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${coin.coin_name.toLowerCase()}/market_chart`,
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
        const priceChange7d = ((currentPrice - price7dAgo) / price7dAgo) * 100;

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
            response.data.market_caps[response.data.market_caps.length - 1][1],
        };
      } catch (error) {
        console.error(
          `Error fetching CoinGecko data for ${coin.coin_name}:`,
          error
        );
        return coin;
      }
    })
  );

  return enhancedCoins;
}

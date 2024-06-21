import { supabase } from "../lib/supabase";
import axios from "axios";
import axiosRetry from "axios-retry";

const corsProxy = process.env.REACT_APP_CORS_PROXY;

interface Coin {
  coingecko_id: string;
  coin_name: string;
  coin_symbol: string;
  description: string;
  image_url: string;
}

axiosRetry(axios, {
  retries: 1,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
  retryCondition: (error) => {
    return error.response ? error.response.status === 429 : false;
  },
});

export async function getCoin(coinName: string): Promise<Coin | null> {
  const { data: coin, error } = await supabase
    .from("coins")
    .select("*")
    .eq("coin_name", coinName)
    .single();
  if (error) {
    console.error(`Error fetching coin data for ${coinName}:`, error);
    return null;
  }

  try {
    const response = await axios.get(
      `${corsProxy}https://api.coingecko.com/api/v3/coins/${coin.coingecko_id}`
    );
    return {
      ...coin,
      description: response.data.description.en,
      image_url: response.data.image.large,
    };
  } catch (error) {
    console.error(
      `Error fetching CoinGecko data for ${coin.coingecko_id}:`,
      error
    );
    return coin;
  }
}

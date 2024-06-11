import { supabase } from "../lib/supabase";
import axios from "axios";

const corsProxy = "https://cors-anywhere.herokuapp.com/";

interface Coin {
  coin_name: string;
  coin_symbol: string;
  description: string;
  image_url: string;
}

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
      `${corsProxy}https://api.coingecko.com/api/v3/coins/${coinName.toLowerCase()}`
    );
    return {
      ...coin,
      description: response.data.description.en,
      image_url: response.data.image.large,
    };
  } catch (error) {
    console.error(`Error fetching CoinGecko data for ${coinName}:`, error);
    return coin;
  }
}

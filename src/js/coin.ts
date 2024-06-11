import { supabase } from "../lib/supabase";

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

  return coin;
}

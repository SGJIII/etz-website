/* eslint-disable import/no-duplicates */
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import HeaderMobile from "../../components/header-menu/index.mobile.html"; // Import the mobile header component
import HeaderDesktop from "../../components/header-menu/index.html"; // Import the desktop header component
import "../../styles/coins.css";
import axios from "axios";

export async function getStaticProps() {
  const { data: coins, error } = await supabase.from("coins").select("*");
  if (error) {
    console.error("Error fetching coins from Supabase:", error);
    return { props: { coins: [] } };
  }

  // Fetch additional data from CoinGecko API
  const enhancedCoins = await Promise.all(
    coins.map(async (coin) => {
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
        const price24hAgo = prices[prices.length - 24][1]; // Assuming 1 entry per hour
        const price7dAgo = prices[prices.length - 24 * 7][1]; // Assuming 1 entry per hour
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

  return {
    props: {
      coins: enhancedCoins,
    },
  };
}

const CoinsList = ({ coins }) => {
  return (
    <div>
      <div className="header-mobile">
        <HeaderMobile /> {/* Include the mobile header component */}
      </div>
      <div className="header-desktop">
        <HeaderDesktop /> {/* Include the desktop header component */}
      </div>
      <div className="coin-list">
        <h1>Coin List</h1>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Coin</th>
              <th>Price</th>
              <th>1h</th>
              <th>24h</th>
              <th>7d</th>
              <th>24h Volume</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin, index) => (
              <tr key={coin.id}>
                <td>{index + 1}</td>
                <td>
                  <Link href={`/coin/${coin.coin_name.toLowerCase()}`}>
                    <a>{coin.coin_name}</a>
                  </Link>
                </td>
                <td>${coin.currentPrice.toFixed(2)}</td>
                <td>{coin.priceChange1h ? `${coin.priceChange1h}%` : "N/A"}</td>
                <td>{coin.priceChange24h}%</td>
                <td>{coin.priceChange7d}%</td>
                <td>${coin.volume.toLocaleString()}</td>
                <td>${coin.marketCap.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CoinsList;

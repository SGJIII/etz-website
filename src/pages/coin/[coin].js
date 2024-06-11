import { supabase } from "../../lib/supabase";
import HeaderMobile from "../../components/header-menu/index.mobile.html"; // Import the mobile header component
import HeaderDesktop from "../../components/header-menu/index.html"; // Import the desktop header component
import "../../styles/coin.css";

export async function getStaticPaths() {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("coin_name");
  if (error) console.error(error);

  const paths = coins.map((coin) => ({
    params: { coin: coin.coin_name.toLowerCase() },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const { data: coin, error } = await supabase
    .from("coins")
    .select("*")
    .eq("coin_name", params.coin)
    .single();
  if (error) console.error(error);

  return { props: { coin } };
}

const CoinPage = ({ coin }) => {
  return (
    <div>
      <div className="header-mobile">
        <HeaderMobile /> {/* Include the mobile header component */}
      </div>
      <div className="header-desktop">
        <HeaderDesktop /> {/* Include the desktop header component */}
      </div>
      <div className="coin-page">
        <h1>
          {coin.coin_name} IRA, {coin.coin_name} Roth IRA, & {coin.coin_name}{" "}
          SEP IRA
        </h1>
        <p>{coin.ai_content}</p>
        <img
          src={coin.coingecko_graph_endpoint}
          alt={`${coin.coin_name} graph`}
        />
      </div>
    </div>
  );
};

export default CoinPage;

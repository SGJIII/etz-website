import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import markdownIt from "markdown-it";

const supabaseUrl = "https://qielvcdqxiliyvdyrfyu.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWx2Y2RxeGlsaXl2ZHlyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4ODU2MzYsImV4cCI6MjAzMzQ2MTYzNn0.FZnrpmfL5gosrfGF2DRdWXpGMaJZSvf67l99mmzoNxo";
const supabase = createClient(supabaseUrl, supabaseKey);

const md = new markdownIt();

const fetchCoinData = async (coinName) => {
  const { data, error } = await supabase
    .from("coins")
    .select("*") // Fetch all columns including is_prime
    .eq("coin_name", coinName)
    .single();

  if (error) {
    console.error("Error fetching data from Supabase:", error);
    return null;
  }
  return data;
};

const fetchCoinPrice = async (coinbaseProductId) => {
  try {
    const response = await axios.get(
      `https://api.coinbase.com/v2/prices/${coinbaseProductId}/spot`
    );
    return parseFloat(response.data.data.amount);
  } catch (error) {
    console.error("Error fetching price from Coinbase:", error);
    return null;
  }
};

export const renderCoinPage = async () => {
  const coinName = decodeURIComponent(
    document.location.pathname.split("/").pop().replace(".html", "")
  );
  const coinData = await fetchCoinData(coinName);

  if (!coinData) {
    console.error("Coin data not found");
    return;
  }

  document.getElementById(
    "coin-title"
  ).textContent = `${coinData.coin_name} Roth IRA, ${coinData.coin_name} SEP IRA, ${coinData.coin_name} Traditional IRA | ETZ Soft `;

  document
    .querySelector("meta[property='og:title']")
    .setAttribute("content", `${coinData.coin_name} IRAs`);
  document
    .querySelector("meta[property='og:description']")
    .setAttribute("content", `Learn more about ${coinData.coin_name}`);
  document
    .querySelector("meta[property='og:url']")
    .setAttribute("content", `https://etzsoft.com/${coinData.coin_name}.html`);
  document
    .querySelector("meta[name='twitter:title']")
    .setAttribute("content", `${coinData.coin_name} IRAs`);

  const headerTitle = document.querySelector(".HeaderSection_title");
  if (headerTitle) {
    headerTitle.textContent = `${coinData.coin_name} IRAs`;
  }

  const tradingViewEmbed = document.getElementById("tradingview-embed");
  tradingViewEmbed.innerHTML = `
    <!-- TradingView Widget BEGIN -->
    <div class="tradingview-widget-container">
      <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
      <div class="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span class="blue-text"></span>
        </a>
      </div>
    </div>
    <!-- TradingView Widget END -->
  `;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src =
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    fullscreen: true,
    symbol: coinData.tradingview_symbol, // Use tradingview_symbol from the database
    interval: "D",
    timezone: "Etc/UTC",
    theme: "light",
    style: "3",
    locale: "en",
    backgroundColor: "rgba(255, 255, 255, 1)",
    gridColor: "rgba(42, 46, 57, 0)",
    allow_symbol_change: false,
    calendar: false,
    hide_volume: true,
    support_host: "https://www.tradingview.com",
    custom_css_url: "../styles/tradingview-custom.css",
  });

  tradingViewEmbed.appendChild(script);

  const coinContent = document.getElementById("coin-content");
  coinContent.innerHTML = md.render(coinData.ai_content);

  // Add the button based on is_prime
  const buttonContainer = document.createElement("div");
  buttonContainer.style.textAlign = "center";
  buttonContainer.style.marginTop = "20px";

  const button = document.createElement("a");
  button.href = "https://etz.app.link/YM4SdypaQKb";
  button.textContent = coinData.is_prime ? "Buy Now" : "Request";
  button.style.display = "inline-block";
  button.style.padding = "15px 75px";
  button.style.background = "linear-gradient(45deg, #226DFF, #2891FF)";
  button.style.color = "white";
  button.style.fontFamily = "'Rubik', sans-serif";
  button.style.fontWeight = "600";
  button.style.borderRadius = "10px";
  button.style.textDecoration = "none";
  button.style.marginTop = "50px";
  button.style.fontSize = "Larger";

  buttonContainer.appendChild(button);
  coinContent.appendChild(buttonContainer);
};

document.addEventListener("DOMContentLoaded", () => {
  renderCoinPage();
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qielvcdqxiliyvdyrfyu.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWx2Y2RxeGlsaXl2ZHlyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4ODU2MzYsImV4cCI6MjAzMzQ2MTYzNn0.FZnrpmfL5gosrfGF2DRdWXpGMaJZSvf67l99mmzoNxo";
const supabase = createClient(supabaseUrl, supabaseKey);

const fetchCoinbaseData = async (coinBase) => {
  const productId = `${coinBase}-USD`;
  try {
    const response = await fetch(
      `https://api.coinbase.com/v2/prices/${productId}/spot`
    );
    if (!response.ok) {
      throw new Error(`Coinbase API returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.data || !data.data.amount) {
      throw new Error(`Invalid data format from Coinbase API for ${productId}`);
    }
    return {
      price: parseFloat(data.data.amount),
    };
  } catch (error) {
    console.error(`Error fetching data for ${productId}:`, error);
    return null;
  }
};

const fetchCoinbaseHistoricalData = async (coinBase, start, end) => {
  const productId = `${coinBase}-USD`;
  const url = `https://api.pro.coinbase.com/products/${productId}/candles?start=${start}&end=${end}&granularity=900`;
  console.log(`Requesting historical data with URL: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Coinbase API returned status ${response.status}`);
    }
    const data = await response.json();
    console.log(`Historical data for ${productId}:`, data); // Detailed logging
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error(`Invalid data format from Coinbase API for ${productId}`);
    }
    // Extract the closing prices from the first and last arrays
    return {
      currentPrice: data[0][4], // Closing price of the most recent bucket
      pastPrice: data[data.length - 1][4], // Closing price of the oldest bucket in the range
    };
  } catch (error) {
    console.error(`Error fetching historical data for ${productId}:`, error);
    return null;
  }
};

const calculate24hrChange = (currentPrice, pastPrice) => {
  if (!currentPrice || !pastPrice) return null;
  const change = ((currentPrice - pastPrice) / pastPrice) * 100;
  return change.toFixed(2); // Return percentage change with 2 decimal places
};

export const fetchData = async () => {
  const { data, error } = await supabase
    .from("coins")
    .select("*", { count: "exact" }) // Ensure all records are returned
    .not("logo_url", "is", null)
    .not("ai_content", "is", null)
    .not("coin_base", "is", null)
    .order("market_cap_rank", { ascending: true });

  if (error) {
    console.error("Error fetching data from Supabase:", error);
    return [];
  }
  return data;
};

export const populateTable = async (data, tableBody) => {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  const formatTimestamp = (date) => {
    const pad = (num, size) => String(num).padStart(size, "0");
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1, 2);
    const day = pad(date.getUTCDate(), 2);
    const hours = pad(date.getUTCHours(), 2);
    const minutes = pad(date.getUTCMinutes(), 2);
    const seconds = pad(date.getUTCSeconds(), 2);
    const milliseconds = pad(date.getUTCMilliseconds(), 3) + "0000"; // Ensuring 7 decimal places
    return `${year}-${month}-${day}T${hours}%3A${minutes}%3A${seconds}.${milliseconds}Z`;
  };

  const startTimestamp = formatTimestamp(past);
  const endTimestamp = formatTimestamp(now);

  for (const coin of data) {
    const coinbaseData = await fetchCoinbaseData(coin.coin_base);
    const historicalData = await fetchCoinbaseHistoricalData(
      coin.coin_base,
      startTimestamp,
      endTimestamp
    );

    // Skip rows where the "Price" column is "N/A"
    if (!coinbaseData) continue;

    let change = "-";
    let changeClass = "no-change";
    if (historicalData) {
      const changeValue = calculate24hrChange(
        coinbaseData.price,
        historicalData.pastPrice
      );
      if (changeValue !== null) {
        change = `${changeValue}%`;
        changeClass = changeValue >= 0 ? "positive-change" : "negative-change";
      }
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="name-column">
        <div class="coin-link">
          <img src="${coin.logo_url}" alt="${
      coin.coin_name
    } logo" class="coin-logo">
          <div class="coin-info">
            <span class="coin-name">${coin.coin_name}</span>
            <span class="coin-base">${coin.coin_base}</span>
          </div>
        </div>
      </td>
      <td class="price-column">$${coinbaseData.price.toFixed(2)}</td>
      <td class="change-column ${changeClass}">${change}</td>
      <td class="buy-column">
        <a href="https://etz.app.link/YM4SdypaQKb" class="buy-button">
          ${coin.is_prime ? "Buy Now" : "Request"}
        </a>
      </td>
      <a href="/${coin.coin_name}.html" class="row-link"></a>
    `;
    tableBody.appendChild(row);
  }
};

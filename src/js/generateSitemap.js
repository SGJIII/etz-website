const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://qielvcdqxiliyvdyrfyu.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWx2Y2RxeGlsaXl2ZHlyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4ODU2MzYsImV4cCI6MjAzMzQ2MTYzNn0.FZnrpmfL5gosrfGF2DRdWXpGMaJZSvf67l99mmzoNxo";
const supabase = createClient(supabaseUrl, supabaseKey);

const generateSitemap = async () => {
  try {
    const { data, error } = await supabase.from("coins").select("coin_name");

    if (error) {
      console.error("Error fetching data from Supabase:", error);
      return;
    }

    const baseUrl = "https://etzsoft.com/";
    let urls = data.map((coin) => {
      const coinNameEncoded = encodeURIComponent(coin.coin_name).replace(
        /%20/g,
        "%20"
      ); // Properly encode the coin name
      return `<url><loc>${baseUrl}coin/${coinNameEncoded}.html</loc></url>`;
    });

    const staticUrls = [
      `<url><loc>${baseUrl}</loc></url>`,
      `<url><loc>${baseUrl}employers.html</loc></url>`,
      `<url><loc>${baseUrl}legal.html</loc></url>`,
      `<url><loc>${baseUrl}.well-known/change-password.html</loc></url>`,
      `<url><loc>${baseUrl}assets.html</loc></url>`,
      `<url><loc>${baseUrl}founders.html</loc></url>`,
    ];

    urls = urls.concat(staticUrls);

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
      "\n"
    )}\n</urlset>`;

    fs.writeFileSync(
      path.join(__dirname, "../../dist/sitemap.xml"),
      sitemapContent,
      "utf8"
    );
    console.log("Sitemap generated successfully");
  } catch (err) {
    console.error("Error generating sitemap:", err);
  }
};

generateSitemap();

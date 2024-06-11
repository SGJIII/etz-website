/* eslint @typescript-eslint/no-var-requires: "off" */
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
require("dotenv").config({ path: "./.env.staging" });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error("Supabase URL, Key, and OpenAI API Key are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const generateArticle = async (coinName, coingeckoId) => {
  const prompt = `
    Write a comprehensive article about the tax advantages of investing in ${coinName} (${coingeckoId}) through IRAs, beginning with a section titled "About ${coinName} IRAs." This section should cover the basics of how IRAs can be used for cryptocurrency investments, including Traditional IRAs, Roth IRAs, and SEP IRAs. Explain that Traditional IRAs offer tax-deferred growth and tax-deductible contributions, Roth IRAs provide tax-free growth with after-tax contributions, and SEP IRAs, designed for self-employed individuals, allow higher contribution limits with tax-deferred growth. Detail the specific tax benefits for each IRA type, such as tax-deferred growth in Traditional and SEP IRAs and tax-free growth in Roth IRAs, and explain how these benefits can optimize retirement savings. Discuss how investing in ${coinName} within these IRAs can leverage these tax benefits, considering the coin's recent performance, growth potential, and associated risks. Emphasize the importance of selecting a suitable IRA provider that supports cryptocurrency investments, focusing on factors like fees, security, and ease of use. Provide guidance on setting up and funding the IRA, highlighting strategic planning and management to maximize tax savings and growth potential, ultimately ensuring a more tax-efficient retirement.
    `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a knowledgeable assistant." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1500,
  });

  return response.choices[0].message.content;
};

const updateCoinData = async () => {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("id, coin_name, coingecko_id");

  if (error) {
    console.error("Error fetching coins:", error.message);
    return;
  }

  for (const coin of coins) {
    console.log(`Generating article for ${coin.coin_name}...`);

    const content = await generateArticle(coin.coin_name, coin.coingecko_id);

    const { data: updateData, error: updateError } = await supabase
      .from("coins")
      .update({ ai_content: content })
      .eq("id", coin.id);

    if (updateError) {
      console.error(
        `Error updating content for coin ${coin.coin_name}:`,
        updateError.message
      );
    } else {
      console.log(`Successfully updated content for coin: ${coin.coin_name}`);
    }

    // Delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const main = async () => {
  console.log("Starting the data updating process...");
  await updateCoinData();
  console.log("Done.");
};

main();

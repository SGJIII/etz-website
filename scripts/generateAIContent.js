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

const generateArticle = async (coinName, coinBase) => {
  const prompt = `
    Please write a comprehensive article about the tax advantages of investing in ${coinName} (${coinBase}) through IRAs, beginning with a section titled "About ${coinName} (${coinBase}) IRAs." This section should start with a short description of the cryptocurrency ${coinName} then cover some of the best performing time periods for ${coinName} and explain how tax advantage accounts like IRAs could have been advantageous for investors in ${coinName} in such periods. Talk about how much and what kinds of tax they would likely pay and or save with a tax advantage account. Use numbers and figures as examples. Use only exact and accurate numbers, dates, etc. The article should then go into the basics of how IRAs can be used for cryptocurrency investments, including Traditional IRAs, Roth IRAs, and SEP IRAs. Explain that Traditional IRAs offer tax-deferred growth and tax-deductible contributions, Roth IRAs provide tax-free growth with after-tax contributions, and SEP IRAs, designed for self-employed individuals, allow higher contribution limits with tax-deferred growth. Detail the specific tax benefits for each IRA type, such as tax-deferred growth in Traditional and SEP IRAs and tax-free growth in Roth IRAs, and explain how these benefits can optimize retirement savings. Discuss how investing in ${coinName} within these IRAs can leverage these tax benefits, considering the coin's recent performance, growth potential, and associated risks. Emphasize the importance of selecting a suitable IRA provider that supports cryptocurrency investments, focusing on factors like fees, security, and ease of use. Please do this in an authoritative and direct tone and DO NOT be over-enthusiastic. Please make sure the content is SEO Optimized for keywords related to “${coinName} IRA”. Also DO NOT include a section with the title "introduction" or "conclusion" or anything that sounds similar like "to wrap up" or something like that. Also make 100% sure the article is written and styled in markdown for later use. DO NOT use placeholders of any kind in the article. Thank you.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a knowledgeable assistant." },
      { role: "user", content: prompt },
    ],
    max_tokens: 4096,
  });

  return response.choices[0].message.content;
};

const updateCoinData = async () => {
  const { data: coins, error } = await supabase
    .from("coins")
    .select("id, coin_name, coin_base, logo_url")
    .not("coin_base", "is", null)
    .not("logo_url", "is", null);

  if (error) {
    console.error("Error fetching coins:", error.message);
    return;
  }

  for (const coin of coins) {
    console.log(`Generating article for ${coin.coin_name}...`);

    const content = await generateArticle(coin.coin_name, coin.coin_base);

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

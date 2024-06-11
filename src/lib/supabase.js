/* eslint @typescript-eslint/no-var-requires: "off" */
// src/lib/supabase.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Environment variables REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are required"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };

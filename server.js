const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const markdownIt = require('markdown-it');

const app = express();
const port = 5140;

const supabaseUrl = 'https://qielvcdqxiliyvdyrfyu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWx2Y2RxeGlsaXl2ZHlyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4ODU2MzYsImV4cCI6MjAzMzQ2MTYzNn0.FZnrpmfL5gosrfGF2DRdWXpGMaJZSvf67l99mmzoNxo'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);
const md = new markdownIt();

// Serve static files
app.use(express.static('dist'));

// Fetch coin data from Supabase
const fetchCoinData = async (coinName) => {
  const { data, error } = await supabase
    .from('coins')
    .select('*')
    .eq('coin_name', coinName)
    .single();

  if (error) {
    console.error('Error fetching data from Supabase:', error);
    return null;
  }
  return data;
};

// Function to inject metadata and content into HTML
const injectMetaData = (html, title, description, content) => {
  return html
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{content}}/g, content);
};

// Serve coin pages with server-side rendering
app.get('/coin/:coinName.html', async (req, res) => {
  const coinName = decodeURIComponent(req.params.coinName);
  const filePath = path.join(__dirname, 'dist', 'coin.html');

  // Fetch coin data
  const coinData = await fetchCoinData(coinName);

  if (!coinData) {
    res.status(404).send('Coin not found');
    return;
  }

  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Server Error');
      return;
    }

    // Inject content into the HTML before sending it to the client
    const contentHtml = md.render(coinData.ai_content || '');
    const finalHtml = injectMetaData(
      html,
      `${coinData.coin_name} IRAs`,
      `Learn more about ${coinData.coin_name}`,
      contentHtml
    );

    res.send(finalHtml);
  });
});

// Serve assets page and other pages without modifying the content to ensure the change column works
app.get('/assets.html', (req, res) => {
  const filePath = path.join(__dirname, 'dist', 'assets.html');

  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Server Error');
      return;
    }

    res.send(html); // Serve the page without altering content
  });
});

// Serve other routes as usual, like the blog listing and individual post pages
app.get('/blog', (req, res) => {
  const filePath = path.join(__dirname, 'dist', 'blog.html');

  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Server Error');
      return;
    }

    const finalHtml = injectMetaData(html, 'Blog', 'Latest blog posts', '');
    res.send(finalHtml);
  });
});

app.get('/blog/:postSlug.html', async (req, res) => {
  const postSlug = decodeURIComponent(req.params.postSlug);
  const filePath = path.join(__dirname, 'dist', 'blogPost.html');

  try {
    const response = await fetch(`https://blog.etzsoft.com/wp-json/wp/v2/posts?slug=${postSlug}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const posts = await response.json();
    const post = posts[0];

    if (!post) {
      res.status(404).send('Post not found');
      return;
    }

    const postTitle = post.title.rendered;
    const postDescription = post.excerpt.rendered;
    const postContent = post.content.rendered;

    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) {
        res.status(500).send('Server Error');
        return;
      }

      const finalHtml = injectMetaData(html, postTitle, postDescription, postContent);
      res.send(finalHtml);
    });

  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).send('Server Error');
  }
});

app.use(express.static(path.join(__dirname, 'src')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

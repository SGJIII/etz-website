const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 5140;

// Function to dynamically import node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

app.use(express.static('dist'));

// Serve sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const filePath = path.join(__dirname, 'dist', 'sitemap.xml');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Server Error');
      return;
    }
    res.header('Content-Type', 'application/xml');
    res.send(data);
  });
});

// Function to replace placeholders with actual data
const injectMetaData = (html, title, description, content) => {
  return html.replace(/{{title}}/g, title)
             .replace(/{{description}}/g, description)
             .replace(/{{content}}/g, content);
};

// Serve coin pages
app.get('/coin/:coinName.html', (req, res) => {
  const coinName = decodeURIComponent(req.params.coinName);
  const filePath = path.join(__dirname, 'dist', 'coin.html');
  
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Server Error');
      return;
    }
    
    const finalHtml = injectMetaData(html, `${coinName} IRAs`, `Learn more about ${coinName}`, '');
    res.send(finalHtml);
  });
});

// Serve blog listing page
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

// Serve individual blog post pages dynamically
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

const fs = require('fs');
const path = require('path');

const apiEndpoint = 'https://blog.etzsoft.com/wp-json/wp/v2/posts';

const fetchBlogPosts = async () => {
    const fetch = (await import('node-fetch')).default;
    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const posts = await response.json();
        return posts;
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return [];
    }
};

const populateBlogList = async () => {
    const posts = await fetchBlogPosts();
    const blogListContent = posts.map(post => 
        `<div class="blog-post">
            <h2><a href="/blog/${post.slug}.html">${post.title.rendered}</a></h2>
            <p>${post.excerpt.rendered}</p>
        </div>`
    ).join('');

    const blogListTemplate = `
        <article id="blog-list">
            ${blogListContent}
        </article>
    `;

    const blogListDir = path.join(__dirname, 'dist', 'blog');
    if (!fs.existsSync(blogListDir)) {
        fs.mkdirSync(blogListDir, { recursive: true });
    }

    fs.writeFileSync(path.join(blogListDir, 'index.html'), blogListTemplate);
};

const populateBlogPosts = async () => {
    const posts = await fetchBlogPosts();

    posts.forEach(async (post) => {
        const blogPostContent = `
            <div id="post-content">
                <h1>${post.title.rendered}</h1>
                <div>${post.content.rendered}</div>
            </div>
        `;

        const postDir = path.join(__dirname, 'dist', 'blog', post.slug);
        if (!fs.existsSync(postDir)) {
            fs.mkdirSync(postDir, { recursive: true });
        }

        fs.writeFileSync(path.join(postDir, 'index.html'), blogPostContent);
    });
};

const generateBlogPages = async () => {
    await populateBlogList();
    await populateBlogPosts();
};

generateBlogPages();

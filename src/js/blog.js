const apiEndpoint = "https://blog.etzsoft.com/wp-json/wp/v2/posts";

const fetchBlogPosts = async () => {
  try {
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const posts = await response.json();
    return posts;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
};

export const renderBlogPosts = async () => {
  const posts = await fetchBlogPosts();
  const blogList = document.getElementById("blog-list");

  if (posts.length === 0) {
    blogList.innerHTML = "<p>No blog posts available.</p>";
    return;
  }

  blogList.innerHTML = posts
    .map(
      (post) =>
        `<div class="blog-post">
            <h2><a href="/blog/${post.slug}.html">${post.title.rendered}</a></h2>
            <p>${post.excerpt.rendered}</p>
        </div>`
    )
    .join("");
};

document.addEventListener("DOMContentLoaded", renderBlogPosts);

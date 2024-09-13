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

  // Render the list of blog posts
  blogList.innerHTML = posts
    .map(
      (post) =>
        `<div class="blog-post">
            <h2><a href="/blog/${post.slug}.html">${post.title.rendered}</a></h2>
            <p>${post.excerpt.rendered}</p>
        </div>`
    )
    .join("");

  // Automatically set the canonical URL for individual blog posts
  const currentPath = window.location.pathname;
  const postSlug = currentPath.split("/").pop().replace(".html", "");

  // Find the matching post based on the current URL
  const matchingPost = posts.find((post) => post.slug === postSlug);

  if (matchingPost) {
    // Create the canonical link element
    const canonicalLink = document.createElement("link");
    canonicalLink.rel = "canonical";
    canonicalLink.href = `https://etzsoft.com/blog/${postSlug}.html`;

    // Append the canonical link to the document head
    document.head.appendChild(canonicalLink);
  }
};

document.addEventListener("DOMContentLoaded", renderBlogPosts);

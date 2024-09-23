const apiEndpoint = "https://blog.etzsoft.com/wp-json/wp/v2/posts";

const getPostSlug = () => {
  const urlParams = new URLSearchParams(window.location.search);
  let slug = urlParams.get("slug");

  if (!slug) {
    const pathParts = window.location.pathname.split("/");
    slug = pathParts[pathParts.length - 1].replace(".html", "");
  }

  console.log("Extracted Slug:", slug);
  return slug;
};

const fetchBlogPost = async (slug) => {
  try {
    console.log("Fetching post with slug:", slug);
    const response = await fetch(`${apiEndpoint}?slug=${slug}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const posts = await response.json();
    console.log("Fetched posts:", posts);
    return posts[0]; // The response is an array
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
};

export const renderBlogPost = async () => {
  const slug = getPostSlug();
  if (!slug) {
    document.getElementById("post-content").innerHTML =
      "<p>Post not found.</p>";
    return;
  }

  const post = await fetchBlogPost(slug);
  if (!post) {
    document.getElementById("post-content").innerHTML =
      "<p>Post not found.</p>";
    return;
  }

  console.log("Rendering post:", post);

  // Set the title dynamically
  const headerTitle = document.querySelector(".HeaderSection_title");
  if (headerTitle) {
    headerTitle.textContent = post.title.rendered;
  }

  document.getElementById("post-content").innerHTML = post.content.rendered;
  document.title = post.title.rendered;

  // Set featured image if available
  if (post.featured_media) {
    const mediaResponse = await fetch(
      `https://blog.etzsoft.com/wp-json/wp/v2/media/${post.featured_media}`
    );
    const media = await mediaResponse.json();
    document.getElementById(
      "post-image"
    ).innerHTML = `<img src="${media.source_url}" alt="${post.title.rendered}" class="img-fluid blog-featured-image">`;
  } else {
    document.getElementById(
      "post-image"
    ).innerHTML = `<img src="../blog-default.png" alt="Default Blog Image" class="img-fluid blog-featured-image">`;
  }

  // Set author info
  const authorResponse = await fetch(
    `https://blog.etzsoft.com/wp-json/wp/v2/users/${post.author}`
  );
  const author = await authorResponse.json();
  document.getElementById("author-name").textContent = author.name;
  document.getElementById(
    "publish-date"
  ).textContent = `Published On: ${new Date(post.date).toLocaleDateString()}`;
  if (author.avatar_urls) {
    document.getElementById("author-image").src = author.avatar_urls[96];
  } else {
    document.getElementById("author-image").src =
      "../assets/avatar-default.png";
  }

  // Add canonical link to the blog post page
  const canonicalLink = document.createElement("link");
  canonicalLink.rel = "canonical";
  canonicalLink.href = `https://etzsoft.com/blog/${slug}.html`;
  document.head.appendChild(canonicalLink);
};

document.addEventListener("DOMContentLoaded", renderBlogPost);

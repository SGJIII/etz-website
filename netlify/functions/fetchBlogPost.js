const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const { postSlug } = event.queryStringParameters;
    const apiEndpoint = `https://blog.etzsoft.com/wp-json/wp/v2/posts?slug=${postSlug}`;

    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Post not found' }),
            };
        }
        const posts = await response.json();
        const post = posts[0]; // Assuming the slug is unique and only one post is returned

        if (!post) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Post not found' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(post),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch post' }),
        };
    }
};

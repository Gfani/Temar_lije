export default () => ({
  database: {
    // Reads SERVER_MODE from your .env file, defaults to 'HUB' if not set
    mode: process.env.SERVER_MODE || 'HUB',
    url: process.env.DATABASE_URL,
  },
});

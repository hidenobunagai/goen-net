// Local development entrypoint for the Express API
// Run with: npm run server
import app from './app.mjs';

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});

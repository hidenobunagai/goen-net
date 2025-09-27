import app from '../server/app.mjs';

// Explicit handler wrapper to ensure Vercel treats this as a Node function.
export default function handler(req, res) {
	return app(req, res);
}

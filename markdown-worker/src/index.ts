import { Hono } from "hono";
import TurndownService from 'turndown'; // Ensure turndown is installed

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Initialize Turndown service
const turndownService = new TurndownService();

// Add the /ping route
app.get("/ping", (c) => c.text("pong"));

// Endpoint for /api/convert
app.post("/api/convert", async (c) => {
	// c.req.method check is implicitly handled by app.post, 
	// but an explicit check is fine for clarity or if using app.all

	try {
		const body = await c.req.json();
		if (!body || typeof body.html !== 'string' || body.html.trim() === '') {
			return c.json({ error: "Missing or invalid HTML content in request body" }, 400);
		}
		const { html } = body;

		// Convert HTML to Markdown
		const markdown = turndownService.turndown(html);

		return c.text(markdown, 200, {
			'Content-Type': 'text/markdown; charset=utf-8'
		});

	} catch (e: any) {
		if (e instanceof SyntaxError) { // JSON parsing error
			return c.json({ error: "Invalid JSON in request body" }, 400);
		}
		console.error('Error in /api/convert:', e);
		// turndown itself might throw errors for very malformed HTML, though it's generally robust.
		return c.json({ error: "Internal server error during Markdown conversion" }, 500);
	}
});

// Export the Hono app
export default app;

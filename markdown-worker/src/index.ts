import { Hono } from "hono";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Add the /ping route
app.get("/ping", (c) => c.text("pong"));

// Endpoint for /api/convert
app.post("/api/convert", async (c) => {
	// Check if the request method is POST
	if (c.req.method !== "POST") {
		return c.json({ error: "Expected POST request" }, 405);
	}

	try {
		const body = await c.req.json();
		if (!body || typeof body.url !== 'string') {
			return c.json({ error: "Missing or invalid URL parameter" }, 400);
		}
		const { url } = body;

		// Placeholder for now, will be replaced with actual HTML fetching and conversion
		return c.json({ message: "URL received", url: url });

	} catch (e: any) {
		if (e instanceof SyntaxError) { // JSON parsing error
			return c.json({ error: "Invalid JSON in request body" }, 400);
		}
		console.error('Error in /api/convert:', e);
		return c.json({ error: "Internal server error" }, 500);
	}
});

// Export the Hono app
export default app;

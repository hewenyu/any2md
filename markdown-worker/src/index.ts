import { Hono } from "hono";
import htmlToMd from 'html-to-md'; // 正确导入 html-to-md 库

// 定义应用版本信息
const APP_VERSION = '1.0.0';
const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB 限制

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// 添加日志中间件
app.use('*', async (c, next) => {
	console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
	try {
		await next();
	} catch (err) {
		console.error(`[${new Date().toISOString()}] Error:`, err);
		return c.json({ 
			error: "Internal server error", 
			message: err instanceof Error ? err.message : String(err) 
		}, 500);
	}
});

// 健康检查端点
app.get("/health", (c) => {
	console.log('Health check requested');
	return c.json({ 
		status: "ok", 
		version: APP_VERSION, 
		timestamp: new Date().toISOString() 
	});
});

// Add the /ping route
app.get("/ping", (c) => {
	console.log('Ping requested');
	return c.text("pong");
});

// API信息端点
app.get("/api/info", (c) => {
	console.log('API info requested');
	return c.json({
		version: APP_VERSION,
		endpoints: [
			{ path: "/ping", method: "GET", description: "基本连接测试" },
			{ path: "/health", method: "GET", description: "健康检查" },
			{ path: "/api/info", method: "GET", description: "API信息" },
			{ path: "/api/convert", method: "POST", description: "HTML转Markdown" }
		],
		limits: {
			maxHtmlSize: MAX_HTML_SIZE
		}
	});
});

// Endpoint for /api/convert
app.post("/api/convert", async (c) => {
	console.log('Convert HTML to Markdown requested');
	
	try {
		// 检查Content-Type
		const contentType = c.req.header('Content-Type');
		if (!contentType || !contentType.includes('application/json')) {
			console.warn('Invalid Content-Type:', contentType);
			return c.json({ 
				error: "Invalid Content-Type", 
				message: "Expected 'application/json'" 
			}, 415);
		}

		// 检查请求体大小
		const contentLength = parseInt(c.req.header('Content-Length') || '0', 10);
		if (contentLength > MAX_HTML_SIZE) {
			console.warn(`Request too large: ${contentLength} bytes`);
			return c.json({ 
				error: "Request entity too large", 
				message: `HTML content exceeds maximum size of ${MAX_HTML_SIZE} bytes` 
			}, 413);
		}

		// 解析JSON
		const body = await c.req.json();
		
		// 验证请求体
		if (!body) {
			console.warn('Empty request body');
			return c.json({ 
				error: "Bad Request", 
				message: "Request body is empty" 
			}, 400);
		}
		
		if (typeof body.html !== 'string') {
			console.warn('Invalid html field:', typeof body.html);
			return c.json({ 
				error: "Bad Request", 
				message: "Field 'html' must be a string" 
			}, 400);
		}
		
		if (body.html.trim() === '') {
			console.warn('Empty html content');
			return c.json({ 
				error: "Bad Request", 
				message: "HTML content cannot be empty" 
			}, 400);
		}

		const { html } = body;
		console.log(`Processing HTML content (${html.length} bytes)`);

		// 转换HTML为Markdown
		try {
			const markdown = htmlToMd(html);
			console.log(`Successfully converted to Markdown (${markdown.length} bytes)`);
			
			return c.text(markdown, 200, {
				'Content-Type': 'text/markdown; charset=utf-8'
			});
		} catch (conversionError) {
			console.error('HTML to Markdown conversion error:', conversionError);
			return c.json({ 
				error: "Conversion Failed", 
				message: "Failed to convert HTML to Markdown", 
				details: conversionError instanceof Error ? conversionError.message : String(conversionError)
			}, 422);
		}
	} catch (e) {
		if (e instanceof SyntaxError) { 
			// JSON解析错误
			console.warn('JSON parsing error:', e.message);
			return c.json({ 
				error: "Invalid JSON", 
				message: "Could not parse request body as JSON"
			}, 400);
		}
		
		// 记录未预期的错误
		console.error('Unexpected error in /api/convert:', e);
		return c.json({ 
			error: "Internal Server Error", 
			message: "An unexpected error occurred during processing"
		}, 500);
	}
});

// 处理404错误
app.notFound((c) => {
	console.warn(`Not Found: ${c.req.method} ${c.req.url}`);
	return c.json({ 
		error: "Not Found", 
		message: "The requested resource does not exist" 
	}, 404);
});

// Export the Hono app
export default app;

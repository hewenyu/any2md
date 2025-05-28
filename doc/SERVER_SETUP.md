# Cloudflare Worker 端开发与部署指南

本文档提供 Cloudflare Worker (Server) 的开发、配置和部署步骤。

## 1. 环境准备

*   **Node.js 和 npm/yarn**: 用于 Worker 项目的初始化和依赖管理。
*   **Wrangler CLI**: Cloudflare Worker 的官方命令行工具，用于开发、测试和部署。
    ```bash
    npm install -g wrangler
    # 或者
    yarn global add wrangler
    ```
*   **Cloudflare 账户**: 需要一个 Cloudflare 账户来部署 Worker。

## 2. 初始化 Worker 项目

1.  登录 Wrangler:
    ```bash
    wrangler login
    ```
2.  创建一个新的 Worker 项目 (如果尚未创建):
    ```bash
    # wrangler init <your-worker-name>
    # cd <your-worker-name>
    ```
    对于本项目，我们假设 Worker 项目名为 `markdown-worker`。

## 3. 核心代码开发 (`src/index.ts` 或 `src/index.js`)

Worker 的主要逻辑是接收 HTML 内容并将其转换为 Markdown。

```typescript
// src/index.ts (示例)

import { Hono } from 'hono';
import TurndownService from 'turndown';

// 定义环境变量绑定 (如果 wrangler.toml 中有配置)
export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Initialize Turndown service
// 可以根据需要配置 TurndownService，例如：
// turndownService.keep(['pre', 'code']); // 保留 pre 和 code 标签
// turndownService.addRule('strikethrough', {
//   filter: ['del', 's', 'strike'],
//   replacement: function (content) {
//     return '~~' + content + '~~';
//   }
// });
const turndownService = new TurndownService();

// Ping endpoint for health check
app.get("/ping", (c) => c.text("pong"));

// API endpoint to convert HTML to Markdown
app.post("/api/convert", async (c) => {
  try {
    const body = await c.req.json();
    if (!body || typeof body.html !== 'string' || body.html.trim() === '') {
      return c.json({ error: "Missing or invalid HTML content in request body" }, 400);
    }
    const { html } = body;

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(html);

    // Return Markdown content
    return c.text(markdown, 200, {
      'Content-Type': 'text/markdown; charset=utf-8'
    });

  } catch (e: any) {
    if (e instanceof SyntaxError) { // JSON parsing error
        return c.json({ error: "Invalid JSON in request body" }, 400);
    }
    console.error('Error in /api/convert:', e);
    return c.json({ error: "Internal server error during Markdown conversion" }, 500);
  }
});

export default app;
```

**关键点**:

*   **依赖安装**: 确保已安装 `turndown` 和 `hono`。
    ```bash
    npm install hono turndown
    # 如果使用 TypeScript，可能还需要类型声明 (例如 @types/turndown，尽管 turndown 可能自带类型)
    npm install --save-dev @types/turndown 
    ```
*   **请求方法检查**: `app.post` 确保只处理 POST 请求。
*   **参数解析与校验**: 从请求体中获取 `html` 字符串，并进行基础的校验。
*   **Markdown 转换**: 使用 `turndown` 库进行转换。
*   **响应头**: 设置正确的 `Content-Type` 为 `text/markdown`。
*   **错误处理**: 包含 `try...catch` 块来捕获和处理潜在的错误。

## 4. 配置 `wrangler.toml`

`wrangler.toml` 是 Worker 项目的配置文件。

```toml
name = "markdown-worker" # 你的 Worker 名称
main = "src/index.ts"    # Worker 入口文件
compatibility_date = "2023-10-30" # 或更新的日期

# 如果使用了 Node.js API (turndown 可能依赖一些，但通常在 Worker 环境中，这类库会使用兼容的 API)
# node_compat = true # 仅在确实需要 Node.js 特定 API 时开启

# [vars]
# MY_VARIABLE = "my-value"

# [[kv_namespaces]]
# binding = "MY_KV_NAMESPACE"
# id = "your_kv_namespace_id_here"
```
*   **`node_compat = true`**: `turndown` 通常不需要此标志，因为它主要处理字符串和 DOM 结构（在 Worker 中是模拟的或直接传递的字符串）。但如果遇到与 Node.js 内置模块相关的错误，可以尝试启用。

## 5. 本地开发与测试

Wrangler 提供了本地开发服务器：

```bash
wrangler dev
```

使用 `curl` 或 Postman 等工具向 `http://localhost:8787/api/convert` 发送 POST 请求进行测试。

**示例测试 (使用 curl)**:

```bash
curl -X POST http://localhost:8787/api/convert \
-H "Content-Type: application/json" \
-d '{"html":"<h1>Title</h1><p>Some text.</p>"}'
```

## 6. 部署到 Cloudflare

```bash
wrangler deploy
```

## 7. 日志与监控

*   **实时日志**: `wrangler tail`
*   **Cloudflare Dashboard**: 查看统计信息。

## 8. 注意事项与最佳实践

*   **Worker 限制**: 注意执行时间、内存限制等。
*   **安全性**: Worker 代码中不应硬编码敏感信息。考虑对传入的 HTML 大小做限制。
*   **错误处理**: 返回有意义的错误信息给客户端。
*   **测试不同 HTML**: 测试各种结构的 HTML，确保转换效果基本满意。 
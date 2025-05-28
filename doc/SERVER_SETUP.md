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
2.  创建一个新的 Worker 项目 (选择 "Hello World" 模板):
    ```bash
    wrangler init my-markdown-worker
    cd my-markdown-worker
    ```
    这会创建一个包含基本配置 (`wrangler.toml`) 和入口文件 (`src/index.js` 或 `src/index.ts`) 的项目结构。

## 3. 核心代码开发 (`src/index.js` 或 `src/index.ts`)

Worker 的主要逻辑将在这里实现。

```typescript
// src/index.ts (示例)

// 推荐使用 turndown.js 进行 HTML 到 Markdown 的转换
// 你需要在项目中安装它: npm install turndown
import TurndownService from 'turndown';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Expected POST request', { status: 405 });
    }

    try {
      const { url } = await request.json() as { url: string };
      if (!url) {
        return new Response('Missing URL parameter', { status: 400 });
      }

      // 验证 URL (基础示例)
      try {
        new URL(url);
      } catch (e) {
        return new Response('Invalid URL format', { status: 400 });
      }

      // 1. 获取网页 HTML 内容
      const response = await fetch(url, {
        headers: {
          // 模拟浏览器 User-Agent，有些网站可能会检查它
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return new Response(`Failed to fetch URL: ${response.statusText}`, { status: response.status });
      }
      const html = await response.text();

      // 2. 初始化 Turndown 服务并转换 HTML 到 Markdown
      const turndownService = new TurndownService();
      // 可以根据需要配置 TurndownService，例如：
      // turndownService.keep(['pre', 'code']); // 保留 pre 和 code 标签
      // turndownService.addRule('strikethrough', {
      //   filter: ['del', 's', 'strike'],
      //   replacement: function (content) {
      //     return '~~' + content + '~~';
      //   }
      // });
      const markdown = turndownService.turndown(html);

      // 3. 返回 Markdown 内容
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          // 可选：用于建议浏览器下载的文件名
          // 'Content-Disposition': 'attachment; filename="page.md"'
        },
      });

    } catch (error: any) {
      console.error('Error processing request:', error);
      return new Response(`Server error: ${error.message}`, { status: 500 });
    }
  },
};

```

**关键点**:

*   **请求方法检查**: 通常 API 设计为 `POST` 请求，并在请求体中接收参数。
*   **参数解析与校验**: 从请求体中获取 `url` 参数，并进行基础的校验。
*   **`fetch` 外部 URL**: 使用 Worker 内置的 `fetch` API 获取目标网页内容。
    *   注意设置合适的 `User-Agent`，某些网站可能需要。
    *   考虑目标网站的 CORS 策略和反爬虫机制。如果遇到问题，可能需要更复杂的解决方案（如通过代理）。
*   **Markdown 转换库**: `turndown` 是一个流行的选择。通过 `npm install turndown` (或 `yarn add turndown`) 安装，并在代码中导入和使用。
*   **响应头**: 设置正确的 `Content-Type` 为 `text/markdown`。
*   **错误处理**: 包含 `try...catch` 块来捕获和处理潜在的错误，并返回适当的 HTTP 状态码。

## 4. 配置 `wrangler.toml`

`wrangler.toml` 是 Worker 项目的配置文件。

```toml
name = "my-markdown-worker" # 你的 Worker 名称，将成为 URL 的一部分
main = "src/index.ts"      # 入口文件路径 (如果是 JS，则为 src/index.js)
compatibility_date = "2023-10-30" # 使用较新的兼容性日期

# 如果你的 Worker 需要访问 KV, Durable Objects, R2 等，在此配置
# [vars]
# MY_VARIABLE = "my-value"

# 如果需要绑定服务 (如 KV Namespace)
# [[kv_namespaces]]
# binding = "MY_KV_NAMESPACE"
# id = "your_kv_namespace_id_here"

# 确保 node_compat 开启，如果使用了 Node.js API (turndown 可能依赖一些)
node_compat = true
```

*   **`name`**: Worker 的名称，会影响其最终的 URL (`<name>.<your-subdomain>.workers.dev`)。
*   **`main`**: 指向你的主代码文件。
*   **`compatibility_date`**: 指定 Worker 运行时环境的兼容性日期，建议使用较新的日期以获得最新功能和修复。
*   **`node_compat = true`**: 如果你的依赖（如 `turndown`）使用了 Node.js 的内置模块（例如 `buffer`, `path` 等），需要启用此标志。Cloudflare Workers 提供了一些 Node.js API 的兼容性支持。

## 5. 本地开发与测试

Wrangler 提供了本地开发服务器：

```bash
wrangler dev
```

这会在本地启动一个服务器 (通常是 `http://localhost:8787`)，你可以使用 `curl` 或 Postman 等工具向其发送请求进行测试。

**示例测试 (使用 curl)**:

```bash
curl -X POST http://localhost:8787 \
-H "Content-Type: application/json" \
-d '{"url":"https://www.example.com"}'
```

## 6. 部署到 Cloudflare

当你准备好部署 Worker 时：

```bash
wrangler deploy
```

部署成功后，Wrangler 会输出你的 Worker URL (例如 `https://my-markdown-worker.yourusername.workers.dev`)。插件将使用此 URL 与 Worker 通信。

## 7. 日志与监控

*   **实时日志**: 在 Worker 运行时，可以使用 `wrangler tail` 查看实时日志。
*   **Cloudflare Dashboard**: 在 Cloudflare 的仪表盘中，可以查看 Worker 的请求、错误、CPU 时间等统计信息。

## 8. 依赖管理

*   使用 `npm install <package>` 或 `yarn add <package>` 来安装依赖。
*   Worker 的包大小有限制，尽量选择轻量级的库。
*   `wrangler` 会将你的代码和依赖打包成一个单独的文件进行部署。

## 9. 注意事项与最佳实践

*   **Worker 限制**: 注意 Cloudflare Workers 的执行时间限制 (CPU 时间)、内存限制等。对于非常大的网页或复杂的转换，可能会遇到限制。
*   **安全性**: 不要将敏感信息硬编码到 Worker 代码中。使用环境变量或 Secrets (通过 Wrangler 配置)。
*   **错误处理**: 实现健壮的错误处理，并返回有意义的错误信息给客户端。
*   **成本**: 了解 Cloudflare Workers 的免费套餐和付费计划，特别是当请求量增加时。
*   **测试不同网站**: 网页结构千差万别，充分测试不同类型的网站，确保转换效果基本满意。
*   **迭代开发**: 先实现核心功能，然后根据需要逐步添加更多配置选项或高级功能。 
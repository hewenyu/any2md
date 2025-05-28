# 架构设计

本文档描述了"网页转 Markdown"项目的系统架构和组件交互。

## 核心组件

1.  **浏览器插件 (Browser Extension)**：用户界面，负责触发转换请求并将结果保存。
2.  **Cloudflare Worker (Server)**：后端服务，负责实际的网页抓取和 Markdown 转换。

## 交互流程

```mermaid
sequenceDiagram
    participant User
    participant Browser Extension
    participant Cloudflare Worker

    User->>Browser Extension: 点击"转换并下载"按钮
    Browser Extension->>Browser Extension: 获取当前标签页 URL
    Browser Extension->>Cloudflare Worker: 发送 API 请求 (携带 URL)
    Cloudflare Worker->>Cloudflare Worker: 抓取目标 URL 的 HTML 内容
    Cloudflare Worker->>Cloudflare Worker: 将 HTML 转换为 Markdown
    Cloudflare Worker-->>Browser Extension: 返回 Markdown 内容
    Browser Extension->>Browser Extension: 触发文件下载
    Browser Extension-->>User: 显示下载提示/完成
```

## 组件职责详述

### 1. 浏览器插件

*   **用户界面 (UI)**：提供一个简单的按钮或右键菜单项，让用户可以方便地触发转换操作。
*   **权限管理**：
    *   `activeTab`: 获取当前激活标签页的 URL，无需域名权限即可操作当前页面。
    *   `downloads`: 用于将转换后的 Markdown 文件保存到用户本地。
    *   `storage` (可选): 用于存储用户配置，例如默认文件名格式、API 端点等。
*   **API 通信**：
    *   使用 `fetch` API 向 Cloudflare Worker 发送 HTTP 请求。
    *   请求应包含当前网页的 URL 作为参数。
    *   处理 API 响应，包括成功返回的 Markdown 内容和可能的错误信息。
*   **内容处理**：
    *   接收 Worker 返回的 Markdown 文本。
    *   构建一个 `Blob` 对象。
    *   使用 `URL.createObjectURL` 和 `chrome.downloads.download` API (或其他浏览器等效 API) 实现文件下载。
    *   文件名可以基于网页标题或用户自定义规则生成。

### 2. Cloudflare Worker

*   **API 端点**：提供一个 HTTP(S) 端点，接收插件的请求。
    *   例如：`POST /api/convert`，请求体中包含 `url` 字段。
*   **网页内容获取**：
    *   使用 `fetch` API 从 Worker 内部请求目标 URL 的 HTML 内容。
    *   需要处理网络请求的各种情况，如超时、目标服务器错误等。
    *   **注意**：直接在 Worker 中 `fetch` 任意 URL 可能会遇到 CORS 或目标网站的反爬虫策略。需要考虑是否需要通过代理或者检查目标网站的 `robots.txt`。
*   **HTML 解析与转换**：
    *   使用适合 Worker 环境的 HTML 解析库（如果需要精细控制内容提取，否则可以直接传递整个 HTML 给转换库）。
    *   使用 Markdown 转换库（如 `turndown`）将 HTML 字符串转换为 Markdown 格式。
    *   可以配置转换库的选项，以优化输出的 Markdown 质量（例如，代码块处理、表格转换等）。
*   **响应处理**：
    *   将转换后的 Markdown 内容作为 HTTP 响应体返回。
    *   设置合适的 `Content-Type` (如 `text/markdown; charset=utf-f` 或 `application/octet-stream` 以强制下载)。
    *   返回适当的 HTTP 状态码（成功时 200，错误时 4xx/5xx）。
*   **错误处理与日志**：
    *   健壮的错误处理机制，例如无效 URL、抓取失败、转换失败等。
    *   利用 Cloudflare Worker 的日志功能记录关键操作和错误信息，便于调试。

## 数据流

1.  用户在浏览器插件中点击转换按钮。
2.  插件获取当前页面的 URL。
3.  插件将 URL 发送给 Cloudflare Worker 的 API 端点。
4.  Worker 接收 URL，`fetch` 对应网页的 HTML。
5.  Worker 使用 Markdown 转换库将 HTML 转换为 Markdown。
6.  Worker 将 Markdown 文本返回给插件。
7.  插件接收 Markdown 文本，并触发浏览器下载功能，将文本保存为 `.md` 文件。

## 安全考量

*   **Worker 端**：
    *   限制可接受的 URL 模式（如果需要，例如防止滥用）。
    *   对输入 URL 进行合法性校验。
    *   考虑对请求进行速率限制，防止 DDOS 攻击。
*   **插件端**：
    *   确保只与预期的 Worker 端点通信。
    *   用户数据（如浏览历史）不应被发送或存储，除非明确告知用户并获得同意。

## 扩展性

*   **自定义转换规则**：未来可以允许用户在插件端配置 Markdown 转换规则，并将这些规则传递给 Worker。
*   **选择性内容提取**：插件端可以增加让用户选择页面特定部分进行转换的功能，将选择器信息传递给 Worker。
*   **多种输出格式**：Worker 可以扩展支持除 Markdown 外的其他格式。 
# API 参考 (Cloudflare Worker)

本文档定义了 Cloudflare Worker 提供的 API 接口。

## 端点: `POST /api/convert`

这是目前唯一的 API 端点，用于接收网页 URL 并返回其 Markdown 表示。

*   **方法**: `POST`
*   **URL**: 部署 Worker 后，会有一个类似 `https://<your-worker-name>.<your-subdomain>.workers.dev/api/convert` 的 URL。实际路径 `/api/convert` 可以根据 Worker 代码中的路由逻辑调整，但建议使用一个明确的路径如 `/api/` 或 `/convert`。
*   **Content-Type**: `application/json`

### 请求体

请求体必须是一个 JSON 对象，包含以下字段：

```json
{
  "url": "<string: 网页的URL>"
}
```

*   **`url`** (string, 必填): 需要转换为 Markdown 的目标网页的完整 URL。

**示例请求体**:

```json
{
  "url": "https://www.example.com/some/article.html"
}
```

### 成功响应 (Status Code: `200 OK`)

如果转换成功，服务器将返回转换后的 Markdown 内容。

*   **Content-Type**: `text/markdown; charset=utf-8`
*   **Body**: 纯文本格式的 Markdown 内容。

**示例成功响应体**:

```markdown
# 这是一个示例标题

这是一段从网页转换过来的文本内容。

*   列表项 1
*   列表项 2

[这是一个链接](https://www.example.com)
```

### 错误响应

如果处理过程中发生错误，服务器将返回相应的 HTTP 错误状态码和 JSON 格式的错误信息。

*   **Content-Type**: `application/json` (通常情况下，也可以是 `text/plain`，但 JSON 更易于程序解析)

**常见的错误状态码及原因**:

*   **`400 Bad Request`**: 
    *   请求体不是有效的 JSON。
    *   请求体中缺少 `url` 字段。
    *   提供的 `url` 格式无效 (例如，无法被 `new URL()` 解析)。
    **示例响应体 (`400`)**: 
    ```json
    {
      "error": "Missing URL parameter"
    }
    ```
    或者
    ```json
    {
      "error": "Invalid URL format"
    }
    ```

*   **`405 Method Not Allowed`**: 
    *   使用了 `POST` 以外的 HTTP 方法访问该端点。
    **示例响应体 (`405`)**: (通常由 Worker 运行时或代码明确返回)
    ```json
    {
      "error": "Expected POST request"
    }
    ```

*   **`4xx` (例如 `404 Not Found`, `403 Forbidden`) 或 `5xx` (例如 `500 Internal Server Error`, `502 Bad Gateway`)**: 
    *   Worker 在尝试 `fetch` 目标 `url` 时失败（目标服务器返回错误，或网络问题）。
    *   Worker 内部发生其他未预料的错误 (例如，Markdown 转换库执行失败)。
    **示例响应体 (`500`)**: 
    ```json
    {
      "error": "Failed to fetch URL: Not Found"
    }
    ```
    或者
    ```json
    {
      "error": "Server error: Turndown conversion failed"
    }
    ```

### 使用示例 (curl)

```bash
curl -X POST \
  https://<your-worker-name>.<your-subdomain>.workers.dev/api/convert \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API"
  }' \
  --output page.md # 将输出保存到 page.md 文件
```

## 未来可能的扩展

*   **GET 请求**: 可以考虑支持 `GET /api/convert?url=<encoded_url>`，但这对于长 URL 可能不理想，且 `POST` 更适合有请求体的场景。
*   **配置参数**: 请求体中可以增加更多参数来控制 Markdown 的转换行为，例如：
    ```json
    {
      "url": "https://example.com",
      "options": {
        "headingStyle": "atx", // "setext" or "atx"
        "bulletListMarker": "*", // "*", "-", or "+"
        "codeBlockStyle": "fenced" // "indented" or "fenced"
        // ...更多 turndown 支持的选项
      }
    }
    ```
*   **选择器参数**: 允许用户指定只转换页面中的特定部分：
    ```json
    {
      "url": "https://example.com",
      "selector": ".article-content" // CSS 选择器
    }
    ```

这些扩展需要相应地修改 Worker 端的代码逻辑。 
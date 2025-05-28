# API 参考 (Cloudflare Worker)

本文档定义了 Cloudflare Worker 提供的 API 接口。

## 端点: `POST /api/convert`

此 API 端点用于接收 HTML 内容并返回其 Markdown 表示。

*   **方法**: `POST`
*   **URL**: 部署 Worker 后，会有一个类似 `https://<your-worker-name>.<your-subdomain>.workers.dev/api/convert` 的 URL。
*   **Content-Type**: `application/json`

### 请求体

请求体必须是一个 JSON 对象，包含以下字段：

```json
{
  "html": "<string: 要转换的HTML内容>"
}
```

*   **`html`** (string, 必填): 需要转换为 Markdown 的 HTML 字符串内容。

**示例请求体**:

```json
{
  "html": "<h1>这是一个标题</h1><p>这是一段文本。</p>"
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
```

### 错误响应

如果处理过程中发生错误，服务器将返回相应的 HTTP 错误状态码和 JSON 格式的错误信息。

*   **Content-Type**: `application/json`

**常见的错误状态码及原因**:

*   **`400 Bad Request`**: 
    *   请求体不是有效的 JSON。
    *   请求体中缺少 `html` 字段，或 `html` 字段为空。
    **示例响应体 (`400`)**: 
    ```json
    {
      "error": "Missing or invalid HTML content in request body"
    }
    ```

*   **`405 Method Not Allowed`**: 
    *   使用了 `POST` 以外的 HTTP 方法访问该端点。
    **示例响应体 (`405`)**: 
    ```json
    {
      "error": "Expected POST request"
    }
    ```

*   **`500 Internal Server Error`**: 
    *   Worker 内部发生未预料的错误 (例如，Markdown 转换库执行失败)。
    **示例响应体 (`500`)**: 
    ```json
    {
      "error": "Internal server error during Markdown conversion"
    }
    ```

### 使用示例 (curl)

```bash
curl -X POST \
  https://<your-worker-name>.<your-subdomain>.workers.dev/api/convert \
  -H 'Content-Type: application/json' \
  -d '{
    "html": "<h2>Hello World</h2><p>This is a test.</p>"
  }' \
  --output page.md # 将输出保存到 page.md 文件
```

## 未来可能的扩展

*   **配置参数**: 请求体中可以增加更多参数来控制 Markdown 的转换行为 (例如，`turndown` 的选项)。
    ```json
    {
      "html": "<p>...</p>",
      "options": {
        "headingStyle": "atx",
        "bulletListMarker": "*"
      }
    }
    ```

这些扩展需要相应地修改 Worker 端的代码逻辑。 
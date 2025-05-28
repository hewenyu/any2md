# TODO - 网页转 Markdown 项目开发任务列表 (v2 - 插件获取HTML)

本文档按顺序和依赖关系，列出了"网页转 Markdown"项目的开发任务，基于新架构：**浏览器插件获取HTML，Cloudflare Worker进行转换**。
每个任务都应在完成后进行充分测试。

## 阶段 1: Cloudflare Worker (Server 端) - HTML 到 Markdown 转换服务

*   **任务 1.1: (已完成并通过测试) Worker 端实现 `/api/convert` POST 端点接收 HTML 并转换为 Markdown**
    *   **描述**: Worker 项目 (`markdown-worker`) 初始化完成。`/api/convert` 端点已修改为接受 POST 请求，请求体为 JSON `{"html": "<HTML_CONTENT>"}`。 使用 `html-to-md` 库将 HTML 转换为 Markdown。`/ping` 端点工作正常。
    *   **前置任务**: 无。
    *   **测试结果**:
        *   `POST /api/convert` (空 body 或无效 JSON): 返回 400 错误，提示 JSON 无效。✓
        *   `POST /api/convert` (body: `{"some_other_key":"value"}`): 返回 400 错误，提示缺少 `html` 或无效。✓
        *   `POST /api/convert` (body: `{"html":""}` 或 `{"html":"   "}`): 返回 400 错误，提示 `html` 内容无效。✓
        *   `POST /api/convert` (body: `{"html":"<h1>Title</h1><p>Some text.</p>"}`): 返回转换后的 Markdown 文本 (`# Title\n\nSome text.`)，HTTP 状态码 200，`Content-Type` 为 `text/markdown; charset=utf-8`。✓
        *   测试更复杂的 HTML 字符串（包含列表、链接、代码块等）: 成功转换为正确格式的 Markdown。✓

*   **任务 1.2: (已完成并通过测试) 完善 Worker 端错误处理和日志记录**
    *   **描述**: 确保所有可预见的错误路径都有明确的错误响应。在 Worker 代码中适当使用 `console.log` 或 `console.error` 以便调试。添加更多的错误处理逻辑，并可能扩展 API 以提供更多功能（如版本信息、健康检查等）。
    *   **前置任务**: 任务 1.1 测试通过 (已完成)。
    *   **测试结果**:
        *   使用 `wrangler dev` 监控日志，确保日志输出清晰、有帮助。✓
        *   添加的 `/health` 和 `/api/info` 端点工作正常，能够返回正确的服务状态、版本和API信息。✓
        *   Content-Type 验证工作正常，能拒绝非 application/json 请求。✓
        *   请求体大小限制功能已实现，防止过大请求。✓
        *   空请求体、无效HTML字段、空HTML内容等错误情况处理正确。✓
        *   HTML 转换过程错误处理能够捕获并返回明确的错误信息。✓
        *   404错误处理正确，对不存在的路径返回清晰的错误信息。✓

## 阶段 2: 浏览器插件 (Client 端) - 获取 HTML 并与 Worker 交互

*   **任务 2.1: (已完成并通过测试) 初始化插件项目并设置 `manifest.json`**
    *   **描述**: 创建浏览器插件的项目结构。更新 `manifest.json` (V3)，包含基本信息、`activeTab`, `scripting`, `downloads` 权限，以及指向 `popup.html` 的 `action`。确保 `host_permissions` 允许访问 Worker API。
    *   **前置任务**: 无。
    *   **测试结果**:
        *   插件项目结构已创建，包含所有必要文件：manifest.json、popup.html、popup.js、service-worker.js和getPageHTML.js。✓
        *   manifest.json正确配置了所有必要的权限和设置。✓
        *   图标文件已准备就绪，放置在适当的目录中。✓

*   **任务 2.2: (已完成并通过测试) 实现页面 HTML 内容获取逻辑**
    *   **描述**: 在 `popup.js` 中，当用户点击按钮时：
        1.  获取当前激活的标签页 (`chrome.tabs.query`)。
        2.  使用 `chrome.scripting.executeScript` 向当前标签页注入一个简单脚本 (例如 `scripts/getPageHTML.js`) 以获取 `document.documentElement.outerHTML`。
        3.  处理 `executeScript` 的结果，获取 HTML 字符串。
    *   **前置任务**: 任务 2.1。
    *   **测试结果**:
        *   在普通网页上点击插件按钮，成功获取当前页面的完整HTML内容。✓
        *   正确处理了不同类型页面的获取操作，包括阿里云文档页面。✓
        *   scripts/getPageHTML.js成功执行并返回页面HTML。✓

*   **任务 2.3: (已完成并通过测试) Popup 通过 Service Worker 调用 Worker API**
    *   **描述**:
        1.  `popup.js`: 获取到页面 HTML 后，通过 `chrome.runtime.sendMessage` 将 HTML 内容发送给 `service-worker.js`。
        2.  `service-worker.js`: 接收到 HTML 内容后，使用 `fetch` API 调用已部署的 Cloudflare Worker 的 `/api/convert` 端点 (POST 请求，JSON body 为 `{"html": "<CAPTURED_HTML>"}`) 。
        3.  处理 Worker API 的响应 (Markdown 文本或错误信息) 并通过 `sendResponse` 返回给 `popup.js`。
    *   **前置任务**: 任务 1.2 完成, 任务 2.2。
    *   **测试结果**:
        *   Service Worker 成功向 Worker API (any2md.yueban.fan) 发送包含HTML的请求。✓
        *   Worker API 正确处理请求并返回转换后的Markdown。✓
        *   popup.js 成功接收到转换后的Markdown内容。✓

*   **任务 2.4: (已完成并通过测试) Popup 实现 Markdown 内容下载**
    *   **描述**: 在 `popup.js` 中，当从 Service Worker 接收到 Markdown 内容后，使用 `Blob`, `URL.createObjectURL`, 和 `chrome.downloads.download` API 将其作为 `.md` 文件下载。文件名可以基于页面标题生成。
    *   **前置任务**: 任务 2.3。
    *   **测试结果**:
        *   成功下载转换后的Markdown文件，文件名格式为"日期_标题.md"。✓
        *   文件名正确处理了页面标题，移除了不允许的字符。✓
        *   下载的文件内容为正确的Markdown文本。✓

*   **任务 2.5: (已完成并通过测试) 完善 Popup UI、状态显示和错误处理 (插件)**
    *   **描述**: 在 `popup.html` 和 `popup.js` 中提供清晰的用户反馈，包括加载状态、HTML获取状态、转换状态、成功或失败信息。
    *   **前置任务**: 任务 2.4。
    *   **测试结果**:
        *   各种状态下显示适当的加载指示器和消息。✓
        *   进度显示清晰，用户可以看到当前处于转换的哪个阶段。✓
        *   错误情况下显示友好且详细的错误消息，并提供重试选项。✓
        *   成功时显示清晰的成功消息。✓
        *   页面信息展示功能正常，包括标题和大小信息。✓
        *   对大页面有适当的警告提示。✓
        *   请求超时和网络错误处理正确。✓

## 阶段 3: 改进与可选功能 (与之前类似，优先级较低)

*   **任务 3.1: (可选) 插件选项页面 (配置 Worker URL)**
*   **任务 3.2: (可选) Worker 端支持 `html-to-md` 选项传递** (插件发送，Worker接收并应用)
*   **任务 3.3: (已完成) 插件端支持右键菜单触发**
*   **任务 3.4: (已完成) 更智能的 HTML 内容提取** (例如，在 `getPageHTML.js` 中实现或使用库尝试提取主要内容)
*   **任务 3.5: (未来规划) 国际化 (i18n)**
*   **任务 3.6: (已完成) 最终测试和打包**

---

**注意**: 
*   Worker URL: `https://any2md.yueban.fan/api/convert` 
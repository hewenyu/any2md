# TODO - 网页转 Markdown 项目开发任务列表 (v2 - 插件获取HTML)

本文档按顺序和依赖关系，列出了"网页转 Markdown"项目的开发任务，基于新架构：**浏览器插件获取HTML，Cloudflare Worker进行转换**。
每个任务都应在完成后进行充分测试。

## 阶段 1: Cloudflare Worker (Server 端) - HTML 到 Markdown 转换服务

*   **任务 1.1: (已部分完成，需调整) 初始化 Worker 项目并实现 `/api/convert` POST 端点**
    *   **描述**: 使用 Wrangler CLI 和 Hono 框架。确保 Worker 项目 (`markdown-worker`) 已初始化。修改 `/api/convert` 端点，使其接受 POST 请求，请求体为 JSON `{"html": "<HTML_CONTENT>"}`。如果 `html` 字段缺失或无效，返回 400 错误。
    *   **前置任务**: 无 (或基于之前的初始化)。
    *   **测试用例**:
        *   部署 Worker。
        *   `POST /api/convert` (空 body 或无效 JSON): 返回 400 (提示 JSON 无效)。
        *   `POST /api/convert` (body: `{"some_other_key":"value"}`): 返回 400 (提示缺少 `html` 或无效)。
        *   `POST /api/convert` (body: `{"html":""}` 或 `{"html":"   "}`): 返回 400 (提示 `html` 内容无效)。
        *   `POST /api/convert` (body: `{"html":"<h1>Test</h1>"}`): （暂时）返回一个成功的占位符响应或直接进入下一步的转换逻辑。
        *   实现 `/ping` GET 端点返回 `pong` (此部分已完成并通过测试)。

*   **任务 1.2: (核心) 实现 HTML 到 Markdown 的转换逻辑**
    *   **描述**: 在 `/api/convert` 端点中，当收到有效的 `html` 参数后，使用 `turndown` 库将其转换为 Markdown 字符串。确保 `turndown` 已安装在 Worker项目中。
    *   **前置任务**: 任务 1.1 完成。
    *   **测试用例**:
        *   `POST /api/convert` (body: `{"html":"<h1>Title</h1><p>Some text.</p>"}`): 返回转换后的 Markdown 文本 (`# Title\n\nSome text.`)，HTTP 状态码 200，`Content-Type` 为 `text/markdown; charset=utf-8`。
        *   测试包含各种 HTML 元素（标题、段落、列表、链接、代码块、表格等）的简单 HTML 字符串，验证转换基本正确。
        *   如果 `turndown` 转换过程本身出错（不太常见，但可能发生于极度损坏的HTML），应返回 500 错误。

*   **任务 1.3: 完善错误处理和日志记录 (Worker)**
    *   **描述**: 确保所有可预见的错误路径都有明确的错误响应。在 Worker 代码中适当使用 `console.log` 或 `console.error` 以便调试。
    *   **前置任务**: 任务 1.2。
    *   **测试用例**:
        *   系统性地测试任务 1.1 和 1.2 中描述的各种有效和无效输入，验证错误响应符合预期。
        *   在 `wrangler tail` 中观察日志输出。

## 阶段 2: 浏览器插件 (Client 端) - 获取 HTML 并与 Worker 交互

*   **任务 2.1: (已部分完成，需调整) 初始化插件项目并设置 `manifest.json`**
    *   **描述**: 创建浏览器插件的项目结构。更新 `manifest.json` (V3)，包含基本信息、`activeTab`, `scripting`, `downloads` 权限，以及指向 `popup.html` 的 `action`。确保 `host_permissions` 允许访问 Worker API。
    *   **前置任务**: 无 (可与阶段 1 并行，但逻辑上依赖 Worker API 定义)。
    *   **测试用例**:
        *   插件能被浏览器加载。
        *   插件图标显示。点击图标能打开 `popup.html`。

*   **任务 2.2: (核心) 实现页面 HTML 内容获取逻辑**
    *   **描述**: 在 `popup.js` 中，当用户点击按钮时：
        1.  获取当前激活的标签页 (`chrome.tabs.query`)。
        2.  使用 `chrome.scripting.executeScript` 向当前标签页注入一个简单脚本 (例如 `scripts/getPageHTML.js`) 以获取 `document.documentElement.outerHTML`。
        3.  处理 `executeScript` 的结果，获取 HTML 字符串。
    *   **前置任务**: 任务 2.1。
    *   **测试用例**:
        *   在普通网页上点击插件按钮，`popup.js` 能成功获取并（例如 `console.log`）输出当前页面的完整 HTML。
        *   处理 `executeScript` 可能发生的错误（例如，在受保护页面上执行）。
        *   `scripts/getPageHTML.js` 内容为 `(() => document.documentElement.outerHTML)();` 或类似。

*   **任务 2.3: (核心) Popup 通过 Service Worker 调用 Worker API**
    *   **描述**:
        1.  `popup.js`: 获取到页面 HTML 后，通过 `chrome.runtime.sendMessage` 将 HTML 内容发送给 `service-worker.js`。
        2.  `service-worker.js`: 接收到 HTML 内容后，使用 `fetch` API 调用已部署的 Cloudflare Worker 的 `/api/convert` 端点 (POST 请求，JSON body 为 `{"html": "<CAPTURED_HTML>"}`) 。
        3.  处理 Worker API 的响应 (Markdown 文本或错误信息) 并通过 `sendResponse` 返回给 `popup.js`。
    *   **前置任务**: 任务 1.3 (Worker API 可用), 任务 2.2。
    *   **测试用例**:
        *   Service Worker 成功向 Worker API 发送包含 HTML 的请求。
        *   Worker API 接收到 HTML 并按预期处理 (可在 Worker 端 `wrangler tail` 查看日志，或检查返回的 Markdown)。
        *   `popup.js` 能接收到转换后的 Markdown 或错误信息。

*   **任务 2.4: Popup 实现 Markdown 内容下载**
    *   **描述**: 在 `popup.js` 中，当从 Service Worker 接收到 Markdown 内容后，使用 `Blob`, `URL.createObjectURL`, 和 `chrome.downloads.download` API 将其作为 `.md` 文件下载。文件名可以基于页面标题生成。
    *   **前置任务**: 任务 2.3。
    *   **测试用例**: (与之前类似，但现在是基于插件获取的HTML转换结果)
        *   成功转换后，浏览器触发文件下载。
        *   下载的文件内容为正确的 Markdown。

*   **任务 2.5: 完善 Popup UI、状态显示和错误处理 (插件)**
    *   **描述**: 在 `popup.html` 和 `popup.js` 中提供清晰的用户反馈，包括加载状态、HTML获取状态、转换状态、成功或失败信息。
    *   **前置任务**: 任务 2.4。
    *   **测试用例**: (与之前类似)

## 阶段 3: 改进与可选功能 (与之前类似，优先级较低)

*   **任务 3.1: (可选) 插件选项页面 (配置 Worker URL)**
*   **任务 3.2: (可选) Worker 端支持 `turndown` 选项传递** (插件发送，Worker接收并应用)
*   **任务 3.3: (可选) 插件端支持右键菜单触发**
*   **任务 3.4: (可选) 更智能的 HTML 内容提取** (例如，在 `getPageHTML.js` 中实现或使用库尝试提取主要内容)
*   **任务 3.5: (可选) 国际化 (i18n)**
*   **任务 3.6: 最终测试和打包**

---

**注意**: 
*   `YOUR_WORKER_SUBDOMAIN.workers.dev/api/convert` 或 `https://<worker-url>` 需要替换为实际部署的 Worker 地址。 
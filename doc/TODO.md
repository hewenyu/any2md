# TODO - 网页转 Markdown 项目开发任务列表

本文档按顺序和依赖关系，列出了"网页转 Markdown"项目的开发任务。
每个任务都应在完成后进行充分测试。

## 阶段 1: Cloudflare Worker (Server 端) - 核心功能

*   **任务 1.1: 初始化 Worker 项目并实现基础 HTTP 服务**
    *   **描述**: 使用 Wrangler CLI 初始化一个新的 Cloudflare Worker 项目 (JavaScript 或 TypeScript)。实现一个简单的 HTTP GET 端点 (例如 `/ping`)，返回 `pong`，以验证 Worker 部署和基本路由。
    *   **前置任务**: 无。
    *   **测试用例**:
        *   部署 Worker 后，使用浏览器或 curl 访问 `https://<worker-url>/ping` 应返回 `pong` 文本和 200 OK 状态码。

*   **任务 1.2: 实现 `/api/convert` POST 端点基础结构**
    *   **描述**: 创建 `/api/convert` 端点，接受 POST 请求。初步实现：检查请求方法是否为 POST，解析 JSON 请求体，尝试获取 `url` 参数。如果方法不对或缺少 `url`，返回相应的错误响应 (405, 400)。
    *   **前置任务**: 任务 1.1。
    *   **测试用例**:
        *   `POST /api/convert` (无 body): 返回 400 (或错误提示缺少 `url`)。
        *   `POST /api/convert` (body: `{"some_other_key":"value"}`): 返回 400 (或错误提示缺少 `url`)。
        *   `GET /api/convert`: 返回 405。
        *   `POST /api/convert` (body: `{"url":"http://example.com"}`): （暂时）可以返回一个成功的占位符响应 (例如，200 OK，body: `{"message":"URL received", "url":"http://example.com"}`) 或直接进入下一步的 HTML 获取逻辑（如果在此任务中一并实现）。

*   **任务 1.3: 实现网页 HTML 内容获取**
    *   **描述**: 在 `/api/convert` 端点中，当收到有效的 `url` 参数后，使用 Worker 的 `fetch` API 获取目标 URL 的 HTML 内容。处理 `fetch` 可能出现的错误 (网络问题、目标服务器错误等)，并返回适当的错误响应。
    *   **前置任务**: 任务 1.2。
    *   **测试用例**:
        *   `POST /api/convert` (body: `{"url":"<一个有效的、可访问的URL>"}`): Worker 内部应能成功 fetch HTML。暂时可以返回获取到的 HTML 内容本身或一个成功获取的标志。
        *   `POST /api/convert` (body: `{"url":"<一个无效的或不可访问的URL>"}`): 返回相应的错误码 (如 500, 404 - 取决于 fetch 失败的原因) 和错误信息。
        *   `POST /api/convert` (body: `{"url":"<一个会触发CORS错误的URL，如果直接从浏览器插件fetch的话>"}`): 验证 Worker 是否能绕过浏览器的CORS限制进行 fetch (通常可以)。

*   **任务 1.4: 集成 Markdown 转换库并实现转换逻辑**
    *   **描述**: 将 `turndown` (或选定的 Markdown 转换库) 添加到 Worker 项目依赖中。在获取到 HTML 内容后，使用该库将其转换为 Markdown 字符串。
    *   **前置任务**: 任务 1.3。
    *   **测试用例**:
        *   `POST /api/convert` (body: `{"url":"<一个包含简单HTML结构的有效URL>"}`): 返回转换后的 Markdown 文本，`Content-Type` 为 `text/markdown`。
        *   测试包含标题、段落、列表、链接、代码块等常见 HTML 元素的页面，验证转换基本正确。
        *   如果转换库本身出错，应返回 500 错误。

*   **任务 1.5: 完善错误处理和日志记录 (Worker)**
    *   **描述**: 确保所有可预见的错误路径都有明确的错误响应 (HTTP 状态码 + JSON 错误信息)。在 Worker 代码中添加 `console.log` 或 `console.error` 以便通过 `wrangler tail` 进行调试。
    *   **前置任务**: 任务 1.4。
    *   **测试用例**:
        *   系统性地测试任务 1.2, 1.3, 1.4 中描述的各种有效和无效输入，验证错误响应符合预期。
        *   在 `wrangler tail` 中观察日志输出是否清晰、有帮助。

## 阶段 2: 浏览器插件 (Client 端) - 核心功能

*   **任务 2.1: 初始化插件项目并设置 `manifest.json`**
    *   **描述**: 创建浏览器插件的项目结构。编写 `manifest.json` (V3)，包含基本信息 (名称、版本、描述)、`activeTab` 和 `downloads` 权限，以及指向 `popup.html` 的 `action`。
    *   **前置任务**: 无 (可与阶段 1 并行，但逻辑上依赖 Worker API 定义)。
    *   **测试用例**:
        *   插件能被浏览器加载（通过"加载已解压的扩展程序"）。
        *   插件图标显示在浏览器工具栏。
        *   点击插件图标能打开一个（暂时为空或简单的）`popup.html`。

*   **任务 2.2: 实现 Popup UI (`popup.html` 和基础 `popup.js`)**
    *   **描述**: 创建 `popup.html`，包含一个"转换并下载"按钮和一个用于显示状态的区域。在 `popup.js` 中，为按钮添加点击事件监听器。
    *   **前置任务**: 任务 2.1。
    *   **测试用例**:
        *   弹窗界面按设计显示。
        *   点击按钮时，`popup.js` 中的事件处理函数被触发（可以用 `console.log` 验证）。
        *   状态区域可以被 `popup.js` 更新。

*   **任务 2.3: Popup 获取当前标签页 URL**
    *   **描述**: 在 `popup.js` 的按钮点击事件中，使用 `chrome.tabs.query` API 获取当前激活标签页的 URL 和标题。
    *   **前置任务**: 任务 2.2。
    *   **测试用例**:
        *   点击按钮后，插件能正确获取并（例如 `console.log`）输出当前页面的 URL 和标题。
        *   在特殊页面 (如 `chrome://extensions`) 测试，确保行为符合预期（`activeTab` 可能对这些页面无效，需要优雅处理）。

*   **任务 2.4: 设置 Background Service Worker (`service-worker.js`)**
    *   **描述**: 在 `manifest.json` 中配置 `background.service_worker`。创建 `service-worker.js` 文件。在 `popup.js` 中，当获取到 URL 后，通过 `chrome.runtime.sendMessage` 将 URL 发送给 Service Worker。
    *   **前置任务**: 任务 2.3。
    *   **测试用例**:
        *   `popup.js` 发送消息后，`service-worker.js` 中的 `chrome.runtime.onMessage` 监听器能接收到消息和 URL 数据（用 `console.log` 验证）。

*   **任务 2.5: Service Worker 调用 Worker API**
    *   **描述**: 在 `service-worker.js` 中，当接收到 URL 后，使用 `fetch` API 调用已部署的 Cloudflare Worker 的 `/api/convert` 端点 (POST 请求，包含 URL 的 JSON body)。**确保 `manifest.json` 中 `host_permissions` 配置正确，允许访问 Worker 域名。**
    *   **前置任务**: 任务 1.5 (Worker API 可用), 任务 2.4。
    *   **测试用例**:
        *   Service Worker 成功向 Worker API 发送请求。
        *   Worker API 接收到请求并按预期处理 (可在 Worker 端 `wrangler tail` 查看日志)。
        *   Service Worker 能获取 Worker API 的响应（成功或失败）。
        *   如果 Worker URL 配置错误或 `host_permissions` 不对，插件控制台应有错误提示。

*   **任务 2.6: Service Worker 处理 API 响应并返回给 Popup**
    *   **描述**: Service Worker 解析 Worker API 的响应。如果成功 (200 OK，`text/markdown`)，则将 Markdown 内容通过 `sendResponse` 返回给 `popup.js`。如果失败，则将错误信息返回。
    *   **前置任务**: 任务 2.5。
    *   **测试用例**:
        *   当 Worker API 返回成功时，`popup.js` 能通过 `sendMessage` 的回调接收到 Markdown 文本。
        *   当 Worker API 返回错误时，`popup.js` 能接收到错误信息。
        *   在 Service Worker 中正确使用 `return true;` 以支持异步 `sendResponse`。

*   **任务 2.7: Popup 实现 Markdown 内容下载**
    *   **描述**: 在 `popup.js` 中，当从 Service Worker 接收到 Markdown 内容后，使用 `Blob`, `URL.createObjectURL`, 和 `chrome.downloads.download` API 将其作为 `.md` 文件下载。文件名可以基于页面标题生成。
    *   **前置任务**: 任务 2.6。
    *   **测试用例**:
        *   成功转换后，浏览器触发文件下载。
        *   下载的文件名为预期的名称 (基于页面标题)。
        *   下载的文件内容为正确的 Markdown。
        *   测试文件名中的特殊字符是否被妥善处理。
        *   `saveAs: true` 功能按预期工作（如果使用）。

*   **任务 2.8: 完善 Popup 状态显示和错误处理 (插件)**
    *   **描述**: 在 `popup.js` 中，根据操作的不同阶段（获取URL、发送请求、等待响应、下载中、成功、失败）更新状态区域的文本。清晰地向用户展示错误信息。
    *   **前置任务**: 任务 2.7。
    *   **测试用例**:
        *   在整个流程中，状态信息按预期更新。
        *   如果 Worker API 调用失败，弹窗中显示来自服务器的错误或通用错误信息。
        *   如果下载失败 (例如权限问题，虽然 `downloads` 权限已请求)，显示错误。

## 阶段 3: 改进与可选功能

*   **任务 3.1: (可选) 插件选项页面**
    *   **描述**: 创建一个选项页面 (`options.html`, `options.js`)，允许用户配置 Cloudflare Worker 的 URL。配置使用 `chrome.storage.sync` 保存和读取。
    *   **前置任务**: 阶段 2 完成。
    *   **测试用例**:
        *   选项页面可以打开。
        *   可以输入并保存 Worker URL。
        *   插件 (Service Worker 和 Popup) 能读取并使用保存的 Worker URL。
        *   如果未配置，则使用默认 Worker URL。

*   **任务 3.2: (可选) Worker 端支持更细致的 HTML 清理/选择**
    *   **描述**: （如果需要）在 Worker 端引入 HTML 解析库 (如 `cheerio`，需确认 Worker 环境兼容性)，允许根据特定规则或插件传递的参数（如 CSS 选择器）提取主要内容区域，而不是转换整个 `<body>`。
    *   **前置任务**: 任务 1.5。
    *   **测试用例**:
        *   如果实现了选择器功能，Worker API 能根据选择器参数只转换部分 HTML。

*   **任务 3.3: (可选) 插件端支持右键菜单触发**
    *   **描述**: 使用 `chrome.contextMenus` API 添加一个右键菜单项，允许用户通过右键点击页面来触发转换和下载。
    *   **前置任务**: 阶段 2 完成。
    *   **测试用例**:
        *   右键菜单项在页面上出现。
        *   点击菜单项能触发与点击弹窗按钮相同的转换和下载流程。
        *   状态反馈可能需要通过 `chrome.notifications` API (因为没有弹窗)。

*   **任务 3.4: (可选) 国际化 (i18n)**
    *   **描述**: 为插件 UI 文本 (popup, options) 添加多语言支持。
    *   **前置任务**: 阶段 2 (或 3.1, 3.3 如果已完成)。

*   **任务 3.5: 最终测试和打包**
    *   **描述**: 对所有功能进行端到端测试，在不同网站上测试转换效果。准备分发 (例如，打包为 `.zip` 文件)。
    *   **前置任务**: 所有选定的开发任务完成。

---

**注意**: 
*   每个任务完成后，应编写并执行相应的测试用例。
*   `YOUR_WORKER_SUBDOMAIN.workers.dev/api/convert` 或 `https://<worker-url>` 需要替换为实际部署的 Worker 地址。 
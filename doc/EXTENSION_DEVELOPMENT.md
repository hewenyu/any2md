# 浏览器插件开发指南

本文档指导如何开发与 Cloudflare Worker 配套的浏览器插件，用于将网页转换为 Markdown。

## 1. 项目结构 (推荐)

```
my-extension/
├── manifest.json         # 插件清单文件
├── icons/                # 插件图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html        # 弹窗 UI
│   └── popup.js          # 弹窗逻辑
├── background/
│   └── service-worker.js # 后台服务工作线程 (Manifest V3)
└── content-scripts/      # (如果需要与页面直接交互)
    └── content.js
```

## 2. `manifest.json` (Manifest V3 示例)

```json
{
  "manifest_version": 3,
  "name": "网页转 Markdown 插件",
  "version": "0.1.0",
  "description": "将当前网页内容通过 Cloudflare Worker 转换为 Markdown 并下载。",
  "permissions": [
    "activeTab",   // 允许访问当前激活标签页的信息 (URL, 标题)
    "downloads",   // 允许插件触发文件下载
    "storage"      // 可选：用于存储配置，如 Worker URL
  ],
  "host_permissions": [
    "*://*.workers.dev/" // 替换为你的 Worker 部署的域名或更具体的路径
    // 如果你的 Worker URL 是自定义域名，则改为相应的域名
    // 例如 "https://your-custom-domain.com/"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**关键权限和字段**:

*   **`manifest_version: 3`**: 指定使用 Manifest V3。
*   **`permissions`**: 
    *   `activeTab`: 核心权限，允许插件在用户点击插件图标时获取当前标签页的 URL 和标题，而无需请求宽泛的 `<all_urls>` 权限。
    *   `downloads`: 允许使用 `chrome.downloads.download()` API。
    *   `storage` (可选): 如果需要存储用户配置（如 Worker URL、默认文件名模板等），则添加此权限。
*   **`host_permissions`**: **非常重要**。指定插件可以向哪些域名发起 `fetch` 请求。你需要将 `"*://*.workers.dev/"` 替换为你的 Cloudflare Worker 实际部署的 URL 基础。如果 Worker 使用自定义域名，也需要在这里声明。
    *   **注意**：这里的模式需要尽可能精确，以遵循最小权限原则。例如，如果你的 Worker 完整 URL 是 `https://my-markdown-worker.username.workers.dev/api/convert`，你可以设置为 `https://my-markdown-worker.username.workers.dev/*`。
*   **`action`**: 定义了当用户点击浏览器工具栏上的插件图标时的行为。
    *   `default_popup`: 指定一个 HTML 文件作为弹窗界面。
    *   `default_icon`: 指定不同尺寸的插件图标。
*   **`background.service_worker`**: 在 Manifest V3 中，后台逻辑由 Service Worker 处理。这里指向你的 Service Worker脚本。
*   **`icons`**: 定义插件在不同场景下（如扩展管理页面）显示的图标。

## 3. 弹窗 (`popup/popup.html` 和 `popup/popup.js`)

### `popup.html` (示例)

```html
<!DOCTYPE html>
<html>
<head>
  <title>网页转 Markdown</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; width: 250px; padding: 10px; text-align: center; }
    button { padding: 10px 15px; font-size: 14px; cursor: pointer; }
    p#status { margin-top: 10px; font-size: 12px; }
  </style>
</head>
<body>
  <h3>转换网页为 Markdown</h3>
  <button id="convertBtn">转换并下载</button>
  <p id="status"></p>
  <script src="popup.js"></script>
</body>
</html>
```

### `popup.js` (示例)

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const convertBtn = document.getElementById('convertBtn');
  const statusEl = document.getElementById('status');

  // 从 storage 中获取 Worker URL，如果不存在则使用默认值
  // 实际项目中，可以提供一个选项页面让用户配置 Worker URL
  const DEFAULT_WORKER_URL = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/convert'; // !! 替换为你的 Worker URL
  let workerUrl = DEFAULT_WORKER_URL;

  // 尝试从 chrome.storage.sync 获取已保存的 workerUrl (如果实现了选项页)
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['workerUrl'], (result) => {
      if (result.workerUrl) {
        workerUrl = result.workerUrl;
      }
    });
  }

  convertBtn.addEventListener('click', async () => {
    statusEl.textContent = '正在获取标签页信息...';
    convertBtn.disabled = true;

    try {
      // 1. 获取当前激活的标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url) {
        statusEl.textContent = '无法获取当前标签页 URL。';
        convertBtn.disabled = false;
        return;
      }

      const pageUrl = tab.url;
      const pageTitle = tab.title || 'markdown_page'; // 获取页面标题作为默认文件名

      statusEl.textContent = '正在发送到服务器转换...';

      // 2. 向 Background Service Worker 发送消息，请求转换
      // Manifest V3 中，网络请求等应由 Service Worker 处理
      const response = await chrome.runtime.sendMessage({
        action: 'convertToMarkdown',
        payload: { url: pageUrl }
      });

      if (response.success && response.markdown) {
        statusEl.textContent = '转换成功，正在下载...';
        // 3. 触发下载
        const blob = new Blob([response.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        // 清理特殊字符，生成合法的文件名
        const safeFilename = pageTitle.replace(/[\/\\:*?"<>|]/g, '') + '.md';

        chrome.downloads.download({
          url: url,
          filename: safeFilename,
          saveAs: true // 可以让用户选择保存位置和文件名
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            statusEl.textContent = `下载失败: ${chrome.runtime.lastError.message}`;
            console.error('Download failed:', chrome.runtime.lastError);
          } else {
            statusEl.textContent = '下载完成!';
          }
          // 下载完成后，可以关闭 popup 或者给出提示
          // setTimeout(() => window.close(), 2000);
        });
      } else {
        statusEl.textContent = `转换失败: ${response.error || '未知错误'}`;
      }
    } catch (error) {
      statusEl.textContent = `发生错误: ${error.message}`;
      console.error('Error in popup:', error);
    }
    convertBtn.disabled = false;
  });
});
```

**关键点**:

*   **UI 交互**: `popup.html` 提供一个按钮，`popup.js` 处理按钮点击事件。
*   **获取当前标签页**: 使用 `chrome.tabs.query({ active: true, currentWindow: true })`。
*   **消息传递给 Service Worker**: 在 Manifest V3 中，`popup.js` 不能直接执行长时间运行的任务或复杂的 API 调用（如 `fetch` 到外部服务）。它应该向 Background Service Worker (`background/service-worker.js`) 发送消息，由 Service Worker 来处理这些任务。
    *   `chrome.runtime.sendMessage` 用于从 `popup.js` 发送消息。
*   **Worker URL 配置**: 示例中硬编码了 Worker URL，实际项目中建议通过 `chrome.storage.sync` 和插件的选项页面让用户配置。
*   **下载 Markdown**: 
    *   接收到 Service Worker 返回的 Markdown 内容后，创建一个 `Blob`。
    *   使用 `URL.createObjectURL()` 生成一个可下载的 URL。
    *   调用 `chrome.downloads.download()` API 触发下载。
    *   文件名可以从页面标题生成，并进行清理以避免非法字符。
    *   `saveAs: true` 会弹出保存对话框。
*   **状态显示**: 通过 `statusEl` 向用户反馈操作进度和结果。

## 4. 后台服务 (`background/service-worker.js`)

Manifest V3 使用 Service Worker 处理后台任务。

```javascript
// background/service-worker.js

// 从 storage 中获取 Worker URL，如果不存在则使用默认值
const DEFAULT_WORKER_URL = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/convert'; // !! 替换为你的 Worker URL
let workerUrl = DEFAULT_WORKER_URL;

// 插件安装或更新时，可以尝试从 storage 加载配置
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['workerUrl'], (result) => {
      if (result.workerUrl) {
        workerUrl = result.workerUrl;
        console.log('Worker URL loaded from storage:', workerUrl);
      }
    });
  }
});

// 监听来自 popup 或其他部分的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'convertToMarkdown') {
    const pageUrl = request.payload.url;

    // 异步处理请求
    (async () => {
      try {
        console.log(`Requesting markdown for URL: ${pageUrl} via Worker: ${workerUrl}`);
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: pageUrl }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Worker request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const markdown = await response.text();
        sendResponse({ success: true, markdown: markdown });

      } catch (error) {
        console.error('Error fetching or converting markdown:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; //  重要：表明 sendResponse 将会异步调用
  }

  // 如果有其他 action，可以在这里处理
  // 例如，更新 workerUrl 的消息监听
  if (request.action === 'updateWorkerUrl') {
    if (request.payload.newUrl) {
      workerUrl = request.payload.newUrl;
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ workerUrl: workerUrl }, () => {
          console.log('Worker URL updated and saved:', workerUrl);
          sendResponse({ success: true, message: 'Worker URL updated.' });
        });
      } else {
        sendResponse({ success: false, error: 'Storage API not available.' });
      }
      return true; // 异步
    }
  }
});

// 可选：如果需要，可以添加右键菜单项
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.contextMenus.create({
//     id: "convertToMarkdownContextMenu",
//     title: "转换为 Markdown 并下载",
//     contexts: ["page"] // 只在页面上显示
//   });
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === "convertToMarkdownContextMenu" && tab) {
//     // 这里的逻辑会和 popup.js 中的点击事件类似，但直接从这里触发
//     // 需要获取 tab.url, tab.title 然后调用 fetch 等
//     // 为了代码复用，可以将核心转换和下载逻辑封装成一个函数
//     if (tab.url) {
//       chrome.runtime.sendMessage({
//         action: 'convertToMarkdown',
//         payload: { url: tab.url, title: tab.title || 'markdown_page' }
//         // 注意：这里直接发送给自己的 runtime (service worker)
//         // 或者将 fetch 逻辑直接写在这里
//       });
//       // 由于没有 popup，状态反馈需要通过 chrome.notifications API
//     }
//   }
// });

console.log('Service Worker for Markdown Converter started.');
```

**关键点**:

*   **`chrome.runtime.onMessage.addListener`**: 监听来自 `popup.js` (或其他插件部分) 的消息。
*   **`fetch` 请求**: Service Worker 可以直接执行 `fetch` 请求到在 `host_permissions` 中声明的外部服务器 (即你的 Cloudflare Worker)。
*   **请求体**: 发送 `POST` 请求，请求体为 JSON 格式，包含 `{ "url": "..." }`。
*   **处理响应**: 检查 `response.ok`，如果请求失败，则读取错误文本并抛出异常。成功则读取 Markdown 文本。
*   **`sendResponse`**: 将结果 (成功或失败) 发送回消息的调用者 (`popup.js`)。
*   **`return true;`**: 在 `onMessage` 监听器中，如果 `sendResponse` 是异步调用的（例如在 `fetch` 的 `then` 或 `async/await` 之后），则必须 `return true;` 来保持消息通道的开放，直到 `sendResponse` 被调用。
*   **Worker URL 管理**: 同样，Worker URL 最好从 `chrome.storage` 读取，并允许用户配置。
*   **右键菜单 (可选)**: 示例中注释掉了如何添加右键上下文菜单项 (`chrome.contextMenus`) 作为另一种触发方式。如果启用，点击菜单项的逻辑会与 `popup.js` 类似，但需要注意状态反馈（可能使用 `chrome.notifications` API）。

## 5. 图标

在 `icons/` 目录下放置不同尺寸的 PNG 图标 (例如 `icon16.png`, `icon48.png`, `icon128.png`)。
这些图标会在浏览器工具栏、扩展管理页面等处显示。

## 6. 打包与测试

1.  **开发模式加载**: 
    *   打开 Chrome/Edge 浏览器的扩展管理页面 (`chrome://extensions` 或 `edge://extensions`)。
    *   启用"开发者模式"。
    *   点击"加载已解压的扩展程序"，然后选择你的插件项目文件夹 (`my-extension/`)。
2.  **测试**: 
    *   确保你的 Cloudflare Worker 已经部署并且 URL 配置正确 (在 `popup.js` 和 `background/service-worker.js` 中，或通过 storage)。
    *   点击浏览器工具栏上的插件图标。
    *   在弹窗中点击"转换并下载"按钮。
    *   观察弹窗中的状态信息，以及浏览器控制台（包括插件的弹窗和 Service Worker 的控制台）中的日志。
3.  **打包 (`.crx` 或 `.zip`)**: 当准备分发时，可以使用扩展管理页面中的"打包扩展程序"功能，或者手动将项目文件夹压缩为 `.zip` 文件 (对于 Chrome Web Store 等商店)。

## 7. 进一步优化与功能

*   **选项页面 (`options.html`)**: 创建一个选项页面，允许用户配置 Cloudflare Worker URL、默认文件名格式、Markdown 转换选项等，并将这些配置保存到 `chrome.storage`。
*   **错误处理与用户反馈**: 改进错误处理逻辑，向用户提供更清晰的错误信息和操作指引 (例如，使用 `chrome.notifications` API)。
*   **内容脚本 (`content_scripts`)**: 如果需要更复杂的内容提取逻辑（例如，用户在页面上选择特定元素进行转换），可以使用内容脚本与页面 DOM直接交互，然后将提取的内容或选择器发送给 Service Worker。
*   **国际化 (`_locales`)**: 支持多种语言。
*   **代码组织与构建工具**: 对于更复杂的插件，可以考虑使用 TypeScript、Webpack/Rollup 等工具来组织和构建代码。 
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
└── scripts/              # 用于注入页面的脚本
    └── getPageHTML.js
```

## 2. `manifest.json` (Manifest V3 示例)

```json
{
  "manifest_version": 3,
  "name": "网页转 Markdown 插件",
  "version": "0.1.0",
  "description": "获取当前网页HTML，通过 Cloudflare Worker 转换为 Markdown 并下载。",
  "permissions": [
    "activeTab",   // 允许访问当前激活标签页的信息 (URL, 标题) 并注入脚本
    "scripting",   // 允许使用 chrome.scripting API 执行脚本
    "downloads",   // 允许插件触发文件下载
    "storage"      // 可选：用于存储配置，如 Worker URL
  ],
  "host_permissions": [
    "*://*.workers.dev/" // 替换为你的 Worker 部署的域名或更具体的路径
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
  },
  "web_accessible_resources": [
    {
      "resources": [ "scripts/getPageHTML.js" ], // 如果脚本需要被页面访问，但通常 executeScript 不需要
      "matches": [ "<all_urls>" ]
    }
  ]
}
```

**关键权限和字段**:

*   **`permissions`**: 
    *   `activeTab`: 允许在用户操作时访问当前标签页并执行脚本。
    *   `scripting`: **新增**，允许使用 `chrome.scripting.executeScript`。
    *   `downloads`: 允许使用 `chrome.downloads.download()` API。
*   **`host_permissions`**: 确保 Worker 的 URL 在此列出，允许插件向其发送 `fetch` 请求。
*   **`web_accessible_resources`**: 通常在 `executeScript` 使用 `files` 参数时不需要将脚本列为 web 可访问资源，但如果脚本是通过其他方式注入或需要被页面自身 `fetch`，则可能需要。对于仅通过 `executeScript` 的 `func` 或 `files`（由插件内部加载）执行的脚本，此项通常不是必需的。

## 3. 内容提取脚本 (`scripts/getPageHTML.js`)

这是一个简单的脚本，当被注入到页面中时，它会返回整个页面的 HTML。

```javascript
// scripts/getPageHTML.js

// 这段代码将在目标页面的上下文中执行
(function() {
  // 可以选择更具体的元素，例如 document.body.outerHTML
  // 或者只选择文章主要内容部分，如果能确定选择器的话
  return document.documentElement.outerHTML;
})();
```

## 4. 弹窗 (`popup/popup.html` 和 `popup/popup.js`)

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

### `popup.js` (示例更新)

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const convertBtn = document.getElementById('convertBtn');
  const statusEl = document.getElementById('status');

  const DEFAULT_WORKER_URL = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/convert'; // !! 替换为你的 Worker URL
  let workerUrl = DEFAULT_WORKER_URL;

  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['workerUrl'], (result) => {
      if (result.workerUrl) {
        workerUrl = result.workerUrl;
      }
    });
  }

  convertBtn.addEventListener('click', async () => {
    statusEl.textContent = '正在获取页面HTML...';
    convertBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        statusEl.textContent = '无法获取当前标签页信息。';
        convertBtn.disabled = false;
        return;
      }

      // 1. 获取页面 HTML 内容
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        // func: () => document.documentElement.outerHTML, // 或者使用 files
        files: ['scripts/getPageHTML.js']
      });

      if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
        statusEl.textContent = `无法获取页面HTML: ${chrome.runtime.lastError?.message || '无结果返回'}`;
        convertBtn.disabled = false;
        return;
      }
      
      const pageHTML = injectionResults[0].result;
      const pageTitle = tab.title || 'markdown_page';

      statusEl.textContent = 'HTML获取成功，正在发送到服务器转换...';

      // 2. 向 Background Service Worker 发送消息，请求转换
      const response = await chrome.runtime.sendMessage({
        action: 'convertToMarkdown',
        payload: { html: pageHTML } // 发送 HTML 而不是 URL
      });

      if (response.success && response.markdown) {
        statusEl.textContent = '转换成功，正在下载...';
        const blob = new Blob([response.markdown], { type: 'text/markdown;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const safeFilename = pageTitle.replace(/[\/\\:*?"<>|]/g, '') + '.md';

        chrome.downloads.download({
          url: blobUrl,
          filename: safeFilename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            statusEl.textContent = `下载失败: ${chrome.runtime.lastError.message}`;
          } else {
            statusEl.textContent = '下载完成!';
          }
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

**关键点更新**:

*   **获取页面 HTML**: 使用 `chrome.scripting.executeScript` API。
    *   `target: { tabId: tab.id }`: 指定在哪个标签页执行脚本。
    *   `files: ['scripts/getPageHTML.js']`: 指定要注入的脚本文件。或者，可以使用 `func` 选项直接传递一个函数。
    *   脚本执行结果会通过 Promise 返回，需要检查 `injectionResults`。
*   **发送 HTML 到 Service Worker**: `chrome.runtime.sendMessage` 的 `payload` 现在包含 `html` 字段而不是 `url`。

## 5. 后台服务 (`background/service-worker.js`)

Service Worker 现在接收 HTML 内容并将其发送给 Worker 服务。

```javascript
// background/service-worker.js

const DEFAULT_WORKER_URL = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/convert'; // !! 替换为你的 Worker URL
let workerUrl = DEFAULT_WORKER_URL;

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['workerUrl'], (result) => {
      if (result.workerUrl) {
        workerUrl = result.workerUrl;
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'convertToMarkdown') {
    const pageHTML = request.payload.html; // 接收 HTML

    (async () => {
      try {
        console.log(`Sending HTML (length: ${pageHTML.length}) to Worker: ${workerUrl}`);
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ html: pageHTML }), // 发送 HTML
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Worker request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const markdown = await response.text();
        sendResponse({ success: true, markdown: markdown });

      } catch (error) {
        console.error('Error posting HTML to worker or converting markdown:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // 表明 sendResponse 将会异步调用
  }
  // ... (其他消息处理，如 updateWorkerUrl)
});

console.log('Service Worker for Markdown Converter started.');
```

**关键点更新**:

*   **接收 HTML**: `onMessage` 监听器从 `request.payload.html` 获取 HTML 内容。
*   **`fetch` 请求体**: `JSON.stringify({ html: pageHTML })` 将 HTML 内容发送给 Worker。

## 6. 打包与测试 (注意事项)

*   确保 `scripts/getPageHTML.js` 文件存在于正确的位置。
*   测试时，注意观察插件的 Service Worker 和 Popup 页面的控制台日志，以及目标页面（如果 `executeScript` 失败）的控制台。
*   `activeTab` 权限通常足够 `executeScript` 操作当前激活的、用户交互的标签页。如果目标页面是 `chrome://` 或其他受保护的页面，`executeScript` 可能会失败。

## 7. 进一步优化与功能

*   **更智能的 HTML 提取**: `getPageHTML.js` 可以做得更智能，例如尝试提取文章主体内容 (如使用 Readability.js 库的逻辑，但这会增加复杂性) 而不是整个 `documentElement.outerHTML`。
*   **用户反馈**: 如果 HTML 提取时间较长或发送的数据量较大，应提供清晰的用户反馈。

## 8. 图标

在 `icons/` 目录下放置不同尺寸的 PNG 图标 (例如 `icon16.png`, `icon48.png`, `icon128.png`)。
这些图标会在浏览器工具栏、扩展管理页面等处显示。

## 9. 打包与测试

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

## 10. 进一步优化与功能

*   **选项页面 (`options.html`)**: 创建一个选项页面，允许用户配置 Cloudflare Worker URL、默认文件名格式、Markdown 转换选项等，并将这些配置保存到 `chrome.storage`。
*   **错误处理与用户反馈**: 改进错误处理逻辑，向用户提供更清晰的错误信息和操作指引 (例如，使用 `chrome.notifications` API)。
*   **内容脚本 (`content_scripts`)**: 如果需要更复杂的内容提取逻辑（例如，用户在页面上选择特定元素进行转换），可以使用内容脚本与页面 DOM直接交互，然后将提取的内容或选择器发送给 Service Worker。
*   **国际化 (`_locales`)**: 支持多种语言。
*   **代码组织与构建工具**: 对于更复杂的插件，可以考虑使用 TypeScript、Webpack/Rollup 等工具来组织和构建代码。 
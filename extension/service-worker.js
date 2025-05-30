// 定义Worker API URL
const WORKER_API_URL = 'https://any2md.yueban.fan/api/convert';
// const WORKER_API_URL = 'http://localhost:8787/api/convert';

// API请求超时时间 (毫秒)
const API_TIMEOUT = 30000; // 30秒

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 创建转换整个页面的菜单项
  chrome.contextMenus.create({
    id: 'convertWholePage',
    title: '将整个页面转换为Markdown',
    contexts: ['page']
  });

  // 创建转换选定区域的菜单项
  chrome.contextMenus.create({
    id: 'convertSelection',
    title: '将选定文本转换为Markdown',                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
    contexts: ['selection']
  });

  // 创建打开区域选择模式的菜单项
  chrome.contextMenus.create({
    id: 'selectRegions',
    title: '选择页面区域进行转换',
    contexts: ['page']
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;

  switch (info.menuItemId) {
    case 'convertWholePage':
      // 获取整个页面的HTML并转换
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/getPageHTML.js']
      }).then((results) => {
        if (results && results[0] && results[0].result) {
          const html = results[0].result;
          convertHtmlToMarkdown(html)
            .then(markdown => {
              downloadMarkdown(markdown, generateFilename(tab.title));
            })
            .catch(error => {
              console.error('转换失败:', error);
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/android-chrome-192x192.png',
                title: '转换失败',
                message: error.message || '转换过程中发生错误'
              });
            });
        }
      });
      break;
    
    case 'convertSelection':
      // 获取选定的文本内容并转换
      if (info.selectionText) {
        const html = `<div>${info.selectionText}</div>`;
        convertHtmlToMarkdown(html)
          .then(markdown => {
            downloadMarkdown(markdown, generateFilename(tab.title + '-选定文本'));
          })
          .catch(error => {
            console.error('转换失败:', error);
          });
      }
      break;
    
    case 'selectRegions':
      // 注入区域选择脚本
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/regionSelector.js']
      });
      break;
  }
});

// 下载Markdown文件
function downloadMarkdown(markdown, filename) {
  // 在Service Worker中，不能直接使用URL.createObjectURL
  // 需要通过chrome.downloads.download API直接使用文本数据下载
  
  // 获取Markdown文本的UTF-8编码字节
  const encoder = new TextEncoder();
  const bytes = encoder.encode(markdown);
  
  // 将字节数组转换为Blob
  const blob = new Blob([bytes], { type: 'text/markdown' });
  
  // 创建FileReader读取Blob内容为Data URL
  const reader = new FileReader();
  reader.onloadend = function() {
    // 通过Data URL下载
    chrome.downloads.download({
      url: reader.result,
      filename: filename,
      saveAs: false
    });
  };
  reader.readAsDataURL(blob);
}

// 生成文件名
function generateFilename(title) {
  // 格式化日期: YYYY-MM-DD
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  
  // 处理标题: 移除不允许的字符，限制长度
  let cleanTitle = title.replace(/[\\/:*?"<>|]/g, '_').trim();
  if (cleanTitle.length > 50) {
    cleanTitle = cleanTitle.substring(0, 47) + '...';
  }
  
  return `${date}_${cleanTitle}.md`;
}

// 监听来自popup.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 检查消息类型是否为convert
  if (message.action === 'convert' && message.html) {
    console.log('接收到HTML转换请求，内容长度:', message.html.length, 
                '来源:', sender.tab ? `标签页 ${sender.tab.id}` : '扩展页面');
    
    // 调用Worker API
    convertHtmlToMarkdown(message.html)
      .then(markdown => {
        console.log('转换成功，Markdown长度:', markdown.length);
        sendResponse({ success: true, markdown });
      })
      .catch(error => {
        console.error('转换失败:', error);
        sendResponse({ 
          success: false, 
          error: error.message || '转换过程中发生错误'
        });
      });
    
    // 返回true表示将异步发送响应
    return true;
  }
  
  // 处理区域选择脚本发送的消息
  if (message.action === 'convertSelectedRegions' && message.html) {
    console.log('接收到选中区域转换请求，内容长度:', message.html.length);
    
    // 调用Worker API
    convertHtmlToMarkdown(message.html)
      .then(markdown => {
        console.log('转换成功，Markdown长度:', markdown.length);
        // 下载转换后的Markdown
        downloadMarkdown(markdown, generateFilename(message.title + '-选中区域'));
      })
      .catch(error => {
        console.error('转换失败:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/android-chrome-192x192.png',
          title: '转换失败',
          message: error.message || '转换过程中发生错误'
        });
      });
    
    // 不需要回复
    return false;
  }
  
  // 处理不支持的消息类型
  if (message.action && message.action !== 'convert' && message.action !== 'convertSelectedRegions') {
    console.warn('接收到不支持的消息类型:', message.action);
    sendResponse({ success: false, error: '不支持的操作类型' });
    return true;
  }
});

/**
 * 使用超时Promise包装fetch请求
 * @param {string} url 请求URL
 * @param {Object} options fetch选项
 * @param {number} timeout 超时时间（毫秒）
 * @returns {Promise} 包含超时处理的Promise
 */
function fetchWithTimeout(url, options, timeout) {
  return new Promise((resolve, reject) => {
    // 创建AbortController用于中止fetch请求
    const controller = new AbortController();
    const signal = controller.signal;
    
    // 设置超时计时器
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('请求超时，服务器响应时间过长'));
    }, timeout);
    
    // 发起fetch请求，并添加signal
    fetch(url, { ...options, signal })
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          reject(new Error('请求超时，服务器响应时间过长'));
        } else {
          reject(error);
        }
      });
  });
}

/**
 * 调用Worker API将HTML转换为Markdown
 * @param {string} html HTML内容
 * @returns {Promise<string>} Markdown内容
 */
async function convertHtmlToMarkdown(html) {
  try {
    console.log('准备调用Worker API，URL:', WORKER_API_URL);
    
    // 记录开始时间，用于计算耗时
    const startTime = performance.now();
    
    // 使用带超时的fetch发起请求
    const response = await fetchWithTimeout(
      WORKER_API_URL, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': chrome.runtime.getManifest().version
        },
        body: JSON.stringify({ html })
      },
      API_TIMEOUT
    );
    
    // 计算请求耗时
    const requestTime = (performance.now() - startTime).toFixed(2);
    console.log(`API请求耗时: ${requestTime}ms`);
    
    // 检查响应状态
    if (!response.ok) {
      // 获取响应状态码和状态文本
      const { status, statusText } = response;
      console.error(`服务器返回错误状态码: ${status} ${statusText}`);
      
      // 尝试解析错误信息
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `服务器错误: ${status} ${statusText}`);
      } catch (e) {
        if (e instanceof SyntaxError) {
          // JSON解析错误，使用状态码信息
          throw new Error(`服务器返回错误: ${status} ${statusText}`);
        }
        throw e;
      }
    }
    
    // 获取响应内容类型
    const contentType = response.headers.get('content-type') || '';
    
    // 检查响应类型是否为Markdown
    if (!contentType.includes('text/markdown') && !contentType.includes('text/plain')) {
      console.warn('服务器返回了非预期的内容类型:', contentType);
    }
    
    // 返回Markdown文本
    const markdown = await response.text();
    
    // 检查返回的Markdown是否为空
    if (!markdown || markdown.trim() === '') {
      throw new Error('服务器返回了空内容');
    }
    
    return markdown;
  } catch (error) {
    console.error('API调用失败:', error);
    
    // 根据错误类型提供更详细的错误信息
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      throw new Error('网络连接失败，请检查您的网络连接');
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('无法连接到转换服务器，请稍后再试');
    } else if (error.message.includes('超时')) {
      throw new Error('服务器响应超时，请稍后再试或尝试转换较小的页面');
    }
    
    // 抛出原始错误
    throw error;
  }
} 
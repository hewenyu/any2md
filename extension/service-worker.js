// 定义Worker API URL
const WORKER_API_URL = 'https://any2md.yueban.fan/api/convert';

// 监听来自popup.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 检查消息类型是否为convert
  if (message.action === 'convert' && message.html) {
    console.log('接收到HTML转换请求，内容长度:', message.html.length);
    
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
});

/**
 * 调用Worker API将HTML转换为Markdown
 * @param {string} html HTML内容
 * @returns {Promise<string>} Markdown内容
 */
async function convertHtmlToMarkdown(html) {
  try {
    const response = await fetch(WORKER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ html })
    });
    
    // 检查响应状态
    if (!response.ok) {
      // 尝试解析错误信息
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `服务器错误: ${response.status}`);
      } catch (e) {
        throw new Error(`服务器返回错误: ${response.status}`);
      }
    }
    
    // 返回Markdown文本
    return await response.text();
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
} 
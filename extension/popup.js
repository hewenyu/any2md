// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const convertBtn = document.getElementById('convertBtn');
  const statusDiv = document.getElementById('status');
  const loadingDiv = document.getElementById('loading');
  
  // 为转换按钮添加点击事件
  convertBtn.addEventListener('click', async () => {
    // 更新界面状态
    convertBtn.disabled = true;
    statusDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        showError('无法获取当前标签页');
        return;
      }
      
      // 检查当前标签页是否可以访问
      if (!tab.url || tab.url.startsWith('chrome:') || tab.url.startsWith('edge:') || tab.url.startsWith('about:')) {
        showError('无法在此页面上运行（浏览器内部页面）');
        return;
      }
      
      // 通过注入脚本获取页面HTML
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/getPageHTML.js']
      });
      
      // 检查脚本执行结果
      if (!results || !results[0] || results[0].result === null) {
        showError('无法获取页面HTML内容');
        return;
      }
      
      const html = results[0].result;
      
      // 发送HTML到后台脚本进行转换
      chrome.runtime.sendMessage(
        { action: 'convert', html },
        response => {
          if (response && response.success && response.markdown) {
            // 转换成功，下载Markdown文件
            downloadMarkdown(response.markdown, generateFilename(tab.title));
            showSuccess('转换成功！Markdown文件已下载');
          } else {
            // 转换失败
            showError(`转换失败: ${response?.error || '未知错误'}`);
          }
        }
      );
    } catch (error) {
      console.error('处理过程中出错:', error);
      showError(`错误: ${error.message || '未知错误'}`);
    }
  });
  
  /**
   * 显示错误信息
   * @param {string} message 错误信息
   */
  function showError(message) {
    statusDiv.textContent = message;
    statusDiv.className = 'error';
    statusDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
    convertBtn.disabled = false;
  }
  
  /**
   * 显示成功信息
   * @param {string} message 成功信息
   */
  function showSuccess(message) {
    statusDiv.textContent = message;
    statusDiv.className = 'success';
    statusDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
    convertBtn.disabled = false;
  }
  
  /**
   * 下载Markdown文件
   * @param {string} markdown Markdown内容
   * @param {string} filename 文件名
   */
  function downloadMarkdown(markdown, filename) {
    // 创建Blob对象
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    
    // 创建下载URL
    const url = URL.createObjectURL(blob);
    
    // 使用chrome.downloads API下载文件
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });
    
    // 释放URL对象
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  
  /**
   * 根据页面标题生成Markdown文件名
   * @param {string} title 页面标题
   * @returns {string} 文件名
   */
  function generateFilename(title) {
    // 清理标题，移除不允许的字符
    const cleanTitle = (title || 'untitled')
      .replace(/[\\/:*?"<>|]/g, '_')  // 替换Windows文件名中不允许的字符
      .replace(/\s+/g, '_')           // 替换空格为下划线
      .substring(0, 100);             // 限制长度
    
    // 添加日期前缀和.md后缀
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    return `${date}_${cleanTitle}.md`;
  }
}); 
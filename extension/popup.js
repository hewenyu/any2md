// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const convertBtn = document.getElementById('convertBtn');
  const retryBtn = document.getElementById('retryBtn');
  const statusDiv = document.getElementById('status');
  const loadingDiv = document.getElementById('loading');
  const progressContainer = document.getElementById('progressContainer');
  const currentAction = document.getElementById('currentAction');
  const pageInfo = document.getElementById('pageInfo');
  const pageTitle = document.getElementById('pageTitle');
  const pageSize = document.getElementById('pageSize');
  
  // 获取进度步骤元素
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  
  // 用于存储最后一次转换的HTML内容和标签页信息
  let lastHtml = null;
  let lastTab = null;
  
  // 为转换按钮添加点击事件
  convertBtn.addEventListener('click', async () => {
    await startConversion();
  });
  
  // 为重试按钮添加点击事件
  retryBtn.addEventListener('click', async () => {
    if (lastHtml && lastTab) {
      hideStatus();
      await convertHtmlToMarkdown(lastHtml, lastTab);
    } else {
      await startConversion();
    }
  });
  
  /**
   * 开始转换流程
   */
  async function startConversion() {
    // 重置上次的状态
    lastHtml = null;
    lastTab = null;
    
    // 更新界面状态
    resetUI();
    updateProgress(1, '正在获取当前页面内容...');
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        showError('无法获取当前标签页信息');
        return;
      }
      
      // 检查当前标签页是否可以访问
      if (!tab.url || tab.url.startsWith('chrome:') || tab.url.startsWith('edge:') || 
          tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension:')) {
        showError('无法在浏览器内部页面上运行（如设置、扩展页面等）');
        return;
      }
      
      // 显示页面信息
      updatePageInfo(tab.title, '获取中...');
      
      // 通过注入脚本获取页面HTML
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/getPageHTML.js']
      });
      
      // 检查脚本执行结果
      if (!results || !results[0] || results[0].result === null) {
        showError('无法获取页面HTML内容，请检查页面是否可访问');
        return;
      }
      
      const html = results[0].result;
      
      // 存储当前处理的内容和标签页信息
      lastHtml = html;
      lastTab = tab;
      
      // 更新页面大小信息
      const htmlSize = (html.length / 1024).toFixed(2);
      updatePageInfo(tab.title, `页面大小: ${htmlSize} KB`);
      
      // 检查HTML大小
      if (html.length > 10 * 1024 * 1024) { // 10MB
        showWarning('页面内容超过10MB，转换可能需要较长时间，或可能失败');
      }
      
      // 进行转换
      await convertHtmlToMarkdown(html, tab);
      
    } catch (error) {
      console.error('处理过程中出错:', error);
      showError(`错误: ${error.message || '未知错误'}`);
      showRetryButton();
    }
  }
  
  /**
   * 将HTML转换为Markdown
   * @param {string} html HTML内容
   * @param {object} tab 标签页信息
   */
  async function convertHtmlToMarkdown(html, tab) {
    updateProgress(2, '正在转换HTML为Markdown...');
    
    try {
      // 发送HTML到后台脚本进行转换
      chrome.runtime.sendMessage(
        { action: 'convert', html },
        response => {
          if (chrome.runtime.lastError) {
            // 处理通信错误
            console.error('与后台脚本通信失败:', chrome.runtime.lastError);
            showError(`与后台服务通信失败: ${chrome.runtime.lastError.message}`);
            showRetryButton();
            return;
          }
          
          if (response && response.success && response.markdown) {
            // 转换成功，准备下载
            updateProgress(3, '正在生成Markdown文件...');
            
            // 下载Markdown文件
            downloadMarkdown(response.markdown, generateFilename(tab.title));
            
            // 显示成功信息
            showSuccess('转换成功！Markdown文件已下载');
            
            // 完成所有进度步骤
            completeAllSteps();
          } else {
            // 转换失败
            let errorMsg = '转换失败';
            if (response && response.error) {
              errorMsg += `: ${response.error}`;
              
              // 根据错误类型提供更具体的提示
              if (response.error.includes('服务器返回错误: 413')) {
                errorMsg += ' (内容过大，超出服务器限制)';
              } else if (response.error.includes('fetch')) {
                errorMsg += ' (网络连接问题，请检查网络)';
              }
            }
            
            showError(errorMsg);
            showRetryButton();
          }
        }
      );
    } catch (error) {
      console.error('发送转换请求时出错:', error);
      showError(`发送请求失败: ${error.message || '未知错误'}`);
      showRetryButton();
    }
  }
  
  /**
   * 重置UI状态
   */
  function resetUI() {
    // 隐藏状态和错误信息
    hideStatus();
    
    // 禁用转换按钮
    convertBtn.disabled = true;
    
    // 隐藏重试按钮
    retryBtn.style.display = 'none';
    
    // 显示进度容器
    progressContainer.style.display = 'block';
    
    // 重置所有步骤
    resetSteps();
  }
  
  /**
   * 重置所有进度步骤
   */
  function resetSteps() {
    step1.className = 'step';
    step2.className = 'step';
    step3.className = 'step';
  }
  
  /**
   * 更新进度显示
   * @param {number} stepNumber 当前步骤编号 (1-3)
   * @param {string} actionText 当前操作文本
   */
  function updateProgress(stepNumber, actionText) {
    // 更新步骤状态
    resetSteps();
    
    // 设置之前的步骤为已完成
    for (let i = 1; i < stepNumber; i++) {
      document.getElementById(`step${i}`).className = 'step completed';
    }
    
    // 设置当前步骤为活动状态
    document.getElementById(`step${stepNumber}`).className = 'step active';
    
    // 更新当前操作文本
    currentAction.textContent = actionText;
  }
  
  /**
   * 完成所有进度步骤
   */
  function completeAllSteps() {
    step1.className = 'step completed';
    step2.className = 'step completed';
    step3.className = 'step completed';
    currentAction.textContent = '转换完成！';
  }
  
  /**
   * 显示页面信息
   * @param {string} title 页面标题
   * @param {string} size 页面大小信息
   */
  function updatePageInfo(title, size) {
    pageTitle.textContent = `标题: ${title || '未知页面'}`;
    pageSize.textContent = size;
    pageInfo.style.display = 'block';
  }
  
  /**
   * 显示重试按钮
   */
  function showRetryButton() {
    retryBtn.style.display = 'block';
  }
  
  /**
   * 隐藏状态信息
   */
  function hideStatus() {
    statusDiv.style.display = 'none';
    loadingDiv.style.display = 'none';
  }
  
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
   * 显示警告信息
   * @param {string} message 警告信息
   */
  function showWarning(message) {
    statusDiv.textContent = message;
    statusDiv.className = 'warning';
    statusDiv.style.display = 'block';
    // 不关闭加载指示器，因为这只是警告
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
    }, downloadId => {
      if (chrome.runtime.lastError) {
        console.error('下载失败:', chrome.runtime.lastError);
        showError(`下载失败: ${chrome.runtime.lastError.message}`);
      }
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
/**
 * 区域选择器脚本 - 允许用户选择网页的特定区域进行转换
 */
(function() {
  // 如果已经在选择模式，则退出
  if (document.querySelector('#any2md-region-selector-container')) {
    return;
  }

  // 创建选择器UI
  function createSelectorUI() {
    // 创建控制面板容器
    const container = document.createElement('div');
    container.id = 'any2md-region-selector-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff;
      border: 2px solid #3498db;
      border-radius: 8px;
      padding: 15px;
      z-index: 2147483647;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
      max-width: 280px;
      color: #333;
    `;

    // 添加标题
    const title = document.createElement('h3');
    title.textContent = '选择要转换的区域';
    title.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #2980b9;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    `;
    container.appendChild(title);

    // 添加说明文本
    const description = document.createElement('p');
    description.textContent = '鼠标悬停在页面元素上会高亮显示，点击可以选择或取消选择该区域。';
    description.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 14px;
      line-height: 1.4;
    `;
    container.appendChild(description);

    // 创建已选区域计数器
    const counter = document.createElement('div');
    counter.id = 'any2md-selected-count';
    counter.textContent = '已选择 0 个区域';
    counter.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 14px;
      font-weight: bold;
      color: #27ae60;
    `;
    container.appendChild(counter);

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
    `;
    container.appendChild(buttonContainer);

    // 创建转换按钮
    const convertButton = document.createElement('button');
    convertButton.id = 'any2md-convert-selected';
    convertButton.textContent = '转换选中区域';
    convertButton.disabled = true;
    convertButton.style.cssText = `
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.5;
    `;
    buttonContainer.appendChild(convertButton);

    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.id = 'any2md-cancel-selection';
    cancelButton.textContent = '取消选择';
    cancelButton.style.cssText = `
      background: #e74c3c;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    buttonContainer.appendChild(cancelButton);

    // 添加到页面
    document.body.appendChild(container);

    // 返回UI元素引用
    return {
      container,
      convertButton,
      cancelButton,
      counter
    };
  }

  // 创建样式
  function addStyles() {
    const style = document.createElement('style');
    style.id = 'any2md-region-selector-styles';
    style.textContent = `
      .any2md-hover {
        outline: 3px solid rgba(52, 152, 219, 0.7) !important;
        background-color: rgba(52, 152, 219, 0.1) !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      .any2md-selected {
        outline: 3px solid rgba(46, 204, 113, 0.7) !important;
        background-color: rgba(46, 204, 113, 0.1) !important;
        position: relative !important;
      }
      .any2md-selected::after {
        content: "✓";
        position: absolute;
        top: 0;
        right: 0;
        background: rgba(46, 204, 113, 0.9);
        color: white;
        padding: 2px 6px;
        font-size: 12px;
        font-weight: bold;
        border-radius: 0 0 0 4px;
        z-index: 2147483646;
      }
    `;
    document.head.appendChild(style);
  }

  // 主要元素，忽略一些不相关的元素
  function isValidElement(element) {
    // 排除控制面板自身
    if (element.id === 'any2md-region-selector-container' || 
        element.closest('#any2md-region-selector-container')) {
      return false;
    }
    
    // 排除脚本和样式元素
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'meta' || 
        tagName === 'link' || tagName === 'html' || tagName === 'head') {
      return false;
    }
    
    // 排除非常小的元素
    if (element.offsetWidth < 20 || element.offsetHeight < 20) {
      return false;
    }
    
    // 排除隐藏元素
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    return true;
  }

  // 计算元素内容大小
  function getElementContentSize(element) {
    const html = element.innerHTML;
    return html ? html.length : 0;
  }

  // 更新选中计数
  function updateSelectedCount(ui) {
    const selectedElements = document.querySelectorAll('.any2md-selected');
    ui.counter.textContent = `已选择 ${selectedElements.length} 个区域`;
    
    // 启用或禁用转换按钮
    if (selectedElements.length > 0) {
      ui.convertButton.disabled = false;
      ui.convertButton.style.opacity = '1';
    } else {
      ui.convertButton.disabled = true;
      ui.convertButton.style.opacity = '0.5';
    }
  }

  // 收集所有选中区域的HTML
  function collectSelectedHTML() {
    const selectedElements = document.querySelectorAll('.any2md-selected');
    if (selectedElements.length === 0) return null;
    
    const wrapper = document.createElement('div');
    selectedElements.forEach(element => {
      const clone = element.cloneNode(true);
      
      // 移除选择相关的类
      clone.classList.remove('any2md-selected');
      clone.classList.remove('any2md-hover');
      
      wrapper.appendChild(clone);
    });
    
    return wrapper.innerHTML;
  }

  // 清理所有添加的元素和样式
  function cleanup() {
    // 移除样式
    const style = document.getElementById('any2md-region-selector-styles');
    if (style) style.remove();
    
    // 移除控制面板
    const container = document.getElementById('any2md-region-selector-container');
    if (container) container.remove();
    
    // 移除所有标记的类
    document.querySelectorAll('.any2md-hover, .any2md-selected').forEach(el => {
      el.classList.remove('any2md-hover');
      el.classList.remove('any2md-selected');
    });
    
    // 移除事件监听器
    document.removeEventListener('mouseover', hoverHandler);
    document.removeEventListener('mouseout', outHandler);
    document.removeEventListener('click', clickHandler);
  }

  // 事件处理器
  let currentHoverElement = null;
  let selectedElements = new Set();
  
  function hoverHandler(e) {
    const target = e.target;
    
    // 如果鼠标悬停在同一元素上，不做任何操作
    if (target === currentHoverElement) return;
    
    // 移除上一个悬停元素的样式
    if (currentHoverElement && !selectedElements.has(currentHoverElement)) {
      currentHoverElement.classList.remove('any2md-hover');
    }
    
    // 如果是有效元素且不是已选中元素，添加悬停样式
    if (isValidElement(target) && !selectedElements.has(target)) {
      target.classList.add('any2md-hover');
      currentHoverElement = target;
    } else {
      currentHoverElement = null;
    }
  }
  
  function outHandler(e) {
    const target = e.target;
    
    // 如果离开的是当前悬停元素且不是已选中元素，移除悬停样式
    if (target === currentHoverElement && !selectedElements.has(target)) {
      target.classList.remove('any2md-hover');
      currentHoverElement = null;
    }
  }
  
  function clickHandler(e) {
    const target = e.target;
    
    // 忽略控制面板内的点击
    if (target.closest('#any2md-region-selector-container')) return;
    
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 只处理有效元素
    if (!isValidElement(target)) return;
    
    // 切换元素的选择状态
    if (selectedElements.has(target)) {
      // 取消选择
      target.classList.remove('any2md-selected');
      selectedElements.delete(target);
      
      // 如果鼠标仍在该元素上，添加悬停样式
      if (target === currentHoverElement) {
        target.classList.add('any2md-hover');
      }
    } else {
      // 选择元素
      target.classList.add('any2md-selected');
      target.classList.remove('any2md-hover');
      selectedElements.add(target);
    }
    
    // 更新计数
    updateSelectedCount(ui);
  }

  // 创建UI和样式
  addStyles();
  const ui = createSelectorUI();
  
  // 添加事件监听器
  document.addEventListener('mouseover', hoverHandler);
  document.addEventListener('mouseout', outHandler);
  document.addEventListener('click', clickHandler);
  
  // 处理取消按钮点击
  ui.cancelButton.addEventListener('click', () => {
    cleanup();
  });
  
  // 处理转换按钮点击
  ui.convertButton.addEventListener('click', () => {
    const selectedHTML = collectSelectedHTML();
    if (!selectedHTML) {
      alert('请至少选择一个区域');
      return;
    }
    
    // 发送消息给扩展后台
    chrome.runtime.sendMessage({
      action: 'convertSelectedRegions',
      html: `<div class="any2md-selected-regions">${selectedHTML}</div>`,
      title: document.title
    });
    
    // 清理并显示成功消息
    cleanup();
    
    // 创建临时通知
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #27ae60;
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 2147483647;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
      max-width: 280px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;
    notification.textContent = '已发送选中区域进行转换，Markdown文件将很快下载';
    document.body.appendChild(notification);
    
    // 3秒后移除通知
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  });
})(); 
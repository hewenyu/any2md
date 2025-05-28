// 获取当前页面的完整HTML内容
(() => {
  try {
    // 获取文档标题
    const title = document.title;
    
    // 获取HTML内容
    const html = document.documentElement.outerHTML;
    
    // 检查是否存在内容
    if (!html || html.trim() === '') {
      console.error('页面HTML内容为空');
      return null;
    }
    
    // 日志记录
    console.log(`获取页面HTML成功: 标题="${title}", 大小=${(html.length / 1024).toFixed(2)}KB`);
    
    return html;
  } catch (error) {
    console.error('获取页面HTML时出错:', error.message);
    return null;
  }
})(); 
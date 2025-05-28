// 获取当前页面的完整HTML内容
(() => {
  try {
    return document.documentElement.outerHTML;
  } catch (error) {
    console.error('获取页面HTML时出错:', error);
    return null;
  }
})(); 
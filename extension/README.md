# 网页转Markdown浏览器插件

这个浏览器插件允许用户将当前网页内容转换为Markdown格式，并下载保存到本地。

## 功能

- 一键获取当前网页内容
- 自动将HTML转换为Markdown格式
- 自动下载转换后的Markdown文件
- 清晰的界面反馈和错误处理

## 安装方法

### Chrome浏览器

1. 打开Chrome扩展管理页面: `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击左上角的"加载已解压的扩展程序"
4. 选择本项目的`extension`文件夹
5. 扩展将被安装到Chrome浏览器中

### Firefox浏览器

1. 打开Firefox扩展管理页面: `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择本项目的`extension/manifest.json`文件
4. 扩展将被临时安装到Firefox浏览器中

## 使用方法

1. 打开任意网页
2. 点击浏览器工具栏中的插件图标
3. 在弹出的窗口中点击"转换当前网页"按钮
4. 等待转换完成后，Markdown文件将自动下载

## 开发说明

本插件使用Manifest V3开发，主要包含以下文件：

- `manifest.json` - 插件配置文件
- `popup.html` - 弹出窗口HTML
- `popup.js` - 弹出窗口JS逻辑
- `service-worker.js` - 后台服务工作者
- `scripts/getPageHTML.js` - 注入页面获取HTML的脚本

## 隐私声明

本插件仅在用户点击转换按钮时获取当前网页内容，不会收集或存储任何用户数据。所有处理均在用户浏览器内或通过安全的API调用完成。 
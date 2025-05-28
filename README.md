# Any2MD - 网页转Markdown工具

一个浏览器扩展，用于将任意网页内容转换为Markdown格式并下载。

## 项目架构

本项目采用浏览器扩展 + Cloudflare Worker 的架构：

- **浏览器扩展**：获取页面HTML内容，发送到Worker进行转换，下载转换后的Markdown文件
- **Cloudflare Worker**：接收HTML内容，使用html-to-md库转换为Markdown，返回转换结果

这种架构避免了跨域和权限问题，支持转换任何可访问的网页内容。

## 主要功能

- ✅ **一键转换整页**：将整个网页转换为Markdown格式并下载
- ✅ **选择性转换**：支持右键菜单，可以只转换选中的文本
- ✅ **区域选择模式**：通过可视化界面选择网页的特定区域进行转换
- ✅ **适配各类网站**：处理各种不同结构的网页，保留主要内容和格式

## 安装方法

### 开发版本安装（推荐开发者使用）

1. 克隆本仓库到本地：
   ```
   git clone https://github.com/hewenyu/any2md.git
   cd any2md
   ```

2. 在Chrome浏览器中打开扩展管理页面：
   - 访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择仓库中的`extension`文件夹

### 发布版本安装（推荐普通用户使用）

1. 从[Releases页面](https://github.com/hewenyu/any2md/releases)下载最新版本的`.zip`文件
2. 解压到本地文件夹
3. 按照上述开发版本安装的步骤2进行安装

## 使用方法

### 基本用法

1. 在想要转换的网页上点击浏览器工具栏中的Any2MD图标
2. 在弹出的界面中点击"转换"按钮
3. 稍等片刻，Markdown文件将自动下载到您的计算机上

### 右键菜单操作

- **转换整个页面**：在页面空白处右键，选择"将整个页面转换为Markdown"
- **转换选中文本**：选中文本后右键，选择"将选定文本转换为Markdown"
- **选择页面区域**：在页面空白处右键，选择"选择页面区域进行转换"

### 区域选择模式

1. 在右键菜单中选择"选择页面区域进行转换"
2. 鼠标悬停在页面元素上会显示蓝色高亮
3. 点击要选择的区域，元素会变为绿色并显示勾选标记
4. 可以选择多个区域
5. 点击右上角控制面板中的"转换选中区域"按钮
6. Markdown文件将包含所有选中区域的内容

## 开发信息

### 项目结构

- `/extension`: 浏览器扩展源代码
  - `manifest.json`: 扩展配置文件
  - `popup.html` & `popup.js`: 弹出界面
  - `service-worker.js`: 后台服务工作线程
  - `scripts/`: 注入脚本
  - `images/`: 图标资源
- `/markdown-worker`: Cloudflare Worker源代码
  - `src/index.ts`: Worker主代码
  - `wrangler.toml`: Worker配置文件
- `/doc`: 项目文档

### 本地开发

1. 克隆仓库后，按照上述安装方法加载扩展
2. 修改代码后刷新扩展：
   - 在`chrome://extensions/`页面点击扩展的刷新图标
   - 或者使用Chrome扩展开发工具的热重载功能

### 贡献指南

欢迎提交Pull Request或Issue。在提交PR前请确保：

1. 代码风格一致
2. 所有功能正常工作
3. 添加了必要的注释和文档

## 许可证

[MIT License](LICENSE)

## 未来规划

- 国际化支持(i18n)
- 扩展选项页面
- 支持自定义Worker URL
- 更多Markdown转换选项
- 扩展到其他浏览器(Firefox, Edge等)



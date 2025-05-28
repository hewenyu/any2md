# 项目总览

本项目旨在开发一个浏览器插件和一个配套的 Cloudflare Worker 服务，允许用户将当前浏览的网页内容转换为 Markdown 格式并保存到本地。

## 项目目标

*   **便捷的内容转换**：用户可以通过浏览器插件一键将网页内容转换为 Markdown。
*   **客户端获取内容，服务端转换**：浏览器插件负责获取当前页面的 HTML 内容，Cloudflare Worker 服务负责将这些 HTML 转换为 Markdown，减轻服务端内容获取的复杂性（如CORS、登录态）。
*   **本地保存**：转换后的 Markdown 内容可以直接下载到用户本地。
*   **轻量高效**：Cloudflare Worker 提供了轻量级的无服务器运行环境，插件端力求简洁易用。

## 主要功能

*   **浏览器插件**：
    *   获取当前激活标签页的完整 HTML 内容。
    *   向 Cloudflare Worker 服务发送包含 HTML 内容的转换请求。
    *   接收转换后的 Markdown 内容。
    *   触发文件下载，将 Markdown 保存到本地。
*   **Cloudflare Worker 服务**：
    *   接收插件发送的 HTML 字符串内容。
    *   将 HTML 内容转换为 Markdown 格式。
    *   将转换后的 Markdown 内容返回给插件。

## 技术栈（初步设想）

*   **浏览器插件**：
    *   Manifest V3
    *   JavaScript / TypeScript
    *   Web APIs (tabs, downloads, fetch, scripting)
*   **Cloudflare Worker 服务**：
    *   JavaScript / TypeScript (Hono 框架)
    *   Cloudflare Workers API
    *   Markdown 转换库 (如 `turndown`)

## 文档结构

*   [架构设计 (`ARCHITECTURE.md`)](ARCHITECTURE.md)：描述系统的整体架构和组件交互。
*   [Server 端开发与部署 (`SERVER_SETUP.md`)](SERVER_SETUP.md)：Cloudflare Worker 的开发、配置和部署指南。
*   [插件开发 (`EXTENSION_DEVELOPMENT.md`)](EXTENSION_DEVELOPMENT.md)：浏览器插件的开发流程和关键点。
*   [API 参考 (`API_REFERENCE.md`)](API_REFERENCE.md)：Server API 的接口定义和说明。
*   [开发任务列表 (`TODO.md`)](TODO.md)：详细的开发任务和步骤。 
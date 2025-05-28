# 项目总览

本项目旨在开发一个浏览器插件和一个配套的 Cloudflare Worker 服务，允许用户将当前浏览的网页内容转换为 Markdown 格式并保存到本地。

## 项目目标

*   **便捷的内容转换**：用户可以通过浏览器插件一键将网页内容转换为 Markdown。
*   **服务端处理**：利用 Cloudflare Worker 在服务端进行网页内容的提取和 Markdown 转换，减轻客户端负担。
*   **本地保存**：转换后的 Markdown 内容可以直接下载到用户本地。
*   **轻量高效**：Cloudflare Worker 提供了轻量级的无服务器运行环境，插件端力求简洁易用。

## 主要功能

*   **浏览器插件**：
    *   获取当前激活标签页的 URL。
    *   向 Cloudflare Worker 服务发送转换请求。
    *   接收转换后的 Markdown 内容。
    *   触发文件下载，将 Markdown 保存到本地。
*   **Cloudflare Worker 服务**：
    *   接收插件发送的网页 URL。
    *   获取指定 URL 的网页 HTML 内容。
    *   将 HTML 内容转换为 Markdown 格式。
    *   将转换后的 Markdown 内容返回给插件。

## 技术栈（初步设想）

*   **浏览器插件**：
    *   Manifest V3
    *   JavaScript / TypeScript
    *   Web APIs (tabs, downloads, fetch)
*   **Cloudflare Worker 服务**：
    *   JavaScript / TypeScript
    *   Cloudflare Workers API
    *   HTML 解析库 (如 `cheerio` - 如果 Worker 环境支持或有轻量级替代品)
    *   Markdown 转换库 (如 `turndown` 或其兼容版本)

## 文档结构

*   [架构设计 (`ARCHITECTURE.md`)](ARCHITECTURE.md)：描述系统的整体架构和组件交互。
*   [Server 端开发与部署 (`SERVER_SETUP.md`)](SERVER_SETUP.md)：Cloudflare Worker 的开发、配置和部署指南。
*   [插件开发 (`EXTENSION_DEVELOPMENT.md`)](EXTENSION_DEVELOPMENT.md)：浏览器插件的开发流程和关键点。
*   [API 参考 (`API_REFERENCE.md`)](API_REFERENCE.md)：Server API 的接口定义和说明。 
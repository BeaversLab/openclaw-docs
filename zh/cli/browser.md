---
summary: "CLI 参考文档 `openclaw browser`（配置文件、标签页、操作、Chrome MCP 和 CDP）"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制服务器并运行浏览器操作（标签页、快照、截图、导航、点击、输入）。

相关内容：

- 浏览器工具 + API：[Browser 工具](/zh/tools/browser)

## 通用标志

- `--url <gatewayWsUrl>`：Gateway(网关) WebSocket URL（默认为配置）。
- `--token <token>`：Gateway(网关) 令牌（如果需要）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--browser-profile <name>`：选择浏览器配置文件（默认来自配置）。
- `--json`：机器可读输出（在支持的情况下）。

## 快速开始（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## 配置文件

配置文件是命名的浏览器路由配置。实际上：

- `openclaw`：启动或连接到专用的 OpenClaw 管理的 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制您现有的已登录 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程 CDP 端点。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser delete-profile --name work
```

使用特定的配置文件：

```bash
openclaw browser --browser-profile work tabs
```

## 标签页

```bash
openclaw browser tabs
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## 快照 / 截图 / 操作

快照：

```bash
openclaw browser snapshot
```

截图：

```bash
openclaw browser screenshot
```

导航/点击/输入（基于参考的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## 通过 MCP 连接现有的 Chrome

使用内置的 `user` 配置文件，或创建您自己的 `existing-session` 配置文件：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路径仅限主机使用。对于 Docker、无头服务器、Browserless 或其他远程设置，请改用 CDP 配置文件。

## 远程浏览器控制（节点主机代理）

如果 Gateway(网关) 运行在与浏览器不同的机器上，请在装有 Chrome/Brave/Edge/Chromium 的机器上运行**节点主机**。Gateway(网关) 将把浏览器操作代理到该节点（无需单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 控制自动路由，如果连接了多个节点，则使用 `gateway.nodes.browser.node` 固定特定节点。

安全与远程设置：[Browser 工具](/zh/tools/browser)、[Remote access](/zh/gateway/remote)、[Tailscale](/zh/gateway/tailscale)、[Security](/zh/gateway/security)

import zh from "/components/footer/zh.mdx";

<zh />

---
summary: "`openclaw browser` 的 CLI 参考（配置文件、标签页、操作、扩展中继）"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to use the Chrome extension relay (attach/detach via toolbar button)
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制服务器并运行浏览器操作（标签页、快照、截图、导航、点击、输入）。

相关内容：

- 浏览器工具 + API：[Browser 工具](/zh/tools/browser)
- Chrome 扩展程序中继：[Chrome extension](/zh/tools/chrome-extension)

## 通用标志

- `--url <gatewayWsUrl>`：Gateway 网关 WebSocket URL（默认为配置值）。
- `--token <token>`：Gateway 网关 令牌（如果需要）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--browser-profile <name>`：选择浏览器配置文件（默认来自配置）。
- `--json`：机器可读输出（在支持的地方）。

## 快速入门（本地）

```bash
openclaw browser --browser-profile chrome tabs
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## 配置文件

配置文件是命名了的浏览器路由配置。实际上：

- `openclaw`：启动/连接到由 OpenClaw 管理的专用 Chrome 实例（隔离的用户数据目录）。
- `chrome`：通过 Chrome 扩展中继控制您现有的 Chrome 标签页。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser delete-profile --name work
```

使用特定配置文件：

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

导航/点击/输入（基于引用的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome 扩展程序中继（通过工具栏按钮附加）

此模式允许代理控制您手动附加的现有 Chrome 标签页（它不会自动附加）。

将解压的扩展程序安装到稳定路径：

```bash
openclaw browser extension install
openclaw browser extension path
```

然后 Chrome → `chrome://extensions` → 启用“开发者模式” → “加载已解压的扩展程序” → 选择打印的文件夹。

完整指南：[Chrome extension](/zh/tools/chrome-extension)

## 远程浏览器控制（节点主机代理）

如果 Gateway 网关 在与浏览器不同的机器上运行，请在装有 Chrome/Brave/Edge/Chromium 的机器上运行 **节点主机**。Gateway 网关 会将浏览器操作代理到该节点（无需单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 控制自动路由，如果连接了多个节点，使用 `gateway.nodes.browser.node` 固定特定节点。

安全性 + 远程设置：[Browser 工具](/zh/tools/browser)、[Remote access](/zh/gateway/remote)、[Tailscale](/zh/gateway/tailscale)、[Security](/zh/gateway/security)

import zh from '/components/footer/zh.mdx';

<zh />

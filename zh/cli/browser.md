---
summary: "`openclaw browser` 的 CLI 参考（profiles、tabs、actions、扩展中继）"
read_when:
  - 你在使用 `openclaw browser` 并需要常见任务示例
  - 你想通过 node host 控制另一台机器上的浏览器
  - 你想使用 Chrome 扩展中继（通过工具栏按钮 attach/detach）
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制服务，并执行浏览器动作（tabs、snapshot、screenshot、导航、点击、输入）。

相关：

- Browser 工具 + API：[Browser tool](/zh/tools/browser)
- Chrome 扩展中继：[Chrome 扩展](/zh/tools/chrome-extension)

## 常用参数

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（默认读取配置）。
- `--token <token>`：Gateway token（如需）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--browser-profile <name>`：选择浏览器 profile（默认取配置）。
- `--json`：机器可读输出（如支持）。

## 快速开始（本地）

```bash
openclaw browser --browser-profile chrome tabs
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## Profiles

Profiles 是命名的浏览器路由配置。通常：

- `openclaw`：启动/连接一个由 OpenClaw 管理的专用 Chrome 实例（隔离用户数据目录）。
- `chrome`：通过 Chrome 扩展中继控制你现有的 Chrome tab。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser delete-profile --name work
```

使用指定 profile：

```bash
openclaw browser --browser-profile work tabs
```

## Tabs

```bash
openclaw browser tabs
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## Snapshot / screenshot / actions

Snapshot：

```bash
openclaw browser snapshot
```

Screenshot：

```bash
openclaw browser screenshot
```

导航/点击/输入（基于 ref 的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## Chrome 扩展中继（工具栏按钮 attach）

该模式允许 agent 控制你手动 attach 的现有 Chrome tab（不会自动 attach）。

安装解压扩展到稳定路径：

```bash
openclaw browser extension install
openclaw browser extension path
```

然后在 Chrome 中打开 `chrome://extensions` → 启用 “Developer mode” → “Load unpacked” → 选择输出的目录。

完整指南：[Chrome 扩展](/zh/tools/chrome-extension)

## 远程浏览器控制（node host 代理）

如果 Gateway 与浏览器不在同一台机器上，请在有 Chrome/Brave/Edge/Chromium 的机器上运行 **node host**。Gateway 会将浏览器动作代理到该 node（无需单独启动浏览器控制服务）。

使用 `gateway.nodes.browser.mode` 控制自动路由，并用 `gateway.nodes.browser.node` 在有多个 node 时指定某个 node。

安全与远程设置： [Browser tool](/zh/tools/browser)、[远程访问](/zh/gateway/remote)、[Tailscale](/zh/gateway/tailscale)、[安全](/zh/gateway/security)

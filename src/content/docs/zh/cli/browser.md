---
summary: "CLI 参考文档，用于 `openclaw browser`（生命周期、配置文件、标签页、操作、状态和调试）"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "Browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制界面并运行浏览器操作（生命周期、配置文件、标签页、快照、截图、导航、输入、状态模拟和调试）。

相关内容：

- 浏览器工具 + API：[Browser 工具](API/en/tools/browser)

## 通用标志

- `--url <gatewayWsUrl>`：Gateway(网关) WebSocket URL（默认来自配置）。
- `--token <token>`：Gateway(网关) 令牌（如果需要）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--expect-final`：等待最终的 Gateway(网关) 响应。
- `--browser-profile <name>`：选择浏览器配置文件（默认来自配置）。
- `--json`：机器可读的输出（在支持的情况下）。

## 快速开始（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

代理可以使用 `browser({ action: "doctor" })` 运行相同的就绪检查。

## 快速故障排除

如果 `start` 失败并显示 `not reachable after start`，请先对 CDP 就绪情况进行故障排除。如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失败，则浏览器控制平面运行正常，故障通常由导航 SSRF 策略导致。

最小序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

详细指南：[Browser 故障排除](/zh/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## 生命周期

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

注意：

- `doctor --deep` 添加了一个实时快照探针。当基本的 CDP 就绪状态正常，但您需要证明可以检查当前标签页时，这非常有用。
- 对于 `attachOnly` 和远程 CDP 配置文件，`openclaw browser stop` 会关闭活动的控制会话并清除临时模拟覆盖，即使 OpenClaw 本身未启动浏览器进程也是如此。
- 对于本地托管配置文件，`openclaw browser stop` 会停止派生的浏览器进程。
- `openclaw browser start --headless` 仅适用于该启动请求，且仅当 OpenClaw 启动本地托管浏览器时适用。它不会重写 `browser.headless` 或配置文件配置，对于已在运行的浏览器，它是一个空操作。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，除非 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless=false` 或 `browser.profiles.<name>.headless=false` 明确请求可见浏览器，否则本地托管配置文件会自动以无头模式运行。

## 如果命令丢失

如果 `openclaw browser` 是未知命令，请检查 `~/.openclaw/openclaw.json` 中的 `plugins.allow`。

当存在 `plugins.allow` 时，请显式列出捆绑的浏览器插件，除非配置已有根 `browser` 块：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根 `browser` 块，例如 `browser.enabled=true` 或
`browser.profiles.<name>`，也会在限制性插件允许列表下激活捆绑的浏览器插件。

相关：[Browser 工具](/zh/tools/browser#missing-browser-command-or-tool)

## 配置文件

配置文件是命名的浏览器路由配置。实际上：

- `openclaw`：启动或附加到专用的 OpenClaw 管理的 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制您现有的已登录 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程 CDP 端点。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

使用特定配置文件：

```bash
openclaw browser --browser-profile work tabs
```

## 标签页

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` 首先返回 `suggestedTargetId`，然后是稳定的 `tabId`，如 `t1`、
可选的标签以及原始 `targetId`。代理应将
`suggestedTargetId` 传回 `focus`、`close`、快照和操作中。您可以使用
`open --label`、`tab new --label` 或 `tab label` 分配标签；
标签、标签 ID、原始目标 ID 和唯一目标 ID 前缀均可被接受。
为了兼容性，请求字段仍命名为 `targetId`，但它接受
这些标签引用。请将原始目标 ID 视为诊断句柄，而非持久的
代理记忆。
当 Chromium 在导航或表单提交期间替换底层的原始目标时，
只要能证明匹配，OpenClaw 会将稳定的 `tabId`/标签
附加到替换后的标签上。原始目标 ID 仍然易变；请首选
`suggestedTargetId`。

## 快照 / 截图 / 操作

快照：

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

截图：

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

注：

- `--full-page` 仅用于页面捕获；它不能与 `--ref`
  或 `--element` 组合使用。
- `existing-session` / `user` 配置文件支持页面截图和来自快照输出的 `--ref`
  截图，但不支持 CSS `--element` 截图。
- `--labels` 将当前的快照引用叠加在截图上。
- `snapshot --urls` 将发现的链接目标附加到 AI 快照中，以便
  代理可以选择直接的导航目标，而不仅仅是从链接
  文本中进行猜测。

导航/点击/输入（基于引用的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
```

当页面端函数可能需要的时间
长于默认评估超时时间时，请使用 `evaluate --timeout-ms <ms>`。

当 OpenClaw 能够证明替换标签页时，操作响应会在操作触发的页面替换后返回当前原始的 `targetId`OpenClaw。脚本仍应存储并传递 `suggestedTargetId`/标签，以用于长期工作流。

文件 + 对话框辅助工具：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser upload media://inbound/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
```

托管的 Chrome 配置文件会将普通点击触发的下载保存到 OpenClaw 下载目录中（默认为 OpenClaw`/tmp/openclaw/downloads`，或配置的临时根目录）。当代理需要等待特定文件并返回其路径时，请使用 `waitfordownload` 或 `download`OpenClawOpenClaw；这些显式的等待器拥有下一个下载。上传接受来自 OpenClaw 临时上传根目录和 OpenClaw 托管的入站媒体的文件，包括 `media://inbound/<id>` 和沙箱相对 `media/inbound/<id>` 引用。嵌套的媒体引用、遍历和任意本地路径仍将被拒绝。
当操作打开模态对话框时，操作响应返回带有 `browserState.dialogs.pending` 的 `blockedByDialog`；传递 `--dialog-id`OpenClaw 以直接回答它。在 OpenClaw 外部处理的对话框显示在 `browserState.dialogs.recent` 下。

## 状态和存储

视口 + 模拟：

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookies + 存储：

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## 调试

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

## 通过 MCP 连接现有 Chrome

使用内置的 `user` 配置文件，或创建您自己的 `existing-session` 配置文件：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路径仅限主机。对于 Docker、无头服务器、Browserless 或其他远程设置，请改用 CDP 配置文件。

当前现有会话的限制：

- 快照驱动的操作使用引用，而不是 CSS 选择器
- 当调用者省略 `timeoutMs` 时，`browser.actionTimeoutMs` 默认将支持的 `act` 请求设置为 60000 毫秒；每次调用指定的 `timeoutMs` 仍然优先。
- `click` 仅支持左键单击
- `type` 不支持 `slowly=true`
- `press` 不支持 `delayMs`
- `hover`、`scrollintoview`、`drag`、`select`、`fill` 和 `evaluate` 拒绝
  每次调用的超时覆盖
- `select` 仅支持一个值
- 不支持 `wait --load networkidle`
- 文件上传需要 `--ref` / `--input-ref`，不支持 CSS
  `--element`，并且目前一次只支持一个文件
- 对话框挂钩不支持 `--timeout`
- 截图支持页面捕获和 `--ref`，但不支持 CSS `--element`
- `responsebody`、下载拦截、PDF 导出和批量操作仍然
  需要托管浏览器或原始 CDP 配置文件

## 远程浏览器控制（节点主机代理）

如果 Gateway(网关) 与浏览器运行在不同的机器上，请在安装了 Chrome/Brave/Edge/Chromium 的机器上运行 **node host**。Gateway(网关) 将把浏览器操作代理到该节点（不需要单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 来控制自动路由，并在连接了多个节点时使用 `gateway.nodes.browser.node` 固定特定节点。

安全性 + 远程设置：[Browser 工具](/zh/tools/browser)、[远程访问](/zh/gateway/remoteTailscale)、[Tailscale](/zh/gateway/tailscale)、[安全性](/zh/gateway/security)

## 相关

- [CLI 参考](CLI/en/cli)
- [浏览器](/zh/tools/browser)

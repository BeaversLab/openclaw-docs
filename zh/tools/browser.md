---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - 添加由代理控制的浏览器自动化
  - 调试 openclaw 干扰您自己的 Chrome 的原因
  - 在 macOS 应用中实现浏览器设置 + 生命周期
title: "Browser (OpenClaw-managed)"
---

# Browser (openclaw-managed)

OpenClaw 可以运行一个由代理控制的**专用 Chrome/Brave/Edge/Chromium 配置文件**。
它与您的个人浏览器隔离，并通过 Gateway(网关) 内部的一个小型本地控制服务进行管理（仅限本地回环）。

初学者视图：

- 可以将其视为一个**独立的、仅限代理使用的浏览器**。
- `openclaw` 配置文件**不会**触及您的个人浏览器配置文件。
- 代理可以在安全通道中**打开标签页、阅读页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到您真实的已登录 Chrome 会话。

## 您将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认为橙色高亮）。
- 确定性标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖动/选择）、快照、屏幕截图、PDF。
- 可选的多配置文件支持（`openclaw`、`work`、`remote` 等）。

此浏览器**不是**您的日常主力浏览器。它是用于代理自动化和验证的安全、隔离的界面。

## 快速开始

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您看到“Browser disabled”（浏览器已禁用），请在配置中启用它（见下文）并重启 Gateway(网关)。

## Profiles: `openclaw` vs `user`

- `openclaw`：受管理的、隔离的浏览器（无需扩展）。
- `user`：用于您**真实已登录 Chrome** 会话的内置 Chrome MCP 附加配置文件。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有的已登录会话很重要且用户在计算机旁点击/批准任何附加提示时，首选 `profile="user"`。
- `profile` 是当您需要特定浏览器模式时的显式覆盖。

如果您希望默认使用受管理模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置位于 `~/.openclaw/openclaw.json` 中。

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    remoteCdpTimeoutMs: 1500, // remote CDP HTTP timeout (ms)
    remoteCdpHandshakeTimeoutMs: 3000, // remote CDP WebSocket handshake timeout (ms)
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      user: {
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

注意：

- 浏览器控制服务绑定到从 `gateway.port` 派生的端口上的环回地址
  （默认值：`18791`，即 gateway + 2）。
- 如果您覆盖 Gateway(网关) 端口（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），
  派生的浏览器端口将发生偏移以保持在同一“系列”中。
- 如果未设置 `cdpUrl`，则默认为托管本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程（非环回）CDP 可达性检查。
- `remoteCdpHandshakeTimeoutMs` 适用于远程 CDP WebSocket 可达性检查。
- 浏览器导航/打开选项卡在导航前会受到 SSRF 防护，并在导航后在最终的 `http(s)` URL 上进行尽力重新检查。
- 在严格 SSRF 模式下，也会检查远程 CDP 端点发现/探测（`cdpUrl`，包括 `/json/version` 查找）。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认为 `true`（可信网络模型）。将其设置为 `false` 以进行严格的仅公开浏览。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为兼容性的遗留别名仍受支持。
- `attachOnly: true` 表示“从不启动本地浏览器；仅在已运行时连接”。
- `color` + 每个配置文件的 `color` 会对浏览器 UI 进行着色，以便您可以看到哪个配置文件处于活动状态。
- 默认配置文件是 `openclaw`（OpenClaw 托管的独立浏览器）。使用 `defaultProfile: "user"` 以选择加入已登录用户浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则为系统默认浏览器；否则为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl` —— 仅针对远程 CDP 设置这些。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而不是原始 CDP。请
  不要为该驱动程序设置 `cdpUrl`。
- 当现有会话配置文件应连接到非默认 Chromium 用户配置文件（例如 Brave 或 Edge）时，
  设置 `browser.profiles.<name>.userDataDir`。

## 使用 Brave（或其他基于 Chromium 的浏览器）

如果您的**系统默认**浏览器是基于 Chromium 的（Chrome/Brave/Edge 等），
OpenClaw 会自动使用它。设置 `browser.executablePath` 以覆盖
自动检测：

CLI 示例：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## 本地与远程控制

- **本地控制（默认）：** Gateway(网关) 启动环回控制服务，并可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；Gateway(网关) 将浏览器操作代理到该主机。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl` （或 `browser.cdpUrl`）以附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。

远程 CDP URL 可以包含身份验证：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP Basic 身份验证（例如 `https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点以及连接到 CDP WebSocket 时会保留身份验证。对于令牌，建议使用环境变量或机密管理器，而不是将其提交到配置文件中。

## 节点浏览器代理（零配置默认值）

如果您在拥有浏览器的计算机上运行 **节点主机**，OpenClaw 可以在无需任何额外浏览器配置的情况下，自动将浏览器工具调用路由到该节点。这是远程网关的默认路径。

注意：

- 节点主机通过 **代理命令** 公开其本地浏览器控制服务器。
- 配置文件来自节点自己的 `browser.profiles` 配置（与本地相同）。
- 如果您不希望使用此功能，可以将其禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管的远程 CDP）

[Browserless](https://browserless.io) 是一项托管的 Chromium 服务，通过 HTTPS 公开 CDP 端点。您可以将 OpenClaw 浏览器配置文件指向 Browserless 区域端点，并使用您的 API 密钥进行身份验证。

示例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

注意：

- 将 `<BROWSERLESS_API_KEY>` 替换为您真实的 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（请参阅其文档）。

## 直接 WebSocket CDP 提供商

某些托管的浏览器服务公开 **直接 WebSocket** 端点，而不是标准的基于 HTTP 的 CDP 发现（`/json/version`）。OpenClaw 支持这两种方式：

- **HTTP(S) 端点**（例如 Browserless）— OpenClaw 调用 `/json/version` 来发现 WebSocket 调试器 URL，然后进行连接。
- **WebSocket 端点** (`ws://` / `wss://`) — OpenClaw 直接连接，跳过 `/json/version`。将此用于 [Browserbase](https://www.browserbase.com) 或任何为您提供 WebSocket URL 的提供商。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行无头浏览器的云平台，具有内置的 CAPTCHA 解决、隐身模式和住宅代理。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

备注：

- [注册](https://www.browserbase.com/sign-up) 并从 [概览仪表板](https://www.browserbase.com/overview) 复制您的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为您真实的 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话。
- 免费层允许每月一个并发会话和一个浏览器小时。有关付费计划的限制，请参阅 [定价](https://www.browserbase.com/pricing)。
- 请参阅 [Browserbase 文档](https://docs.browserbase.com) 以获取完整的 API 参考、SDK 指南和集成示例。

## 安全性

关键要点：

- 浏览器控制仅限本地回环；访问通过 Gateway(网关) 的身份验证或节点配对进行。
- 如果启用了浏览器控制且未配置身份验证，OpenClaw 会在启动时自动生成 `gateway.auth.token` 并将其保存到配置中。
- 将 Gateway(网关) 和任何节点主机保持在专用网络 (Tailscale) 上；避免公开暴露。
- 将远程 CDP URL/令牌视为机密；优先使用 环境变量 或机密管理器。

远程 CDP 提示：

- 尽可能优先使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期令牌直接嵌入到配置文件中。

## 配置文件 (多浏览器)

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-managed**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录 + CDP 端口
- **remote**：一个显式的 CDP URL（在别处运行的基于 Chromium 的浏览器）
- **existing 会话**：通过 Chrome DevTools MCP 自动连接使用现有的 Chrome 配置文件

默认值：

- 如果缺少 `openclaw` 配置文件，则会自动创建。
- `user` 配置文件是内置的，用于附加 Chrome MCP 现有会话。
- 除了 `user` 之外，现有会话配置文件是可选加入的；使用 `--driver existing-session` 创建它们。
- 本地 CDP 端口默认从 **18800–18899** 分配。
- 删除配置文件会将其本地数据目录移动到废纸篓。

所有控制端点都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 连接到现有会话

OpenClaw 还可以通过官方 Chrome DevTools MCP 服务器连接到正在运行的基于 Chromium 的浏览器配置文件。这会重用该浏览器配置文件中已打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser 会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果您需要不同的名称、颜色或浏览器数据目录，请创建您自己的自定义现有会话配置文件。

默认行为：

- 内置的 `user` 配置文件使用 Chrome MCP 自动连接，它以默认本地 Google Chrome 配置文件为目标。

对于 Brave、Edge、Chromium 或非默认 Chrome 配置文件，请使用 `userDataDir`：

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
    },
  },
}
```

然后在匹配的浏览器中：

1. 打开该浏览器用于远程调试的检查页面。
2. 启用远程调试。
3. 保持浏览器运行，并在 OpenClaw 连接时批准连接提示。

常用检查页面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

实时连接冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功的状态如下：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出您已打开的浏览器标签页
- `snapshot` 从所选实时标签页返回引用

如果连接失败，请检查以下内容：

- 目标基于 Chromium 的浏览器版本为 `144+`
- 在该浏览器的检查页面中已启用远程调试
- 浏览器显示了连接许可提示且您已接受
- `openclaw doctor` 会迁移旧的基于扩展程序的浏览器配置，并检查默认自动连接配置文件是否在本地安装了 Chrome，但它无法为您启用浏览器端的远程调试

代理使用：

- 当您需要用户的已登录浏览器状态时，请使用 `profile="user"`。
- 如果您使用自定义现有会话配置文件，请传递该显式配置文件名称。
- 仅当用户在计算机前批准附加提示时，才选择此模式。
- Gateway(网关)或节点主机可以生成 `npx chrome-devtools-mcp@latest --autoConnect`

注意：

- 此路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在您已登录的浏览器会话中执行操作。
- OpenClaw 不会为此驱动程序启动浏览器；它仅附加到现有会话。
- OpenClaw 在此处使用官方 Chrome DevTools MCP `--autoConnect` 流程。如果设置了 `userDataDir`，OpenClaw 会将其传递以定位该特定的 Chromium 用户数据目录。
- 现有会话屏幕截图支持页面捕获和来自快照的 `--ref` 元素捕获，但不支持 CSS `--element` 选择器。
- 现有会话 `wait --url` 支持与其他浏览器驱动程序类似的精确、子串和 glob 模式。尚不支持 `wait --load networkidle`。
- 某些功能仍需要托管浏览器路径，例如 PDF 导出和下载拦截。
- 现有会话是主机本地的。如果 Chrome 位于不同的计算机或不同的网络命名空间上，请改用远程 CDP 或节点主机。

## 隔离保证

- **专用用户数据目录**：从不接触您的个人浏览器配置文件。
- **专用端口**：避免 `9222` 以防止与开发工作流发生冲突。
- **确定性选项卡控制**：通过 `targetId` 定位选项卡，而不是“最后一个选项卡”。

## 浏览器选择

在本地启动时，OpenClaw 会选择第一个可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 进行覆盖。

平台：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：检查常见安装位置。

## 控制 API（可选）

仅适用于本地集成，Gateway(网关) 提供了一个小型回环 HTTP API：

- 状态/启动/停止：`GET /`、`POST /start`、`POST /stop`
- 标签页：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`、`POST /screenshot`
- 操作：`POST /navigate`、`POST /act`
- 钩子：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 调试：`GET /console`、`POST /pdf`
- 调试：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 状态：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端点都接受 `?profile=<name>`。

如果配置了网关认证，浏览器 HTTP 路由也需要认证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码进行 HTTP Basic 认证

### Playwright 要求

某些功能（导航/操作/AI 快照/角色快照、元素截图、PDF）需要
Playwright。如果未安装 Playwright，这些端点将返回清晰的 501
错误。ARIA 快照和基本截图在 OpenClaw 管理的 Chrome 上仍然有效。

如果看到 `Playwright is not available in this gateway build`，请安装完整的
Playwright 软件包（而非 `playwright-core`）并重启网关，或重新安装
OpenClaw 并启用浏览器支持。

#### Docker Playwright 安装

如果您的 Gateway(网关) 在 Docker 中运行，请避免使用 `npx playwright`（npm 覆盖冲突）。
请改用捆绑的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载内容，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`），并确保 `/home/node` 通过
`OPENCLAW_HOME_VOLUME` 或绑定挂载进行持久化。请参阅 [Docker](/zh/install/docker)。

## 工作原理（内部）

高级流程：

- 一个小型的**控制服务器**接受 HTTP 请求。
- 它通过 **CDP** 连接到基于 Chromium 的浏览器（Chrome/Brave/Edge/Chromium）。
- 对于高级操作（点击/输入/快照/PDF），它在 CDP 之上使用 **Playwright**。
- 当缺少 Playwright 时，仅可使用非 Playwright 操作。

这种设计使代理保持在稳定、确定的接口上，同时允许
您交换本地/远程浏览器和配置文件。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 以定位特定配置文件。
所有命令还接受 `--json` 以获得机器可读的输出（稳定的有效负载）。

基础：

- `openclaw browser status`
- `openclaw browser start`
- `openclaw browser stop`
- `openclaw browser tabs`
- `openclaw browser tab`
- `openclaw browser tab new`
- `openclaw browser tab select 2`
- `openclaw browser tab close 2`
- `openclaw browser open https://example.com`
- `openclaw browser focus abcd1234`
- `openclaw browser close abcd1234`

检查：

- `openclaw browser screenshot`
- `openclaw browser screenshot --full-page`
- `openclaw browser screenshot --ref 12`
- `openclaw browser screenshot --ref e12`
- `openclaw browser snapshot`
- `openclaw browser snapshot --format aria --limit 200`
- `openclaw browser snapshot --interactive --compact --depth 6`
- `openclaw browser snapshot --efficient`
- `openclaw browser snapshot --labels`
- `openclaw browser snapshot --selector "#main" --interactive`
- `openclaw browser snapshot --frame "iframe#main" --interactive`
- `openclaw browser console --level error`
- `openclaw browser errors --clear`
- `openclaw browser requests --filter api --clear`
- `openclaw browser pdf`
- `openclaw browser responsebody "**/api" --max-chars 5000`

操作：

- `openclaw browser navigate https://example.com`
- `openclaw browser resize 1280 720`
- `openclaw browser click 12 --double`
- `openclaw browser click e12 --double`
- `openclaw browser type 23 "hello" --submit`
- `openclaw browser press Enter`
- `openclaw browser hover 44`
- `openclaw browser scrollintoview e12`
- `openclaw browser drag 10 11`
- `openclaw browser select 9 OptionA OptionB`
- `openclaw browser download e12 report.pdf`
- `openclaw browser waitfordownload report.pdf`
- `openclaw browser upload /tmp/openclaw/uploads/file.pdf`
- `openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `openclaw browser dialog --accept`
- `openclaw browser wait --text "Done"`
- `openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `openclaw browser evaluate --fn '(el) => el.textContent' --ref 7`
- `openclaw browser highlight e12`
- `openclaw browser trace start`
- `openclaw browser trace stop`

状态：

- `openclaw browser cookies`
- `openclaw browser cookies set session abc123 --url "https://example.com"`
- `openclaw browser cookies clear`
- `openclaw browser storage local get`
- `openclaw browser storage local set theme dark`
- `openclaw browser storage session clear`
- `openclaw browser set offline on`
- `openclaw browser set headers --headers-json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

备注：

- `upload` 和 `dialog` 是**预置**调用；请在触发选择器/对话框的点击/按下操作之前运行它们。
- 下载和跟踪输出路径被限制在 OpenClaw 临时根目录：
  - 跟踪：`/tmp/openclaw`（备用：`${os.tmpdir()}/openclaw`）
  - 下载：`/tmp/openclaw/downloads`（备用：`${os.tmpdir()}/openclaw/downloads`）
- 上传路径被限制在一个 OpenClaw 临时上传根目录：
  - 上传：`/tmp/openclaw/uploads`（备用：`${os.tmpdir()}/openclaw/uploads`）
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。
- `snapshot`：
  - `--format ai`（安装 Playwright 时的默认设置）：返回带有数字引用（`aria-ref="<n>"`）的 AI 快照。
  - `--format aria`：返回可访问性树（无引用；仅用于检查）。
  - `--efficient` (或 `--mode efficient`)：紧凑的角色快照预设（交互式 + 紧凑 + 深度 + 更低的 maxChars）。
  - 配置默认值（仅工具/CLI）：设置 `browser.snapshotDefaults.mode: "efficient"` 以便在调用方未传递模式时使用高效快照（参见 [Gateway(网关) 配置](/zh/gateway/configuration#browser-openclaw-managed-browser)）。
  - 角色快照选项（`--interactive`、`--compact`、`--depth`、`--selector`）强制使用基于角色的快照，并带有诸如 `ref=e12` 之类的引用。
  - `--frame "<iframe selector>"` 将角色快照范围限定在 iframe 内（与诸如 `e12` 之类的角色引用配合使用）。
  - `--interactive` 输出一个扁平的、易于选择的交互元素列表（最适合驱动操作）。
  - `--labels` 添加仅视口截图，并覆盖有引用标签（打印 `MEDIA:<path>`）。
- `click`/`type`/etc 需要 `ref` 中的 `snapshot`（可以是数字 `12` 或角色引用 `e12`）。
  操作有意不支持 CSS 选择器。

## 快照与引用

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字引用）**：`openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字引用的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在内部，引用通过 Playwright 的 `aria-ref` 解析。

- **角色快照（如 `e12` 的角色引用）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带有 `[ref=e12]`（以及可选 `[nth=1]`）的基于角色的列表/树。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在内部，ref 通过 `getByRole(...)` 解析（对于重复项，加上 `nth()`）。
  - 添加 `--labels` 以包含带有叠加 `e12` 标签的视口截图。

Ref 行为：

- Refs **在导航之间不稳定**；如果操作失败，请重新运行 `snapshot` 并使用新的 ref。
- 如果角色快照是使用 `--frame` 拍摄的，则角色 refs 的作用域限定为该 iframe，直到下一个角色快照。

## 等待增强功能

您可以等待的内容不仅仅是时间/文本：

- 等待 URL（支持 Playwright 的 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 谓词：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待选择器变为可见：
  - `openclaw browser wait "#main"`

这些可以组合使用：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 调试工作流

当操作失败时（例如“不可见”、“严格模式违规”、“被覆盖”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>` （在交互模式下优先使用角色 refs）
3. 如果仍然失败： `openclaw browser highlight <ref>` 以查看 Playwright 定位的目标
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 对于深度调试：记录跟踪：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop` （打印 `TRACE:<path>`）

## JSON 输出

`--json` 适用于脚本和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 加上一个小型的 `stats` 块（行/字符/refs/交互），以便工具可以推断负载大小和密度。

## 状态和环境控制

这些对于“让网站表现得像 X”的工作流很有用：

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Storage: `storage local|session get|set|clear`
- Offline: `set offline on|off`
- Headers: `set headers --headers-json '{"X-Debug":"1"}'` （旧版 `set headers --json '{"X-Debug":"1"}'` 仍然受支持）
- HTTP 基本身份验证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区 / 区域设置：`set timezone ...`，`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- openclaw 浏览器配置文件可能包含已登录的会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  在页面上下文中执行任意 JavaScript。提示注入可以操控
  此行为。如果不需要，请使用 `browser.evaluateEnabled=false` 将其禁用。
- 有关登录和反机器人说明（X/Twitter 等），请参阅 [浏览器登录 + X/Twitter 发帖](/zh/tools/browser-login)。
- 请将 Gateway(网关)/节点主机保持私密（仅限本地回环或 tailnet）。
- 远程 CDP 端点功能强大；请通过隧道传输并保护它们。

严格模式示例（默认阻止私有/内部目标）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // optional exact allow
    },
  },
}
```

## 故障排除

有关 Linux 特定问题（尤其是 snap Chromium），请参阅
[浏览器故障排除](/zh/tools/browser-linux-troubleshooting)。

有关 WSL2 Gateway(网关) + Windows Chrome 分离主机设置，请参阅
[WSL2 + Windows + 远程 Chrome CDP 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## 代理工具 + 控制工作原理

该代理获得 **一个工具** 用于浏览器自动化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 来点击/键入/拖动/选择。
- `browser screenshot` 捕获像素（整页或元素）。
- `browser` 接受：
  - `profile` 用于选择命名浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target` (`sandbox` | `host` | `node`) 用于选择浏览器的位置。
  - 在沙箱隔离会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱隔离会话默认为 `sandbox`，非沙箱会话默认为 `host`。
  - 如果连接了支持浏览器的节点，该工具可能会自动路由到该节点，除非您固定 `target="host"` 或 `target="node"`。

这确保了 Agent 的确定性，并避免了脆弱的选择器。

import en from "/components/footer/en.mdx";

<en />

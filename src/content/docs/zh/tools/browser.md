---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "浏览器 (OpenClaw 托管)"
---

# 浏览器（openclaw 托管）

OpenClaw 可以运行一个由代理控制的**专用 Chrome/Brave/Edge/Chromium 配置文件**。
它与您的个人浏览器隔离，并通过 Gateway(网关) 网关 内部的一个小型本地
控制服务进行管理（仅限回环）。

初学者视图：

- 您可以将其视为一个**独立的、仅限代理使用的浏览器**。
- `openclaw` 配置文件**不会**影响您的个人浏览器配置文件。
- 代理可以在安全通道中**打开标签页、阅读页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到您真实的已登录 Chrome 会话。

## 您将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认为橙色强调）。
- 确定性标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖动/选择）、快照、屏幕截图、PDF。
- 可选的多配置文件支持 (`openclaw`, `work`, `remote`, ...)。

此浏览器**不是**您的日常主力浏览器。它是一个用于代理自动化和验证的安全、隔离环境。

## 快速开始

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果看到“Browser disabled”，请在配置中启用它（见下文）并重启 Gateway(网关)。

如果 `openclaw browser` 完全丢失，或者代理表示浏览器工具不可用，请跳转到 [缺失浏览器命令或工具](/en/tools/browser#missing-browser-command-or-tool)。

## 插件控制

默认的 `browser` 工具现在是一个捆绑插件，默认情况下处于启用状态。这意味着您可以禁用或替换它，而无需移除 OpenClaw 插件系统的其余部分：

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

在安装另一个提供相同 `browser` 工具名称的插件之前，请禁用捆绑插件。默认的浏览器体验需要同时具备以下两者：

- `plugins.entries.browser.enabled` 未禁用
- `browser.enabled=true`

如果您仅关闭插件，捆绑的浏览器 CLI (`openclaw browser`)、网关方法 (`browser.request`)、代理工具和默认浏览器控制服务将同时消失。您的 `browser.*` 配置将保持完整，以供替换插件重用。

随附的浏览器插件现在还拥有浏览器运行时实现。核心仅保留共享的插件 SDK 助手以及针对旧版内部导入路径的兼容性重新导出。实际上，移除或替换浏览器插件包会移除浏览器功能集，而不是留下第二个核心拥有的运行时。

浏览器配置更改仍需要重启 Gateway(网关)，以便随附的插件可以使用新设置重新注册其浏览器服务。

## 缺少浏览器命令或工具

如果 `openclaw browser` 在升级后突然变为未知命令，或者代理报告浏览器工具丢失，最常见的原因是受限的 `plugins.allow` 列表未包含 `browser`。

损坏的配置示例：

```json5
{
  plugins: {
    allow: ["telegram"],
  },
}
```

通过将 `browser` 添加到插件允许列表来修复此问题：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

重要注意事项：

- 当设置了 `plugins.allow` 时，仅 `browser.enabled=true` 是不够的。
- 当设置了 `plugins.allow` 时，仅 `plugins.entries.browser.enabled=true` 也是不够的。
- `tools.alsoAllow: ["browser"]` **不会**加载捆绑的浏览器插件。它仅在插件加载后调整工具策略。
- 如果您不需要限制性的插件允许列表，移除 `plugins.allow` 也能恢复默认的内置浏览器行为。

典型症状：

- `openclaw browser` 是未知命令。
- `browser.request` 缺失。
- 代理报告浏览器工具不可用或缺失。

## 配置文件：`openclaw` vs `user`

- `openclaw`：受管理、隔离的浏览器（无需扩展）。
- `user`：用于您**真实登录的 Chrome** 会话的内置 Chrome MCP 附加配置文件。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有的已登录会话很重要且用户在计算机旁可以点击/批准任何附加提示时，首选 `profile="user"`。
- `profile` 是当您需要特定浏览器模式时的显式覆盖。

如果您希望默认使用受管理模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置位于 `~/.openclaw/openclaw.json` 中。

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
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

注：

- 浏览器控制服务绑定到从 `gateway.port` 派生的端口上的环回地址（默认：`18791`，即 Gateway 端口 + 2）。
- 如果您覆盖 Gateway(网关) 端口（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），派生的浏览器端口将移动以保持处于同一“系列”。
- 未设置时，`cdpUrl` 默认为受管理的本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程（非环回）CDP 可达性检查。
- `remoteCdpHandshakeTimeoutMs` 适用于远程 CDP WebSocket 可达性检查。
- 浏览器导航/打开选项卡在导航前受到 SSRF 保护，并在导航后的最终 `http(s)` URL 上进行尽力而为的重新检查。
- 在严格的 SSRF 模式下，远程 CDP 端点发现/探测（`cdpUrl`，包括 `/json/version` 查找）也会被检查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认处于禁用状态。仅当您有意信任专用网络浏览器访问时，才将其设置为 `true`。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为传统别名仍受支持以保持兼容性。
- `attachOnly: true` 意味着“永不启动本地浏览器；仅在其已在运行时附加”。
- `color` + 每个配置文件的 `color` 会对浏览器 UI 进行着色，以便您查看哪个配置文件处于活动状态。
- 默认配置文件为 `openclaw`（OpenClaw 托管的独立浏览器）。使用 `defaultProfile: "user"` 选择加入已登录用户的浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则为系统默认浏览器；否则为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl` — 仅针对远程 CDP 设置这些参数。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。请勿
  为该驱动程序设置 `cdpUrl`。
- 当现有会话配置文件应附加到非默认 Chromium 用户配置文件（例如 Brave 或 Edge）时，设置 `browser.profiles.<name>.userDataDir`。

## 使用 Brave（或其他基于 Chromium 的浏览器）

如果您的**系统默认**浏览器是基于 Chromium 的（Chrome/Brave/Edge/等），
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

## 本地控制与远程控制

- **本地控制（默认）：** Gateway(网关) 启动环回控制服务并可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；Gateway(网关) 将浏览器操作代理到该主机。
- **远程 CDP：**设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以
  附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。

停止行为因配置文件模式而异：

- 本地托管配置文件：`openclaw browser stop` 停止
  OpenClaw 启动的浏览器进程
- 仅附加和远程 CDP 配置文件：`openclaw browser stop` 关闭活动
  控制会话并释放 Playwright/CDP 模拟覆盖（视口、
  配色方案、区域设置、时区、离线模式和类似状态），即
  便 OpenClaw 未启动任何浏览器进程

远程 CDP URL 可以包含身份验证：

- 查询令牌（例如，`https://provider.example?token=<token>`）
- HTTP Basic 认证（例如，`https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点和连接
到 CDP WebSocket 时会保留认证信息。对于令牌，建议使用环境变量或密钥管理器，
而不是将其提交到配置文件中。

## 节点浏览器代理（零配置默认值）

如果在拥有浏览器的机器上运行 **节点主机**，OpenClaw 可以在没有任何额外浏览器配置的情况下自动将浏览器工具调用路由到该节点。这是远程网关的默认路径。

说明：

- 节点主机通过 **代理命令** 公开其本地浏览器控制服务器。
- 配置文件来自节点自己的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选的。将其留空以使用传统/默认行为：所有已配置的配置文件均可通过代理访问，包括配置文件的创建/删除路由。
- 如果您设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 会将其视为最低权限边界：仅允许定位白名单中的配置文件，并且持久化配置文件的创建/删除路由将在代理表面上被阻止。
- 如果不需要，请禁用它：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一项托管的 Chromium 服务，通过 HTTPS 和 WebSocket 公开 CDP 连接 URL。OpenClaw 可以使用其中任何一种形式，但对于远程浏览器配置文件，最简单的选择是来自 Browserless 连接文档的直接 WebSocket URL。

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
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

说明：

- 将 `<BROWSERLESS_API_KEY>` 替换为您真实的 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（请参阅其文档）。
- 如果 Browserless 为您提供了一个 HTTPS 基础 URL，您可以将其转换为
  `wss://` 以进行直接的 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw
  发现 `/json/version`。

## 直接 WebSocket CDP 提供商

某些托管浏览器服务公开的是 **直接 WebSocket** 端点，而不是
标准的基于 HTTP 的 CDP 发现 (`/json/version`)。OpenClaw 支持这两种方式：

- **HTTP(S) 端点** — OpenClaw 调用 `/json/version` 来发现
  WebSocket 调试器 URL，然后进行连接。
- **WebSocket 端点** (`ws://` / `wss://`) — OpenClaw 直接连接，
  跳过 `/json/version`。将此用于
  [Browserless](https://browserless.io)、
  [Browserbase](https://www.browserbase.com) 或任何向您提供
  WebSocket URL 的提供商。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行
无头浏览器的云平台，内置验证码求解、隐身模式和住宅
代理。

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

注意事项：

- [注册](https://www.browserbase.com/sign-up) 并从 [概览仪表板](https://www.browserbase.com/overview) 复制您的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为您真实的 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此
  不需要手动创建会话的步骤。
- 免费层允许每月一个并发会话和一个浏览器小时。
  有关付费计划的限制，请参阅 [定价](https://www.browserbase.com/pricing)。
- 有关完整的 API 参考、SDK 指南和集成示例，请参阅 [Browserbase 文档](https://docs.browserbase.com)。

## 安全性

主要概念：

- 浏览器控制仅限本地回环；访问通过 Gateway(网关) 的身份验证或节点配对进行。
- 独立的回环浏览器 HTTP API 仅使用**共享密钥认证**：
  网关令牌持有者认证、`x-openclaw-password` 或使用配置的网关密码进行 HTTP 基本认证。
- Tailscale Serve 身份标头和 `gateway.auth.mode: "trusted-proxy"` **不**对
  此独立的回环浏览器 API 进行认证。
- 如果启用了浏览器控制但未配置共享密钥认证，OpenClaw
  会在启动时自动生成 `gateway.auth.token` 并将其持久化到配置中。
- 当 `gateway.auth.mode` 已经是
  `password`、`none` 或 `trusted-proxy` 时，
  OpenClaw **不会**自动生成该令牌。
- 请将 Gateway(网关) 和所有节点主机保持在专用网络（Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为机密；优先使用环境变量或机密管理器。

远程 CDP 提示：

- 尽可能使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期令牌直接嵌入配置文件中。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-managed**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录 + CDP 端口
- **remote**：一个显式的 CDP URL（在其他地方运行的基于 Chromium 的浏览器）
- **existing 会话**：通过 Chrome DevTools MCP 自动连接您现有的 Chrome 配置文件

默认值：

- 如果缺失 `openclaw` 配置文件，则会自动创建。
- `user` 配置文件是内置的，用于 Chrome MCP 现有会话连接。
- 除了 `user` 之外，现有会话配置文件是可选加入的；使用 `--driver existing-session` 创建它们。
- 默认情况下，本地 CDP 端口从 **18800–18899** 分配。
- 删除配置文件会将其本地数据目录移至废纸篓。

所有控制端点都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 使用现有会话

OpenClaw 还可以通过官方 Chrome DevTools MCP 服务器附加到正在运行的基于 Chromium 的浏览器配置文件。这会重用
该浏览器配置文件中已打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser 会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果您想要不同的名称、颜色或浏览器数据目录，请创建您自己的自定义现有会话配置文件。

默认行为：

- 内置的 `user` 配置文件使用 Chrome MCP 自动连接，其目标是
  默认的本地 Google Chrome 配置文件。

对于 Brave、Edge、Chromium 或非默认的 Chrome 配置文件，请使用 `userDataDir`：

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
3. 保持浏览器运行，并在 OpenClaw 附加时批准连接提示。

常用检查页面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

实时附加冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功的标志：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出您已打开的浏览器标签页
- `snapshot` 从选定的活动标签页返回引用

如果附加不起作用，请检查以下内容：

- 目标基于 Chromium 的浏览器版本为 `144+`
- 在该浏览器的检查页面中已启用远程调试
- 浏览器已显示附加同意提示，并且您已接受
- `openclaw doctor` 迁移旧的基于扩展程序的浏览器配置，并检查是否在本地安装了 Chrome 以用于默认自动连接配置文件，但它无法为您启用浏览器端远程调试

Agent 使用：

- 当您需要用户的登录浏览器状态时，请使用 `profile="user"`。
- 如果您使用自定义的现有会话配置文件，请传递该显式的配置文件名称。
- 仅当用户在计算机旁以批准附加提示时，才选择此模式。
- Gateway(网关) 或节点主机可以生成 `npx chrome-devtools-mcp@latest --autoConnect`

注意事项：

- 此路径的风险高于隔离的 `openclaw` 配置文件，因为它可以在您的已登录浏览器会话中执行操作。
- OpenClaw 不会为此驱动程序启动浏览器；它仅附加到
  现有会话。
- OpenClaw 在此处使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果设置了 `userDataDir`，OpenClaw 会将其传递以定位到该特定的 Chromium 用户数据目录。
- 现有会话截图支持从快照中进行页面捕获和 `--ref` 元素捕获，但不支持 CSS `--element` 选择器。
- 现有会话页面截图可以在没有 Playwright 的情况下通过 Chrome MCP 工作。基于引用的元素截图 (`--ref`) 也可以在那里工作，但 `--full-page` 不能与 `--ref` 或 `--element` 结合使用。
- 现有会话操作仍然比受管浏览器路径更受限：
  - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照引用而不是 CSS 选择器
  - `click` 仅限左键（无按钮覆盖或修饰符）
  - `type` 不支持 `slowly=true`；请使用 `fill` 或 `press`
  - `press` 不支持 `delayMs`
  - `hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持每次调用的超时覆盖
  - `select` 目前仅支持单个值
- 现有会话 `wait --url` 支持与其他浏览器驱动程序类似的精确匹配、子字符串匹配和 glob 模式。暂不支持 `wait --load networkidle`。
- 现有会话上传钩子需要 `ref` 或 `inputRef`，一次支持一个文件，并且不支持 CSS `element` 定位。
- 现有会话对话框钩子不支持超时覆盖。
- 某些功能仍需要托管浏览器路径，包括批量操作、PDF 导出、下载拦截和 `responsebody`。
- 现有会话是主机本地的。如果 Chrome 位于不同的机器或不同的网络命名空间上，请改用远程 CDP 或节点主机。

## 隔离保证

- **专用用户数据目录**：绝不会触碰您的个人浏览器配置文件。
- **专用端口**：避免 `9222` 以防止与开发工作流冲突。
- **确定性标签页控制**：通过 `targetId` 定位标签页，而不是“最后一个标签页”。

## 浏览器选择

在本地启动时，OpenClaw 会选择第一个可用的浏览器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆盖。

平台：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：检查常见的安装位置。

## 控制 API（可选）

仅针对本地集成，Gateway(网关) 会公开一个小型的回环 HTTP API：

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
- 设置：`POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

所有端点接受 `?profile=<name>`。

如果配置了共享密钥 Gateway 身份验证，浏览器 HTTP 路由也需要身份验证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码进行 HTTP Basic 认证

注意：

- 此独立的本地回环浏览器 API **不**消耗 trusted-proxy 或 Tailscale Serve 身份标头。
- 如果 `gateway.auth.mode` 是 `none` 或 `trusted-proxy`，这些回环浏览器路由不会继承那些承载身份的模式；请将它们限制为仅限回环。

### `/act` 错误约定

`POST /act` 使用结构化错误响应来处理路由级别验证和策略失败：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前的 `code` 值：

- `ACT_KIND_REQUIRED` (HTTP 400)：`kind` 缺失或无法识别。
- `ACT_INVALID_REQUEST` (HTTP 400)：操作负载未能通过规范化或验证。
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400)：`selector` 用于了不支持的操作类型。
- `ACT_EVALUATE_DISABLED` (HTTP 403)：`evaluate`（或 `wait --fn`）被配置禁用。
- `ACT_TARGET_ID_MISMATCH` (HTTP 403)：顶层或批处理的 `targetId` 与请求目标冲突。
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501)：不支持对现有会话 (existing-会话) 配置文件执行此操作。

其他运行时失败可能仍返回 `{ "error": "<message>" }` 而不带
`code` 字段。

### Playwright 要求

某些功能（导航/操作/AI 快照/角色快照、元素截图、
PDF）需要 Playwright。如果未安装 Playwright，这些端点将返回
明确的 501 错误。

没有 Playwright 仍然有效的功能：

- ARIA 快照
- 当每个标签页的 CDP WebSocket 可用时，为受管的 `openclaw` 浏览器截取页面截图
- 为 `existing-session` / Chrome MCP 配置文件截取页面截图
- 基于 `existing-session` 引用的截图 (`--ref`)，来自快照输出

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- AI 快照 / 角色快照
- CSS 选择器元素截图 (`--element`)
- 完整浏览器 PDF 导出

元素截图也会拒绝 `--full-page`；路由返回 `fullPage is
not supported for element screenshots`。

如果看到 `Playwright is not available in this gateway build`，请安装完整的
Playwright 包（而不是 `playwright-core`）并重启 Gateway(网关)，或者重新安装
带有浏览器支持的 OpenClaw。

#### Docker Playwright 安装

如果您的 Gateway(网关) 在 Docker 中运行，请避免 `npx playwright`（npm 覆盖冲突）。
请改用捆绑的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`）并确保 `/home/node` 通过
`OPENCLAW_HOME_VOLUME` 或绑定挂载被持久化。参见 [Docker](/en/install/docker)。

## 工作原理（内部）

高层流程：

- 一个小型的 **控制服务器** 接受 HTTP 请求。
- 它通过 **CDP** 连接到基于 Chromium 的浏览器（Chrome/Brave/Edge/Chromium）。
- 对于高级操作（点击/输入/快照/PDF），它在 CDP 之上使用
  **Playwright**。
- 当缺少 Playwright 时，仅支持非 Playwright 操作。

这种设计使代理保持在稳定、确定的接口上，同时允许
您交换本地/远程浏览器和配置文件。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 来定位特定配置文件。
所有命令也接受 `--json` 以获得机器可读的输出（稳定的有效负载）。

基础知识：

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

生命周期说明：

- 对于仅附加和远程 CDP 配置文件，`openclaw browser stop` 仍然是
  测试后正确的清理命令。它关闭活动的控制会话并
  清除临时模拟覆盖，而不是杀死底层的
  浏览器。
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

注意事项：

- `upload` 和 `dialog` 是 **armed** 调用；在触发选择器/对话框的点击/按键之前运行它们。
- 下载和跟踪输出路径受限于 OpenClaw 临时根目录：
  - traces: `/tmp/openclaw` (fallback: `${os.tmpdir()}/openclaw`)
  - downloads: `/tmp/openclaw/downloads` (fallback: `${os.tmpdir()}/openclaw/downloads`)
- 上传路径受限于 OpenClaw 临时上传根目录：
  - uploads: `/tmp/openclaw/uploads` (fallback: `${os.tmpdir()}/openclaw/uploads`)
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。
- `snapshot`:
  - `--format ai` (安装 Playwright 时的默认设置)：返回带有数字引用 (`aria-ref="<n>"`) 的 AI 快照。
  - `--format aria`：返回辅助功能树 (无引用；仅供检查)。
  - `--efficient` (或 `--mode efficient`)：紧凑的角色快照预设 (interactive + compact + depth + lower maxChars)。
  - 配置默认值（仅限工具/CLI）：设置 `browser.snapshotDefaults.mode: "efficient"` 以便在调用方未传递模式时使用高效快照（参见 [Gateway(网关) configuration](/en/gateway/configuration-reference#browser)）。
  - 角色快照选项（`--interactive`、`--compact`、`--depth`、`--selector`）强制使用基于角色的快照，并带有类似 `ref=e12` 的引用。
  - `--frame "<iframe selector>"` 将角色快照的作用域限定在一个 iframe（与类似 `e12` 的角色引用配对）。
  - `--interactive` 输出一个扁平的、易于选择的交互元素列表（最适合驱动操作）。
  - `--labels` 添加一个仅限视口的屏幕截图，并覆盖引用标签（打印 `MEDIA:<path>`）。
- `click`/`type`/etc 需要一个来自 `snapshot` 的 `ref`（可以是数字 `12` 或角色引用 `e12`）。
  操作有意不支持 CSS 选择器。

## 快照与引用

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字引用）**：`openclaw browser snapshot`（默认值；`--format ai`）
  - 输出：包含数字引用的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在内部，引用通过 Playwright 的 `aria-ref` 解析。

- **角色快照（类似 `e12` 的角色引用）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带有 `[ref=e12]`（以及可选的 `[nth=1]`）的基于角色的列表/树。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在内部，引用通过 `getByRole(...)` 解析（对于重复项，加上 `nth()`）。
  - 添加 `--labels` 以包含带有覆盖 `e12` 标签的视口屏幕截图。

引用行为：

- Refs 在导航过程中 **不稳定**；如果出现故障，请重新运行 `snapshot` 并使用新的 ref。
- 如果角色快照是使用 `--frame` 拍摄的，则角色 ref 的作用域限定为该 iframe，直到下一个角色快照。

## 等待增强功能

您可以等待的不仅仅是时间/文本：

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

当操作失败时（例如“不可见”、“严格模式违规”、“被遮挡”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在交互模式下优先使用角色 ref）
3. 如果仍然失败：运行 `openclaw browser highlight <ref>` 查看 Playwright 的目标对象
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 进行深度调试：记录追踪：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop` (打印 `TRACE:<path>`)

## JSON 输出

`--json` 适用于脚本编写和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 以及一个小的 `stats` 块（行/字符/refs/interactive），以便工具推断负载大小和密度。

## 状态和环境控制选项

这些对于“让网站像 X 一样运行”的工作流非常有用：

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Storage: `storage local|session get|set|clear`
- Offline: `set offline on|off`
- Headers: `set headers --headers-json '{"X-Debug":"1"}'` (旧版 `set headers --json '{"X-Debug":"1"}'` 仍受支持)
- HTTP basic auth: `set credentials user pass` (或 `--clear`)
- Geolocation: `set geo <lat> <lon> --origin "https://example.com"` (或 `--clear`)
- Media: `set media dark|light|no-preference|none`
- Timezone / locale: `set timezone ...`, `set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"` (Playwright 设备预设)
  - `set viewport 1280 720`

## 安全与隐私

- openclaw 浏览器配置文件可能包含已登录的会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  在页面上下文中执行任意 JavaScript。提示注入可能会引导
  这些操作。如果不需要，可以使用 `browser.evaluateEnabled=false` 禁用。
- 有关登录和反机器人说明（X/Twitter 等），请参阅 [Browser login + X/Twitter posting](/en/tools/browser-login)。
- 保持 Gateway(网关)/节点主机的私密性（仅限环回或 tailnet）。
- 远程 CDP 端点功能强大；请对其进行隧道传输和保护。

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
[浏览器故障排除](/en/tools/browser-linux-troubleshooting)。

有关 WSL2 Gateway(网关) + Windows Chrome 分离主机设置，请参阅
[WSL2 + Windows + 远程 Chrome CDP 故障排除](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 启动失败与导航 SSRF 阻止

这些是不同的故障类别，它们指向不同的代码路径。

- **CDP 启动或就绪失败**意味着 OpenClaw 无法确认浏览器控制平面运行正常。
- **导航 SSRF 阻止**意味着浏览器控制平面运行正常，但页面导航目标被策略拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
- 导航 SSRF 阻止：
  - `open`、`navigate`、快照或选项卡打开流程因浏览器/网络策略错误而失败，而 `start` 和 `tabs` 仍能正常工作

使用此最小序列来区分两者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解读结果：

- 如果 `start` 失败并出现 `not reachable after start`，请先排查 CDP 就绪情况。
- 如果 `start` 成功但 `tabs` 失败，则控制平面仍不健康。将此视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失败，则浏览器控制平面已启动，故障出在导航策略或目标页面上。
- 如果 `start`、`tabs` 和 `open` 全部成功，则基本的托管浏览器控制路径运行正常。

重要的行为细节：

- 即使您未配置 `browser.ssrfPolicy`，浏览器配置默认也会使用一个默认拒绝的 SSRF 策略对象。
- 对于 local loopback `openclaw` 托管配置文件，CDP 健康检查会有意跳过对 OpenClaw 自有本地控制平面的浏览器 SSRF 可达性强制执行。
- 导航保护是独立的。成功的 `start` 或 `tabs` 结果并不意味着允许后续的 `open` 或 `navigate` 目标。

安全指南：

- 默认情况下**不要**放宽浏览器 SSRF 策略。
- 优先使用狭窄的主机例外（例如 `hostnameAllowlist` 或 `allowedHostnames`），而不是广泛的专用网络访问。
- 仅在被信任的环境中需要并审查专用网络浏览器访问权限时，才使用 `dangerouslyAllowPrivateNetwork: true`。

示例：导航被阻止，控制平面正常

- `start` 成功
- `tabs` 成功
- `open http://internal.example` 失败

这通常意味着浏览器启动正常，导航目标需要策略审查。

示例：在导航产生影响之前启动被阻止

- `start` 失败并出现 `not reachable after start`
- `tabs` 也失败或无法运行

这表明浏览器启动或 CDP 可达性存在问题，而不是页面 URL 许可名单问题。

## 代理工具 + 控制工作原理

代理获得**一个工具**用于浏览器自动化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 来点击/输入/拖动/选择。
- `browser screenshot` 捕获像素（整页或元素）。
- `browser` 接受：
  - `profile` 用于选择命名的浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target` (`sandbox` | `host` | `node`) 用于选择浏览器的位置。
  - 在沙箱隔离会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱隔离会话默认为 `sandbox`，非沙箱会话默认为 `host`。
  - 如果连接了支持浏览器的节点，除非您固定 `target="host"` 或 `target="node"`，否则该工具可能会自动路由到该节点。

这可以保持代理的确定性，并避免使用脆弱的选择器。

## 相关

- [工具概述](/en/tools) — 所有可用的代理工具
- [沙箱隔离](/en/gateway/sandboxing) — 沙箱隔离环境中的浏览器控制
- [安全性](/en/gateway/security) — 浏览器控制的风险与加固

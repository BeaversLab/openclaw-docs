---
summary: "集成的浏览器控制服务 + 动作命令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "浏览器（OpenClaw 托管）"
---

# 浏览器（openclaw 托管）

OpenClaw 可以运行一个由代理控制的**专用 Chrome/Brave/Edge/Chromium 配置文件**。
它与您的个人浏览器隔离，并通过网关内部的一个小型本地
控制服务进行管理（仅限回环）。

初学者视图：

- 您可以将其视为一个**独立的、仅限代理使用的浏览器**。
- `openclaw` 配置文件**不会**触及您的个人浏览器配置文件。
- 代理可以在安全通道中**打开标签页、阅读页面、点击和输入**。
- 默认的 `chrome` 配置文件通过
  扩展中继使用**系统默认的 Chromium 浏览器**；切换到 `openclaw` 以使用隔离的托管浏览器。

## 您将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认为橙色强调）。
- 确定性标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖动/选择）、快照、屏幕截图、PDF。
- 可选的多配置文件支持（`openclaw`, `work`, `remote`, ...）。

此浏览器**不是**您的日常主力浏览器。它是用于
代理自动化和验证的安全隔离环境。

## 快速入门

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您收到“Browser disabled”（浏览器已禁用）的提示，请在配置中启用它（见下文）并重新启动
网关。

## 配置文件：`openclaw` vs `chrome`

- `openclaw`：托管、隔离的浏览器（无需扩展）。
- `chrome`：中继到您的**系统浏览器**的扩展（需要将 OpenClaw
  扩展附加到标签页）。

如果您希望默认使用托管模式，请设置 `browser.defaultProfile: "openclaw"`。

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
    defaultProfile: "chrome",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

注意事项：

- 浏览器控制服务绑定到从 `gateway.port` 派生的端口的回环地址
  （默认：`18791`，即网关端口 + 2）。中继使用下一个端口（`18792`）。
- 如果您覆盖网关端口（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），
  派生的浏览器端口将随之移动以保持在同一“系列”中。
- 如果未设置，`cdpUrl` 默认为中继端口。
- `remoteCdpTimeoutMs` 适用于远程（非环回）CDP 可达性检查。
- `remoteCdpHandshakeTimeoutMs` 适用于远程 CDP WebSocket 可达性检查。
- 浏览器导航/打开标签页在导航前会进行 SSRF 防护检查，并在导航后对最终 `http(s)` URL 进行尽力而为的重新检查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认为 `true`（受信任网络模式）。将其设置为 `false` 以进行严格的仅公开浏览。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为传统别名仍受支持以保持兼容性。
- `attachOnly: true` 意味着“从不启动本地浏览器；仅在它已在运行时附加。”
- `color` + 每个配置文件的 `color` 会为浏览器 UI 着色，以便您可以查看哪个配置文件处于活动状态。
- 默认配置文件是 `openclaw`（OpenClaw 管理的独立浏览器）。使用 `defaultProfile: "chrome"` 以选择加入 Chrome 扩展程序中继。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则为系统默认浏览器；否则为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl` — 仅针对远程 CDP 设置这些。

## 使用 Brave（或其他基于 Chromium 的浏览器）

如果您的**系统默认**浏览器基于 Chromium (Chrome/Brave/Edge 等)，
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

- **本地控制（默认）：** 网关启动环回控制服务并可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；网关将浏览器操作代理给它。
- **远程 CDP：** 将 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）设置为
  以附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。

远程 CDP URL 可以包含身份验证信息：

- 查询令牌（例如，`https://provider.example?token=<token>`）
- HTTP Basic 身验证（例如，`https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点和连接到 CDP WebSocket 时会保留身份验证信息。对于令牌，建议优先使用环境变量或密钥管理器，而不是将其提交到配置文件中。

## 节点浏览器代理（零配置默认设置）

如果您在装有浏览器的计算机上运行**节点主机**，OpenClaw 可以自动将浏览器工具调用路由到该节点，而无需任何额外的浏览器配置。这是远程网关的默认路径。

注意：

- 节点主机通过**代理命令**暴露其本地浏览器控制服务器。
- 配置文件来自节点自身的 `browser.profiles` 配置（与本地相同）。
- 如果不需要，可以禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一项托管的 Chromium 服务，通过 HTTPS 暴露 CDP 端点。您可以将 OpenClaw 浏览器配置文件指向 Browserless 区域端点，并使用您的 API 密钥进行身份验证。

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

- 将 `<BROWSERLESS_API_KEY>` 替换为您实际的 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（请参阅其文档）。

## 直接 WebSocket CDP 提供商

某些托管的浏览器服务暴露**直接 WebSocket** 端点，而不是标准的基于 HTTP 的 CDP 发现（`/json/version`）。OpenClaw 支持这两种方式：

- **HTTP(S) 端点**（例如 Browserless）— OpenClaw 调用 `/json/version` 来
  发现 WebSocket 调试器 URL，然后进行连接。
- **WebSocket 端点**（`ws://` / `wss://`）— OpenClaw 直接连接，
  跳过 `/json/version`。将其用于诸如
  [Browserbase](https://www.browserbase.com) 之类的服务或任何提供 WebSocket URL 的提供商。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行无头浏览器的云平台，内置 CAPTCHA 求解、隐身模式和住宅代理。

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

注意：

- [注册](https://www.browserbase.com/sign-up) 并复制您的 **API 密钥**
  从[概览仪表板](https://www.browserbase.com/overview) 中。
- 将 `<BROWSERBASE_API_KEY>` 替换为您的真实 Browserbase API 密钥。
- Browserbase 会在连接 WebSocket 时自动创建浏览器会话，因此无需
  手动执行创建会话的步骤。
- 免费层级允许每月一个并发会话和一个浏览器小时。
  请参阅 [定价](https://www.browserbase.com/pricing) 了解付费计划的限制。
- 请参阅 [Browserbase 文档](https://docs.browserbase.com) 获取完整的 API
  参考、SDK 指南和集成示例。

## 安全性

核心要点：

- 浏览器控制仅限本地回环；访问需经过网关的身份验证或节点配对。
- 如果启用了浏览器控制但未配置身份验证，OpenClaw 会在启动时自动生成 `gateway.auth.token` 并将其保存到配置中。
- 将网关和所有节点主机保持在私有网络（如 Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为机密；优先使用环境变量或密钥管理器。

远程 CDP 提示：

- 尽可能使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期有效的令牌直接嵌入配置文件中。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-managed**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录和 CDP 端口
- **remote**：一个显式的 CDP URL（在其他地方运行的基于 Chromium 的浏览器）
- **extension relay**：通过本地中继和 Chrome 扩展程序使用您现有的 Chrome 标签页

默认设置：

- 如果缺失，会自动创建 `openclaw` 配置文件。
- `chrome` 配置文件是内置的，用于 Chrome 扩展程序中继（默认指向 `http://127.0.0.1:18792`）。
- 本地 CDP 端口默认分配范围为 **18800–18899**。
- 删除配置文件会将其本地数据目录移至废纸篓。

所有控制端点都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## Chrome 扩展程序中继（使用您现有的 Chrome）

OpenClaw 还可以通过本地 CDP 中继和 Chrome 扩展程序来控制 **您现有的 Chrome 标签页**（无需单独的“openclaw”Chrome 实例）。

完整指南：[Chrome 扩展程序](/zh/en/tools/chrome-extension)

流程：

- Gateway 在本地运行（同一台机器）或在浏览器机器上运行节点主机。
- 本地 **中继服务器** 在回环 `cdpUrl` 上监听（默认：`http://127.0.0.1:18792`）。
- 您点击标签页上的 **OpenClaw Browser Relay** 扩展程序图标进行连接（它不会自动连接）。
- 代理通过选择正确的配置文件，使用标准的 `browser` 工具控制该标签页。

如果 Gateway 运行在其他地方，请在浏览器机器上运行节点主机，以便 Gateway 代理浏览器操作。

### 沙盒会话

如果代理会话处于沙盒中，`browser` 工具可能会默认为 `target="sandbox"`（沙盒浏览器）。
Chrome 扩展程序中继接管需要主机浏览器控制，因此：

- 以非沙盒模式运行会话，或者
- 设置 `agents.defaults.sandbox.browser.allowHostControl: true` 并在调用工具时使用 `target="host"`。

### 设置

1. 加载扩展程序（开发人员/未打包）：

```bash
openclaw browser extension install
```

- Chrome → `chrome://extensions` → 启用“开发者模式”
- “加载已解压的扩展程序” → 选择 `openclaw browser extension path` 打印的目录
- 固定扩展程序，然后在您想要控制的标签页上点击它（徽章显示 `ON`）。

2. 使用方法：

- CLI：`openclaw browser --browser-profile chrome tabs`
- 代理工具：`browser`，参数为 `profile="chrome"`

可选：如果您想要不同的名称或中继端口，请创建您自己的配置文件：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

说明：

- 此模式依赖于 Playwright-on-CDP 进行大多数操作（屏幕截图/快照/操作）。
- 再次点击扩展程序图标以断开连接。
- 默认情况下，保持中继仅限回环访问。如果必须从不同的网络命名空间（例如 WSL2 中的 Gateway，Windows 上的 Chrome）访问中继，请将 `browser.relayBindHost` 设置为显式绑定地址，例如 `0.0.0.0`，同时保持周边网络的私密性和身份验证。

WSL2 / 跨命名空间示例：

```json5
{
  browser: {
    enabled: true,
    relayBindHost: "0.0.0.0",
    defaultProfile: "chrome",
  },
}
```

## 隔离保证

- **专用用户数据目录**：绝不接触您的个人浏览器配置文件。
- **专用端口**：避免 `9222` 以防止与开发工作流冲突。
- **确定性标签页控制**：通过 `targetId` 定位标签页，而非“最后一个标签页”。

## 浏览器选择

本地启动时，OpenClaw 会选择第一个可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以通过 `browser.executablePath` 覆盖此设置。

平台：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：检查常见安装位置。

## 控制 API（可选）

仅适用于本地集成，网关会公开一个小型回环 HTTP API：

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

如果配置了网关身份验证，浏览器 HTTP 路由也需要身份验证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码进行 HTTP Basic 身份验证

### Playwright 要求

某些功能（导航/操作/AI 快照/角色快照、元素截图、PDF）需要
Playwright。如果未安装 Playwright，这些端点将返回清晰的 501
错误。ARIA 快照和基本截图仍然适用于 openclaw 管理的 Chrome。
对于 Chrome 扩展中继驱动程序，ARIA 快照和截图需要 Playwright。

如果您看到 `Playwright is not available in this gateway build`，请安装完整的 Playwright 软件包（而非 `playwright-core`）并重启网关，或者重新安装带有浏览器支持的 OpenClaw。

#### Docker Playwright 安装

如果您的网关在 Docker 中运行，请避免使用 `npx playwright`（npm 覆盖冲突）。请改用捆绑的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载内容，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，`/home/node/.cache/ms-playwright`）并确保通过 `OPENCLAW_HOME_VOLUME` 或绑定挂载来持久化 `/home/node`。请参阅 [Docker](/zh/en/install/docker)。

## 工作原理（内部）

高层流程：

- 一个小型的**控制服务器**接受 HTTP 请求。
- 它通过 **CDP** 连接到基于 Chromium 的浏览器。
- 对于高级操作（点击/输入/快照/PDF），它在此基础上使用 **Playwright**
  的 CDP。
- 当缺少 Playwright 时，仅可使用非 Playwright 操作。

这种设计使代理程序保持在稳定、确定的接口上，同时允许您交换本地/远程浏览器和配置文件。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 以定位特定配置文件。所有命令还接受 `--json` 以获得机器可读的输出（稳定负载）。

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

- `upload` 和 `dialog` 是 **准备（arming）** 调用；在点击/按键触发选择器/对话框之前运行它们
  触发选择器/对话框。
- 下载和跟踪输出路径被限制在 OpenClaw 临时根目录：
  - 跟踪：`/tmp/openclaw`（回退：`${os.tmpdir()}/openclaw`）
  - 下载：`/tmp/openclaw/downloads`（回退：`${os.tmpdir()}/openclaw/downloads`）
- 上传路径被限制在 OpenClaw 临时上传根目录：
  - 上传：`/tmp/openclaw/uploads`（回退：`${os.tmpdir()}/openclaw/uploads`）
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。
- `snapshot`：
  - `--format ai`（安装 Playwright 时的默认值）：返回带有数字引用（`aria-ref="<n>"`）的 AI 快照。
  - `--format aria`：返回可访问性树（无引用；仅限检查）。
  - `--efficient`（或 `--mode efficient`）：紧凑的角色快照预设（交互式 + 紧凑 + 深度 + 更低的 maxChars）。
  - 配置默认值（仅限工具/CLI）：设置 `browser.snapshotDefaults.mode: "efficient"` 以在调用方未传递模式时使用高效快照（请参阅 [Gateway 配置](/zh/en/gateway/configuration#browser-openclaw-managed-browser)）。
  - 角色快照选项（`--interactive`、`--compact`、`--depth`、`--selector`）强制使用基于角色的快照，并带有类似 `ref=e12` 的引用。
  - `--frame "<iframe selector>"` 将角色快照的作用域限定为 iframe（与类似 `e12` 的角色引用配对）。
  - `--interactive` 输出一个扁平的、易于选取的交互元素列表（最适合驱动操作）。
  - `--labels` 添加一个仅视口的屏幕截图，并覆盖引用标签（打印 `MEDIA:<path>`）。
- `click`/`type`/等需要来自 `snapshot` 的 `ref`（可以是数字 `12` 或角色引用 `e12`）。
  出于操作意图，故意不支持 CSS 选择器。

## 快照与引用

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字引用）**：`openclaw browser snapshot`（默认值；`--format ai`）
  - 输出：包含数字引用的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在内部，该引用通过 Playwright 的 `aria-ref` 解析。

- **角色快照（类似 `e12` 的角色引用）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带有 `[ref=e12]`（和可选 `[nth=1]`）的基于角色的列表/树。
  - 动作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 内部，ref 通过 `getByRole(...)` 解析（针对重复项加上 `nth()`）。
  - 添加 `--labels` 以包含带有叠加 `e12` 标签的视口截图。

Ref 行为：

- Ref 在导航之间**不稳定**；如果失败，请重新运行 `snapshot` 并使用新的 ref。
- 如果使用 `--frame` 拍摄了角色快照，则角色 ref 将作用于该 iframe，直到下一个角色快照。

## 等待增强功能

您可以等待的不仅仅是时间/文本：

- 等待 URL（Playwright 支持的 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 断言：
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

当动作失败时（例如“不可见”、“严格模式违规”、“被覆盖”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在交互模式下首选 role refs）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 正在定位的内容
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 对于深度调试：记录追踪：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop`（打印 `TRACE:<path>`）

## JSON 输出

`--json` 用于脚本编写和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包括 `refs` 加上一个小型的 `stats` 块（行/字符/refs/interactive），以便工具可以推断有效负载的大小和密度。

## 状态和环境控制

这些对于“让网站像 X 一样运作”的工作流很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线：`set offline on|off`
- Headers：`set headers --headers-json '{"X-Debug":"1"}'`（旧版 `set headers --json '{"X-Debug":"1"}'` 仍受支持）
- HTTP 基本身份验证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区 / 区域设置：`set timezone ...`，`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- OpenClaw 浏览器配置文件可能包含已登录的会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  在页面上下文中执行任意 JavaScript。提示注入可以操纵
  此功能。如果不需要，请使用 `browser.evaluateEnabled=false` 禁用它。
- 有关登录和反机器人注意事项（X/Twitter 等），请参阅 [Browser login + X/Twitter posting](/zh/en/tools/browser-login)。
- 保持 Gateway/节点主机的私密性（仅限回环或 tailnet）。
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

有关 Linux 特定问题（特别是 snap Chromium），请参阅
[Browser troubleshooting](/zh/en/tools/browser-linux-troubleshooting)。

对于 WSL2 Gateway + Windows Chrome 分离主机设置，请参阅
[WSL2 + Windows + remote Chrome CDP troubleshooting](/zh/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## Agent 工具 + 控制工作原理

Agent 获得 **一个工具** 用于浏览器自动化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 来点击/输入/拖动/选择。
- `browser screenshot` 捕获像素（完整页面或元素）。
- `browser` 接受：
  - `profile` 用于选择命名的浏览器配置文件（openclaw、chrome 或 remote CDP）。
  - `target` (`sandbox` | `host` | `node`) 用于选择浏览器的位置。
  - 在沙盒会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒会话默认为 `sandbox`，非沙盒会话默认为 `host`。
  - 如果连接了支持浏览器的节点，该工具可能会自动路由到该节点，除非您固定了 `target="host"` 或 `target="node"`。

这可以保持代理的确定性，并避免使用脆弱的选择器。

import zh from '/components/footer/zh.mdx';

<zh />

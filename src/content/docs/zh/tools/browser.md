---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "浏览器 (OpenClaw-托管)"
---

OpenClaw 可以运行一个由代理控制的 **专用 Chrome/BraveGateway(网关)/Edge/Chromium 配置文件**。
它与您的个人浏览器隔离，并通过 Gateway(网关) 内部的一个小型本地控制服务（仅限环回）进行管理。

初学者视角：

- 可以将其视为一个 **独立的、仅限代理使用的浏览器**。
- `openclaw` 配置文件 **不会** 触及您的个人浏览器配置文件。
- 代理可以在安全通道中 **打开标签页、阅读页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到您真实的已登录 Chrome 会话。

## 你将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认为橙色强调）。
- 确定性标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖动/选择）、快照、屏幕截图、PDF。
- 一个内置的 `browser-automation` 技能，当启用浏览器插件时，它教导代理快照、稳定标签页、过期引用和手动阻止恢复循环。
- 可选的多配置文件支持（`openclaw`、`work`、`remote` 等）。

此浏览器**不是**您的日常浏览器。它是用于代理自动化和验证的安全、隔离的表面。

## 快速开始

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您收到“Browser disabled”（浏览器已禁用），请在配置中启用它（见下文）并重启 Gateway(网关)。

如果 `openclaw browser` 完全缺失，或者代理表示浏览器工具
不可用，请跳转至 [Missing browser command or 工具](/zh/tools/browser#missing-browser-command-or-tool)。

## 插件控制

默认的 `browser` 工具是一个捆绑插件。禁用它以替换为另一个注册相同 `browser` 工具名称的插件：

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

默认设置需要同时具备 `plugins.entries.browser.enabled` **和** `browser.enabled=true`。仅禁用插件会将 `openclaw browser`CLI CLI、`browser.request` 网关方法、代理工具和控制服务作为一个整体移除；您的 `browser.*` 配置将保持不变以供替换使用。

浏览器配置的更改需要重启 Gateway(网关)，以便插件可以重新注册其服务。

## 代理指南

工具配置文件说明：`tools.profile: "coding"` 包含 `web_search` 和
`web_fetch`，但不包含完整的 `browser` 工具。如果代理或生成的子代理应该使用浏览器自动化，请在配置文件阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

对于单个代理，使用 `agents.list[].tools.alsoAllow: ["browser"]`。
仅使用 `tools.subagents.tools.allow: ["browser"]` 是不够的，因为子代理策略是在配置文件过滤之后应用的。

浏览器插件提供了两个级别的代理指导：

- `browser` 工具描述包含紧凑的始终开启契约：选择
  正确的配置文件，将引用保持在同一选项卡上，使用 `tabId`/labels 进行选项卡
  定位，并加载浏览器技能以进行多步骤工作。
- 附带的 `browser-automation` 技能包含更长的操作循环：
  首先检查状态/标签页，标记任务标签页，操作前进行快照，UI 更改后重新快照，
  恢复一次过时的引用，并将登录/2FA/验证码或
  相机/麦克风拦截器报告为需要手动操作，而不是猜测。

当启用插件时，插件附带的技术会列在代理的可用技能中。完整的技能指令会按需加载，因此常规轮次不会承担完整的令牌（token）成本。

## 缺少浏览器命令或工具

如果升级后 `openclaw browser` 未知，缺少 `browser.request`，或者代理报告浏览器工具不可用，通常原因是 `plugins.allow` 列表中省略了 `browser` 并且不存在根 `browser` 配置块。请添加它：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根 `browser` 代码块（例如 `browser.enabled=true` 或 `browser.profiles.<name>`）即使在受限制的 `plugins.allow` 下也能激活内置的浏览器插件，这与渠道配置行为一致。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能替代白名单成员资格。完全移除 `plugins.allow` 也会恢复默认设置。

## 配置文件：`openclaw` vs `user`

- `openclaw`：受管理的、隔离的浏览器（无需扩展）。
- `user`：内置的 Chrome MCP 附加配置文件，用于您的**真实已登录 Chrome**
  会话。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有的登录会话很重要且用户在计算机旁可以点击/批准任何附加提示时，首选 `profile="user"`。
- `profile` 是当您想要特定浏览器模式时的显式覆盖。

如果您希望默认使用托管模式，请设置 `browser.defaultProfile: "openclaw"`。

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
    localLaunchTimeoutMs: 15000, // local managed Chrome discovery timeout (ms)
    localCdpReadyTimeoutMs: 8000, // local managed post-launch CDP readiness timeout (ms)
    actionTimeoutMs: 60000, // default browser act timeout (ms)
    tabCleanup: {
      enabled: true, // default: true
      idleMinutes: 120, // set 0 to disable idle cleanup
      maxTabsPerSession: 8, // set 0 to disable the per-session cap
      sweepMinutes: 5,
    },
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
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

<AccordionGroup>

<Accordion title="端口和可达性">

- 控制服务绑定到从 `gateway.port` 派生的端口的环回接口（默认 `18791` = gateway + 2）。覆盖 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 会将同一系列中的派生端口进行偏移。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；仅针对远程 CDP 设置这些值。如果未设置 `cdpUrl`，则默认为受管本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程和 `attachOnly` CDP HTTP 可达性
  检查和打开标签页的 HTTP 请求；`remoteCdpHandshakeTimeoutMs` 适用于
  它们的 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本地启动的受管 Chrome
  进程暴露其 CDP HTTP 端点的时间预算。`localCdpReadyTimeoutMs` 是
  发现进程后 CDP websocket 就绪的后续时间预算。
  在 Raspberry Pi、低端 VPS 或 Chromium
  启动缓慢的旧硬件上，请增加这些值。值必须是正整数，最大为 `120000`OpenClaw 毫秒；无效的
  配置值将被拒绝。
- 针对每个配置文件，重复的受管 Chrome 启动/就绪失败会触发熔断。在连续多次失败后，OpenClaw 会短暂暂停新的启动
  尝试，而不是在每次浏览器工具调用时都生成 Chromium 进程。请修复
  启动问题，如果不需要浏览器则将其禁用，或在修复后重启
  Gateway(网关)。
- 当调用方未传递 `timeoutMs` 时，`actionTimeoutMs` 是浏览器 `act` 请求的默认时间预算。客户端传输会添加一个小的宽限窗口，以便长等待能够完成，而不是在 HTTP 边界超时。
- `tabCleanup` 是对主代理浏览器会话打开的标签页进行的尽力清理。子代理、cron 和 ACP 生命周期清理仍会在会话结束时关闭其显式跟踪的标签页；主会话保持活动标签页可重复使用，然后在后台关闭空闲或多余的跟踪标签页。

</Accordion>

<Accordion title="SSRF 策略">

- 浏览器导航和打开标签页在导航前受 SSRF 保护，并在后续的最终 `http(s)` URL 上尽力再次检查。
- 在严格 SSRF 模式下，还会检查远程 CDP 端点发现和 `/json/version` 探测（`cdpUrl`Gateway(网关)）。
- Gateway(网关)/提供商 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY`OpenClawOpenClaw 环境变量不会自动代理 OpenClaw 托管的浏览器。托管的 Chrome 默认直接启动，因此提供商代理设置不会削弱浏览器 SSRF 检查。
- OpenClaw 托管的本地 CDP 就绪探测和 DevTools WebSocket 连接绕过托管网络代理，针对确切的启动环回端点，因此即使操作员代理阻止了环回出口，`openclaw browser start` 仍然有效。
- 要代理托管浏览器本身，请通过 `browser.extraArgs` 传递显式 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。严格 SSRF 模式会阻止显式浏览器代理路由，除非有意启用了专用网络浏览器访问。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认处于关闭状态；仅在有意信任专用网络浏览器访问时才启用。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为旧版别名仍受支持。

</Accordion>

<Accordion title="Profile behavior">

- `attachOnly: true` 表示永不启动本地浏览器；仅在已有运行时附加。
- `headless` 可以全局设置或针对每个本地受管配置文件设置。按配置文件的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头模式，而另一个保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 请求为本地受管配置文件进行
  一次性无头启动，而无需重写
  `browser.headless` 或配置文件配置。现有会话、仅附加和
  远程 CDP 配置文件会拒绝该覆盖，因为 OpenClaw 不会启动那些
  浏览器进程。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，当环境或配置文件/全局
  配置未明确选择有头模式时，本地受管配置文件
  会自动默认为无头模式。`openclaw browser status --json`
  将 `headlessSource` 报告为 `env`、`profile`、`config`、
  `request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 强制当前进程的本地受管启动为无头模式。
  `OPENCLAW_BROWSER_HEADLESS=0` 为普通
  启动强制使用有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；
  对于该次启动，明确的 `start --headless` 请求仍然优先。
- `executablePath` 可以全局设置或针对每个本地受管配置文件设置。按配置文件的值会覆盖 `browser.executablePath`，因此不同的受管配置文件可以启动不同的基于 Chromium 的浏览器。两种形式都接受 `~` 作为您的操作系统主目录。
- `color`（顶级和按配置文件）会给浏览器 UI 着色，以便您查看哪个配置文件处于活动状态。
- 默认配置文件是 `openclaw`（受管独立版）。使用 `defaultProfile: "user"` 选择使用已登录用户的浏览器。
- 自动检测顺序：系统默认浏览器（如果是基于 Chromium 的）；否则为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而不是原始 CDP。请勿为该驱动程序设置 `cdpUrl`。
- 当现有会话配置文件应附加到非默认的 Chromium 用户配置文件（Brave、Edge 等）时，请设置 `browser.profiles.<name>.userDataDir`。此路径也接受 `~` 作为您的操作系统主目录。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果您的**系统默认**浏览器是基于 Chromium 的（Chrome/Brave/Edge/等），
OpenClaw 会自动使用它。设置 `browser.executablePath` 可覆盖
自动检测。顶层和每个配置文件的 `executablePath` 值接受您操作系统主目录的 `~`：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

或者在每个平台的配置中进行设置：

<Tabs>
  <Tab title="macOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="Windows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="Linux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

每个 `executablePath`OpenClaw 仅影响 OpenClaw 启动的本地托管配置文件。`existing-session` 配置文件改为附加到已运行的浏览器，而远程 CDP 配置文件使用 `cdpUrl` 后面的浏览器。

## 本地与远程控制

- **本地控制（默认）：** Gateway(网关) 启动环回控制服务并可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；Gateway(网关) 将浏览器操作代理给它。
- **Remote CDP（远程 CDP）：** 设置 `browser.profiles.<name>.cdpUrl` （或 `browser.cdpUrl`OpenClaw） 以
  连接到远程的基于 Chromium 的浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。
- 对于环回接口上外部管理的 CDP 服务（例如 Docker 中发布到 `127.0.0.1` 的 Browserless），还需设置 `attachOnly: true`。没有 `attachOnly` 的环回 CDP 会被视为本地的 OpenClaw 托管的浏览器配置文件。
- `headless`OpenClaw 仅影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改现有会话或远程 CDP 浏览器。
- `executablePath` 遵循相同的本地托管配置文件规则。在正在运行的本地托管配置文件上更改它，会将该配置文件标记为需要重启/协调，以便下次启动时使用新的二进制文件。

停止行为因配置文件模式而异：

- 本地托管配置文件：`openclaw browser stop` 停止由 OpenClaw 启动的浏览器进程
- 仅附加和远程 CDP 配置文件：`openclaw browser stop` 会关闭活动的
  控制会话并释放 Playwright/CDP 模拟覆盖（视口、
  配色方案、区域设置、时区、离线模式及类似状态），尽管
  OpenClaw 未启动任何浏览器进程

远程 CDP URL 可以包含身份验证信息：

- 查询令牌（例如，`https://provider.example?token=<token>`）
- HTTP 基本身份验证（例如，`https://user:pass@provider.example`）

OpenClaw 保留了调用 `/json/*` 端点以及连接到 CDP WebSocket 时的身份验证。对于令牌，请优先使用环境变量或机密管理器，而不是将其提交到配置文件中。

## Node 浏览器代理（零配置默认值）

如果您在运行浏览器的机器上运行**节点主机**，OpenClaw 可以自动将浏览器工具调用路由到该节点，而无需任何额外的浏览器配置。这是远程网关的默认路径。

注意事项：

- 节点主机通过**代理命令**暴露其本地浏览器控制服务器。
- 配置文件来自节点自己的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选的。将其留空以保持传统/默认行为：所有已配置的配置文件均可通过代理访问，包括配置文件的创建/删除路由。
- 如果你设置了 `nodeHost.browserProxy.allowProfiles`OpenClaw，OpenClaw 会将其视为最小权限边界：仅允许以允许列表中的配置文件为目标，并且在代理层阻止持久化配置文件的创建/删除路由。
- 如果您不想要它，请禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一项托管的 Chromium 服务，通过 HTTPS 和 WebSocket 暴露
CDP 连接 URL。OpenClaw 可以使用其中任一形式，但
对于远程浏览器配置文件，最简单的选项是 Browserless 连接文档中提供的直接 WebSocket URL。

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

注意：

- 将 `<BROWSERLESS_API_KEY>` 替换为您真实的 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（请参阅其文档）。
- 如果 Browserless 提供了一个 HTTPS 基础 URL，你可以将其转换为 `wss://`OpenClaw 以进行直接的 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw 发现 `/json/version`。

### 同一主机上的 Browserless Docker

当 Browserless 在 Docker 中自托管且 OpenClaw 在主机上运行时，请将
Browserless 视为外部托管的 CDP 服务：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

`browser.profiles.browserless.cdpUrl` 中的地址必须能够从 OpenClaw 进程访问。Browserless 还必须通告一个匹配的可访问端点；将 Browserless `EXTERNAL` 设置为相同的对 OpenClaw 公开的 WebSocket 基础地址，例如 `ws://127.0.0.1:3000`、`ws://browserless:3000` 或稳定的私有 Docker 网络地址。如果 `/json/version` 返回指向 OpenClaw 无法访问的地址的 `webSocketDebuggerUrl`，则 CDP HTTP 可能看起来正常，但 WebSocket 附加仍然会失败。

对于回环 Browserless 配置文件，请不要将 `attachOnly` 留空。如果没有设置 `attachOnly`OpenClawOpenClaw，OpenClaw 会将回环端口视为本地托管的浏览器配置文件，并可能会报告该端口正在使用但不归 OpenClaw 所有。

## 直接 WebSocket CDP 提供商

某些托管浏览器服务暴露的是 **直接 WebSocket** 端点，而非基于 HTTP 的标准 CDP 发现机制 (`/json/version`)。OpenClaw 接受三种 CDP URL 格式，并会自动选择正确的连接策略：

- **HTTP(S) 发现** - `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 调用 `/json/version` 来发现 WebSocket 调试器 URL，然后
  连接。无 WebSocket 回退。
- **直接 WebSocket 端点** - 带有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>` 路径的 `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...`。OpenClaw 通过 WebSocket 握手直接连接，并完全跳过
  `/json/version`。
- **裸 WebSocket 根路径** - 不带 `/devtools/...` 路径的 `ws://host[:port]` 或 `wss://host[:port]`（例如 [Browserless](https://browserless.io)、[Browserbase](https://www.browserbase.com)）。OpenClaw 首先尝试 HTTP `/json/version` 发现（将协议标准化为 `http`/`https`）；如果发现返回 `webSocketDebuggerUrl`，则使用该值，否则 OpenClaw 回退到裸根路径的直接 WebSocket 握手。如果通告的 WebSocket 端点拒绝 CDP 握手，但配置的裸根路径接受握手，OpenClaw 也会回退到该根路径。这使得指向本地 Chrome 的裸 `ws://` 仍然能够连接，因为 Chrome 仅在 `/json/version` 的特定于目标的路径上接受 WebSocket 升级，而托管提供商在其发现端点通告的短期 URL 不适合 Playwright CDP 时，仍可使用其根 WebSocket 端点。

`openclaw browser doctor` 使用与运行时附加相同的优先发现、WebSocket 回退
逻辑，因此连接成功的裸根 URL 不会被
诊断程序报告为不可达。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行
无头浏览器的云平台，具有内置的验证码破解、隐身模式和住宅
代理功能。

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

- [注册](https://www.browserbase.com/sign-up) 并从 [概览仪表板](https://www.browserbase.com/overview) 复制您的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为您真实的 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话。
- 免费版允许一个并发会话和每月一个浏览器小时。请参阅 [定价](https://www.browserbase.com/pricing) 了解付费计划的限制。
- 有关完整的 API 参考、SDK 指南和集成示例，请参阅 [Browserbase 文档](https://docs.browserbase.com)。

## 安全

关键概念：

- 浏览器控制仅限本地回环；访问通过 Gateway(网关) 的认证或节点配对进行。
- 独立的回环浏览器 HTTP API 仅使用 **共享密钥身份验证**：
  网关令牌持有者身份验证、`x-openclaw-password`，或使用配置的网关密码进行 HTTP 基本身份验证。
- Tailscale Serve 身份标头和 `gateway.auth.mode: "trusted-proxy"` **不**对此独立回环浏览器 API 进行身份验证。
- 如果启用了浏览器控制且未配置共享密钥身份验证，OpenClaw
  会为该启动生成一个仅限运行时的网关令牌。如果客户端需要在重启间拥有稳定的密钥，
  请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或
  `OPENCLAW_GATEWAY_PASSWORD`。
- OpenClaw **不会**在 `gateway.auth.mode` 已经是 `password`、`none` 或 `trusted-proxy` 时自动生成该令牌。
- 请将 Gateway(网关) 和所有节点主机保持在专用网络 (Tailscale) 上；避免公开暴露。
- 请将远程 CDP URL/令牌视为机密；优先使用环境变量或机密管理器。

远程 CDP 提示：

- 尽可能使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期有效的令牌直接嵌入到配置文件中。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw 托管**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录和 CDP 端口
- **remote**：一个显式的 CDP URL（在其他地方运行的基于 Chromium 的浏览器）
- **existing 会话**：通过 Chrome DevTools MCP 自动连接的现有 Chrome 配置文件

默认值：

- 如果缺失，`openclaw` 配置文件将自动创建。
- `user` 配置文件是内置的，用于 Chrome MCP 现有会话附加。
- 除了 `user` 之外，现有会话配置文件是可选的；使用 `--driver existing-session` 创建它们。
- 默认情况下，本地 CDP 端口从 **18800-18899** 分配。
- 删除配置文件会将其本地数据目录移至废纸篓。

所有控制端点都接受 `?profile=<name>`CLI；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 连接现有会话

OpenClaw 也可以通过官方 Chrome DevTools MCP 服务器附加到正在运行的基于 Chromium 的浏览器配置文件。这会复用该浏览器配置文件中已打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome 开发者：在您的浏览器会话中使用 Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果您需要不同的名称、颜色或浏览器数据目录，请创建您自己的自定义现有会话配置文件。

默认行为：

- 内置的 `user` 配置文件使用 Chrome MCP 自动连接功能，其目标是
  默认的本地 Google Chrome 配置文件。

对 Brave、Edge、Chromium 或非默认 Chrome 配置文件使用 `userDataDir`。
`~` 扩展为您的操作系统主目录：

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

1. 打开该浏览器的检查页面以进行远程调试。
2. 启用远程调试。
3. 保持浏览器运行，并在 OpenClaw 连接时批准连接提示。

常见检查页面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: Brave`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

实时附加冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功后的样子：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出您已打开的浏览器标签页
- `snapshot` 从选定的活动标签页返回 refs

如果附加不起作用，请检查以下内容：

- 目标基于 Chromium 的浏览器是版本 `144+`
- 在该浏览器的检查页面中已启用远程调试
- 浏览器显示并让您接受了附加同意提示
- `openclaw doctor` 会迁移旧的基于扩展的浏览器配置，并检查 Chrome 是否已本地安装以便用于默认自动连接配置文件，但它无法为您启用浏览器端的远程调试

代理使用：

- 当您需要用户的已登录浏览器状态时，请使用 `profile="user"`。
- 如果您使用自定义现有会话配置文件，请传递该显式配置文件名称。
- 仅当用户在电脑前并批准附加提示时，才选择此模式。
- Gateway(网关) 或节点宿主可以生成 `npx chrome-devtools-mcp@latest --autoConnect`

注意：

- 此路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在您的已登录浏览器会话中操作。
- OpenClaw 不会为此驱动程序启动浏览器；它仅进行附加。
- OpenClaw 在此处使用官方 Chrome DevTools MCP OpenClaw`--autoConnect` 流程。如果设置了 `userDataDir`，它将被传递给目标用户数据目录。
- 现有会话可以附加到选定的主机或通过连接的浏览器节点进行。如果 Chrome 位于其他位置且没有连接浏览器节点，请改用远程 CDP 或节点主机。

### 自定义 Chrome MCP 启动

在每个配置文件中覆盖生成的 Chrome DevTools MCP 服务器，当默认的 `npx chrome-devtools-mcp@latest` 流程不符合你的需求时（例如离线主机、固定版本、内置二进制文件）：

| 字段         | 它的功能                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `mcpCommand` | 要启动的替代可执行文件，而不是 `npx`。按原样解析；支持绝对路径。                                 |
| `mcpArgs`    | 原样传递给 `mcpCommand` 的参数数组。替换默认的 `chrome-devtools-mcp@latest --autoConnect` 参数。 |

当在现有会话配置上设置了 `cdpUrl`OpenClaw 时，OpenClaw 会跳过
`--autoConnect` 并自动将端点转发到 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>` (DevTools HTTP discovery endpoint)。
- `ws(s)://...` → `--wsEndpoint <url>`（直接 CDP WebSocket）。

Endpoint 标志和 `userDataDir` 不能组合使用：当设置了 `cdpUrl` 时，对于 Chrome MCP 启动，`userDataDir` 将被忽略，因为 Chrome MCP 会连接到端点后端的运行中浏览器，而不是打开一个配置文件目录。

<Accordion title="现有会话功能限制">

与托管的 `openclaw` 配置文件相比，现有会话驱动程序受到更多限制：

- **Screenshots** - 页面捕获和 `--ref` 元素捕获有效；CSS `--element` 选择器无效。`--full-page` 不能与 `--ref` 或 `--element` 结合使用。页面或基于 ref 的元素屏幕截图不需要 Playwright。
- **Actions** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照 ref（无 CSS 选择器）。`click-coords` 点击可见视口坐标，不需要快照 ref。`click` 仅限左键。`type` 不支持 `slowly=true`；请使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持每次调用的超时。`select` 接受单个值。
- **Wait / upload / dialog** - `wait --url` 支持精确、子字符串和 glob 模式；不支持 `wait --load networkidle`。上传钩子需要 `ref` 或 `inputRef`，每次一个文件，无 CSS `element`。对话框钩子不支持超时覆盖或 `dialogId`。
- **Dialog visibility** - 托管浏览器操作响应在操作打开模态对话框时包含 `blockedByDialog` 和 `browserState.dialogs.pending`；快照还包含待处理的对话框状态。在对话框待处理时，使用 `browser dialog --accept/--dismiss --dialog-id <id>` 响应。在 OpenClaw 外部处理的对话框显示在 `browserState.dialogs.recent` 下。
- **Managed-only features** - 批量操作、PDF 导出、下载拦截和 `responsebody` 仍需要托管浏览器路径。

</Accordion>

## 隔离保证

- **专用用户数据目录**：绝不会接触您的个人浏览器配置文件。
- **专用端口**：避免使用 `9222` 以防止与开发工作流发生冲突。
- **确定性标签页控制**：`tabs` 首先返回 `suggestedTargetId`，然后返回稳定的 `tabId` 句柄，如 `t1`、可选标签和原始 `targetId`。
  Agent 应重用 `suggestedTargetId`；原始 id 仍可用于调试和兼容性。

## 浏览器选择

在本地启动时，OpenClaw 会选择第一个可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

你可以使用 `browser.executablePath` 进行覆盖。

平台：

- macOS：检查 macOS`/Applications` 和 `~/Applications`。
- Linux：检查 `/usr/bin`、
  `/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和
  `/usr/lib/chromium-browser` 下常见的 Chrome/Brave/Edge/Chromium 位置，
  以及 `PLAYWRIGHT_BROWSERS_PATH` 或 `~/.cache/ms-playwright` 下由 Playwright 管理的 Chromium。
- Windows：检查常见安装位置。

## 控制 API（可选）

为了进行脚本编写和调试，Gateway(网关)公开了一个仅限环回的小型 **HTTP 控制 API**，以及一个匹配的 Gateway(网关)API`openclaw browser`CLIAPI CLI（快照、引用、等待增强、JSON 输出、调试工作流）。有关完整参考，请参阅 [Browser control API](/zh/tools/browser-control)。

## 故障排除

有关 Linux 特定问题（尤其是 snap Chromium），请参阅[浏览器故障排除](/zh/tools/browser-linux-troubleshooting)。

对于 WSL2 Gateway(网关) + Windows Chrome 分离主机设置，请参阅
[WSL2 + Windows + remote Chrome CDP 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 启动失败与导航 SSRF 阻止

这些是不同的故障类别，它们指向不同的代码路径。

- **CDP 启动或就绪失败** 意味着 OpenClaw 无法确认浏览器控制平面是否正常。
- “Navigation SSRF block”表示浏览器控制平面运行正常，但页面导航目标被策略拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - `Port <port> is in use for profile "<name>" but not by openclaw` 当未配置 `attachOnly: true` 的回环外部 CDP 服务时
- 导航 SSRF 阻止：
  - `open`、`navigate`、快照或打开标签页流程因浏览器/网络策略错误而失败，而 `start` 和 `tabs` 仍然正常工作

使用这个最小序列来区分两者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解读结果：

- 如果 `start` 失败并显示 `not reachable after start`，请首先排查 CDP 就绪状态。
- 如果 `start` 成功但 `tabs` 失败，则控制平面仍然不正常。请将其视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则说明浏览器控制平面已启动，失败原因在于导航策略或目标页面。
- 如果 `start`、`tabs` 和 `open` 都成功，则基本的托管浏览器控制路径是健康的。

重要行为细节：

- 即使您没有配置 `browser.ssrfPolicy`，浏览器配置默认为 fail-closed SSRF 策略对象。
- 对于 local loopback `openclaw`OpenClaw 托管配置文件，CDP 健康检查故意跳过对 OpenClaw 自身本地控制平面的浏览器 SSRF 可达性强制执行。
- 导航保护是分开的。成功的 `start` 或 `tabs` 结果并不意味着允许后续的 `open` 或 `navigate` 目标。

安全指南：

- 默认情况下**切勿**放宽浏览器 SSRF 策略。
- 优先使用较窄的主机例外，例如 `hostnameAllowlist` 或 `allowedHostnames`，而不是广泛的专用网络访问。
- 仅在经过故意信任且需要并已审查私有网络浏览器访问权限的环境中，才使用 `dangerouslyAllowPrivateNetwork: true`。

## Agent 工具 + 控制工作原理

代理获得**一个工具**用于浏览器自动化：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回一个稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 来点击/输入/拖动/选择。
- `browser screenshot` 会捕获像素（整个页面、元素或标记的引用）。
- `browser doctor`Gateway(网关) 检查 Gateway(网关)、插件、配置文件、浏览器和标签页的就绪状态。
- `browser` 接受：
  - `profile` 用于选择命名的浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target` (`sandbox` | `host` | `node`) 以选择浏览器的位置。
  - 在沙箱隔离会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱隔离会话默认为 `sandbox`，非沙箱会话默认为 `host`。
  - 如果连接了具备浏览器功能的节点，除非您固定 `target="host"` 或 `target="node"`，否则该工具可能会自动路由到该节点。

这使代理具有确定性，并避免脆弱的选择器。

## 相关

- [工具概述](/zh/tools) - 所有可用的代理工具
- [沙箱隔离](/zh/gateway/sandboxing) - 沙箱隔离环境中的浏览器控制
- [安全性](/zh/gateway/security) - 浏览器控制风险和加固

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

如果完全缺少 `openclaw browser`，或者代理表示浏览器工具不可用，请跳至 [Missing browser command or 工具](/zh/tools/browser#missing-browser-command-or-tool)。

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

- 浏览器导航和打开标签页在导航前会受到 SSRF 保护，并在最终的 `http(s)` URL 上进行尽力重检。
- 在严格的 SSRF 模式下，远程 CDP 端点发现和 `/json/version` 探测 (`cdpUrl`) 也会被检查。
- Gateway(网关)/提供商 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 环境变量不会自动代理 OpenClaw 托管的浏览器。托管的 Chrome 默认直接启动，因此提供商代理设置不会削弱浏览器 SSRF 检查。
- 要代理托管浏览器本身，请通过 `browser.extraArgs` 传递显式的 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。严格的 SSRF 模式会阻止显式的浏览器代理路由，除非有意启用了专用网络浏览器访问。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认处于关闭状态；仅在有意信任专用网络浏览器访问时才启用它。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为遗留别名仍受支持。

</Accordion>

<Accordion title="Profile behavior">

- `attachOnly: true` 意味着绝不启动本地浏览器；仅当已有浏览器运行时才附加。
- `headless` 可以全局设置或针对每个本地托管配置文件设置。每个配置文件的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头模式，而另一个则保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 请求
  针对本地托管配置文件进行一次性无头启动，而无需重写
  `browser.headless` 或配置文件配置。现有会话、仅附加和
  远程 CDP 配置文件会拒绝该覆盖，因为 OpenClaw 不启动那些
  浏览器进程。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，当环境或配置文件/全局
  配置均未显式选择有头模式时，本地托管配置文件
  会自动默认为无头模式。`openclaw browser status --json`
  会将 `headlessSource` 报告为 `env`、`profile`、`config`、
  `request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 强制当前进程的本地托管启动为无头模式。`OPENCLAW_BROWSER_HEADLESS=0` 强制普通启动为有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；
  显式的 `start --headless` 请求在该次启动中仍然优先。
- `executablePath` 可以全局设置或针对每个本地托管配置文件设置。每个配置文件的值会覆盖 `browser.executablePath`，因此不同的托管配置文件可以启动不同的基于 Chromium 的浏览器。这两种形式都接受 `~` 作为您的操作系统主目录。
- `color`（顶层和每个配置文件）会给浏览器 UI 着色，以便您查看哪个配置文件处于活动状态。
- 默认配置文件是 `openclaw`（托管独立版）。使用 `defaultProfile: "user"` 选择加入已登录用户的浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则使用它；否则依次为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而不是原始 CDP。不要为该驱动程序设置 `cdpUrl`。
- 当现有会话配置文件应附加到非默认的 Chromium 用户配置文件（Brave、Edge 等）时，请设置 `browser.profiles.<name>.userDataDir`。此路径也接受 `~` 作为您的操作系统主目录。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果您的**系统默认**浏览器是基于 Chromium 的（Chrome/Brave/Edge 等），
OpenClaw 会自动使用它。设置 `browser.executablePath` 可覆盖
自动检测。顶层和每个配置文件的 `executablePath` 值接受针对您操作系统主目录的 `~`：

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

每个配置文件的 `executablePath`OpenClaw 仅影响 OpenClaw 启动的本地托管配置文件。`existing-session` 配置文件改为附加到已运行的浏览器，而远程 CDP 配置文件使用 `cdpUrl` 后面的浏览器。

## 本地与远程控制

- **本地控制（默认）：** Gateway(网关) 启动环回控制服务并可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；Gateway(网关) 将浏览器操作代理给它。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl` （或 `browser.cdpUrl`OpenClaw） 以附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。
- 对于回环接口上外部托管的 CDP 服务（例如 Docker 中发布到 Docker`127.0.0.1` 的 Browserless），还需要设置 `attachOnly: true`。没有 `attachOnly`OpenClaw 的回环 CDP 被视为本地由 OpenClaw 托管的浏览器配置文件。
- `headless`OpenClaw 仅影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改现有会话或远程 CDP 浏览器。
- `executablePath` 遵循相同的本地托管配置文件规则。在正在运行的本地托管配置文件上更改它，会将该配置文件标记为重启/协调，以便下次启动时使用新的二进制文件。

停止行为因配置文件模式而异：

- 本地托管配置文件：`openclaw browser stop`OpenClaw 停止 OpenClaw 启动的浏览器进程
- attach-only 和远程 CDP 配置文件：`openclaw browser stop` 会关闭活动
  控制会话并释放 Playwright/CDP 模拟覆盖（视口、
  配色方案、区域设置、时区、离线模式和类似状态），即使
  OpenClaw（OpenClaw）并未启动任何浏览器进程

远程 CDP URL 可以包含身份验证信息：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP Basic 认证（例如 `https://user:pass@provider.example`）

OpenClaw（OpenClaw）在调用 `/json/*` 端点以及连接
到 CDP WebSocket 时会保留身份验证信息。对于令牌，
建议优先使用环境变量或密钥管理器，而不是将其提交
到配置文件中。

## Node 浏览器代理（零配置默认值）

如果您在运行浏览器的机器上运行**节点主机**，OpenClaw 可以自动将浏览器工具调用路由到该节点，而无需任何额外的浏览器配置。这是远程网关的默认路径。

注意事项：

- 节点主机通过**代理命令**暴露其本地浏览器控制服务器。
- 配置文件来自节点自身的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选的。将其留空以使用旧版/默认行为：所有已配置的配置文件仍可通过代理访问，包括配置文件的创建/删除路由。
- 如果您设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 会将其视为最小权限边界：只有列入白名单的配置文件才能成为目标，并且持久化配置文件的创建/删除路由在代理表面上被阻止。
- 如果您不想要它，请禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一项托管的 Chromium 服务，通过 HTTPS 和 WebSocket 公开 CDP 连接 URL。OpenClaw 可以使用其中任何一种形式，但对于远程浏览器配置文件，最简单的选择是 Browserless 连接文档中的直接 WebSocket URL。

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
- 如果 Browserless 提供了 HTTPS 基础 URL，您可以将其转换为 `wss://` 以进行直接 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw 发现 `/json/version`。

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

`browser.profiles.browserless.cdpUrl` 中的地址必须能从
OpenClaw 进程访问。Browserless 还必须通告一个匹配的可访问端点；
将 Browserless `EXTERNAL` 设置为该相同的对 OpenClaw 公开的 WebSocket 基础地址，例如
`ws://127.0.0.1:3000`、`ws://browserless:3000` 或稳定的私有 Docker
网络地址。如果 `/json/version` 返回的 `webSocketDebuggerUrl` 指向
OpenClaw 无法访问的地址，则 CDP HTTP 可能看起来正常，但 WebSocket
连接仍然失败。

对于回环 Browserless 配置文件，请不要让 `attachOnly` 保持未设置状态。如果没有 `attachOnly`OpenClawOpenClaw，OpenClaw 会将回环端口视为本地托管的浏览器配置文件，并可能会报告该端口正在使用但并非由 OpenClaw 拥有。

## 直接 WebSocket CDP 提供商

某些托管浏览器服务公开的是 **直接 WebSocket** 端点，而不是标准的基于 HTTP 的 CDP 发现机制 (`/json/version`OpenClaw)。OpenClaw 接受三种 CDP URL 形式，并会自动选择正确的连接策略：

- **HTTP(S) 发现** - `http://host[:port]` 或 `https://host[:port]`OpenClaw。
  OpenClaw 调用 `/json/version` 来发现 WebSocket 调试器 URL，然后
  进行连接。没有 WebSocket 回退机制。
- **直接 WebSocket 端点** - 带有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`OpenClaw 路径的 `ws://host[:port]/devtools/<kind>/<id>` 或 `wss://...`。OpenClaw 通过 WebSocket 握手直接连接，并完全跳过 `/json/version`。
- **裸 WebSocket 根路径** - 不带 `/devtools/...` 路径的 `ws://host[:port]` 或 `wss://host[:port]`（例如 [Browserless](https://browserless.io)、[Browserbase](https://www.browserbase.com)）。OpenClaw 首先尝试 HTTP `/json/version` 发现（将协议标准化为 `http`/`https`）；如果发现返回 `webSocketDebuggerUrl`，则使用该路径，否则 OpenClaw 会回退到在裸根路径进行直接 WebSocket 握手。如果公布的 WebSocket 端点拒绝 CDP 握手，但配置的裸根路径接受它，OpenClaw 也会回退到该根路径。这允许指向本地 Chrome 的裸 `ws://` 仍然能够连接，因为 Chrome 仅在 `/json/version` 的特定 per-target 路径上接受 WebSocket 升级，而托管提供商在其发现端点公布的短期 URL 不适用于 Playwright CDP 时，仍可使用其根 WebSocket 端点。

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

- [注册](https://www.browserbase.com/sign-up) 并从 [概览仪表板](https://www.browserbase.com/overview) 复制您的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为您真实的 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话。
- 免费层允许每月一个并发会话和一个浏览器小时。有关付费计划的限制，请参阅 [定价](https://www.browserbase.com/pricing)。
- 请参阅 [Browserbase 文档](https://docs.browserbase.com) 以获取完整的 API 参考、SDK 指南和集成示例。

## 安全性

关键概念：

- 浏览器控制仅限本地回环；访问需通过 Gateway(网关) 的身份验证或节点配对。
- 独立的本地回环浏览器 HTTP API **仅使用共享密钥进行身份验证**：
  网关令牌 bearer auth，API`x-openclaw-password`，或使用配置的网关密码进行 HTTP Basic auth。
- Tailscale Serve 身份标头和 Tailscale`gateway.auth.mode: "trusted-proxy"`API **不**对
  此独立的本地回环浏览器 API 进行身份验证。
- 如果启用了浏览器控制且未配置共享密钥身份验证，OpenClaw 将
  为该启动生成一个仅限运行时的网关令牌。如果客户端需要在重启之间拥有稳定的密钥，
  请显式配置 OpenClaw`gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或
  `OPENCLAW_GATEWAY_PASSWORD`。
- 当 `gateway.auth.mode` 已经是 `password`、`none` 或 `trusted-proxy` 时，OpenClaw **不会**自动生成该令牌。
- 请将 Gateway(网关) 和任何节点主机保留在专用网络（Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为机密；优先使用环境变量或机密管理器。

远程 CDP 提示：

- 尽可能优先使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期令牌直接嵌入配置文件中。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-managed**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录和 CDP 端口
- **remote**：一个显式的 CDP URL（在别处运行的基于 Chromium 的浏览器）
- **existing 会话**：通过 Chrome DevTools MCP 自动连接您现有的 Chrome 个人资料

默认值：

- 如果缺失，`openclaw` 个人资料将自动创建。
- `user` 个人资料是内置的，用于 Chrome MCP 现有会话附加。
- 除了 `user` 之外，现有会话个人资料是可选加入的；请使用 `--driver existing-session` 创建它们。
- 默认情况下，本地 CDP 端口从 **18800-18899** 分配。
- 删除个人资料会将其本地数据目录移至废纸篓。

所有控制端点都接受 `?profile=<name>`CLI；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 连接现有会话

OpenClaw 还可以通过官方 Chrome DevTools MCP 服务器连接到正在运行的基于 Chromium 的浏览器配置文件。这会重用该浏览器配置文件中已打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser 会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果您需要不同的名称、颜色或浏览器数据目录，可以创建您自己的自定义现有会话配置文件。

默认行为：

- 内置的 `user` 配置文件使用 Chrome MCP 自动连接功能，该功能针对默认的本地 Google Chrome 配置文件。

针对 Brave、Edge、Chromium 或非默认的 Chrome 个人资料，请使用 `userDataDir`。
`~` 会扩展为您的操作系统主目录：

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

常见的检查页面：

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

实时附加冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功的样子：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出您已打开的浏览器标签页
- `snapshot` 从选定的实时标签页返回引用

如果附加失败，请检查以下事项：

- 目标基于 Chromium 的浏览器版本为 `144+`
- 该浏览器的检查页面中已启用远程调试
- 浏览器已显示附加同意提示，并且您已接受
- `openclaw doctor` 迁移旧的基于扩展的浏览器配置，并检查是否在本地安装了 Chrome 以用于默认自动连接配置，但它无法为您启用浏览器端的远程调试

Agent 用法：

- 当您需要用户的已登录浏览器状态时，请使用 `profile="user"`。
- 如果您使用自定义的现有会话配置文件，请传递该显式配置文件名称。
- 仅当用户在计算机前批准附加提示时，才选择此模式。
- Gateway(网关)或节点主机可以生成 Gateway(网关)`npx chrome-devtools-mcp@latest --autoConnect`

注意：

- 此路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在您已登录的浏览器会话中执行操作。
- OpenClaw 不会为此驱动程序启动浏览器；它仅进行连接。
- OpenClaw 在此处使用官方的 Chrome DevTools MCP OpenClaw`--autoConnect` 流程。如果设置了 `userDataDir`，它将被传递以定位该用户数据目录。
- 现有会话可以连接到所选主机或通过连接的浏览器节点进行连接。如果 Chrome 位于其他位置且未连接浏览器节点，请改用远程 CDP 或节点主机。

### 自定义 Chrome MCP 启动

当默认的 `npx chrome-devtools-mcp@latest` 流程不符合你的需求时（例如离线主机、固定版本、自带二进制文件），按配置文件覆盖生成的 Chrome DevTools MCP 服务器：

| 字段         | 作用                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `mcpCommand` | 要生成的可执行文件，用于替代 `npx`。按原样解析；支持绝对路径。                                     |
| `mcpArgs`    | 按原样传递给 `mcpCommand` 的参数数组。替换默认的 `chrome-devtools-mcp@latest --autoConnect` 参数。 |

当在现有会话配置文件上设置了 `cdpUrl` 时，OpenClaw 会跳过
`--autoConnect` 并自动将端点转发给 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>` (DevTools HTTP 发现端点)。
- `ws(s)://...` → `--wsEndpoint <url>` (直接 CDP WebSocket)。

端点标志和 `userDataDir` 不能组合使用：当设置了 `cdpUrl` 时，
`userDataDir` 在启动 Chrome MCP 时会被忽略，因为 Chrome MCP 会附加到
端点背后的运行中浏览器，而不是打开配置文件
directory。

<Accordion title="Existing-会话 功能限制">

与托管 `openclaw` 配置文件相比，现有会话驱动程序受到更多限制：

- **Screenshots（截图）** - 页面捕获和 `--ref` 元素捕获有效；CSS `--element` 选择器无效。`--full-page` 不能与 `--ref` 或 `--element` 结合使用。页面或基于引用的元素截图不需要 Playwright。
- **Actions（操作）** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照引用（不支持 CSS 选择器）。`click-coords` 点击可见视口坐标，不需要快照引用。`click` 仅限左键。`type` 不支持 `slowly=true`；请使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持每次调用的超时。`select` 接受单个值。
- **Wait / upload / dialog（等待 / 上传 / 对话框）** - `wait --url` 支持精确、子字符串和 glob 模式；不支持 `wait --load networkidle`。上传钩子需要 `ref` 或 `inputRef`，每次一个文件，不支持 CSS `element`。对话框钩子不支持超时覆盖。
- **Managed-only features（仅限托管功能）** - 批量操作、PDF 导出、下载拦截和 `responsebody` 仍需要托管浏览器路径。

</Accordion>

## 隔离保证

- **专用用户数据目录**：绝不涉及您的个人浏览器配置文件。
- **专用端口**：避免 `9222` 以防止与开发工作流发生冲突。
- **确定性标签页控制**：`tabs` 首先返回 `suggestedTargetId`，然后
  是稳定的 `tabId` 句柄，如 `t1`、可选标签以及原始 `targetId`。
  代理应重用 `suggestedTargetId`；原始 ID 保留用于
  调试和兼容性。

## 浏览器选择

在本地启动时，OpenClaw 会选择第一个可用的浏览器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 进行覆盖。

支持的平台：

- macOS：检查 macOS`/Applications` 和 `~/Applications`。
- Linux：检查 LinuxBrave`/usr/bin` 下的常见 Chrome/Brave/Edge/Chromium 位置，
  `/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和
  `/usr/lib/chromium-browser`，以及 `PLAYWRIGHT_BROWSERS_PATH` 或 `~/.cache/ms-playwright` 下的 Playwright 管理的 Chromium。
- Windows：检查常见安装位置。

## 控制 API（可选）

对于脚本编写和调试，Gateway(网关) 暴露了一个小型 **仅限本地回环的 HTTP
控制 API** 以及匹配的 Gateway(网关)API`openclaw browser`CLIAPI CLI（快照、引用、等待
增强功能、JSON 输出、调试工作流）。请参阅
[Browser control API](/zh/tools/browser-control) 以获取完整参考。

## 故障排除

对于 Linux 特定问题（尤其是 snap 版 Chromium），请参阅
[Browser 故障排除](Linux/en/tools/browser-linux-troubleshooting)。

对于 WSL2 Gateway + Windows Chrome 分离主机设置，请参阅
[WSL2 + Windows + remote Chrome CDP 故障排除](<WSL2Gateway(网关)WindowsWSL2Windows/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting>)。

### CDP 启动失败与导航 SSRF 阻止

这些是不同的失败类别，它们指向不同的代码路径。

- **CDP 启动或就绪失败** 意味着 OpenClaw 无法确认浏览器控制平面是否健康。
- **导航 SSRF 阻止** 意味着浏览器控制平面是健康的，但页面导航目标被策略拒绝了。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - 当配置了回环外部 CDP 服务但没有 `attachOnly: true` 时的 `Port <port> is in use for profile "<name>" but not by openclaw`
- 导航 SSRF 阻止：
  - `open`、`navigate`、快照或打开标签页的流程因浏览器/网络策略错误而失败，而 `start` 和 `tabs` 仍然有效

使用这个最少的序列来区分两者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解读结果：

- 如果 `start` 失败并出现 `not reachable after start`，请首先排查 CDP 就绪情况。
- 如果 `start` 成功但 `tabs` 失败，则控制平面仍然不正常。请将此视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则浏览器控制平面已启动，故障出在导航策略或目标页面上。
- 如果 `start`、`tabs` 和 `open` 全部成功，则基本的受管浏览器控制路径是正常的。

重要的行为细节：

- 即使您未配置 `browser.ssrfPolicy`，浏览器配置默认也会采用一个默认拒绝（fail-closed）的 SSRF 策略对象。
- 对于 local loopback `openclaw` 托管配置文件，CDP 健康检查故意跳过对 OpenClaw 自身本地控制平面的浏览器 SSRF 可达性强制执行。
- 导航保护是分开的。成功的 `start` 或 `tabs` 结果并不意味着允许后续的 `open` 或 `navigate` 目标。

安全指南：

- 默认情况下**请勿**放宽浏览器 SSRF 策略。
- 优先使用 `hostnameAllowlist` 或 `allowedHostnames` 等狭窄的主机例外，而不是广泛的私有网络访问。
- 仅在经过审查且需要私有网络浏览器访问的故意信任环境中使用 `dangerouslyAllowPrivateNetwork: true`。

## Agent 工具 + 控制工作原理

Agent 获得**一个工具**用于浏览器自动化：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 进行点击/输入/拖动/选择。
- `browser screenshot` 捕获像素（整页、元素或标记的引用）。
- `browser doctor` 检查 Gateway(网关)、插件、配置文件、浏览器和标签页的就绪状态。
- `browser` 接受：
  - `profile` 用于选择命名的浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target` (`sandbox` | `host` | `node`) 用于选择浏览器的运行位置。
  - 在沙箱隔离会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱隔离会话默认为 `sandbox`，非沙箱会话默认为 `host`。
  - 如果连接了具备浏览器功能的节点，除非您固定 `target="host"` 或 `target="node"`，否则该工具可能会自动路由到该节点。

这保持了代理的确定性，并避免使用脆弱的选择器。

## 相关

- [工具概述](/zh/tools) - 所有可用的代理工具
- [沙箱隔离](/zh/gateway/sandboxing) - 在沙箱隔离环境中的浏览器控制
- [安全性](/zh/gateway/security) - 浏览器控制的风险与加固

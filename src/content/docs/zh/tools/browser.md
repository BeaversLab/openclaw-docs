---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "OpenClaw浏览器（OpenClaw 托管）"
---

OpenClaw 可以运行一个由代理控制的 **专用 Chrome/BraveGateway(网关)/Edge/Chromium 配置文件**。
它与您的个人浏览器隔离，并通过 Gateway(网关) 内部的一个小型本地控制服务（仅限环回）进行管理。

初学者视角：

- 可以将其视为一个 **独立的、仅限代理使用的浏览器**。
- `openclaw` 配置文件 **不会** 触及您的个人浏览器配置文件。
- 代理可以在安全通道中 **打开标签页、阅读页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到您真实的、已登录的 Chrome 会话。

## 你将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认为橙色强调）。
- 确定性标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖动/选择）、快照、屏幕截图、PDF。
- 一个内置的 `browser-automation` 技能，用于在启用浏览器插件时教​​会代理快照、稳定标签页、过期引用和手动阻止程序恢复循环。
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

如果完全缺少 `openclaw browser`，或者代理说浏览器工具不可用，请跳转到 [Missing browser command or 工具](/zh/tools/browser#missing-browser-command-or-tool)。

## 插件控制

默认的 `browser` 工具是内置插件。禁用它，然后将其替换为注册了相同 `browser` 工具名称的其他插件：

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

默认值需要同时具备 `plugins.entries.browser.enabled` **和** `browser.enabled=true`。仅禁用插件会将 `openclaw browser`CLI CLI、`browser.request` 网关方法、agent 工具 以及控制服务作为一个整体移除；您的 `browser.*` 配置将保持不变，以备替换。

浏览器配置的更改需要重启 Gateway(网关)，以便插件可以重新注册其服务。

## 代理指南

工具配置文件说明：`tools.profile: "coding"` 包括 `web_search` 和 `web_fetch`，但不包括完整的 `browser` 工具。如果代理或生成的子代理应该使用浏览器自动化，请在配置文件阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

对于单个代理，请使用 `agents.list[].tools.alsoAllow: ["browser"]`。
单独使用 `tools.subagents.tools.allow: ["browser"]` 是不够的，因为子代理
策略是在配置文件过滤之后应用的。

浏览器插件提供了两个级别的代理指导：

- `browser` 工具描述包含紧凑的始终生效的约定：选择正确的配置文件，将引用保持在同一标签页上，使用 `tabId`/labels 进行标签页定位，并为多步骤工作加载浏览器技能。
- 捆绑的 `browser-automation` 技能承载了更长的操作循环：
  首先检查状态/标签页，标记任务标签页，在操作前进行快照，在 UI 更改后重新快照，
  恢复一次失效的引用，并将登录/2FA/验证码或
  摄像头/麦克风拦截器报告为手动操作，而不是猜测。

当启用插件时，插件附带的技术会列在代理的可用技能中。完整的技能指令会按需加载，因此常规轮次不会承担完整的令牌（token）成本。

## 缺少浏览器命令或工具

如果升级后 `openclaw browser` 未知，缺少 `browser.request`，或者代理报告浏览器工具不可用，通常原因是 `plugins.allow` 列表省略了 `browser` 且不存在根 `browser` 配置块。请添加：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

明确的根 `browser` 块，例如 `browser.enabled=true` 或 `browser.profiles.<name>`，即使在限制性 `plugins.allow` 下也会激活内置浏览器插件，这与渠道配置行为一致。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能替代白名单成员资格。完全移除 `plugins.allow` 也会恢复默认设置。

## 配置文件：`openclaw` vs `user`

- `openclaw`：托管、隔离的浏览器（无需扩展）。
- `user`：用于您已登录的真实 **Chrome** 会话的内置 Chrome MCP 附加配置文件。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有的登录会话很重要且用户在计算机旁边点击/批准任何附加提示时，首选 `profile="user"`。
- `profile` 是当你想要特定浏览器模式时的显式覆盖选项。

如果您希望默认使用托管模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置位于 `~/.openclaw/openclaw.json`。

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

### 截图视觉（仅文本模型支持）

当主模型是仅文本的（不支持视觉/多模态）时，浏览器截图会返回模型无法读取的图像块。浏览器截图复用现有的图像理解配置，因此为媒体理解配置的图像模型可以在没有任何特定于浏览器的模型设置的情况下，以文本形式描述截图。

```json5
{
  tools: {
    media: {
      image: {
        models: [
          { provider: "bytedance", model: "doubao-seed-2.0-pro" },
          // Add fallback candidates; first success wins
          { provider: "openai", model: "gpt-4o" },
        ],
      },
      // Shared media models also work when tagged for image support.
      // models: [{ provider: "openai", model: "gpt-4o", capabilities: ["image"] }],
    },
  },
  agents: {
    defaults: {
      // Existing image-model defaults are also honored.
      // imageModel: { primary: "openai/gpt-4o" },
    },
  },
}
```

**工作原理：**

1. Agent 调用 `browser screenshot` → 像往常一样捕获图像到磁盘。
2. 浏览器工具会询问现有的图像理解运行时，它是否可以使用配置的媒体图像模型、共享媒体模型、图像模型默认值或支持身份验证的图像提供商来描述屏幕截图。
3. 视觉模型返回文本描述，该描述被
   `wrapExternalContent`（提示词注入防护）包裹，并作为文本块
   而非图像块返回给代理。
4. 如果图像理解不可用、被跳过或失败，浏览器将回退到返回原始图像块。

使用现有的 `tools.media.image` / `tools.media.models` 字段进行模型回退、超时、字节限制、配置文件以及提供商请求设置。

如果当前启用的主模型已经支持视觉功能，并且未配置显式的图像理解模型，OpenClaw 将保留正常的图像结果，以便主模型能够直接读取屏幕截图。

<AccordionGroup>

<Accordion title="端口和可达性">

- 控制服务绑定到从 `gateway.port` 派生的端口的环回接口（默认 `18791` = gateway + 2）。覆盖 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 会将同一系列中的派生端口进行偏移。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；仅在远程 CDP 时设置这些值。如果未设置，`cdpUrl` 默认为受管的本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程和 `attachOnly` CDP HTTP 可达性
  检查以及打开标签页的 HTTP 请求；`remoteCdpHandshakeTimeoutMs` 适用于
  它们的 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本地启动的受管 Chrome
  进程公开其 CDP HTTP 端点的预算。`localCdpReadyTimeoutMs` 是
  发现进程后 CDP websocket 就绪状态的后续预算。在 Raspberry Pi、低端 VPS 或 Chromium
  启动缓慢的旧硬件上，请调高这些值。值必须是高达 `120000`OpenClawGateway(网关) ms 的正整数；无效的
  配置值将被拒绝。
- 针对每个配置文件，重复的受管 Chrome 启动/就绪失败会触发熔断。在连续多次失败后，OpenClaw 会短暂暂停新的启动
  尝试，而不是在每次浏览器工具调用时都生成 Chromium。请修复
  启动问题，如果不需要则禁用浏览器，或者在修复后重启
  Gateway。
- `actionTimeoutMs` 是当调用者未传递 `timeoutMs` 时，浏览器 `act` 请求的默认预算。客户端传输层会添加一个较小的缓冲窗口，以便长等待可以完成，而不是在 HTTP 边界处超时。
- `tabCleanup` 是对由主代理浏览器会话打开的标签页进行的尽力清理。子代理、cron 和 ACP 生命周期清理仍会在会话结束时关闭其显式跟踪的标签页；主会话保持活动标签页可重用，然后在后台关闭空闲或多余的跟踪标签页。

</Accordion>

<Accordion title="SSRF 策略">

- 浏览器导航和打开标签页在导航前会受到 SSRF 防护，并在最终的 `http(s)` URL 上尽最大努力进行重新检查。
- 在严格 SSRF 模式下，也会检查远程 CDP 端点发现和 `/json/version` 探测 (`cdpUrl`Gateway(网关))。
- Gateway(网关)/提供商 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY`OpenClawOpenClaw 环境变量不会自动代理 OpenClaw 管理的浏览器。受管 Chrome 默认直接启动，因此提供商代理设置不会削弱浏览器 SSRF 检查。
- OpenClaw 管理的本地 CDP 就绪探测和 DevTools WebSocket 连接会绕过托管网络代理，连接到确切启动的环回端点，因此当操作员代理阻止环回出口时，`openclaw browser start` 仍然有效。
- 要代理托管浏览器本身，请通过 `browser.extraArgs` 传递显式 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。严格 SSRF 模式会阻止显式浏览器代理路由，除非有意启用了专用网络浏览器访问。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认关闭；仅在有意信任专用网络浏览器访问时启用。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为传统别名仍然受支持。

</Accordion>

<Accordion title="配置文件行为">

- `attachOnly: true` 意味着从不启动本地浏览器；仅在已有浏览器运行时进行附加。
- `headless` 可以全局设置，也可以为每个本地托管配置文件设置。每个配置文件的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头模式，而另一个保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 请求为本地托管配置文件进行一次性无头启动，而无需重写
  `browser.headless` 或配置文件配置。现有会话、仅附加和
  远程 CDP 配置文件会拒绝此覆盖，因为 OpenClaw 不会启动
  这些浏览器进程。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，当环境或配置文件/全局配置未显式选择有头模式时，本地托管配置文件会默认自动采用无头模式。`openclaw browser status --json`
  会将 `headlessSource` 报告为 `env`、`profile`、`config`、
  `request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 强制当前进程的本地托管启动以无头模式运行。`OPENCLAW_BROWSER_HEADLESS=0` 强制普通启动采用有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；显式的 `start --headless` 请求对于该次启动仍然优先。
- `executablePath` 可以全局设置，也可以为每个本地托管配置文件设置。每个配置文件的值会覆盖 `browser.executablePath`，因此不同的托管配置文件可以启动不同的基于 Chromium 的浏览器。两种形式都接受 `~` 作为您操作系统的主目录。
- `color`（顶层和每个配置文件）会给浏览器 UI 着色，以便您查看哪个配置文件处于活动状态。
- 默认配置文件是 `openclaw`（托管独立版）。使用 `defaultProfile: "user"` 以选择已登录用户的浏览器。
- 自动检测顺序：如果基于 Chromium，则为系统默认浏览器；否则为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而不是原始 CDP。请勿为该驱动程序设置 `cdpUrl`。
- 当现有会话配置文件应附加到非默认 Chromium 用户配置文件（Brave、Edge 等）时，请设置 `browser.profiles.<name>.userDataDir`。此路径也接受 `~` 作为您操作系统的主目录。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果您的**系统默认**浏览器是基于 Chromium 的（Chrome/Brave/Edge 等），
OpenClaw 会自动使用它。设置 `browser.executablePath` 以覆盖
自动检测。顶层和每个配置文件的 `executablePath` 值接受 `~`
作为您的操作系统主目录：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

或者在配置中根据平台进行设置：

<Tabs>
  <Tab title="macOSmacOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="WindowsWindows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="LinuxLinux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

每个 `executablePath`OpenClaw 仅影响 OpenClaw 启动的本地托管配置文件。`existing-session` 配置文件改为附加到已在运行的浏览器，而远程 CDP 配置文件则使用 `cdpUrl` 后面的浏览器。

## 本地与远程控制

- **本地控制（默认）：** Gateway(网关) 启动回环控制服务，并可启动本地浏览器。
- **远程控制（节点主机）：**在拥有浏览器的机器上运行一个节点主机；Gateway(网关) 将浏览器操作代理给它。
- **Remote CDP:** 设置 `browser.profiles.<name>.cdpUrl` (或 `browser.cdpUrl`) 以
  连接到远程的基于 Chromium 的浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。
- 对于位于回环接口的外部管理的 CDP 服务（例如 Docker 中的 Browserless 发布到 Docker`127.0.0.1`），还需要设置 `attachOnly: true`。没有 `attachOnly`OpenClaw 的回环 CDP 被视为本地 OpenClaw 管理的浏览器配置文件。
- `headless`OpenClaw 仅影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改现有会话或远程 CDP 浏览器。
- `executablePath` 遵循相同的本地托管配置文件规则。在正在运行的本地托管配置文件上更改它，会将该配置文件标记为需要重启/重新协调，以便下次启动时使用新的二进制文件。

停止行为因配置文件模式而异：

- 本地托管配置文件：`openclaw browser stop` 停止
  OpenClaw 启动的浏览器进程
- attach-only 和远程 CDP 配置文件：`openclaw browser stop` 关闭活动的
  控制会话并释放 Playwright/CDP 模拟覆盖（视口、
  配色方案、语言环境、时区、离线模式及类似状态），即
  便没有任何浏览器进程是由 OpenClaw 启动的

远程 CDP URL 可以包含认证：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP Basic 认证（例如 `https://user:pass@provider.example`）

当调用 `/json/*` 端点以及连接到 CDP WebSocket 时，OpenClaw 会保留身份验证。对于令牌，请优先使用环境变量或机密管理器，而不是将其提交到配置文件中。

## Node 浏览器代理（零配置默认值）

如果您在拥有浏览器的机器上运行 **节点主机 (node host)**，OpenClaw 可以
将浏览器工具调用自动路由到该节点，而无需任何额外的浏览器配置。
这是远程网关的默认路径。

注意：

- 节点主机通过 **代理命令 (proxy command)** 暴露其本地浏览器控制服务器。
- 配置文件来自节点自己的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选的。将其留空以使用旧版/默认行为：所有已配置的配置文件均可通过代理访问，包括配置文件的创建/删除路由。
- 如果您设置了 `nodeHost.browserProxy.allowProfiles`OpenClaw，OpenClaw 会将其视为最低权限边界：只有允许列表中的配置文件才能被定位，并且在代理表面上会阻止持久化配置文件的创建/删除路由。
- 如果不需要，请禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管的远程 CDP）

[Browserless](https://browserless.io) 是一项托管的 Chromium 服务，通过 HTTPS 和 WebSocket 暴露 CDP 连接 URL。OpenClaw 可以使用其中任何一种形式，但对于远程浏览器配置文件，最简单的选项是 Browserless 连接文档中的直接 WebSocket URL。

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

- 将 `<BROWSERLESS_API_KEY>` 替换为您的真实 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（请参阅其文档）。
- 如果 Browserless 提供的是 HTTPS 基础 URL，您可以将其转换为 `wss://`OpenClaw 以建立直接的 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw 发现 `/json/version`。

### 同一主机上的 Browserless Docker

当 Browserless 在 Docker 中自托管，且 OpenClaw 在主机上运行时，请将 Browserless 视为外部托管的 CDP 服务：

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

`browser.profiles.browserless.cdpUrl` 中的地址必须能被 OpenClaw 进程访问。Browserless 还必须通告一个匹配的可达端点；将 Browserless `EXTERNAL` 设置为对 OpenClaw 公开的相同 WebSocket 基础地址，例如 `ws://127.0.0.1:3000`、`ws://browserless:3000` 或稳定的私有 Docker 网络地址。如果 `/json/version` 返回 `webSocketDebuggerUrl` 指向 OpenClaw 无法访问的地址，则 CDP HTTP 可能看起来正常，但 WebSocket 附加仍然失败。

对于回环 Browserless 配置文件，请勿将 `attachOnly` 留空。如果没有
`attachOnly`OpenClawOpenClaw，OpenClaw 会将回环端口视为本地托管浏览器
配置文件，并可能会报告该端口正在使用但不归 OpenClaw 所有。

## 直接 WebSocket CDP 提供商

某些托管浏览器服务提供 **直接 WebSocket** 端点，而不是标准的基于 HTTP 的 CDP 发现（`/json/version`）。OpenClaw 接受三种 CDP URL 形式，并自动选择正确的连接策略：

- **HTTP(S) 发现** - `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 调用 `/json/version` 来发现 WebSocket 调试器 URL，然后
  进行连接。不回退到 WebSocket。
- **Direct WebSocket endpoints** - `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...` 配合 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`OpenClaw
  路径。OpenClaw 通过 WebSocket 握手直接连接，并完全跳过
  `/json/version`。
- **裸 WebSocket 根路径** - 不带 `/devtools/...` 路径的 `ws://host[:port]` 或 `wss://host[:port]`（例如 [Browserless](https://browserless.io)、[Browserbase](https://www.browserbase.com)）。OpenClaw 首先尝试 HTTP `/json/version` 发现（将协议标准化为 `http`/`https`）；如果发现返回 `webSocketDebuggerUrl`，则使用它，否则 OpenClaw 回退到裸根路径上的直接 WebSocket 握手。如果通告的 WebSocket 端点拒绝 CDP 握手，但配置的裸根路径接受它，OpenClaw 也会回退到该根路径。这允许指向本地 Chrome 的裸 `ws://` 仍然可以连接，因为 Chrome 仅接受来自 `/json/version` 的特定于目标的路径上的 WebSocket 升级，而托管提供商在其发现端点通告了一个不适合 Playwright CDP 的短期 URL 时，仍然可以使用其根 WebSocket 端点。

`openclaw browser doctor` 使用与运行时附加相同的发现优先、WebSocket 回退逻辑，因此能够成功连接的根 URL 不会被诊断程序报告为不可访问。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行无头浏览器的云平台，内置验证码解决方案、隐身模式和住宅代理。

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

注：

- [注册](https://www.browserbase.com/sign-up) 并从 [概览仪表板](https://www.browserbase.com/overview) 复制您的 **API Key**。
- 将 `<BROWSERBASE_API_KEY>` 替换为您的真实 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话。
- 免费版允许每月一个并发会话和一个浏览器使用小时。请参阅 [定价](https://www.browserbase.com/pricing) 了解付费计划的限制。
- 有关完整的 API 参考、SDK 指南和集成示例，请参阅 [Browserbase 文档](https://docs.browserbase.com)。

### Notte

[Notte](https://www.notte.cc) 是一个用于运行无头浏览器的云平台，内置隐身模式、住宅代理以及原生 CDP WebSocket 网关。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
        color: "#7C3AED",
      },
    },
  },
}
```

笔记：

- [注册](https://console.notte.cc) 并从控制台设置页面复制您的 **API 密钥**。
- 将 `<NOTTE_API_KEY>` 替换为您真实的 Notte API 密钥。
- Notte 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话的步骤。当 WebSocket 断开连接时，该会话将被销毁。
- 免费层允许 5 个并发会话和 100 个终身浏览器使用小时。请参阅 [定价](https://www.notte.cc/#pricing) 了解付费计划的限制。
- 查看 [Notte 文档](https://docs.notte.cc) 以获取完整的 API 参考、SDK
  指南和集成示例。

## 安全性

核心概念：

- 浏览器控制仅限本地回环；访问需通过 Gateway(网关) 的身份验证或节点配对。
- 独立的回环浏览器 HTTP API 仅使用**共享密钥认证**：
  网关令牌 bearer 认证、`x-openclaw-password` 或使用已配置的网关密码进行 HTTP Basic 认证。
- Tailscale Serve 身份标头和 Tailscale`gateway.auth.mode: "trusted-proxy"`API **不** 对此独立的环回浏览器 API 进行身份验证。
- 如果启用了浏览器控制且未配置共享密钥身份验证，OpenClaw
  会为该启动生成一个仅限运行时的网关令牌。如果客户端需要在重启之间拥有稳定的密钥，请显式配置
  `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或
  `OPENCLAW_GATEWAY_PASSWORD`。
- OpenClaw **不会**在 `gateway.auth.mode` 已经是 `password`、`none` 或 `trusted-proxy` 时自动生成该令牌。
- 将Gateway(网关)和任何节点主机保持在专用网络（Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为机密；优先使用环境变量或机密管理器。

远程 CDP 提示：

- 尽可能首选加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期有效的令牌直接嵌入配置文件中。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-managed**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录 + CDP 端口
- **remote**：一个显式的 CDP URL（在别处运行的基于 Chromium 的浏览器）
- **现有会话**：你现有的 Chrome 个人资料，通过 Chrome DevTools MCP 自动连接

默认值：

- 如果缺少 `openclaw` 配置文件，则会自动创建。
- `user` 配置文件是内置的，用于 Chrome MCP 现有会话连接。
- 除了 `user` 之外，现有会话配置文件是可选加入的；使用 `--driver existing-session` 创建它们。
- 本地 CDP 端口默认从 **18800-18899** 开始分配。
- 删除配置文件会将其本地数据目录移至废纸篓。

所有控制端点都接受 `?profile=<name>`CLI；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 获取现有会话

OpenClaw 也可以通过官方的 Chrome DevTools MCP 服务器连接到正在运行的基于 Chromium 的浏览器配置文件。这将复用该浏览器配置文件中已打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome 开发者：在您的浏览器会话中使用 Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果您希望使用不同的名称、颜色或浏览器数据目录，可以创建您自己的自定义现有会话配置文件。

默认行为：

- 内置的 `user` 配置文件使用 Chrome MCP 自动连接，其目标是默认的本地 Google Chrome 配置文件。

对于 Brave、Edge、Chromium 或非默认的 Chrome 配置文件，请使用 `userDataDir`Brave。
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

1. 打开该浏览器的检查页面以进行远程调试。
2. 启用远程调试。
3. 保持浏览器运行，当 OpenClaw 附加时批准连接提示。

常用检查页面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave：Brave`brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

实时附着冒烟测试：

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

如果 attach 不起作用，请检查以下事项：

- 目标基于 Chromium 的浏览器版本为 `144+`
- 该浏览器的检查页面中已启用远程调试
- 浏览器显示，并且您接受了附加同意提示
- `openclaw doctor` 会迁移旧的基于扩展的浏览器配置，并检查本地是否安装了 Chrome 以用于默认的自动连接配置文件，但它无法为您启用浏览器端的远程调试

代理使用：

- 当您需要用户的已登录浏览器状态时，请使用 `profile="user"`。
- 如果您使用自定义现有会话配置文件，请传递该显式的配置文件名称。
- 仅当用户在计算机旁并批准附加提示时，才选择此模式。
- Gateway(网关) 或节点主机可以生成 Gateway(网关)`npx chrome-devtools-mcp@latest --autoConnect`

注：

- 此路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在您已登录的浏览器会话中操作。
- OpenClaw 不会为此驱动程序启动浏览器；它只会附加。
- OpenClaw 在此使用官方的 Chrome DevTools MCP OpenClaw`--autoConnect` 流程。如果设置了 `userDataDir`，它将被传递到目标用户数据目录。
- 现有的会话可以附加到选定的主机或通过连接的浏览器节点进行附加。如果 Chrome 位于其他地方且未连接浏览器节点，请改用远程 CDP 或节点主机。

### 自定义 Chrome MCP 启动

当默认的 `npx chrome-devtools-mcp@latest` 流程不符合你的需求时（例如离线主机、固定版本、内置二进制文件），按配置文件覆盖生成的 Chrome DevTools MCP 服务器：

| 字段         | 它的作用                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `mcpCommand` | 代替 `npx` 生成（spawn）的可执行文件。按原样解析；绝对路径有效。                                 |
| `mcpArgs`    | 原样传递给 `mcpCommand` 的参数数组。替换默认的 `chrome-devtools-mcp@latest --autoConnect` 参数。 |

当在现有会话配置文件上设置 `cdpUrl`OpenClaw 时，OpenClaw 会跳过
`--autoConnect` 并自动将端点转发到 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>` (DevTools HTTP 发现端点)。
- `ws(s)://...` → `--wsEndpoint <url>` (直接 CDP WebSocket)。

Endpoint 标志和 `userDataDir` 不能组合使用：当设置了 `cdpUrl` 时，Chrome MCP 启动会忽略 `userDataDir`，因为 Chrome MCP 会附加到 endpoint 后面的运行中浏览器，而不是打开一个配置文件目录。

<Accordion title="现有会话功能的限制">

与托管的 `openclaw` 配置文件相比，现有会话驱动程序受到更多限制：

- **截图** - 页面捕获和 `--ref` 元素捕获有效；CSS `--element` 选择器无效。`--full-page` 不能与 `--ref` 或 `--element` 结合使用。页面或基于引用的元素截图不需要 Playwright。
- **操作** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照引用（不支持 CSS 选择器）。`click-coords` 点击可见视口坐标，不需要快照引用。`click` 仅限左键。`type` 不支持 `slowly=true`；请使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持每次调用的超时设置。`select` 接受单个值。
- **等待 / 上传 / 对话框** - `wait --url` 支持精确、子字符串和 glob 模式；不支持 `wait --load networkidle`。上传钩子需要 `ref` 或 `inputRef`，一次一个文件，不支持 CSS `element`。对话框钩子不支持超时覆盖或 `dialogId`。
- **对话框可见性** - 托管浏览器操作响应包含 `blockedByDialog` 和 `browserState.dialogs.pending`，当操作打开模态对话框时；快照还包含待处理的对话框状态。当对话框待处理时，使用 `browser dialog --accept/--dismiss --dialog-id <id>` 响应。在 OpenClaw 之外处理的对话框显示在 `browserState.dialogs.recent` 下。
- **仅托管功能** - 批量操作、PDF 导出、下载拦截和 `responsebody` 仍然需要托管浏览器路径。

</Accordion>

## 隔离保证

- **专用用户数据目录**：绝不会触及您的个人浏览器配置文件。
- **专用端口**：避免使用 `9222` 以防止与开发工作流发生冲突。
- **确定性标签页控制**：`tabs` 首先返回 `suggestedTargetId`，然后是稳定的 `tabId` 句柄（如 `t1`）、可选标签以及原始 `targetId`。
  Agent 应重用 `suggestedTargetId`；原始 ID 仍可用于调试和兼容性。

## 浏览器选择

在本地启动时，OpenClaw 会选择第一个可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 进行覆盖。

平台：

- macOS：检查 macOS`/Applications` 和 `~/Applications`。
- Linux：检查 `/usr/bin`、
  `/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和
  `/usr/lib/chromium-browser` 下常见的 Chrome/Brave/Edge/Chromium 位置，以及位于
  `PLAYWRIGHT_BROWSERS_PATH` 或 `~/.cache/ms-playwright` 的 Playwright 托管 Chromium。
- Windows：检查常见安装位置。

## 控制 API (可选)

用于脚本和调试，Gateway（网关）会开放一个仅限本地回环的小型 HTTP 控制 API，以及配套的 Gateway(网关)API`openclaw browser`CLIAPI CLI（快照、引用、等待增强、JSON 输出、调试工作流）。完整参考请参阅[浏览器控制 API](/zh/tools/browser-control)。

## 故障排除

有关 Linux 特定问题（尤其是 snap Chromium），请参阅
[浏览器故障排除](/zh/tools/browser-linux-troubleshooting)。

对于 WSL2 Gateway(网关) + Windows Chrome 分离主机设置，请参阅
[WSL2 + Windows + remote Chrome CDP 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 启动失败与导航 SSRF 阻止

这些是不同的失败类别，它们指向不同的代码路径。

- **CDP 启动或就绪失败** 意味着 OpenClaw 无法确认浏览器控制平面运行正常。
- **Navigation SSRF block** 意味着浏览器控制平面是健康的，但页面导航目标被策略拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - 当配置了没有 `attachOnly: true` 的环回外部 CDP 服务时，`Port <port> is in use for profile "<name>" but not by openclaw`
- 导航 SSRF 阻断：
  - `open`、`navigate`、snapshot 或打开标签页的操作因浏览器/网络策略错误而失败，而 `start` 和 `tabs` 仍然正常工作

使用这个最小顺序将两者分开：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解读结果：

- 如果 `start` 失败并出现 `not reachable after start`，请首先排查 CDP 准备情况。
- 如果 `start` 成功但 `tabs` 失败，则控制平面仍然不正常。请将其视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失败，则浏览器控制平面已启动，故障出在导航策略或目标页面上。
- 如果 `start`、`tabs` 和 `open` 全部成功，则基本的受管浏览器控制路径运行正常。

重要行为详情：

- 即使您没有配置 `browser.ssrfPolicy`，浏览器配置也默认为失败封闭的 SSRF 策略对象。
- 对于 local loopback `openclaw`OpenClaw 托管配置文件，CDP 健康检查会特意跳过对 OpenClaw 自有本地控制平面的浏览器 SSRF 可达性强制检查。
- 导航保护是分开的。成功的 `start` 或 `tabs` 结果并不意味着允许后续的 `open` 或 `navigate` 目标。

安全指南：

- 默认情况下**切勿**放宽浏览器 SSRF 策略。
- 相比广泛的专用网络访问，优先使用 `hostnameAllowlist` 或 `allowedHostnames` 等狭窄的主机例外。
- 仅在故意信任的、需要并审查私有网络浏览器访问的环境中使用 `dangerouslyAllowPrivateNetwork: true`。

## Agent 工具 + 控制工作原理

代理获得用于浏览器自动化的**一个工具**：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 来点击/输入/拖动/选择。
- `browser screenshot` 捕获像素（整个页面、元素或标记的引用）。
- `browser doctor`Gateway(网关) 检查 Gateway(网关)、插件、配置文件、浏览器和标签页的就绪状态。
- `browser` 接受：
  - `profile` 用于选择命名的浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target` (`sandbox` | `host` | `node`) 用于选择浏览器所在的位置。
  - 在沙箱隔离的会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略了 `target`：沙箱隔离会话默认为 `sandbox`，非沙箱会话默认为 `host`。
  - 如果连接了具备浏览器能力的节点，除非您固定 `target="host"` 或 `target="node"`，否则工具可能会自动路由到该节点。

这保持了代理的确定性，并避免了脆弱的选择器。

## 相关

- [工具概述](/zh/tools) - 所有可用的代理工具
- [沙箱隔离](/zh/gateway/sandboxing) - 在沙箱隔离环境中控制浏览器
- [安全性](/zh/gateway/security) - 浏览器控制风险与加固

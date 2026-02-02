> [!NOTE]
> 本页正在翻译中。

---
summary: "集成的浏览器控制服务 + 动作命令"
read_when:
  - 添加 agent 控制的浏览器自动化
  - 排查 openclaw 干扰你自己的 Chrome
  - 在 macOS 应用中实现浏览器设置与生命周期
---

# 浏览器（openclaw 管理）

OpenClaw 可以运行一个 **独立的 Chrome/Brave/Edge/Chromium profile** 供 agent 控制。
它与个人浏览器隔离，并通过 Gateway 内部的本地控制服务管理（仅回环）。

新手视角：
- 把它理解为 **一个只给 agent 用的独立浏览器**。
- `openclaw` profile **不会**触碰你的个人浏览器 profile。
- agent 可以在安全通道中 **打开标签、读取页面、点击和输入**。
- 默认 `chrome` profile 使用 **系统默认 Chromium 浏览器** 通过扩展中继；若要隔离的托管浏览器，请切换到 `openclaw`。

## 你会得到什么

- 一个名为 **openclaw** 的独立浏览器 profile（默认橙色强调）。
- 可确定的标签控制（列出/打开/聚焦/关闭）。
- agent 动作（点击/输入/拖拽/选择），快照、截图、PDF。
- 可选多 profile 支持（`openclaw`、`work`、`remote` 等）。

这个浏览器 **不是**你的日常主浏览器。它是一个安全隔离的自动化与验证界面。

## 快速开始

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果出现“Browser disabled”，请在配置中启用（见下）并重启 Gateway。

## Profiles：`openclaw` vs `chrome`

- `openclaw`：托管、隔离浏览器（无需扩展）。
- `chrome`：扩展中继到你的 **系统浏览器**（需要 OpenClaw 扩展附加到某个标签）。

如果你想默认使用托管模式，设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置在 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true,                    // default: true
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    remoteCdpTimeoutMs: 1500,         // remote CDP HTTP timeout (ms)
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
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" }
    }
  }
}
```

说明：
- 浏览器控制服务绑定到由 `gateway.port` 派生的回环端口（默认 `18791`，即 gateway + 2）。中继使用下一个端口（`18792`）。
- 若覆盖 Gateway 端口（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），派生浏览器端口会随之偏移以保持同一“端口族”。
- `cdpUrl` 在未设置时默认使用中继端口。
- `remoteCdpTimeoutMs` 用于远程（非回环）CDP 可达性检查的 HTTP 超时。
- `remoteCdpHandshakeTimeoutMs` 用于远程 CDP WebSocket 可达性检查的握手超时。
- `attachOnly: true` 表示“永不启动本地浏览器；仅在浏览器已运行时附加”。
- `color` 与每个 profile 的 `color` 会为浏览器 UI 着色，便于识别当前 profile。
- 默认 profile 是 `chrome`（扩展中继）。若要托管浏览器，设置 `defaultProfile: "openclaw"`。
- 自动探测顺序：系统默认浏览器（若是 Chromium 内核）；否则 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本地 `openclaw` profile 会自动分配 `cdpPort`/`cdpUrl` —— 仅在远程 CDP 时才需手动设置。

## 使用 Brave（或其它 Chromium 浏览器）

如果你的 **系统默认** 浏览器是 Chromium 内核（Chrome/Brave/Edge 等），OpenClaw 会自动使用它。可用 `browser.executablePath` 覆盖自动探测：

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
    executablePath: "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## 本地 vs 远程控制

- **本地控制（默认）：** Gateway 启动回环控制服务，并可启动本地浏览器。
- **远程控制（node host）：** 在有浏览器的机器上运行 node host；Gateway 将浏览器动作代理给它。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以附加到远程 Chromium 浏览器。在此模式下，OpenClaw 不会启动本地浏览器。

远程 CDP URL 可以包含认证：
- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP Basic auth（例如 `https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点和连接 CDP WebSocket 时会保留认证信息。对 token 请优先使用环境变量或密钥管理器，不要提交到配置文件中。

## Node 浏览器代理（零配置默认）

如果你在有浏览器的机器上运行了 **node host**，OpenClaw 可无需额外浏览器配置就自动将浏览器工具调用路由到该节点。这是远程 Gateway 的默认路径。

说明：
- node host 通过 **代理命令** 暴露其本地浏览器控制服务。
- Profile 来自节点自己的 `browser.profiles` 配置（与本地相同）。
- 如果你不希望使用它：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管的远程 CDP）

[Browserless](https://browserless.io) 是托管的 Chromium 服务，通过 HTTPS 暴露 CDP 端点。你可以把 OpenClaw 浏览器 profile 指向 Browserless 的区域端点，并用 API key 认证。

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
        color: "#00AA00"
      }
    }
  }
}
```

说明：
- 将 `<BROWSERLESS_API_KEY>` 替换为你的 Browserless token。
- 选择与你的 Browserless 账号匹配的区域端点（见其文档）。

## 安全性

核心要点：
- 浏览器控制仅限回环；访问流经 Gateway 的认证或 node 配对。
- 将 Gateway 与任何 node host 保持在私有网络（Tailscale），避免公网暴露。
- 将远程 CDP URL/token 当作机密；优先使用环境变量或密钥管理器。

远程 CDP 建议：
- 尽量使用 HTTPS 端点与短期 token。
- 避免把长期 token 直接写进配置文件。

## Profiles（多浏览器）

OpenClaw 支持多个命名 profile（路由配置）。Profile 可以是：
- **openclaw-managed**：独立的 Chromium 浏览器实例，拥有自己的用户数据目录 + CDP 端口
- **remote**：显式 CDP URL（浏览器在其它机器）
- **extension relay**：通过本地中继 + Chrome 扩展控制你现有的 Chrome 标签页

默认值：
- 若缺少 `openclaw` profile，会自动创建。
- `chrome` profile 为 Chrome 扩展中继的内置 profile（默认指向 `http://127.0.0.1:18792`）。
- 本地 CDP 端口默认分配自 **18800–18899**。
- 删除 profile 会将其本地数据目录移到废纸篓。

所有控制端点都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## Chrome 扩展中继（使用你现有的 Chrome）

OpenClaw 也可以通过本地 CDP 中继 + Chrome 扩展驱动 **你现有的 Chrome 标签页**（无需单独的“openclaw”Chrome 实例）。

完整指南：[Chrome 扩展](/zh/tools/chrome-extension)

流程：
- Gateway 在本机运行（同一台机器），或者在浏览器机器上运行 node host。
- 本地 **中继服务器** 监听一个回环 `cdpUrl`（默认 `http://127.0.0.1:18792`）。
- 你在某个标签页点击 **OpenClaw Browser Relay** 扩展图标来附加（不会自动附加）。
- agent 通过常规 `browser` 工具，选择正确 profile 来控制该标签页。

如果 Gateway 在其他机器上运行，请在浏览器所在机器上运行 node host，以便 Gateway 代理浏览器动作。

### 沙箱会话

如果 agent 会话是沙箱化的，`browser` 工具可能默认使用 `target="sandbox"`（沙箱浏览器）。Chrome 扩展中继接管需要宿主机浏览器控制，因此要么：
- 让会话非沙箱化，或
- 设置 `agents.defaults.sandbox.browser.allowHostControl: true` 并在调用工具时使用 `target="host"`。

### 设置

1) 加载扩展（dev/未打包）：

```bash
openclaw browser extension install
```

- Chrome → `chrome://extensions` → 启用“开发者模式”
- “加载已解压的扩展程序” → 选择 `openclaw browser extension path` 打印的目录
- 固定扩展，然后在想控制的标签页点击它（徽标显示 `ON`）

2) 使用它：
- CLI：`openclaw browser --browser-profile chrome tabs`
- Agent 工具：`browser`，`profile="chrome"`

可选：如果你想用不同名称或中继端口，创建自己的 profile：

```bash
openclaw browser create-profile   --name my-chrome   --driver extension   --cdp-url http://127.0.0.1:18792   --color "#00AA00"
```

说明：
- 此模式对大多数操作依赖 Playwright-on-CDP（截图/快照/动作）。
- 再次点击扩展图标即可断开。

## 隔离保证

- **独立用户数据目录**：不会触碰你的个人浏览器 profile。
- **独立端口**：避免使用 `9222`，减少与开发工作流冲突。
- **确定性的标签控制**：以 `targetId` 为目标，而不是“最近的标签”。

## 浏览器选择

本地启动时，OpenClaw 会按顺序选择第一个可用浏览器：
1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

你可以用 `browser.executablePath` 覆盖。

平台：
- macOS：检查 `/Applications` 与 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：检查常见安装位置。

## 控制 API（可选）

仅用于本地集成时，Gateway 暴露一个小型回环 HTTP API：

- 状态/启动/停止：`GET /`、`POST /start`、`POST /stop`
- 标签页：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`、`POST /screenshot`
- 动作：`POST /navigate`、`POST /act`
- Hooks：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 调试：`GET /console`、`POST /pdf`
- 调试：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 状态：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端点都接受 `?profile=<name>`。

### Playwright 要求

部分功能（navigate/act/AI snapshot/role snapshot、元素截图、PDF）需要 Playwright。若未安装 Playwright，这些端点会返回明确的 501 错误。openclaw 托管的 Chrome 仍可用 ARIA 快照与基础截图。
对于 Chrome 扩展中继驱动，ARIA 快照与截图也需要 Playwright。

如果看到 `Playwright is not available in this gateway build`，请安装完整的 Playwright 包（不是 `playwright-core`），并重启 gateway，或重新安装带浏览器支持的 OpenClaw。

## 工作原理（内部）

高层流程：
- 一个小型 **控制服务器** 接收 HTTP 请求。
- 它通过 **CDP** 连接到 Chromium 浏览器（Chrome/Brave/Edge/Chromium）。
- 对高级动作（点击/输入/快照/PDF），在 CDP 之上使用 **Playwright**。
- 当缺少 Playwright 时，仅提供非 Playwright 操作。

此设计让 agent 使用稳定、确定的接口，同时允许你替换本地/远程浏览器与 profile。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 指定 profile。
所有命令也接受 `--json` 输出机器可读结果（稳定 payload）。

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

动作：
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
- `openclaw browser download e12 /tmp/report.pdf`
- `openclaw browser waitfordownload /tmp/report.pdf`
- `openclaw browser upload /tmp/file.pdf`
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
- `openclaw browser set headers --json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

说明：
- `upload` 与 `dialog` 是 **预置** 调用；需在触发选择器/对话框的点击/按键之前运行。
- `upload` 也可通过 `--input-ref` 或 `--element` 直接设置文件输入。
- `snapshot`：
  - `--format ai`（默认，Playwright 已安装时）：返回带数字 ref 的 AI 快照（`aria-ref="<n>"`）。
  - `--format aria`：返回无 ref 的可访问性树（仅用于检查）。
  - `--efficient`（或 `--mode efficient`）：紧凑的 role 快照预设（interactive + compact + depth + 更低 maxChars）。
  - 配置默认（仅 tool/CLI）：设置 `browser.snapshotDefaults.mode: "efficient"`，当调用方未传 mode 时使用高效快照（见 [Gateway configuration](/zh/gateway/configuration#browser-openclaw-managed-browser)）。
  - Role 快照选项（`--interactive`、`--compact`、`--depth`、`--selector`）会强制 role 快照并生成如 `ref=e12` 的 ref。
  - `--frame "<iframe selector>"` 将 role 快照限定在某个 iframe（与 `e12` 等 role ref 配对）。
  - `--interactive` 输出扁平化的交互元素列表（最适合驱动动作）。
  - `--labels` 会输出带 ref 覆盖标签的视口截图（打印 `MEDIA:<path>`）。
- `click`/`type` 等需要来自 `snapshot` 的 `ref`（数字 `12` 或 role ref `e12`）。
  动作不支持 CSS 选择器是刻意为之。

## 快照与 ref

OpenClaw 支持两种“快照”风格：

- **AI 快照（数字 ref）**：`openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字 ref 的文本快照。
  - 动作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 内部：ref 由 Playwright 的 `aria-ref` 解析。

- **Role 快照（role ref 如 `e12`）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带 `[ref=e12]`（可选 `[nth=1]`）的 role 列表/树。
  - 动作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 内部：ref 通过 `getByRole(...)` 解析（重复项再叠加 `nth()`）。
  - 使用 `--labels` 可附带带有 `e12` 标签的视口截图。

ref 行为：
- ref **不会跨导航保持稳定**；若失败，请重新 `snapshot` 并使用新的 ref。
- 如果 role 快照使用 `--frame`，role ref 会限定在该 iframe 内，直到下一次 role 快照。

## Wait 加成

你可以等待的不只是时间/文本：

- 等待 URL（Playwright 支持 glob）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 条件：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待选择器可见：
  - `openclaw browser wait "#main"`

这些可以组合：

```bash
openclaw browser wait "#main"   --url "**/dash"   --load networkidle   --fn "window.ready===true"   --timeout-ms 15000
```

## 调试流程

当动作失败（如 “not visible”、“strict mode violation”、“covered”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（交互模式优先使用 role ref）
3. 若仍失败：`openclaw browser highlight <ref>` 查看 Playwright 目标
4. 页面异常时：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 深度调试：录制 trace：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop`（打印 `TRACE:<path>`）

## JSON 输出

`--json` 适用于脚本和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 的 role 快照包含 `refs` 与一个小型 `stats` 块（lines/chars/refs/interactive），便于工具评估 payload 大小和密度。

## 状态与环境旋钮

这些对“让网站表现为某种环境”很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage：`storage local|session get|set|clear`
- Offline：`set offline on|off`
- Headers：`set headers --json '{"X-Debug":"1"}'`（或 `--clear`）
- HTTP basic auth：`set credentials user pass`（或 `--clear`）
- Geolocation：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- Media：`set media dark|light|no-preference|none`
- Timezone / locale：`set timezone ...`、`set locale ...`
- Device / viewport：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- openclaw 浏览器 profile 可能包含已登录会话，请视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 与 `wait --fn`
  会在页面上下文中执行任意 JavaScript，提示注入可能引导它。若不需要可用 `browser.evaluateEnabled=false` 关闭。
- 登录与反机器人注意事项（X/Twitter 等）见 [浏览器登录 + X/Twitter 发帖](/zh/tools/browser-login)。
- 保持 Gateway/node host 私有（仅回环或 tailnet）。
- 远程 CDP 端点权限很大；请使用隧道并保护它们。

## 排错

Linux 特定问题（尤其是 snap Chromium），见
[浏览器排查](/zh/tools/browser-linux-troubleshooting)。

## Agent 工具与控制方式

agent 只有 **一个工具** 用于浏览器自动化：
- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射关系：
- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用快照的 `ref` ID 来点击/输入/拖拽/选择。
- `browser screenshot` 捕获像素（全页或元素）。
- `browser` 接受：
  - `profile` 选择命名 profile（openclaw、chrome 或远程 CDP）。
  - `target`（`sandbox` | `host` | `node`）指定浏览器所在位置。
  - 在沙箱会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 若省略 `target`：沙箱会话默认 `sandbox`，非沙箱会话默认 `host`。
  - 若连接了具备浏览器能力的节点，工具可能自动路由到该节点；除非你固定 `target="host"` 或 `target="node"`。

这能让 agent 保持确定性，避免脆弱的选择器。

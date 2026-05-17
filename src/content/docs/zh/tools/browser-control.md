---
summary: "OpenClawAPICLIOpenClaw 浏览器控制 API、CLI 参考和脚本操作"
read_when:
  - Scripting or debugging the agent browser via the local control API
  - Looking for the `openclaw browser` CLI reference
  - Adding custom browser automation with snapshots and refs
title: "API浏览器控制 API"
---

有关设置、配置和故障排除，请参阅 [Browser](/zh/tools/browser)。
此页面是本地控制 HTTP API、`openclaw browser`
CLI 和脚本模式（快照、引用、等待、调试流）的参考。

## 控制 API（可选）

仅适用于本地集成，Gateway(网关) 公开了一个小型回环 HTTP API：

- 状态/启动/停止：`GET /`、`POST /start`、`POST /stop`
- 标签页：`GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`, `POST /screenshot`
- 操作：`POST /navigate`, `POST /act`
- 钩子：`POST /hooks/file-chooser`, `POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 权限：`POST /permissions/grant`
- 调试：`GET /console`、`POST /pdf`
- 调试：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`，`POST /cookies/set`，`POST /cookies/clear`
- 状态：`GET /storage/:kind`，`POST /storage/:kind/set`，`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端点都接受 `?profile=<name>`。`POST /start?headless=true`OpenClaw 请求针对本地托管配置文件的一次性无头启动，而不更改持久化的浏览器配置；仅附加、远程 CDP 和现有会话配置文件会拒绝该覆盖，因为 OpenClaw 不会启动这些浏览器进程。

如果配置了共享密钥网关身份验证，浏览器 HTTP 路由也需要身份验证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码进行 HTTP Basic 认证

注意：

- 此独立回环浏览器 API **不**使用受信任代理或 Tailscale Serve 身份标头。
- 如果 `gateway.auth.mode` 是 `none` 或 `trusted-proxy`，这些回环浏览器路由不会继承那些承载身份的模式；请将它们保持为仅限回环访问。

### `/act` 错误约定

`POST /act` 针对路由级验证和策略失败使用结构化错误响应：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前 `code` 值：

- `ACT_KIND_REQUIRED` (HTTP 400)：`kind` 缺失或无法识别。
- `ACT_INVALID_REQUEST` (HTTP 400)：操作负载未能通过规范化或验证。
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400)：`selector` 与不支持的操作类型一起使用。
- `ACT_EVALUATE_DISABLED` (HTTP 403)：`evaluate`（或 `wait --fn`）被配置禁用。
- `ACT_TARGET_ID_MISMATCH` (HTTP 403)：顶级或批处理的 `targetId` 与请求目标冲突。
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501)：该操作不支持现有会话配置文件。

其他运行时故障仍可能返回 `{ "error": "<message>" }` 而不带 `code` 字段。

### Playwright 要求

某些功能（导航/操作/AI 快照/角色快照、元素截图、
PDF）需要 Playwright。如果未安装 Playwright，这些端点将返回
清晰的 501 错误。

在没有 Playwright 的情况下仍然有效的功能：

- ARIA 快照
- 当存在每个标签页的 CDP WebSocket 时，提供基于角色的可访问性快照（`--interactive`、`--compact`、
  `--depth`、`--efficient`）。这是用于检查和 ref 发现的回退方案；Playwright 仍然是主要的
  操作引擎。
- 当存在逐标签页 CDP WebSocket 时，托管 `openclaw` 浏览器的页面截图
- `existing-session` / Chrome MCP 配置文件的页面截图
- 来自快照输出的 `existing-session` 基于引用的截图 (`--ref`)

仍然需要 Playwright 的部分：

- `navigate`
- `act`
- 依赖 Playwright 原生 AI 快照格式的 AI 快照
- CSS 选择器元素截图 (`--element`)
- 完整浏览器 PDF 导出

元素屏幕截图也会拒绝 `--full-page`；路由返回 `fullPage is
not supported for element screenshots`。

如果看到 `Playwright is not available in this gateway build`，说明打包的
Gateway(网关) 缺少核心浏览器运行时依赖。请重新安装或更新
OpenClaw，然后重启网关。对于 Docker，还请按照下文所示安装 Chromium
浏览器二进制文件。

#### Docker Playwright 安装

如果您的 Gateway(网关) 在 Docker 中运行，请避免 Gateway(网关)Docker`npx playwright`npm（npm 覆盖冲突）。
对于自定义镜像，请将 Chromium 预构建到镜像中：

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

对于现有镜像，改为通过随附的 CLI 安装：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`）并确保通过
`OPENCLAW_HOME_VOLUME` 或绑定挂载来持久化 `/home/node`。OpenClaw 会自动检测 Linux 上已持久化的
Chromium。请参阅 [Docker](/zh/install/docker)。

## 工作原理（内部）

一个小型回环控制服务器接受 HTTP 请求，并通过 CDP 连接到基于 Chromium 的浏览器。高级操作（点击/输入/快照/PDF）通过 CDP 之上的 Playwright 进行；当 Playwright 缺失时，仅支持非 Playwright 操作。在底层本地/远程浏览器和配置文件自由切换的同时，代理看到的始终是一个稳定的接口。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 以针对特定的配置文件，并接受 `--json` 以获取机器可读的输出。

<AccordionGroup>

<Accordion title="基础：状态、标签页、打开/聚焦/关闭">

```bash
openclaw browser status
openclaw browser start
openclaw browser start --headless # one-shot local managed headless launch
openclaw browser stop            # also clears emulation on attach-only/remote CDP
openclaw browser tabs
openclaw browser tab             # shortcut for current tab
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="检查：截图、快照、控制台、错误、请求">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # or --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion title="操作：navigate、click、type、drag、wait、evaluate">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # or e12 for role refs
openclaw browser click-coords 120 340        # viewport coordinates
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="状态：cookies、storage、offline、headers、geo、device">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear to remove
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

备注：

- `upload` 和 `dialog` 是 **arming（预备）** 调用；请在触发选择器/对话框的点击/按键操作之前运行它们。
- `click`/`type`/etc 等需要一个来自 `snapshot` 的 `ref`（数字 `12`、角色引用 `e12` 或可操作的 ARIA 引用 `ax12`）。操作有意不支持 CSS 选择器。当可见视口位置是唯一可靠的目标时，请使用 `click-coords`。
- 下载、跟踪和上传路径被限制在 OpenClaw 临时根目录：`/tmp/openclaw{,/downloads,/uploads}`（回退：`${os.tmpdir()}/openclaw/...`）。
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。

当 OpenClaw 可以证明替换标签页（例如相同的 URL，或者表单提交后单个旧标签页变为单个新标签页）时，稳定的标签页 ID 和标签可以在 Chromium 原始目标替换中保留下来。原始目标 ID 仍然是不稳定的；在脚本中，优先使用来自 `tabs` 的 `suggestedTargetId`。

快照标志概览：

- `--format ai`（使用 Playwright 时的默认设置）：带有数字引用 (`aria-ref="<n>"`) 的 AI 快照。
- `--format aria`：带有 `axN` 引用的可访问性树。当 Playwright 可用时，OpenClaw 会将引用与后端 DOM ID 绑定到实时页面，以便后续操作使用它们；否则，请将输出视为仅用于检查。
- `--efficient`（或 `--mode efficient`）：紧凑的角色快照预设。设置 `browser.snapshotDefaults.mode: "efficient"` 使其成为默认值（请参阅 [Gateway(网关) 配置](/zh/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 强制使用 `ref=e12` 引用进行角色快照。`--frame "<iframe>"` 将角色快照的作用域限定在 iframe 内。
- `--labels` 添加仅视口截图，并覆盖引用标签（打印 `MEDIA:<path>`）。
- `--urls` 将发现的链接目标附加到 AI 快照。

## 快照和引用

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字引用）**：`openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字引用的文本快照。
  - 操作：`openclaw browser click 12`，`openclaw browser type 23 "hello"`。
  - 在内部，该引用是通过 Playwright 的 `aria-ref` 解析的。

- **角色快照（如 `e12` 等角色引用）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：包含 `[ref=e12]`（以及可选的 `[nth=1]`）的基于角色的列表/树。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在内部，引用是通过 `getByRole(...)` 解析的（对于重复项则加上 `nth()`）。
  - 添加 `--labels` 以包含带有覆盖 `e12` 标签的视口截图。
  - 当链接文本不明确且代理需要具体的导航目标时，添加 `--urls`。

- **ARIA 快照（ARIA 引用如 `ax12`）**：`openclaw browser snapshot --format aria`
  - 输出：作为结构化节点的可访问性树。
  - Actions: `openclaw browser click ax12` 在快照路径可以通过 Playwright 和 Chrome 后端 DOM ID 绑定 ref 时有效。
- 如果 Playwright 不可用，ARIA 快照仍然可用于检查，但 ref 可能无法执行操作。当你需要操作 ref 时，请使用 `--format ai` 或 `--interactive` 重新生成快照。
- Docker 证明针对 raw-CDP 回退路径：Docker`pnpm test:docker:browser-cdp-snapshot`
  启动带有 CDP 的 Chromium，运行 `browser doctor --deep`，并验证角色
  快照包含链接 URL、光标提升的可点击项以及 iframe 元数据。

Ref 行为：

- Refs 在导航过程中**不稳定**；如果发生故障，请重新运行 `snapshot` 并使用新的 ref。
- `/act` 在操作触发的替换后返回当前的原始 `targetId`，
  当它能证明替换标签页时。后续命令请继续使用稳定的标签页 ID/标签。
- 如果角色快照是使用 `--frame` 拍摄的，则角色引用将作用于该 iframe，直到拍摄下一个角色快照。
- 未知或过时的 `axN` ref 会快速失败，而不是回退到
  Playwright 的 `aria-ref` 选择器。当发生这种情况时，请在同一标签页上运行一个新的快照。

## 等待增强功能

您可以等待的不仅仅是时间/文本：

- 等待 URL（支持 Playwright 支持的 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 谓词：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待选择器变得可见：
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
2. 使用 `click <ref>` / `type <ref>`（在交互模式下首选角色引用）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 的目标
4. 如果页面表现异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 进行深度调试：记录跟踪：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop` （打印 `TRACE:<path>`）

## JSON 输出

`--json` 适用于脚本编写和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的 Role 快照包含 `refs` 以及一个小的 `stats` 块（行/字符/引用/交互），以便工具能够推断负载大小和密度。

## 状态和环境控制项

这些对于“让网站表现得像 X”的工作流非常有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线：`set offline on|off`
- 标头：`set headers --headers-json '{"X-Debug":"1"}'`（仍支持旧版 `set headers --json '{"X-Debug":"1"}'`）
- HTTP 基本身份验证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区 / 语言环境：`set timezone ...`，`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- openclaw 浏览器配置文件可能包含已登录的会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  在页面上下文中执行任意 JavaScript。提示注入可以操控
  此行为。如果不需要，请使用 `browser.evaluateEnabled=false` 将其禁用。
- 有关登录和反机器人注意事项（X/Twitter 等），请参阅 [Browser login + X/Twitter posting](/zh/tools/browser-login)。
- 请保持 Gateway(网关)/节点主机为私有（仅限本地回环或 tailnet）。
- 远程 CDP 端点功能强大；请通过隧道传输并加以保护。

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

## 相关

- [浏览器](/zh/tools/browser) - 概述、配置、配置文件、安全
- [浏览器登录](/zh/tools/browser-login) - 站点登录
- [Browser Linux 故障排除](/zh/tools/browser-linux-troubleshooting)
- [Browser WSL2 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

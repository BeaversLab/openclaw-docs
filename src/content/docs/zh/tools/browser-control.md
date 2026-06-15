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
CLI 和脚本模式（快照、引用、等待、调试流程）的参考文档。

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

对于标签页端点，`targetId` 是兼容性字段名称。建议传递
`GET /tabs` 或 `POST /tabs/open` 中的 `suggestedTargetId`；标签和 `tabId`
句柄（例如 `t1`）也是可以接受的。原始 CDP 目标 ID 和唯一的原始
target-id 前缀仍然有效，但它们是不稳定的诊断句柄。

如果配置了共享密钥网关身份验证，浏览器 HTTP 路由也需要进行身份验证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码进行 HTTP Basic 身份验证

注意事项：

- 此独立的回环浏览器 API **不会**消耗 trusted-proxy 或
  Tailscale Serve 身份标头。
- 如果 `gateway.auth.mode` 为 `none` 或 `trusted-proxy`，这些回环浏览器
  路由不会继承那些承载身份的模式；请将它们限制为仅限回环。

### `/act` 错误合约

`POST /act` 使用结构化错误响应来处理路由级验证和
策略失败：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前的 `code` 值：

- `ACT_KIND_REQUIRED` (HTTP 400)：`kind` 缺失或无法识别。
- `ACT_INVALID_REQUEST` (HTTP 400)：操作负载未能通过规范化或验证。
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400)：`selector` 与不支持的操作类型一起使用。
- `ACT_EVALUATE_DISABLED` (HTTP 403)：`evaluate`（或 `wait --fn`）被配置禁用。
- `ACT_TARGET_ID_MISMATCH` (HTTP 403)：顶层或批处理的 `targetId` 与请求目标冲突。
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501)：操作不支持现有会话配置文件。

其他运行时失败可能仍会返回 `{ "error": "<message>" }` 而没有
`code` 字段。

### Playwright 要求

某些功能（导航/操作/AI 快照/角色快照、元素截图、
PDF）需要 Playwright。如果未安装 Playwright，这些端点将返回
清晰的 501 错误。

在没有 Playwright 的情况下仍然有效的功能：

- ARIA 快照
- 当存在每个标签页的 CDP WebSocket 时，基于角色的辅助功能快照（`--interactive`、`--compact`、
  `--depth`、`--efficient`）。这是
  用于检查和 ref 发现的回退方案；Playwright 仍然是主要的
  操作引擎。
- 当存在每个标签页的 CDP WebSocket 时，为托管的 `openclaw` 浏览器截取页面截图
- 为 `existing-session` / Chrome MCP 配置文件截取页面截图
- 从快照输出中截取 `existing-session` 基于 ref 的截图（`--ref`）

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- 依赖于 Playwright 原生 AI 快照格式的 AI 快照
- CSS 选择器元素截图（`--element`）
- 完整浏览器 PDF 导出

元素截图也会拒绝 `--full-page`；路由返回 `fullPage is
not supported for element screenshots`。

如果您看到 `Playwright is not available in this gateway build`，则打包的
Gateway(网关) 缺少核心浏览器运行时依赖项。重新安装或更新
OpenClaw，然后重启网关。对于 Docker，还要按如下所示安装 Chromium
浏览器二进制文件。

#### Docker Playwright 安装

如果您的 Gateway(网关) 在 Docker 中运行，请避免 `npx playwright`（npm 覆盖冲突）。
对于自定义镜像，请将 Chromium 烘焙到镜像中：

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

对于现有镜像，改为通过捆绑的 CLI 进行安装：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`）并确保 `/home/node` 通过
`OPENCLAW_HOME_VOLUME`OpenClaw 或绑定挂载进行持久化。OpenClaw 会自动检测 LinuxDocker 上持久化的
Chromium。请参阅 [Docker](/zh/install/docker)。

## 工作原理（内部）

一个小型回环控制服务器接受 HTTP 请求，并通过 CDP 连接到基于 Chromium 的浏览器。高级操作（点击/输入/快照/PDF）通过 CDP 之上的 Playwright 执行；当缺少 Playwright 时，仅提供非 Playwright 操作。代理看到一个稳定的接口，而本地/远程浏览器和配置文件在底层自由切换。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 来定位特定配置文件，并接受 `--json` 以获取机器可读的输出。

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

<Accordion title="检查：屏幕截图、快照、控制台、错误、请求">

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

<Accordion title="操作：导航、点击、输入、拖动、等待、执行">

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
openclaw browser upload media://inbound/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="状态：Cookie、存储、离线、标头、地理位置、设备">

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

说明：

- `upload` 和 `dialog` 是**准备（arming）**调用；在触发选择器/对话框的点击/按压操作之前运行它们。如果某个操作打开了模态框，该操作的响应将包含 `blockedByDialog` 和 `browserState.dialogs.pending`；传递该 `dialogId`OpenClaw 以直接响应。在 OpenClaw 之外处理的对话框会显示在 `browserState.dialogs.recent` 下。
- `click`/`type`/etc 需要来自 `snapshot` 的 `ref`（数字 `12`、角色引用 `e12` 或可操作的 ARIA 引用 `ax12`）。操作故意不支持 CSS 选择器。当可见视口位置是唯一可靠的目标时，请使用 `click-coords`。
- 下载和跟踪路径被限制在 OpenClaw 临时根目录：`/tmp/openclaw{,/downloads}`（回退：`${os.tmpdir()}/openclaw/...`）。
- `upload` 接受来自 OpenClaw 临时上传根目录和 OpenClaw 管理的入站媒体的文件。托管入站媒体可以引用为 `media://inbound/<id>`、沙盒相对路径 `media/inbound/<id>` 或托管入站媒体目录内已解析的路径。仍然会拒绝嵌套媒体引用、遍历、符号链接、硬链接和任意本地路径。
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。

当 OpenClaw 能够证明替换标签页时（例如相同的 URL，或表单提交后单个旧标签页变为单个新标签页），稳定的标签页 ID 和标签可以在 Chromium 原始目标替换中保留。原始目标 ID 仍然不稳定；在脚本中首选来自 `tabs` 的 `suggestedTargetId`。

快照标志概览：

- `--format ai`（Playwright 中的默认设置）：带有数字引用（`aria-ref="<n>"`）的 AI 快照。
- `--format aria`：带有 `axN` 引用的可访问性树。当 Playwright 可用时，OpenClaw 会将带有后端 DOM ID 的引用绑定到实时页面，以便后续操作可以使用它们；否则，将输出视为仅用于检查。
- `--efficient` (or `--mode efficient`): 紧凑角色快照预设。设置 `browser.snapshotDefaults.mode: "efficient"`Gateway(网关) 使其成为默认值（参见 [Gateway(网关) configuration](/zh/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 强制使用 `ref=e12` 引用进行角色快照。`--frame "<iframe>"` 将角色快照范围限定在 iframe 内。
- `--labels` 添加一个仅包含视口的截图，并在其上覆盖引用标签，然后打印保存的路径。
- `--urls` 将发现的链接目标附加到 AI 快照中。

## Snapshots and refs

OpenClaw 支持两种“快照”样式：

- **AI snapshot (numeric refs)**: `openclaw browser snapshot` (default; `--format ai`)
  - 输出：包含数字引用的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 内部通过 Playwright 的 `aria-ref` 解析引用。

- **Role snapshot (role refs like `e12`)**: `openclaw browser snapshot --interactive` (or `--compact`, `--depth`, `--selector`, `--frame`)
  - 输出：基于角色的列表/树，包含 `[ref=e12]`（以及可选的 `[nth=1]`）。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 内部通过 `getByRole(...)` 解析引用（对于重复项则加上 `nth()`）。
  - 添加 `--labels` 以包含带有覆盖 `e12` 标签的视口截图。
  - 当链接文本模棱两可且代理需要具体的
    导航目标时，添加 `--urls`。

- **ARIA snapshot (ARIA refs like `ax12`)**: `openclaw browser snapshot --format aria`
  - 输出：作为结构化节点的无障碍树。
  - Actions: `openclaw browser click ax12` 在快照路径可以通过 Playwright 和 Chrome 后端 DOM ID 绑定 ref 时有效。
- 如果 Playwright 不可用，ARIA 快照对于检查仍然有用，但 ref 可能无法执行操作。当您需要操作 ref 时，请使用 `--format ai` 或 `--interactive` 重新生成快照。
- Docker 针对 raw-CDP 回退路径的证明：`pnpm test:docker:browser-cdp-snapshot` 使用 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证角色快照包含链接 URL、光标提升的可点击元素以及 iframe 元数据。

Ref 行为：

- Ref **在导航之间不稳定**；如果操作失败，请重新运行 `snapshot` 并使用新的 ref。
- 当能够证明替换标签页时，`/act` 会在操作触发的替换后返回当前的原始 `targetId`。请继续使用稳定的标签页 ID/标签进行后续命令。
- 如果角色快照是使用 `--frame` 获取的，则角色 ref 的作用域限定为该 iframe，直到下一次角色快照为止。
- 未知或过时的 `axN` ref 会快速失败，而不是回退到 Playwright 的 `aria-ref` 选择器。发生这种情况时，请在同一标签页上运行新的快照。

## Wait 增强功能

您可以等待的不仅仅是时间/文本：

- 等待 URL（支持 Playwright 支持的 glob 模式）：
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

当操作失败时（例如“not visible”、“strict mode violation”、“covered”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在交互模式下首选角色 ref）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 定位的目标
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 对于深度调试：记录追踪：
   - `openclaw browser trace start`
   - 重现问题
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

JSON 中的 Role 快照包含 `refs` 以及一个小型的 `stats` 块（行/字符/引用/交互），以便工具推断有效负载的大小和密度。

## 状态与环境设置

这些对于“让网站像 X 一样运行”的工作流非常有用：

- Cookies: `cookies`, `cookies set`, `cookies clear`
- 存储: `storage local|session get|set|clear`
- 离线: `set offline on|off`
- Headers: `set headers --headers-json '{"X-Debug":"1"}'` (旧版 `set headers --json '{"X-Debug":"1"}'` 仍然受支持)
- HTTP 基本身份验证: `set credentials user pass` (或 `--clear`)
- 地理位置: `set geo <lat> <lon> --origin "https://example.com"` (或 `--clear`)
- 媒体: `set media dark|light|no-preference|none`
- 时区 / 区域: `set timezone ...`, `set locale ...`
- 设备 / 视口:
  - `set device "iPhone 14"` (Playwright 设备预设)
  - `set viewport 1280 720`

## 安全与隐私

- openclaw 浏览器配置文件可能包含已登录的会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  在页面上下文中执行任意 JavaScript。提示注入可以操纵
  此行为。如果不需要，请使用 `browser.evaluateEnabled=false` 将其禁用。
- 当页面端函数
  可能需要比默认评估超时更长的时间时，请使用 `openclaw browser evaluate --timeout-ms <ms>`。
- 有关登录和反机器人注意事项（X/Twitter 等），请参阅 [Browser login + X/Twitter posting](/zh/tools/browser-login)。
- 请保持 Gateway(网关)/节点主机的私密性（仅限环回或 tailnet）。
- 远程 CDP 端点功能强大；请通过隧道传输并保护它们。

严格模式示例（默认阻止私有/内部目的地）：

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

- [Browser](/zh/tools/browser) - 概述、配置、配置文件、安全性
- [Browser login](/zh/tools/browser-login) - 登录网站
- [Browser Linux 故障排除](Linux/en/tools/browser-linux-troubleshooting)
- [Browser WSL2 故障排除](WSL2/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

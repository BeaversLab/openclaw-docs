---
summary: "基于浏览器的 Gateway(网关) 控制界面（聊天、节点、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制界面"
---

# 控制界面（浏览器）

控制界面是由 Gateway(网关) 网关 提供的一个小型 **Vite + Lit** 单页应用：

- 默认值：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与 Gateway(网关) 网关 WebSocket 通信**。

## 快速打开（本地）

如果 Gateway(网关) 网关 运行在同一台计算机上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果页面加载失败，请先启动 Gateway(网关)：`openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时，trusted-proxy 身份标头

仪表板设置面板会为当前浏览器标签页会话和选定的 Gateway URL 保存令牌；
密码不会持久保存。新手引导通常会在首次连接时为共享密钥身份验证生成
Gateway 令牌，但当 `gateway.auth.mode` 为 `"password"` 时，
密码身份验证也可以使用。

## 设备配对（首次连接）

当您从新的浏览器或设备连接到控制界面时，Gateway(网关)
需要**一次性配对批准**——即使您与 `gateway.auth.allowTailscale: true` 位于同一个 Tailnet 上。
这是为了防止未经授权的访问的安全措施。

**您将看到：** "disconnected (1008): pairing required"

**要批准设备：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果浏览器使用更改的身份验证详细信息（角色/作用域/公钥）
重试配对，之前的待处理请求将被取代，并创建一个新的 `requestId`。
请在批准之前重新运行 `openclaw devices list`。

如果浏览器已配对，并且您将其从读取访问权限更改为
写入/管理员访问权限，这将被视为审批升级，而不是静默
重新连接。OpenClaw 保持旧的审批处于活动状态，阻止更广泛的重新连接，
并要求您明确批准新的作用域集。

一旦获得批准，该设备将被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要重新批准。请参阅 [设备 CLI](/zh/cli/devices) 以了解令轮换和撤销。

**注意：**

- 直接本地回环浏览器连接 (`127.0.0.1` / `localhost`) 会
  自动获得批准。
- Tailnet 和 LAN 浏览器连接仍需要明确批准，即使当
  它们源自同一台机器时也是如此。
- 每个浏览器配置文件都会生成一个唯一的设备 ID，因此切换浏览器或
  清除浏览器数据将需要重新配对。

## 个人身份（浏览器本地）

控制 UI 支持每个浏览器的个人身份——即显示名称和头像，它们附加到传出消息上，以便在共享会话中进行归属。此身份存在于浏览器存储中，范围限定于当前浏览器配置文件，除非您在请求中明确提交，否则不会离开网关主机。

- 身份**仅限浏览器本地**。它不会同步到其他设备，也不属于网关配置文件的一部分。
- 清除站点数据或切换浏览器会将身份重置为空；控制 UI 不会尝试从服务器状态重建身份。
- 除了您实际发送的消息上的正常记录作者身份元数据外，关于个人身份的任何内容都不会在服务器端持久化保存。

## 运行时配置端点

Control UI 从 `/__openclaw/control-ui-config.json` 获取其运行时设置。该端点受到与 HTTP 表面其余部分相同的网关身份验证的保护：未经身份验证的浏览器无法获取它，成功的获取需要已经有效的网关令牌/密码、Tailscale Serve 身份或受信任代理的身份。这可以防止 Control UI 功能标志和端点元数据泄露给共享主机上的未经身份验证的扫描程序。

## 语言支持

Control UI 可以在首次加载时根据您的浏览器区域设置进行本地化。要稍后更改它，请打开 **Overview -> Gateway(网关) Access -> Language**。区域设置选择器位于 Gateway(网关) Access 卡片中，而不在 Appearance 下。

- 支持的语言环境：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- 非英语翻译内容在浏览器中是延迟加载的。
- 所选的语言环境会保存在浏览器存储中，并在下次访问时继续使用。
- 缺失的翻译键将回退到英语。

## 它现在可以做什么

- 通过 Gateway(网关) WS 与模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中流式传输工具调用 + 实时工具输出卡片（代理事件）
- 渠道：内置以及捆绑/外部插件渠道状态、二维码登录和各渠道配置 (`channels.status`, `web.login.*`, `config.patch`)
- 实例：在线列表 + 刷新 (`system-presence`)
- 会话：列表 + 各会话模型/思考/快速/详细/跟踪/推理覆盖 (`sessions.list`, `sessions.patch`)
- 梦境：梦境状态、启用/禁用切换以及梦境日记阅读器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Cron 作业：列表/添加/编辑/运行/启用/禁用 + 运行历史 (`cron.*`)
- Skills：状态、启用/禁用、安装、API 密钥更新 (API, `skills.*`)
- 节点：列表 + 功能 (`node.list`)
- 执行批准：编辑网关或节点允许列表 + 询问 `exec host=gateway/node` 的策略 (`exec.approvals.*`)
- 配置：查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 配置：应用 + 带验证重启 (`config.apply`) 并唤醒上一个活跃会话
- 配置写入包含基础哈希守卫，以防止覆盖并发编辑
- 配置写入 (`config.set`/`config.apply`/`config.patch`) 还会对提交的配置负载中的引用进行活跃 SecretRef 解析的预检；未解析的活跃已提交引用会在写入前被拒绝
- 配置架构 + 表单渲染（`config.schema` / `config.schema.lookup`，包括字段 `title` / `description`，匹配的 UI 提示、直接子摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及可用的插件 + 渠道架构）；仅当快照能够安全地进行原始往返时，才提供原始 JSON 编辑器
- 如果快照无法安全地对原始文本进行往返处理，Control UI 将强制使用表单模式并禁用该快照的原始模式
- 原始 JSON 编辑器“重置为已保存”会保留原始编写的形状（格式、注释、`$include` 布局），而不是重新渲染扁平化的快照，因此当快照可以安全往返时，外部编辑在重置后得以保留
- 结构化的 SecretRef 对象值在表单文本输入中渲染为只读状态，以防止意外的对象到字符串损坏
- Debug：status/health/models 快照 + 事件日志 + 手动 RPC 调用 (`status`, `health`, `models.list`)
- Logs：网关文件日志的实时跟踪，带过滤/导出功能 (`logs.tail`)
- Update：运行包/git 更新 + 重启 (`update.run`)，并附带重启报告

Cron jobs panel notes：

- 对于隔离作业，传递方式默认为公告摘要。如果您希望仅内部运行，可以切换为 none。
- 选择公告时，会出现频道/目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
- 对于主会话作业，webhook 和 none 传递模式可用。
- 高级编辑控件包括运行后删除、清除代理覆盖、cron 精确/交错选项、代理模型/思考覆盖以及尽力传递切换开关。
- 表单验证是内联的，并在字段级别显示错误；无效值将禁用保存按钮，直到修复为止。
- 设置 `cron.webhookToken` 以发送专用的不记名令牌，如果省略，则发送不带身份验证标头的 webhook。
- 已弃用的回退：存储的具有 `notify: true` 的旧版作业在迁移之前仍可使用 `cron.webhook`。

## 聊天行为

- `chat.send` 是**非阻塞**的：它立即使用 `{ runId, status: "started" }` 进行确认，并且响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送，在运行期间返回 `{ status: "in_flight" }`，并在完成后返回 `{ status: "ok" }`。
- `chat.history` 响应为了UI安全而有大小限制。当转录条目过大时，Gateway(网关)可能会截断长文本字段，省略繁重的元数据块，并使用占位符 (`[chat.history omitted: message too large]`) 替换过大的消息。
- `chat.history` 还会从可见的助手文本中去除仅显示的行内指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块），以及泄漏的 ASCII/全角模型控制令牌，并省略其整个可见文本仅为确切静默令牌 `NO_REPLY` / `no_reply` 的助手条目。
- `chat.inject` 向会话记录追加一条助手备注，并广播 `chat` 事件以进行仅 UI 的更新（不运行 Agent，不通过渠道投递）。
- 聊天头部的模型和思维选择器通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖，而非仅限单次发送的选项。
- 停止：
  - 点击 **停止**（调用 `chat.abort`）
  - 输入 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以中止带外操作
  - `chat.abort` 支持 `{ sessionKey }`（无需 `runId`）来中止该会话的所有活动运行
- 中止部分保留：
  - 当运行中止时，部分助手文本仍可以显示在 UI 中
  - 当存在缓冲输出时，Gateway(网关) 会将中止的部分助手文本持久化到历史记录中
  - 持久化的条目包含中止元数据，以便历史记录使用者能区分中止的部分内容与正常完成的输出

## 托管嵌入

助手消息可以使用 `[embed ...]`
简码内联渲染托管的 Web 内容。iframe 沙盒策略由
`gateway.controlUi.embedSandbox` 控制：

- `strict`：禁用托管嵌入内的脚本执行
- `scripts`：在保持源隔离的同时允许交互式嵌入；这是
  默认设置，通常足以满足自包含的浏览器游戏/小部件的需求
- `trusted`：在 `allow-scripts` 之上为有意需要更强权限的
  同站点文档添加 `allow-same-origin`

示例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

仅当嵌入的文档确实需要同源行为时才使用 `trusted`。对于大多数代理生成的游戏和交互式画布，
`scripts` 是更安全的选择。

绝对外部 `http(s)` 嵌入 URL 默认保持阻止状态。如果您
有意希望 `[embed url="https://..."]` 加载第三方页面，请设置
`gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

将 Gateway(网关) 保持在回环地址上，并让 Tailscale Serve 使用 HTTPS 为其代理：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份标头
(`tailscale-user-login`) 进行身份验证。OpenClaw
通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求通过 Tailscale 的 `x-forwarded-*` 标头访问环回时才接受这些请求。如果
您希望即使对 Serve 流量也要求显式的共享密钥凭据，请设置
`gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或
`"password"`。
对于该异步 Serve 身份验证路径，在写入速率限制之前，来自同一客户端 IP
和身份验证范围的失败身份验证尝试会被序列化。因此，来自同一浏览器的并发错误重试
可能会在第二个请求上显示 `retry later`，
而不是两个简单的并行不匹配。
无令牌 Serve 身份验证假定网关主机是受信任的。如果该主机上可能运行不受信任的本地
代码，请要求令牌/密码身份验证。

### 绑定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/` （或您配置的 `gateway.controlUi.basePath`）

将匹配的共享密钥粘贴到 UI 设置中（作为
`connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

## 不安全的 HTTP

如果您通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表板，
浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，
OpenClaw **会阻止**没有设备身份的 Control UI 连接。

记录的例外情况：

- 仅限 localhost 的不安全 HTTP 与 `gateway.controlUi.allowInsecureAuth=true` 的兼容性
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行操作员 Control UI 身份验证
- 紧急情况 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建议的修复方法：**使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/`（在网关主机上）

**不安全身份验证切换行为：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` 仅为本地兼容性切换：

- 它允许本地主机 Control UI 会话在非安全 HTTP 上下文中无需设备身份即可继续。
- 它不会绕过配对检查。
- 它不会放宽远程（非本地主机）设备身份要求。

**仅限紧急情况：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 禁用 Control UI 设备身份检查，会严重降低安全性。紧急使用后请迅速恢复。

受信任代理说明：

- 成功的受信任代理身份验证可以在没有设备身份的情况下允许**操作员** Control UI 会话
- 这**不**适用于节点角色 Control UI 会话
- 同主机环回反向代理仍不满足受信任代理身份验证；请参阅[受信任代理身份验证](/zh/gateway/trusted-proxy-auth)

有关 HTTPS 设置的指导，请参阅 [Tailscale](/zh/gateway/tailscale)。

## 内容安全策略

Control UI 附带严格的 `img-src` 策略：仅允许 **同源** (same-origin) 资产和 `data:` URL。浏览器会拒绝远程 `http(s)` 和协议相对的图像 URL，并且不会发起网络获取。

这实际上意味着：

- 在相对路径下提供的头像和图像（例如 `/avatars/<id>`）仍然会渲染。
- 内联 `data:image/...` URL 仍然会渲染（对于协议内负载很有用）。
- 渠道元数据发出的远程头像 URL 会在 Control UI 的头像助手处被剥离，并替换为内置的徽标/徽章，因此受损或恶意的渠道无法强制操作员的浏览器获取任意远程图像。

您无需更改任何内容即可获得此行为——它始终开启且不可配置。

## Avatar 路由身份验证

当配置了网关身份验证时，Control UI 的 avatar 端点需要与 API 其余部分相同的网关令牌：

- `GET /avatar/<agentId>` 仅向经过身份验证的调用者返回头像图像。`GET /avatar/<agentId>?meta=1` 在相同的规则下返回头像元数据。
- 对任一路由的未经验证的请求都将被拒绝（与同级 assistant-media 路由相匹配）。这可以防止 avatar 路由在受保护的主机上泄露代理身份。
- Control UI 本身在获取头像时会将网关令牌作为不记名标头转发，并使用经过身份验证的 blob URL，以便图像仍能在仪表板中渲染。

如果您禁用网关身份验证（在共享主机上不建议这样做），avatar 路由也将变为未经验证，这与网关的其余部分保持一致。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。构建它们的方法是：

```bash
pnpm ui:build
```

可选的绝对基础路径（当你需要固定的资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（独立的开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向你的 Gateway(网关) WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway(网关)

Control UI 是静态文件；WebSocket 目标是可配置的，并且可以与 HTTP 源不同。当你想在本地使用 Vite 开发服务器而 Gateway(网关) 运行在其他地方时，这非常方便。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 打开类似这样的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性身份验证（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

注意事项：

- `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
- 应尽可能通过 URL 片段（`#token=...`）传递 `token`。片段不会发送到服务器，从而避免了请求日志和 Referer 泄露。传统的 `?token=` 查询参数为了兼容性仍会导入一次，但仅作为后备手段，并在启动后立即被清除。
- `password` 仅保存在内存中。
- 设置 `gatewayUrl` 后，UI 不会回退到配置或环境凭据。
  请显式提供 `token`（或 `password`）。缺少显式凭据将被视为错误。
- 当 Gateway(网关) 位于 TLS（Tailscale Serve、HTTPS 代理等）之后时，请使用 `wss://`。
- 为防止点击劫持，`gatewayUrl` 仅在顶层窗口（而非嵌入）中被接受。
- 非环回 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整源站）。这包括远程开发设置。
- 除了严格控制下的本地测试外，不要使用 `gateway.controlUi.allowedOrigins: ["*"]`。这意味着允许任何浏览器源站，而不是“匹配我使用的任何主机”。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host-header 源站回退模式，但这是一种危险的安全模式。

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情：[Remote access](/zh/gateway/remote)。

## 相关

- [Dashboard](/zh/web/dashboard) — 网关仪表板
- [WebChat](/zh/web/webchat) — 基于浏览器的聊天界面
- [TUI](/zh/web/tui) — 终端用户界面
- [Health Checks](/zh/gateway/health) — 网关健康监控

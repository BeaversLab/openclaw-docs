---
summary: "Gateway(网关)通过内置的可选 admin-http-rpc 插件公开选定的 Gateway(网关) 控制平面方法"
read_when:
  - Building host tooling that cannot use the Gateway WebSocket RPC client
  - Exposing Gateway admin automation behind a private trusted ingress
  - Auditing the security model for HTTP access to Gateway methods
title: "RPCAdmin HTTP RPC 插件"
---

内置的 `admin-http-rpc`Gateway(网关)Gateway(网关)RPC 插件通过 HTTP 公开选定的 Gateway(网关) 控制平面方法，供无法使用正常 Gateway(网关) WebSocket RPC 客户端的受信任主机自动化使用。

该插件包含在 OpenClaw 中，但默认处于关闭状态。禁用时，不会注册该路由。启用时，它添加：

- `POST /api/v1/admin/rpc`
- 与 Gateway(网关) 相同的监听器：Gateway(网关)`http://<gateway-host>:<port>/api/v1/admin/rpc`

仅为主机私有工具、tailnet 自动化或受信任的内部入口启用它。不要将此路由直接暴露给公共互联网。

## 在启用之前

Admin HTTP RPC 是一个完整的操作员控制平面接口。任何通过 Gateway(网关) HTTP 身份验证的调用者都可以调用此页面上列入白名单的方法。

当满足以下所有条件时使用它：

- 调用者受信任操作 Gateway(网关)。
- 调用者无法使用 WebSocket RPC 客户端。
- 该路由仅在环回地址、tailnet 或私有经过身份验证的入口上可访问。
- 您已审查允许的方法，并且它们与您计划运行的自动化相匹配。

对于可以保持 Gateway(网关) WebSocket 连接打开的 OpenClaw 客户端和交互式工具，请使用 WebSocket RPC 路径。

## 启用

启用内置插件：

<Tabs>
  <Tab title="CLICLI">
    ```bash
    openclaw plugins enable admin-http-rpc
    openclaw gateway restart
    ```
  </Tab>
  <Tab title="Config">
    ```json5
    {
      plugins: {
        entries: {
          "admin-http-rpc": { enabled: true },
        },
      },
    }
    ```
  </Tab>
</Tabs>

路由在插件启动期间注册。更改插件配置后，请重启 Gateway(网关)。

当您不再需要 HTTP 接口时，请将其禁用：

```bash
openclaw plugins disable admin-http-rpc
openclaw gateway restart
```

## 验证路由

使用 `health` 作为最小的安全请求：

```bash
curl -sS http://<gateway-host>:<port>/api/v1/admin/rpc \
  -H 'Authorization: Bearer <gateway-token>' \
  -H 'Content-Type: application/json' \
  -d '{"method":"health","params":{}}'
```

成功的响应具有 `ok: true`：

```json
{
  "id": "generated-request-id",
  "ok": true,
  "payload": {
    "status": "ok"
  }
}
```

当禁用该插件时，路由将返回 `404`，因为它尚未注册。

## 身份验证

该插件路由使用 Gateway(网关) HTTP 身份验证。

常见的身份验证方式：

- 共享密钥身份验证 (`gateway.auth.mode="token"` 或 `"password"`)：`Authorization: Bearer <token-or-password>`
- 受信任的承载身份的 HTTP 身份验证 (`gateway.auth.mode="trusted-proxy"`)：通过配置的身份感知代理进行路由，并让其注入所需的身份标头
- 私有入口开放身份验证 (`gateway.auth.mode="none"`)：不需要身份验证标头

## 安全模型

请将此插件视为完整的 Gateway(网关) 操作员表面。

- 启用该插件有意提供对 RPC`/api/v1/admin/rpc` 处列入白名单的管理员 RPC 方法的访问权限。
- 该插件声明了保留的 `contracts.gatewayMethodDispatch: ["authenticated-request"]`Gateway(网关) 清单合约，以便其 Gateway(网关) 身份验证的 HTTP 路由可以在进程中分发控制平面方法。
- 共享密钥承载身份验证证明拥有网关操作员密钥。
- 对于 `token` 和 `password` 身份验证，较窄的 `x-openclaw-scopes` 标头将被忽略，并恢复正常的标准操作员默认值。
- 受信任的承载身份的 HTTP 模式在存在 `x-openclaw-scopes` 时会遵守它。
- `gateway.auth.mode="none"` 意味着如果启用了该插件，则此路由未经过身份验证。仅当此路由位于您完全信任的私有入口之后时才使用它。
- 在插件路由身份验证通过后，请求会通过与 WebSocket RPC 相同的 Gateway(网关) 方法处理程序和范围检查进行分发。
- 将此路由保持在环回接口、tailnet 或私有受信任入口上。请勿将其直接暴露给公共互联网。
- 插件清单合约不是沙盒。它们可以防止意外使用保留的 SDK 辅助程序；受信任的插件仍在 Gateway(网关) 进程中运行。

当调用者跨越信任边界时，请使用单独的网关。

## 请求

```http
POST /api/v1/admin/rpc
Authorization: Bearer <gateway-token>
Content-Type: application/json
```

```json
{
  "id": "optional-request-id",
  "method": "health",
  "params": {}
}
```

字段：

- `id`（字符串，可选）：复制到响应中。如果省略，则会生成一个 UUID。
- `method`Gateway(网关) (字符串，必填)：允许的 Gateway(网关) 方法名称。
- `params` (任意类型，可选)：特定于方法的参数。

默认的最大请求正文大小为 1 MB。

## 响应

成功响应使用 Gateway(网关) RPC 形状：

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

Gateway(网关) 方法错误使用：

```json
{
  "id": "optional-request-id",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "bad params"
  }
}
```

HTTP 状态码尽可能遵循 Gateway(网关) 错误。例如，Gateway(网关)`INVALID_REQUEST` 返回 `400`，而 `UNAVAILABLE` 返回 `503`。

## 允许的方法

- discovery: `commands.list`RPC
  返回此插件允许的 HTTP RPC 方法名称。
- gateway: `health`, `status`, `logs.tail`, `usage.status`, `usage.cost`, `gateway.restart.request`
- config: `config.get`, `config.schema`, `config.schema.lookup`, `config.set`, `config.patch`, `config.apply`
- channels: `channels.status`, `channels.start`, `channels.stop`, `channels.logout`
- web: `web.login.start`, `web.login.wait`
- 模型: `models.list`, `models.authStatus`
- agents: `agents.list`, `agents.create`, `agents.update`, `agents.delete`
- approvals: `exec.approvals.get`, `exec.approvals.set`, `exec.approvals.node.get`, `exec.approvals.node.set`
- cron: `cron.status`, `cron.list`, `cron.get`, `cron.runs`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`
- devices: `device.pair.list`, `device.pair.approve`, `device.pair.reject`, `device.pair.remove`
- nodes: `node.list`, `node.describe`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove`, `node.rename`
- tasks: `tasks.list`, `tasks.get`, `tasks.cancel`
- diagnostics: `doctor.memory.status`, `update.status`

其他 Gateway(网关) 方法将被阻止，直到被有意添加为止。

## WebSocket 对比

正常的 Gateway(网关) WebSocket RPC 路径仍然是 API 客户端的首选控制面 OpenClaw。请仅对需要请求/响应 HTTP 接口的主机工具使用 admin HTTP RPC。

没有可信设备身份的共享令牌 WebSocket 客户端无法在连接期间自行声明 admin 范围。Admin HTTP RPC 故意遵循现有的可信 HTTP 操作员模型：启用插件后，共享密钥承载身份验证被视为此管理界面的完全操作员访问权限。

## 故障排除

`404 Not Found`

: 插件已禁用，启用后 Gateway(网关) 尚未重启，或者请求正在发往不同的 Gateway(网关) 进程。

`401 Unauthorized`

: 请求未满足 Gateway(网关) HTTP 身份验证。请检查不记名令牌 或 trusted-proxy 身份标头。

`400 INVALID_REQUEST`

: 请求正文不是有效的 JSON，缺少 `method` 字段，或者该方法不在插件允许列表中。

`503 UNAVAILABLE`

: Gateway(网关) 方法处理程序不可用。请检查 Gateway(网关) 日志，并在 Gateway(网关) 完成启动后重试。

## 相关

- [Operator scopes](/zh/gateway/operator-scopes)
- [Gateway(网关) 安全](<Gateway(网关)/en/gateway/security>)
- [Remote access](/zh/gateway/remote)
- [Plugin manifest](/zh/plugins/manifest#contracts)
- [SDK subpaths](/zh/plugins/sdk-subpaths)

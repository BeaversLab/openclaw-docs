---
summary: "Webhooks 插件：用于可信外部自动化的经过身份验证的 TaskFlow 入口"
read_when:
  - You want to trigger or drive TaskFlows from an external system
  - You are configuring the bundled webhooks plugin
title: "Webhooks 插件"
---

# Webhooks（插件）

Webhooks 插件添加了经过身份验证的 HTTP 路由，将外部自动化绑定到 OpenClaw TaskFlows。

当您希望一个受信任的系统（如 Zapier、n8n、CI 作业或内部服务）在无需先编写自定义插件的情况下创建并驱动托管的 TaskFlows 时，请使用它。

## 运行位置

Webhooks 插件运行在 Gateway(网关) 进程内部。

如果您的 Gateway(网关) 运行在另一台机器上，请在该 Gateway(网关) 主机上安装并配置该插件，然后重启 Gateway(网关)。

## 配置路由

在 `plugins.entries.webhooks.config` 下设置配置：

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow bridge",
            },
          },
        },
      },
    },
  },
}
```

路由字段：

- `enabled`：可选，默认为 `true`
- `path`：可选，默认为 `/plugins/webhooks/<routeId>`
- `sessionKey`：拥有绑定 TaskFlows 的所需会话（会话）
- `secret`：所需的共享密钥或 SecretRef
- `controllerId`：所创建托管流的可选控制器 ID
- `description`：可选的操作员说明

支持的 `secret` 输入：

- 纯字符串
- 带有 `source: "env" | "file" | "exec"` 的 SecretRef

如果基于密钥的路由在启动时无法解析其密钥，插件将跳过该路由并记录警告，而不是暴露损坏的端点。

## 安全模型

每个路由都被信任以使用其配置的 `sessionKey` 的 TaskFlow 权限进行操作。

这意味着该路由可以检查和修改由该会话拥有的 TaskFlows，因此您应该：

- 为每个路由使用强唯一密钥
- 优先使用密钥引用而非内联纯文本密钥
- 将路由绑定到适合该工作流的最窄范围的会话
- 仅公开您需要的特定 webhook 路径

该插件应用：

- 共享密钥身份验证
- 请求正文大小和超时保护
- 固定窗口速率限制
- 进行中的请求限制
- 通过 `api.runtime.taskFlow.bindSession(...)` 进行所有者绑定的 TaskFlow 访问

## 请求格式

发送包含以下内容的 `POST` 请求：

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`

示例：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支持的操作

该插件目前接受以下 JSON `action` 值：

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

为路由绑定的会话创建托管 TaskFlow。

示例：

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

在现有托管 TaskFlow 中创建托管子任务。

允许的运行时包括：

- `subagent`
- `acp`

示例：

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "Inspect the next message batch"
}
```

## 响应形状

成功的响应返回：

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

被拒绝的请求返回：

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "TaskFlow not found.",
  "result": {}
}
```

该插件有意从 webhook 响应中擦除所有者/会话元数据。

## 相关文档

- [插件运行时 SDK](/en/plugins/sdk-runtime)
- [Hooks 和 webhooks 概述](/en/automation/hooks)
- [CLI webhooks](/en/cli/webhooks)

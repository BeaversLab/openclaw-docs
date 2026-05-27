---
summary: "CLICLI 参考用于 `openclaw agent`Gateway(网关)（通过 Gateway(网关) 发送一个 agent 轮次）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agent"
---

# `openclaw agent`

通过 Gateway(网关) 运行一个 agent 轮次（使用 Gateway(网关)`--local` 进行嵌入式运行）。
使用 `--agent <id>` 直接定位到已配置的 agent。

传递至少一个会话选择器：

- `--to <dest>`
- `--session-key <key>`
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent send 工具：[Agent send](/zh/tools/agent-send)

## 选项

- `-m, --message <text>`：必需的消息正文
- `-t, --to <dest>`：用于派生会话密钥的收件人
- `--session-key <key>`：用于路由的显式会话密钥
- `--session-id <id>`：显式会话 ID
- `--agent <id>`：代理 ID；覆盖路由绑定
- `--model <id>`：此次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`：代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供商支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：为会话持久化详细级别
- `--channel <channel>`：投递渠道；省略则使用主会话渠道
- `--reply-to <target>`：投递目标覆盖
- `--reply-channel <channel>`：投递渠道覆盖
- `--reply-account <id>`：投递账户覆盖
- `--local`：直接运行嵌入式代理（在插件注册表预加载后）
- `--deliver`：将回复发送回选定的渠道/目标
- `--timeout <seconds>`：覆盖代理超时（默认 600 或配置值）
- `--json`：输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 注意

- 当 Gateway(网关)Gateway(网关) 请求失败时，Gateway(网关) 模式会回退到嵌入式代理。使用 `--local` 可预先强制执行嵌入式运行。
- `--local` 仍然会首先预加载插件注册表，因此在嵌入式运行期间，插件提供的提供商、工具和渠道仍然可用。
- `--local` 和嵌入式回退运行被视为一次性运行。打包的 MCP 回环资源和为该本地进程打开的热 Claude stdio 会话在回复后被终止，因此脚本调用不会保持本地子进程的活动状态。
- 由 Gateway(网关) 支持的运行会将 Gateway(网关) 拥有的 MCP 回环资源保留在运行的 Gateway(网关) 进程下；较旧的客户端仍可能发送历史清理标志，但 Gateway(网关) 会将其作为兼容性空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复传递，而不影响会话路由。
- `--session-key` 选择一个显式的会话密钥。带 Agent 前缀的密钥必须使用 `agent:<agent-id>:<session-key>`，并且当同时提供两者时，`--agent` 必须与密钥的 agent id 匹配。裸非哨兵密钥在提供时限定于 `--agent`，否则限定于配置的默认 agent；例如，`--agent ops --session-key incident-42` 路由到 `agent:ops:incident-42`。字面量 `global` 和 `unknown` 仅在未提供 `--agent` 时保持未限定作用域；在这种情况下，嵌入式回退和存储所有权使用配置的默认 agent。
- `--json` 保留 stdout 专用于 JSON 响应。Gateway(网关)、插件和嵌入式回退诊断信息被路由到 stderr，以便脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行与 Gateway(网关) 运行。
- 如果 Gateway(网关) 接受了 agent 运行，但 CLI 在等待最终回复时超时，嵌入式回退将使用一个新的显式 `gateway-fallback-*` 会话/运行 ID，并报告 `meta.fallbackReason: "gateway_timeout"` 以及回退会话字段。这避免了与 Gateway(网关) 拥有的记录锁定竞争，或静默替换原始路由的会话会话。
- 对于由 Gateway(网关) 支持的运行，Gateway(网关)`SIGTERM` 和 `SIGINT`CLIGateway(网关)CLI 会中断正在等待的 CLI 请求。如果 Gateway(网关) 已经接受了该运行，CLI 还会在退出前为该已接受的运行 ID 发送 `chat.abort`。本地 `--local` 运行和嵌入式回退运行接收相同的中止信号，但不发送 `chat.abort`。如果原始 Agent 运行仍处于活动状态时，重复的 `--run-id`Gateway(网关) 到达 Gateway(网关)，则重复的响应将报告 `status: "in_flight"`CLI，并且非 JSON CLI 会打印 stderr 诊断信息而不是空回复。对于外部的 cron/systemd 包装器，请保留一个外部的硬终止（hard-kill）后备措施，例如 `timeout -k 60 600 openclaw agent ...`，以便在关机无法排空时，监管进程仍能回收该进程。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供商凭据将作为非机密标记（例如 环境变量 名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持久化，而不是已解析的机密明文。
- 标记写入以源为准：OpenClaw 从活动源配置快照持久化标记，而不是从已解析的运行时机密值持久化。

## JSON 投递状态

当使用 `--json --deliver`CLI 时，CLI JSON 响应可能包含顶级的 `deliveryStatus`，以便脚本可以区分已投递、被抑制、部分投递和失败的发送：

```json
{
  "payloads": [{ "text": "Report ready", "mediaUrl": null }],
  "meta": { "durationMs": 1200 },
  "deliveryStatus": {
    "requested": true,
    "attempted": true,
    "status": "sent",
    "succeeded": true,
    "resultCount": 1
  }
}
```

`deliveryStatus.status` 是 `sent`、`suppressed`、`partial_failed` 或 `failed` 之一。`suppressed` 意味着故意不发送投递，例如消息发送挂钩取消了它或没有可见结果；这仍然是一个最终的无重试结果。`partial_failed` 意味着在后续负载失败之前至少发送了一个负载。`failed` 意味着没有完成持久的发送或投递预检查失败。

基于 Gateway(网关) 的 CLI 响应也保留了原始的 Gateway(网关) 结果形状，其中同一个对象可在 `result.deliveryStatus` 处获取。

通用字段：

- `requested`：当对象存在时，始终为 `true`。
- `attempted`：持久化发送路径运行后为 `true`；对于预检失败或无可见负载的情况为 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 与 `status: "partial_failed"` 配对。
- `reason`：来自持久化交付或预检验证的小写 snake-case 原因。已知原因包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失败的持久化发送也可能报告失败的阶段。将未知值视为不透明，因为集合可能会扩展。
- `resultCount`：可用时的渠道发送结果数量。
- `sentBeforeError`：当部分失败在错误发生前至少发送了一个负载时，为 `true`。
- `error`：针对失败或部分失败发送的布尔值 `true`。
- `errorMessage`：仅在捕获到底层交付错误消息时包含。预检失败带有 `error` 和 `reason`，但没有 `errorMessage`。
- `payloadOutcomes`：可选的每个负载的结果，包含 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError` 或可用的钩子元数据。

## 相关

- [CLI 参考](/zh/cli)
- [Agent 运行时](/zh/concepts/agent)

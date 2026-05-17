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
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent send 工具：[Agent send](/zh/tools/agent-send)

## 选项

- `-m, --message <text>`：必需的消息正文
- `-t, --to <dest>`：用于派生会话密钥的接收者
- `--session-id <id>`：明确的会话 ID
- `--agent <id>`：agent ID；覆盖路由绑定
- `--model <id>`：此次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`：agent 思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供商支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：为会话持久化详细级别
- `--channel <channel>`：交付渠道；省略则使用主会话渠道
- `--reply-to <target>`：交付目标覆盖
- `--reply-channel <channel>`：交付渠道覆盖
- `--reply-account <id>`：交付账户覆盖
- `--local`：直接运行嵌入式 agent（在插件注册表预加载后）
- `--deliver`：将回复发送回所选渠道/目标
- `--timeout <seconds>`：覆盖 agent 超时（默认 600 或配置值）
- `--json`：输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 备注

- 当Gateway(网关)请求失败时，Gateway(网关)模式将回退到嵌入式代理。使用 Gateway(网关)Gateway(网关)`--local` 可强制预先进行嵌入式执行。
- `--local` 仍然首先预加载插件注册表，因此插件提供的提供商、工具和通道在嵌入式运行期间保持可用。
- `--local` 和嵌入式回退运行被视为一次性运行。为该本地进程打开的捆绑 MCP 回环资源和热 Claude stdio 会话将在回复后退役，因此脚本调用不会保持本地子进程的活动状态。
- 由 Gateway(网关) 支持的运行会将 Gateway(网关) 拥有的 MCP 回环资源保留在正在运行的 Gateway(网关) 进程下；较旧的客户端可能仍会发送历史清理标志，但 Gateway(网关) 会将其作为兼容性的空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复传递，而不是会话路由。
- `--json`Gateway(网关) 将 stdout 保留给 JSON 响应。Gateway(网关)、插件和嵌入式回退诊断信息被路由到 stderr，以便脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`Gateway(网关)，以便脚本可以区分回退运行和 Gateway(网关)运行。
- 如果 Gateway(网关) 接受代理运行但 CLI 在等待最终回复时超时，嵌入式回退将使用一个新的显式 Gateway(网关)CLI`gateway-fallback-*` 会话/运行 ID，并报告 `meta.fallbackReason: "gateway_timeout"`Gateway(网关) 以及回退会话字段。这避免与 Gateway(网关) 拥有的记录锁定竞争，或静默替换原始路由的会话会话。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供商凭据将作为非机密标记（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）保留，而不是已解析的机密明文。
- 标记写入以源为权威：OpenClaw 持久化来自活动源配置快照的标记，而不是来自已解析的运行时机密值。

## JSON 传递状态

使用 `--json --deliver`CLI 时，CLI JSON 响应可能包含顶层 `deliveryStatus`，以便脚本可以区分已发送、已抑制、部分发送和发送失败的情况：

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

`deliveryStatus.status` 是 `sent`、`suppressed`、`partial_failed` 或 `failed` 之一。`suppressed` 表示有意不发送投递，例如消息发送钩子取消了它或没有可见结果；这仍然是一个终端性的、不重试的结果。`partial_failed` 表示在后续负载失败之前至少发送了一个负载。`failed` 表示没有完成持久化发送或投递预检失败。

由 Gateway(网关) 支持的 CLI 响应也保留了原始 Gateway(网关) 结果形状，其中相同的对象可在 `result.deliveryStatus` 处获得。

公共字段：

- `requested`：当对象存在时始终为 `true`。
- `attempted`：持久化发送路径运行后为 `true`；对于预检失败或没有可见负载的情况为 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 与 `status: "partial_failed"` 成对出现。
- `reason`：来自持久化投递或预检验证的小写蛇形命名原因。已知原因包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失败的持久化发送也可能报告失败的阶段。请将未知值视为不透明的，因为该集合可以扩展。
- `resultCount`：可用时的渠道发送结果数量。
- `sentBeforeError`：当部分失败在错误发生前至少发送了一个负载时为 `true`。
- `error`：针对失败或部分失败发送的布尔值 `true`。
- `errorMessage`: 仅在捕获到底层传递错误消息时包含。预检失败包含 `error` 和 `reason`，但不包含 `errorMessage`。
- `payloadOutcomes`: 可选的每个载荷结果，包含 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError` 或可用的 hook 元数据。

## 相关

- [CLI 参考](/zh/cli)
- [Agent 运行时](/zh/concepts/agent)

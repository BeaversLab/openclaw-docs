---
summary: "CLI 参考：`openclaw agent`（通过 Gateway(网关) 网关 发送一次 agent 轮次）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agent"
---

# `openclaw agent`

通过 Gateway(网关) 网关 运行一次 agent 轮次（嵌入式使用 `--local`）。
使用 `--agent <id>` 直接定位到已配置的 agent。

传递至少一个会话选择器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent send 工具：[Agent send](/zh/tools/agent-send)

## 选项

- `-m, --message <text>`: 必需的消息正文
- `-t, --to <dest>`: 用于派生会话密钥的接收者
- `--session-id <id>`: 显式会话 ID
- `--agent <id>`: 代理 ID；覆盖路由绑定
- `--model <id>`：本次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`：代理 思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供商 支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：为会话 持久化详细级别
- `--channel <channel>`：交付渠道；省略以使用主会话 渠道
- `--reply-to <target>`：交付目标覆盖
- `--reply-channel <channel>`：交付渠道覆盖
- `--reply-account <id>`：交付账户覆盖
- `--local`：直接运行嵌入式代理（在插件注册表预加载之后）
- `--deliver`：将回复发送回选定的渠道/目标
- `--timeout <seconds>`：覆盖代理超时（默认 600 或配置值）
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

- 当 Gateway(网关) 请求失败时，Gateway(网关) 模式会回退到嵌入式代理。使用 `--local` 强制在前端执行嵌入式运行。
- `--local` 仍然会首先预加载插件注册表，因此在嵌入式运行期间，插件提供的提供商、工具 和渠道 保持可用。
- 每次 `openclaw agent` 调用都被视为一次性运行。为该运行打开的捆绑或用户配置的 MCP 服务器会在回复后关闭，即使命令使用的是 Gateway(网关) 路径，因此 stdio MCP 子进程不会在脚本调用之间保持活动状态。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响的是回复交付，而不是会话 路由。
- `--json` 将 stdout 保留用于 JSON 响应。Gateway(网关)、插件和嵌入式回退诊断信息会被路由到 stderr，以便脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行与 Gateway(网关) 运行。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供商凭据将作为非机密标记（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持久化，而不是已解析的机密明文。
- 标记写入具有源权威性：OpenClaw 从活动的源配置快照持久化标记，而不是从解析的运行时机密值持久化。

## 相关

- [CLI 参考](/zh/cli)
- [Agent 运行时](/zh/concepts/agent)

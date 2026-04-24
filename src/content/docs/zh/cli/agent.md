---
summary: "CLI 参考：`openclaw agent`（通过 Gateway(网关) 网关 发送一次 agent 轮次）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

通过 Gateway(网关) 网关 运行一次 agent 轮次（嵌入式使用 `--local`）。
使用 `--agent <id>` 直接定位到已配置的 agent。

传递至少一个会话选择器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent 发送工具：[Agent send](/zh/tools/agent-send)

## 选项

- `-m, --message <text>`: 必需的消息正文
- `-t, --to <dest>`: 用于派生会话密钥的接收者
- `--session-id <id>`: 显式会话 ID
- `--agent <id>`: 代理 ID；覆盖路由绑定
- `--thinking <level>`：代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供商支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：为会话持久化详细级别
- `--channel <channel>`：交付渠道；省略以使用主会话渠道
- `--reply-to <target>`：交付目标覆盖
- `--reply-channel <channel>`：交付渠道覆盖
- `--reply-account <id>`：交付账户覆盖
- `--local`：直接运行嵌入式代理（在插件注册表预加载后）
- `--deliver`: 将回复发送回选定的渠道/目标
- `--timeout <seconds>`: 覆盖 agent 超时时间（默认为 600 或配置值）
- `--json`: 输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 注意

- 当 Gateway(网关) 请求失败时，Gateway(网关) 模式会回退到嵌入式 agent。使用 `--local` 可强制前置执行嵌入式运行。
- `--local` 仍然会首先预加载插件注册表，因此在嵌入式运行期间，插件提供的提供者、工具和渠道仍然可用。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响的是回复传递，而非会话路由。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供商凭证将作为非机密标记（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持久化，而不是已解析的机密明文。
- 标记写入是源权威的：OpenClaw 从活动源配置快照持久化标记，而不是从解析后的运行时机密值。

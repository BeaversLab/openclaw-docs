---
summary: "从 CLI 运行代理轮次，并选择性地将回复发送到渠道"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Agent send"
---

`openclaw agent` 从命令行运行单个 Agent 轮次，而无需传入聊天消息。将其用于脚本化工作流、测试和程序化交付。

## 快速开始

<Steps>
  <Step title="运行简单的 agent 轮次">
    ```bash
    openclaw agent --agent main --message "What is the weather today?"
    ```Gateway(网关)

    这会通过 Gateway(网关) 发送消息并打印回复。

  </Step>

  <Step title="指定特定的 agent 或会话">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"

    # Target an exact session key
    openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
    ```

  </Step>

  <Step title="将回复投递到渠道">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## 标志

| 标志                          | 描述                                              |
| ----------------------------- | ------------------------------------------------- |
| `--message \<text\>`          | 要发送的消息（必填）                              |
| `--to \<dest\>`               | 从目标（电话、聊天 ID）派生会话密钥               |
| `--session-key \<key\>`       | 使用显式的会话密钥                                |
| `--agent \<id\>`              | 指定已配置的 agent（使用其 `main` 会话）          |
| `--session-id \<id\>`         | 通过 ID 重用现有会话                              |
| `--local`                     | 强制使用本地嵌入式运行时（跳过 Gateway(网关)）    |
| `--deliver`                   | 将回复发送到聊天渠道                              |
| `--channel \<name\>`          | 投递渠道（whatsapp、telegram、discord、slack 等） |
| `--reply-to \<target\>`       | 投递目标覆盖                                      |
| `--reply-channel \<name\>`    | 投递渠道覆盖                                      |
| `--reply-account \<id\>`      | 投递账户 ID 覆盖                                  |
| `--thinking \<level\>`        | 为所选模型配置文件设置思考级别                    |
| `--verbose \<on\|full\|off\>` | 设置详细级别                                      |
| `--timeout \<seconds\>`       | 覆盖 agent 超时                                   |
| `--json`                      | 输出结构化 JSON                                   |

## 行为

- 默认情况下，CLI **会通过 Gateway(网关)**。添加 CLIGateway(网关)`--local` 以强制在当前机器上使用嵌入式运行时。
- 如果 Gateway(网关) 无法访问，CLI 将**回退**到本地嵌入式运行。
- 会话选择：`--to` 派生会话密钥（群组/渠道目标保持隔离；直接聊天合并为 `main`）。
- `--session-key` 选择一个显式密钥。带 Agent 前缀的密钥必须使用
  `agent:<agent-id>:<session-key>`，且当两者都提供时，`--agent` 必须与该 agent ID 匹配。裸非哨兵密钥在提供时作用于 `--agent`；例如，`--agent ops --session-key incident-42` 路由到
  `agent:ops:incident-42`。如果没有 `--agent`，裸非哨兵密钥将作用于配置的默认 agent。字面量 `global` 和 `unknown` 仅在未提供 `--agent` 时保持无作用域；在这种情况下，嵌入式回退和存储所有权使用配置的默认 agent。
- Thinking 和 verbose 标志会持久化到会话存储中。
- 输出：默认为纯文本，或使用 `--json` 获取结构化负载 + 元数据。
- 使用 `--json --deliver` 时，JSON 包含已发送、已抑制、部分发送和失败发送的交付状态。请参阅
  [JSON delivery status](/zh/cli/agent#json-delivery-status)。

## 示例

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Exact session key
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"

# Legacy key scoped to an agent
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相关

<CardGroup cols={2}>
  <Card title="Agent CLI 参考" href="/zh/cli/agent" icon="terminal">
    完整的 `openclaw agent` 标志和选项参考。
  </Card>
  <Card title="Sub-agents" href="/zh/tools/subagents" icon="users">
    后台子 agent 生成。
  </Card>
  <Card title="Sessions" href="/zh/concepts/session" icon="comments">
    会话密钥的工作原理以及 `--to`、`--agent` 和 `--session-id` 如何解析它们。
  </Card>
  <Card title="Slash commands" href="/zh/tools/slash-commands" icon="slash">
    在 agent 会话内使用的本机命令目录。
  </Card>
</CardGroup>

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
  <Step title="运行简单的 Agent 轮次">
    ```bash
    openclaw agent --message "What is the weather today?"
    ```

    这会通过 Gateway(网关) 发送消息并打印回复。

  </Step>

  <Step title="定位特定的 Agent 或会话">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"
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
| `--agent \<id\>`              | 以已配置的 Agent 为目标（使用其 `main` 会话）     |
| `--session-id \<id\>`         | 通过 ID 重用现有会话                              |
| `--local`                     | 强制使用本地嵌入式运行时（跳过 Gateway(网关)）    |
| `--deliver`                   | 将回复发送到聊天渠道                              |
| `--channel \<name\>`          | 投递渠道（whatsapp、telegram、discord、slack 等） |
| `--reply-to \<target\>`       | 投递目标覆盖                                      |
| `--reply-channel \<name\>`    | 投递渠道覆盖                                      |
| `--reply-account \<id\>`      | 投递账户 ID 覆盖                                  |
| `--thinking \<level\>`        | 为所选模型配置文件设置思考级别                    |
| `--verbose \<on\|full\|off\>` | 设置详细级别                                      |
| `--timeout \<seconds\>`       | 覆盖 Agent 超时时间                               |
| `--json`                      | 输出结构化 JSON                                   |

## 行为

- 默认情况下，CLI **通过 Gateway(网关)** 运行。添加 `--local` 以强制使用当前机器上的嵌入式运行时。
- 如果 Gateway(网关) 无法访问，CLI 将**回退**到本地嵌入式运行。
- 会话选择：`--to` 派生会话密钥（群组/渠道目标保持隔离；直接聊天折叠为 `main`）。
- 思考和详细标志会持久化到会话存储中。
- 输出：默认为纯文本，或使用 `--json` 获取结构化负载和元数据。

## 示例

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相关内容

<CardGroup cols={2}>
  <Card title="Agent CLI 参考" href="/zh/cli/agent" icon="terminal">
    完整的 `openclaw agent` 标志和选项参考。
  </Card>
  <Card title="子代理" href="/zh/tools/subagents" icon="users">
    后台子代理生成。
  </Card>
  <Card title="会话" href="/zh/concepts/session" icon="comments">
    会话密钥的工作原理以及 `--to`、`--agent` 和 `--session-id` 如何解析它们。
  </Card>
  <Card title="Slash commands" href="/zh/tools/slash-commands" icon="slash">
    在 Agent 会话中使用的原生命令目录。
  </Card>
</CardGroup>

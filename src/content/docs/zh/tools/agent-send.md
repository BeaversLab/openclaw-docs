---
summary: "从 CLI 运行代理轮次，并选择性地将回复发送到渠道"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Agent Send"
---

# Agent Send

`openclaw agent` 从命令行运行单个代理轮次，而无需
传入聊天消息。将其用于脚本化工作流、测试和
程序化投递。

## 快速开始

<Steps>
  <Step title="运行一个简单的代理轮次">
    ```bash
    openclaw agent --message "What is the weather today?"
    ```

    这会通过 Gateway(网关) 发送消息并打印回复。

  </Step>

  <Step title="以特定代理或会话为目标">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"
    ```

  </Step>

  <Step title="将回复发送到渠道">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## Flags

| Flag                          | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `--message \<text\>`          | 要发送的消息（必需）                                   |
| `--to \<dest\>`               | 从目标（电话、聊天 ID）派生会话密钥                    |
| `--agent \<id\>`              | 以已配置的代理为目标（使用其 `main` 会话）             |
| `--session-id \<id\>`         | 通过 ID 重用现有会话                                   |
| `--local`                     | 强制本地嵌入式运行时（跳过 Gateway(网关)）             |
| `--deliver`                   | 将回复发送到聊天渠道                                   |
| `--channel \<name\>`          | 投递渠道（whatsapp、telegram、discord、slack 等）      |
| `--reply-to \<target\>`       | 投递目标覆盖                                           |
| `--reply-channel \<name\>`    | 投递渠道覆盖                                           |
| `--reply-account \<id\>`      | 投递账户 ID 覆盖                                       |
| `--thinking \<level\>`        | 设置思考级别（off、minimal、low、medium、high、xhigh） |
| `--verbose \<on\|full\|off\>` | 设置详细级别                                           |
| `--timeout \<seconds\>`       | 覆盖代理超时                                           |
| `--json`                      | 输出结构化 JSON                                        |

## Behavior

- 默认情况下，CLI **通过 Gateway(网关)** 传输。添加 `--local` 以强制
  在当前计算机上使用嵌入式运行时。
- 如果 Gateway(网关) 无法访问，CLI 将**回退**到本地嵌入式运行。
- Session selection: `--to` 推导会话密钥（群组/渠道目标
  保持隔离；直接聊天折叠为 `main`）。
- Thinking 和 verbose 标志会持久化到会话存储中。
- 输出：默认为纯文本，或者使用 `--json` 获取结构化负载 + 元数据。

## 示例

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相关

- [Agent CLI reference](/zh/cli/agent)
- [Sub-agents](/zh/tools/subagents) — 后台子代理生成
- [Sessions](/zh/concepts/session) — 会话密钥的工作原理

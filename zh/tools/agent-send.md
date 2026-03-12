---
summary: "直接 `openclaw agent` CLI 运行（可选投递）"
read_when:
  - Adding or modifying the agent CLI entrypoint
title: "Agent Send"
---

# `openclaw agent` （直接代理运行）

`openclaw agent` 运行单次代理轮次，无需传入聊天消息。
默认情况下，它**通过网关 (Gateway)** 运行；添加 `--local` 可强制在当前机器上使用嵌入式运行时。

## 行为

- 必需： `--message <text>`
- 会话选择：
  - `--to <dest>` 派生会话密钥（群组/频道目标保留隔离；直接聊天折叠为 `main`），**或**
  - `--session-id <id>` 按 ID 重用现有会话，**或**
  - `--agent <id>` 直接定向到配置的代理（使用该代理的 `main` 会话密钥）
- 运行与正常入站回复相同的嵌入式代理运行时。
- 思考/详细 (verbose) 标志会持久化到会话存储中。
- 输出：
  - 默认：打印回复文本（加上 `MEDIA:<url>` 行）
  - `--json`：打印结构化负载 + 元数据
- 使用 `--deliver` + `--channel` 可选地将消息投递回频道（目标格式与 `openclaw message --target` 匹配）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 覆盖投递设置而不更改会话。

如果网关 不可达，CLI 将**回退**到嵌入式本地运行。

## 示例

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 标志

- `--local`：本地运行（需要在您的 shell 中配置模型提供商 API 密钥）
- `--deliver`：将回复发送到选定频道
- `--channel`：投递频道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，默认： `whatsapp`）
- `--reply-to`：覆盖投递目标
- `--reply-channel`：覆盖投递频道
- `--reply-account`：覆盖投递账户 ID
- `--thinking <off|minimal|low|medium|high|xhigh>`：持久化思考级别（仅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：持久化详细级别
- `--timeout <seconds>`：覆盖代理超时
- `--json`：输出结构化 JSON

---
summary: "直接 `openclaw agent` CLI 运行（带有可选投递）"
read_when:
  - Adding or modifying the agent CLI entrypoint
title: "Agent Send"
---

# `openclaw agent`（直接代理运行）

`openclaw agent` 运行单个代理轮次，而无需传入聊天消息。
默认情况下，它 **通过 Gateway 网关** 运行；添加 `--local` 以强制使用
当前计算机上的嵌入式运行时。

## 行为

- 必填：`--message <text>`
- 会话选择：
  - `--to <dest>` 派生会话密钥（组/渠道目标保持隔离；直接聊天折叠为 `main`），**或**
  - `--session-id <id>` 按 ID 重用现有会话，**或**
  - `--agent <id>` 直接指向已配置的代理（使用该代理的 `main` 会话密钥）
- 运行与正常入站回复相同的嵌入式代理运行时。
- Thinking/verbose 标志持久化到会话存储中。
- 输出：
  - 默认：打印回复文本（加上 `MEDIA:<url>` 行）
  - `--json`：打印结构化负载 + 元数据
- 使用 `--deliver` + `--channel` 可选地传回渠道（目标格式匹配 `openclaw message --target`）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 覆盖投递方式而不更改会话。

如果 Gateway(网关) 无法访问，CLI 将**回退**到嵌入式本地运行。

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
- `--deliver`：将回复发送到所选渠道
- `--channel`：投递渠道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，默认：`whatsapp`）
- `--reply-to`：投递目标覆盖
- `--reply-channel`：投递渠道覆盖
- `--reply-account`：投递账户 ID 覆盖
- `--thinking <off|minimal|low|medium|high|xhigh>`：持久化思考级别（仅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：持久化详细级别
- `--timeout <seconds>`：覆盖代理超时
- `--json`：输出结构化 JSON

import zh from '/components/footer/zh.mdx';

<zh />

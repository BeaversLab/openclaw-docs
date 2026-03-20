---
summary: "直接 `openclaw agent` CLI 运行（可选投递）"
read_when:
  - 添加或修改代理 CLI 入口点
title: "Agent Send"
---

# `openclaw agent` （直接代理运行）

`openclaw agent` 运行单轮代理，无需传入聊天消息。
默认情况下，它**经由 Gateway(网关)** 传递；添加 `--local` 可强制使用当前机器上的
嵌入式运行时。

## 行为

- 必填： `--message <text>`
- 会话选择：
  - `--to <dest>` 推导会话密钥（群组/渠道目标保持隔离；直接聊天折叠为 `main`），**或**
  - `--session-id <id>` 通过 ID 重用现有会话，**或**
  - `--agent <id>` 直接以配置的代理为目标（使用该代理的 `main` 会话密钥）
- 运行与正常入站回复相同的嵌入式代理运行时。
- Thinking/verbose 标志持久化到会话存储中。
- 输出：
  - 默认：打印回复文本（加上 `MEDIA:<url>` 行）
  - `--json`：打印结构化有效负载 + 元数据
- 可选地通过 `--deliver` + `--channel` 投递回渠道（目标格式匹配 `openclaw message --target`）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 覆盖投递而不更改会话。

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

- `--local`：本地运行（需要在 Shell 中配置模型提供商 API 密钥）
- `--deliver`：将回复发送到所选渠道
- `--channel`：投递渠道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，默认值： `whatsapp`）
- `--reply-to`：投递目标覆盖
- `--reply-channel`：投递渠道覆盖
- `--reply-account`：投递帐户 ID 覆盖
- `--thinking <off|minimal|low|medium|high|xhigh>`：持久化思考级别（仅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：持久化详细级别
- `--timeout <seconds>`：覆盖代理超时
- `--json`：输出结构化 JSON

import zh from "/components/footer/zh.mdx";

<zh />

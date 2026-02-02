---
title: "Agent Send"
summary: "直接运行 `openclaw agent` CLI（可选投递）"
read_when:
  - 添加或修改 agent CLI 入口
---
# `openclaw agent`（直接运行 agent）

`openclaw agent` 会在不需要入站聊天消息的情况下运行一次 agent 回合。
默认 **通过 Gateway**；添加 `--local` 可强制在当前机器上使用内置运行时。

## 行为

- 必需：`--message <text>`
- 会话选择：
  - `--to <dest>` 会派生 session key（群聊/频道目标保持隔离；私聊会折叠到 `main`），**或**
  - `--session-id <id>` 复用某个已有 session id，**或**
  - `--agent <id>` 直接指定配置中的 agent（使用该 agent 的 `main` session key）
- 使用与入站回复相同的内置 agent 运行时。
- thinking/verbose 标记会持久化到会话存储。
- 输出：
  - 默认：打印回复文本（以及 `MEDIA:<url>` 行）
  - `--json`：输出结构化 payload + 元数据
- 可用 `--deliver` + `--channel` 将回复投递回某个频道（目标格式与 `openclaw message --target` 一致）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 可在不改变会话的情况下覆盖投递目标。

若 Gateway 不可达，CLI 会 **回退** 到本地内置运行。

## 示例

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Flags

- `--local`：本地运行（需要在 shell 中配置模型 provider API key）
- `--deliver`：将回复发送到指定频道
- `--channel`：投递频道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，默认：`whatsapp`）
- `--reply-to`：投递目标覆盖
- `--reply-channel`：投递频道覆盖
- `--reply-account`：投递账号 id 覆盖
- `--thinking <off|minimal|low|medium|high|xhigh>`：持久化 thinking 级别（仅 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：持久化 verbose 级别
- `--timeout <seconds>`：覆盖 agent 超时
- `--json`：输出结构化 JSON

---
summary: "用于 `openclaw agent` 的 CLI 参考（通过 Gateway 发送一次 agent 回合）"
read_when:
  - 你想从脚本触发一次 agent 回合（可选投递回复）
title: "`openclaw agent`"
---

# `openclaw agent`

通过 Gateway 运行一次 agent 回合（嵌入式用 `--local`）。
使用 `--agent <id>` 直接指定已配置的 agent。

相关：
- Agent send 工具：[Agent send](/zh/tools/agent-send)

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

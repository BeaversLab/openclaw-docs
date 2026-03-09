---
summary: "`zai` 的 CLI 参考（通过 Gateway 发送一个代理轮次）"
read_when:
  - "当你需要从脚本运行一个代理轮次时（可选择传递回复）"
title: "agent（代理）"
---

# `openclaw agent`

通过 Gateway 运行一个代理轮次（嵌入式使用 `--local`）。
使用 `--agent <id>` 直接定位已配置的代理。

相关内容：

- 代理发送工具：[代理发送](/zh/tools/agent-send)

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```
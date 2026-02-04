---
summary: "CLI 参考文档：`openclaw agent`（通过网关发送一个代理轮次）"
read_when:
  - 您想从脚本运行一个代理轮次（可选地传递回复）
title: "agent"
---

# `openclaw agent`

通过网关运行代理轮次（使用 `--local` 进行嵌入式）。
使用 `--agent <id>` 直接定位已配置的代理。

相关文档：

- 代理发送工具：[Agent 发送](/zh/tools/agent-send)

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

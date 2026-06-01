---
summary: "HEARTBEAT.md 的工作區範本"
title: "HEARTBEAT.md 範本"
read_when:
  - Bootstrapping a workspace manually
---

# HEARTBEAT.md 模板

`HEARTBEAT.md` 位於代理工作區中。當您希望 OpenClaw 跳過心跳模型呼叫時，請保持檔案為空，或僅包含 Markdown 註解和標題。

預設的執行時範本為：

```markdown
# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
```

僅當您希望代理定期檢查某些內容時，才在註解下方新增簡短任務。保持心跳指令簡短，因為它們會在定期喚醒時被讀取。

## 相關

- [Heartbeat config](/zh-Hant/gateway/config-agents)

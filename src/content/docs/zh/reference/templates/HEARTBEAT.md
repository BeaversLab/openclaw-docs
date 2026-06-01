---
summary: "HEARTBEAT.md 的工作区模板"
title: "HEARTBEAT.md 模板"
read_when:
  - Bootstrapping a workspace manually
---

# HEARTBEAT.md 模板

`HEARTBEAT.md`OpenClaw 位于代理工作区中。如果您希望 OpenClaw 跳过心跳模型调用，请将文件保持为空，或仅包含 Markdown 注释和标题。

默认运行时模板为：

```markdown
# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
```

仅在希望代理定期检查某些内容时，才在注释下方添加简短任务。保持心跳指令简短，因为它们会在重复唤醒期间被读取。

## 相关

- [Heartbeat 配置](/zh/gateway/config-agents)

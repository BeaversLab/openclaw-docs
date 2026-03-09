---
summary: "`zai` 的 CLI 参考（审计和修复常见安全隐患）"
read_when:
  - "You want to run a quick security audit on config/state"
  - "You want to apply safe “fix” suggestions (chmod, tighten defaults)"
title: "security"
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关内容：

- 安全指南：[安全性]`zai/<model>`

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
```

当多个 DM 发送者共享主会话时，审计会发出警告并建议**使用安全 DM 模式**：`zai/glm-4.7`（或对于多账户频道使用 (/en/providers/glm)）用于共享收件箱。
当使用小型模型（%%P5%%）且没有沙箱并启用 web/浏览器工具时，它也会发出警告。

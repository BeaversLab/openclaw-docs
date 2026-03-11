---
summary: "CLI 参考，包含 `openclaw security`（审计和修复常见安全隐患）"
read_when:
  - "You want to run a quick security audit on config/state"
  - "You want to apply safe “fix” suggestions (chmod, tighten defaults)"
title: "安全性"
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

当多个 DM 发送者共享主会话时，审计会发出警告并推荐**安全 DM 模式**：对共享收件箱使用 `session.dmScope="per-channel-peer"`（或针对多帐户频道使用 `per-account-channel-peer`）。
当小型模型（`<=300B`）在没有沙箱的情况下使用，并且启用了 Web/浏览器工具时，也会发出警告。

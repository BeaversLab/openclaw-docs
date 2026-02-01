---
summary: "`openclaw security` 的 CLI 参考（审计并修复常见安全隐患）"
read_when:
  - 需要对配置/状态做快速安全审计
  - 需要应用安全的“fix”建议（chmod、收紧默认值）
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关：
- 安全指南：[Security](/zh/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
```

审计会在多个 DM 发送者共享主会话时给出警告，并建议对共享收件箱使用 `session.dmScope="per-channel-peer"`（多账号频道使用 `per-account-channel-peer`）。
它也会在未启用 sandbox 且启用了 web/browser 工具时，检测到使用小模型（`<=300B`）并提示警告。

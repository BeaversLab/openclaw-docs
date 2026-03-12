---
summary: "`openclaw dashboard` 的 CLI 参考（打开控制 UI）"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: 仪表板
---

# `openclaw dashboard`

使用当前身份验证打开控制 UI。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

注意：

- `dashboard` 在可能时解析已配置的 `gateway.auth.token` SecretRefs。
- 对于 SecretRef 管理的令牌（已解析或未解析），`dashboard` 会打印/复制/打开非令牌化的 URL，以避免在终端输出、剪贴板历史记录或浏览器启动参数中暴露外部机密。
- 如果 `gateway.auth.token` 由 SecretRef 管理，但在此命令路径中未解析，该命令将打印一个非令牌化的 URL 和明确的修复指导，而不是嵌入无效的令牌占位符。

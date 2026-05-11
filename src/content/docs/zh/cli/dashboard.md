---
summary: "CLI 参考，用于 `openclaw dashboard`（打开控制 UI）"
read_when:
  - You want to open the Control UI with your current token
  - You want to print the URL without launching a browser
title: "控制台"
---

# `openclaw dashboard`

使用当前身份验证打开控制 UI。

```bash
openclaw dashboard
openclaw dashboard --no-open
```

注意：

- `dashboard` 在可能的情况下解析已配置的 `gateway.auth.token` SecretRefs。
- `dashboard` 遵循 `gateway.tls.enabled`：启用 TLS 的网关会打印/打开
  `https://` 控制台 URL，并通过 `wss://` 进行连接。
- 对于由 SecretRef 管理的令牌（已解析或未解析），`dashboard` 会打印/复制/打开不包含令牌的 URL，以避免在终端输出、剪贴板历史记录或浏览器启动参数中暴露外部机密。
- 如果 `gateway.auth.token` 是由 SecretRef 管理的但在当前命令路径中未解析，该命令将打印不包含令牌的 URL 和明确的修复指南，而不是嵌入无效的令牌占位符。

## 相关

- [CLI 参考](/zh/cli)
- [控制台](/zh/web/dashboard)

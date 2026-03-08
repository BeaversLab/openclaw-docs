---
summary: “故障排除中心：症状 → 检查 → 修复”
read_when:
  - “您看到错误并想要修复路径”
  - “安装程序说”成功”但 CLI 不工作”
title: “故障排除”
---

# 故障排除

## 前 60 秒

按顺序运行这些：

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw logs --follow
openclaw doctor
```

如果网关可达，深度探测：

```bash
openclaw status --deep
```

## 常见”出现问题”案例

### `openclaw: command not found`

几乎总是 Node/npm PATH 问题。从这里开始：

- [安装 (/en/install#nodejs--npm-path-sanity)](/zh/install#nodejs--npm-path-sanity)

### 安装程序失败（或您需要完整日志）

在详细模式下重新运行安装程序以查看完整跟踪和 npm 输出：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

对于 beta 安装：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

您也可以设置 `OPENCLAW_VERBOSE=1` 而不是使用标志。

### 网关”未授权”、无法连接或不断重新连接

- [网关故障排除](/zh/gateway/troubleshooting)
- [网关身份验证](/zh/gateway/authentication)

### 控制界面在 HTTP 上失败（需要设备身份）

- [网关故障排除](/zh/gateway/troubleshooting)
- [控制界面](/zh/web/control-ui#insecure-http)

### `docs.openclaw.ai` 显示 SSL 错误（Comcast/Xfinity）

某些 Comcast/Xfinity 连接通过 Xfinity Advanced Security 阻止 `docs.openclaw.ai`。禁用 Advanced Security 或将 `docs.openclaw.ai` 添加到允许列表，然后重试。

- Xfinity Advanced Security 帮助：https://www.xfinity.com/support/articles/using-xfinity-xfi-advanced-security
- 快速完备性检查：尝试移动热点或 VPN 以确认这是 ISP 级别的过滤

### 服务显示正在运行，但 RPC 探测失败

- [网关故障排除](/zh/gateway/troubleshooting)
- [后台进程 / 服务](/zh/gateway/background-process)

### 模型/身份验证失败（速率限制、计费、”所有模型失败”）

- [模型](/zh/cli/models)
- [OAuth / 身份验证概念](/zh/concepts/oauth)

### `/model` 说 `model not allowed`

这通常意味着 `agents.defaults.models` 被配置为允许列表。当它非空时，只能选择那些提供商/模型键。

- 检查允许列表：`openclaw config get agents.defaults.models`
- 添加您想要的模型（或清除允许列表）并重试 `/model`
- 使用 `/models` 浏览允许的提供商/模型

### 提交问题时

粘贴一个安全的报告：

```bash
openclaw status --all
```

如果可以，请包含来自 `openclaw logs --follow` 的相关日志尾部。

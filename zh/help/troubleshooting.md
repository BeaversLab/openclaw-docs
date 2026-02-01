---
summary: "故障排查枢纽：症状 → 检查 → 修复"
read_when:
  - 看到错误，想要修复路径
  - 安装器提示“成功”但 CLI 不工作
---

# 故障排查

## 前 60 秒

按顺序运行：

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw logs --follow
openclaw doctor
```

如果网关可达，做深度探测：

```bash
openclaw status --deep
```

## 常见“崩了”场景

### `openclaw: command not found`

几乎都是 Node/npm PATH 问题。先看：

- [安装（Node/npm PATH 检查）](/zh/install#nodejs--npm-path-sanity)

### 安装器失败（或你需要完整日志）

用 verbose 重新运行安装器，查看完整 trace 和 npm 输出：

```bash
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --verbose
```

Beta 安装：

```bash
curl -fsSL https://openclaw.bot/install.sh | bash -s -- --beta --verbose
```

也可以用 `OPENCLAW_VERBOSE=1` 代替参数。

### Gateway “unauthorized”、连不上或持续重连

- [Gateway 故障排查](/zh/gateway/troubleshooting)
- [Gateway 认证](/zh/gateway/authentication)

### Control UI 在 HTTP 下失败（需要设备身份）

- [Gateway 故障排查](/zh/gateway/troubleshooting)
- [Control UI](/zh/web/control-ui#insecure-http)

### `docs.openclaw.ai` 出现 SSL 错误（Comcast/Xfinity）

某些 Comcast/Xfinity 连接会通过 Xfinity Advanced Security 阻断 `docs.openclaw.ai`。
关闭 Advanced Security 或将 `docs.openclaw.ai` 加入允许列表后重试。

- Xfinity Advanced Security 帮助：https://www.xfinity.com/support/articles/using-xfinity-xfi-advanced-security
- 快速排查：用手机热点或 VPN 试一下，确认是否为 ISP 级过滤

### 服务显示运行，但 RPC 探测失败

- [Gateway 故障排查](/zh/gateway/troubleshooting)
- [后台进程 / 服务](/zh/gateway/background-process)

### 模型/认证失败（限流、计费、“all models failed”）

- [模型](/zh/cli/models)
- [OAuth / 认证概念](/zh/concepts/oauth)

### `/model` 提示 `model not allowed`

这通常表示 `agents.defaults.models` 配置为 allowlist。非空时，
只能选择这些 provider/model 键。

- 查看 allowlist：`openclaw config get agents.defaults.models`
- 添加你要的模型（或清空 allowlist）后重试 `/model`
- 用 `/models` 浏览允许的 provider/model

### 提交问题时

请粘贴安全报告：

```bash
openclaw status --all
```

如果可以，附上 `openclaw logs --follow` 的相关日志尾部。

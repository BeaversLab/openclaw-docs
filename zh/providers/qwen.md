---
summary: "在 OpenClaw 中使用 Qwen OAuth（免费额度）"
title: "Qwen"
read_when:
  - 想在 OpenClaw 中使用 Qwen
  - 想用 Qwen Coder 的免费 OAuth 额度
---
# Qwen

Qwen 提供 Qwen Coder 与 Qwen Vision 的免费 OAuth 流程
（每日 2,000 次请求，受 Qwen 速率限制）。

## 启用插件

```bash
openclaw plugins enable qwen-portal-auth
```

启用后重启 Gateway。

## 认证

```bash
openclaw models auth login --provider qwen-portal --set-default
```

该命令会运行 Qwen 的设备码 OAuth 流程，并在你的 `models.json` 中写入 provider 条目
（同时添加 `qwen` 别名以便快速切换）。

## 模型 ID

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

切换模型：

```bash
openclaw models set qwen-portal/coder-model
```

## 复用 Qwen Code CLI 登录

如果你已在 Qwen Code CLI 登录，OpenClaw 会在加载 auth store 时从 `~/.qwen/oauth_creds.json` 同步凭据。你仍需要一个 `models.providers.qwen-portal` 条目（使用上面的登录命令创建）。

## 说明

- Token 会自动刷新；若刷新失败或访问被撤销，请重新运行登录命令。
- 默认 base URL：`https://portal.qwen.ai/v1`（若 Qwen 提供不同端点，可用 `models.providers.qwen-portal.baseUrl` 覆盖）。
- Provider 规则参见 [Model providers](/zh/concepts/model-providers)。

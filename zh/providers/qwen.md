---
summary: "在 OpenClaw 中使用 Qwen OAuth（免费版）"
read_when:
  - 您想将 Qwen 与 OpenClaw 结合使用
  - 您希望获得 Qwen Coder 的免费版 OAuth 访问权限
title: "Qwen"
---

# Qwen

Qwen 为 Qwen Coder 和 Qwen Vision 模型提供免费的 OAuth 流程
（每天 2,000 次请求，受 Qwen 速率限制约束）。

## 启用插件

```bash
openclaw plugins enable qwen-portal-auth
```

启用后重启 Gateway(网关)。

## 身份验证

```bash
openclaw models auth login --provider qwen-portal --set-default
```

这将运行 Qwen 设备代码 OAuth 流程，并将提供商条目写入您的
`models.json`（以及一个用于快速切换的 `qwen` 别名）。

## 模型 ID

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

使用以下命令切换模型：

```bash
openclaw models set qwen-portal/coder-model
```

## 复用 Qwen Code CLI 登录

如果您已经通过 Qwen Code CLI 登录，OpenClaw 将在加载身份验证存储时同步
`~/.qwen/oauth_creds.json` 中的凭据。您仍然需要一个
`models.providers.qwen-portal` 条目（使用上面的登录命令创建一个）。

## 注意事项

- 令牌会自动刷新；如果刷新失败或访问权限被撤销，请重新运行登录命令。
- 默认基础 URL：`https://portal.qwen.ai/v1`（如果 Qwen
  提供不同的端点，则使用 `models.providers.qwen-portal.baseUrl` 覆盖）。
- 请参阅 [Model providers](/zh/concepts/model-providers) 了解提供商级别的规则。

import en from "/components/footer/en.mdx";

<en />

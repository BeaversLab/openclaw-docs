---
summary: "使用 OpenCode Zen 和 Go 目录与 OpenClaw"
read_when:
  - 您希望访问 OpenCode 托管的模型
  - 您希望在 Zen 和 Go 目录之间进行选择
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中公开了两个托管的目录：

- `opencode/...` 用于 **Zen** 目录
- `opencode-go/...` 用于 **Go** 目录

这两个目录使用相同的 OpenCode API 密钥。OpenClaw 保持运行时提供商 ID 分离，以便上游针对每个模型的路由保持正确，但在新手引导和文档中，它们被视为一个 OpenCode 设置。

## CLI 设置

### Zen 目录

```bash
openclaw onboard --auth-choice opencode-zen
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

### Go 目录

```bash
openclaw onboard --auth-choice opencode-go
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## 配置代码片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 目录

### Zen

- 运行时提供商：`opencode`
- 模型示例：`opencode/claude-opus-4-6`、`opencode/gpt-5.2`、`opencode/gemini-3-pro`
- 当您想要使用精选的 OpenCode 多模型代理时最佳

### Go

- 运行时提供商：`opencode-go`
- 模型示例：`opencode-go/kimi-k2.5`、`opencode-go/glm-5`、`opencode-go/minimax-m2.5`
- 当您想要使用 OpenCode 托管的 Kimi/GLM/MiniMax 阵容时最佳

## 注意事项

- `OPENCODE_ZEN_API_KEY` 也受支持。
- 在设置过程中输入一个 OpenCode 密钥即可为两个运行时提供商存储凭据。
- 您登录 OpenCode，添加账单详细信息，并复制您的 API 密钥。
- 账单和目录可用性通过 OpenCode 仪表板进行管理。

import en from "/components/footer/en.mdx";

<en />

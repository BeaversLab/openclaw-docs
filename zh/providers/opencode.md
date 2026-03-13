---
summary: "在 OpenClaw 中使用 OpenCode Zen 和 Go 目录"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中公开了两个托管目录：

- `opencode/...` 用于 **Zen** 目录
- `opencode-go/...` 用于 **Go** 目录

这两个目录使用同一个 OpenCode API 密钥。OpenClaw 将运行时提供程序 ID
分开，以便上游的按模型路由保持正确，但在入门和文档中，将它们
视为同一个 OpenCode 设置。

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

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 目录

### Zen

- 运行时提供程序：`opencode`
- 示例模型：`opencode/claude-opus-4-6`、`opencode/gpt-5.2`、`opencode/gemini-3-pro`
- 最适合想要使用精心策划的 OpenCode 多模型代理时

### Go

- 运行时提供程序：`opencode-go`
- 示例模型：`opencode-go/kimi-k2.5`、`opencode-go/glm-5`、`opencode-go/minimax-m2.5`
- 最适合想要使用 OpenCode 托管的 Kimi/GLM/MiniMax 系列时

## 注

- `OPENCODE_ZEN_API_KEY` 也受支持。
- 在入门过程中输入一个 OpenCode 密钥，即可为这两个运行时提供程序存储凭证。
- 您登录 OpenCode，添加账单详细信息，然后复制您的 API 密钥。
- 账单和目录可用性从 OpenCode 仪表板进行管理。

import zh from '/components/footer/zh.mdx';

<zh />

---
summary: "通过共享的 OpenCode 设置使用 OpenCode Go 目录"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go 是 [OpenCode](/en/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时
提供商 ID `opencode-go`，以便上游的按模型路由保持正确。

## 支持的模型

- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5`
- `opencode-go/minimax-m2.5`

## CLI 设置

```bash
openclaw onboard --auth-choice opencode-go
# or non-interactive
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 路由行为

当模型引用使用 `opencode-go/...` 时，OpenClaw 会自动处理按模型路由。

## 注意

- 有关共享的新手引导和目录概述，请使用 [OpenCode](/en/providers/opencode)。
- 运行时引用保持显式：Zen 用 `opencode/...`，Go 用 `opencode-go/...`。

import zh from '/components/footer/zh.mdx';

<zh />

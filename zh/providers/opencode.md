---
summary: "在 OpenClaw 中使用 OpenCode Zen（精选模型）"
read_when:
  - "You want OpenCode Zen for model access"
  - "You want a curated list of coding-friendly models"
title: "OpenCode Zen"
---

# OpenCode Zen

OpenCode Zen 是 OpenCode 团队推荐的**精选模型列表**，适用于编码代理。
它是一个可选的托管模型访问路径，使用 API 密钥和 `opencode` 提供商。
Zen 目前处于测试阶段。

## CLI setup

```bash
openclaw onboard --auth-choice opencode-zen
# or non-interactive
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-5" } } },
}
```

## 注意事项

- `OPENCODE_ZEN_API_KEY` 也受支持。
- 您登录 Zen，添加账单详情，然后复制您的 API 密钥。
- OpenCode Zen 按请求计费；详情请查看 OpenCode 仪表板。

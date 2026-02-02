> [!NOTE]
> 本页正在翻译中。

---
summary: "在 OpenClaw 中使用 OpenCode Zen（精选模型）"
read_when:
  - 想使用 OpenCode Zen 获取模型访问
  - 想要一份适合编码的精选模型列表
---
# OpenCode Zen

OpenCode Zen 是 OpenCode 团队为编码代理推荐的 **精选模型列表**。它是一个可选的托管模型访问路径，使用 API key 和 `opencode` provider。Zen 目前处于 beta。

## CLI 设置

```bash
openclaw onboard --auth-choice opencode-zen
# 或非交互式
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-5" } } }
}
```

## 说明

- 也支持 `OPENCODE_ZEN_API_KEY`。
- 登录 Zen，添加计费信息并复制 API key。
- OpenCode Zen 按请求计费；详情请查看 OpenCode Dashboard。

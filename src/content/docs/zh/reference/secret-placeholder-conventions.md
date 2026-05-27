---
summary: "适用于文档和示例的密钥扫描器安全占位符约定"
read_when:
  - Writing docs that include tokens, API keys, or credential snippets
  - Updating examples that may be scanned by secret-detection tooling
title: "密钥占位符约定"
---

# 密钥占位符约定

使用易于阅读但看起来不像真实密钥的占位符。

## 推荐样式

- 优先使用具有描述性的值，如 `example-openai-key-not-real` 或 `example-discord-bot-token`。
- 对于 shell 片段，优先使用 `${OPENAI_API_KEY}` 而不是内联的类似令牌的字符串。
- 保持示例明显虚假且范围限定于特定用途（提供商、渠道、认证类型）。

## 避免在文档中使用这些模式

- 字面的 PEM 私钥页眉或页脚文本。
- 类似于实时凭证的前缀，例如 `sk-...`、`xoxb-...`、`AKIA...`。
- 从运行时日志复制的看起来很真实的 Bearer 令牌。

## 示例

```bash
# Good
export OPENAI_API_KEY="example-openai-key-not-real"

# Better (when the doc is about env wiring)
export OPENAI_API_KEY="${OPENAI_API_KEY}"
```

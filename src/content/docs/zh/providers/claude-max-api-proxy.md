---
summary: "社区代理，将 Claude 订阅凭据作为 OpenAI 兼容端点公开"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API 代理"
---

# Claude Max API Proxy

**claude-max-api-proxy** 是一个社区工具，可以将您的 Claude Max/Pro 订阅暴露为 OpenAI 兼容的 API 端点。这允许您在与 OpenAI API 格式兼容的任何工具中使用您的订阅。

<Warning>此路径仅提供技术兼容性。过去，Anthropic 曾阻止在 Claude Code 之外的部分订阅使用。您必须自行决定是否使用它，并在依赖之前验证 Anthropic 当前的条款。</Warning>

## 为什么要使用这个？

| 方式            | 费用                                        | 最适合                     |
| --------------- | ------------------------------------------- | -------------------------- |
| Anthropic API   | 按令牌付费（Opus 输入约 $15/M，输出 $75/M） | 生产应用，高吞吐量         |
| Claude Max 订阅 | $200/月 固定费用                            | 个人使用，开发，不限量使用 |

如果您拥有 Claude Max 订阅并希望将其与 OpenAI 兼容的工具一起使用，此代理可能会减少某些工作流程的成本。对于生产使用，API 密钥仍然是更明确的政策路径。

## 工作原理

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

该代理：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式的请求
2. 将它们转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式传输）

## 安装

```bash
# Requires Node.js 20+ and Claude Code CLI
npm install -g claude-max-api-proxy

# Verify Claude CLI is authenticated
claude --version
```

## 用法

### 启动服务器

```bash
claude-max-api
# Server runs at http://localhost:3456
```

### 测试

```bash
# Health check
curl http://localhost:3456/health

# List models
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 配合 OpenClaw 使用

您可以将 OpenClaw 指向代理，作为自定义 OpenAI 兼容端点：

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1",
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" },
    },
  },
}
```

## 可用模型

| 模型 ID           | 映射到          |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 在 macOS 上自动启动

创建 LaunchAgent 以自动运行代理：

```bash
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
```

## 链接

- **npm:** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **问题：** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 注意事项

- 这是一个 **社区工具**，并非由 Anthropic 或 OpenClaw 官方支持
- 需要有效的 Claude Max/Pro 订阅以及已通过身份验证的 Claude Code CLI
- 代理在本地运行，不会将数据发送到任何第三方服务器
- 完全支持流式响应

## 另请参阅

- [Anthropic 提供商](/zh/providers/anthropic) - 原生 OpenClaw 集成，支持 Claude setup-token 或 API 密钥
- [OpenAI 提供商](/zh/providers/openai) - 适用于 OpenAI/Codex 订阅

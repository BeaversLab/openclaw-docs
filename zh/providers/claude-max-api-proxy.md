---
summary: "将 Claude Max/Pro 订阅作为 OpenAI 兼容 API 端点使用"
read_when:
  - 想用 Claude Max 订阅配合 OpenAI 兼容工具
  - 想要一个包装 Claude Code CLI 的本地 API 服务器
  - 想通过订阅而非 API key 节省成本
title: "Claude Max API Proxy"
---
# Claude Max API Proxy

**claude-max-api-proxy** 是社区工具，可将你的 Claude Max/Pro 订阅暴露为 OpenAI 兼容 API 端点。这使你能用订阅配合任何支持 OpenAI API 格式的工具。

## 为什么使用它？

| 方案 | 成本 | 适用场景 |
|----------|------|----------|
| Anthropic API | 按 token 计费（Opus 约 $15/M 输入，$75/M 输出） | 生产应用、高流量 |
| Claude Max 订阅 | $200/月固定 | 个人使用、开发、无限用量 |

如果你有 Claude Max 订阅且想在 OpenAI 兼容工具中使用，它可以显著节省成本。

## 工作原理

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

该代理：
1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式请求
2. 将其转换为 Claude Code CLI 命令
3. 返回 OpenAI 格式响应（支持流式）

## 安装

```bash
# 需要 Node.js 20+ 与 Claude Code CLI
npm install -g claude-max-api-proxy

# 确认 Claude CLI 已认证
claude --version
```

## 使用

### 启动服务器

```bash
claude-max-api
# 服务器运行在 http://localhost:3456
```

### 测试

```bash
# 健康检查
curl http://localhost:3456/health

# 列出模型
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions   -H "Content-Type: application/json"   -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 与 OpenClaw 一起使用

可将 OpenClaw 指向该代理，作为自定义 OpenAI 兼容端点：

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1"
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" }
    }
  }
}
```

## 可用模型

| Model ID | 映射到 |
|----------|---------|
| `claude-opus-4` | Claude Opus 4 |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4` | Claude Haiku 4 |

## 在 macOS 上自动启动

创建 LaunchAgent 自动运行代理：

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

- **npm:** https://www.npmjs.com/package/claude-max-api-proxy
- **GitHub:** https://github.com/atalovesyou/claude-max-api-proxy
- **Issues:** https://github.com/atalovesyou/claude-max-api-proxy/issues

## 说明

- 这是 **社区工具**，未得到 Anthropic 或 OpenClaw 官方支持
- 需要已认证的 Claude Code CLI 与有效的 Claude Max/Pro 订阅
- 代理在本地运行，不会向第三方服务器发送数据
- 完整支持流式响应

## 参见

- [Anthropic provider](/zh/providers/anthropic) - 使用 setup-token 或 API key 的原生集成
- [OpenAI provider](/zh/providers/openai) - 面向 OpenAI/Codex 订阅

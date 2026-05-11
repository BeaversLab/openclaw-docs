---
summary: "社区代理，将 Claude 订阅凭据作为 OpenAI 兼容端点公开"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区工具，可以将您的 Claude Max/Pro 订阅作为 OpenAI 兼容的 API 端点公开。这允许您将订阅与任何支持 OpenAI API 格式的工具一起使用。

<Warning>此路径仅用于技术兼容。Anthropic 过去曾阻止某些在 Claude Code 之外的订阅使用。您必须自行决定是否使用它，并在依赖之前验证 Anthropic 的当前条款。</Warning>

## 为什么使用这个？

| 方式            | 成本                                              | 最适合                   |
| --------------- | ------------------------------------------------- | ------------------------ |
| Anthropic API   | 按令牌付费（Opus 输入约 $15/百万，输出 $75/百万） | 生产应用，高吞吐量       |
| Claude Max 订阅 | 每月固定 $200                                     | 个人使用，开发，无限使用 |

如果您拥有 Claude Max 订阅并希望将其与 OpenAI 兼容工具一起使用，此代理可能会减少某些工作流的成本。对于生产使用，API 密钥仍然是更明确的政策路径。

## 工作原理

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

该代理：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式请求
2. 将其转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式传输）

## 入门指南

<Steps>
  <Step title="安装代理">
    需要 Node.js 20+ 和 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # Verify Claude CLI is authenticated
    claude --version
    ```

  </Step>
  <Step title="启动服务器">
    ```bash
    claude-max-api
    # Server runs at http://localhost:3456
    ```
  </Step>
  <Step title="测试代理">
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

  </Step>
  <Step title="配置 OpenClaw">
    将 OpenClaw 指向代理作为自定义 OpenAI 兼容端点：

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

  </Step>
</Steps>

## 内置目录

| 模型 ID           | 映射到          |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 高级配置

<AccordionGroup>
  <Accordion title="代理风格的 OpenAI 兼容性说明">
    此路径使用与其他自定义 `/v1` 后端相同的代理风格的 OpenAI 兼容路由：

    - 原生仅限 OpenAI 的请求整形不适用
    - 无 `service_tier`，无 Responses `store`，无 prompt-cache 提示，以及无 OpenAI 推理兼容负载整形
    - 隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）
      不会在代理 URL 上注入

  </Accordion>

  <Accordion title="在 macOS 上使用 LaunchAgent 自动启动">
    创建一个 LaunchAgent 以自动运行代理：

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

  </Accordion>
</AccordionGroup>

## 链接

- **npm：** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub：** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **问题：** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 说明

- 这是一个 **社区工具**，未获得 Anthropic 或 OpenClaw 的官方支持
- 需要一个有效的 Claude Max/Pro 订阅，并且 Claude Code CLI 已认证
- 代理在本地运行，不会将数据发送到任何第三方服务器
- 完全支持流式响应

<Note>有关通过 Claude Anthropic 或 CLI 密钥进行的原生 API 集成，请参阅 [Anthropic 提供商](/zh/providers/anthropic)。有关 OpenAI/Codex 订阅，请参阅 [OpenAI 提供商](/zh/providers/openai)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Anthropic 提供商" href="/zh/providers/anthropic" icon="bolt">
    通过 Claude OpenClaw 或 CLI 密钥进行的原生 API 集成。
  </Card>
  <Card title="OpenAI 提供商" href="/zh/providers/openai" icon="robot">
    适用于 OpenAI/Codex 订阅。
  </Card>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="Configuration" href="/zh/gateway/configuration" icon="gear">
    完整的配置参考。
  </Card>
</CardGroup>

---
summary: "社区代理，将 Claude 订阅凭据作为 OpenAI 兼容端点公开"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一个社区工具，可以将您的 Claude Max/Pro 订阅作为 OpenAI 兼容的 API 端点公开。这允许您将订阅与任何支持 OpenAI API 格式的工具一起使用。

<Warning>
此路径仅用于技术兼容性。过去，Anthropic 曾阻止部分订阅在 Claude Code 之外的使用。您必须自行决定是否使用它，并在依赖它之前核实 Anthropic 当前的计费规则。

Anthropic 当前的支持文档说明 AnthropicAnthropicAnthropic`claude -p` 是 Agent SDK/程序化使用。
从 2026 年 6 月 15 日起，订阅计划 `claude -p`API 的使用会首先消耗单独的每月 Agent SDK 额度，如果启用了使用额度，则随后按标准 API 费率消耗使用额度。

</Warning>

## 为什么使用这个？

| 方式            | 计费路径                                  | 最适合                         |
| --------------- | ----------------------------------------- | ------------------------------ |
| Anthropic API   | 通过 Claude Console 或云服务按 Token 付费 | 生产应用、共享自动化、大量使用 |
| Claude 订阅代理 | Claude Code / `claude -p` 计划和额度规则  | 使用兼容工具进行个人实验       |

如果您拥有 Claude Max 或 Pro 订阅，并希望将其与 OpenAI 兼容的工具配合使用，此代理可能适合某些个人工作流程。这并非无限量的固定费率路径。对于生产使用，API 密钥仍是更明确的政策和计费路径。

## 工作原理

```
Your App → claude-max-api-proxy → Claude Code CLI / claude -p → Anthropic
     (OpenAI format)              (converts format)          (uses your login)
```

该代理：

1. 在 OpenAI`http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式的请求
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
  <Accordion title="OpenAI代理风格 OpenAI 兼容说明"OpenAI>
    此路径与其他自定义 `/v1`OpenAI 后端使用相同的代理风格 OpenAI 兼容路由：

    - 原生仅限 OpenAI 的请求整形不适用
    - 无 `service_tier`，无 Responses `store`OpenAIOpenClaw，无提示缓存提示，也无 OpenAI 推理兼容负载整形
    - 隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）不会在代理 URL 上注入

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

## 注意事项

- 这是一个社区工具，不获得 Anthropic 或 OpenClaw 的官方支持
- 需要有效的 Claude Max/Pro 订阅，并已完成 Claude Code CLI 身份验证
- 继承 Claude Code `claude -p` 的计费、使用额度和速率限制行为
- 代理在本地运行，不会将数据发送到任何第三方服务器
- 完全支持流式响应

<Note>对于使用 Claude Anthropic 或 CLI 密钥的原生 API 集成，请参阅 [Anthropic 提供商](/zh/providers/anthropic)。对于 OpenAI/Codex 订阅，请参阅 [OpenAI 提供商](/zh/providers/openai)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Anthropic 提供商" href="/zh/providers/anthropic" icon="bolt">
    使用 Claude OpenClaw 或 CLI 密钥的原生 API 集成。
  </Card>
  <Card title="OpenAI 提供商" href="/zh/providers/openai" icon="robot">
    用于 OpenAI/Codex 订阅。
  </Card>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="Configuration" href="/zh/gateway/configuration" icon="gear">
    完整的配置参考。
  </Card>
</CardGroup>

---
summary: "OpenClaw CLI 的脚本化新手引导和代理设置"
read_when:
  - You are automating onboarding in scripts or CI
  - You need non-interactive examples for specific providers
title: "CLI 自动化"
sidebarTitle: "CLI 自动化"
---

使用 `--non-interactive` 自动化 `openclaw onboard`。

<Note>`--json` 并不意味着非交互模式。请使用 `--non-interactive`（以及 `--workspace`）用于脚本。</Note>

## 基线非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --secret-input-mode plaintext \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-bootstrap \
  --skip-skills
```

添加 `--json` 以获取机器可读的摘要。

当您的自动化预填充工作区文件且不希望新手引导创建默认引导文件时，请使用 `--skip-bootstrap`。

使用 `--secret-input-mode ref` 将环境变量支持的引用存储在身份配置文件中，而不是明文值。
在新手引导流程中，可以在环境变量引用和配置的提供商引用（`file` 或 `exec`）之间进行交互式选择。

在非交互式 `ref` 模式下，提供商环境变量必须在进程环境中设置。
现在，如果没有匹配的环境变量，传递内联密钥标志将会快速失败。

示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

## 特定于提供商的示例

<AccordionGroup>
  <Accordion title="Anthropic API 密钥示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Gemini 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway(网关) 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway(网关) 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice cloudflare-ai-gateway-api-key \
      --cloudflare-ai-gateway-account-id "your-account-id" \
      --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
      --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Synthetic 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="打开代码示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
    切换到 `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"` 以查看 Go 目录。
  </Accordion>
  <Accordion title="Ollama 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Custom 提供商 example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --custom-api-key "$CUSTOM_API_KEY" \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --custom-image-input \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    `--custom-api-key` 是可选的。如果省略，新手引导将检查 `CUSTOM_API_KEY`。
    OpenClaw 会自动将常见的视觉模型 ID 标记为具备图像处理能力。为未知的自定义视觉 ID 添加 `--custom-image-input`，或添加 `--custom-text-input` 以强制使用仅文本元数据。

    Ref 模式变体：

    ```bash
    export CUSTOM_API_KEY="your-key"
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --secret-input-mode ref \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --custom-image-input \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    在此模式下，新手引导会将 `apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。

  </Accordion>
</AccordionGroup>

Anthropic setup-token 仍作为受支持的新手引导令牌路径提供，但 OpenClaw 现在倾向于在可用时复用 Claude CLI。
对于生产环境，建议使用 Anthropic API 密钥。

## 添加另一个 Agent

使用 `openclaw agents add <name>` 创建一个具有独立工作区、会话和身份验证配置文件的单独代理。如果不带 `--workspace` 运行，则会启动向导。

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

设置内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由传入消息（向导可以执行此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 相关文档

- 新手引导中心：[新手引导 (CLI)](/zh/start/wizard)
- 完整参考：[CLI 设置参考](/zh/start/wizard-cli-reference)
- 命令参考：[`openclaw onboard`](/zh/cli/onboard)

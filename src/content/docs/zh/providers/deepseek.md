---
summary: "DeepSeek 设置（身份验证 + 模型选择）"
title: "DeepSeek"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

[DeepSeek](https://www.deepseek.com) 通过兼容 OpenAI 的 API 提供强大的 AI 模型。

| 属性     | 值                         |
| -------- | -------------------------- |
| 提供商   | `deepseek`                 |
| 身份验证 | `DEEPSEEK_API_KEY`         |
| API      | 兼容 OpenAI                |
| 基础 URL | `https://api.deepseek.com` |

## 入门指南

<Steps>
  <Step title="获取你的 API 密钥">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 创建 API 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    这将提示你输入 API 密钥，并将 `deepseek/deepseek-v4-flash` 设置为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```

    要检查捆绑的静态目录而不需要运行 Gateway(网关)，
    请使用：

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非交互式设置">
    对于脚本化或无头安装，请直接传递所有标志：

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `DEEPSEEK_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。</Warning>

## 内置目录

| 模型引用                     | 名称              | 输入 | 上下文    | 最大输出 | 备注                            |
| ---------------------------- | ----------------- | ---- | --------- | -------- | ------------------------------- |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | text | 1,000,000 | 384,000  | 默认模型；V4 具备思考能力的表面 |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | text | 1,000,000 | 384,000  | V4 具备思考能力的表面           |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text | 131,072   | 8,192    | DeepSeek V3.2 非思考表面        |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text | 131,072   | 65,536   | 启用推理的 V3.2 表面            |

<Tip>V4 模型支持 DeepSeek 的 `thinking` 控制。OpenClaw 还会在后续轮次中重放 DeepSeek `reasoning_content`，以便使用工具调用的思考会话能够继续。</Tip>

## 思考与工具

与大多数 OpenAI 兼容的提供商相比，DeepSeek V4 思考会话有更严格的重放契约：当启用思考的助手消息包含
工具调用时，DeepSeek 要求在后续请求中将先前的助手 `reasoning_content` 发送回去。
OpenClaw 会在 DeepSeek 插件内部处理此问题，因此正常的多轮工具使用可用于 `deepseek/deepseek-v4-flash` 和
`deepseek/deepseek-v4-pro`。

如果您将现有会话从另一个 OpenAI 兼容提供商切换到
DeepSeek V4 模型，较旧的助手工具调用轮次可能没有原生的
DeepSeek `reasoning_content`。OpenClaw 会为 DeepSeek V4 思考请求填充该缺失字段，
以便提供商可以接受重放的工具调用历史，而无需 `/new`。

当在 OpenClaw 中禁用思考时（包括 UI 中的 **None** 选择），
OpenClaw 会发送 DeepSeek `thinking: { type: "disabled" }` 并从传出历史记录中剥离已重放的
`reasoning_content`。这将使禁用思考的会话保持在非思考 DeepSeek 路径上。

使用 `deepseek/deepseek-v4-flash` 作为默认的快速路径。当您想要更强大的 V4 模型并且可以接受
更高的成本或延迟时，请使用 `deepseek/deepseek-v4-pro`。

## 实时测试

直接实时模型套件在现代模型集中包括 DeepSeek V4。要
仅运行 DeepSeek V4 直接模型检查：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

该实时检查验证两个 V4 模型是否都能完成，以及思考/工具
后续轮次是否保留 DeepSeek 所需的重放有效载荷。

## 配置示例

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-flash" },
    },
  },
}
```

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>

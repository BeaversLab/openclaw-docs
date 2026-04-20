---
title: "DeepSeek"
summary: "DeepSeek 设置（身份验证 + 模型选择）"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) 提供强大的 AI 模型以及兼容 OpenAI 的 API。

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

    这将提示你输入 API 密钥，并将 `deepseek/deepseek-chat` 设置为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非交互式设置">
    对于脚本或无头安装，请直接传递所有标志：

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

| 模型引用                     | 名称              | 输入 | 上下文  | 最大输出 | 备注                               |
| ---------------------------- | ----------------- | ---- | ------- | -------- | ---------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text | 131,072 | 8,192    | 默认模型；DeepSeek V3.2 非思维表层 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text | 131,072 | 65,536   | 启用推理的 V3.2 表层               |

<Tip>打包的两个模型目前在源码中都声明支持流式使用兼容性。</Tip>

## 配置示例

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-chat" },
    },
  },
}
```

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    有关代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>

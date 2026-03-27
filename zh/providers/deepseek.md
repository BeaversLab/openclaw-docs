---
summary: "DeepSeek 设置（身份验证 + 模型选择）"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) 提供强大的 AI 模型，具有与 OpenAI 兼容的 API。

- 提供商：`deepseek`
- 身份验证：`DEEPSEEK_API_KEY`
- API：OpenAI 兼容

## 快速开始

设置 API 密钥（推荐：将其存储以供 Gateway(网关) 使用）：

```bash
openclaw onboard --auth-choice deepseek-api-key
```

这将提示您输入 API 密钥，并将 `deepseek/deepseek-chat` 设置为默认模型。

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice deepseek-api-key \
  --deepseek-api-key "$DEEPSEEK_API_KEY" \
  --skip-health \
  --accept-risk
```

## 环境说明

如果 Gateway(网关) 作为守护进程运行，请确保 `DEEPSEEK_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 可用模型

| 模型 ID             | 名称                     | 类型 | 上下文 |
| ------------------- | ------------------------ | ---- | ------ |
| `deepseek-chat`     | DeepSeek Chat (V3.2)     | 通用 | 128K   |
| `deepseek-reasoner` | DeepSeek Reasoner (V3.2) | 推理 | 128K   |

- **deepseek-chat** 对应于非思考模式下的 DeepSeek-V3.2。
- **deepseek-reasoner** 对应于具有思维链推理的思考模式下的 DeepSeek-V3.2。

在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 获取您的 API 密钥。

import zh from "/components/footer/zh.mdx";

<zh />

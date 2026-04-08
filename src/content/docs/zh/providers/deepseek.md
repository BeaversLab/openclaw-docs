---
summary: "DeepSeek 设置（身份验证 + 模型选择）"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) 通过与 OpenAI 兼容的 API 提供强大的 AI 模型。

- 提供商：`deepseek`
- 身份验证：`DEEPSEEK_API_KEY`
- API：OpenAI 兼容
- Base URL: `https://api.deepseek.com`

## 快速开始

设置 API 密钥（建议：将其存储在 Gateway(网关) 中）：

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

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `DEEPSEEK_API_KEY`
可用于该进程（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 内置目录

| 模型参考                     | 名称              | 输入 | 上下文  | 最大输出 | 备注                               |
| ---------------------------- | ----------------- | ---- | ------- | -------- | ---------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | 文本 | 131,072 | 8,192    | 默认模型；DeepSeek V3.2 非推理界面 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | 文本 | 131,072 | 65,536   | 支持推理的 V3.2 界面               |

这两个捆绑模型目前在源码中均宣传支持流式传输用法兼容性。

在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 获取您的 API 密钥。

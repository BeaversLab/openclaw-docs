---
title: "Chutes"
summary: "Chutes setup (OAuth or API key, 模型 discovery, aliases)"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

# Chutes

[Chutes](https://chutes.ai) 通过 OpenAI 兼容的 API 公开源模型目录。OpenClaw 支持针对捆绑的 `chutes` 提供商使用浏览器 OAuth 和直接 API 密钥身份验证。

- 提供商： `chutes`
- API：OpenAI 兼容
- Base URL: `https://llm.chutes.ai/v1`
- 身份验证：
  - OAuth 通过 `openclaw onboard --auth-choice chutes`
  - API key 通过 `openclaw onboard --auth-choice chutes-api-key`
  - Runtime 环境变量: `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`

## 快速开始

### OAuth

```bash
openclaw onboard --auth-choice chutes
```

OpenClaw 在本地启动浏览器流程，或在远程/无头主机上显示 URL + 重定向粘贴流程。OAuth 令牌通过 OpenClaw 身份验证配置文件自动刷新。

可选 OAuth 覆盖：

- `CHUTES_CLIENT_ID`
- `CHUTES_CLIENT_SECRET`
- `CHUTES_OAUTH_REDIRECT_URI`
- `CHUTES_OAUTH_SCOPES`

### API key

```bash
openclaw onboard --auth-choice chutes-api-key
```

在 [chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys) 获取您的密钥。

两种身份验证路径都会注册捆绑的 Chutes 目录，并将默认模型设置为 `chutes/zai-org/GLM-4.7-TEE`。

## 发现行为

当 Chutes 身份验证可用时，OpenClaw 会使用该凭据查询 Chutes 目录并使用发现的模型。如果发现失败，OpenClaw 会回退到捆绑的静态目录，以便新手引导和启动仍然有效。

## 默认别名

OpenClaw 还为捆绑的 Chutes 目录注册了三个便捷别名：

- `chutes-fast` -> `chutes/zai-org/GLM-4.7-FP8`
- `chutes-pro` -> `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes-vision` -> `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`

## 内置入门目录

捆绑的回退目录包括当前的 Chutes 引用，例如：

- `chutes/zai-org/GLM-4.7-TEE`
- `chutes/zai-org/GLM-5-TEE`
- `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`
- `chutes/moonshotai/Kimi-K2.5-TEE`
- `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`
- `chutes/Qwen/Qwen3-Coder-Next-TEE`
- `chutes/openai/gpt-oss-120b-TEE`

## 配置示例

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

## 注

- OAuth 帮助和重定向应用要求：[Chutes OAuth 文档](https://chutes.ai/docs/sign-in-with-chutes/overview)
- API 密钥和 OAuth 发现均使用相同的 `chutes` 提供商 ID。
- Chutes 模型注册为 `chutes/<model-id>`。

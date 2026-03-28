---
title: "Google (Gemini)"
summary: "Google Gemini 设置（API 密钥 + OAuth、图像生成、媒体理解、网络搜索）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，此外还提供图像生成、媒体理解（图像/音频/视频）以及通过 Gemini Grounding 进行的网络搜索。

- 提供商: `google`
- 认证: `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API
- 替代提供商: `google-gemini-cli` (OAuth)

## 快速开始

1. 设置 API 密钥:

```bash
openclaw onboard --auth-choice google-api-key
```

2. 设置默认模型:

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice google-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (Gemini CLI)

一个替代提供商 `google-gemini-cli` 使用 PKCE OAuth 而不是 API 密钥。这是一个非官方集成；一些用户报告了账户限制。使用风险自负。

环境变量:

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

(或者 `GEMINI_CLI_*` 变体。)

## 功能

| 功能                 | 支持             |
| -------------------- | ---------------- |
| 聊天补全             | 是               |
| 图像生成             | 是               |
| 图像理解             | 是               |
| 音频转录             | 是               |
| 视频理解             | 是               |
| 网络搜索 (Grounding) | 是               |
| 思考/推理            | 是 (Gemini 3.1+) |

## 环境说明

如果 Gateway 作为守护进程 运行，请确保 `GEMINI_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

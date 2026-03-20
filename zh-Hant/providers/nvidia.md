---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 相容 API"
read_when:
  - 您想要在 OpenClaw 中使用 NVIDIA 模型
  - 您需要設定 NVIDIA_API_KEY
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供 OpenAI 相容的 API，用於 Nemotron 和 NeMo 模型。請使用來自 [NVIDIA NGC](https://catalog.ngc.nvidia.com/) 的 API 金鑰進行驗證。

## CLI 設定

匯出金鑰一次，然後執行 onboardin g並設定 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
```

如果您仍然傳遞 `--token`，請記住它會留在 shell 歷史記錄和 `ps` 輸出中；盡可能優先使用環境變數。

## 設定片段

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/llama-3.1-nemotron-70b-instruct" },
    },
  },
}
```

## 模型 ID

- `nvidia/llama-3.1-nemotron-70b-instruct` (預設)
- `meta/llama-3.3-70b-instruct`
- `nvidia/mistral-nemo-minitron-8b-8k-instruct`

## 注意事項

- OpenAI 相容的 `/v1` 端點；使用來自 NVIDIA NGC 的 API 金鑰。
- 當設定 `NVIDIA_API_KEY` 時，提供者會自動啟用；使用靜態預設值 (131,072 token 的上下文視窗，最大 4,096 token)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

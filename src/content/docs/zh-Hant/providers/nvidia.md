---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 相容 API"
read_when:
  - You want to use NVIDIA models in OpenClaw
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 為 Nemotron 和 NeMo 模型提供與 OpenAI 相容的 API。使用來自 [NVIDIA NGC](https://catalog.ngc.nvidia.com/) 的 API 金鑰進行驗證。

## CLI 設定

匯出金鑰一次，然後執行 onboarding 並設定一個 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
```

如果您仍然傳遞 `--token`，請記住它會被記錄在 shell 歷史記錄和 `ps` 輸出中；請盡可能使用環境變數。

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

| 模型參考                                             | 名稱                                     | 內容長度 | 最大輸出 |
| ---------------------------------------------------- | ---------------------------------------- | -------- | -------- |
| `nvidia/nvidia/llama-3.1-nemotron-70b-instruct`      | NVIDIA Llama 3.1 Nemotron 70B Instruct   | 131,072  | 4,096    |
| `nvidia/meta/llama-3.3-70b-instruct`                 | Meta Llama 3.3 70B Instruct              | 131,072  | 4,096    |
| `nvidia/nvidia/mistral-nemo-minitron-8b-8k-instruct` | NVIDIA Mistral NeMo Minitron 8B Instruct | 8,192    | 2,048    |

## 注意事項

- 與 OpenAI 相容的 `/v1` 端點；使用來自 NVIDIA NGC 的 API 金鑰。
- 當設定 `NVIDIA_API_KEY` 時，提供者會自動啟用。
- 內建的目錄是靜態的；成本預設為原始碼中的 `0`。

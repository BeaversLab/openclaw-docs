---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 相容 API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供了與 OpenAI 相容的 API，可免費使用開放模型。請使用來自 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 金鑰進行驗證。

## CLI 設定

匯出金鑰一次，然後執行 onboarding 並設定一個 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
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
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## 模型 ID

| 模型參考                                   | 名稱                         | 內容長度 | 最大輸出 |
| ------------------------------------------ | ---------------------------- | -------- | -------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192    |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192    |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608  | 8,192    |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752  | 8,192    |

## 備註

- 與 OpenAI 相容的 `/v1` 端點；使用來自 [build.nvidia.com](https://build.nvidia.com/) 的 API 金鑰。
- 當設定 `NVIDIA_API_KEY` 時，提供者會自動啟用。
- 內附目錄是靜態的；成本在原始碼中預設為 `0`。

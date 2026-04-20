---
summary: "在 OpenClaw 中使用 NVIDIA 的相容 OpenAI API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供了一個相容 OpenAI 的 API，可免費
用於開放模型。請使用來自
[build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 金鑰進行驗證。

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 建立 API 金鑰。</Step>
  <Step title="匯出金鑰並執行入門">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice skip ```</Step>
  <Step title="設定 NVIDIA 模型">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>如果您傳遞 `--token` 而非環境變數，該值將會儲存在 shell 歷史記錄和 `ps` 輸出中。請盡可能使用 `NVIDIA_API_KEY` 環境變數。</Warning>

## 設定範例

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

## 內建目錄

| 模型參考                                   | 名稱                         | 內容長度 | 最大輸出 |
| ------------------------------------------ | ---------------------------- | -------- | -------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192    |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192    |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608  | 8,192    |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752  | 8,192    |

## 進階說明

<AccordionGroup>
  <Accordion title="自動啟用行為">
    當設定 `NVIDIA_API_KEY` 環境變數時，此提供者會自動啟用。
    除了金鑰之外，不需要明確的提供者設定。
  </Accordion>

<Accordion title="目錄與定價">內建的目錄是靜態的。由於 NVIDIA 目前提供列出模型的免費 API 存取， 因此預設成本在原始碼中為 `0`。</Accordion>

  <Accordion title="相容 OpenAI 的端點">
    NVIDIA 使用標準的 `/v1` 完成端點。任何相容 OpenAI 的
    工具都應該能直接搭配 NVIDIA 的基礎 URL 使用。
  </Accordion>
</AccordionGroup>

<Tip>NVIDIA 模型目前免費使用。請查看 [build.nvidia.com](https://build.nvidia.com/) 以了解最新的可用性和 速率限制詳情。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理、模型和提供者的完整組態參考。
  </Card>
</CardGroup>

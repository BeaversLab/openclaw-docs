---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 相容 API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供了與 OpenAI 相容的 API，
可免費使用開放模型。請使用來自
[build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 金鑰進行驗證。

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 建立 API 金鑰。</Step>
  <Step title="匯出金鑰並執行入門設定">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice nvidia-api-key ```</Step>
  <Step title="設定 NVIDIA 模型">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>如果您傳遞 `--nvidia-api-key` 而非環境變數，該值會進入 shell 歷史記錄和 `ps` 輸出中。請盡可能使用 `NVIDIA_API_KEY` 環境變數。</Warning>

對於非互動式設定，您也可以直接傳遞金鑰：

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

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

## 精選目錄

當設定了 NVIDIA API 金鑰時，OpenClaw 設定和模型選擇路徑
會嘗試從
`https://assets.ngc.nvidia.com/products/api-catalog/featured-models.json` 取得 NVIDIA 的公開精選模型目錄，
並將排序後的結果快取 24 小時。因此，來自 build.nvidia.com 的
新精選模型會出現在設定和模型選擇介面中，無需等待
OpenClaw 發布新版。

擷取作業會對 `assets.ngc.nvidia.com` 使用固定的 HTTPS 主機原則。如果未
設定 NVIDIA API 金鑰，或者該公開目錄無法使用或
格式錯誤，OpenClaw 將退回到下方的內建目錄。

## 內建備援目錄

| 模型參照                                   | 名稱                         | 內容    | 最大輸出 | 備註               |
| ------------------------------------------ | ---------------------------- | ------- | -------- | ------------------ |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192    | 精選備援           |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192    | 精選備援           |
| `nvidia/minimaxai/minimax-m2.7`            | Minimax M2.7                 | 196,608 | 8,192    | 精選備援           |
| `nvidia/z-ai/glm-5.1`                      | GLM 5.1                      | 202,752 | 8,192    | 精選備援           |
| `nvidia/minimaxai/minimax-m2.5`            | MiniMax M2.5                 | 196,608 | 8,192    | 已棄用，升級相容性 |
| `nvidia/z-ai/glm5`                         | GLM-5                        | 202,752 | 8,192    | 已棄用，升級相容性 |

## 進階設定

<AccordionGroup>
  <Accordion title="自動啟用行為">
    當設定了 `NVIDIA_API_KEY` 環境變數時，此提供者會自動啟用。
    除了金鑰之外，不需要明確的提供者設定。
  </Accordion>

<Accordion title="目錄與定價">當設定 NVIDIA 驗證時，OpenClaw 偏好使用 NVIDIA 的公開精選模型目錄 並將其快取 24 小時。內建的備援目錄是靜態的， 並保留已棄用的隨附參照以維持升級相容性。來源中的成本預設為 `0`，因為 NVIDIA 目前針對列出的 模型提供免費 API 存取。</Accordion>

<Accordion title="OpenAI-compatible endpoint">NVIDIA 使用標準 `/v1` completions 端點。任何相容 OpenAI 的 工具都應該能直接搭配 NVIDIA 基礎 URL 使用。</Accordion>

  <Accordion title="Slow custom provider responses">
    某些 NVIDIA 託管的客製化模型，可能需要比預設模型閒置
    看門狗更長的時間，才會發出第一個回應區塊。對於客製化 NVIDIA 提供者
    項目，請提高提供者逾時，而不是提高整個代理程式
    執行時間逾時：

    ```json5
    {
      models: {
        providers: {
          "custom-integrate-api-nvidia-com": {
            baseUrl: "https://integrate.api.nvidia.com/v1",
            api: "openai-completions",
            apiKey: "NVIDIA_API_KEY",
            timeoutSeconds: 300,
          },
        },
      },
      agents: {
        defaults: {
          models: {
            "custom-integrate-api-nvidia-com/meta/llama-3.1-70b-instruct": {
              params: { thinking: "off" },
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

<Tip>NVIDIA 模型目前可免費使用。請查閱 [build.nvidia.com](https://build.nvidia.com/) 以取得最新的可用性及 速率限制詳細資訊。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理程式、模型和提供者的完整設定參考。
  </Card>
</CardGroup>

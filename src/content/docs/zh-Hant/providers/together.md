---
title: "Together AI"
summary: "Together AI 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) 透過統一的 API 提供對先進開源模型的存取，包括 Llama、DeepSeek、Kimi 等。

| 屬性     | 值                            |
| -------- | ----------------------------- |
| 供應商   | `together`                    |
| 驗證     | `TOGETHER_API_KEY`            |
| API      | OpenAI 相容                   |
| Base URL | `https://api.together.xyz/v1` |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys) 建立 API 金鑰。
  </Step>
  <Step title="執行入門引導">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="設定預設模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "together/moonshotai/Kimi-K2.5" },
        },
      },
    }
    ```
  </Step>
</Steps>

### 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>入門引導預設設定將 `together/moonshotai/Kimi-K2.5` 設為 預設模型。</Note>

## 內建目錄

OpenClaw 隨附此內建的 Together 目錄：

| 模型參照                                                     | 名稱                                   | 輸入       | 上下文     | 備註                 |
| ------------------------------------------------------------ | -------------------------------------- | ---------- | ---------- | -------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | 文字、圖片 | 262,144    | 預設模型；已啟用推理 |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | 文字       | 202,752    | 通用文字模型         |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | 文字       | 131,072    | 快速指令模型         |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | 文字、圖片 | 10,000,000 | 多模態               |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | 文字、圖片 | 20,000,000 | 多模態               |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | 文字       | 131,072    | 通用文字模型         |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | 文字       | 131,072    | 推理模型             |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | 文字       | 262,144    | 次要 Kimi 文字模型   |

## 影片生成

內建的 `together` 外掛程式也透過共享的 `video_generate` 工具註冊影片生成功能。

| 屬性         | 值                                |
| ------------ | --------------------------------- |
| 預設影片模型 | `together/Wan-AI/Wan2.2-T2V-A14B` |
| 模式         | 文字轉影片、單一圖片參考          |
| 支援的參數   | `aspectRatio`, `resolution`       |

若要將 Together 設為預設影片供應商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

<Tip>請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、 提供者選擇和故障轉移行為。</Tip>

<AccordionGroup>
  <Accordion title="環境說明">
    如果 Gateway 作為守護程序 運行，請確保
    `TOGETHER_API_KEY` 對該程序可用（例如，在
    `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

    <Warning>
    僅在互動式 Shell 中設定的金鑰對守護程序管理的
    gateway 程序不可見。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 設定以
    確保持續可用。
    </Warning>

  </Accordion>

  <Accordion title="疑難排解">
    - 驗證您的金鑰是否有效：`openclaw models list --provider together`
    - 如果模型未出現，請確認 API 金鑰是在您的 Gateway 程序的正確環境中設定的。
    - 模型參照使用格式 `together/<model-id>`。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型提供者" href="/en/concepts/model-providers" icon="layers">
    提供者規則、模型參照和故障轉移行為。
  </Card>
  <Card title="影片生成" href="/en/tools/video-generation" icon="video">
    共用的影片生成工具參數和提供者選擇。
  </Card>
  <Card title="組態參考" href="/en/gateway/configuration-reference" icon="gear">
    完整的組態架構，包括提供者設定。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Together AI 儀表板、API 文件和定價。
  </Card>
</CardGroup>

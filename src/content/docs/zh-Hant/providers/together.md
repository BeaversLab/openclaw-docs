---
summary: "Together AI 設定（驗證 + 模型選擇）"
title: "Together AI"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Together AI](https://together.ai) 提供對領先開源模型的存取，
包括 Llama、DeepSeek、Kimi 等等，透過統一的 API。

| 屬性     | 值                            |
| -------- | ----------------------------- |
| 提供者   | `together`                    |
| 驗證     | `TOGETHER_API_KEY`            |
| API      | OpenAI 相容                   |
| Base URL | `https://api.together.xyz/v1` |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">
    在
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys) 建立 API 金鑰。
  </Step>
  <Step title="執行引導設定">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="設定預設模型">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
          },
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

<Note>引導設定預設集將 `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` 設為預設模型。</Note>

## 內建目錄

OpenClaw 隨附此捆綁的 Together 目錄：

| 模型參照                                           | 名稱                         | 輸入       | Context | 備註          |
| -------------------------------------------------- | ---------------------------- | ---------- | ------- | ------------- |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B Instruct Turbo | 文字       | 131,072 | 預設模型      |
| `together/moonshotai/Kimi-K2.6`                    | Kimi K2.6 FP4                | 文字、圖片 | 262,144 | Kimi 推理模型 |
| `together/deepseek-ai/DeepSeek-V4-Pro`             | DeepSeek V4 Pro              | 文字       | 512,000 | 推理文字模型  |
| `together/Qwen/Qwen2.5-7B-Instruct-Turbo`          | Qwen2.5 7B Instruct Turbo    | 文字       | 32,768  | 快速文字模型  |
| `together/zai-org/GLM-5.1`                         | GLM 5.1 FP4                  | 文字       | 202,752 | 推理文字模型  |

## 影片生成

隨附的 `together` 外掛程式也會透過
共用的 `video_generate` 工具註冊影片生成功能。

| 屬性         | 值                                                            |
| ------------ | ------------------------------------------------------------- |
| 預設影片模型 | `together/Wan-AI/Wan2.2-T2V-A14B`                             |
| 模式         | 文字生成影片；僅支援單張圖片參考搭配 `Wan-AI/Wan2.2-I2V-A14B` |
| 支援的參數   | `aspectRatio`、 `resolution`                                  |

若要將 Together 作為預設的影片供應商：

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

<Tip>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用的工具參數、 供應商選擇與容錯移轉行為。</Tip>

<AccordionGroup>
  <Accordion title="環境注意事項">
    如果 Gateway 作為守護程序（launchd/systemd）運行，請確保
    `TOGETHER_API_KEY` 對該程序可用（例如，在
    `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

    <Warning>
    僅在互動式 shell 中設定的金鑰對守護程序管理的
    gateway 程序不可見。請使用 `~/.openclaw/.env` 或 `env.shellEnv` 設定以確保
    持續可用性。
    </Warning>

  </Accordion>

  <Accordion title="疑難排解">
    - 驗證您的金鑰是否正常運作：`openclaw models list --provider together`
    - 如果模型未出現，請確認 API 金鑰已在您的 Gateway 程序的
      正確環境中設定。
    - 模型參照使用格式 `together/<model-id>`。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    提供者規則、模型參照和故障轉移行為。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片生成工具參數和提供者選擇。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的設定架構，包括提供者設定。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Together AI 儀表板、API 文件和定價。
  </Card>
</CardGroup>

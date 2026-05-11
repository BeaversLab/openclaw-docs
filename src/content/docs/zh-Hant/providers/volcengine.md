---
summary: "Volcano Engine 設定 (Doubao 模型、編碼端點和 Seed Speech TTS)"
title: "Volcengine (Doubao)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
  - You want to use Volcengine Speech text-to-speech
---

Volcengine 提供者提供對 Doubao 模型和託管在 Volcano Engine 上的第三方模型的存取，並針對一般和編碼工作負載提供不同的端點。同一個捆綁的外掛程式也可以將 Volcengine Speech 註冊為 TTS 提供者。

| 詳細資料 | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 提供者   | `volcengine` (一般 + TTS) + `volcengine-plan` (編碼)       |
| 模型驗證 | `VOLCANO_ENGINE_API_KEY`                                   |
| TTS 驗證 | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` |
| API      | OpenAI 相容模型、BytePlus Seed Speech TTS                  |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    執行互動式入門引導：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    這會從單一 API 金鑰註冊一般 (`volcengine`) 和編碼 (`volcengine-plan`) 提供者。

  </Step>
  <Step title="設定預設模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="驗證模型可用性">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
若要進行非互動式設定 (CI、撰寫腳本)，請直接傳遞金鑰：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## 提供者與端點

| 提供者            | 端點                                      | 使用案例 |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 一般模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 編碼模型 |

<Note>這兩個提供者皆由單一 API 金鑰設定。設定過程會自動註冊兩者。</Note>

## 內建目錄

<Tabs>
  <Tab title="一般 (volcengine)">
    | 模型參考 | 名稱 | 輸入 | 上下文 | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | 文字、圖片 | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | 文字、圖片 | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | 文字、圖片 | 256,000
    | | `volcengine/glm-4-7-251222` | GLM 4.7 | 文字、圖片 | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | 文字、圖片 | 128,000 |
  </Tab>
  <Tab title="程式碼 (volcengine-plan)">
    | 模型參考 | 名稱 | 輸入 | 上下文 | | ------------------------------------------------- | ------------------------ | ----- | ------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | 文字 | 256,000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | 文字 | 256,000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | 文字 | 200,000 | | `volcengine-plan/kimi-k2-thinking` | Kimi K2
    Thinking | 文字 | 256,000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | 文字 | 256,000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | 文字 | 256,000 |
  </Tab>
</Tabs>

## 文字轉語音

Volcengine TTS 使用 BytePlus Seed Speech HTTP API，其設定與
相容 OpenAI 的 Doubao 模型 API 金鑰分開。在 BytePlus
主控台中，開啟 Seed Speech > Settings > API Keys 並複製 API 金鑰，然後設定：

```bash
export VOLCENGINE_TTS_API_KEY="byteplus_seed_speech_api_key"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

然後在 `openclaw.json` 中啟用它：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "byteplus_seed_speech_api_key",
          voice: "en_female_anna_mars_bigtts",
          speedRatio: 1.0,
        },
      },
    },
  },
}
```

對於語音備忘錄目標，OpenClaw 會向 Volcengine 要求原生供應商的
`ogg_opus`。對於一般的音訊附件，它會要求 `mp3`。供應商別名
`bytedance` 和 `doubao` 也會解析至相同的語音供應商。

預設的資源 ID 是 `seed-tts-1.0`，因為這是 BytePlus 在預設
專案中授權給新建立的 Seed Speech API 金鑰的值。如果您的專案
擁有 TTS 2.0 權限，請設定 `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`。

<Warning>`VOLCANO_ENGINE_API_KEY` 是用於 ModelArk/Doubao 模型端點的，並非 Seed Speech API 金鑰。TTS 需要來自 BytePlus Speech Console 的 Seed Speech API 金鑰，或是舊版 Speech Console 的 AppID/token 組合。</Warning>

舊版 AppID/token 驗證仍支援較舊的 Speech Console 應用程式：

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

## 進階設定

<AccordionGroup>
  <Accordion title="入門後的預設模型">
    `openclaw onboard --auth-choice volcengine-api-key` 目前將
    `volcengine-plan/ark-code-latest` 設定為預設模型，同時註冊
    一般的 `volcengine` 目錄。
  </Accordion>

<Accordion title="模型選擇器的後備行為">在入門/設定模型選擇期間，Volcengine 驗證選項偏好 同時顯示 `volcengine/*` 與 `volcengine-plan/*` 列。如果這些模型尚未 載入，OpenClaw 會改為回退至未篩選的目錄，而不是顯示 空白、以提供者為範圍的選擇器。</Accordion>

  <Accordion title="常駐程序的環境變數">
    如果 Gateway 以常駐程式 (launchd/systemd) 執行，請確保模型和 TTS
    環境變數（例如 `VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、
    `BYTEPLUS_SEED_SPEECH_API_KEY`、`VOLCENGINE_TTS_APPID` 和
    `VOLCENGINE_TTS_TOKEN`）可供該程序使用（例如，在
    `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

<Warning>當將 OpenClaw 作為背景服務執行時，在您的互動式 shell 中設定的環境變數並不會自動繼承。請參閱上述關於常駐程式的註記。</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="設定" href="/zh-Hant/gateway/configuration" icon="gear">
    代理程式、模型和提供者的完整設定參考。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與除錯步驟。
  </Card>
  <Card title="常見問題" href="/zh-Hant/help/faq" icon="circle-question">
    關於 OpenClaw 設定的常見問題。
  </Card>
</CardGroup>

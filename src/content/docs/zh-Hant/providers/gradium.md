---
summary: "在 OpenClaw 中使用 Gradium 文字轉語音"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key, voice, or directive token configuration
title: "Gradium"
---

[Gradium](https://gradium.ai) 是 OpenClaw 的內建文字轉語音提供者。此外掛程式可以轉譯一般的音訊回覆 (WAV)、與語音訊息相容的 Opus 輸出，以及用於電話介面的 8 kHz u-law 音訊。

| 屬性      | 值                                |
| --------- | --------------------------------- |
| 提供者 ID | `gradium`                         |
| 認證      | `GRADIUM_API_KEY` 或設定 `apiKey` |
| 基礎 URL  | `https://api.gradium.ai` (預設)   |
| 預設語音  | `Emma` (`YTpq7expH9539ERJ`)       |

## 設定

建立 Gradium API 金鑰，然後透過環境變數或設定金鑰將其暴露給 OpenClaw。

<Tabs>
  <Tab title="環境變數">
    ```bash
    export GRADIUM_API_KEY="gsk_..."
    ```
  </Tab>

  <Tab title="設定金鑰">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "gradium",
          providers: {
            gradium: {
              apiKey: "${GRADIUM_API_KEY}",
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

外掛程式會先檢查已解析的 `apiKey`，然後才會退回使用 `GRADIUM_API_KEY` 環境變數。

## 設定

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          voiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

| 金鑰                                     | 類型 | 描述                                                                 |
| ---------------------------------------- | ---- | -------------------------------------------------------------------- |
| `messages.tts.providers.gradium.apiKey`  | 字串 | 已解析的 API 金鑰。支援 `${ENV}` 和秘密參照。                        |
| `messages.tts.providers.gradium.baseUrl` | 字串 | 覆寫 API 來源。結尾的斜線會被移除。預設為 `https://api.gradium.ai`。 |
| `messages.tts.providers.gradium.voiceId` | 字串 | 當沒有指令覆寫時使用的預設語音 ID。                                  |

輸出音訊格式是由執行階段根據目標介面自動選取，無法從 `openclaw.json` 進行設定。請參閱下方的 [輸出](#output)。

## 語音

| 名稱      | 語音 ID            |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

預設語音：Emma。

### 單則訊息語音覆寫

當現行的語音策略允許語音覆寫時，您可以使用指令 token 在行內切換語音。以下所有寫法都會解析為相同的 `voiceId` 覆寫：

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

如果語音策略停用了語音覆寫，該指令會被消耗但會被忽略。

## 輸出

執行時會從目標介面選取輸出格式。此提供者目前不會合成其他格式。

| 目標     | 格式        | 檔案副檔名 | 採樣率   | 語音相容標記 |
| -------- | ----------- | ---------- | -------- | ------------ |
| 標準音訊 | `wav`       | `.wav`     | provider | 否           |
| 語音訊息 | `opus`      | `.opus`    | provider | 是           |
| 電話     | `ulaw_8000` | n/a        | 8 kHz    | n/a          |

## 自動選擇順序

在已設定的 TTS 提供者中，Gradium 的自動選擇順序為 `30`。請參閱 [文字轉語音](/zh-Hant/tools/tts) 以了解當 `messages.tts.provider` 未固定時，OpenClaw 如何選擇現行的提供者。

## 相關

- [文字轉語音](/zh-Hant/tools/tts)
- [媒體總覽](/zh-Hant/tools/media-overview)

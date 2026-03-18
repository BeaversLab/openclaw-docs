---
summary: "How inbound audio/voice notes are downloaded, transcribed, and injected into replies"
read_when:
  - Changing audio transcription or media handling
title: "Audio and Voice Notes"
---

# 音訊 / 語音備忘錄 — 2026-01-17

## 運作方式

- **媒體理解 (音訊)**：如果啟用了音訊理解（或自動偵測），OpenClaw：
  1. 定位第一個音訊附件（本機路徑或 URL），並在需要時下載它。
  2. 在發送到每個模型條目之前強制執行 `maxBytes`。
  3. 按順序執行第一個符合資格的模型條目（提供者或 CLI）。
  4. 如果失敗或跳過（大小/逾時），它會嘗試下一個條目。
  5. 成功時，它會將 `Body` 替換為 `[Audio]` 區塊並設定 `{{Transcript}}`。
- **指令解析**：當轉錄成功時，`CommandBody`/`RawBody` 會被設定為轉錄文本，以便斜線指令仍然運作。
- **詳細記錄**：在 `--verbose` 中，我們會記錄轉錄何時執行以及何時替換內文。

## 自動偵測 (預設)

如果您**不設定模型**且 `tools.media.audio.enabled` **未**設定為 `false`，
OpenClaw 會按此順序自動偵測，並在第一個可行的選項停止：

1. **本機 CLI** (如果已安裝)
   - `sherpa-onnx-offline` (需要 `SHERPA_ONNX_MODEL_DIR` 及 encoder/decoder/joiner/tokens)
   - `whisper-cli` (來自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或隨附的 tiny 模型)
   - `whisper` (Python CLI；自動下載模型)
2. **Gemini CLI** (`gemini`) 使用 `read_many_files`
3. **提供者金鑰** (OpenAI → Groq → Deepgram → Google)

要停用自動偵測，請設定 `tools.media.audio.enabled: false`。
要自訂，請設定 `tools.media.audio.models`。
注意：二進位檔偵測在 macOS/Linux/Windows 上為盡力而為；請確保 CLI 在 `PATH` 上 (我們會展開 `~`)，或使用完整指令路徑設定明確的 CLI 模型。

## 設定範例

### 提供者 + CLI 後備 (OpenAI + Whisper CLI)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### 僅提供者並搭配範圍閘門

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### 僅限提供者 (Deepgram)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### 僅限提供者 (Mistral Voxtral)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### 將轉錄內容回顯至聊天 (選用)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // default is false
        echoFormat: '📝 "{transcript}"', // optional, supports {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## 備註與限制

- 提供者驗證遵循標準模型驗證順序 (驗證設定檔、環境變數、`models.providers.*.apiKey`)。
- 當使用 `provider: "deepgram"` 時，Deepgram 會擷取 `DEEPGRAM_API_KEY`。
- Deepgram 設定細節：[Deepgram (audio transcription)](/zh-Hant/providers/deepgram)。
- Mistral 設定細節：[Mistral](/zh-Hant/providers/mistral)。
- 音訊提供者可以透過 `tools.media.audio` 覆寫 `baseUrl`、`headers` 和 `providerOptions`。
- 預設大小上限為 20MB (`tools.media.audio.maxBytes`)。超過大小上限的音訊將跳過該模型並嘗試下一個項目。
- 小於 1024 位元組的微小/空音訊檔案將在提供者/CLI 轉錄之前被跳過。
- 音訊的預設 `maxChars` 為 **未設定** (完整轉錄)。設定 `tools.media.audio.maxChars` 或個別項目的 `maxChars` 以修剪輸出。
- OpenAI 自動模式的預設值為 `gpt-4o-mini-transcribe`；請設定 `model: "gpt-4o-transcribe"` 以獲得更高的準確度。
- 使用 `tools.media.audio.attachments` 來處理多個語音備忘錄 (`mode: "all"` + `maxAttachments`)。
- 轉錄內容可作為 `{{Transcript}}` 供範本使用。
- `tools.media.audio.echoTranscript` 預設為關閉；啟用它以在代理程式處理之前將轉錄確認傳送回原始聊天。
- `tools.media.audio.echoFormat` 可自訂回顯文字 (預留位置：`{transcript}`)。
- CLI 標準輸出有上限 (5MB)；請保持 CLI 輸出簡潔。

### 代理伺服器環境支援

基於提供者的音訊轉錄遵循標準的輸出代理伺服器環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未設定代理伺服器環境變數，則使用直接出口。如果代理伺服器設定格式錯誤，OpenClaw 會記錄警告並退回至直接擷取。

## 群組中的提及偵測

當 `requireMention: true` 設定於群組聊天時，OpenClaw 現在會在檢查提及之前先轉錄音訊。這使得語音訊息即使包含提及也能被處理。

**運作方式：**

1. 如果語音訊息沒有文字內容，且群組需要提及，OpenClaw 會執行「預檢」轉錄。
2. 轉錄內容會檢查是否符合提及模式（例如 `@BotName`、emoji 觸發）。
3. 如果發現提及，訊息將會進入完整的回覆流程。
4. 轉錄內容用於提及檢測，使語音訊息能通過提及閘門。

**後備行為：**

- 如果在預檢期間轉錄失敗（逾時、API 錯誤等），訊息將根據純文字提及檢測進行處理。
- 這可確保混合訊息（文字 + 音訊）絕不會被錯誤地捨棄。

**每個 Telegram 群組/主題選擇退出：**

- 設定 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳過該群組的預檢轉錄提及檢查。
- 設定 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以覆蓋各個主題的設定（`true` 表示跳過，`false` 表示強制啟用）。
- 預設為 `false`（當符合提及閘門條件時啟用預檢）。

**範例：** 使用者在設有 `requireMention: true` 的 Telegram 群組中傳送語音訊息說「嘿 @Claude，天氣怎麼樣？」。語音訊息會被轉錄，提及會被偵測到，然後代理會回覆。

## 注意事項

- 範圍規則使用第一個符合者為準。`chatType` 會被正規化為 `direct`、`group` 或 `room`。
- 請確保您的 CLI 以結束碼 0 退出並列印純文字；JSON 需要透過 `jq -r .text` 進行處理。
- 對於 `parakeet-mlx`，如果您傳遞 `--output-dir`，當 `--output-format` 為 `txt`（或省略）時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 輸出格式則會後退到 stdout 解析。
- 保持合理的逾時時間（`timeoutSeconds`，預設 60 秒），以避免阻擋回覆佇列。
- Preflight 轉錄僅處理用於提及檢測的**第一個**音訊附件。其他音訊會在主要媒體理解階段處理。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

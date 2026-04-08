---
summary: "傳入的音訊/語音備忘錄是如何下載、轉錄並注入回覆中的"
read_when:
  - Changing audio transcription or media handling
title: "音訊與語音備忘錄"
---

# 音訊 / 語音備忘錄 (2026-01-17)

## 運作方式

- **媒體理解（音訊）**：如果啟用了音訊理解（或自動偵測），OpenClaw：
  1. 尋找第一個音訊附件（本機路徑或 URL），並在需要時下載。
  2. 在發送給每個模型項目之前，會強制執行 `maxBytes`。
  3. 依序執行第一個符合條件的模型項目（供應商或 CLI）。
  4. 如果失敗或跳過（因大小/逾時），它會嘗試下一個項目。
  5. 成功時，它會將 `Body` 替換為 `[Audio]` 區塊，並設定 `{{Transcript}}`。
- **指令解析**：當轉錄成功時，`CommandBody`/`RawBody` 會被設定為轉錄文字，因此斜線指令仍然有效。
- **詳細日誌**：在 `--verbose` 中，我們會記錄轉錄何時執行以及何時替換內文。

## 自動偵測（預設）

如果您**不設定模型**且 `tools.media.audio.enabled` **未**設定為 `false`，
OpenClaw 會依此順序自動偵測，並在第一個可用的選項停止：

1. **Active reply model** 當其供應商支援音訊理解時。
2. **Local CLIs**（若已安裝）
   - `sherpa-onnx-offline` （需要帶有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli` （來自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內建的 tiny 模型）
   - `whisper` （Python CLI；自動下載模型）
3. **Gemini CLI** （`gemini`）使用 `read_many_files`
4. **Provider auth**
   - 已設定支援音訊的 `models.providers.*` 項目會優先嘗試
   - 內建的備援順序：OpenAI → Groq → Deepgram → Google → Mistral

若要停用自動偵測，請設定 `tools.media.audio.enabled: false`。
若要自訂，請設定 `tools.media.audio.models`。
注意：二進位偵測在 macOS/Linux/Windows 上為盡力而為；請確保 CLI 在 `PATH` 上（我們會展開 `~`），或是以完整指令路徑設定明確的 CLI 模型。

## Config examples

### Provider + CLI fallback (OpenAI + Whisper CLI)

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

### Provider-only with scope gating

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

### Provider-only (Deepgram)

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

### Provider-only (Mistral Voxtral)

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

### Echo transcript to chat (opt-in)

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

## Notes & limits

- Provider auth 遵循標準模型 auth 順序（auth profiles、env vars、`models.providers.*.apiKey`）。
- Groq 設定細節：[Groq](/en/providers/groq)。
- 當使用 `provider: "deepgram"` 時，Deepgram 會使用 `DEEPGRAM_API_KEY`。
- Deepgram 設定細節：[Deepgram (audio transcription)](/en/providers/deepgram)。
- Mistral 設定細節：[Mistral](/en/providers/mistral)。
- 音訊供應商可以透過 `tools.media.audio` 覆寫 `baseUrl`、`headers` 和 `providerOptions`。
- 預設大小上限為 20MB（`tools.media.audio.maxBytes`）。超過大小的音訊會跳過該模型並嘗試下一個項目。
- 小於 1024 位元組的微小/空音訊檔案會在供應商/CLI 轉錄前跳過。
- 音訊的預設 `maxChars` 為 **unset**（完整轉錄）。請設定 `tools.media.audio.maxChars` 或個別項目的 `maxChars` 來修剪輸出。
- OpenAI auto 預設為 `gpt-4o-mini-transcribe`；設定 `model: "gpt-4o-transcribe"` 以獲得更高的準確度。
- 使用 `tools.media.audio.attachments` 來處理多則語音備忘錄 (`mode: "all"` + `maxAttachments`)。
- 轉錄文稿可在範本中透過 `{{Transcript}}` 取用。
- `tools.media.audio.echoTranscript` 預設為關閉；請啟用此選項，以便在代理程式處理之前將轉錄確認訊息傳送回來源聊天室。
- `tools.media.audio.echoFormat` 可自訂回顯文字 (預留位置：`{transcript}`)。
- CLI stdout 有上限 (5MB)；請保持 CLI 輸出簡潔。

### Proxy 環境支援

基於 Provider 的音訊轉錄會遵循標準的輸出代理環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未設定代理環境變數，則會使用直接出站連線。如果代理設定格式錯誤，OpenClaw 會記錄警告並回退至直接擷取。

## 群組中的提及偵測

當為群組聊天設定 `requireMention: true` 時，OpenClaw 現在會在檢查提及**之前**轉錄音訊。這讓語音備忘錄即使包含提及也能被處理。

**運作方式：**

1. 如果語音訊息沒有文字內容且群組需要提及，OpenClaw 會執行「預檢」轉錄。
2. 會檢查轉錄文稿中是否有提及模式 (例如 `@BotName`、表情符號觸發器)。
3. 如果找到提及，訊息將繼續透過完整的回覆管線處理。
4. 轉錄文稿會用於提及偵測，以便語音備忘錄能通過提及檢查。

**回退行為：**

- 如果在預檢期間轉錄失敗 (逾時、API 錯誤等)，訊息將基於純文字提及偵測進行處理。
- 這可確保混合訊息 (文字 + 音訊) 決不會被錯誤丟棄。

**針對每個 Telegram 群組/主題選擇退出：**

- 設定 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳過該群組的預檢轉錄提及檢查。
- 設定 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以針對每個主題進行覆寫 (`true` 表示跳過，`false` 表示強制啟用)。
- 預設為 `false` (當符合提及閘門條件時啟用預檢)。

**範例：** 使用者在 Telegram 群組中傳送了一則語音訊息，內容是「嘿 @Claude，天氣如何？」，其中啟用了 `requireMention: true`。語音訊息會被轉錄，提及會被偵測到，然後代理會回覆。

## 注意事項

- 範圍規則採用首次匹配原則。`chatType` 會被正規化為 `direct`、`group` 或 `room`。
- 請確保您的 CLI 結束代碼為 0 並列印純文字；JSON 需要透過 `jq -r .text` 進行處理。
- 對於 `parakeet-mlx`，如果您傳遞 `--output-dir`，當 `--output-format` 為 `txt`（或省略）時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 輸出格式則會退回到 stdout 解析。
- 保持合理的逾時時間（`timeoutSeconds`，預設為 60 秒），以避免阻塞回覆佇列。
- 事前轉錄僅處理用於提及偵測的**第一個**音訊附件。其他音訊會在主要媒體理解階段處理。

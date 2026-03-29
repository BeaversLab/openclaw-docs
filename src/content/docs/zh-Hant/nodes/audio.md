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

1. **本機 CLI**（若已安裝）
   - `sherpa-onnx-offline` （需要具有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli` （來自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內附的 tiny 模型）
   - `whisper` （Python CLI；自動下載模型）
2. **Gemini CLI** (`gemini`) 使用 `read_many_files`
3. **供應商金鑰** (OpenAI → Groq → Deepgram → Google)

若要停用自動偵測，請設定 `tools.media.audio.enabled: false`。
若要自訂，請設定 `tools.media.audio.models`。
注意：二進位檔偵測在 macOS/Linux/Windows 上是盡力而為的；請確保 CLI 在 `PATH` 上（我們會展開 `~`），或是使用完整指令路徑設定明確的 CLI 模型。

## 設定範例

### 供應商 + CLI 備援 (OpenAI + Whisper CLI)

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

### 僅供應商並搭配範圍閘道

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

### 僅提供商 (Deepgram)

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

### 僅提供商 (Mistral Voxtral)

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

### 將轉錄回顯至聊天（選用）

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

## 注意事項與限制

- 提供商驗證遵循標準模型驗證順序（驗證設定檔、環境變數、`models.providers.*.apiKey`）。
- 當使用 `provider: "deepgram"` 時，Deepgram 會使用 `DEEPGRAM_API_KEY`。
- Deepgram 設定詳情：[Deepgram (音訊轉錄)](/en/providers/deepgram)。
- Mistral 設定詳情：[Mistral](/en/providers/mistral)。
- 音訊提供商可以透過 `tools.media.audio` 覆寫 `baseUrl`、`headers` 和 `providerOptions`。
- 預設大小上限為 20MB (`tools.media.audio.maxBytes`)。超過大小的音訊將會跳過該模型並嘗試下一個項目。
- 小於 1024 位元組的微小/空白音訊檔案將在提供商/CLI 轉錄前被跳過。
- 音訊的預設 `maxChars` 為 **未設定**（完整轉錄）。設定 `tools.media.audio.maxChars` 或個別項目的 `maxChars` 以修剪輸出。
- OpenAI 自動模式預設為 `gpt-4o-mini-transcribe`；請設定 `model: "gpt-4o-transcribe"` 以獲得更高的準確度。
- 使用 `tools.media.audio.attachments` 來處理多個語音備忘錄 (`mode: "all"` + `maxAttachments`)。
- 轉錄內容可作為 `{{Transcript}}` 供範本使用。
- `tools.media.audio.echoTranscript` 預設為關閉；請啟用它以在代理程式處理之前將轉錄確認傳送回原始聊天。
- `tools.media.audio.echoFormat` 可自訂回顯文字（預留位置：`{transcript}`）。
- CLI 標準輸出設有上限 (5MB)；請保持 CLI 輸出簡潔。

### 代理程式環境支援

基於提供商的音訊轉錄會遵循標準的出口代理程式環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未設定代理程式環境變數，則使用直接出口。如果代理程式設定格式錯誤，OpenClaw 會記錄警告並回退為直接擷取。

## 群組中的提及偵測

當群組聊天設定了 `requireMention: true`，OpenClaw 現在會在檢查提及之前**先**將音訊轉錄成文字。這使得語音訊息即使包含提及也能被處理。

**運作方式：**

1. 如果語音訊息沒有文字內容，且群組要求提及，OpenClaw 會執行「預檢」轉錄。
2. 轉錄文字會被檢查是否符合提及模式（例如 `@BotName`、表情符號觸發器）。
3. 如果發現提及，該訊息將繼續進入完整的回覆流程。
4. 轉錄文字用於提及檢測，以便語音訊息能通過提及過濾。

**後備行為：**

- 如果在預檢期間轉錄失敗（逾時、API 錯誤等），訊息將僅根據文字提及檢測進行處理。
- 這可確保混合訊息（文字 + 音訊）永遠不會被錯誤地丟棄。

**針對各 Telegram 群組/主題停用：**

- 設定 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳過該群組的預檢轉錄提及檢查。
- 設定 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以覆蓋各主題的設定（`true` 表示跳過，`false` 表示強制啟用）。
- 預設值為 `false`（當符合提及過濾條件時啟用預檢）。

**範例：** 使用者在設定為 `requireMention: true` 的 Telegram 群組中發送一則說著「Hey @Claude, what's the weather?」的語音訊息。該語音訊息會被轉錄，偵測到提及，代理便會回覆。

## 注意事項

- 範圍規則採用首筆符合原則。`chatType` 會被正規化為 `direct`、`group` 或 `room`。
- 請確保您的 CLI 退出碼為 0 並輸出純文字；JSON 需透過 `jq -r .text` 進行處理。
- 對於 `parakeet-mlx`，如果您傳遞 `--output-dir`，當 `--output-format` 為 `txt`（或省略）時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 的輸出格式則會回退至 stdout 解析。
- 保持合理的逾時時間（`timeoutSeconds`，預設為 60 秒），以避免阻塞回覆佇列。
- 預檢轉錄僅處理用於提及偵測的**第一個**音訊附件。其他音訊會在主要媒體理解階段處理。

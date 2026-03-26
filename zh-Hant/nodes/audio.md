---
summary: "如何下載、轉錄傳入的音訊/語音備忘錄，並將其注入到回覆中"
read_when:
  - Changing audio transcription or media handling
title: "音訊與語音備忘錄"
---

# 音訊 / 語音備忘錄 (2026-01-17)

## 運作方式

- **媒體理解 (音訊)**：如果啟用了音訊理解 (或自動偵測)，OpenClaw：
  1. 找出第一個音訊附件 (本機路徑或 URL) 並在需要時將其下載。
  2. 在發送至每個模型項目之前強制執行 `maxBytes`。
  3. 按順序執行第一個合格的模型項目 (提供者或 CLI)。
  4. 如果失敗或跳過 (大小/逾時)，它會嘗試下一個項目。
  5. 成功時，它會將 `Body` 替換為 `[Audio]` 區塊並設定 `{{Transcript}}`。
- **指令解析**：當轉錄成功時，`CommandBody`/`RawBody` 會設定為轉錄文字，以便斜線指令仍能正常運作。
- **詳細記錄**：在 `--verbose` 中，我們會記錄轉錄執行時機以及它何時取代內文。

## 自動偵測（預設）

如果您**未設定模型**且 `tools.media.audio.enabled` **未**設為 `false`，
OpenClaw 將依以下順序自動偵測，並在第一個可用的選項停止：

1. **本機 CLI**（若已安裝）
   - `sherpa-onnx-offline`（需要帶有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（來自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內建的 tiny 模型）
   - `whisper`（Python CLI；自動下載模型）
2. **Gemini CLI** (`gemini`) 使用 `read_many_files`
3. **提供者金鑰** (OpenAI → Groq → Deepgram → Google)

若要停用自動偵測，請設定 `tools.media.audio.enabled: false`。
若要自訂，請設定 `tools.media.audio.models`。
注意：二進位偵測在 macOS/Linux/Windows 上為盡力而為；請確保 CLI 位於 `PATH` (我們會展開 `~`)，或使用完整指令路徑設定明確的 CLI 模型。

## 設定範例

### 提供者 + CLI 備援 (OpenAI + Whisper CLI)

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

### 僅提供者並搭配範圍閘控

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

### 僅提供者

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

### 僅提供者

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

### 將逐字稿回傳至聊天 (選擇加入)

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

- 提供者驗證遵循標準模型驗證順序 (驗證設定檔、環境變數、`models.providers.*.apiKey`)。
- 當使用 `provider: "deepgram"` 時，Deepgram 會取得 `DEEPGRAM_API_KEY`。
- Deepgram 設定詳細資訊：[Deepgram (audio transcription)](/zh-Hant/providers/deepgram)。
- Mistral 設定詳細資訊：[Mistral](/zh-Hant/providers/mistral)。
- 音訊供應商可以透過 `tools.media.audio` 覆寫 `baseUrl`、`headers` 和 `providerOptions`。
- 預設大小上限為 20MB (`tools.media.audio.maxBytes`)。超過大小限制的音訊會針對該模型跳過，並嘗試下一個項目。
- 小於 1024 位元組的微小/空白音訊檔案會在供應商/CLI 轉錄之前跳過。
- 音訊的預設 `maxChars` 為 **unset** (完整轉錄)。請設定 `tools.media.audio.maxChars` 或個別項目的 `maxChars` 以修剪輸出。
- OpenAI 自動預設值為 `gpt-4o-mini-transcribe`；請設定 `model: "gpt-4o-transcribe"` 以獲得更高的準確度。
- 使用 `tools.media.audio.attachments` 來處理多個語音訊息 (`mode: "all"` + `maxAttachments`)。
- 轉錄內容可作為 `{{Transcript}}` 提供給模板使用。
- `tools.media.audio.echoTranscript` 預設為關閉；啟用後，會在代理程式處理之前將轉錄確認傳送回來源聊天。
- `tools.media.audio.echoFormat` 可自訂回傳文字 (預留位置：`{transcript}`)。
- CLI stdout 有上限 (5MB)；請保持 CLI 輸出簡潔。

### Proxy 環境支援

基於供應商的音訊轉錄會遵循標準的出站 proxy 環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未設定 proxy 環境變數，則會使用直接出口。如果 proxy 設定格式錯誤，OpenClaw 會記錄警告並改為直接擷取。

## 群組中的提及檢測

當為群組聊天設置 `requireMention: true` 時，OpenClaw 現在會在檢查提及**之前**轉錄音頻。這允許即使語音訊息包含提及也能被處理。

**運作方式：**

1. 如果語音訊息沒有文字內容，且群組要求提及，OpenClaw 會執行「預檢」轉錄。
2. 會檢查轉錄內容中是否有提及模式（例如 `@BotName`、表情符號觸發器）。
3. 如果找到提及，該訊息將繼續進入完整的回覆流程。
4. 轉錄內容用於提及檢測，以便語音訊息能通過提及閘門。

**後備行為：**

- 如果在預檢期間轉錄失敗（逾時、API 錯誤等），則會根據純文字提及檢測來處理訊息。
- 這可確保混合訊息（文字 + 音頻）絕不會被錯誤丟棄。

**每個 Telegram 群組/主題選擇退出：**

- 設定 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳過該群組的飛行前轉錄提及檢查。
- 設定 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以覆寫每個主題的設定（`true` 表示跳過，`false` 表示強制啟用）。
- 預設值為 `false`（當符合提及閘條件時啟用飛行前檢查）。

**範例：** 使用者在設有 `requireMention: true` 的 Telegram 群組中傳送一段語音訊息，說道：「Hey @Claude, what's the weather?」。該語音訊息會被轉錄，偵測到提及後，代理程式會回覆。

## 注意事項

- 範圍規則採用先匹配優先原則。`chatType` 會被正規化為 `direct`、`group` 或 `room`。
- 請確保您的 CLI 以退出碼 0 結束並輸出純文字；JSON 需要透過 `jq -r .text` 進行處理。
- 對於 `parakeet-mlx`，如果您傳遞 `--output-dir`，OpenClaw 會在 `--output-format` 為 `txt`（或省略）時讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 輸出格式會回退到 stdout 解析。
- 保持逾時時間合理（`timeoutSeconds`，預設為 60 秒），以避免阻塞回覆佇列。
- 預檢轉錄僅處理 **第一個** 音訊附件以進行提及偵測。額外的音訊會在主要媒體理解階段處理。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

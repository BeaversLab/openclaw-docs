---
summary: "傳入的音訊/語音備忘錄如何下載、轉錄並插入到回覆中"
read_when:
  - Changing audio transcription or media handling
title: "音訊與語音備忘錄"
---

# 音訊 / 語音備忘錄 (2026-01-17)

## 運作方式

- **媒體理解（音訊）**：如果啟用了音訊理解（或自動偵測），OpenClaw：
  1. 尋找第一個音訊附件（本機路徑或 URL），並在需要時下載。
  2. 在發送至每個模型項目之前強制執行 `maxBytes`。
  3. 依序執行第一個符合條件的模型項目（供應商或 CLI）。
  4. 如果失敗或跳過（因大小/逾時），它會嘗試下一個項目。
  5. 成功後，它會將 `Body` 替換為 `[Audio]` 區塊並設定 `{{Transcript}}`。
- **指令解析**：當轉錄成功時，`CommandBody`/`RawBody` 會被設定為轉錄文字，以便斜線指令仍然能正常運作。
- **詳細記錄**：在 `--verbose` 中，我們會記錄轉錄何時運作以及何時替換內文。

## 自動偵測（預設）

如果您 **不設定模型** 且 `tools.media.audio.enabled` **未** 設定為 `false`，
OpenClaw 將按此順序自動偵測，並在第一個可用的選項停止：

1. **Active reply model** 當其供應商支援音訊理解時。
2. **Local CLIs**（若已安裝）
   - `sherpa-onnx-offline` （需要包含 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli` （來自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內建的 tiny 模型）
   - `whisper` （Python CLI；自動下載模型）
3. **Gemini CLI** （`gemini`） 使用 `read_many_files`
4. **Provider auth**
   - 首先嘗試已設定且支援音訊的 `models.providers.*` 項目
   - 內建的備援順序：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

若要停用自動偵測，請設定 `tools.media.audio.enabled: false`。
若要自訂，請設定 `tools.media.audio.models`。
注意：二進位檔偵測在 macOS/Linux/Windows 上僅為盡力而為；請確保 CLI 位於 `PATH` 上（我們會展開 `~`），或是使用完整指令路徑設定明確的 CLI 模型。

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

### 僅提供者

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
      },
    },
  },
}
```

### 將轉錄文字回傳至聊天（選用）

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

- 提供者驗證遵循標準模型驗證順序（auth profiles、環境變數、`models.providers.*.apiKey`）。
- Groq 設定細節：[Groq](/zh-Hant/providers/groq)。
- 當使用 `provider: "deepgram"` 時，Deepgram 會取得 `DEEPGRAM_API_KEY`。
- Deepgram 設定詳情：[Deepgram (音訊轉錄)](/zh-Hant/providers/deepgram)。
- Mistral 設定詳情：[Mistral](/zh-Hant/providers/mistral)。
- 當使用 `provider: "senseaudio"` 時，SenseAudio 會拾取 `SENSEAUDIO_API_KEY`。
- SenseAudio 設定詳情：[SenseAudio](/zh-Hant/providers/senseaudio)。
- 音訊提供商可以透過 `tools.media.audio` 覆寫 `baseUrl`、`headers` 和 `providerOptions`。
- 預設大小上限為 20MB (`tools.media.audio.maxBytes`)。過大的音訊將會跳過該模型並嘗試下一個項目。
- 小於 1024 位元組的微小/空白音訊檔案會在提供商/CLI 轉錄前被跳過。
- 音訊的預設 `maxChars` 為 **未設定** (完整轉錄)。設定 `tools.media.audio.maxChars` 或個別項目的 `maxChars` 以修剪輸出。
- OpenAI auto 預設為 `gpt-4o-mini-transcribe`；設定 `model: "gpt-4o-transcribe"` 以獲得更高的準確度。
- 使用 `tools.media.audio.attachments` 來處理多個語音備忘錄 (`mode: "all"` + `maxAttachments`)。
- 轉錄文字可作為 `{{Transcript}}` 供範本使用。
- `tools.media.audio.echoTranscript` 預設為關閉；啟用它可在代理程式處理之前將轉錄確認傳回原始聊天。
- `tools.media.audio.echoFormat` 可自訂回傳文字 (預留位置：`{transcript}`)。
- CLI stdout 有限制 (5MB)；請保持 CLI 輸出簡潔。
- CLI `args` 應使用 `{{MediaPath}}` 作為本機音訊檔案路徑。執行 `openclaw doctor --fix` 以從較舊的 `audio.transcription.command` 設定中遷移已棄用的 `{input}` 預留位置。

### Proxy 環境支援

基於提供商的音訊轉錄會遵守標準的出站 proxy 環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未設定 proxy 環境變數，則使用直接出口。如果 proxy 配置格式錯誤，OpenClaw 會記錄警告並回退至直接獲取。

## 群組中的提及檢測

當為群組聊天設定了 `requireMention: true` 時，OpenClaw 現在會在檢查提及**之前**轉錄音訊。這允許語音訊息即使包含提及也能被處理。

**運作方式：**

1. 如果語音訊息沒有文字內容，且群組要求提及，OpenClaw 會執行「預檢」轉錄。
2. 轉錄內容會被檢查是否有提及模式（例如 `@BotName`、表情符號觸發器）。
3. 如果發現提及，該訊息將繼續通過完整的回覆流程。
4. 轉錄內容用於提及檢測，以便語音訊息可以通過提及閘門。

**回退行為：**

- 如果在預檢期間轉錄失敗（逾時、API 錯誤等），訊息將僅根據文字提及檢測進行處理。
- 這確保混合訊息（文字 + 音訊）永遠不會被錯誤丟棄。

**針對每個 Telegram 群組/主題選擇退出：**

- 設定 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳過該群組的預檢轉錄提及檢查。
- 設定 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以針對每個主題進行覆蓋（`true` 表示跳過，`false` 表示強制啟用）。
- 預設值為 `false`（當符合提及閘門條件時啟用預檢）。

**範例：** 使用者在設定了 `requireMention: true` 的 Telegram 群組中發送一條說「嘿 @Claude，天氣怎麼樣？」的語音訊息。該語音訊息被轉錄，檢測到提及，然後代理回覆。

## 注意事項

- 範圍規則使用先匹配者勝出原則。`chatType` 會被正規化為 `direct`、`group` 或 `room`。
- 確保您的 CLI 以 exit code 0 退出並列印純文字；JSON 需要透過 `jq -r .text` 進行調整。
- 對於 `parakeet-mlx`，如果您傳遞 `--output-dir`，當 `--output-format` 為 `txt`（或省略）時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 輸出格式則回退至 stdout 解析。
- 保持逾時合理 (`timeoutSeconds`，預設 60s) 以避免阻擋回覆佇列。
- 預檢轉錄僅處理**第一個**音訊附件以進行提及偵測。額外的音訊會在主要媒體理解階段處理。

## 相關

- [媒體理解](/zh-Hant/nodes/media-understanding)
- [對話模式](/zh-Hant/nodes/talk)
- [語音喚醒](/zh-Hant/nodes/voicewake)

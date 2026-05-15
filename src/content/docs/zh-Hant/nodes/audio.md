---
summary: "傳入的音訊/語音備忘錄如何下載、轉錄並插入到回覆中"
read_when:
  - Changing audio transcription or media handling
title: "音訊與語音備忘錄"
---

## 運作方式

- **媒體理解 (音訊)**：如果啟用（或自動偵測）音訊理解，OpenClaw：
  1. 定位第一個音訊附件（本機路徑或 URL），並在需要時下載它。
  2. 在發送至每個模型項目之前強制執行 `maxBytes`。
  3. 依序執行第一個合格的模型項目（提供者或 CLI）。
  4. 如果失敗或跳過（大小/逾時），它會嘗試下一個項目。
  5. 成功時，它會將 `Body` 替換為 `[Audio]` 區塊並設定 `{{Transcript}}`。
- **指令解析**：當轉錄成功時，`CommandBody`/`RawBody` 會被設為轉錄文字，因此斜線指令仍然有效。
- **詳細記錄**：在 `--verbose` 中，我們會記錄轉錄執行時以及取代內文時的狀態。

## 自動偵測 (預設)

如果您**未設定模型**且 `tools.media.audio.enabled` **未**設為 `false`，
OpenClaw 會依此順序自動偵測，並在第一個可行的選項停止：

1. **使用中的回覆模型**，當其提供者支援音訊理解時。
2. **本機 CLI** (如果已安裝)
   - `sherpa-onnx-offline` (需要包含 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`)
   - `whisper-cli` (來自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內建的 tiny 模型)
   - `whisper` (Python CLI；自動下載模型)
3. **Gemini CLI** (`gemini`) 使用 `read_many_files`
4. **提供者驗證**
   - 優先嘗試已設定且支援音訊的 `models.providers.*` 項目
   - 內建的備用順序：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

若要停用自動偵測，請設定 `tools.media.audio.enabled: false`。
若要自訂，請設定 `tools.media.audio.models`。
注意：二進位檔偵測在 macOS/Linux/Windows 上為盡力而為；請確保 CLI 在 `PATH` 上 (我們會展開 `~`)，或是設定具有完整指令路徑的明確 CLI 模型。

## 設定範例

### 提供者 + CLI 備用 (OpenAI + Whisper CLI)

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

### 僅提供者搭配範圍閘門

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

### 僅供應商（Mistral Voxtral）

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

### 僅供應商（SenseAudio）

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

## 注意事項與限制

- 供應商驗證遵循標準模型驗證順序（驗證設定檔、環境變數、`models.providers.*.apiKey`）。
- Groq 設定詳情：[Groq](/zh-Hant/providers/groq)。
- 當使用 `provider: "deepgram"` 時，Deepgram 會接取 `DEEPGRAM_API_KEY`。
- Deepgram 設定詳情：[Deepgram (音訊轉錄)](/zh-Hant/providers/deepgram)。
- Mistral 設定詳情：[Mistral](/zh-Hant/providers/mistral)。
- 當使用 `provider: "senseaudio"` 時，SenseAudio 會接取 `SENSEAUDIO_API_KEY`。
- SenseAudio 設定詳情：[SenseAudio](/zh-Hant/providers/senseaudio)。
- 音訊供應商可以透過 `tools.media.audio` 覆寫 `baseUrl`、`headers` 和 `providerOptions`。
- 預設大小上限為 20MB (`tools.media.audio.maxBytes`)。超過大小的音訊將會被該模型跳過，並嘗試下一個項目。
- 小於 1024 位元組的微小/空白音訊檔案會在供應商/CLI 轉錄前被跳過。
- 音訊的預設 `maxChars` 為 **未設定**（完整轉錄）。請設定 `tools.media.audio.maxChars` 或個別項目的 `maxChars` 來裁剪輸出。
- OpenAI 自動模式的預設值為 `gpt-4o-mini-transcribe`；若要更高的準確度，請設定 `model: "gpt-4o-transcribe"`。
- 使用 `tools.media.audio.attachments` 來處理多個語音備忘錄（`mode: "all"` + `maxAttachments`）。
- 轉錄內容以 `{{Transcript}}` 的形式提供給範本使用。
- `tools.media.audio.echoTranscript` 預設為關閉；啟用它以在代理程式處理之前將轉錄確認傳送回來源聊天。
- `tools.media.audio.echoFormat` 可自訂回顯文字（佔位符：`{transcript}`）。
- CLI 標準輸出有上限（5MB）；請保持 CLI 輸出簡潔。
- CLI `args` 應該使用 `{{MediaPath}}` 作為本機音訊檔案路徑。執行 `openclaw doctor --fix` 以從較舊的 `audio.transcription.command` 設定中遷移已棄用的 `{input}` 佔位符。

### Proxy 環境支援

基於提供者的音訊轉錄遵循標準的出站代理環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未設定代理環境變數，則使用直接出站。如果代理設定格式錯誤，OpenClaw 會記錄警告並回退到直接擷取。

## 群組中的提及偵測

當為群組聊天設定 `requireMention: true` 時，OpenClaw 現在會在檢查提及**之前**轉錄音訊。這允許即使語音訊息包含提及也能進行處理。

**運作方式：**

1. 如果語音訊息沒有文字內容，且群組要求提及，OpenClaw 會執行「預檢」轉錄。
2. 會檢查轉錄文字中是否有提及模式（例如 `@BotName`、emoji 觸發器）。
3. 如果發現提及，訊息將繼續通過完整的回覆管道。
4. 轉錄文字用於提及偵測，以便語音訊息能通過提及閘門。

**回退行為：**

- 如果在預檢期間轉錄失敗（逾時、API 錯誤等），訊息將根據僅文字的提及偵測進行處理。
- 這確保了混合訊息（文字 + 音訊）永遠不會被錯誤丟棄。

**針對每個 Telegram 群組/主題選擇退出：**

- 設定 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 以跳過該群組的預檢轉錄提及檢查。
- 設定 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 以針對每個主題進行覆寫（`true` 表示跳過，`false` 表示強制啟用）。
- 預設值為 `false`（當符合提及閘門條件時，啟用預檢）。

**範例：** 使用者在設有 `requireMention: true` 的 Telegram 群組中發送一則語音訊息，說道「Hey @Claude, what's the weather?」。該語音訊息會被轉錄，偵測到提及，然後代理會回覆。

## 注意事項

- 範圍規則採用優先匹配原則。`chatType` 會被正規化為 `direct`、`group` 或 `room`。
- 確保您的 CLI 以 0 退出碼結束並輸出純文字；JSON 需要透過 `jq -r .text` 進行處理。
- 對於 `parakeet-mlx`，如果您傳遞 `--output-dir`，OpenClaw 會在 `--output-format` 為 `txt`（或省略）時讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 輸出格式會回退到 stdout 解析。
- 保持合理的逾時時間（`timeoutSeconds`，預設為 60 秒），以避免阻塞回覆佇列。
- 事前轉錄僅針對提及偵測處理 **第一個** 音訊附件。額外的音訊會在主要媒體理解階段處理。

## 相關

- [媒體理解](/zh-Hant/nodes/media-understanding)
- [交談模式](/zh-Hant/nodes/talk)
- [語音喚醒](/zh-Hant/nodes/voicewake)

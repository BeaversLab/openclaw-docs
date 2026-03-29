---
summary: "入站圖片/音訊/視訊理解（可選），具備供應商 + CLI 備援機制"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒體理解"
---

# 媒體理解 - 入站 (2026-01-17)

OpenClaw 可以在回覆管線運行前 **總結入站媒體**（圖片/音訊/視訊）。它會自動偵測何時有可用的本機工具或供應商金鑰，並且可以停用或自訂。如果關閉理解功能，模型仍會照常接收原始檔案/URL。

特定供應商的媒體行為是由供應商外掛註冊的，而 OpenClaw 核心則擁有共用的 `tools.media` 設定、備援順序和回覆管線整合。

## 目標

- 可選：將入站媒體預先消化為簡短文字，以加快路由速度 + 更好的指令解析。
- 保留傳送給模型的原始媒體（始終如此）。
- 支援 **供應商 API** 和 **CLI 備援機制**。
- 允許多個模型並按順序備援（錯誤/大小/逾時）。

## 高階行為

1. 收集入站附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
2. 對於每個啟用的功能（圖片/音訊/視訊），根據原則選擇附件（預設：**第一個**）。
3. 選擇第一個符合資格的模型項目（大小 + 功能 + 驗證）。
4. 如果模型失敗或媒體太大，**備援到下一個項目**。
5. 成功時：
   - `Body` 會變成 `[Image]`、`[Audio]` 或 `[Video]` 區塊。
   - 音訊會設定 `{{Transcript}}`；指令解析時如果有字幕文字則使用字幕，
     否則使用逐字稿。
   - 字幕會以 `User text:` 形式保留在區塊內。

如果理解失敗或已停用，**回覆流程會繼續**，並包含原始內文 + 附件。

## 設定概覽

`tools.media` 支援 **共用模型** 以及各功能的覆寫設定：

- `tools.media.models`：共用模型列表（使用 `capabilities` 來控制啟用）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 預設值 (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - 供應商覆蓋設定 (`baseUrl`, `headers`, `providerOptions`)
  - 透過 `tools.media.audio.providerOptions.deepgram` 設定 Deepgram 音訊選項
  - 音訊轉錄回顯控制 (`echoTranscript`，預設值 `false`；`echoFormat`)
  - 選用的 **各功能 `models` 清單** (優先於共享模型)
  - `attachments` 政策 (`mode`, `maxAttachments`, `prefer`)
  - `scope` (可選的通道/chatType/會話金鑰閘道)
- `tools.media.concurrency`：最大並行功能執行次數 (預設值 **2**)。

```json5
{
  tools: {
    media: {
      models: [
        /* shared list */
      ],
      image: {
        /* optional overrides */
      },
      audio: {
        /* optional overrides */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* optional overrides */
      },
    },
  },
}
```

### 模型項目

每個 `models[]` 項目可以是 **provider** 或 **CLI**：

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.2",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"],
}
```

CLI 範本也可以使用：

- `{{MediaDir}}` (包含媒體檔案的目錄)
- `{{OutputDir}}` (為此執行建立的暫存目錄)
- `{{OutputBase}}` (暫存檔案基礎路徑，無副檔名)

## 預設值與限制

建議的預設值：

- `maxChars`：圖片/影片為 **500** (簡短、指令友善)
- `maxChars`：音訊為 **未設定** (完整轉錄，除非您設定了限制)
- `maxBytes`：
  - image：**10MB**
  - audio：**20MB**
  - video：**50MB**

規則：

- 如果媒體超過 `maxBytes`，將跳過該模型並**嘗試下一個模型**。
- 小於 **1024 位元組** 的音訊檔案會被視為空白或損毀，並在供應商/CLI 轉錄前跳過。
- 如果模型回傳超過 `maxChars`，輸出將會被截斷。
- `prompt` 預設為簡單的「描述該 {media}。」加上 `maxChars` 指引 (僅限圖片/影片)。
- 如果 `<capability>.enabled: true` 但未設定任何模型，OpenClaw 會在其供應商支援該功能時嘗試
  **使用中回覆模型**。

### 自動偵測媒體理解 (預設)

如果 `tools.media.<capability>.enabled` **未**設定為 `false` 且您尚未
設定模型，OpenClaw 會按此順序自動偵測，並**停在第一個
可行的選項**：

1. **本機 CLI** (僅限音訊；若已安裝)
   - `sherpa-onnx-offline` (需要具備 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`)
   - `whisper-cli` (`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或隨附的 tiny 模型)
   - `whisper` (Python CLI；自動下載模型)
2. **Gemini CLI** (`gemini`)，使用 `read_many_files`
3. **供應商金鑰**
   - 音訊：OpenAI → Groq → Deepgram → Google
   - 影像：OpenAI → Anthropic → Google → MiniMax
   - 影片：Google

若要停用自動偵測，請設定：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

注意：二進位檔偵測在 macOS/Linux/Windows 上皆為盡力而為；請確保 CLI 位於 `PATH` 上 (我們會展開 `~`)，或使用完整指令路徑設定明確的 CLI 模型。

### Proxy 環境支援 (供應商模型)

當啟用基於供應商的 **音訊** 和 **影片** 媒體理解時，OpenClaw
會針對供應商 HTTP 呼叫遵守標準的出口 Proxy 環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

若未設定 Proxy 環境變數，媒體理解將使用直接出口。
若 Proxy 值格式錯誤，OpenClaw 將記錄警告並回退至直接
擷取。

## 能力 (選用)

若您設定 `capabilities`，該項目僅會針對這些媒體類型執行。對於共用
清單，OpenClaw 可推斷預設值：

- `openai`、`anthropic`、`minimax`：**image**
- `moonshot`：**image + video**
- `google` (Gemini API)：**image + audio + video**
- `mistral`：**audio**
- `zai`：**image**
- `groq`：**audio**
- `deepgram`：**audio**

對於 CLI 項目，請**明確設定 `capabilities`** 以避免意外匹配。
如果省略 `capabilities`，則該項目將符合其所屬的清單。

## 供應商支援矩陣 (OpenClaw 整合)

| 功能 | 供應商整合                                         | 備註                                           |
| ---- | -------------------------------------------------- | ---------------------------------------------- |
| 圖片 | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI | 供應商外掛程式針對核心媒體理解註冊圖片支援。   |
| 音訊 | OpenAI, Groq, Deepgram, Google, Mistral            | 供應商轉錄 (Whisper/Deepgram/Gemini/Voxtral)。 |
| 影片 | Google, Moonshot                                   | 透過供應商外掛程式進行的供應商影片理解。       |

## 模型選擇指引

- 當品質和安全性很重要時，請為每個媒體功能選擇可用的最強最新世代模型。
- 對於處理不受信任輸入的啟用工具代理程式，請避免使用較舊/較弱的媒體模型。
- 為了可用性，請為每個功能保留至少一個備援方案（品質模型 + 更快/更便宜的模型）。
- 當供應商 API 無法使用時，CLI 備援方案 (`whisper-cli`, `whisper`, `gemini`) 非常有用。
- `parakeet-mlx` 備註：使用 `--output-dir` 時，當輸出格式為 `txt` (或未指定) 時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式則會退回至標準輸出。

## 附件政策

針對功能的 `attachments` 控制處理哪些附件：

- `mode`：`first` (預設) 或 `all`
- `maxAttachments`：限制處理的數量 (預設 **1**)
- `prefer`：`first`、`last`、`path`、`url`

當 `mode: "all"` 時，輸出會標記為 `[Image 1/2]`、`[Audio 2/2]` 等。

## 設定範例

### 1) 共用模型清單 + 覆蓋設定

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
        {
          provider: "google",
          model: "gemini-3-flash-preview",
          capabilities: ["image", "audio", "video"],
        },
        {
          type: "cli",
          command: "gemini",
          args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          capabilities: ["image", "video"],
        },
      ],
      audio: {
        attachments: { mode: "all", maxAttachments: 2 },
      },
      video: {
        maxChars: 500,
      },
    },
  },
}
```

### 2) 僅限音訊 + 影片 (關閉圖片)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
          },
        ],
      },
      video: {
        enabled: true,
        maxChars: 500,
        models: [
          { provider: "google", model: "gemini-3-flash-preview" },
          {
            type: "cli",
            command: "gemini",
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 3) 選用圖片理解

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
          { provider: "anthropic", model: "claude-opus-4-6" },
          {
            type: "cli",
            command: "gemini",
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 4) 多模式單一項目 (明確功能)

```json5
{
  tools: {
    media: {
      image: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      audio: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      video: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
    },
  },
}
```

## 狀態輸出

當媒體理解運行時，`/status` 會包含一個簡短的摘要行：

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

這會顯示各項功能的結果，以及適用時所選擇的供應商/模型。

## 備註

- 媒體理解採用「**盡力而為**」原則。錯誤不會阻擋回覆。
- 即使停用媒體理解，附件仍會傳遞給模型。
- 使用 `scope` 來限制媒體理解運行的範圍（例如僅限私訊）。

## 相關文件

- [組態](/en/gateway/configuration)
- [圖片與媒體支援](/en/nodes/images)

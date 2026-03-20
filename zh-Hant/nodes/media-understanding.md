---
summary: "入站圖片/音訊/視訊理解（可選）與供應商 + CLI 後援"
read_when:
  - 設計或重構媒體理解
  - 調整入站音訊/視訊/圖片預處理
title: "媒體理解"
---

# 媒體理解 - 入站 (2026-01-17)

OpenClaw 可以在回覆管道運行前**總結入站媒體**（圖片/音訊/視訊）。它會自動偵測本機工具或供應商金鑰何時可用，並且可以被停用或自訂。如果關閉理解功能，模型仍會照常接收原始檔案/URL。

供應商特定的媒體行為是由供應商外掛程式註冊的，而 OpenClaw 核心擁有共用的 `tools.media` 設定、後援順序和回覆管道整合。

## 目標

- 可選：將入站媒體預先摘要為簡短文字，以加快路由速度 + 改善指令解析。
- 保留原始媒體傳送給模型（總是）。
- 支援 **供應商 API** 和 **CLI 後援**。
- 允許多個模型進行有序後援（錯誤/大小/逾時）。

## 高層级行為

1. 收集入站附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
2. 針對每個啟用的功能（圖片/音訊/視訊），根據原則選擇附件（預設：**第一個**）。
3. 選擇第一個符合資格的模型項目（大小 + 功能 + 驗證）。
4. 如果模型失敗或媒體太大，**後援至下一個項目**。
5. 成功時：
   - `Body` 變成 `[Image]`、`[Audio]` 或 `[Video]` 區塊。
   - 音訊設定 `{{Transcript}}`；指令解析時如果有字幕文字會使用字幕，
     否則使用逐字稿。
   - 字幕會以 `User text:` 形式保留在區塊內。

如果理解失敗或停用，**回覆流程會繼續**並附上原始內文 + 附件。

## 設定概覽

`tools.media` 支援 **共用模型** 以及各功能的覆寫：

- `tools.media.models`：共用模型清單（使用 `capabilities` 進行控管）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 預設值 (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - 提供者覆寫 (`baseUrl`, `headers`, `providerOptions`)
  - 透過 `tools.media.audio.providerOptions.deepgram` 設定的 Deepgram 音訊選項
  - 音訊轉錄回顯控制 (`echoTranscript`，預設為 `false`；`echoFormat`)
  - 選用的 **每項功能的 `models` 列表**（優先於共用模型）
  - `attachments` 政策 (`mode`, `maxAttachments`, `prefer`)
  - `scope`（可選的透過 channel/chatType/session key 進行閘道控制）
- `tools.media.concurrency`：最大並行功能執行數（預設為 **2**）。

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

### 模型條目

每個 `models[]` 條目可以是 **provider** 或 **CLI**：

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
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"],
}
```

CLI 樣板也可以使用：

- `{{MediaDir}}`（包含媒體檔案的目錄）
- `{{OutputDir}}`（為此執行建立的暫存目錄）
- `{{OutputBase}}`（暫存檔案基底路徑，無副檔名）

## 預設值與限制

建議的預設值：

- `maxChars`：圖片/影片為 **500**（簡短，利於指令操作）
- `maxChars`：音訊為 **unset**（完整轉錄，除非您設定了限制）
- `maxBytes`：
  - image：**10MB**
  - audio：**20MB**
  - video：**50MB**

規則：

- 如果媒體超過 `maxBytes`，則跳過該模型並**嘗試下一個模型**。
- 小於 **1024 位元組** 的音訊檔案會被視為空白或損壞，並在提供者/CLI 轉錄之前跳過。
- 如果模型傳回的內容超過 `maxChars`，輸出將會被截斷。
- `prompt` 預設為簡單的「描述 {media}。」加上 `maxChars` 指引（僅限圖片/影片）。
- 如果 `<capability>.enabled: true` 但未設定任何模型，當其提供者支援該功能時，OpenClaw 會嘗試
  **使用中的回覆模型**。

### 自動偵測媒體理解（預設）

如果 `tools.media.<capability>.enabled` **未** 設定為 `false` 且您尚未
設定模型，OpenClaw 會按此順序自動偵測，並在**第一個有效的選項處停止**：

1. **本機 CLI** (僅限音訊；若已安裝)
   - `sherpa-onnx-offline` (需要具有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`)
   - `whisper-cli` (`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或隨附的 tiny 模型)
   - `whisper` (Python CLI；自動下載模型)
2. **Gemini CLI** (`gemini`) 使用 `read_many_files`
3. **提供者金鑰**
   - 音訊：OpenAI → Groq → Deepgram → Google
   - 圖片：OpenAI → Anthropic → Google → MiniMax
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

注意：Binary 偵測在 macOS/Linux/Windows 上僅為盡力而為；請確保 CLI 位於 `PATH` (我們會展開 `~`)，或是設定具有完整指令路徑的明確 CLI 模型。

### Proxy 環境支援 (提供者模型)

當啟用基於提供者的**音訊**與**影片**媒體理解時，OpenClaw
會遵循標準的出站 Proxy 環境變數以進行提供者的 HTTP 呼叫：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

若未設定 Proxy 環境變數，媒體理解將使用直接出口。
若 Proxy 值格式錯誤，OpenClaw 將記錄警告並回退至直接擷取。

## 功能 (選用)

如果您設定 `capabilities`，該項目僅會針對那些媒體類型執行。對於共用的
清單，OpenClaw 可以推斷預設值：

- `openai`、`anthropic`、`minimax`：**image**
- `moonshot`：**image + video**
- `google` (Gemini API)：**image + audio + video**
- `mistral`：**audio**
- `zai`：**image**
- `groq`：**audio**
- `deepgram`：**audio**

對於 CLI 條目，**請明確設定 `capabilities`** 以避免意外匹配。
如果您省略 `capabilities`，該條目將適用於其所屬的列表。

## 供應商支援矩陣 (OpenClaw 整合)

| 功能 | 供應商整合                               | 備註                                                                   |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 圖片      | OpenAI、Anthropic、Google、MiniMax、Moonshot、Z.AI | 廠商外掛會針對核心媒體理解註冊圖片支援。 |
| 音訊      | OpenAI、Groq、Deepgram、Google、Mistral            | 供應商轉錄 (Whisper/Deepgram/Gemini/Voxtral)。               |
| 影片      | Google、Moonshot                                   | 透過廠商外掛進行供應商影片理解。                        |

## 模型選擇指南

- 當品質和安全性很重要時，請針對每種媒體功能優先選擇可用的最強最新一代模型。
- 對於處理不受信任輸入的啟用工具代理程式，請避免使用較舊/較弱的媒體模型。
- 為了確保可用性，請為每種功能保留至少一個備選方案（品質模型 + 更快/更便宜的模型）。
- 當供應商 API 無法使用時，CLI 備援 (`whisper-cli`、`whisper`、`gemini`) 非常有用。
- `parakeet-mlx` 備註：使用 `--output-dir` 時，當輸出格式為 `txt` (或未指定) 時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式會退回至 stdout。

## 附件原則

針對功能的 `attachments` 控制處理哪些附件：

- `mode`：`first` (預設) 或 `all`
- `maxAttachments`：限制處理的數量 (預設為 **1**)
- `prefer`：`first`、`last`、`path`、`url`

當 `mode: "all"` 時，輸出會標記為 `[Image 1/2]`、`[Audio 2/2]` 等。

## 設定範例

### 1) 共用模型列表 + 覆寫

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
          args: [
            "-m",
            "gemini-3-flash",
            "--allowed-tools",
            "read_file",
            "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
          ],
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
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
            ],
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
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
            ],
          },
        ],
      },
    },
  },
}
```

### 4) 多模態單一条目 (明確功能)

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

當媒體理解執行時，`/status` 包含一個簡短的摘要行：

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

這會顯示各功能的結果以及適用時選擇的供應商/模型。

## 注意事項

- 理解是**盡力而為** 的。錯誤不會阻擋回覆。
- 即使停用了理解功能，附件仍會傳遞給模型。
- 使用 `scope` 限制理解執行的位置（例如僅限直接訊息）。

## 相關文件

- [組態](/zh-Hant/gateway/configuration)
- [圖片與媒體支援](/zh-Hant/nodes/images)

import en from "/components/footer/en.mdx";

<en />

---
summary: "輸入圖片/音訊/視訊理解（可選），並提供供應商 + CLI 後備機制"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒體理解"
---

# 媒體理解（輸入）— 2026-01-17

OpenClaw 可以在回覆管線執行之前，**摘要輸入媒體**（圖片/音訊/視訊）。它會自動偵測本機工具或供應商金鑰何時可用，並且可以被停用或自訂。如果關閉理解功能，模型仍會照常接收原始檔案/URL。

## 目標

- 選用：將輸入媒體預先消化為簡短文字，以加快路由速度並改善指令解析。
- 保留傳遞至模型的原始媒體（始終）。
- 支援 **供應商 API** 和 **CLI 後備機制**。
- 允許多個模型進行有序後備（錯誤/大小/逾時）。

## 高層级行為

1. 收集輸入附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
2. 針對每個啟用的功能（圖片/音訊/視訊），根據原則選擇附件（預設：**第一個**）。
3. 選擇第一個符合條件的模型項目（大小 + 功能 + 驗證）。
4. 如果模型失敗或媒體過大，**退回至下一個項目**。
5. 成功時：
   - `Body` 會變成 `[Image]`、`[Audio]` 或 `[Video]` 區塊。
   - 音訊會設定 `{{Transcript}}`；指令解析會優先使用說明文字（如果有），
     否則使用逐字稿。
   - 說明文字會以 `User text:` 的形式保留在區塊內。

如果理解失敗或已停用，**回覆流程會繼續**執行，並保留原始內文 + 附件。

## 設定概覽

`tools.media` 支援 **共用模型** 以及各功能的覆寫：

- `tools.media.models`：共用模型列表（使用 `capabilities` 來控制開關）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 預設值 (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - 供應商覆寫 (`baseUrl`, `headers`, `providerOptions`)
  - 透過 `tools.media.audio.providerOptions.deepgram` 設定 Deepgram 音訊選項
  - 音訊轉錄回顯控制 (`echoTranscript`，預設 `false`；`echoFormat`)
  - 選用的 **各功能 `models` 清單** (優先於共享模型)
  - `attachments` 原則 (`mode`, `maxAttachments`, `prefer`)
  - `scope` (依 channel/chatType/session key 選用性閘道控制)
- `tools.media.concurrency`：最大並行功能執行次數 (預設 **2**)。

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

CLI 範本也可以使用：

- `{{MediaDir}}` (包含媒體檔案的目錄)
- `{{OutputDir}}` (為此次執行建立的暫存目錄)
- `{{OutputBase}}` (暫存檔案基礎路徑，無副檔名)

## 預設值與限制

建議預設值：

- `maxChars`：圖片/影片為 **500** (簡短，適合指令操作)
- `maxChars`：音訊為 **未設定** (完整轉錄，除非您設定了限制)
- `maxBytes`：
  - 圖片：**10MB**
  - 音訊：**20MB**
  - 影片：**50MB**

規則：

- 如果媒體超過 `maxBytes`，則會跳過該模型並**嘗試下一個模型**。
- 小於 **1024 位元組** 的音訊檔案會被視為空檔或損毀，並在供應商/CLI 轉錄前被跳過。
- 如果模型回傳超過 `maxChars`，輸出將會被裁切。
- `prompt` 預設為簡單的「描述此 {media}。」加上 `maxChars` 指引 (僅限圖片/影片)。
- 如果 `<capability>.enabled: true` 但未設定模型，當其供應商支援該功能時，OpenClaw 會嘗試
  **使用中的回覆模型**。

### 自動偵測媒體理解 (預設)

如果 `tools.media.<capability>.enabled` **未**設定為 `false` 且您尚未
設定模型，OpenClaw 會按此順序自動偵測，並在**第一個有效的選項處停止**：

1. **本機 CLI** (僅限音訊；若已安裝)
   - `sherpa-onnx-offline` (需要具備 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`)
   - `whisper-cli` (`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內建的 tiny 模型)
   - `whisper` (Python CLI；會自動下載模型)
2. **Gemini CLI** (`gemini`) 使用 `read_many_files`
3. **供應商金鑰**
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

注意：在 macOS/Linux/Windows 上，二進位檔偵測僅為盡力而為；請確保 CLI 位於 `PATH` 上 (我們會展開 `~`)，或是使用完整的指令路徑設定明確的 CLI 模型。

### Proxy 環境支援 (供應商模型)

當啟用基於供應商的**音訊**和**影片**媒體理解功能時，OpenClaw 會遵循用於供應商 HTTP 呼叫的標準出站 Proxy 環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未設定 Proxy 環境變數，媒體理解將使用直接出口。
如果 Proxy 值格式錯誤，OpenClaw 會記錄警告並回退至直接
擷取。

## 功能 (可選)

如果您設定 `capabilities`，該項目僅會針對那些媒體類型執行。對於共用
清單，OpenClaw 可以推斷預設值：

- `openai`、`anthropic`、`minimax`：**圖片**
- `google` (Gemini API)：**圖片 + 音訊 + 影片**
- `groq`：**音訊**
- `deepgram`：**音訊**

對於 CLI 項目，**請明確設定 `capabilities`** 以避免意外的相符項目。
如果您省略 `capabilities`，該項目將有資格出現在它所在的清單中。

## 供應商支援矩陣 (OpenClaw 整合)

| 功能 | 供應商整合                                     | 備註                                           |
| ---- | ---------------------------------------------- | ---------------------------------------------- |
| 圖片 | OpenAI / Anthropic / Google / 其他透過 `pi-ai` | 註冊表中任何具備圖片功能的模型均可運作。       |
| 音訊 | OpenAI、Groq、Deepgram、Google、Mistral        | 供應商轉錄 (Whisper/Deepgram/Gemini/Voxtral)。 |
| 影片 | Google (Gemini API)                            | 供應商影片理解。                               |

## 模型選擇指引

- 當品質和安全性至關重要時，請優先針對每個媒體功能選擇可用的最強最新世代模型。
- 對於處理不受信任輸入的已啟用工具代理，請避免使用舊款或較弱的媒體模型。
- 為確保可用性，請為每個功能保留至少一個備選方案 (高品質模型 + 更快/更便宜的模型)。
- 當供應商 API 無法使用時，CLI 備選方案 (`whisper-cli`、`whisper`、`gemini`) 會很有用。
- `parakeet-mlx` 附註：使用 `--output-dir` 時，當輸出格式為 `txt` (或未指定) 時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式則會回退至 stdout。

## 附件政策

針對各功能的 `attachments` 控制要處理哪些附件：

- `mode`：`first` (預設) 或 `all`
- `maxAttachments`：限制處理數量 (預設 **1**)
- `prefer`：`first`、`last`、`path`、`url`

當 `mode: "all"` 時，輸出會標記為 `[Image 1/2]`、`[Audio 2/2]` 等。

## 設定範例

### 1) 共用模型清單 + 覆寫

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

### 2) 僅音訊 + 影片 (關閉圖片)

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

### 4) 多模態單一項目 (明確功能)

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

當媒體理解執行時，`/status` 會包含一個簡短的摘要行：

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

這會顯示各功能的結果以及適用時所選擇的供應商/模型。

## 備註

- 理解為 **盡力而為**。錯誤不會阻擋回覆。
- 即使關閉理解功能，附件仍會傳遞給模型。
- 使用 `scope` 限制理解的運行位置（例如僅限私訊）。

## 相關文件

- [設定](/zh-Hant/gateway/configuration)
- [圖片與媒體支援](/zh-Hant/nodes/images)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

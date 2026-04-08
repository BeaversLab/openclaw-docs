---
summary: "入站圖片/音訊/視訊理解（可選），具備供應商 + CLI 備援機制"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒體理解"
---

# 媒體理解 - 入站 (2026-01-17)

OpenClaw 可以在回覆管線運行前 **總結入站媒體**（圖片/音訊/視訊）。它會自動偵測何時有可用的本機工具或供應商金鑰，並且可以停用或自訂。如果關閉理解功能，模型仍會照常接收原始檔案/URL。

廠商特定的媒體行為由廠商外掛註冊，而 OpenClaw 核心擁有共享的 `tools.media` 配置、後備順序和回應管線整合。

## 目標

- 可選：將入站媒體預先消化為簡短文字，以加快路由速度 + 更好的指令解析。
- 保留傳送給模型的原始媒體（始終如此）。
- 支援 **供應商 API** 和 **CLI 備援機制**。
- 允許多個模型並按順序備援（錯誤/大小/逾時）。

## 高階行為

1. 收集傳入附件（`MediaPaths`、`MediaUrls`、`MediaTypes`）。
2. 對於每個啟用的功能（圖片/音訊/視訊），根據原則選擇附件（預設：**第一個**）。
3. 選擇第一個符合資格的模型項目（大小 + 功能 + 驗證）。
4. 如果模型失敗或媒體太大，**備援到下一個項目**。
5. 成功時：
   - `Body` 會變成 `[Image]`、`[Audio]` 或 `[Video]` 區塊。
   - 音訊會設定 `{{Transcript}}`；指令解析會在字幕文字存在時使用它，否則使用逐字稿。
   - 字幕會保留為區塊內的 `User text:`。

如果理解失敗或已停用，**回覆流程會繼續**，並包含原始內文 + 附件。

## 設定概覽

`tools.media` 支援 **共享模型** 以及每個功能的覆寫：

- `tools.media.models`：共享模型清單（使用 `capabilities` 進行閘道控制）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 預設值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
  - 供應商覆寫（`baseUrl`、`headers`、`providerOptions`）
  - 透過 `tools.media.audio.providerOptions.deepgram` 設定 Deepgram 音訊選項
  - 音訊逐字稿回傳控制（`echoTranscript`，預設 `false`；`echoFormat`）
  - 選用的 **各功能的 `models` 清單**（優先於共享模型）
  - `attachments` 原則（`mode`、`maxAttachments`、`prefer`）
  - `scope`（依頻道/chatType/會話金鑰進行選用性閘道控制）
- `tools.media.concurrency`：最大並行功能執行次數（預設 **2**）。

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

每個 `models[]` 項目都可以是 **provider** 或 **CLI**：

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.4-mini",
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

- `{{MediaDir}}`（包含媒體檔案的目錄）
- `{{OutputDir}}`（為此次執行建立的暫存目錄）
- `{{OutputBase}}`（暫存檔案基底路徑，無副檔名）

## 預設值與限制

建議的預設值：

- `maxChars`：**500** 用於圖片/影片（簡短、指令友善）
- `maxChars`：**未設定** 用於音訊（完整轉錄，除非您設定限制）
- `maxBytes`：
  - image：**10MB**
  - audio：**20MB**
  - video：**50MB**

規則：

- 如果媒體超過 `maxBytes`，則跳過該模型並**嘗試下一個模型**。
- 小於 **1024 位元組** 的音訊檔案會被視為空白或損毀，並在供應商/CLI 轉錄前跳過。
- 如果模型返回超過 `maxChars`，輸出將會被截斷。
- `prompt` 預設為簡單的「描述 {media}。」加上 `maxChars` 指引（僅限圖片/影片）。
- 如果使用中的主要圖片模型原本就支援視覺能力，OpenClaw
  會跳過 `[Image]` 摘要區塊，並將原始圖片傳入
  模型。
- 如果 `<capability>.enabled: true` 但未設定模型，當供應商支援該功能時，OpenClaw 會嘗試
  **使用中的回覆模型**。

### 自動偵測媒體理解（預設）

如果 `tools.media.<capability>.enabled` **未**設定為 `false` 且您尚未
設定模型，OpenClaw 會依此順序自動偵測並在**第一個可運作的選項**停止：

1. **使用中的回覆模型**，當其供應商支援該功能時。
2. **`agents.defaults.imageModel`** 主要/備用參照（僅限圖片）。
3. **本機 CLI**（僅限音訊；若已安裝）
   - `sherpa-onnx-offline`（需要帶有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或內附的 tiny 模型）
   - `whisper`（Python CLI；自動下載模型）
4. **Gemini CLI**（`gemini`）使用 `read_many_files`
5. **供應商驗證**
   - 已設定且支援該功能的 `models.providers.*` 項目會
     在內附的備用順序之前嘗試。
   - 具有支援圖片能力的模型之僅圖片設定供應商，即使不是內附的供應商外掛程式，也會自動註冊以進行
     媒體理解。
   - 內附備用順序：
     - 音訊：OpenAI → Groq → Deepgram → Google → Mistral
     - 圖片：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
     - 影片：Google → Qwen → Moonshot

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

注意：二進制檢測在 macOS/Linux/Windows 上為盡力而為；確保 CLI 位於 `PATH`（我們會展開 `~`），或是使用完整指令路徑設定明確的 CLI 模型。

### Proxy 環境支援（提供者模型）

當啟用基於提供者的 **音訊** 和 **視訊** 媒體理解功能時，OpenClaw 會遵循提供者 HTTP 呼叫的標準出站 Proxy 環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未設定 Proxy 環境變數，媒體理解將使用直接出口。如果 Proxy 值格式錯誤，OpenClaw 會記錄警告並回退為直接擷取。

## 功能（可選）

如果您設定 `capabilities`，該項目僅針對這些媒體類型執行。對於共享清單，OpenClaw 可以推斷預設值：

- `openai`、`anthropic`、`minimax`：**image**
- `minimax-portal`：**image**
- `moonshot`：**image + video**
- `openrouter`：**image**
- `google` (Gemini API)：**image + audio + video**
- `qwen`：**image + video**
- `mistral`：**audio**
- `zai`：**image**
- `groq`：**audio**
- `deepgram`：**audio**
- 任何具有支援圖像模型的 `models.providers.<id>.models[]` 目錄：
  **image**

對於 CLI 項目，請**明確設定 `capabilities`** 以避免意外符合。如果您省略 `capabilities`，該項目將有資格出現在其所在的清單中。

## 提供者支援矩陣（OpenClaw 整合）

| 功能 | 提供者整合                                                                             | 備註                                                                                                                            |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 圖像 | OpenAI、OpenRouter、Anthropic、Google、MiniMax、Moonshot、Qwen、Z.AI、config providers | 供應商外掛程式會註冊圖像支援；MiniMax 和 MiniMax OAuth 兩者都使用 `MiniMax-VL-01`；具備圖像功能的 config providers 會自動註冊。 |
| 音訊 | OpenAI、Groq、Deepgram、Google、Mistral                                                | 提供者轉錄。                                                                                                                    |
| 視訊 | Google、Qwen、Moonshot                                                                 | 透過供應商外掛程式提供者影片理解；Qwen 影片理解使用標準 DashScope 端點。                                                        |

MiniMax 說明：

- `minimax` 和 `minimax-portal` 圖片理解來自外掛程式擁有的
  `MiniMax-VL-01` 媒體提供者。
- 隨附的 MiniMax 文字目錄仍以僅文字模式啟動；明確的
  `models.providers.minimax` 項目會具體化支援圖片的 M2.7 聊天參照。

## 模型選擇指引

- 當品質和安全性很重要時，請針對每種媒體功能優先選擇可用的最強最新世代模型。
- 對於處理不受信任輸入的啟用工具代理，請避免使用較舊/較弱的媒體模型。
- 為了確保可用性，請為每種功能保留至少一個備選模型（高品質模型 + 更快/更便宜的模型）。
- CLI 備選項 (`whisper-cli`, `whisper`, `gemini`) 在供應商 API 無法使用時很有用。
- `parakeet-mlx` 說明：若使用 `--output-dir`，當輸出格式為 `txt` (或未指定) 時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式會回退至 stdout。

## 附件原則

針對每種功能的 `attachments` 控制處理哪些附件：

- `mode`：`first` (預設) 或 `all`
- `maxAttachments`：限制處理數量 (預設 **1**)
- `prefer`：`first`、`last`、`path`、`url`

當 `mode: "all"` 時，輸出會標記為 `[Image 1/2]`、`[Audio 2/2]` 等。

檔案附件擷取行為：

- 擷取的檔案文字會被包裝為 **不受信任的外部內容**，然後才
  附加到媒體提示詞。
- 注入的區塊使用明確的邊界標記，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，並包含
  `Source: External` 元資料行。
- 此附件提取路徑特意省略了長 `SECURITY NOTICE:` 橫幅，以避免讓媒體提示變得過於龐大；邊界標記和元數據仍然保留。
- 如果檔案沒有可提取的文字，OpenClaw 會注入 `[No extractable text]`。
- 如果 PDF 在此路徑中回退到渲染頁面影像，媒體提示會保留佔位符 `[PDF content rendered to images; images not forwarded to model]`，因為此附件提取步驟轉發的是文字區塊，而非渲染後的 PDF 影像。

## 配置範例

### 1) 共用模型列表 + 覆蓋

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.4-mini", capabilities: ["image"] },
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

### 2) 僅限音訊 + 影片 (關閉影像)

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

### 3) 選用影像理解

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.4-mini" },
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

### 4) 多模態單一條目 (明確功能)

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

當媒體理解運行時，`/status` 包含一個簡短的摘要行：

```
📎 Media: image ok (openai/gpt-5.4-mini) · audio skipped (maxBytes)
```

這會顯示各功能的結果以及適用時選擇的提供者/模型。

## 備註

- 理解是 **盡力而為** 的。錯誤不會阻擋回覆。
- 即使停用了理解功能，附件仍然會傳遞給模型。
- 使用 `scope` 來限制運行理解的位置 (例如僅限私訊)。

## 相關文件

- [配置](/en/gateway/configuration)
- [影像與媒體支援](/en/nodes/images)

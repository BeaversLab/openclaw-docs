---
summary: "以 Infer 為優先的 CLI，用於提供商支援的模型、影像、音訊、TTS、影片、網路和嵌入工作流程"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "Inference CLI"
---

`openclaw infer` 是提供商支援的推論工作流程的標準無介面介面。

它刻意公開功能系列，而非原始的閘道 RPC 名稱，也非原始的代理程式工具 ID。

## 將 infer 轉化為技能

將此複製並貼上到代理程式：

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

良好的基於 infer 的技能應該：

- 將常見的使用者意圖對應到正確的 infer 子指令
- 包含一些涵蓋其工作流程的標準 infer 範例
- 在範例和建議中優先使用 `openclaw infer ...`
- 避免在技能主體內重新記錄整個 infer 介面

典型的以 infer 為重點的技能涵蓋範圍：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 為何使用 infer

`openclaw infer` 在 OpenClaw 內為提供商支援的推論任務提供了一個一致的 CLI。

優點：

- 使用已在 OpenClaw 中設定的提供商和模型，而無需為每個後端連接一次性包裝函式。
- 將模型、影像、音訊轉錄、TTS、影片、網路和嵌入工作流程保持在同一個指令樹下。
- 針對腳本、自動化和代理程式驅動的工作流程，使用穩定的 `--json` 輸出結構。
- 當任務本質上是「執行推論」時，優先使用 OpenClaw 的第一方介面。
- 對於大多數 infer 指令，使用正常的本機路徑，而不需要閘道。

對於端對端的提供商檢查，請在較低層級的
提供商測試通過後，優先使用 `openclaw infer ...`。它會在發出提供商請求之前，
測試已出貨的 CLI、組態載入、
預設代理程式解析、隨附外掛程式啟用、執行時間相依性修復，
以及共用的功能執行時間。

## 指令樹

```text
 openclaw infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## 常見任務

此表格將常見的推論任務對應至對應的 infer 指令。

| 任務              | 指令                                                                   | 備註                                          |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| 執行文字/模型提示 | `openclaw infer model run --prompt "..." --json`                       | 預設使用一般的本機路徑                        |
| 產生影像          | `openclaw infer image generate --prompt "..." --json`                  | 從現有檔案開始時，請使用 `image edit`         |
| 描述影像檔案      | `openclaw infer image describe --file ./image.png --json`              | `--model` 必須是支援影像的 `<provider/model>` |
| 轉錄音訊          | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` 必須是 `<provider/model>`           |
| 合成語音          | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` 是以閘道為導向                   |
| 產生影片          | `openclaw infer video generate --prompt "..." --json`                  | 支援提供者提示，例如 `--resolution`           |
| 描述影片檔案      | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` 必須是 `<provider/model>`           |
| 搜尋網路          | `openclaw infer web search --query "..." --json`                       |                                               |
| 擷取網頁          | `openclaw infer web fetch --url https://example.com --json`            |                                               |
| 建立嵌入          | `openclaw infer embedding create --text "..." --json`                  |                                               |

## 行為

- `openclaw infer ...` 是這些工作流程的主要 CLI 介面。
- 當輸出將由另一個命令或腳本使用時，請使用 `--json`。
- 當需要特定後端時，請使用 `--provider` 或 `--model provider/model`。
- 對於 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必須使用 `<provider/model>` 格式。
- 對於 `image describe`，明確的 `--model` 會直接執行該提供者/模型。模型必須在模型目錄或提供者設定中具備映像處理能力。`codex/<model>` 執行有界的 Codex 應用程式伺服器映像理解回合；`openai-codex/<model>` 使用 OpenAI Codex OAuth 提供者路徑。
- 無狀態執行指令預設為本機。
- 閘道管理的狀態指令預設為閘道。
- 一般的本機路徑不需要閘道正在執行。
- `model run` 是一次性執行。透過該命令的 agent 執行時期開啟的 MCP 伺服器會在回覆後終止，無論是本機還是 `--gateway` 執行，因此重複的腳本呼叫不會讓 stdio MCP 子程序保持運作。

## 模型

使用 `model` 進行由提供者支援的文字推斷和模型/提供者檢查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

備註：

- `model run` 重複使用 agent 執行時期，因此提供者/模型覆寫的行為就像正常的 agent 執行一樣。
- 由於 `model run` 旨在用於無頭自動化，因此在命令完成後，它不會保留每個階段捆綁的 MCP 執行時期。
- `model auth login`、`model auth logout` 和 `model auth status` 管理已儲存的提供者驗證狀態。

## 圖片

使用 `image` 進行生成、編輯和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

備註：

- 從現有輸入檔案開始時，請使用 `image edit`。
- 針對支援參考圖片編輯幾何提示的提供者/模型，請搭配 `image edit` 使用 `--size`、`--aspect-ratio` 或 `--resolution`。
- 搭配 `--model openai/gpt-image-1.5` 使用 `--output-format png --background transparent` 以取得透明背景的 OpenAI PNG 輸出；`--openai-background` 仍可作為 OpenAI 專用的別名使用。未宣告背景支援的提供者會將該提示回報為已忽略的覆寫。
- 使用 `image providers --json` 來驗證哪些內建圖片提供者可被探索、設定、選取，以及每個提供者公開了哪些生成/編輯功能。
- 使用 `image generate --model <provider/model> --json` 作為圖片生成變更的最狹隘即時 CLI 測試。範例：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  JSON 回應會報告 `ok`、`provider`、`model`、`attempts` 和寫入的輸出路徑。當設定 `--output` 時，最終副檔名可能會遵循提供者傳回的 MIME 類型。

- 對於 `image describe`，`--model` 必須是具備圖片功能的 `<provider/model>`。
- 對於本機 Ollama 視覺模型，請先下載模型並將 `OLLAMA_API_KEY` 設為任何預留位置值，例如 `ollama-local`。請參閱 [Ollama](/zh-Hant/providers/ollama#vision-and-image-description)。

## 音訊

使用 `audio` 進行檔案轉錄。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

備註：

- `audio transcribe` 是用於檔案轉錄，而非即時會話管理。
- `--model` 必須是 `<provider/model>`。

## TTS

使用 `tts` 進行語音合成和 TTS 提供者狀態管理。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

備註：

- `tts status` 預設為 gateway，因為它反映的是 gateway 管理的 TTS 狀態。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 來檢查和設定 TTS 行為。

## 影片

使用 `video` 進行生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

注意：

- `video generate` 接受 `--size`、`--aspect-ratio`、`--resolution`、`--duration`、`--audio`、`--watermark` 和 `--timeout-ms`，並將其轉發給視訊生成執行時期。
- 對於 `video describe`，`--model` 必須是 `<provider/model>`。

## Web

使用 `web` 進行搜尋和擷取工作流程。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

注意：

- 使用 `web providers` 來檢查可用的、已設定的和已選擇的提供者。

## 嵌入

使用 `embedding` 建立向量並檢查嵌入提供者。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 輸出

Infer 指令將 JSON 輸出正規化為共用信封格式：

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
  "attempts": [],
  "outputs": []
}
```

頂層欄位是穩定的：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

對於生成的媒體指令，`outputs` 包含由 OpenClaw 寫入的檔案。請使用該陣列中的 `path`、`mimeType`、`size` 以及任何特定於媒體的維度進行自動化，而不是解析人類可讀的標準輸出。

## 常見陷阱

```bash
# Bad
openclaw infer media image generate --prompt "friendly lobster"

# Good
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# Bad
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## 備註

- `openclaw capability ...` 是 `openclaw infer ...` 的別名。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [模型](/zh-Hant/concepts/models)

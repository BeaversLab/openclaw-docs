---
summary: "優先使用 infer 的 CLI，適用於供應商支援的模型、影像、音訊、TTS、影片、網頁和嵌入工作流程"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "推論 CLI"
---

# 推論 CLI

`openclaw infer` 是供應商支援推論工作流程的標準無介面操作介面。

它刻意公開功能系列，而非原始的閘道 RPC 名稱或原始的代理程式工具 ID。

## 將 infer 轉換為技能

將此複製並貼上至代理程式：

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

良好的基於 infer 的技能應該：

- 將常見的使用者意圖對應至正確的 infer 子指令
- 包含一些針對其所涵蓋工作流程的標準 infer 範例
- 在範例和建議中偏好使用 `openclaw infer ...`
- 避免在技能主體中重新記載整個 infer 介面

典型的以 infer 為主的技能涵蓋範圍：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 為何使用 infer

`openclaw infer` 在 OpenClaw 內為供應商支援的推論任務提供了一致的 CLI。

優點：

- 使用已在 OpenClaw 中設定的供應商和模型，而不必為每個後端連接一次性的包裝器。
- 將模型、影像、音訊轉錄、TTS、影片、網頁和嵌入工作流程保持在同一個指令樹下。
- 針對腳本、自動化和代理程式驅動的工作流程，使用穩定的 `--json` 輸出結構。
- 當任務本質上是「執行推論」時，優先使用第一方 OpenClaw 介面。
- 對於大多數 infer 指令，使用一般的本機路徑，而不需要閘道。

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

| 任務              | 指令                                                                   | 備註                                    |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| 執行文字/模型提示 | `openclaw infer model run --prompt "..." --json`                       | 預設使用一般的本機路徑                  |
| 產生影像          | `openclaw infer image generate --prompt "..." --json`                  | 當從現有檔案開始時，請使用 `image edit` |
| 描述影像檔案      | `openclaw infer image describe --file ./image.png --json`              | `--model` 必須為 `<provider/model>`     |
| 轉錄音訊          | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` 必須是 `<provider/model>`     |
| 合成語音          | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` 是以閘道為導向的           |
| 產生影片          | `openclaw infer video generate --prompt "..." --json`                  |                                         |
| 描述影片檔案      | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` 必須是 `<provider/model>`     |
| 搜尋網路          | `openclaw infer web search --query "..." --json`                       |                                         |
| 擷取網頁          | `openclaw infer web fetch --url https://example.com --json`            |                                         |
| 建立嵌入          | `openclaw infer embedding create --text "..." --json`                  |                                         |

## 行為

- `openclaw infer ...` 是這些工作流程的主要 CLI 介面。
- 當輸出將由另一個指令或指令碼使用時，請使用 `--json`。
- 當需要特定後端時，請使用 `--provider` 或 `--model provider/model`。
- 對於 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必須使用 `<provider/model>` 格式。
- 無狀態執行指令預設為本地。
- 閘道管理的狀態指令預設為閘道。
- 正常的本地路徑不需要閘道正在執行。

## 模型

使用 `model` 進行提供商支援的文字推斷和模型/提供商檢查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.4 --json
```

備註：

- `model run` 重複使用代理執行階段，因此提供商/模型覆蓋的行為就像正常的代理執行一樣。
- `model auth login`、`model auth logout` 和 `model auth status` 管理已儲存的提供商驗證狀態。

## 影像

使用 `image` 進行生成、編輯和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
```

備註：

- 從現有的輸入檔案開始時，請使用 `image edit`。
- 對於 `image describe`，`--model` 必須是 `<provider/model>`。

## 音訊

使用 `audio` 進行檔案轉錄。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

備註：

- `audio transcribe` 適用於檔案轉錄，而非即時工作階段管理。
- `--model` 必須是 `<provider/model>`。

## TTS

使用 `tts` 進行語音合成和 TTS 提供商狀態管理。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

備註：

- `tts status` 預設為 gateway，因為它反映由 gateway 管理的 TTS 狀態。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 來檢查和設定 TTS 行為。

## 影片

使用 `video` 進行生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

備註：

- `--model` 必須是 `<provider/model>` 才能使用 `video describe`。

## Web

使用 `web` 進行搜尋和擷取工作流程。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

備註：

- 使用 `web providers` 來檢查可用、已設定和已選取的供應商。

## 嵌入

使用 `embedding` 進行向量建立和嵌入供應商檢查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 輸出

Infer 指令會將 JSON 輸出正規化至共用封套下：

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-1",
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

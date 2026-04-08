---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 隨附了一個用於 Grok 模型的內建 `xai` 提供者外掛程式。

## 設定

1. 在 xAI 主控台中建立 API 金鑰。
2. 設定 `XAI_API_KEY`，或執行：

```bash
openclaw onboard --auth-choice xai-api-key
```

3. 選擇一個模型，例如：

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

OpenClaw 現在使用 xAI Responses API 作為內建的 xAI 傳輸方式。同一個
`XAI_API_KEY` 也能驅動由 Grok 支援的 `web_search`、一等的 `x_search`
以及遠端 `code_execution`。
如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下儲存了 xAI 金鑰，
內建的 xAI 模型提供者現在也會將該金鑰作為後備重複使用。
`code_execution` 調整位於 `plugins.entries.xai.config.codeExecution` 之下。

## 目前內建的型號目錄

OpenClaw 現在內建了這些 xAI 模型系列：

- `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`
- `grok-4`, `grok-4-0709`
- `grok-4-fast`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning`
- `grok-code-fast-1`

當較新的 `grok-4*` 和 `grok-code-fast*` ID
遵循相同的 API 形狀時，外掛程式也會前向解析它們。

Fast-model 註記：

- `grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 變體是
  目前內建目錄中具備影像功能的 Grok 參照。
- `/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
  會將原生 xAI 請求重寫如下：
  - `grok-3` -> `grok-3-fast`
  - `grok-3-mini` -> `grok-3-mini-fast`
  - `grok-4` -> `grok-4-fast`
  - `grok-4-0709` -> `grok-4-fast`

舊版相容性別名仍會正規化為標準的內建 ID。例如：

- `grok-4-fast-reasoning` -> `grok-4-fast`
- `grok-4-1-fast-reasoning` -> `grok-4-1-fast`
- `grok-4.20-reasoning` -> `grok-4.20-beta-latest-reasoning`
- `grok-4.20-non-reasoning` -> `grok-4.20-beta-latest-non-reasoning`

## 網路搜尋

內建的 `grok` 網路搜尋提供者也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 影片生成

內建的 `xai` 外掛程式也會透過共用的 `video_generate` 工具註冊影片生成功能。

- 預設影片模型：`xai/grok-imagine-video`
- 模式：文字生成影片、圖片生成影片以及遠端影片編輯/擴充流程
- 支援 `aspectRatio` 和 `resolution`
- 目前限制：不接受本機影片緩衝區；請使用遠端 `http(s)` URL 作為影片參考/編輯輸入

若要將 xAI 用作預設影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "xai/grok-imagine-video",
      },
    },
  },
}
```

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。

## 已知限制

- 目前驗證僅支援 API 金鑰。OpenClaw 中尚未提供 xAI OAuth/裝置代碼流程。
- 一般 xAI 提供者路徑不支援 `grok-4.20-multi-agent-experimental-beta-0304`，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。

## 注意事項

- OpenClaw 會在共用執行器路徑上自動套用 xAI 特定的工具綱要和工具呼叫相容性修復。
- 原生 xAI 請求預設 `tool_stream: true`。請將 `agents.defaults.models["xai/<model>"].params.tool_stream` 設定為 `false` 以停用它。
- 內建的 xAI 包裝器會在傳送原生 xAI 請求之前，移除不支援的嚴格工具綱要旗標和推理 payload 金鑰。
- `web_search`、`x_search` 和 `code_execution` 被公開為 OpenClaw 工具。OpenClaw 會在每個工具請求中啟用所需的特定 xAI 內建功能，而不是將所有原生工具附加到每個聊天輪次中。
- `x_search` 和 `code_execution` 是由內建的 xAI 外掛程式擁有，而非硬編碼到核心模型執行階段中。
- `code_execution` 是遠端 xAI 沙箱執行，而非本機 [`exec`](/en/tools/exec)。
- 如需更廣泛的提供者概覽，請參閱 [Model providers](/en/providers/index)。

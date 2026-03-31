---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 內建了一個用於 Grok 模型的 `xai` 提供者外掛程式。

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

OpenClaw 現在使用 xAI Responses API 作為內建的 xAI 傳輸。同一個
`XAI_API_KEY` 也可以驅動由 Grok 支援的 `web_search`、一流的 `x_search`，
以及遠端 `code_execution`。
如果您將 xAI 金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下，
內建的 xAI 模型供應器現在也會將該金鑰作為備選重新使用。
`code_execution` 微調位於 `plugins.entries.xai.config.codeExecution` 下。

## 目前內建的型號目錄

OpenClaw 現在內建了這些 xAI 模型系列：

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

當較新的 `grok-4*` 和 `grok-code-fast*` ID 採用相同的 API 形狀時，該外掛程式也會對其進行前向解析。

## 網頁搜尋

內建的 `grok` 網路搜尋供應商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前僅支援 API 金鑰驗證。OpenClaw 中尚無 xAI OAuth / 裝置代碼流程。
- `grok-4.20-multi-agent-experimental-beta-0304` 在標準 xAI 供應商路徑上不受支援，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。

## 備註

- OpenClaw 會在共享執行器路徑上自動套用 xAI 特定的工具架構和工具呼叫相容性修復。
- `web_search`、`x_search` 和 `code_execution` 被公開為 OpenClaw 工具。OpenClaw 會在每個工具請求中啟用其所需的特定 xAI 內建功能，而不是將所有原生工具附加到每個對話輪次。
- `x_search` 和 `code_execution` 是由內建的 xAI 外掛程式擁有的，而不是硬編碼到核心模型執行階段中。
- `code_execution` 是遠端 xAI 沙箱執行，而非本機 [`exec`](/en/tools/exec)。
- 若要查看更廣泛的供應商概覽，請參閱 [Model providers](/en/providers/index)。

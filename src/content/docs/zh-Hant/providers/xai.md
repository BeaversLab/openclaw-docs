---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 附帶了一個針對 Grok 模型的內建 `xai` 提供者外掛程式。

## 設定

1. 在 xAI 主控台中建立 API 金鑰。
2. 設定 `XAI_API_KEY`，或執行：

```exec
openclaw onboard --auth-choice xai-api-key
```

3. 選擇一個模型，例如：

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

## 目前內建的模型目錄

OpenClaw 現已內建以下 xAI 模型系列：

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-experimental-beta-0304-reasoning`
- `grok-4.20-experimental-beta-0304-non-reasoning`
- `grok-code-fast-1`

當 `grok-4*` 和 `grok-code-fast*` id 遵循相同的 API 形狀時，該外掛程式也會向前解析這些較新的 ID：

## 網頁搜尋

內建的 `grok` 網頁搜尋提供者也使用 `XAI_API_KEY`：

```exec
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前僅支援 API 金鑰驗證。OpenClaw 中尚無 xAI OAuth / 裝置代碼流程。
- `grok-4.20-multi-agent-experimental-beta-0304` 在標準 xAI 提供者路徑上不受支援，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。
- 原生的 xAI 伺服器端工具（如 `x_search` 和 `code_execution`）在該內建外掛程式中尚非一等模型提供者功能。

## 備註

- OpenClaw 會在共用的執行器路徑上自動套用 xAI 專用的工具架構和工具呼叫相容性修復。
- 如需更廣泛的供應商概覽，請參閱 [Model providers](/zh-Hant/providers/index)。

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

## 目前內建的模型目錄

OpenClaw 現在內建了這些 xAI 模型系列：

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

當較新的 `grok-4*` 和 `grok-code-fast*` ID 採用相同的 API 形式時，此外掛程式也會向前解析它們。

## 網頁搜尋

內建的 `grok` 網頁搜尋提供者也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前僅支援 API 金鑰驗證。OpenClaw 尚未支援 xAI OAuth / 裝置代碼流程。
- `grok-4.20-multi-agent-experimental-beta-0304` 在一般的 xAI 提供者路徑上不受支援，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。
- 原生 xAI 伺服器端工具（如 `x_search` 和 `code_execution`）在此內建外掛程式中尚未成為一等模型提供者功能。

## 備註

- OpenClaw 會在共享執行器路徑上自動套用 xAI 特定的工具架構和工具呼叫相容性修復。
- 若要查看更廣泛的提供者概覽，請參閱[模型提供者](/en/providers/index)。

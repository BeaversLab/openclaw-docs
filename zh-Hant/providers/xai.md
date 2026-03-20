---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 您想在 OpenClaw 中使用 Grok 模型
  - 您正在設定 xAI 驗證或模型 ID
title: "xAI"
---

# xAI

OpenClaw 內建了針對 Grok 模型的 `xai` 供應商插件。

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

OpenClaw 現已內建這些 xAI 模型系列：

- `grok-4`，`grok-4-0709`
- `grok-4-fast-reasoning`，`grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`，`grok-4-1-fast-non-reasoning`
- `grok-4.20-experimental-beta-0304-reasoning`
- `grok-4.20-experimental-beta-0304-non-reasoning`
- `grok-code-fast-1`

當較新的 `grok-4*` 和 `grok-code-fast*` ID 採用相同的
API 形式時，該插件也會自動解析它們。

## 網路搜尋

內建的 `grok` 網路搜尋供應商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前僅支援 API 金鑰驗證。OpenClaw 尚未提供 xAI OAuth / 裝置代碼流程。
- `grok-4.20-multi-agent-experimental-beta-0304` 不支援一般的 xAI 供應商路徑，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。
- 原生的 xAI 伺服器端工具（如 `x_search` 和 `code_execution`）尚未在內建插件中成為一等公民的模型供應商功能。

## 備註

- OpenClaw 會在共用執行器路徑上自動套用 xAI 專屬的工具架構和工具呼叫相容性修復。
- 如需更廣泛的供應商概覽，請參閱 [模型供應商](/zh-Hant/providers/index)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

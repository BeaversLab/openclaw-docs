---
summary: "設定精靈與設定架構的 RPC 通訊協定說明"
read_when: "變更設定精靈步驟或設定架構端點"
title: "Onboarding and Config Protocol"
---

# Onboarding + Config Protocol

用途：跨 CLI、macOS 應用程式與 Web UI 共用的 onboarding + config 介面。

## 元件

- 精靈引擎（共用 session + prompts + onboarding 狀態）。
- CLI onboarding 使用與 UI 用戶端相同的精靈流程。
- Gateway RPC 公開精靈 + 設定架構端點。
- macOS onboarding 使用精靈步驟模型。
- Web UI 根據 JSON Schema + UI 提示來轉譯設定表單。

## Gateway RPC

- `wizard.start` params: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` params: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` params: `{ sessionId }`
- `wizard.status` params: `{ sessionId }`
- `config.schema` params: `{}`
- `config.schema.lookup` params: `{ path }`
  - `path` 接受標準設定片段以及以斜線分隔的外掛 id，例如 `plugins.entries.pack/one.config`。

回應 (結構)

- 精靈：`{ sessionId, done, step?, status?, error? }`
- 設定架構：`{ schema, uiHints, version, generatedAt }`
- 設定架構查詢：`{ path, schema, hint?, hintPath?, children[] }`

## UI 提示

- `uiHints` 以路徑為鍵值；可選的中繼資料 (label/help/group/order/advanced/sensitive/placeholder)。
- 敏感欄位會轉譯為密碼輸入；沒有遮蔽層。
- 不支援的架構節點會回退到原始 JSON 編輯器。

## 註記

- 本文件是追蹤 onboarding/config 通訊協定重構的唯一位置。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

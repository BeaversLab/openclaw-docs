---
summary: "設定精靈和設定架構的 RPC 通訊協定說明"
read_when: "變更設定精靈步驟或設定架構端點"
title: "Onboarding and Config Protocol"
---

# Onboarding + Config Protocol

目的：跨 CLI、macOS app 和 Web UI 的共用 onboarding + config 介面。

## 組件

- 精靈引擎（共用的 session + prompts + onboarding state）。
- CLI onboarding 使用與 UI 用戶端相同的精靈流程。
- Gateway RPC 提供精靈與設定架構端點。
- macOS onboarding 使用精靈步驟模型。
- Web UI 從 JSON Schema + UI 提示 渲染設定表單。

## Gateway RPC

- `wizard.start` params: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` params: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` 參數：`{ sessionId }`
- `wizard.status` 參數：`{ sessionId }`
- `config.schema` 參數：`{}`
- `config.schema.lookup` 參數：`{ path }`
  - `path` 接受標準設定區段加上以斜線分隔的外掛 id，例如 `plugins.entries.pack/one.config`。

回應（形狀）

- 精靈：`{ sessionId, done, step?, status?, error? }`
- 設定結構描述：`{ schema, uiHints, version, generatedAt }`
- 設定結構描述查詢：`{ path, schema, hint?, hintPath?, children[] }`

## UI 提示

- `uiHints` 依路徑索引；可選中繼資料（label/help/group/order/advanced/sensitive/placeholder）。
- 敏感欄位會以密碼輸入框呈現；無遮蔽層。
- 不支援的結構描述節點會還原為原始 JSON 編輯器。

## 註記

- 此文件是追蹤入職/配置協議重構的唯一位置。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

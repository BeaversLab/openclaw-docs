---
summary: "設定精靈與設定架構的 RPC 協定說明"
read_when: "變更設定精靈步驟或設定架構端點"
title: "Onboarding and Config Protocol"
---

# Onboarding + Config Protocol

目的：跨 CLI、macOS app 和 Web UI 的共享 onboarding + config 介面。

## 組件

- 精靈引擎（共享 session + prompts + onboarding 狀態）。
- CLI onboarding 使用與 UI 用戶端相同的精靈流程。
- Gateway RPC 公開精靈 + 設定架構端點。
- macOS onboarding 使用精靈步驟模型。
- Web UI 根據 JSON Schema + UI 提示渲染設定表單。

## Gateway RPC

- `wizard.start` params: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` params: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` params: `{ sessionId }`
- `wizard.status` params: `{ sessionId }`
- `config.schema` params: `{}`
- `config.schema.lookup` params: `{ path }`
  - `path` 接受標準設定片段以及以斜線分隔的外掛 id，例如 `plugins.entries.pack/one.config`。

回應（形狀）

- 精靈：`{ sessionId, done, step?, status?, error? }`
- 設定架構：`{ schema, uiHints, version, generatedAt }`
- 設定架構查找：`{ path, schema, hint?, hintPath?, children[] }`

## UI 提示

- `uiHints` 以路徑為鍵；可選元資料（label/help/group/order/advanced/sensitive/placeholder）。
- 敏感欄位呈現為密碼輸入框；無遮蔽層。
- 不支援的架構節點會回退到原始 JSON 編輯器。

## 備註

- 此文件是追蹤 onboarding/config 協定重構的唯一位置。

import en from "/components/footer/en.mdx";

<en />

---
summary: "RPC 協議筆記，用於設定精靈與設定架構"
read_when: "變更設定精靈步驟或設定架構端點"
title: "入門與設定協定"
---

# 入門 + 設定協定

目的：跨 CLI、macOS 應用程式和 Web UI 共用的入門 + 設定介面。

## 元件

- 精靈引擎（共用的 session + prompts + onboarding 狀態）。
- CLI 入門使用與 UI 用戶端相同的精靈流程。
- Gateway RPC 公開精靈 + 設定架構端點。
- macOS 入門使用精靈步驟模型。
- Web UI 根據 JSON Schema + UI 提示渲染設定表單。

## Gateway RPC

- `wizard.start` 參數： `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` 參數： `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` 參數： `{ sessionId }`
- `wizard.status` 參數： `{ sessionId }`
- `config.schema` 參數： `{}`
- `config.schema.lookup` 參數： `{ path }`
  - `path` 接受標準設定區段加上以斜線分隔的插件 ID，例如 `plugins.entries.pack/one.config`。

回應 (形狀)

- 精靈： `{ sessionId, done, step?, status?, error? }`
- 設定架構： `{ schema, uiHints, version, generatedAt }`
- 設定架構查詢： `{ path, schema, hint?, hintPath?, children[] }`

## UI 提示

- `uiHints` 以路徑為鍵值；選用性元資料 (label/help/group/order/advanced/sensitive/placeholder)。
- 敏感欄位會以密碼輸入框呈現；無遮蔽層。
- 不支援的架構節點會回退到原始 JSON 編輯器。

## 備註

- 本文件是追蹤入門/設定協定重構的唯一依據。

---
summary: "工作流的僅限 JSON LLM 任務（可選外掛工具）"
read_when:
  - 您想要在工作流程內部加入一個僅輸出 JSON 的 LLM 步驟
  - 您需要經過 schema 驗證的 LLM 輸出以進行自動化
title: "LLM Task"
---

# LLM Task

`llm-task` 是一個 **可選的外掛工具**，用於執行僅輸出 JSON 的 LLM 任務並
傳回結構化輸出（可選擇是否根據 JSON Schema 進行驗證）。

這對於像 Lobster 這樣的工作流程引擎來說非常理想：您可以新增單一 LLM 步驟，而無需為每個工作流程撰寫自訂的 OpenClaw 程式碼。

## 啟用外掛

1. 啟用外掛：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. 將該工具加入允許清單（註冊名稱為 `optional: true`）：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## 設定（可選）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字串的允許清單。如果設定此項，任何超出清單的請求都會被拒絕。

## 工具參數

- `prompt` (string, 必填)
- `input` (any, 可選)
- `schema` (object, 可選的 JSON Schema)
- `provider` (string, 可選)
- `model` (string, 可選)
- `thinking` (string, 可選)
- `authProfileId` (string, 可選)
- `temperature` (number, 可選)
- `maxTokens` (number, 可選)
- `timeoutMs` (number, 可選)

`thinking` 接受標準的 OpenClaw 推理預設值，例如 `low` 或 `medium`。

## 輸出

傳回 `details.json`，其中包含解析後的 JSON（並在提供時根據
`schema` 進行驗證）。

## 範例：Lobster 工作流程步驟

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## 安全注意事項

- 該工具為 **僅限 JSON**，並指示模型僅輸出 JSON（無程式碼圍欄，無評註）。
- 在此執行過程中，不會向模型公開任何工具。
- 除非您使用 `schema` 進行驗證，否則請將輸出視為不受信任。
- 在任何會產生副作用的步驟（send、post、exec）之前加入審核批准。

import en from "/components/footer/en.mdx";

<en />

---
summary: "適用於工作流程的僅限 JSON 的 LLM 任務（可選外掛程式工具）"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLM Task"
---

# LLM Task

`llm-task` 是一個 **可選的外掛程式工具**，它執行僅限 JSON 的 LLM 任務並
傳回結構化輸出（可選地根據 JSON Schema 進行驗證）。

這對於像 Lobster 這樣的工作流程引擎來說非常理想：您可以加入單一 LLM 步驟，而無需為每個工作流程編寫自訂的 OpenClaw 程式碼。

## 啟用外掛程式

1. 啟用外掛程式：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. 將工具加入允許清單（它註冊於 `optional: true`）：

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

`allowedModels` 是 `provider/model` 字串的允許清單。如果設定，清單外的任何請求都會被拒絕。

## 工具參數

- `prompt`（字串，必填）
- `input`（任何，可選）
- `schema`（物件，可選的 JSON Schema）
- `provider`（字串，可選）
- `model`（字串，可選）
- `thinking`（字串，可選）
- `authProfileId`（字串，可選）
- `temperature`（數字，可選）
- `maxTokens`（數字，可選）
- `timeoutMs`（數字，可選）

`thinking` 接受標準的 OpenClaw 推理預設值，例如 `low` 或 `medium`。

## 輸出

傳回 `details.json`，其中包含已解析的 JSON（當提供時會根據
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

- 此工具是 **僅限 JSON** 的，並指示模型僅輸出 JSON（沒有
  程式碼柵欄，沒有評論）。
- 在此次執行中，沒有任何工具暴露給模型。
- 除非您使用 `schema` 進行驗證，否則請將輸出視為不受信任。
- 將審核程序置於任何會產生副作用的步驟（send、post、exec）之前。

---
summary: "工作流程的純 JSON LLM 任務（選用插件工具）"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLM 任務"
---

# LLM 任務

`llm-task` 是一個 **選用插件工具**，用於執行純 JSON LLM 任務並傳回結構化輸出（可選擇根據 JSON Schema 進行驗證）。

這非常適合像 Lobster 這樣的工作流程引擎：您可以新增單一 LLM 步驟，而無需為每個工作流程撰寫自訂的 OpenClaw 程式碼。

## 啟用插件

1. 啟用插件：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. 將工具加入允許清單（已註冊為 `optional: true`）：

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

## 設定（選用）

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

- `prompt` (字串，必填)
- `input` (任意，選用)
- `schema` (物件，選用的 JSON Schema)
- `provider` (字串，選用)
- `model` (字串，選用)
- `thinking` (字串，選用)
- `authProfileId` (字串，選用)
- `temperature` (數字，選用)
- `maxTokens` (數字，選用)
- `timeoutMs` (數字，選用)

`thinking` 接受標準的 OpenClaw 推理預設值，例如 `low` 或 `medium`。

## 輸出

傳回 `details.json`，其中包含已解析的 JSON（若提供則根據 `schema` 進行驗證）。

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

- 此工具為 **僅限 JSON**，並會指示模型僅輸出 JSON（無程式碼區塊，無註解）。
- 在此執行過程中，不會向模型公開任何工具。
- 除非您使用 `schema` 進行驗證，否則請將輸出視為未受信任。
- 將審核步驟置於任何會產生副作用（send、post、exec）的步驟之前。

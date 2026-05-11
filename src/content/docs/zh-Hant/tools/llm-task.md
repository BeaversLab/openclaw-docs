---
summary: "適用於工作流程的僅限 JSON 的 LLM 任務（可選外掛程式工具）"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLM 任務"
---

`llm-task` 是一個**選用的外掛工具**，用於執行僅輸出 JSON 的 LLM 任務並
傳回結構化輸出（可選擇根據 JSON Schema 進行驗證）。

這非常適合像 Lobster 這樣的工作流程引擎：您可以新增單一 LLM 步驟，
而無需為每個工作流程撰寫自訂的 OpenClaw 程式碼。

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

2. 將工具加入允許清單（它註冊為 `optional: true`）：

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
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字串的允許清單。如果設定，清單之外的任何請求
將被拒絕。

## 工具參數

- `prompt`（字串，必填）
- `input`（任意，選用）
- `schema`（物件，選用 JSON Schema）
- `provider`（字串，選用）
- `model`（字串，選用）
- `thinking`（字串，選用）
- `authProfileId`（字串，選用）
- `temperature`（數字，選用）
- `maxTokens`（數字，選用）
- `timeoutMs`（數字，選用）

`thinking` 接受標準的 OpenClaw 推理預設，例如 `low` 或 `medium`。

## 輸出

傳回包含已解析 JSON 的 `details.json`（並在提供時根據
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

- 此工具為**僅限 JSON**，並指示模型僅輸出 JSON（無
  程式碼圍欄，無評論）。
- 此執行期間沒有工具暴露給模型。
- 除非您使用 `schema` 進行驗證，否則請將輸出視為不受信任。
- 將審核步驟放在任何有副作用的步驟（傳送、張貼、執行）之前。

## 相關

- [思考層級](/zh-Hant/tools/thinking)
- [子代理](/zh-Hant/tools/subagents)
- [斜線指令](/zh-Hant/tools/slash-commands)

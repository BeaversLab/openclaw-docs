---
summary: "工作流程的僅 JSON LLM 任務（可選外掛工具）"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLM 任務"
---

`llm-task` 是一個 **可選的外掛工具**，用於執行僅輸出 JSON 的 LLM 任務並
傳回結構化輸出（可選擇透過 JSON Schema 進行驗證）。

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

2. 允許可選工具：

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

僅當您想要限制性允許清單模式時，才使用 `tools.allow`。

## 設定（可選）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.5"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字串的允許清單。如果設定，任何
超出清單的請求都會被拒絕。

## 工具參數

- `prompt`（字串，必填）
- `input`（任何類型，選填）
- `schema`（物件，選填的 JSON Schema）
- `provider`（字串，選填）
- `model`（字串，選填）
- `thinking`（字串，選填）
- `authProfileId`（字串，選填）
- `temperature`（數字，選填）
- `maxTokens`（數字，選填）
- `timeoutMs`（數字，選填）

`thinking` 接受標準的 OpenClaw 推理預設，例如 `low` 或 `medium`。

## 輸出

傳回 `details.json`，其中包含解析後的 JSON（並在提供時根據
`schema` 進行驗證）。

## 範例：Lobster 工作流程步驟

### 重要限制

以下範例假設 **獨立 Lobster CLI** 正在 `openclaw.invoke` 已具有正確閘道 URL/驗證內容的環境中執行。

對於 OpenClaw 內捆綁的 **嵌入式** Lobster 執行器，此巢狀 CLI 模式目前 **不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

在嵌入式 Lobster 擁有支援此流程的橋接器之前，請選擇以下任一方式：

- Lobster 外部的直接 `llm-task` 工具呼叫，或
- 不依賴巢狀 `openclaw.invoke` 呼叫的 Lobster 步驟。

獨立 Lobster CLI 範例：

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

- 此工具為 **僅 JSON**，並指示模型僅輸出 JSON（無
  程式碼圍欄，無評論）。
- 在此執行中，沒有工具暴露給模型。
- 除非您使用 `schema` 進行驗證，否則請將輸出視為不受信任。
- 請將審核步驟放在任何會產生副作用（傳送、發布、執行）的步驟之前。

## 相關

- [思考層級](/zh-Hant/tools/thinking)
- [子代理](/zh-Hant/tools/subagents)
- [斜線指令](/zh-Hant/tools/slash-commands)

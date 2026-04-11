---
title: "Arcee AI"
summary: "Arcee AI 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) 透過與 OpenAI 相容的 API 提供了 Trinity 系列混合專家模型的存取權。所有 Trinity 模型均採用 Apache 2.0 授權。

可以直接透過 Arcee 平台或透過 [OpenRouter](/en/providers/openrouter) 存取 Arcee AI 模型。

- 供應商：`arcee`
- 驗證：`ARCEEAI_API_KEY` (直接) 或 `OPENROUTER_API_KEY` (透過 OpenRouter)
- API：與 OpenAI 相容
- 基底 URL：`https://api.arcee.ai/api/v1` (直接) 或 `https://openrouter.ai/api/v1` (OpenRouter)

## 快速開始

1. 從 [Arcee AI](https://chat.arcee.ai/) 或 [OpenRouter](https://openrouter.ai/keys) 取得 API 金鑰。

2. 設定 API 金鑰（建議：為 Gateway 儲存）：

```bash
# Direct (Arcee platform)
openclaw onboard --auth-choice arceeai-api-key

# Via OpenRouter
openclaw onboard --auth-choice arceeai-openrouter
```

3. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "arcee/trinity-large-thinking" },
    },
  },
}
```

## 非互動式範例

```bash
# Direct (Arcee platform)
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-api-key \
  --arceeai-api-key "$ARCEEAI_API_KEY"

# Via OpenRouter
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-openrouter \
  --openrouter-api-key "$OPENROUTER_API_KEY"
```

## 環境注意事項

如果 Gateway 作為守護程序 (launchd/systemd) 執行，請確保 `ARCEEAI_API_KEY`
(或 `OPENROUTER_API_KEY`) 可供該程序使用 (例如，在
`~/.openclaw/.env` 中或透過 `env.shellEnv`)。

## 內建目錄

OpenClaw 目前附帶此捆綁的 Arcee 目錄：

| 模型參照                       | 名稱                   | 輸入 | 上下文 | 成本 (輸入/輸出每 1M) | 備註                       |
| ------------------------------ | ---------------------- | ---- | ------ | --------------------- | -------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | 文字 | 256K   | $0.25 / $0.90         | 預設模型；已啟用推理       |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | 文字 | 128K   | $0.25 / $1.00         | 通用；400B 參數，13B 啟用  |
| `arcee/trinity-mini`           | Trinity Mini 26B       | 文字 | 128K   | $0.045 / $0.15        | 快速且具成本效益；函式呼叫 |

相同的模型參照適用於直接和 OpenRouter 設定 (例如 `arcee/trinity-large-thinking`)。

入門預設集將 `arcee/trinity-large-thinking` 設為預設模型。

## 支援的功能

- 串流
- 工具使用 / 函式呼叫
- 結構化輸出 (JSON 模式和 JSON schema)
- 擴充思考 (Trinity Large Thinking)

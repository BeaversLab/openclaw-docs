---
title: "Chutes"
summary: "Chutes 設定 (OAuth 或 API 金鑰、模型探索、別名)"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

# Chutes

[Chutes](https://chutes.ai) 透過 OpenAI 相容 API 開放原始碼模型目錄。OpenClaw 支援隨附的 `chutes` 提供者之瀏覽器 OAuth 與直接 API 金鑰驗證。

- 提供者：`chutes`
- API：OpenAI 相容
- Base URL：`https://llm.chutes.ai/v1`
- 驗證：
  - OAuth 透過 `openclaw onboard --auth-choice chutes`
  - API 金鑰透過 `openclaw onboard --auth-choice chutes-api-key`
  - 執行時期環境變數：`CHUTES_API_KEY`、`CHUTES_OAUTH_TOKEN`

## 快速開始

### OAuth

```bash
openclaw onboard --auth-choice chutes
```

OpenClaw 會在本機啟動瀏覽器流程，或在遠端/無介面主機上顯示 URL + 重新導向貼上流程。OAuth 權杖會透過 OpenClaw 驗證設定檔自動重新整理。

選用的 OAuth 覆寫值：

- `CHUTES_CLIENT_ID`
- `CHUTES_CLIENT_SECRET`
- `CHUTES_OAUTH_REDIRECT_URI`
- `CHUTES_OAUTH_SCOPES`

### API 金鑰

```bash
openclaw onboard --auth-choice chutes-api-key
```

請在
[chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys) 取得您的金鑰。

兩種驗證方式皆會註冊隨附的 Chutes 目錄，並將預設模型設為 `chutes/zai-org/GLM-4.7-TEE`。

## 探索行為

當 Chutes 驗證可用時，OpenClaw 會使用該憑證查詢 Chutes 目錄並使用探索到的模型。如果探索失敗，OpenClaw 會退回到隨附的靜態目錄，因此上架與啟動仍能正常運作。

## 預設別名

OpenClaw 也會為隨附的 Chutes 目錄註冊三個便利別名：

- `chutes-fast` -> `chutes/zai-org/GLM-4.7-FP8`
- `chutes-pro` -> `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes-vision` -> `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`

## 內建入門目錄

隨附的備用目錄包含目前的 Chutes 參照，例如：

- `chutes/zai-org/GLM-4.7-TEE`
- `chutes/zai-org/GLM-5-TEE`
- `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`
- `chutes/moonshotai/Kimi-K2.5-TEE`
- `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`
- `chutes/Qwen/Qwen3-Coder-Next-TEE`
- `chutes/openai/gpt-oss-120b-TEE`

## 設定範例

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

## 備註

- OAuth 協助和重新導向應用程式需求：[Chutes OAuth 文件](https://chutes.ai/docs/sign-in-with-chutes/overview)
- API 金鑰和 OAuth 探索都使用相同的 `chutes` 提供者 ID。
- Chutes 模型已註冊為 `chutes/<model-id>`。

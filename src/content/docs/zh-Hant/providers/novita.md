---
summary: "使用 NovitaAI 的 OpenAI 相容 API 與 OpenClaw"
read_when:
  - You want to run OpenClaw with NovitaAI models
  - You need the Novita provider id, key, or endpoint
title: "NovitaAI"
---

NovitaAI 是一個提供 OpenAI 相容模型 API 的託管 AI 基礎設施供應商。在 OpenClaw 中，它是內建的模型供應商，因此供應商 ID 為 `novita`，憑證透過正常的模型驗證流程處理，而模型參考則類似於 `novita/deepseek/deepseek-v3-0324`。

當您想要在不自行運行推理伺服器的情況下，透過託管方式存取開放權重和第三方模型路由時，請使用 Novita。內建的目錄側重於適用於 Agent 互動的聊天模型，包括 Novita 提供的 DeepSeek、Moonshot、MiniMax、GLM 和 Qwen 路由。

此供應商使用 Novita 的 OpenAI 相容端點。OpenClaw 處理供應商註冊、驗證、別名、模型參考正規化和基底 URL 選擇；Novita 則控制即時模型可用性、帳號權限、價格和速率限制。

## 設定

在 [novita.ai/settings/key-management](https://novita.ai/settings/key-management) 建立 API 金鑰，然後執行：

```bash
openclaw onboard --auth-choice novita-api-key
```

或設定：

```bash
export NOVITA_API_KEY="<your-novita-api-key>" # pragma: allowlist secret
```

## 預設值

- 供應商：`novita`
- 別名：`novita-ai`、`novitaai`
- 基底 URL：`https://api.novita.ai/openai/v1`
- 環境變數：`NOVITA_API_KEY`
- 預設模型：`novita/deepseek/deepseek-v3-0324`

## 何時選擇 Novita

- 您想要透過 OpenAI 相容 API 存取託管的開放權重模型。
- 您想要透過單一供應商帳戶使用 DeepSeek、Kimi、MiniMax、GLM 或 Qwen 系列的路由。
- 您想要除了 OpenRouter、GMI、DeepInfra 或直接廠商 API 之外的另一個託管備援路徑。
- 您比起維護 vLLM、SGLang、LM Studio 或 Ollama 基礎設施，更偏好供應商端的模型託管。

當您需要廠商原生的請求參數或支援合約時，請選擇直接廠商供應商。當模型必須在您自己的硬體上或位於您自己的網路邊界內運行時，請選擇本機供應商。

## 模型

內建的目錄包含了常見的 NovitaAI 路由 ID，包括：

- `novita/moonshotai/kimi-k2.5`
- `novita/minimax/minimax-m2.7`
- `novita/zai-org/glm-5`
- `novita/deepseek/deepseek-v3-0324`
- `novita/deepseek/deepseek-r1-0528`
- `novita/qwen/qwen3-235b-a22b-fp8`

該目錄是 OpenClaw 模型選擇的起點。您的帳戶、地區或 Novita 的當前目錄可能會新增、移除或限制路由。在設定長期預設值之前，請先從 CLI 檢查提供者：

```bash
openclaw models list --provider novita
```

## 疑難排解

- `401` 或 `403`：在 Novita 的金鑰管理頁面中驗證金鑰，如果儲存的設定檔已過時，請重新執行
  `openclaw onboard --auth-choice novita-api-key`。
- 未知的模型錯誤：使用
  `openclaw models list --provider novita` 回傳的確切 `novita/<route-id>`。
- 路由緩慢或失敗：請嘗試另一個 Novita 模型路由，或將 Novita 設定為可容忍提供者特定差異的工作負載的備用提供者。

## 相關

- [模型提供者](/zh-Hant/concepts/model-providers)
- [所有提供者](/zh-Hant/providers/index)

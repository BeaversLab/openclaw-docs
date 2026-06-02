---
summary: "直接使用 Ollama Cloud 與 OpenClaw"
read_when:
  - You want to use hosted Ollama models without a local Ollama server
  - You need the ollama-cloud provider id, key, or endpoint
title: "Ollama Cloud"
---

Ollama Cloud 是 Ollama 的託管模型 API。它讓 OpenClaw 可以直接呼叫 Ollama 託管
的模型，而無需安裝本機 Ollama 伺服器或將本機
Ollama 應用程式登入至雲端模式。使用供應商 ID `ollama-cloud` 以及類似
`ollama-cloud/kimi-k2.6` 的模型參照。

此頁面適用於直接的僅雲端路由。此供應商使用 Ollama 的原生
`/api/chat` 風格，而非 OpenAI 相容的 `/v1` 路由。OpenClaw 將其
註冊為個別的供應商 ID，因此僅雲端憑證、即時型錄探索和
模型選擇不會與本機 `ollama` 主機混淆。

當您需要僅雲端路由時，請使用此頁面。若需本機 Ollama、混合
雲端加本機路由、嵌入及自訂主機詳細資訊，請參閱
[Ollama](/zh-Hant/providers/ollama)。

## 設定

在 [ollama.com/settings/keys](https://ollama.com/settings/keys) 建立 Ollama Cloud API 金鑰，然後執行：

```bash
openclaw onboard --auth-choice ollama-cloud
```

或設定：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret
```

## 預設值

- 供應商：`ollama-cloud`
- Base URL：`https://ollama.com`
- 環境變數：`OLLAMA_API_KEY`
- API 風格：Ollama 原生 `/api/chat`
- 範例模型：`ollama-cloud/kimi-k2.6`

## 何時選擇 Ollama Cloud

- 您想要託管的 Ollama 模型，而不在本機執行 `ollama serve`。
- 您想要與 OpenClaw 用於本機 Ollama 相同的原生 Ollama 聊天 API 形狀，但指向
  `https://ollama.com`。
- 您想要為 Ollama 託管型錄中已有的模型提供一條簡單的雲端途徑。
- 您不需要本機模型下載、本機 GPU 控制或僅限區域網路的推論。

當您想要透過已登入的 Ollama 主機進行僅本機或雲端加本機路由時，請改用
[Ollama](/zh-Hant/providers/ollama)。當您需要
`/v1/chat/completions` 語意或供應商特定的 OpenAI 風格功能時，請改用 OpenAI
相容的供應商。

## 模型

OpenClaw 會從即時託管型錄中探索 Ollama Cloud 模型。常見可用的託管 ID 包含：

- `ollama-cloud/gpt-oss:20b`
- `ollama-cloud/kimi-k2.6`
- `ollama-cloud/deepseek-v4-flash`
- `ollama-cloud/minimax-m2.7`
- `ollama-cloud/glm-5`

使用您目前託管目錄中的模型 ID：

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

模型 ID 是雲端目錄 ID，而非本機拉取名稱。如果模型名稱在本機 Ollama 主機上有效但不在託管目錄中，請改用該本機主機的 `ollama` 提供者。

## 即時測試

若要執行 Ollama Cloud API 金鑰的冒煙測試，請將 Ollama 即時測試指向託管端點，並從您的目前目錄中選擇一個模型：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

雲端冒煙測試會執行文字、原生串流和網路搜尋。它會預設跳過 `https://ollama.com` 的嵌入，因為 Ollama Cloud API 金鑰可能未授權 `/api/embed`。

## 疑難排解

- `Set OLLAMA_API_KEY` 錯誤：請提供真實的雲端 API 金鑰。本機 `ollama-local` 標記僅供本機或私人 Ollama 主機使用。
- 未知模型錯誤：執行 `openclaw models list --provider ollama-cloud` 並精確複製託管模型 ID。
- 自訂 Ollama 主機上的工具呼叫或原始 JSON 問題：請檢查您是否意外使用了相容 OpenAI 的 `/v1` URL。Ollama 路由應使用不帶 `/v1` 後綴的原生基底 URL。

## 相關

- [Ollama](/zh-Hant/providers/ollama)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [所有提供者](/zh-Hant/providers/index)

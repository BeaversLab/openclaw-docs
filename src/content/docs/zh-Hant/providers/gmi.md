---
summary: "使用 GMI Cloud 的 OpenAI 相容 API 與 OpenClaw"
read_when:
  - You want to run OpenClaw with GMI Cloud models
  - You need the GMI provider id, key, or endpoint
title: "GMI Cloud"
---

GMI Cloud 是一個託管推理平台，透過 OpenAI 相容 API 提供前線和開放權重模型。在 OpenClaw 中，它是一個內建的模型提供者，這意味著您可以透過提供者 ID `gmi` 來選擇它，透過正常的模型驗證儲存憑證，並使用像 `gmi/google/gemini-3.1-flash-lite` 這樣的模型引用。

當您想要使用一個 API 金鑰來存取多個託管模型系列時，請使用 GMI，這包括 GMI 目錄公開的 Google、Anthropic、OpenAI、DeepSeek、Moonshot 和 Z.AI 路由。它作為模型故障切換的次要提供者、比較不同供應商的託管路由，或當 GMI 比您的主要提供者更早提供某個模型時，非常有用。

此提供者使用 OpenAI 相容的聊天語意。OpenClaw 擁有提供者 ID、驗證設定檔、別名、模型目錄種子和基本 URL；GMI 則擁有實時模型可用性、計費、速率限制以及任何提供者端的路由策略。

## 設定

在 GMI Cloud 中建立一個 API 金鑰，然後執行：

```bash
openclaw onboard --auth-choice gmi-api-key
```

或設定：

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## 預設值

- 提供者：`gmi`
- 別名：`gmi-cloud`、`gmicloud`
- 基本 URL：`https://api.gmi-serving.com/v1`
- 環境變數：`GMI_API_KEY`
- 預設模型：`gmi/google/gemini-3.1-flash-lite`

## 何時選擇 GMI

- 您想要使用託管的 OpenAI 相容端點，而不是本地模型伺服器。
- 您想要透過一個提供者帳戶嘗試多個商業和開放權重模型系列。
- 您想要一個具有與 OpenRouter、DeepInfra、Together 或直接供應商 API 不同上游路由的備用提供者。
- 您需要 GMI 特定的模型 ID、價格或帳戶控制項。

當您需要 GMI 未透過其 OpenAI 相容路由公開的供應商原生功能時，請改為選擇直接供應商提供者。當資料本地化或本地 GPU 控制比託管便利性更重要時，請選擇本地提供者，例如 Ollama、LM Studio、vLLM 或 SGLang。

## 模型

內建的目錄包含了常用的 GMI Cloud 路由 ID，包括：

- `gmi/zai-org/GLM-5.1-FP8`
- `gmi/deepseek-ai/DeepSeek-V3.2`
- `gmi/moonshotai/Kimi-K2.5`
- `gmi/google/gemini-3.1-flash-lite`
- `gmi/anthropic/claude-sonnet-4.6`
- `gmi/openai/gpt-5.4`

該目錄僅作為種子，並不保證每個帳戶隨時都能呼叫每個模型。請使用 OpenClaw 的模型列出指令，查看已配置的提供者回報在您的環境中的內容：

```bash
openclaw models list --provider gmi
```

## 疑難排解

- `401` 或 `403`：請檢查執行 OpenClaw 的程序是否設定了 `GMI_API_KEY`，或重新執行入門導覽以將金鑰儲存在提供者驗證設定檔中。
- 未知模型錯誤：請確認您的 GMI 帳戶中是否存在該模型，並使用 `openclaw models list --provider gmi` 顯示的完整 `gmi/<route-id>` 參照。
- 間歇性提供者錯誤：請嘗試不同的 GMI 路由，或將 GMI 配置為備用，而非唯一的模型提供者。

## 相關

- [模型提供者](/zh-Hant/concepts/model-providers)
- [所有提供者](/zh-Hant/providers/index)

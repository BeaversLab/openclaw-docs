---
summary: "在 OpenClaw 中使用 Venice AI 注重隱私的模型"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

# Venice AI (Venice highlight)

**Venice** 是我們重點推薦的 Venice 設定，用於優先隱私的推理，並可選擇匿名存取專有模型。

Venice AI 提供注重隱私的 AI 推理，支援非審查模型，並透過其匿名代理存取主要專有模型。所有推理預設皆為私密——不會使用您的資料進行訓練，不會保留紀錄。

## 為什麼在 OpenClaw 中選擇 Venice

- 開源模型的 **私人推理**（無紀錄）。
- 當您需要時提供 **非審查模型**。
- 當品質重要時，**匿名存取** 專有模型 (Opus/GPT/Gemini)。
- OpenAI 相容的 `/v1` 端點。

## 隱私模式

Venice 提供兩種隱私等級 —— 了解這一點是選擇模型的關鍵：

| 模式     | 描述                                                                                           | 模型                                                         |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **私人** | 完全私密。提示詞/回應 **絕不會被儲存或記錄**。即時性的。                                       | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等。 |
| **匿名** | 透過 Venice 代理並移除中繼資料。底層供應商 (OpenAI、Anthropic、Google、xAI) 只會看到匿名請求。 | Claude、GPT、Gemini、Grok                                    |

## 功能

- **注重隱私**：在「私人」（完全私密）和「匿名」（代理）模式之間選擇
- **非審查模型**：存取無內容限制的模型
- **主要模型存取**：透過 Venice 的匿名代理使用 Claude、GPT、Gemini 和 Grok
- **OpenAI 相容 API**：標準 `/v1` 端點，方便整合
- **串流**：✅ 所有模型皆支援
- **函式呼叫**：✅ 部分模型支援（請檢查模型功能）
- **視覺**：✅ 具備視覺能力的模型支援
- **無嚴格速率限制**：對於極端使用情況可能會實施公平使用限流

## 設定

### 1. 取得 API 金鑰

1. 前往 [venice.ai](https://venice.ai) 註冊
2. 前往 **Settings → API Keys → Create new key**
3. 複製您的 API 金鑰（格式：`vapi_xxxxxxxxxxxx`）

### 2. 設定 OpenClaw

**選項 A：環境變數**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**選項 B：互動式設定（推薦）**

```bash
openclaw onboard --auth-choice venice-api-key
```

這將會：

1. 提示輸入您的 API 金鑰（或使用現有的 `VENICE_API_KEY`）
2. 顯示所有可用的 Venice 模型
3. 讓您選擇預設模型
4. 自動設定提供者

**選項 C：非互動式**

```bash
openclaw onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. 驗證設定

```bash
openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
```

## 模型選擇

設定完成後，OpenClaw 會顯示所有可用的 Venice 模型。根據您的需求進行選擇：

- **預設模型**：`venice/kimi-k2-5`，用於強大的私有推理及視覺功能。
- **高效能選項**：`venice/claude-opus-4-6`，用於最強的匿名 Venice 路徑。
- **隱私**：選擇「private（私有）」模型以進行完全私有的推理。
- **功能**：選擇「anonymized（匿名）」模型，透過 Venice 的代理存取 Claude、GPT、Gemini。

隨時變更您的預設模型：

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

列出所有可用模型：

```bash
openclaw models list | grep venice
```

## 透過 `openclaw configure` 進行設定

1. 執行 `openclaw configure`
2. 選取 **Model/auth（模型/授權）**
3. 選擇 **Venice AI**

## 我應該使用哪種模型？

| 使用情境             | 推薦模型                         | 原因                                 |
| -------------------- | -------------------------------- | ------------------------------------ |
| **一般聊天（預設）** | `kimi-k2-5`                      | 強大的私有推理及視覺功能             |
| **最佳整體品質**     | `claude-opus-4-6`                | 最強的匿名 Venice 選項               |
| **隱私 + 程式設計**  | `qwen3-coder-480b-a35b-instruct` | 具備大上下文的私有程式設計模型       |
| **私有視覺**         | `kimi-k2-5`                      | 無需離開私有模式即可支援視覺功能     |
| **快速 + 經濟**      | `qwen3-4b`                       | 輕量級推理模型                       |
| **複雜的私有任務**   | `deepseek-v3.2`                  | 強大的推理能力，但不支援 Venice 工具 |
| **無審查**           | `venice-uncensored`              | 無內容限制                           |

## 可用模型（共 41 個）

### 私有模型（26 個）- 完全私有，無日誌記錄

| 模型 ID                                | 名稱                                | 上下文 | 功能               |
| -------------------------------------- | ----------------------------------- | ------ | ------------------ |
| `kimi-k2-5`                            | Kimi K2.5                           | 256k   | 預設、推理、視覺   |
| `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k   | 推理               |
| `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k   | 一般               |
| `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k   | 一般               |
| `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B             | 128k   | 一般，已停用工具   |
| `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                 | 128k   | 推理               |
| `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                 | 128k   | 一般               |
| `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                    | 256k   | 編程               |
| `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo              | 256k   | 編程               |
| `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                     | 256k   | 推理，視覺         |
| `qwen3-next-80b`                       | Qwen3 Next 80B                      | 256k   | 通用               |
| `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Vision)              | 256k   | 視覺               |
| `qwen3-4b`                             | Venice Small (Qwen3 4B)             | 32k    | 快速，推理         |
| `deepseek-v3.2`                        | DeepSeek V3.2                       | 160k   | 推理，工具已停用   |
| `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k    | 非審查，工具已停用 |
| `mistral-31-24b`                       | Venice Medium (Mistral)             | 128k   | 視覺               |
| `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct         | 198k   | 視覺               |
| `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B                 | 128k   | 通用               |
| `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B          | 128k   | 通用               |
| `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic               | 128k   | 推理               |
| `zai-org-glm-4.6`                      | GLM 4.6                             | 198k   | 通用               |
| `zai-org-glm-4.7`                      | GLM 4.7                             | 198k   | 推理               |
| `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                       | 128k   | 推理               |
| `zai-org-glm-5`                        | GLM 5                               | 198k   | 推理               |
| `minimax-m21`                          | MiniMax M2.1                        | 198k   | 推理               |
| `minimax-m25`                          | MiniMax M2.5                        | 198k   | 推理               |

### 匿名模型 (15 個) - 透過 Venice Proxy

| 模型 ID                         | 名稱                            | 內容長度 | 功能             |
| ------------------------------- | ------------------------------- | -------- | ---------------- |
| `claude-opus-4-6`               | Claude Opus 4.6 (透過 Venice)   | 1M       | 推理，視覺       |
| `claude-opus-4-5`               | Claude Opus 4.5 (透過 Venice)   | 198k     | 推理，視覺       |
| `claude-sonnet-4-6`             | Claude Sonnet 4.6 (透過 Venice) | 1M       | 推理，視覺       |
| `claude-sonnet-4-5`             | Claude Sonnet 4.5 (透過 Venice) | 198k     | 推理，視覺       |
| `openai-gpt-54`                 | GPT-5.4 (透過 Venice)           | 1M       | 推理，視覺       |
| `openai-gpt-53-codex`           | GPT-5.3 Codex (透過 Venice)     | 400k     | 推理，視覺，編程 |
| `openai-gpt-52`                 | GPT-5.2 (透過 Venice)           | 256k     | 推理             |
| `openai-gpt-52-codex`           | GPT-5.2 Codex (透過 Venice)     | 256k     | 推理，視覺，編程 |
| `openai-gpt-4o-2024-11-20`      | GPT-4o (透過 Venice)            | 128k     | 視覺             |
| `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini (透過 Venice)       | 128k     | 視覺             |
| `gemini-3-1-pro-preview`        | Gemini 3.1 Pro (透過 Venice)    | 1M       | 推理，視覺       |
| `gemini-3-pro-preview`          | Gemini 3 Pro (透過 Venice)      | 198k     | 推理，視覺       |
| `gemini-3-flash-preview`        | Gemini 3 Flash (透過 Venice)    | 256k     | 推理，視覺       |
| `grok-41-fast`                  | Grok 4.1 Fast (透過 Venice)     | 1M       | 推理，視覺       |
| `grok-code-fast-1`              | Grok Code Fast 1 (透過 Venice)  | 256k     | 推理，程式碼撰寫 |

## 模型探索

當設定了 `VENICE_API_KEY` 時，OpenClaw 會自動從 Venice API 探索模型。如果 API 無法連線，它會退回到靜態目錄。

`/models` 端點是公開的（列出不需認證），但推論需要有效的 API 金鑰。

## 串流與工具支援

| 功能          | 支援                                                       |
| ------------- | ---------------------------------------------------------- |
| **串流**      | ✅ 所有模型                                                |
| **函數呼叫**  | ✅ 大多數模型（請檢查 API 中的 `supportsFunctionCalling`） |
| **視覺/影像** | ✅ 標有「視覺」功能的模型                                  |
| **JSON 模式** | ✅ 透過 `response_format` 支援                             |

## 價格

Venice 使用基於點數的系統。請查看 [venice.ai/pricing](https://venice.ai/pricing) 了解目前費率：

- **私有模型**：通常成本較低
- **匿名模型**：類似於直接 API 定價 + 少量 Venice 費用

## 比較：Venice 與直接 API

| 面向     | Venice (匿名)          | 直接 API     |
| -------- | ---------------------- | ------------ |
| **隱私** | 中繼資料已移除，匿名化 | 連結您的帳戶 |
| **延遲** | +10-50ms (代理)        | 直接         |
| **功能** | 支援大多數功能         | 完整功能     |
| **計費** | Venice 點數            | 供應商計費   |

## 使用範例

```bash
# Use the default private model
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# Use Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# Use uncensored model
openclaw agent --model venice/venice-uncensored --message "Draft options"

# Use vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Use coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
```

## 疑難排解

### 無法識別 API 金鑰

```bash
echo $VENICE_API_KEY
openclaw models list | grep venice
```

請確保金鑰以 `vapi_` 開頭。

### 模型無法使用

Venice 模型目錄會動態更新。執行 `openclaw models list` 以查看目前可用的模型。某些模型可能暫時離線。

### 連線問題

Venice API 位於 `https://api.venice.ai/api/v1`。請確保您的網路允許 HTTPS 連線。

## 設定檔範例

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2-5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 連結

- [Venice AI](https://venice.ai)
- [API 文件](https://docs.venice.ai)
- [價格](https://venice.ai/pricing)
- [狀態](https://status.venice.ai)

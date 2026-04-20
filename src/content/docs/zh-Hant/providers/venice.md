---
summary: "在 OpenClaw 中使用 Venice AI 的隱私保護模型"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

# Venice AI

Venice AI 提供專注於**隱私的 AI 推理**服務，支援未經審查的模型，並透過其匿名代理存取主要的專有模型。所有推理預設皆為私密的 — 不會利用您的資料進行訓練，不會記錄日誌。

## 為什麼在 OpenClaw 中使用 Venice

- 開源模型的**私密推理**（無日誌記錄）。
- 在需要時提供**未經審查的模型**。
- 當品質重要時，對專有模型 的**匿名存取**。
- 與 OpenAI 相容的 `/v1` 端點。

## 隱私模式

Venice 提供兩種隱私等級 — 了解這一點對選擇您的模型至關重要：

| 模式     | 描述                                                        | 模型                                                         |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| **私密** | 完全私密。提示詞/回應**永不儲存或記錄**。即時的。           | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等。 |
| **匿名** | 透過 Venice 代理並移除元資料。底層供應商 看到的是匿名請求。 | Claude、GPT、Gemini、Grok                                    |

<Warning>匿名模型並**不**是完全私密的。Venice 在轉發前會移除元資料，但底層供應商 仍然會處理請求。當需要完全隱私時，請選擇**私密** 模型。</Warning>

## 功能

- **專注於隱私**：可選擇 "私密"（完全私密）和 "匿名"（經由代理）模式
- **未經審查的模型**：可存取無內容限制的模型
- **主要模型存取**：透過 Venice 的匿名代理使用 Claude、GPT、Gemini 和 Grok
- **與 OpenAI 相容的 API**：標準的 `/v1` 端點，方便整合
- **串流傳輸**：所有模型皆支援
- **函數呼叫**：選定模型支援（請檢查模型功能）
- **視覺**：具備視覺功能的模型支援
- **無嚴格速率限制**：對於極端使用可能會執行公平使用限流

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    1. 前往 [venice.ai](https://venice.ai) 註冊
    2. 前往 **Settings > API Keys > Create new key**
    3. 複製您的 API 金鑰（格式：`vapi_xxxxxxxxxxxx`）
  </Step>
  <Step title="設定 OpenClaw">
    選擇您偏好的設定方式：

    <Tabs>
      <Tab title="互動式（建議）">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        這將會：
        1. 提示您輸入 API 金鑰（或使用現有的 `VENICE_API_KEY`）
        2. 顯示所有可用的 Venice 模型
        3. 讓您選擇預設模型
        4. 自動設定供應商
      </Tab>
      <Tab title="環境變數">
        ```bash
        export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
        ```
      </Tab>
      <Tab title="非互動式">
        ```bash
        openclaw onboard --non-interactive \
          --auth-choice venice-api-key \
          --venice-api-key "vapi_xxxxxxxxxxxx"
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="驗證設定">
    ```bash
    openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
    ```
  </Step>
</Steps>

## 模型選擇

設定完成後，OpenClaw 會顯示所有可用的 Venice 模型。請根據您的需求進行選擇：

- **預設模型**：`venice/kimi-k2-5`，具備強大的隱私推理能力及視覺功能。
- **高效能選項**：`venice/claude-opus-4-6`，提供最強大的匿名 Venice 路徑。
- **隱私**：選擇「private」模型以進行完全隱私的推理。
- **能力**：選擇「anonymized」模型，透過 Venice 的代理存取 Claude、GPT、Gemini。

您可以隨時變更預設模型：

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

列出所有可用的模型：

```bash
openclaw models list | grep venice
```

您也可以執行 `openclaw configure`，選擇 **Model/auth**，然後選擇 **Venice AI**。

<Tip>
使用下表為您的使用案例選擇合適的模型。

| 使用案例             | 推薦模型                         | 原因                                 |
| -------------------- | -------------------------------- | ------------------------------------ |
| **一般聊天（預設）** | `kimi-k2-5`                      | 強大的私人推理能力加上視覺功能       |
| **最佳整體品質**     | `claude-opus-4-6`                | 最強大的 Venice 匿名選項             |
| **隱私 + 編寫程式**  | `qwen3-coder-480b-a35b-instruct` | 具有大型上下文的私人編寫程式模型     |
| **私人視覺**         | `kimi-k2-5`                      | 在不離開私人模式的情況下支援視覺功能 |
| **快速 + 經濟**      | `qwen3-4b`                       | 輕量級推理模型                       |
| **複雜的私人任務**   | `deepseek-v3.2`                  | 強大的推理能力，但不支援 Venice 工具 |
| **無審查**           | `venice-uncensored`              | 無內容限制                           |

</Tip>

## 可用模型（共 41 個）

<AccordionGroup>
  <Accordion title="Private models (26) — fully private, no logging">
    | Model ID                               | Name                                | Context | Features                   |
    | -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
    | `kimi-k2-5`                            | Kimi K2.5                           | 256k    | 預設, 推理, 視覺 |
    | `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | 推理                  |
    | `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | 通用                    |
    | `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | 通用                    |
    | `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B            | 128k    | 通用, 工具已停用    |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                | 128k    | 推理                  |
    | `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                | 128k    | 通用                    |
    | `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                   | 256k    | 編碼                     |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo             | 256k    | 編碼                     |
    | `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                    | 256k    | 推理, 視覺          |
    | `qwen3-next-80b`                       | Qwen3 Next 80B                     | 256k    | 通用                    |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Vision)             | 256k    | 視覺                     |
    | `qwen3-4b`                             | Venice Small (Qwen3 4B)            | 32k     | 快速, 推理            |
    | `deepseek-v3.2`                        | DeepSeek V3.2                      | 160k    | 推理, 工具已停用  |
    | `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k     | 無審查, 工具已停用 |
    | `mistral-31-24b`                       | Venice Medium (Mistral)            | 128k    | 視覺                     |
    | `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct        | 198k    | 視覺                     |
    | `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B               | 128k    | 通用                    |
    | `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B         | 128k    | 通用                    |
    | `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic              | 128k    | 推理                  |
    | `zai-org-glm-4.6`                      | GLM 4.6                            | 198k    | 通用                    |
    | `zai-org-glm-4.7`                      | GLM 4.7                            | 198k    | 推理                  |
    | `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                      | 128k    | 推理                  |
    | `zai-org-glm-5`                        | GLM 5                              | 198k    | 推理                  |
    | `minimax-m21`                          | MiniMax M2.1                       | 198k    | 推理                  |
    | `minimax-m25`                          | MiniMax M2.5                       | 198k    | 推理                  |
  </Accordion>

  <Accordion title="匿名模型 (15) — 透過 Venice 代理">
    | Model ID                        | Name                           | Context | Features                  |
    | ------------------------------- | ------------------------------ | ------- | ------------------------- |
    | `claude-opus-4-6`               | Claude Opus 4.6 (透過 Venice)   | 1M      | Reasoning, vision         |
    | `claude-opus-4-5`               | Claude Opus 4.5 (透過 Venice)   | 198k    | Reasoning, vision         |
    | `claude-sonnet-4-6`             | Claude Sonnet 4.6 (透過 Venice) | 1M      | Reasoning, vision         |
    | `claude-sonnet-4-5`             | Claude Sonnet 4.5 (透過 Venice) | 198k    | Reasoning, vision         |
    | `openai-gpt-54`                 | GPT-5.4 (透過 Venice)           | 1M      | Reasoning, vision         |
    | `openai-gpt-53-codex`           | GPT-5.3 Codex (透過 Venice)     | 400k    | Reasoning, vision, coding |
    | `openai-gpt-52`                 | GPT-5.2 (透過 Venice)           | 256k    | Reasoning                 |
    | `openai-gpt-52-codex`           | GPT-5.2 Codex (透過 Venice)     | 256k    | Reasoning, vision, coding |
    | `openai-gpt-4o-2024-11-20`      | GPT-4o (透過 Venice)            | 128k    | Vision                    |
    | `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini (透過 Venice)       | 128k    | Vision                    |
    | `gemini-3-1-pro-preview`        | Gemini 3.1 Pro (透過 Venice)    | 1M      | Reasoning, vision         |
    | `gemini-3-pro-preview`          | Gemini 3 Pro (透過 Venice)      | 198k    | Reasoning, vision         |
    | `gemini-3-flash-preview`        | Gemini 3 Flash (透過 Venice)    | 256k    | Reasoning, vision         |
    | `grok-41-fast`                  | Grok 4.1 Fast (透過 Venice)     | 1M      | Reasoning, vision         |
    | `grok-code-fast-1`              | Grok Code Fast 1 (透過 Venice)  | 256k    | Reasoning, coding         |
  </Accordion>
</AccordionGroup>

## 模型探索

當設定了 `VENICE_API_KEY` 時，OpenClaw 會自動從 Venice API 探索模型。如果 API 無法連線，它會回退到靜態目錄。

`/models` 端點是公開的（列出時不需要驗證），但推論需要有效的 API 金鑰。

## 串流和工具支援

| 功能          | 支援                                                    |
| ------------- | ------------------------------------------------------- |
| **串流**      | 所有模型                                                |
| **函式呼叫**  | 大多數模型（請檢查 API 中的 `supportsFunctionCalling`） |
| **視覺/影像** | 標有「視覺」功能的模型                                  |
| **JSON 模式** | 透過 `response_format` 支援                             |

## 定價

Venice 使用信用額度系統。請查看 [venice.ai/pricing](https://venice.ai/pricing) 瞭解當前費率：

- **私人模型**：通常成本較低
- **匿名模型**：類似於直接 API 定價 + 少量 Venice 費用

### Venice (匿名) 與直接 API

| 面向     | Venice (匿名)        | 直接 API     |
| -------- | -------------------- | ------------ |
| **隱私** | 已移除元數據，已匿名 | 連結您的帳戶 |
| **延遲** | +10-50ms (代理)      | 直接         |
| **功能** | 支援大部分功能       | 完整功能     |
| **計費** | Venice 點數          | 提供者計費   |

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

<AccordionGroup>
  <Accordion title="無法識別 API 金鑰">
    ```bash
    echo $VENICE_API_KEY
    openclaw models list | grep venice
    ```

    請確保金鑰以 `vapi_` 開頭。

  </Accordion>

<Accordion title="模型無法使用">Venice 模型目錄會動態更新。執行 `openclaw models list` 以查看目前可用的模型。部分模型可能暫時離線。</Accordion>

  <Accordion title="連線問題">
    Venice API 位於 `https://api.venice.ai/api/v1`。請確保您的網路允許 HTTPS 連線。
  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="設定檔範例">
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
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Venice AI" href="https://venice.ai" icon="globe">
    Venice AI 首頁與帳號註冊。
  </Card>
  <Card title="API 文件" href="https://docs.venice.ai" icon="book">
    Venice API 參考資料與開發者文件。
  </Card>
  <Card title="定價" href="https://venice.ai/pricing" icon="credit-card">
    目前的 Venice 點數費率與方案。
  </Card>
</CardGroup>

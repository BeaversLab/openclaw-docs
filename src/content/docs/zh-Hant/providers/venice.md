---
summary: "在 OpenClaw 中使用 Venice AI 的隱私保護模型"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

Venice AI 提供專注隱私的 AI 推理服務，支援非審查模型，並透過其匿名代理存取主要的專有模型。所有推理預設皆為私密 — 不使用您的資料進行訓練，不進行日誌記錄。

## 為何在 OpenClaw 中使用 Venice

- 開源模型的**私密推理**（無日誌記錄）。
- 當您需要時提供**非審查模型**。
- 當品質重要時，對專有模型（Opus/GPT/Gemini）進行**匿名存取**。
- 相容 OpenAI 的 `/v1` 端點。

## 隱私模式

Venice 提供兩種隱私等級 — 理解此點對於選擇您的模型至關重要：

| 模式     | 描述                                                                                                   | 模型                                                         |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **私密** | 完全私密。提示詞/回應**絕不會被儲存或記錄**。暫時性。                                                  | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等。 |
| **匿名** | 透過 Venice 代理並移除中繼資料。底層供應商（OpenAI、Anthropic、Google、xAI）會看到經過匿名處理的請求。 | Claude、GPT、Gemini、Grok                                    |

<Warning>匿名模型並非完全私密。Venice 會在轉發前移除中繼資料，但底層供應商（OpenAI、Anthropic、Google、xAI）仍會處理請求。當需要完全隱私時，請選擇**私密**模型。</Warning>

## 功能

- **專注隱私**：可選擇「私密」（完全私密）與「匿名」（代理）模式
- **非審查模型**：可存取無內容限制的模型
- **主要模型存取**：透過 Venice 的匿名代理使用 Claude、GPT、Gemini 和 Grok
- **相容 OpenAI 的 API**：標準 `/v1` 端點，便於整合
- **串流**：所有模型皆支援
- **函式呼叫**：選定模型支援（請檢查模型功能）
- **視覺**：具備視覺能力的模型支援
- **無嚴格速率限制**：對於極端使用情況可能會採取公平使用限速

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    1. 在 [venice.ai](https://venice.ai) 註冊
    2. 前往 **Settings > API Keys > Create new key**
    3. 複製您的 API 金鑰（格式：`vapi_xxxxxxxxxxxx`）
  </Step>
  <Step title="設定 OpenClaw">
    選擇您偏好的設定方式：

    <Tabs>
      <Tab title="互動式（推薦）">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        這將會：
        1. 提示您輸入 API 金鑰（或使用現有的 `VENICE_API_KEY`）
        2. 顯示所有可用的 Venice 模型
        3. 讓您選擇預設模型
        4. 自動設定提供者
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

- **預設模型**：`venice/kimi-k2-5` 適合強大的私人推理以及視覺功能。
- **高功能選項**：`venice/claude-opus-4-6` 適合最強的匿名 Venice 路徑。
- **隱私**：選擇「私人」模型以進行完全私有的推理。
- **功能**：選擇「匿名」模型以透過 Venice 的代理存取 Claude、GPT、Gemini。

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
使用下表為您的使用情境選擇合適的模型。

| 使用情境             | 推薦模型                         | 原因                                   |
| -------------------- | -------------------------------- | -------------------------------------- |
| **一般聊天（預設）** | `kimi-k2-5`                      | 強大的私人推理加上視覺能力             |
| **最佳整體品質**     | `claude-opus-4-6`                | 最強大的匿名化 Venice 選項             |
| **隱私 + 程式設計**  | `qwen3-coder-480b-a35b-instruct` | 具有大型上下文的私人程式設計模型       |
| **私人視覺**         | `kimi-k2-5`                      | 無需離開私人模式的視覺支援             |
| **快速 + 經濟實惠**  | `qwen3-4b`                       | 輕量級推理模型                         |
| **複雜的私人任務**   | `deepseek-v3.2`                  | 強大的推理能力，但沒有 Venice 工具支援 |
| **無審查**           | `venice-uncensored`              | 無內容限制                             |

</Tip>

## DeepSeek V4 重播行為

如果 Venice 提供了 DeepSeek V4 模型，例如 `venice/deepseek-v4-pro` 或
`venice/deepseek-v4-flash`，OpenClaw 會在代理程式工具呼叫回合中填入所需的 DeepSeek V4
`reasoning_content` 重播預留位置（當代理伺服器省略該預留位置時）。Venice 會拒絕 DeepSeek 原生的頂層 `thinking` 控制，
因此 OpenClaw 將此特定提供者的重播修復與原生
DeepSeek 提供者的思考控制分開處理。

## 內建目錄（共 41 個）

<AccordionGroup>
  <Accordion title="Private models (26) — fully private, no logging">
    | 模型 ID                               | 名稱                                | 上下文  | 功能                       |
    | -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
    | `kimi-k2-5`                            | Kimi K2.5                           | 256k    | Default, reasoning, vision |
    | `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | Reasoning                  |
    | `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | General                    |
    | `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | General                    |
    | `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B            | 128k    | General, tools disabled    |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                | 128k    | Reasoning                  |
    | `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                | 128k    | General                    |
    | `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                   | 256k    | Coding                     |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo             | 256k    | Coding                     |
    | `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                    | 256k    | Reasoning, vision          |
    | `qwen3-next-80b`                       | Qwen3 Next 80B                     | 256k    | General                    |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Vision)             | 256k    | Vision                     |
    | `qwen3-4b`                             | Venice Small (Qwen3 4B)            | 32k     | Fast, reasoning            |
    | `deepseek-v3.2`                        | DeepSeek V3.2                      | 160k    | Reasoning, tools disabled  |
    | `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k     | Uncensored, tools disabled |
    | `mistral-31-24b`                       | Venice Medium (Mistral)            | 128k    | Vision                     |
    | `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct        | 198k    | Vision                     |
    | `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B               | 128k    | General                    |
    | `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B         | 128k    | General                    |
    | `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic              | 128k    | Reasoning                  |
    | `zai-org-glm-4.6`                      | GLM 4.6                            | 198k    | General                    |
    | `zai-org-glm-4.7`                      | GLM 4.7                            | 198k    | Reasoning                  |
    | `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                      | 128k    | Reasoning                  |
    | `zai-org-glm-5`                        | GLM 5                              | 198k    | Reasoning                  |
    | `minimax-m21`                          | MiniMax M2.1                       | 198k    | Reasoning                  |
    | `minimax-m25`                          | MiniMax M2.5                       | 198k    | Reasoning                  |
  </Accordion>

  <Accordion title="匿名模型（15 個）— 透過 Venice 代理">
    | 模型 ID                        | 名稱                           | Context | 功能                  |
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

當設定 `VENICE_API_KEY` 時，OpenClaw 會自動從 Venice API 探索模型。如果 API 無法連線，它會回退到靜態目錄。

`/models` 端點是公開的（列出清單不需要認證），但推論需要有效的 API 金鑰。

## 串流與工具支援

| 功能          | 支援                                                    |
| ------------- | ------------------------------------------------------- |
| **串流**      | 所有模型                                                |
| **函數呼叫**  | 大多數模型（請檢查 API 中的 `supportsFunctionCalling`） |
| **視覺/圖片** | 標有「Vision」功能的模型                                |
| **JSON 模式** | 透過 `response_format` 支援                             |

## 定價

Venice 使用點數系統。請查看 [venice.ai/pricing](https://venice.ai/pricing) 以了解當前費率：

- **Private models**：通常費用較低
- **Anonymized models**：類似於直接 API 定價 + 少量 Venice 手續費

### Venice (匿名化) vs 直接 API

| 面向     | Venice (匿名化)        | 直接 API       |
| -------- | ---------------------- | -------------- |
| **隱私** | 元數據已剝離，已匿名化 | 您的帳戶已連結 |
| **延遲** | +10-50ms (代理)        | 直接           |
| **功能** | 支援大多數功能         | 完整功能       |
| **計費** | Venice 點數            | 提供商計費     |

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
  <Accordion title="API key not recognized">
    ```bash
    echo $VENICE_API_KEY
    openclaw models list | grep venice
    ```

    請確保金鑰以 `vapi_` 開頭。

  </Accordion>

<Accordion title="Model not available">Venice 模型目錄會動態更新。執行 `openclaw models list` 以查看目前可用的模型。部分模型可能暫時離線。</Accordion>

  <Accordion title="Connection issues">
    Venice API 位於 `https://api.venice.ai/api/v1`。請確保您的網路允許 HTTPS 連線。
  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Config file example">
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
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和故障轉移行為。
  </Card>
  <Card title="Venice AI" href="https://venice.ai" icon="globe">
    Venice AI 首頁和帳戶註冊。
  </Card>
  <Card title="API documentation" href="https://docs.venice.ai" icon="book">
    Venice API 參考和開發者文件。
  </Card>
  <Card title="定價" href="https://venice.ai/pricing" icon="credit-card">
    目前的 Venice 點數費率與方案。
  </Card>
</CardGroup>

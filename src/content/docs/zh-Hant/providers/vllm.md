---
summary: "使用 vLLM 執行 OpenClaw (OpenAI 相容的本地伺服器)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM 可以透過 **OpenAI 相容** 的 HTTP API 來提供開源 (及部分自訂) 模型。OpenClaw 使用 `openai-completions` API 連接到 vLLM。

當您使用 `VLLM_API_KEY` 選擇加入時 (如果您的伺服器不強制執行驗證，則任何值均可)，且未定義明確的 `models.providers.vllm` 項目，OpenClaw 也可以從 vLLM **自動探索** 可用的模型。

OpenClaw 將 `vllm` 視為支援串流使用量計算的本地 OpenAI 相容提供者，因此狀態/上下文 token 計數可以從 `stream_options.include_usage` 回應中更新。

| 屬性         | 數值                               |
| ------------ | ---------------------------------- |
| 供應商 ID    | `vllm`                             |
| API          | `openai-completions` (OpenAI 相容) |
| 驗證         | `VLLM_API_KEY` 環境變數            |
| 預設基礎 URL | `http://127.0.0.1:8000/v1`         |

## 開始使用

<Steps>
  <Step title="使用 OpenAI 相容伺服器啟動 vLLM">
    您的基本 URL 應該公開 `/v1` 端點 (例如 `/v1/models`、`/v1/chat/completions`)。vLLM 通常運行於：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="設定 API 金鑰環境變數">
    如果您的伺服器不強制執行驗證，則任何值均可：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="選擇模型">
    替換為您的其中一個 vLLM 模型 ID：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型探索（隱式提供商）

當設定了 `VLLM_API_KEY` (或存在驗證設定檔) 且您 **未** 定義 `models.providers.vllm` 時，OpenClaw 會查詢：

```
GET http://127.0.0.1:8000/v1/models
```

並將傳回的 ID 轉換為模型項目。

<Note>如果您明確設定了 `models.providers.vllm`，將會跳過自動探索，且您必須手動定義模型。</Note>

## 明確設定（手動模型）

在以下情況使用明確設定：

- vLLM 運行於不同的主機或連接埠
- 您想要固定 `contextWindow` 或 `maxTokens` 值
- 您的伺服器需要真實的 API 金鑰（或者您想要控制標頭）
- 您連接到受信任的 loopback、LAN 或 Tailscale vLLM 端點

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        request: { allowPrivateNetwork: true },
        timeoutSeconds: 300, // Optional: extend connect/header/body/request timeout for slow local models
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 進階設定

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    vLLM 被視為代理樣式的 OpenAI 相容 `/v1` 後端，而非原生的
    OpenAI 端點。這意味著：

    | 行為 | 是否套用？ |
    |----------|----------|
    | Native OpenAI request shaping | 否 |
    | `service_tier` | 未傳送 |
    | Responses `store` | 未傳送 |
    | Prompt-cache hints | 未傳送 |
    | OpenAI reasoning-compat payload shaping | 未套用 |
    | Hidden OpenClaw attribution headers | 未在自訂基礎 URL 上注入 |

  </Accordion>

  <Accordion title="Qwen thinking controls">
    對於透過 vLLM 提供的 Qwen 模型，當
    伺服器預期 Qwen chat-template kwargs 時，請在模型項目上設定
    `params.qwenThinkingFormat: "chat-template"`。OpenClaw 將 `/think off` 對應至：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 思考層級會傳送 `enable_thinking: true`。如果您的端點
    預期的是 DashScope 樣式的頂層標誌，請改用
    `params.qwenThinkingFormat: "top-level"` 在請求根層級傳送 `enable_thinking`。
    Snake-case `params.qwen_thinking_format` 也可被接受。

  </Accordion>

  <Accordion title="Nemotron 3 thinking controls">
    vLLM/Nemotron 3 可以使用 chat-template kwargs 來控制推理是
    以隱藏推理還是可見答案文字的形式傳回。當 OpenClaw 工作階段
    使用關閉思考功能的 `vllm/nemotron-3-*` 時，隨附的 vLLM 外掛程式會傳送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    若要自訂這些數值，請在模型參數下設定 `chat_template_kwargs`。
    如果您也設定了 `params.extra_body.chat_template_kwargs`，該數值將
    具有最終優先權，因為 `extra_body` 是最後一個請求主體覆寫。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/nemotron-3-super": {
              params: {
                chat_template_kwargs: {
                  enable_thinking: false,
                  force_nonempty_content: true,
                },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Qwen 工具調用以文字形式顯示">
    首先請確認 vLLM 啟動時使用了該模型正確的工具呼叫解析器和聊天
    樣板。例如，vLLM 文件針對 Qwen2.5 模型記錄了 `hermes`，
    針對 Qwen3-Coder 模型記錄了 `qwen3_xml`。

    症狀：

    - 技能或工具從未執行
    - 助手列印原始 JSON/XML，例如 `{"name":"read","arguments":...}`
    - 當 OpenClaw 發送
      `tool_choice: "auto"` 時，vLLM 返回空的 `tool_calls` 陣列

    某些 Qwen/vLLM 組合僅在請求使用 `tool_choice: "required"` 時才會
    返回結構化工具呼叫。對於這些模型項目，請使用 `params.extra_body`
    強制設定 OpenAI 相容的請求欄位：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/Qwen-Qwen2.5-Coder-32B-Instruct": {
              params: {
                extra_body: {
                  tool_choice: "required",
                },
              },
            },
          },
        },
      },
    }
    ```

    將 `Qwen-Qwen2.5-Coder-32B-Instruct` 替換為以下指令返回的確切 ID：

    ```bash
    openclaw models list --provider vllm
    ```

    您也可以從 CLI 套用相同的覆蓋設定：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    這是一個選用的相容性變通方案。它會使每個使用工具的模型輪次都
    要求進行工具呼叫，因此請僅在可接受該行為的專用本地模型項目上
    使用它。請勿將其作為所有 vLLM 模型的全域預設值，也請勿使用會
    盲目將任意助手文字轉換為可執行工具呼叫的代理程式。

  </Accordion>

  <Accordion title="自訂基礎 URL">
    如果您的 vLLM 伺服器執行於非預設的主機或連接埠，請在明確的提供者設定中設定 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="首次回應緩慢或遠端伺服器逾時">
    對於大型本地模型、遠端 LAN 主機或 tailnet 連線，請設定一個
    提供者範圍的請求逾時：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` 僅適用於 vLLM 模型 HTTP 請求，包括
    連線設定、回應標頭、主體串流以及總體
    guarded-fetch 中止。優先使用此設定，而非增加
    `agents.defaults.timeoutSeconds`，後者控制整個代理程式的執行。

  </Accordion>

  <Accordion title="無法連線至伺服器">
    請檢查 vLLM 伺服器是否正在執行且可存取：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果您看到連線錯誤，請驗證主機、連接埠，以及 vLLM 是否以 OpenAI 相容伺服器模式啟動。
    對於明確的 loopback、LAN 或 Tailscale 端點，也請設定
    `models.providers.vllm.request.allowPrivateNetwork: true`；除非提供者
    已明確信任，否則提供者請求預設會封鎖私有網路 URL。

  </Accordion>

  <Accordion title="請求發生驗證錯誤">
    如果請求因驗證錯誤而失敗，請設定符合您伺服器設定的真實 `VLLM_API_KEY`，或在 `models.providers.vllm` 下明確設定提供者。

    <Tip>
    如果您的 vLLM 伺服器未強制執行驗證，`VLLM_API_KEY` 的任何非空值均可作為 OpenClaw 的加入訊號。
    </Tip>

  </Accordion>

<Accordion title="未探索到模型">自動探索需要設定 `VLLM_API_KEY` **並且** 沒有明確的 `models.providers.vllm` 設定項目。如果您已手動定義提供者，OpenClaw 將會跳過探索並僅使用您宣告的模型。</Accordion>

  <Accordion title="工具以原始文字呈現">
    如果 Qwen 模型印出 JSON/XML 工具語法而不是執行技能，
    請檢查上方進階設定中的 Qwen 指引。通常的解決方法是：

    - 使用該模型的正確解析器/範本啟動 vLLM
    - 以 `openclaw models list --provider vllm` 確認確切的模型 ID
    - 僅當 `tool_choice: "auto"` 仍傳回空白或僅文字
      工具呼叫時，才新增專屬的個別模型 `params.extra_body.tool_choice: "required"`
      覆蓋

  </Accordion>
</AccordionGroup>

<Warning>更多協助：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="OpenAI" href="/zh-Hant/providers/openai" icon="bolt">
    原生 OpenAI 提供者和 OpenAI 相容路由行為。
  </Card>
  <Card title="OAuth and auth" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重用規則。
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題及解決方法。
  </Card>
</CardGroup>

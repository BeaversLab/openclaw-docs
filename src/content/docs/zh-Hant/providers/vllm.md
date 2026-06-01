---
summary: "使用 vLLM（OpenAI 相容的本機伺服器）執行 OpenClaw"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM 可以透過 **OpenAI 相容** 的 HTTP API 服務開源模型（以及部分自訂模型）。OpenClaw 使用 `openai-completions` API 連接到 vLLM。

當您選擇使用 `VLLM_API_KEY`（如果您的伺服器不強制執行驗證，則任何值皆可運作）時，OpenClaw 也可以從 vLLM **自動探索** 可用的模型。如果您同時設定了自訂的 vLLM 基礎 URL，請在 `agents.defaults.models` 中使用 `vllm/*` 以保持探索動態。

OpenClaw 將 `vllm` 視為支援串流使用量計算的本機 OpenAI 相容提供者，因此狀態/內文 token 計數可以從 `stream_options.include_usage` 回應更新。

| 屬性         | 數值                               |
| ------------ | ---------------------------------- |
| 供應商 ID    | `vllm`                             |
| API          | `openai-completions` (OpenAI 相容) |
| 驗證         | `VLLM_API_KEY` 環境變數            |
| 預設基礎 URL | `http://127.0.0.1:8000/v1`         |

## 開始使用

<Steps>
  <Step title="使用 OpenAI 相容伺服器啟動 vLLM">
    您的基礎 URL 應公開 `/v1` 端點（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常運行於：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="設定 API 金鑰環境變數">
    如果您的伺服器不強制執行驗證，則任何值皆可運作：

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

當設定了 `VLLM_API_KEY`（或存在驗證設定檔）且您**未**定義 `models.providers.vllm` 時，OpenClaw 會查詢：

```
GET http://127.0.0.1:8000/v1/models
```

並將傳回的 ID 轉換為模型項目。

<Note>如果您明確設定了 `models.providers.vllm`，OpenClaw 預設會使用您宣告的模型。當您希望 OpenClaw 查詢該設定供應商的 `/models` 端點並包含所有公告的 vLLM 模型時，請將 `"vllm/*": {}` 新增至 `agents.defaults.models`。</Note>

## 明確設定（手動模型）

在以下情況使用明確設定：

- vLLM 運行於不同的主機或連接埠
- 您想要固定 `contextWindow` 或 `maxTokens` 的值
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

若要讓此供應商保持動態而無需手動列出每個模型，請在可見模型目錄中加入供應商萬用字元：

```json5
{
  agents: {
    defaults: {
      models: {
        "vllm/*": {},
      },
    },
  },
}
```

## 進階設定

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    vLLM 被視為代理風格的 OpenAI 相容 `/v1` 後端，而非原生
    OpenAI 端點。這意味著：

    | 行為 | 是否套用？ |
    |----------|----------|
    | 原生 OpenAI 請求塑形 | 否 |
    | `service_tier` | 未發送 |
    | 回應 `store` | 未發送 |
    | 提示詞快取提示 | 未發送 |
    | OpenAI 推理相容載荷塑形 | 未套用 |
    | 隱藏的 OpenClaw 歸屬標頭 | 未在自訂基礎 URL 上注入 |

  </Accordion>

  <Accordion title="Qwen thinking controls">
    對於透過 vLLM 提供的 Qwen 模型，當伺服器預期 Qwen 聊天模板 kwargs 時，請在
    設定的供應商模型列上設定 `compat.thinkingFormat: "qwen-chat-template"`。以這種方式
    設定的模型會公開二進制 `/think` 設定檔（`off`、`on`），因為
    Qwen 模板思維是開/關請求旗標，而非 OpenAI 風格的強度階層。

    ```json5
    {
      models: {
        providers: {
          vllm: {
            models: [
              {
                id: "Qwen/Qwen3-8B",
                name: "Qwen3 8B",
                reasoning: true,
                compat: { thinkingFormat: "qwen-chat-template" },
              },
            ],
          },
        },
      },
    }
    ```

    OpenClaw 會將 `/think off` 對應為：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 思維等級會發送 `enable_thinking: true`。如果您的端點
    預期改用 DashScope 風格的頂層旗標，請使用
    `compat.thinkingFormat: "qwen"` 在請求根目錄發送
    `enable_thinking`。

  </Accordion>

  <Accordion title="Nemotron 3 思維控制">
    vLLM/Nemotron 3 可以使用 chat-template kwargs 來控制推理是以隱藏推理還是可見答案文本的形式返回。當 OpenClaw 會話使用 `vllm/nemotron-3-*` 並關閉思維功能時，捆綁的 vLLM 插件會發送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    若要自訂這些值，請在模型參數下設定 `chat_template_kwargs`。
    如果您也設定了 `params.extra_body.chat_template_kwargs`，該值將具有最終優先權，因為 `extra_body` 是最後的請求主體覆寫。

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

  <Accordion title="Qwen 工具呼叫顯示為文字">
    首先請確保 vLLM 啟動時使用了正確的工具呼叫解析器和該模型的聊天範本。例如，vLLM 文件指出 Qwen2.5 模型使用 `hermes`，而 Qwen3-Coder 模型使用 `qwen3_xml`。

    症狀：

    - 技能或工具從未執行
    - 助手打印原始 JSON/XML，例如 `{"name":"read","arguments":...}`
    - 當 OpenClaw 發送 `tool_choice: "auto"` 時，vLLM 返回空的 `tool_calls` 陣列

    某些 Qwen/vLLM 組合僅在請求使用 `tool_choice: "required"` 時才返回結構化工具呼叫。對於這些模型條目，請使用 `params.extra_body` 強制設定 OpenAI 相容的請求欄位：

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

    請將 `Qwen-Qwen2.5-Coder-32B-Instruct` 替換為以下內容返回的確切 ID：

    ```bash
    openclaw models list --provider vllm
    ```

    您也可以從 CLI 套用相同的覆寫：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    這是一個選用的相容性變通方法。它使得每次使用工具的模型回合都要求進行工具呼叫，因此僅將其用於專用的本地模型條目，且該行為是可接受的。請勿將其作為所有 vLLM 模型的全域預設值，也不要使用將任意助手文本盲目轉換為可執行工具呼叫的代理。

  </Accordion>

  <Accordion title="自訂基礎 URL">
    如果您的 vLLM 伺服器運行在非預設主機或連接埠上，請在明確提供者配置中設定 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
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
    對於大型本地模型、遠端 LAN 主機或 tailnet 連結，請設定一個
    提供者層級的請求逾時時間：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` 僅適用於 vLLM 模型 HTTP 請求，包括
    連線設定、回應標頭、主體串流以及總體
    guarded-fetch 中止。在增加
    `agents.defaults.timeoutSeconds` 之前請優先使用此設定，因為後者控制的是整個 agent 的執行。

  </Accordion>

  <Accordion title="無法連線至伺服器">
    檢查 vLLM 伺服器是否正在執行且可存取：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果您看到連線錯誤，請驗證主機、連接埠，以及 vLLM 是否已以 OpenAI 相容伺服器模式啟動。
    對於明確的 loopback、LAN 或 Tailscale 端點，OpenClaw 會信任
    已設定的確切 `models.providers.vllm.baseUrl` 來源以進行受保護的模型
    請求。元資料/link-local 來源在未經明確
    加入選用前將持續被封鎖。僅在
    vLLM 請求必須到達另一個私人來源時設定 `models.providers.vllm.request.allowPrivateNetwork: true`，並將其設為 `false`
    以退出確切來源信任。

  </Accordion>

  <Accordion title="請求發生驗證錯誤">
    如果請求因驗證錯誤而失敗，請設定符合您伺服器設定的真實 `VLLM_API_KEY`，或在 `models.providers.vllm` 下明確設定提供者。

    <Tip>
    如果您的 vLLM 伺服器未強制執行驗證，則 `VLLM_API_KEY` 的任何非空值均可作為 OpenClaw 的啟用信號。
    </Tip>

  </Accordion>

<Accordion title="未發現模型">自動探索需要設定 `VLLM_API_KEY`。如果您已定義 `models.providers.vllm`，除非 `agents.defaults.models` 包含 `"vllm/*": {}`，否則 OpenClaw 將僅使用您宣告的模型。</Accordion>

  <Accordion title="工具以原始文字呈現">
    如果 Qwen 模型印出 JSON/XML 工具語法而不是執行技能，
    請檢查上方「進階設定」中的 Qwen 指引。通常的修正方法是：

    - 使用該模型正確的解析器/範本啟動 vLLM
    - 使用 `openclaw models list --provider vllm` 確認確切的模型 ID
    - 僅當 `tool_choice: "auto"` 仍然傳回空值或僅文字工具呼叫時，
      才新增專屬的每個模型 `params.extra_body.tool_choice: "required"` 覆蓋

  </Accordion>
</AccordionGroup>

<Warning>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="OpenAI" href="/zh-Hant/providers/openai" icon="bolt">
    原生 OpenAI 提供者和 OpenAI 相容路由行為。
  </Card>
  <Card title="OAuth 和驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和認證重用規則。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題及解決方法。
  </Card>
</CardGroup>

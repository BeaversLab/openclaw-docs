---
summary: "透過本機 Ollama 主機或託管的 Ollama API 進行 Ollama Web Search"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You want to use hosted Ollama Web Search with OLLAMA_API_KEY
  - You need Ollama Web Search setup guidance
title: "Ollama 網路搜尋"
---

OpenClaw 支援將 **Ollama Web Search** 作為內建的 `web_search` 提供者。它
使用 Ollama 的 web-search API 並回傳包含標題、URL
和摘要的結構化結果。

對於本機或自託管的 Ollama，此設定預設
不需要 API 金鑰。但它需要：

- 一個可從 OpenClaw 存取的 Ollama 主機
- `ollama signin`

若要直接使用託管搜尋，請將 Ollama 提供者的基礎 URL 設定為 `https://ollama.com`
並提供真實的 `OLLAMA_API_KEY`。

## 設定

<Steps>
  <Step title="啟動 Ollama">
    確保 Ollama 已安裝並正在執行。
  </Step>
  <Step title="登入">
    執行：

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="選擇 Ollama Web Search">
    執行：

    ```bash
    openclaw configure --section web
    ```

    然後選擇 **Ollama Web Search** 作為提供者。

  </Step>
</Steps>

如果您已經使用 Ollama 來存放模型，Ollama 網頁搜尋將會重複使用相同的設定主機。

## 設定

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

選用的 Ollama 主機覆寫：

```json5
{
  plugins: {
    entries: {
      ollama: {
        config: {
          webSearch: {
            baseUrl: "http://ollama-host:11434",
          },
        },
      },
    },
  },
}
```

如果您已經將 Ollama 設定為模型提供者，web-search 提供者可以
改用該主機：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

Ollama 模型提供者使用 `baseUrl` 作為正式金鑰。為了與 OpenAI SDK 風格的設定範例相容，web-search 提供者也會遵守 `models.providers.ollama` 上的 `baseURL`。

如果未設定明確的 Ollama 基礎 URL，OpenClaw 會使用 `http://127.0.0.1:11434`。

如果您的 Ollama 主機要求 bearer auth，OpenClaw 會在對該設定主機的請求中重複使用
`models.providers.ollama.apiKey` (或符合的 env-backed 提供者 auth)。

直接託管的 Ollama Web Search：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

## 註記

- 此提供者不需要 web-search 專用的 API 金鑰欄位。
- 如果 Ollama 主機受保護，OpenClaw 會在存在時重複使用一般的 Ollama
  提供者 API 金鑰。
- 如果 `baseUrl` 是 `https://ollama.com`，OpenClaw 會直接呼叫
  `https://ollama.com/api/web_search` 並將設定的 Ollama
  API 金鑰作為 bearer auth 發送。
- If the configured host does not expose web search and `OLLAMA_API_KEY` is set,
  OpenClaw can fall back to `https://ollama.com/api/web_search` without sending
  that env key to the local host.
- OpenClaw warns during setup if Ollama is unreachable or not signed in, but
  it does not block selection.
- Runtime auto-detect can fall back to Ollama Web Search when no higher-priority
  credentialed provider is configured.
- Local Ollama daemon hosts use the local proxy endpoint
  `/api/experimental/web_search`, which signs and forwards to Ollama Cloud.
- `https://ollama.com` hosts use the public hosted endpoint
  `/api/web_search` directly with bearer API-key auth.

## Related

- [Web Search overview](/zh-Hant/tools/web) -- all providers and auto-detection
- [Ollama](/zh-Hant/providers/ollama) -- Ollama model setup and cloud/local modes

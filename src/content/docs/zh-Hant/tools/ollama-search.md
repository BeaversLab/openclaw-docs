---
summary: "透過您設定的 Ollama 主機進行 Ollama 網頁搜尋"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You need Ollama Web Search setup guidance
title: "Ollama 網頁搜尋"
---

# Ollama 網頁搜尋

OpenClaw 支援將 **Ollama 網頁搜尋** 作為內建的 `web_search` 提供者。
它使用 Ollama 的實驗性網頁搜尋 API，並傳回包含標題、URL 和摘要的結構化結果。

與 Ollama 模型提供者不同，此設定在預設情況下不需要 API 金鑰。但它需要：

- 一個可從 OpenClaw 存取的 Ollama 主機
- `ollama signin`

## 設定

<Steps>
  <Step title="啟動 Ollama">
    請確保已安裝並正在執行 Ollama。
  </Step>
  <Step title="登入">
    執行：

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="選擇 Ollama 網頁搜尋">
    執行：

    ```bash
    openclaw configure --section web
    ```

    然後選擇 **Ollama 網頁搜尋** 作為提供者。

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
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

如果未設定明確的 Ollama 基礎 URL，OpenClaw 會使用 `http://127.0.0.1:11434`。

如果您的 Ollama 主機需要 bearer auth，OpenClaw 也會針對網頁搜尋請求重複使用
`models.providers.ollama.apiKey` (或相符的 env-backed provider auth)。

## 注意事項

- 此提供者不需要網頁搜尋專屬的 API 金鑰欄位。
- 如果 Ollama 主機受 auth 保護，OpenClaw 在存在的情況下會重複使用一般的 Ollama
  提供者 API 金鑰。
- 如果在設定期間 Ollama 無法連線或未登入，OpenClaw 會發出警告，但
  不會阻擋選擇。
- 當未設定更高優先順序的憑證提供者時，執行階段自動偵測可能會降級為 Ollama 網頁搜尋。
- 此提供者使用 Ollama 的實驗性 `/api/experimental/web_search`
  端點。

## 相關

- [網頁搜尋概觀](/zh-Hant/tools/web) -- 所有提供者與自動偵測
- [Ollama](/zh-Hant/providers/ollama) -- Ollama 模型設定與雲端/本機模式

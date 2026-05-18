---
summary: "設定官方外部 LanceDB 記憶體外掛，包括本機 Ollama 相容嵌入"
read_when:
  - You are configuring the memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "Memory LanceDB"
sidebarTitle: "Memory LanceDB"
---

`memory-lancedb` 是一個官方的外部記憶體外掛，它將長期記憶體儲存在
LanceDB 中並使用嵌入進行召回。它可以在模型回合前自動召回相關
記憶體，並在回應後擷取重要事實。

當您需要為記憶體使用本地向量資料庫、需要
OpenAI 相容的嵌入端點，或希望將記憶體資料庫保留在
預設內建記憶體儲存之外時，請使用它。

## 安裝

在設定 `plugins.slots.memory = "memory-lancedb"` 之前，請先安裝 `memory-lancedb`：

```bash
openclaw plugins install @openclaw/memory-lancedb
```

該外掛已發佈至 npm 且未捆綁在 OpenClaw 執行時映像檔中。
當沒有其他外掛擁有記憶體插槽時，安裝程式會寫入外掛項目並切換記憶體插槽。

<Note>`memory-lancedb` 是一個主動記憶體外掛。透過使用 `plugins.slots.memory = "memory-lancedb"` 選取記憶體 插槽來啟用它。伴隨外掛（例如 `memory-wiki`）可以在其旁邊執行，但只有一個外掛擁有主動記憶體插槽。</Note>

## 快速開始

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

變更外掛設定後，請重新啟動 Gateway：

```bash
openclaw gateway restart
```

然後驗證外掛是否已載入：

```bash
openclaw plugins list
```

## 提供者支援的嵌入

`memory-lancedb` 可以使用與
`memory-core` 相同的記憶體嵌入提供者介面卡。設定 `embedding.provider` 並省略 `embedding.apiKey` 以使用
提供者設定的驗證設定檔、環境變數或
`models.providers.<provider>.apiKey`。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
        },
      },
    },
  },
}
```

此路徑適用於公開嵌入憑證的提供者驗證設定檔。
例如，當 Copilot 設定檔/計畫支援
嵌入時，可以使用 GitHub Copilot：

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

OpenAI Codex / ChatGPT OAuth (`openai-codex`) 不是 OpenAI 平台
嵌入憑證。若要使用 OpenAI 嵌入，請使用 OpenAI API 金鑰驗證設定檔、
`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`。僅使用 OAuth 的使用者可以使用
其他支援嵌入的提供者，例如 GitHub Copilot 或 Ollama。

## Ollama 嵌入

對於 Ollama 嵌入，建議優先使用內建的 Ollama 嵌入提供者。它使用原生的 Ollama `/api/embed` 端點，並遵循與 [Ollama](/zh-Hant/providers/ollama) 文件中記載的 Ollama 提供者相同的驗證/基礎 URL 規則。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "ollama",
            baseUrl: "http://127.0.0.1:11434",
            model: "mxbai-embed-large",
            dimensions: 1024,
          },
          recallMaxChars: 400,
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

為非標準的嵌入模型設定 `dimensions`。OpenClaw 知道 `text-embedding-3-small` 和 `text-embedding-3-large` 的維度；自訂模型需要在設定中提供此值，以便 LanceDB 建立向量欄。

對於小型本地嵌入模型，如果您看到來自本地伺服器的內容長度錯誤，請降低 `recallMaxChars`。

## OpenAI 相容的提供者

某些 OpenAI 相容的嵌入提供者會拒絕 `encoding_format` 參數，而其他的則會忽略它並總是返回 `number[]` 向量。因此，`memory-lancedb` 在嵌入請求中會省略 `encoding_format`，並接受浮點陣列回應或 base64 編碼的 float32 回應。

如果您有一個沒有內建提供者配接器的原始 OpenAI 相容嵌入端點，請省略 `embedding.provider`（或將其保留為 `openai`）並設定 `embedding.apiKey` 和 `embedding.baseUrl`。這保留了直接的 OpenAI 相容客戶端路徑。

針對模型維度未內建的提供者，請設定 `embedding.dimensions`。例如，智譜 `embedding-3` 使用 `2048` 維度：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${ZHIPU_API_KEY}",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "embedding-3",
            dimensions: 2048,
          },
        },
      },
    },
  },
}
```

## 回憶與擷取限制

`memory-lancedb` 有兩個獨立的文字限制：

| 設定              | 預設值 | 範圍      | 適用於                          |
| ----------------- | ------ | --------- | ------------------------------- |
| `recallMaxChars`  | `1000` | 100-10000 | 傳送至嵌入 API 以進行回憶的文字 |
| `captureMaxChars` | `500`  | 100-10000 | 符合自動擷取條件的訊息長度      |
| `customTriggers`  | `[]`   | 0-50      | 使自動擷取考慮訊息的字面詞組    |

`recallMaxChars` 控制自動回溯、`memory_recall` 工具、`memory_forget` 查詢路徑以及 `openclaw ltm search`。自動回溯優先選取該輪次中最新的使用者訊息，僅在沒有使用者訊息可用時才回退到完整提示。這可將頻道詮中繼資料和大型提示區塊排除在嵌入請求之外。

`captureMaxChars` 控制回應是否足夠短以納入考量進行自動擷取。它不會限制回溯查詢嵌入。

`customTriggers` 讓您無需撰寫正規表示式即可新增字面自動擷取片語。內建觸發條件包含常見的英文、捷克文、中文、日文和韓文記憶片語。

## 指令

當 `memory-lancedb` 是啟用的記憶外掛時，它會註冊 `ltm` CLI 命名空間：

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

此外，該外掛還擴充了 `openclaw memory`，增加一個非向量的 `query` 子指令，該指令直接對 LanceDB 資料表執行：

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`：以逗號分隔的欄位允許清單（預設為 `id`、`text`、`importance`、`category`、`createdAt`）。
- `--filter <condition>`：SQL 風格的 WHERE 子句；限制為 200 個字元，且僅限英數字元、比較運算子、引號、括號和一小組安全的標點符號。
- `--limit <n>`：正整數；預設為 `10`。
- `--order-by <column>:<asc|desc>`：在篩選後套用的記憶體內排序；排序欄位會自動包含在投影中。

代理程式也可以從啟用的記憶外掛取得 LanceDB 記憶工具：

- `memory_recall` 用於 LanceDB 支援的回溯
- `memory_store` 用於儲存重要事實、偏好、決策和實體
- `memory_forget` 用於移除相符的記憶

## 儲存

預設情況下，LanceDB 資料位於 `~/.openclaw/memory/lancedb` 之下。您可以使用 `dbPath` 覆寫路徑：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/memory/lancedb",
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

`storageOptions` 接受用於 LanceDB 儲存後端的字串鍵值對，並支援 `${ENV_VAR}` 擴充：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "s3://memory-bucket/openclaw",
          storageOptions: {
            access_key: "${AWS_ACCESS_KEY_ID}",
            secret_key: "${AWS_SECRET_ACCESS_KEY}",
            endpoint: "${AWS_ENDPOINT_URL}",
          },
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

## 執行階段相依性

`memory-lancedb` 相依於原生的 `@lancedb/lancedb` 套件。打包的 OpenClaw 將該套件視為外掛程式套件的一部分。Gateway 啟動不會修復外掛程式相依性；如果缺少相依性，請重新安裝或更新外掛程式套件並重新啟動 Gateway。

如果較舊的安裝在外掛程式載入期間記錄了缺少 `dist/package.json` 或缺少 `@lancedb/lancedb` 錯誤，請升級 OpenClaw 並重新啟動 Gateway。

如果外掛程式記錄指出 LanceDB 在 `darwin-x64` 上無法使用，請在該機器上使用預設記憶體後端，將 Gateway 移至支援的平台，或停用 `memory-lancedb`。

## 疑難排解

### 輸入長度超過內容長度

這通常表示嵌入模型拒絕了召回查詢：

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

設定較低的 `recallMaxChars`，然後重新啟動 Gateway：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        config: {
          recallMaxChars: 400,
        },
      },
    },
  },
}
```

對於 Ollama，還要驗證嵌入伺服器可從 Gateway 主機連線：

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### 不支援的嵌入模型

如果沒有 `dimensions`，則只會知道內建的 OpenAI 嵌入維度。對於本機或自訂嵌入模型，請將 `embedding.dimensions` 設定為該模型回報的向量大小。

### 外掛程式已載入但沒有記憶體出現

檢查 `plugins.slots.memory` 是否指向 `memory-lancedb`，然後執行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果停用了 `autoCapture`，外掛程式將會召回現有的記憶體，但不會自動儲存新的記憶體。如果您想要自動擷取，請使用 `memory_store` 工具或啟用 `autoCapture`。

## 相關

- [記憶體概觀](/zh-Hant/concepts/memory)
- [主動記憶體](/zh-Hant/concepts/active-memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)
- [記憶體 Wiki](/zh-Hant/plugins/memory-wiki)
- [Ollama](/zh-Hant/providers/ollama)

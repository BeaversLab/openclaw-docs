---
summary: "設定內建的 LanceDB 記憶體外掛，包括本地的 Ollama 相容嵌入"
read_when:
  - You are configuring the bundled memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "記憶體 LanceDB"
sidebarTitle: "記憶體 LanceDB"
---

`memory-lancedb` 是一個內建的記憶體外掛，將長期記憶儲存在
LanceDB 中並使用嵌入進行回憶。它可以在模型輪次之前自動回憶相關
記憶，並在回應之後捕獲重要事實。

當您需要為記憶體使用本地向量資料庫、需要
OpenAI 相容的嵌入端點，或希望將記憶體資料庫保留在
預設內建記憶體儲存之外時，請使用它。

<Note>`memory-lancedb` 是一個主動記憶體外掛。透過使用 `plugins.slots.memory = "memory-lancedb"` 選擇記憶體 槽來啟用它。諸如 `memory-wiki` 之類的伴隨外掛可以在其旁邊執行，但只有一個外掛擁有主動記憶體槽。</Note>

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

變更外掛設定後重新啟動 Gateway：

```bash
openclaw gateway restart
```

然後驗證外掛是否已載入：

```bash
openclaw plugins list
```

## 供應商支援的嵌入

`memory-lancedb` 可以使用與
`memory-core` 相同的記憶體嵌入供應商轉接器。設定 `embedding.provider` 並省略 `embedding.apiKey` 以使用
供應商設定的設定檔、環境變數或
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

此路徑適用於公開嵌入認證的供應商設定檔。
例如，當 Copilot 設定檔/方案支援
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

OpenAI Codex / ChatGPT OAuth (`openai-codex`) 不是 OpenAI Platform
嵌入認證。對於 OpenAI 嵌入，請使用 OpenAI API 金鑰認證設定檔、
`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`。僅限 OAuth 的使用者可以使用
其他支援嵌入的供應商，例如 GitHub Copilot 或 Ollama。

## Ollama 嵌入

對於 Ollama 嵌入，建議優先使用內建的 Ollama 嵌入供應商。它使用
原生的 Ollama `/api/embed` 端點，並遵循與 [Ollama](/zh-Hant/providers/ollama) 中記載的 Ollama 供應商相同的驗證/基底 URL 規則。

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

對於非標準嵌入模型，請設定 `dimensions`。OpenClaw 知道 `text-embedding-3-small` 和 `text-embedding-3-large` 的維度；自訂模型需要在設定中提供此值，以便 LanceDB 建立向量欄位。

對於小型本地嵌入模型，如果您從本地伺服器看到內容長度錯誤，請降低 `recallMaxChars`。

## OpenAI 相容供應商

某些 OpenAI 相容的嵌入供應商會拒絕 `encoding_format` 參數，而其他供應商則會忽略它並始終傳回 `number[]` 向量。因此，`memory-lancedb` 會在嵌入請求中省略 `encoding_format`，並接受浮點數陣列回應或 base64 編碼的 float32 回應。

如果您有一個原始的 OpenAI 相容嵌入端點，但沒有內建的提供者配接器，請省略 `embedding.provider`（或將其保留為 `openai`）並設定 `embedding.apiKey` 加上 `embedding.baseUrl`。這保留了直接的 OpenAI 相容客戶端路徑。

對於模型維度未內建的提供者，請設定 `embedding.dimensions`。例如，ZhiPu `embedding-3` 使用 `2048` 維度：

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

## 回憶和捕獲限制

`memory-lancedb` 有兩個獨立的文字限制：

| 設定              | 預設值 | 範圍      | 適用於                          |
| ----------------- | ------ | --------- | ------------------------------- |
| `recallMaxChars`  | `1000` | 100-10000 | 傳送至嵌入 API 以進行回憶的文字 |
| `captureMaxChars` | `500`  | 100-10000 | 符合擷取條件的助理訊息長度      |

`recallMaxChars` 控制自動召回、`memory_recall` 工具、
`memory_forget` 查詢路徑以及 `openclaw ltm search`。自動召回優先使用
對話輪次中最新的使用者訊息，且僅在沒有使用者訊息可用時才退回使用完整的提示詞。
這可以將頻道元資料和大型提示詞區塊排除在嵌入請求之外。

`captureMaxChars` 控制回應是否足夠短以被視為
符合自動擷取的條件。它不限制召回查詢的嵌入。

## 指令

當 `memory-lancedb` 是作用中的記憶外掛時，它會註冊 `ltm` CLI
命名空間：

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

該外掛還擴充了 `openclaw memory`，新增了一個針對 LanceDB 資料表直接執行的非向量 `query` 子指令：

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`：以逗號分隔的欄位允許清單（預設為 `id`、`text`、`importance`、`category`、`createdAt`）。
- `--filter <condition>`：SQL 風格的 WHERE 子句；限制為 200 個字元，且僅限於英數字元、比較運算子、引號、括號以及一小組安全的標點符號。
- `--limit <n>`：正整數；預設值 `10`。
- `--order-by <column>:<asc|desc>`：在篩選後套用的記憶體內排序；排序欄位會自動包含在投影中。

代理程式也會從作用中的記憶體外掛獲得 LanceDB 記憶體工具：

- `memory_recall` 用於 LanceDB 支援的召回
- `memory_store` 用於儲存重要事實、偏好設定、決策和實體
- `memory_forget` 用於移除符合的記憶

## 儲存

預設情況下，LanceDB 資料儲存在 `~/.openclaw/memory/lancedb` 下。使用
`dbPath` 覆蓋路徑：

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

`storageOptions` 接受字串鍵值對用於 LanceDB 儲存後端，並
支援 `${ENV_VAR}` 展開：

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

## 執行時期依賴

`memory-lancedb` 取決於原生的 `@lancedb/lancedb` 套件。打包後
的 OpenClaw 將該套件視為外掛程式套件的一部分。Gateway 啟動
不會修復外掛程式依賴；如果缺少依賴，請重新安裝或
更新外掛程式套件並重新啟動 Gateway。

如果較舊的安裝在載入外掛時記錄了遺失 `dist/package.json` 或遺失
`@lancedb/lancedb` 錯誤，請升級 OpenClaw 並重新啟動
Gateway。

如果外掛記錄顯示 LanceDB 在 `darwin-x64` 上無法使用，請在該機器上使用預設
記憶體後端，將 Gateway 移至支援的平台，或
disable `memory-lancedb`。

## 疑難排解

### 輸入長度超過內容長度

這通常意味著嵌入模型拒絕了召回查詢：

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

對於 Ollama，還要驗證嵌入伺服器是否可從 Gateway 主機存取：

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### 不支援的嵌入模型

如果沒有 `dimensions`，則僅知道內建 OpenAI 嵌入維度。
對於本機或自訂嵌入模型，請將 `embedding.dimensions` 設定為該模型報告的向量
大小。

### 外掛程式已載入但沒有顯示記憶

檢查 `plugins.slots.memory` 是否指向 `memory-lancedb`，然後執行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果停用了 `autoCapture`，外掛程式將會召回現有的記憶，但不會自動儲存新的記憶。如果您想要自動擷取，請使用 `memory_store` 工具或啟用 `autoCapture`。

## 相關

- [記憶概覽](/zh-Hant/concepts/memory)
- [主動記憶](/zh-Hant/concepts/active-memory)
- [記憶搜尋](/zh-Hant/concepts/memory-search)
- [記憶 Wiki](/zh-Hant/plugins/memory-wiki)
- [Ollama](/zh-Hant/providers/ollama)

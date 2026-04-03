---
title: "記憶體配置參考"
summary: "記憶體搜尋、嵌入提供者、QMD、混合搜尋和多模態索引的所有配置選項"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# 記憶體配置參考

本頁面列出了 OpenClaw 記憶體搜尋的所有配置選項。若需概念性概覽，請參閱：

- [記憶體概觀](/en/concepts/memory) -- 記憶體的運作方式
- [內建引擎](/en/concepts/memory-builtin) -- 預設 SQLite 後端
- [QMD 引擎](/en/concepts/memory-qmd) -- 本地優先的 sidecar
- [記憶體搜尋](/en/concepts/memory-search) -- 搜尋管道與調校

除非另有說明，所有記憶體搜尋設定都位於 `agents.defaults.memorySearch` 中的
`openclaw.json` 之下。

---

## 提供者選擇

| 鍵         | 類型      | 預設值       | 說明                                                                      |
| ---------- | --------- | ------------ | ------------------------------------------------------------------------- |
| `provider` | `string`  | 自動偵測     | 嵌入介面卡 ID：`openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` |
| `model`    | `string`  | 提供者預設值 | 嵌入模型名稱                                                              |
| `fallback` | `string`  | `"none"`     | 主要介面卡失敗時的後備介面卡 ID                                           |
| `enabled`  | `boolean` | `true`       | 啟用或停用記憶體搜尋                                                      |

### 自動偵測順序

當未設定 `provider` 時，OpenClaw 會選擇第一個可用的：

1. `local` -- 如果已設定 `memorySearch.local.modelPath` 且檔案存在。
2. `openai` -- 如果可以解析 OpenAI 金鑰。
3. `gemini` -- 如果可以解析 Gemini 金鑰。
4. `voyage` -- 如果可以解析 Voyage 金鑰。
5. `mistral` -- 如果可以解析 Mistral 金鑰。

支援 `ollama`，但不會自動偵測（請明確設定）。

### API 金鑰解析

遠端嵌入需要 API 金鑰。OpenClaw 會從：
設定檔、`models.providers.*.apiKey` 或環境變數中解析。

| 提供者  | 環境變數                       | 設定金鑰                          |
| ------- | ------------------------------ | --------------------------------- |
| OpenAI  | `OPENAI_API_KEY`               | `models.providers.openai.apiKey`  |
| Gemini  | `GEMINI_API_KEY`               | `models.providers.google.apiKey`  |
| Voyage  | `VOYAGE_API_KEY`               | `models.providers.voyage.apiKey`  |
| Mistral | `MISTRAL_API_KEY`              | `models.providers.mistral.apiKey` |
| Ollama  | `OLLAMA_API_KEY` (placeholder) | --                                |

Codex OAuth 僅涵蓋聊天/補全功能，不滿足嵌入請求。

---

## 遠端端點設定

針對自訂 OpenAI 相容端點或覆寫提供者預設值：

| 金鑰             | 類型     | 說明                                 |
| ---------------- | -------- | ------------------------------------ |
| `remote.baseUrl` | `string` | 自訂 API 基礎 URL                    |
| `remote.apiKey`  | `string` | 覆寫 API 金鑰                        |
| `remote.headers` | `object` | 額外 HTTP 標頭（與提供者預設值合併） |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
        remote: {
          baseUrl: "https://api.example.com/v1/",
          apiKey: "YOUR_KEY",
        },
      },
    },
  },
}
```

---

## Gemini 特定設定

| 金鑰                   | 類型     | 預設值                 | 說明                                  |
| ---------------------- | -------- | ---------------------- | ------------------------------------- |
| `model`                | `string` | `gemini-embedding-001` | 同時支援 `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | 針對 Embedding 2：768、1536 或 3072   |

<Warning>變更模型或 `outputDimensionality` 會觸發自動的完整重新索引。</Warning>

---

## 本機嵌入設定

| 金鑰                  | 類型     | 預設值                | 說明                 |
| --------------------- | -------- | --------------------- | -------------------- |
| `local.modelPath`     | `string` | 自動下載              | GGUF 模型檔案的路徑  |
| `local.modelCacheDir` | `string` | node-llama-cpp 預設值 | 已下載模型的快取目錄 |

預設模型：`embeddinggemma-300m-qat-Q8_0.gguf`（約 0.6 GB，自動下載）。
需要原生編譯：`pnpm approve-builds` 然後執行 `pnpm rebuild node-llama-cpp`。

---

## 混合搜尋設定

全部位於 `memorySearch.query.hybrid` 之下：

| 金鑰                  | 類型      | 預設值 | 說明                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 啟用混合 BM25 + 向量搜尋 |
| `vectorWeight`        | `number`  | `0.7`  | 向量評分權重 (0-1)       |
| `textWeight`          | `number`  | `0.3`  | BM25 評分權重 (0-1)      |
| `candidateMultiplier` | `number`  | `4`    | 候選池大小乘數           |

### MMR (多樣性)

| 金鑰          | 類型      | 預設值  | 說明                           |
| ------------- | --------- | ------- | ------------------------------ |
| `mmr.enabled` | `boolean` | `false` | 啟用 MMR 重新排序              |
| `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多樣性，1 = 最大相關性 |

### 時間衰減 (近期性)

| 金鑰                         | 類型      | 預設值  | 說明            |
| ---------------------------- | --------- | ------- | --------------- |
| `temporalDecay.enabled`      | `boolean` | `false` | 啟用近期性加成  |
| `temporalDecay.halfLifeDays` | `number`  | `30`    | 評分每 N 天減半 |

常青檔案 (`MEMORY.md`，`memory/` 中的非日期檔案) 永遠不會衰減。

### 完整範例

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            vectorWeight: 0.7,
            textWeight: 0.3,
            mmr: { enabled: true, lambda: 0.7 },
            temporalDecay: { enabled: true, halfLifeDays: 30 },
          },
        },
      },
    },
  },
}
```

---

## 額外的記憶路徑

| 金鑰         | 類型       | 說明                       |
| ------------ | ---------- | -------------------------- |
| `extraPaths` | `string[]` | 要建立索引的其他目錄或檔案 |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        extraPaths: ["../team-docs", "/srv/shared-notes"],
      },
    },
  },
}
```

路徑可以是絕對路徑或相對於工作區的路徑。目錄會遞迴掃描 `.md` 檔案。符號連結的處理取決於活動的後端：
內建引擎會忽略符號連結，而 QMD 則遵循底層 QMD
掃描器的行為。

對於代理範圍的跨代理對話記錄搜尋，請使用
`agents.list[].memorySearch.qmd.extraCollections` 而非 `memory.qmd.paths`。
這些額外的集合遵循相同的 `{ path, name, pattern? }` 結構，但
它們會依代理合併，且當路徑指向目前工作區外時，可以保留明確的共用名稱。
如果相同的解析路徑同時出現在 `memory.qmd.paths` 和
`memorySearch.qmd.extraCollections` 中，QMD 會保留第一個項目並跳過
重複項目。

---

## 多模態記憶 (Gemini)

使用 Gemini Embedding 2 將圖片和音訊與 Markdown 一起建立索引：

| 金鑰                      | 類型       | 預設值     | 說明                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 啟用多模態索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的最大檔案大小                    |

僅適用於 `extraPaths` 中的檔案。預設記憶體根目錄僅限 Markdown。
需要 `gemini-embedding-2-preview`。`fallback` 必須為 `"none"`。

支援格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`
（圖片）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音訊）。

---

## 嵌入快取

| 鍵                 | 類型      | 預設值  | 描述                     |
| ------------------ | --------- | ------- | ------------------------ |
| `cache.enabled`    | `boolean` | `false` | 在 SQLite 中快取區塊嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大快取嵌入數量         |

防止在重新索引或逐字稿更新時對未變更的文字進行重新嵌入。

---

## 批次索引

| 鍵                            | 類型      | 預設值  | 描述             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.batch.enabled`        | `boolean` | `false` | 啟用批次嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 並行批次工作     |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批次完成     |
| `remote.batch.pollIntervalMs` | `number`  | --      | 輪詢間隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批次逾時         |

適用於 `openai`、`gemini` 和 `voyage`。對於大量補填，OpenAI 批次通常是最快且最經濟的選擇。

---

## 會話記憶體搜尋（實驗性）

為會話紀錄建立索引並透過 `memory_search` 呈現：

| Key                           | Type       | 預設值       | 說明                         |
| ----------------------------- | ---------- | ------------ | ---------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 啟用會話索引                 |
| `sources`                     | `string[]` | `["memory"]` | 新增 `"sessions"` 以包含紀錄 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的位元組閾值         |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的訊息閾值           |

會話索引為選用功能，並以非同步方式執行。結果可能會略有過時。會話紀錄儲存在磁碟上，因此請將檔案系統存取視為信任邊界。

---

## SQLite 向量加速 (sqlite-vec)

| Key                          | Type      | 預設值  | 說明                         |
| ---------------------------- | --------- | ------- | ---------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 進行向量查詢 |
| `store.vector.extensionPath` | `string`  | bundled | 覆寫 sqlite-vec 路徑         |

當無法使用 sqlite-vec 時，OpenClaw 會自動回退到程序內的餘弦相似度計算。

---

## 索引儲存

| Key                   | Type     | 預設值                                | 說明                                    |
| --------------------- | -------- | ------------------------------------- | --------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支援 `{agentId}` 權杖）       |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 分詞器（`unicode61` 或 `trigram`） |

---

## QMD 後端設定

設定 `memory.backend = "qmd"` 以啟用。所有 QMD 設定都位於 `memory.qmd` 之下：

| Key                      | Type      | 預設值   | 說明                                    |
| ------------------------ | --------- | -------- | --------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可執行檔路徑                        |
| `searchMode`             | `string`  | `search` | 搜尋指令：`search`、`vsearch`、`query`  |
| `includeDefaultMemory`   | `boolean` | `true`   | 自動索引 `MEMORY.md` + `memory/**/*.md` |
| `paths[]`                | `array`   | --       | 額外路徑：`{ name, path, pattern? }`    |
| `sessions.enabled`       | `boolean` | `false`  | 索引會話逐字稿                          |
| `sessions.retentionDays` | `number`  | --       | 逐字稿保留                              |
| `sessions.exportDir`     | `string`  | --       | 匯出目錄                                |

### 更新排程

| 金鑰                      | 類型      | 預設值  | 說明                   |
| ------------------------- | --------- | ------- | ---------------------- |
| `update.interval`         | `string`  | `5m`    | 重新整理間隔           |
| `update.debounceMs`       | `number`  | `15000` | 檔案變更防抖           |
| `update.onBoot`           | `boolean` | `true`  | 啟動時重新整理         |
| `update.waitForBootSync`  | `boolean` | `false` | 重新整理完成前封鎖啟動 |
| `update.embedInterval`    | `string`  | --      | 分離嵌入頻率           |
| `update.commandTimeoutMs` | `number`  | --      | QMD 指令逾時           |

### 限制

| 金鑰                      | 類型     | 預設值 | 說明             |
| ------------------------- | -------- | ------ | ---------------- |
| `limits.maxResults`       | `number` | `6`    | 最大搜尋結果數   |
| `limits.maxSnippetChars`  | `number` | --     | 限制摘要長度     |
| `limits.maxInjectedChars` | `number` | --     | 限制總插入字元數 |
| `limits.timeoutMs`        | `number` | `4000` | 搜尋逾時         |

### 範圍

控制哪些會話可以接收 QMD 搜尋結果。架構與
[`session.sendPolicy`](/en/gateway/configuration-reference#session) 相同：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

預設僅限 DM。`match.keyPrefix` 符合正規化會話金鑰；
`match.rawKeyPrefix` 符合包含 `agent:<id>:` 的原始金鑰。

### 引用

`memory.citations` 適用於所有後端：

| 數值          | 行為                                    |
| ------------- | --------------------------------------- |
| `auto` (預設) | 在摘要中包含 `Source: <path#line>` 頁尾 |
| `on`          | 一律包含頁尾                            |
| `off`         | 省略頁尾 (路徑仍會在內部傳遞給代理程式) |

### 完整 QMD 範例

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 6, timeoutMs: 4000 },
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

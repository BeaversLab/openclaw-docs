---
title: "Memory 配置參考"
summary: "Memory 搜尋、embedding 提供者、QMD、混合搜尋和多模態索引的所有配置選項"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# 記憶體配置參考

本頁面列出了 OpenClaw 記憶體搜尋的所有配置選項。若需概念性概覽，請參閱：

- [Memory 概觀](/en/concepts/memory) -- Memory 的運作方式
- [內建引擎](/en/concepts/memory-builtin) -- 預設 SQLite 後端
- [QMD 引擎](/en/concepts/memory-qmd) -- 本地優先的 sidecar
- [Memory 搜尋](/en/concepts/memory-search) -- 搜尋管線與調整

除非另有說明，否則所有 Memory 搜尋設定都位於 `agents.defaults.memorySearch` 中的
`openclaw.json` 下。

---

## 提供者選擇

| 鍵         | 類型      | 預設值       | 說明                                                                                       |
| ---------- | --------- | ------------ | ------------------------------------------------------------------------------------------ |
| `provider` | `string`  | 自動偵測     | Embedding 介面卡 ID：`openai`、`gemini`、`voyage`、`mistral`、`bedrock`、`ollama`、`local` |
| `model`    | `string`  | 提供者預設值 | 嵌入模型名稱                                                                               |
| `fallback` | `string`  | `"none"`     | 主要介面卡失敗時的後備介面卡 ID                                                            |
| `enabled`  | `boolean` | `true`       | 啟用或停用記憶體搜尋                                                                       |

### 自動偵測順序

當未設定 `provider` 時，OpenClaw 會選擇第一個可用的項目：

1. `local` -- 如果已設定 `memorySearch.local.modelPath` 且檔案存在。
2. `openai` -- 如果可以解析 OpenAI 金鑰。
3. `gemini` -- 如果可以解析 Gemini 金鑰。
4. `voyage` -- 如果可以解析 Voyage 金鑰。
5. `mistral` -- 如果可以解析 Mistral 金鑰。
6. `bedrock` -- 如果 AWS SDK 憑證鏈解析成功 (執行個體角色、存取金鑰、設定檔、SSO、Web 身分或共用設定)。

支援 `ollama` 但不會自動偵測 (須明確設定)。

### API 金鑰解析

遠端 embeddings 需要 API 金鑰。Bedrock 則改用 AWS SDK 預設
憑證鏈 (執行個體角色、SSO、存取金鑰)。

| 提供者  | 環境變數                       | 設定金鑰                          |
| ------- | ------------------------------ | --------------------------------- |
| OpenAI  | `OPENAI_API_KEY`               | `models.providers.openai.apiKey`  |
| Gemini  | `GEMINI_API_KEY`               | `models.providers.google.apiKey`  |
| Voyage  | `VOYAGE_API_KEY`               | `models.providers.voyage.apiKey`  |
| Mistral | `MISTRAL_API_KEY`              | `models.providers.mistral.apiKey` |
| Bedrock | AWS 憑證鏈                     | 不需要 API 金鑰                   |
| Ollama  | `OLLAMA_API_KEY` (placeholder) | --                                |

Codex OAuth 僅涵蓋聊天/完成，無法滿足嵌入請求。

---

## 遠端端點配置

針對自訂 OpenAI 相容端點或覆寫提供者預設值：

| 金鑰             | 類型     | 說明                                  |
| ---------------- | -------- | ------------------------------------- |
| `remote.baseUrl` | `string` | 自訂 API 基礎 URL                     |
| `remote.apiKey`  | `string` | 覆寫 API 金鑰                         |
| `remote.headers` | `object` | 額外的 HTTP 標頭 (與提供者預設值合併) |

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

## Gemini 特定配置

| 金鑰                   | 類型     | 預設值                 | 說明                                |
| ---------------------- | -------- | ---------------------- | ----------------------------------- |
| `model`                | `string` | `gemini-embedding-001` | 也支援 `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | 對於 Embedding 2：768、1536 或 3072 |

<Warning>變更模型或 `outputDimensionality` 會觸發自動完全重新索引。</Warning>

---

## Bedrock 嵌入配置

Bedrock 使用 AWS SDK 預設憑證鏈 — 不需要 API 金鑰。
如果 OpenClaw 在 EC2 上透過具備 Bedrock 啟用角色的執行個體運作，只需設定
提供者和模型：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0",
      },
    },
  },
}
```

| 金鑰                   | 類型     | 預設值                         | 說明                            |
| ---------------------- | -------- | ------------------------------ | ------------------------------- |
| `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID        |
| `outputDimensionality` | `number` | 模型預設值                     | 對於 Titan V2：256、512 或 1024 |

### 支援的模型

支援以下模型 (具備系列偵測和維度
預設值)：

| 模型 ID                                    | 提供者     | 預設維度 | 可配置維度           |
| ------------------------------------------ | ---------- | -------- | -------------------- |
| `amazon.titan-embed-text-v2:0`             | Amazon     | 1024     | 256, 512, 1024       |
| `amazon.titan-embed-text-v1`               | Amazon     | 1536     | --                   |
| `amazon.titan-embed-g1-text-02`            | Amazon     | 1536     | --                   |
| `amazon.titan-embed-image-v1`              | Amazon     | 1024     | --                   |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024     | 256, 384, 1024, 3072 |
| `cohere.embed-english-v3`                  | Cohere     | 1024     | --                   |
| `cohere.embed-multilingual-v3`             | Cohere     | 1024     | --                   |
| `cohere.embed-v4:0`                        | Cohere     | 1536     | 256-1536             |
| `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512      | --                   |
| `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024     | --                   |

Throughput-suffixed variants (e.g., `amazon.titan-embed-text-v1:2:8k`) inherit
the base model's configuration.

### 驗證

Bedrock 驗證使用標準 AWS SDK 憑證解析順序：

1. 環境變數 (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
2. SSO 權杖快取
3. Web 身份權杖憑證
4. 共用的憑證與設定檔
5. ECS 或 EC2 元資料憑證

區域 會從 `AWS_REGION`、`AWS_DEFAULT_REGION`、
`amazon-bedrock` 提供者的 `baseUrl` 解析，或預設為 `us-east-1`。

### IAM 權限

IAM 角色或使用者需要：

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

為了遵循最小權限原則，請將 `InvokeModel` 的範圍限定為特定模型：

```
arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
```

---

## 本地嵌入配置

| 金鑰                  | 類型     | 預設值                | 描述                |
| --------------------- | -------- | --------------------- | ------------------- |
| `local.modelPath`     | `string` | 自動下載              | GGUF 模型檔案的路徑 |
| `local.modelCacheDir` | `string` | node-llama-cpp 預設值 | 下載模型的快取目錄  |

預設模型：`embeddinggemma-300m-qat-Q8_0.gguf` (約 0.6 GB，自動下載)。
需要原生建置：`pnpm approve-builds` 然後 `pnpm rebuild node-llama-cpp`。

---

## 混合搜尋配置

所有皆位於 `memorySearch.query.hybrid` 下：

| 金鑰                  | 類型      | 預設值 | 描述                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 啟用混合 BM25 + 向量搜尋 |
| `vectorWeight`        | `number`  | `0.7`  | 向量分數的權重 (0-1)     |
| `textWeight`          | `number`  | `0.3`  | BM25 分數的權重 (0-1)    |
| `candidateMultiplier` | `number`  | `4`    | 候選池大小倍數           |

### MMR (多樣性)

| 金鑰          | 類型      | 預設值  | 說明                           |
| ------------- | --------- | ------- | ------------------------------ |
| `mmr.enabled` | `boolean` | `false` | 啟用 MMR 重新排序              |
| `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多樣性，1 = 最大相關性 |

### 時間衰減（近期性）

| 金鑰                         | 類型      | 預設值  | 說明            |
| ---------------------------- | --------- | ------- | --------------- |
| `temporalDecay.enabled`      | `boolean` | `false` | 啟用近期性加權  |
| `temporalDecay.halfLifeDays` | `number`  | `30`    | 分數每 N 天減半 |

常青檔案（`MEMORY.md`，即 `memory/` 中非日期檔案）永不衰減。

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

| 金鑰         | 類型       | 說明                   |
| ------------ | ---------- | ---------------------- |
| `extraPaths` | `string[]` | 要索引的額外目錄或檔案 |

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

路徑可以是絕對路徑或相對於工作區的路徑。目錄會遞迴掃描 `.md` 檔案。符號連結的處理方式取決於活動的後端：
內建引擎會忽略符號連結，而 QMD 則遵循底層 QMD
掃描器的行為。

對於代理範圍的跨代理記錄搜尋，請使用
`agents.list[].memorySearch.qmd.extraCollections` 而非 `memory.qmd.paths`。
這些額外的集合遵循相同的 `{ path, name, pattern? }` 結構，但
它們會依代理合併，並且當路徑
指向目前工作區之外時，可以保留明確的共用名稱。
如果相同的解析路徑同時出現在 `memory.qmd.paths` 和
`memorySearch.qmd.extraCollections` 中，QMD 會保留第一個項目並跳過重複的項目。

---

## 多模態記憶 (Gemini)

使用 Gemini Embedding 2 將圖片和音訊與 Markdown 一起索引：

| 金鑰                      | 類型       | 預設值     | 說明                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 啟用多模態索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的檔案大小上限                    |

僅適用於 `extraPaths` 中的檔案。預設記憶體根目錄僅限 Markdown。
需要 `gemini-embedding-2-preview`。`fallback` 必須為 `"none"`。

支援的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`
（影像）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音訊）。

---

## 嵌入快取

| 鍵                 | 類型      | 預設值  | 說明                     |
| ------------------ | --------- | ------- | ------------------------ |
| `cache.enabled`    | `boolean` | `false` | 在 SQLite 中快取區塊嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大快取嵌入數           |

防止在重新索引或逐字稿更新時對未變更的文字重新嵌入。

---

## 批次索引

| 鍵                            | 類型      | 預設值  | 說明             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.batch.enabled`        | `boolean` | `false` | 啟用批次嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 並行批次作業     |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批次完成     |
| `remote.batch.pollIntervalMs` | `number`  | --      | 輪詢間隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批次逾時         |

適用於 `openai`、`gemini` 和 `voyage`。對於大量補填，OpenAI 批次通常是最快且最便宜的選擇。

---

## 會話記憶體搜尋（實驗性）

索引會話逐字稿並透過 `memory_search` 顯示：

| 鍵                            | 類型       | 預設值       | 說明                           |
| ----------------------------- | ---------- | ------------ | ------------------------------ |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 啟用工作階段索引               |
| `sources`                     | `string[]` | `["memory"]` | 新增 `"sessions"` 以包含逐字稿 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的位元組閾值           |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的訊息閾值             |

工作階段索引為選用功能，並以非同步方式執行。結果可能會有輕微
滯後。工作階段記錄儲存在磁碟上，因此請將檔案系統存取視為信任
邊界。

---

## SQLite 向量加速 (sqlite-vec)

| 索引鍵                       | 類型      | 預設值  | 說明                         |
| ---------------------------- | --------- | ------- | ---------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 進行向量查詢 |
| `store.vector.extensionPath` | `string`  | bundled | 覆寫 sqlite-vec 路徑         |

當 sqlite-vec 無法使用時，OpenClaw 會自動回退至程序內餘弦
相似度計算。

---

## 索引儲存

| 金鑰                  | 類型     | 預設值                                | 說明                                   |
| --------------------- | -------- | ------------------------------------- | -------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置 (支援 `{agentId}` 權杖)       |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 分詞器 (`unicode61` 或 `trigram`) |

---

## QMD 後端設定

設定 `memory.backend = "qmd"` 以啟用。所有 QMD 設定都位於
`memory.qmd` 之下：

| 索引鍵                   | 類型      | 預設值   | 說明                                    |
| ------------------------ | --------- | -------- | --------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 執行檔路徑                          |
| `searchMode`             | `string`  | `search` | 搜尋指令：`search`、`vsearch`、`query`  |
| `includeDefaultMemory`   | `boolean` | `true`   | 自動索引 `MEMORY.md` + `memory/**/*.md` |
| `paths[]`                | `array`   | --       | 額外路徑：`{ name, path, pattern? }`    |
| `sessions.enabled`       | `boolean` | `false`  | 索引會話記錄                            |
| `sessions.retentionDays` | `number`  | --       | 記錄保留                                |
| `sessions.exportDir`     | `string`  | --       | 匯出目錄                                |

OpenClaw 偏好使用目前的 QMD 集合和 MCP 查詢結構，但會透過回退到舊版 `--mask` 集合旗標
和較舊的 MCP 工具名稱，讓較舊的 QMD 版本繼續運作。

QMD 模型覆寫保留在 QMD 端，而非 OpenClaw 設定。如果您需要
全域覆寫 QMD 的模型，請在 gateway
執行階段環境中設定環境變數，例如
`QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。

### 更新排程

| 索引鍵                    | 類型      | 預設值  | 說明                   |
| ------------------------- | --------- | ------- | ---------------------- |
| `update.interval`         | `string`  | `5m`    | 重新整理間隔           |
| `update.debounceMs`       | `number`  | `15000` | 檔案變更防抖           |
| `update.onBoot`           | `boolean` | `true`  | 啟動時重新整理         |
| `update.waitForBootSync`  | `boolean` | `false` | 重新整理完成前封鎖啟動 |
| `update.embedInterval`    | `string`  | --      | 分離嵌入頻率           |
| `update.commandTimeoutMs` | `number`  | --      | QMD 指令逾時           |
| `update.updateTimeoutMs`  | `number`  | --      | QMD 更新作業逾時       |
| `update.embedTimeoutMs`   | `number`  | --      | QMD 嵌入作業逾時       |

### 限制

| 索引鍵                    | 類型     | 預設值 | 說明             |
| ------------------------- | -------- | ------ | ---------------- |
| `limits.maxResults`       | `number` | `6`    | 最大搜尋結果數   |
| `limits.maxSnippetChars`  | `number` | --     | 限制片段長度     |
| `limits.maxInjectedChars` | `number` | --     | 限制總注入字元數 |
| `limits.timeoutMs`        | `number` | `4000` | 搜尋逾時         |

### 範圍

控制哪些會話可以接收 QMD 搜尋結果。Schema 與
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

預設僅限 DM。`match.keyPrefix` 符合正規化的會話鍵；
`match.rawKeyPrefix` 符合包含 `agent:<id>:` 的原始鍵。

### 引用

`memory.citations` 適用於所有後端：

| 值            | 行為                                    |
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

---

## 夢境 (實驗性)

夢境是在 `plugins.entries.memory-core.config.dreaming` 下設定，
而非在 `agents.defaults.memorySearch` 下。

夢境作為一個排定的掃描運作，並使用內部的輕睡/深睡/REM 階段作為實作細節。

關於概念行為和斜線指令，請參閱 [夢境](/en/concepts/dreaming)。

### 使用者設定

| 鍵          | 類型      | 預設        | 描述                         |
| ----------- | --------- | ----------- | ---------------------------- |
| `enabled`   | `boolean` | `false`     | 完全啟用或停用夢境           |
| `frequency` | `string`  | `0 3 * * *` | 完整夢境掃描的選用 cron 頻率 |

### 範例

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
          },
        },
      },
    },
  },
}
```

備註：

- 夢境會將機器狀態寫入 `memory/.dreams/`。
- 夢境會將人類可讀的敘述輸出寫入 `DREAMS.md` (或現有的 `dreams.md`)。
- 輕睡/深睡/REM 階段策略和閾值是內部行為，並非使用者可見的設定。

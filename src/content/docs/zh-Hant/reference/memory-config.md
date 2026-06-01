---
summary: "記憶體搜尋、嵌入供應商、QMD、混合搜尋和多模態索引的所有配置選項"
title: "記憶體配置參考"
sidebarTitle: "記憶體配置"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

本頁列出了 OpenClaw 記憶體搜尋的所有配置選項。如需概念概覽，請參閱：

<CardGroup cols={2}>
  <Card title="記憶體概覽" href="/zh-Hant/concepts/memory">
    記憶體的運作方式。
  </Card>
  <Card title="內建引擎" href="/zh-Hant/concepts/memory-builtin">
    預設 SQLite 後端。
  </Card>
  <Card title="QMD 引擎" href="/zh-Hant/concepts/memory-qmd">
    本地優先的 sidecar。
  </Card>
  <Card title="記憶體搜尋" href="/zh-Hant/concepts/memory-search">
    搜尋管線與調優。
  </Card>
  <Card title="主動記憶" href="/zh-Hant/concepts/active-memory">
    用於互動式會話的記憶體子代理程式。
  </Card>
</CardGroup>

除非另有說明，否則所有記憶體搜尋設定都位於 `openclaw.json` 中的 `agents.defaults.memorySearch` 之下。

<Note>
如果您正在尋找 **主動記憶體** 功能切換和子代理程式配置，它位於 `plugins.entries.active-memory` 而非 `memorySearch`。

主動記憶體使用雙閘道模型：

1. 外掛程式必須已啟用並且以目前的代理程式 ID 為目標
2. 請求必須是符合條件的互動式持續聊天工作階段

請參閱 [主動記憶體](/zh-Hant/concepts/active-memory) 以了解啟用模型、外掛程式擁有的配置、逐字稿持久性以及安全推出模式。

</Note>

---

## 提供者選擇

| 鍵         | 類型      | 預設值       | 描述                                                                                                                                                                                                                                           |
| ---------- | --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | `"openai"`   | 嵌入適配器 ID，例如 `bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、`openai-compatible` 或 `voyage`；也可以是已配置的 `models.providers.<id>`，其 `api` 指向記憶體嵌入適配器或 OpenAI 相容模型 API |
| `model`    | `string`  | 提供者預設值 | 嵌入模型名稱                                                                                                                                                                                                                                   |
| `fallback` | `string`  | `"none"`     | 當主要適配器失敗時的後備適配器 ID                                                                                                                                                                                                              |
| `enabled`  | `boolean` | `true`       | 啟用或停用記憶體搜尋                                                                                                                                                                                                                           |

當未設定 `provider` 時，OpenClaw 使用 OpenAI 嵌入。明確設定 `provider` 以使用 Gemini、Voyage、Mistral、DeepInfra、Bedrock、GitHub Copilot、Ollama、本地 GGUF 模型或 OpenAI 相容的 `/v1/embeddings` 端點。
仍顯示 `provider: "auto"` 的舊版配置會解析為 `openai`。

### 自訂供應商 ID

`memorySearch.provider` 可以指向自訂的 `models.providers.<id>` 項目，用於記憶體專用的提供者配接器（例如 `ollama`），或是用於 OpenAI 相容的模型 API（例如 `openai-responses` / `openai-completions`）。OpenClaw 會為該嵌入配接器解析該提供者的 `api` 擁有者，同時保留自訂提供者 ID 以用於端點、身份驗證和模型前綴處理。這讓多 GPU 或多主機設定能將記憶體嵌入專門用於特定的本地端點：

```json5
{
  models: {
    providers: {
      "ollama-5080": {
        api: "ollama",
        baseUrl: "http://gpu-box.local:11435",
        apiKey: "ollama-local",
        models: [{ id: "qwen3-embedding:0.6b" }],
      },
    },
  },
  agents: {
    defaults: {
      memorySearch: {
        provider: "ollama-5080",
        model: "qwen3-embedding:0.6b",
      },
    },
  },
}
```

### API 金鑰解析

遠端嵌入需要 API 金鑰。Bedrock 則改用 AWS SDK 的預設憑證鏈（例如此例角色、SSO、存取金鑰）。

| 提供者         | 環境變數                                           | 設定鍵                              |
| -------------- | -------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS 憑證鏈                                         | 不需要 API 金鑰                     |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | 透過裝置登入進行驗證設定檔          |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY` (placeholder)                     | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`    |

<Note>Codex OAuth 僅涵蓋聊天/完成功能，無法滿足嵌入要求。</Note>

---

## 遠端端點設定

針對不應繼承全域 OpenAI 聊天憑證的一般 OpenAI 相容
`/v1/embeddings` 伺服器，請使用 `provider: "openai-compatible"`。

<ParamField path="remote.baseUrl" type="string">
  自訂 API 基礎 URL。
</ParamField>
<ParamField path="remote.apiKey" type="string">
  覆寫 API 金鑰。
</ParamField>
<ParamField path="remote.headers" type="object">
  額外的 HTTP 標頭（與提供者預設值合併）。
</ParamField>

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai-compatible",
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

## 提供者專用設定

<AccordionGroup>
  <Accordion title="Gemini">
    | 鍵                    | 類型     | 預設值                | 描述                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | 也支援 `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | 針對 Embedding 2：768、1536 或 3072        |

    <Warning>
    變更模型或 `outputDimensionality` 會觸發自動的完整重新索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAI-compatible input types">
    相容 OpenAI 的嵌入端點可以選擇使用供應商特定的 `input_type` 請求欄位。這對於需要針對查詢和文件嵌入使用不同標籤的非對稱嵌入模型非常有用。

    | 鍵                 | 類型     | 預設值 | 描述                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | 未設定   | 查詢和文件嵌入的共用 `input_type`   |
    | `queryInputType`    | `string` | 未設定   | 查詢時的 `input_type`；覆寫 `inputType`          |
    | `documentInputType` | `string` | 未設定   | 索引/文件的 `input_type`；覆寫 `inputType`      |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai-compatible",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "${EMBEDDINGS_API_KEY}",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    變更這些數值會影響供應商批次索引的嵌入快取身份，且當上游模型對標籤的處理方式不同時，應接著執行記憶體重新索引。

  </Accordion>
  <Accordion title="Bedrock">
    ### Bedrock 嵌入配置

    Bedrock 使用 AWS SDK 預設憑證鏈 — 不需要 API 金鑰。如果 OpenClaw 在 EC2 上運行並具備啟用 Bedrock 的執行個體角色，只需設定提供者和模型：

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

    | 鍵                    | 類型     | 預設值                        | 描述                     |
    | ---------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID  |
    | `outputDimensionality` | `number` | 模型預設值                  | 針對 Titan V2：256、512 或 1024 |

    **支援的模型**（包含系列偵測與維度預設值）：

    | 模型 ID                                   | 提供者   | 預設維度 | 可設定維度    |
    | ------------------------------------------ | ---------- | ------------ | -------------------- |
    | `amazon.titan-embed-text-v2:0`             | Amazon     | 1024         | 256, 512, 1024       |
    | `amazon.titan-embed-text-v1`               | Amazon     | 1536         | --                   |
    | `amazon.titan-embed-g1-text-02`            | Amazon     | 1536         | --                   |
    | `amazon.titan-embed-image-v1`              | Amazon     | 1024         | --                   |
    | `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024         | 256, 384, 1024, 3072 |
    | `cohere.embed-english-v3`                  | Cohere     | 1024         | --                   |
    | `cohere.embed-multilingual-v3`             | Cohere     | 1024         | --                   |
    | `cohere.embed-v4:0`                        | Cohere     | 1536         | 256-1536             |
    | `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512          | --                   |
    | `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024         | --                   |

    帶輸送量後綴的變體（例如 `amazon.titan-embed-text-v1:2:8k`）會繼承基礎模型的設定。

    **驗證：** Bedrock 驗證使用標準 AWS SDK 憑證解析順序：

    1. 環境變數（`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`）
    2. SSO token 快取
    3. Web 身份 token 憑證
    4. 共用憑證與設定檔
    5. ECS 或 EC2 metadata 憑證

    區域是從 `AWS_REGION`、`AWS_DEFAULT_REGION`、`amazon-bedrock` 提供者 `baseUrl` 解析，或預設為 `us-east-1`。

    **IAM 權限：** IAM 角色或使用者需要：

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    若要遵循最小權限原則，請將 `InvokeModel` 範圍限縮至特定模型：

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="Local (GGUF + node-llama-cpp)">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | auto-downloaded        | GGUF 模型檔案的路徑                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp default | 下載模型的快取目錄                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | 嵌入語境的語境視窗大小。4096 涵蓋了典型的區塊（128–512 tokens），同時限制了非權重的 VRAM。在受限的主機上降低至 1024–2048。`"auto"` 使用模型訓練時的最大值 —— 不建議用於 8B+ 的模型（Qwen3-Embedding-8B: 40 960 tokens → ~32 GB VRAM vs 4096 時的 ~8.8 GB）。 |

    預設模型：`embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB，自動下載)。原始碼簽出仍然需要原生建構核准：`pnpm approve-builds` 然後 `pnpm rebuild node-llama-cpp`。

    使用獨立的 CLI 來驗證 Gateway 使用的相同提供者路徑：

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    為本地 GGUF 嵌入明確設定 `provider: "local"`。支援針對明確本地配置的 `hf:` 和 HTTP(S) 模型引用，但它們不會變更預設提供者。

  </Accordion>
</AccordionGroup>

### Inline embedding timeout

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  覆寫記憶體索引期間內聯嵌入批次逾時。

未設定則使用提供者預設值：本機/自託管提供者（例如 `local`、`ollama` 和 `lmstudio`）為 600 秒，託管提供者為 120 秒。當本機 CPU 密集型嵌入批次處理正常但緩慢時，請增加此值。

</ParamField>

---

## 混合搜尋設定

所有設定均在 `memorySearch.query.hybrid` 下：

| 鍵 (Key)              | 類型 (Type) | 預設值 | 說明                     |
| --------------------- | ----------- | ------ | ------------------------ |
| `enabled`             | `boolean`   | `true` | 啟用混合 BM25 + 向量搜尋 |
| `vectorWeight`        | `number`    | `0.7`  | 向量分數權重 (0-1)       |
| `textWeight`          | `number`    | `0.3`  | BM25 分數權重 (0-1)      |
| `candidateMultiplier` | `number`    | `4`    | 候選池大小倍數           |

<Tabs>
  <Tab title="MMR (多樣性)">
    | 鍵           | 類型      | 預設值 | 說明                          |
    | ------------- | --------- | ------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | 啟用 MMR 重新排序                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多樣性，1 = 最大相關性 |
  </Tab>
  <Tab title="時間衰減 (近期性)">
    | 鍵                          | 類型      | 預設值 | 說明               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | 啟用近期性加權      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | 分數每 N 天減半 |

    常青檔案（`MEMORY.md`、`memory/` 中的非日期檔案）永遠不會衰減。

  </Tab>
</Tabs>

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

| 鍵 (Key)     | 類型 (Type) | 說明                       |
| ------------ | ----------- | -------------------------- |
| `extraPaths` | `string[]`  | 要編入索引的額外目錄或檔案 |

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

路徑可以是絕對路徑或相對於工作區的路徑。系統會遞迴掃描目錄中的 `.md` 檔案。符號連結的處理方式取決於使用的後端：內建引擎會忽略符號連結，而 QMD 則遵循底層 QMD 掃描器的行為。

對於 Agent 範圍的跨 Agent 逐字稿搜尋，請使用 `agents.list[].memorySearch.qmd.extraCollections` 而非 `memory.qmd.paths`。這些額外的集合遵循相同的 `{ path, name, pattern? }` 結構，但會依 Agent 合併，且當路徑指向目前工作區外部時，可以保留明確的共享名稱。如果在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中出現相同的解析路徑，QMD 會保留第一個項目並跳過重複項目。

---

## 多模態記憶體 (Gemini)

使用 Gemini Embedding 2 與 Markdown 一起建立圖片和音訊的索引：

| Key                       | Type       | 預設值     | 說明                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 啟用多模態索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的檔案大小上限                    |

<Note>僅適用於 `extraPaths` 中的檔案。預設記憶體根目錄僅支援 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必須為 `"none"`。</Note>

支援的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif` (圖片)；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac` (音訊)。

---

## 嵌入快取

| 鍵                 | 類型      | 預設值  | 說明                     |
| ------------------ | --------- | ------- | ------------------------ |
| `cache.enabled`    | `boolean` | `true`  | 在 SQLite 中快取區塊嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大快取嵌入數量         |

防止在重新索引或逐字稿更新時對未變更的文字重新進行嵌入。

---

## 批次索引

| 鍵                            | 類型      | 預設值  | 描述             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | 並行內聯嵌入     |
| `remote.batch.enabled`        | `boolean` | `false` | 啟用批次嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 並行批次工作     |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批次完成     |
| `remote.batch.pollIntervalMs` | `number`  | --      | 輪詢間隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批次逾時         |

適用於 `openai`、`gemini` 和 `voyage`。對於大量回填資料，OpenAI 批次通常是最快且最便宜的選項。

`remote.nonBatchConcurrency` 控制本地/自託管供應商以及未啟用供應商批次 API 的託管供應商所使用的內聯嵌入呼叫。Ollama 對於非批次索引預設為 `1`，以免壓垮較小的本地主機；在較大的機器上設定較高的值。

這與 `sync.embeddingBatchTimeoutSeconds` 分開，後者控制內聯嵌入呼叫的逾時時間。

---

## 會話記憶體搜尋 (實驗性)

索引會話逐字稿並透過 `memory_search` 提供它們：

| 鍵                            | 類型       | 預設值       | 描述                           |
| ----------------------------- | ---------- | ------------ | ------------------------------ |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 啟用會話索引                   |
| `sources`                     | `string[]` | `["memory"]` | 新增 `"sessions"` 以包含逐字稿 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的位元組閾值           |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的訊息閾值             |

<Warning>Session indexing is opt-in and runs asynchronously. Results can be slightly stale. Session logs live on disk, so treat filesystem access as the trust boundary.</Warning>

---

## SQLite 向量加速 (sqlite-vec)

| Key                          | Type      | Default | Description                  |
| ---------------------------- | --------- | ------- | ---------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 進行向量查詢 |
| `store.vector.extensionPath` | `string`  | bundled | 覆蓋 sqlite-vec 路徑         |

當 sqlite-vec 不可用時，OpenClaw 會自動回退到程序內的餘弦相似度計算。

---

## 索引儲存

| Key                   | Type     | Default                               | Description                               |
| --------------------- | -------- | ------------------------------------- | ----------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置 (支援 `{agentId}` token)         |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 tokenizer (`unicode61` 或 `trigram`) |

---

## QMD 後端配置

設定 `memory.backend = "qmd"` 以啟用。所有 QMD 設定都位於 `memory.qmd` 之下：

| Key                      | Type      | Default  | Description                                                       |
| ------------------------ | --------- | -------- | ----------------------------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 執行檔路徑；當服務 `PATH` 與您的 shell 不同時，請設定絕對路徑 |
| `searchMode`             | `string`  | `search` | 搜尋指令：`search`、`vsearch`、`query`                            |
| `includeDefaultMemory`   | `boolean` | `true`   | 自動索引 `MEMORY.md` + `memory/**/*.md`                           |
| `paths[]`                | `array`   | --       | 額外路徑：`{ name, path, pattern? }`                              |
| `sessions.enabled`       | `boolean` | `false`  | 索引會話文字記錄                                                  |
| `sessions.retentionDays` | `number`  | --       | 文字記錄保留                                                      |
| `sessions.exportDir`     | `string`  | --       | 匯出目錄                                                          |

`searchMode: "search"` 僅為詞彙/BM25 模式。對於該模式，OpenClaw 不會執行語意向量就緒探測或 QMD 嵌入維護，包括在 `memory status --deep` 期間；`vsearch` 和 `query` 繼續要求 QMD 向量就緒度和嵌入。

OpenClaw 偏好使用目前的 QMD 集合和 MCP 查詢形狀，但透過在需要時嘗試相容的集合模式標誌和較舊的 MCP 工具名稱，來保持較舊的 QMD 版本正常運作。當 QMD 宣告支援多個集合篩選器時，來源相同的集合會由一個 QMD 程序搜尋；較舊的 QMD 版本則保持每個集合的相容性路徑。來源相同是指持久記憶體集合被分組在一起，而會話文字記錄集合則保持為另一個群組，因此來源多樣化仍然能夠擁有這兩種輸入。

<Note>QMD 模型覆寫保留在 QMD 端，而非 OpenClaw 設定。如果您需要全域覆寫 QMD 的模型，請在閘道執行時環境中設定環境變數，例如 `QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。</Note>

<AccordionGroup>
  <Accordion title="更新排程">
    | Key                       | Type      | Default | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | 重新整理間隔                      |
    | `update.debounceMs`       | `number`  | `15000` | 對檔案變更進行去抖動                 |
    | `update.onBoot`           | `boolean` | `true`  | 當長駐的 QMD 管理員開啟時重新整理；同時也控制選用啟動時重新整理 |
    | `update.startup`          | `string`  | `off`   | 可選的啟動時重新整理：`off`、`idle` 或 `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | `startup: "idle"` 重新整理執行前的延遲 |
    | `update.waitForBootSync`  | `boolean` | `false` | 封鎖管理員開啟直到其初始重新整理完成 |
    | `update.embedInterval`    | `string`  | --      | 分離的嵌入頻率                |
    | `update.commandTimeoutMs` | `number`  | --      | QMD 指令逾時              |
    | `update.updateTimeoutMs`  | `number`  | --      | QMD 更新作業逾時     |
    | `update.embedTimeoutMs`   | `number`  | --      | QMD 嵌入作業逾時      |
  </Accordion>
  <Accordion title="Limits">
    | Key                       | Type     | Default | Description                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | 最大搜尋結果         |
    | `limits.maxSnippetChars`  | `number` | --      | 限制片段長度       |
    | `limits.maxInjectedChars` | `number` | --      | 限制總插入字元 |
    | `limits.timeoutMs`        | `number` | `4000`  | 搜尋逾時             |
  </Accordion>
  <Accordion title="Scope">
    控制哪些 session 可以接收 QMD 搜尋結果。Schema 與 [`session.sendPolicy`](/zh-Hant/gateway/config-agents#session) 相同：

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

    預設出廠設定允許直接和頻道 session，同時仍然拒絕群組。

    預設僅限 DM。`match.keyPrefix` 符合正規化的 session 金鑰；`match.rawKeyPrefix` 符合包含 `agent:<id>:` 的原始金鑰。

  </Accordion>
  <Accordion title="Citations">
    `memory.citations` 適用於所有後端：

    | Value            | Behavior                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (default) | 在片段中包含 `Source: <path#line>` 頁尾    |
    | `on`             | 始終包含頁尾                               |
    | `off`            | 省略頁尾 (路徑仍會在內部傳遞給 agent) |

  </Accordion>
</AccordionGroup>

QMD 啟動更新在 gateway 啟動期間使用一次性 subprocess 路徑。當記憶體搜尋開啟以供互動使用時，長存的 QMD 管理器仍擁有一般檔案監看器和間隔計時器。

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

## 夢境

夢境是在 `plugins.entries.memory-core.config.dreaming` 下配置，而不是在 `agents.defaults.memorySearch` 下。

夢境作為一個預定的掃描運行，並使用內部的淺層/深層/REM 階段作為實作細節。

關於概念行為和斜線指令，請參閱 [夢境](/zh-Hant/concepts/dreaming)。

### 使用者設定

| 鍵                                     | 類型      | 預設值      | 描述                                                                                     |
| -------------------------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`     | 完全啟用或停用夢境功能                                                                   |
| `frequency`                            | `string`  | `0 3 * * *` | 完整夢境掃描的可選 cron 排程頻率                                                         |
| `model`                                | `string`  | 預設模型    | 可選的夢境日誌子代理模型覆寫                                                             |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`       | 從被提升至 `MEMORY.md` 的每個短期回憶片段中保留的最大預估 Token 數；來源元數據仍保持可見 |

### 範例

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        subagent: {
          allowModelOverride: true,
          allowedModels: ["anthropic/claude-sonnet-4-6"],
        },
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
            model: "anthropic/claude-sonnet-4-6",
          },
        },
      },
    },
  },
}
```

<Note>
- 夢境功能會將機器狀態寫入 `memory/.dreams/`。
- 夢境功能會將人類可讀的敘述輸出寫入 `DREAMS.md`（或現有的 `dreams.md`）。
- `dreaming.model` 使用現有的外掛子代理信任閘門；在啟用之前請設定 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 當設定的模型無法使用時，夢境日誌會使用工作階段預設模型重試一次。信任或允許清單失敗會被記錄下來，且不會靜默重試。
- 淺睡/深睡/REM 階段策略和閾值屬於內部行為，並非使用者面向的設定。

</Note>

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [記憶體概覽](/zh-Hant/concepts/memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)

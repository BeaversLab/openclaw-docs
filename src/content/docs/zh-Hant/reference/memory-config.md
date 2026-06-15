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
如果您正在尋找 **active memory** 功能切換和子代理配置，它位於 `plugins.entries.active-memory` 而非 `memorySearch`。

Active memory 使用雙重閘門模型：

1. 外掛程式必須已啟用並以當前代理 ID 為目標
2. 請求必須是合格的互動式持久聊天會話

請參閱 [Active Memory](/zh-Hant/concepts/active-memory) 以了解啟動模型、外掛程式擁有的配置、逐字稿持久化以及安全推出模式。

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

<Warning>
變更嵌入提供者、模型、提供者設定、來源、範圍、
分塊或分詞器可能會導致現有的 SQLite 向量索引不相容。
OpenClaw 會暫停向量搜尋並回報索引身分警告，而不是
自動重新嵌入所有內容。準備就緒時，請使用
`openclaw memory status --index --agent <id>` 或
`openclaw memory index --force --agent <id>` 重建。
</Warning>

如果您的網路無法連線至 OpenAI 嵌入，記憶體回呼會以失敗但開放的方式運作
而非阻斷該輪次。將現有的 `memorySearch.provider` 欄位設定為
可連線的本機、Ollama、區域或 OpenAI 相容的提供者，以恢復
語意排名。

### 自訂提供者 ID

`memorySearch.provider` 可以指向自訂的 `models.providers.<id>` 項目，用於記憶體專用的提供者介面卡（例如 `ollama`），或用於 OpenAI 相容的模型 API（例如 `openai-responses` / `openai-completions`）。OpenClaw 會解析該提供者的 `api` 擁有者以用於嵌入介面卡，同時保留自訂提供者 ID 以用於端點、驗證和模型前綴處理。這讓多 GPU 或多主機設定能夠將記憶體嵌入專用於特定的本機端點：

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

遠端嵌入需要 API 金鑰。Bedrock 則改用 AWS SDK 預設憑證鏈（執行個體角色、SSO、存取金鑰）。

| 提供者         | 環境變數                                           | 設定金鑰                            |
| -------------- | -------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS 憑證鏈                                         | 不需要 API 金鑰                     |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN` | 透過裝置登入進行驗證設定檔          |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY` （預留位置）                      | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`    |

<Note>Codex OAuth 僅涵蓋聊天/完成功能，不滿足嵌入請求。</Note>

---

## 遠端端點設定

針對不應繼承全域 OpenAI 聊天憑證的通用 OpenAI 相容
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

## 提供者特定設定

<AccordionGroup>
  <Accordion title="Gemini">
    | Key                    | Type     | Default                | Description                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | 也支援 `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | 針對 Embedding 2：768、1536 或 3072        |

    <Warning>
    變更模型或 `outputDimensionality` 會變更索引身分識別。OpenClaw
    會暫停向量搜尋，直到您明確重建記憶體索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAI 相容的輸入類型">
    OpenAI 相容的嵌入端點可以選擇加入提供者特定的 `input_type` 請求欄位。這對於需要為查詢和文件嵌入使用不同標籤的非對稱嵌入模型非常有用。

    | 鍵                 | 類型     | 預設值 | 描述                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | 未設定   | 用於查詢和文件嵌入的共享 `input_type`   |
    | `queryInputType`    | `string` | 未設定   | 查詢時 `input_type`；覆寫 `inputType`          |
    | `documentInputType` | `string` | 未設定   | 索引/文件 `input_type`；覆寫 `inputType`      |

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

    變更這些值會影響提供者批次索引的嵌入快取識別碼，且當上游模型對標籤的處理方式不同時，應接著進行記憶體重建索引。

  </Accordion>
  <Accordion title="Bedrock">
    ### Bedrock 嵌入配置

    Bedrock 使用 AWS SDK 預設憑證鏈——無需 API 金鑰。如果 OpenClaw 在 EC2 上運行並具有已啟用 Bedrock 的實例角色，只需設定提供者和模型：

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
    | `outputDimensionality` | `number` | 模型預設值                  | 對於 Titan V2：256、512 或 1024 |

    **支援的模型**（包含系列偵測和維度預設值）：

    | 模型 ID                                   | 提供者   | 預設維度 | 可配置維度    |
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

    帶有輸送量後綴的變體（例如 `amazon.titan-embed-text-v1:2:8k`）會繼承基礎模型的配置。

    **驗證：** Bedrock 驗證使用標準的 AWS SDK 憑證解析順序：

    1. 環境變數（`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`）
    2. SSO 權杖快取
    3. Web 身份權杖憑證
    4. 共用憑證和配置檔案
    5. ECS 或 EC2 中繼資料憑證

    區域從 `AWS_REGION`、`AWS_DEFAULT_REGION`、`amazon-bedrock` 提供者 `baseUrl` 解析，或者預設為 `us-east-1`。

    **IAM 權限：** IAM 角色或使用者需要：

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

  </Accordion>
  <Accordion title="Local (GGUF + node-llama-cpp)">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | 自動下載        | GGUF 模型檔案路徑                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp 預設 | 下載模型的快取目錄                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | 嵌入上下文的視窗大小。4096 涵蓋典型區塊（128–512 個 token），同時限制非權重 VRAM。受限主機可降低至 1024–2048。`"auto"` 使用模型的訓練最大值 — 不建議用於 8B+ 模型（Qwen3-Embedding-8B: 40 960 個 token → ~32 GB VRAM vs 4096 時 ~8.8 GB）。 |

    預設模型：`embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB，自動下載)。原始碼檢出仍需原生建置核准：`pnpm approve-builds` 接著 `pnpm rebuild node-llama-cpp`。

    使用獨立 CLI 驗證 Gateway 使用的相同提供者路徑：

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    針對本地 GGUF 嵌入明確設定 `provider: "local"`。`hf:` 與 HTTP(S) 模型參照支援明確的本地設定，但它們不會改變預設提供者。

  </Accordion>
</AccordionGroup>

### 內聯嵌入逾時

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  覆寫記憶體索引期間內聯嵌入批次的逾時設定。

未設定則使用提供者的預設值：本機/自託管提供者（例如 `local`、`ollama` 和 `lmstudio`）為 600 秒，託管提供者為 120 秒。當本機 CPU 限制的嵌入批次處理正常但緩慢時，請增加此值。

</ParamField>

---

## 混合搜尋設定

所有均在 `memorySearch.query.hybrid` 之下：

| 鍵                    | 類型      | 預設值 | 描述                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 啟用混合 BM25 + 向量搜尋 |
| `vectorWeight`        | `number`  | `0.7`  | 向量評分權重 (0-1)       |
| `textWeight`          | `number`  | `0.3`  | BM25 評分權重 (0-1)      |
| `candidateMultiplier` | `number`  | `4`    | 候選池大小倍數           |

<Tabs>
  <Tab title="MMR (多樣性)">
    | Key           | Type      | Default | Description                          |
    | ------------- | --------- | ------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | 啟用 MMR 重新排序                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多樣性，1 = 最大相關性 |
  </Tab>
  <Tab title="時間衰減 (最近性)">
    | Key                          | Type      | Default | Description               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | 啟用最近性提升      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | 評分每 N 天減半 |

    常青檔案 (`MEMORY.md`，`memory/` 中的非日期檔案) 永遠不會衰減。

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

| 鍵           | 類型       | 描述                   |
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

路徑可以是絕對路徑或相對於工作區的路徑。系統會遞迴掃描目錄中的 `.md` 檔案。符號連結的處理方式取決於使用的後端：內建引擎會忽略符號連結，而 QMD 則遵循底層 QMD 掃描器的行為。

針對 Agent 範圍的跨 Agent 轉錄搜尋，請使用 `agents.list[].memorySearch.qmd.extraCollections` 而非 `memory.qmd.paths`。這些額外的集合遵循相同的 `{ path, name, pattern? }` 結構，但它們是依 Agent 合併的，並且當路徑指向目前工作區之外時，可以保留明確的共用名稱。如果相同的解析路徑同時出現在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中，QMD 會保留第一個項目並跳過重複項目。

---

## 多模態記憶

使用 Gemini Embedding 2 將圖片和音訊與 Markdown 一起編入索引：

| 鍵                        | 類型       | 預設值     | 說明                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 啟用多模態索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的最大檔案大小                    |

<Note>僅適用於 `extraPaths` 中的檔案。預設記憶體根目錄僅限 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必須為 `"none"`。</Note>

支援的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif` (圖片)；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac` (音訊)。

---

## 嵌入快取

| 鍵                 | 類型      | 預設值  | 說明                     |
| ------------------ | --------- | ------- | ------------------------ |
| `cache.enabled`    | `boolean` | `true`  | 在 SQLite 中快取區塊嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大快取嵌入數           |

防止在重新索引或文字記錄更新期間對未變更的文字進行重新嵌入。

---

## 批次索引

| Key                           | Type      | Default | 描述             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | 平行內嵌嵌入     |
| `remote.batch.enabled`        | `boolean` | `false` | 啟用批次嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 平行批次工作     |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批次完成     |
| `remote.batch.pollIntervalMs` | `number`  | --      | 輪詢間隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批次逾時         |

適用於 `openai`、`gemini` 和 `voyage`。對於大量回填資料，OpenAI 批次通常是最快且最經濟的選擇。

`remote.nonBatchConcurrency` 控制本地/自託管提供商以及未啟用提供商批次 API 時的託管提供商所使用的內嵌嵌入呼叫。Ollama 對於非批次索引預設為 `1`，以免壓垮較小的本地主機；在較大的機器上請設定較高的值。

這與 `sync.embeddingBatchTimeoutSeconds` 是分開的，後者控制內嵌嵌入呼叫的逾時時間。

---

## 會話記憶體搜尋（實驗性）

索引會話文字記錄並透過 `memory_search` 呈現它們：

| Key                           | Type       | Default      | 描述                             |
| ----------------------------- | ---------- | ------------ | -------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 啟用會話索引                     |
| `sources`                     | `string[]` | `["memory"]` | 新增 `"sessions"` 以包含文字記錄 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的位元組閾值             |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的訊息閾值               |

<Warning>Session indexing is opt-in and runs asynchronously. Results can be slightly stale. Session logs live on disk, so treat filesystem access as the trust boundary.</Warning>

---

## SQLite 向量加速 (sqlite-vec)

| Key                          | Type      | Default | Description                  |
| ---------------------------- | --------- | ------- | ---------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 進行向量查詢 |
| `store.vector.extensionPath` | `string`  | bundled | 覆蓋 sqlite-vec 路徑         |

當 sqlite-vec 不可用時，OpenClaw 會自動回退到進程內的餘弦相似度計算。

---

## 索引儲存

| Key                   | Type     | Default                               | Description                                |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------ |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支援 `{agentId}` token）         |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 tokenizer（`unicode61` 或 `trigram`） |

---

## QMD 後端設定

設定 `memory.backend = "qmd"` 以啟用。所有 QMD 設定都位於 `memory.qmd` 下：

| Key                      | Type      | Default  | Description                                                         |
| ------------------------ | --------- | -------- | ------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可執行檔路徑；當服務 `PATH` 與您的 shell 不同時，請設定絕對路徑 |
| `searchMode`             | `string`  | `search` | 搜尋指令：`search`、`vsearch`、`query`                              |
| `includeDefaultMemory`   | `boolean` | `true`   | 自動索引 `MEMORY.md` + `memory/**/*.md`                             |
| `paths[]`                | `array`   | --       | 額外路徑：`{ name, path, pattern? }`                                |
| `sessions.enabled`       | `boolean` | `false`  | 索引會話逐字稿                                                      |
| `sessions.retentionDays` | `number`  | --       | 逐字稿保留                                                          |
| `sessions.exportDir`     | `string`  | --       | 匯出目錄                                                            |

`searchMode: "search"` 僅支援詞彙/BM25 搜尋。OpenClaw 不會針對此模式執行語意向量就緒探查或 QMD 嵌入維護，包括在 `memory status --deep` 期間；`vsearch` 和 `query` 仍需 QMD 向量就緒與嵌入。

OpenClaw 偏好目前的 QMD 集合與 MCP 查詢結構，但在需要時會透過嘗試相容的集合模式標誌與舊版 MCP 工具名稱來維持舊版 QMD 版本的運作。當 QMD 宣告支援多集合過濾器時，來源相同的集合會由單一 QMD 程序搜尋；舊版 QMD 建構則維持各集合的相容性路徑。來源相同意指持久記憶集合會被分組在一起，而會話逐字稿集合則維持為獨立群組，以便來源多樣化仍能包含兩種輸入。

<Note>QMD 模型覆寫保留在 QMD 端，而非 OpenClaw 設定。若您需要全域覆寫 QMD 的模型，請在閘道執行時環境中設定環境變數，例如 `QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。</Note>

<AccordionGroup>
  <Accordion title="更新排程">
    | Key                       | Type      | Default | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | 重新整理間隔                      |
    | `update.debounceMs`       | `number`  | `15000` | 檔案變更的去抖動                 |
    | `update.onBoot`           | `boolean` | `true`  | 當長期運作的 QMD 管理員開啟時重新整理；也控制選用啟動重新整理 |
    | `update.startup`          | `string`  | `off`   | 選用的閘道啟動重新整理：`off`、`idle` 或 `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | `startup: "idle"` 重新整理執行前的延遲 |
    | `update.waitForBootSync`  | `boolean` | `false` | 封鎖管理員開啟直到其初始重新整理完成 |
    | `update.embedInterval`    | `string`  | --      | 分離的嵌入頻率                |
    | `update.commandTimeoutMs` | `number`  | --      | QMD 指令的逾時              |
    | `update.updateTimeoutMs`  | `number`  | --      | QMD 更新作業的逾時     |
    | `update.embedTimeoutMs`   | `number`  | --      | QMD 嵌入作業的逾時      |
  </Accordion>
  <Accordion title="限制">
    | Key                       | Type     | Default | Description                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | 最大搜尋結果         |
    | `limits.maxSnippetChars`  | `number` | --      | 限制摘錄長度       |
    | `limits.maxInjectedChars` | `number` | --      | 限制總共注入的字元 |
    | `limits.timeoutMs`        | `number` | `4000`  | 搜尋逾時             |
  </Accordion>
  <Accordion title="範圍">
    控制哪些 sessions 可以接收 QMD 搜尋結果。Schema 與 [`session.sendPolicy`](/zh-Hant/gateway/config-agents#session) 相同：

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

    預設設定允許直接和 channel sessions，但仍然拒絕群組。

    預設僅限 DM。`match.keyPrefix` 符合正規化的 session key；`match.rawKeyPrefix` 符合包含 `agent:<id>:` 的原始 key。

  </Accordion>
  <Accordion title="引用">
    `memory.citations` 適用於所有後端：

    | Value            | Behavior                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (預設) | 在摘錄中包含 `Source: <path#line>` 頁尾    |
    | `on`             | 總是包含頁尾                               |
    | `off`            | 省略頁尾 (路徑仍會在內部傳遞給 agent) |

  </Accordion>
</AccordionGroup>

QMD 開機重新整理會在 gateway 啟動期間使用一次性 subprocess 路徑。長期運行的 QMD 管理者在開啟記憶體搜尋進行互動式使用時，仍然擁有常規的檔案監看器和計時器。

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

## Dreaming

Dreaming 是在 `plugins.entries.memory-core.config.dreaming` 下配置，而不是在 `agents.defaults.memorySearch` 下。

Dreaming 作為一個定期的排程掃描運行，並使用內部的 light/deep/REM 階段作為實作細節。

關於概念行為和斜線指令，請參閱 [Dreaming](/zh-Hant/concepts/dreaming)。

### 使用者設定

| 鍵                                     | 類型      | 預設值      | 說明                                                                                   |
| -------------------------------------- | --------- | ----------- | -------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`     | 完全啟用或停用夢境                                                                     |
| `frequency`                            | `string`  | `0 3 * * *` | 完整夢境掃描的選用 cron 排程                                                           |
| `model`                                | `string`  | 預設模型    | 選用的夢境日記子代理模型覆寫                                                           |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`       | 從每個被提升至 `MEMORY.md` 的短期回憶片段中保留的最大預估 token 數；出處元資料仍然可見 |

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
- 夢境會將機器狀態寫入 `memory/.dreams/`。
- 夢境會將人類可讀的敘述輸出寫入 `DREAMS.md` (或現有的 `dreams.md`)。
- `dreaming.model` 使用現有的外掛程式子代理信任閘門；在啟用它之前請設定 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 當設定的模型無法使用時，夢境日記會使用工作階段預設模型重試一次。信任或允許清單失敗會被記錄下來，並且不會靜默重試。
- 輕度/深度/快速動眼期 階段策略和閾值是內部行為，不是使用者面向的設定。

</Note>

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [記憶體概覽](/zh-Hant/concepts/memory)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)

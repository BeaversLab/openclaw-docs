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
如果您尋找的是 **主動記憶** 功能切換和子代理程式配置，則該配置位於 `plugins.entries.active-memory` 而非 `memorySearch` 之下。

主動記憶體採用雙閘門模型：

1. 外掛程式必須已啟用並以當前代理程式 ID 為目標
2. 請求必須是符合條件的互動式持久聊天會話

請參閱 [主動記憶體](/zh-Hant/concepts/active-memory) 以了解啟動模型、外掛程式擁有的配置、文字記錄持久性以及安全推出模式。

</Note>

---

## 提供者選擇

| 鍵         | 類型      | 預設值       | 描述                                                                                                                                                                                              |
| ---------- | --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | 自動偵測     | 嵌入適配器 ID，例如 `bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai` 或 `voyage`；也可以是已配置的 `models.providers.<id>`，其 `api` 指向其中一個適配器 |
| `model`    | `string`  | 提供者預設值 | 嵌入模型名稱                                                                                                                                                                                      |
| `fallback` | `string`  | `"none"`     | 當主要適配器失敗時的後備適配器 ID                                                                                                                                                                 |
| `enabled`  | `boolean` | `true`       | 啟用或停用記憶體搜尋                                                                                                                                                                              |

### 自動偵測順序

當未設定 `provider` 時，OpenClaw 會選擇第一個可用的：

<Steps>
  <Step title="local">若已設定 `memorySearch.local.modelPath` 且檔案存在，則選擇此選項。</Step>
  <Step title="github-copilot">若可解析 GitHub Copilot 權杖（環境變數或 auth profile），則選擇此選項。</Step>
  <Step title="openai">若可解析 OpenAI 金鑰，則選擇此選項。</Step>
  <Step title="gemini">若可解析 Gemini 金鑰，則選擇此選項。</Step>
  <Step title="voyage">若可解析 Voyage 金鑰，則選擇此選項。</Step>
  <Step title="mistral">若可解析 Mistral 金鑰，則選擇此選項。</Step>
  <Step title="deepinfra">若可解析 DeepInfra 金鑰，則選擇此選項。</Step>
  <Step title="bedrock">若 AWS SDK 憑證鏈解析成功（執行個體角色、存取金鑰、profile、SSO、Web 身份或共用設定），則選擇此選項。</Step>
</Steps>

支援 `ollama` 但不會自動偵測（請明確設定）。

### 自訂提供者 ID

`memorySearch.provider` 可以指向自訂的 `models.providers.<id>` 項目。OpenClaw 會解析該提供者的 `api` 擁有者以用於嵌入適配器，同時保留自訂提供者 ID 用於端點、驗證和模型前綴處理。這讓多 GPU 或多主機設定可以將記憶體嵌入專用於特定的本地端點：

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
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | 透過裝置登入進行驗證設定檔          |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY` (預留位置)                        | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`    |

<Note>Codex OAuth 僅涵蓋聊天/完成，不滿足嵌入請求。</Note>

---

## 遠端端點配置

對於自訂 OpenAI 相容端點或覆寫提供者預設值：

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

## 提供者特定配置

<AccordionGroup>
  <Accordion title="Gemini">
    | 鍵                    | 類型     | 預設值                | 描述                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | 也支援 `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | 對於 Embedding 2：768、1536 或 3072        |

    <Warning>
    變更模型或 `outputDimensionality` 會觸發自動完全重新索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAI 相容輸入類型">
    OpenAI 相容的嵌入端點可以選擇使用供應商特定的 `input_type` 請求欄位。這對於需要為查詢和文件嵌入使用不同標籤的非對稱嵌入模型非常有用。

    | 鍵                 | 類型     | 預設值 | 描述                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | 未設定   | 查詢和文件嵌入共用的 `input_type`   |
    | `queryInputType`    | `string` | 未設定   | 查詢時的 `input_type`；覆寫 `inputType`          |
    | `documentInputType` | `string` | 未設定   | 索引/文件的 `input_type`；覆寫 `inputType`      |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "env:EMBEDDINGS_API_KEY",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    變更這些值會影響供應商批次索引的嵌入快取識別，當上游模型對標籤的處理方式不同時，應隨後進行記憶體重建索引。

  </Accordion>
  <Accordion title="Bedrock">
    ### Bedrock 嵌入設定

    Bedrock 使用 AWS SDK 的預設憑證鏈 — 不需要 API 金鑰。如果 OpenClaw 在具有已啟用 Bedrock 角色的 EC2 上執行，只需設定提供者和模型：

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

    | Key                    | Type     | Default                        | Description                     |
    | ---------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID  |
    | `outputDimensionality` | `number` | model default                  | 針對 Titan V2：256、512 或 1024 |

    **支援的模型**（包含系列偵測和維度預設值）：

    | Model ID                                   | Provider   | Default Dims | Configurable Dims    |
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

    帶有輸吐量後綴的變體（例如 `amazon.titan-embed-text-v1:2:8k`）會繼承基礎模型的設定。

    **驗證：** Bedrock 驗證使用標準 AWS SDK 憑證解析順序：

    1. 環境變數 (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. SSO 權杖快取
    3. Web 身份權杖憑證
    4. 共用憑證和設定檔
    5. ECS 或 EC2 中繼資料憑證

    區域 會從 `AWS_REGION`、`AWS_DEFAULT_REGION`、`amazon-bedrock` 提供者 `baseUrl` 解析，或預設為 `us-east-1`。

    **IAM 權限：** IAM 角色或使用者需要：

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    為遵循最小權限原則，請將 `InvokeModel` 範圍限定於特定模型：

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="本機 (GGUF + node-llama-cpp)">
    | 鍵                   | 類型               | 預設值                | 描述                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | 自動下載        | GGUF 模型檔案的路徑                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp 預設值 | 下載模型的快取目錄                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | 嵌入語境的語境視窗大小。4096 可覆蓋典型的區塊（128–512 個 token），同時限制非權重 VRAM。在資源受限的主機上可降低至 1024–2048。`"auto"` 會使用模型訓練時的最大值 —— 不建議用於 8B+ 的模型（Qwen3-Embedding-8B：40 960 tokens → ~32 GB VRAM vs 4096 時的 ~8.8 GB）。 |

    預設模型：`embeddinggemma-300m-qat-Q8_0.gguf`（~0.6 GB，自動下載）。來源檢出版本仍需原生組建核准：`pnpm approve-builds` 然後 `pnpm rebuild node-llama-cpp`。

    使用獨立 CLI 來驗證 Gateway 使用的相同提供者路徑：

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    如果 `provider` 為 `auto`，`local` 僅在 `local.modelPath` 指向現有本地檔案時才會被選取。`hf:` 和 HTTP(S) 模型參照仍可透過 `provider: "local"` 明確使用，但它們不會讓 `auto` 在模型可用於磁碟之前選取本地選項。

  </Accordion>
</AccordionGroup>

### 內聯嵌入逾時

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  覆寫記憶體索引期間內聯嵌入批次處理的逾時設定。

未設定則使用供應商預設值：本地/自託管供應商（例如 `local`、`ollama` 和 `lmstudio`）為 600 秒，託管供應商為 120 秒。當本地 CPU 限製的嵌入批次處理正常但緩慢時，請增加此值。

</ParamField>

---

## 混合搜尋設定

所有設定均在 `memorySearch.query.hybrid` 下：

| 金鑰                  | 類型      | 預設值 | 說明                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 啟用混合 BM25 + 向量搜尋 |
| `vectorWeight`        | `number`  | `0.7`  | 向量分數權重 (0-1)       |
| `textWeight`          | `number`  | `0.3`  | BM25 分數權重 (0-1)      |
| `candidateMultiplier` | `number`  | `4`    | 候選池大小倍數           |

<Tabs>
  <Tab title="MMR (多樣性)">
    | Key           | Type      | Default | Description                          |
    | ------------- | --------- | ------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | 啟用 MMR 重新排序                  |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多樣性，1 = 最大相關性   |
  </Tab>
  <Tab title="時間衰減 (最近性)">
    | Key                          | Type      | Default | Description               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | 啟用最近性提升            |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | 分數每 N 天減半          |

    常青檔案（`MEMORY.md`、`memory/` 中的無日期檔案）永遠不會衰減。

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

## 額外記憶路徑

| Key          | Type       | Description            |
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

路徑可以是絕對路徑或相對於工作區的路徑。系統會遞迴掃描目錄中的 `.md` 檔案。符號連結的處理方式取決於啟用的後端：內建引擎會忽略符號連結，而 QMD 則遵循底層 QMD 掃描器的行為。

若要進行代理範圍的跨代理對話記錄搜尋，請使用 `agents.list[].memorySearch.qmd.extraCollections` 而非 `memory.qmd.paths`。這些額外的集合遵循相同的 `{ path, name, pattern? }` 結構，但它們會依代理合併，並且當路徑指向目前工作區之外時，可以保留明確的共享名稱。如果在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中出現相同的解析路徑，QMD 會保留第一個項目並跳過重複項目。

---

## 多模態記憶體 (Gemini)

使用 Gemini Embedding 2 與 Markdown 一起為影像和音訊建立索引：

| 金鑰                      | 類型       | 預設值     | 描述                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 啟用多模態索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的檔案大小上限                    |

<Note>僅適用於 `extraPaths` 中的檔案。預設記憶體根目錄僅限 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必須為 `"none"`。</Note>

支援的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif` (影像)；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac` (音訊)。

---

## 嵌入快取

| 金鑰               | 類型      | 預設值  | 描述                     |
| ------------------ | --------- | ------- | ------------------------ |
| `cache.enabled`    | `boolean` | `true`  | 在 SQLite 中快取區塊嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大快取嵌入數           |

防止在重新索引或轉錄更新時對未變更的文字進行重新嵌入。

---

## 批次索引

| 鍵                            | 類型      | 預設值  | 說明             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | 並行內聯嵌入     |
| `remote.batch.enabled`        | `boolean` | `false` | 啟用批次嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 並行批次任務     |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批次完成     |
| `remote.batch.pollIntervalMs` | `number`  | --      | 輪詢間隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批次逾時         |

適用於 `openai`、`gemini` 和 `voyage`。對於大量的回填資料，OpenAI 批次處理通常是最快且最經濟的。

`remote.nonBatchConcurrency` 控制本機/自託管提供商以及未啟用提供商批次 API 的託管提供商所使用的內聯嵌入呼叫。Ollama 在非批次索引時預設為 `1`，以避免壓垮較小的本機主機；在較大的機器上請設定較高的值。

這與 `sync.embeddingBatchTimeoutSeconds` 分開，後者控制內聯嵌入呼叫的逾時時間。

---

## 會話記憶體搜尋 (實驗性)

索引會話轉錄並透過 `memory_search` 顯示它們：

| 鍵                            | 類型       | 預設值       | 說明                         |
| ----------------------------- | ---------- | ------------ | ---------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 啟用會話索引                 |
| `sources`                     | `string[]` | `["memory"]` | 加入 `"sessions"` 以包含轉錄 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的位元組閾值         |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的訊息閾值           |

<Warning>Session indexing is opt-in and runs asynchronously. Results can be slightly stale. Session logs live on disk, so treat filesystem access as the trust boundary.</Warning>

---

## SQLite 向量加速 (sqlite-vec)

| 金鑰                         | 類型      | 預設值  | 說明                         |
| ---------------------------- | --------- | ------- | ---------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 進行向量查詢 |
| `store.vector.extensionPath` | `string`  | bundled | 覆蓋 sqlite-vec 路徑         |

當 sqlite-vec 不可用時，OpenClaw 會自動回退到程序內餘弦相似度。

---

## 索引儲存

| 鍵                    | 類型     | 預設                                  | 描述                                   |
| --------------------- | -------- | ------------------------------------- | -------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置 (支援 `{agentId}` 標記)       |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 分詞器 (`unicode61` 或 `trigram`) |

---

## QMD 後端設定

設定 `memory.backend = "qmd"` 以啟用。所有 QMD 設定都位於 `memory.qmd` 之下：

| 金鑰                     | 類型      | 預設     | 描述                                                              |
| ------------------------ | --------- | -------- | ----------------------------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可執行檔路徑；當服務 `PATH` 與您的 Shell 不同時，設定絕對路徑 |
| `searchMode`             | `string`  | `search` | 搜尋指令：`search`、`vsearch`、`query`                            |
| `includeDefaultMemory`   | `boolean` | `true`   | 自動索引 `MEMORY.md` + `memory/**/*.md`                           |
| `paths[]`                | `array`   | --       | 額外路徑：`{ name, path, pattern? }`                              |
| `sessions.enabled`       | `boolean` | `false`  | 索引會話紀錄                                                      |
| `sessions.retentionDays` | `number`  | --       | 逐字稿保留                                                        |
| `sessions.exportDir`     | `string`  | --       | 匯出目錄                                                          |

`searchMode: "search"` 僅為詞彙/BM25 模式。對於該模式，OpenClaw 不會執行語義向量就緒探測或 QMD 嵌入維護，包括在 `memory status --deep` 期間；`vsearch` 和 `query` 仍需 QMD 向量就緒和嵌入。

OpenClaw 偏好目前的 QMD 集合和 MCP 查詢形狀，但透過在需要時嘗試相容的集合模式旗標和較舊的 MCP 工具名稱，讓較舊的 QMD 版本能正常運作。當 QMD 宣布支援多個集合篩選器時，來源相同的集合會透過一個 QMD 程序進行搜尋；較舊的 QMD 版本則保留每個集合的相容性路徑。來源相同是指持久記憶體集合會分組在一起，而工作階段逐字稿集合則保持為一個獨立的群組，以便來源多樣化仍然能夠同時取得這兩種輸入。

<Note>QMD 模型覆寫保留在 QMD 端，而非 OpenClaw 設定。如果您需要全域覆寫 QMD 的模型，請在閘道執行時環境中設定環境變數，例如 `QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。</Note>

<AccordionGroup>
  <Accordion title="更新排程">
    | 鍵                       | 類型      | 預設值 | 描述                                   |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | 重新整理間隔                           |
    | `update.debounceMs`       | `number`  | `15000` | 對檔案變動進行去抖動（debounce）             |
    | `update.onBoot`           | `boolean` | `true`  | 當長期執行的 QMD 管理員開啟時重新整理；亦作為選用啟動時重新整理的閘道 |
    | `update.startup`          | `string`  | `off`   | 選用的閘道啟動時重新整理：`off`、`idle` 或 `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | `startup: "idle"` 重新整理執行前的延遲         |
    | `update.waitForBootSync`  | `boolean` | `false` | 封鎖管理員開啟，直到其初始重新整理完成        |
    | `update.embedInterval`    | `string`  | --      | 獨立的嵌入步調                           |
    | `update.commandTimeoutMs` | `number`  | --      | QMD 指令的逾時時間                         |
    | `update.updateTimeoutMs`  | `number`  | --      | QMD 更新作業的逾時時間                     |
    | `update.embedTimeoutMs`   | `number`  | --      | QMD 嵌入作業的逾時時間                      |
  </Accordion>
  <Accordion title="限制">
    | Key                       | Type     | Default | Description                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | 最大搜尋結果         |
    | `limits.maxSnippetChars`  | `number` | --      | 限制摘要長度       |
    | `limits.maxInjectedChars` | `number` | --      | 限制總插入字元 |
    | `limits.timeoutMs`        | `number` | `4000`  | 搜尋逾時             |
  </Accordion>
  <Accordion title="範圍">
    控制哪些會話可以接收 QMD 搜尋結果。Schema 與 [`session.sendPolicy`](/zh-Hant/gateway/config-agents#session) 相同：

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

    預設設定允許直接和頻道會話，但仍拒絕群組。

    預設僅限 DM。`match.keyPrefix` 符合正規化的會話鍵；`match.rawKeyPrefix` 符合包含 `agent:<id>:` 的原始鍵。

  </Accordion>
  <Accordion title="引用">
    `memory.citations` 適用於所有後端：

    | Value            | Behavior                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (預設) | 在摘要中包含 `Source: <path#line>` 頁尾    |
    | `on`             | 總是包含頁尾                               |
    | `off`            | 省略頁尾 (路徑仍在內部傳遞給代理程式) |

  </Accordion>
</AccordionGroup>

QMD 啟動刷新在閘道啟動期間使用一次性子程式路徑。當記憶搜尋開啟以供互動使用時，長存活的 QMD 管理器仍擁有一般的檔案監視器和計時器。

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

夢境作為一個計劃的掃描運行，並使用內部輕度/深度/REM 階段作為實作細節。

關於概念行為和斜線指令，請參閱 [夢境](/zh-Hant/concepts/dreaming)。

### 使用者設定

| 鍵          | 類型      | 預設值      | 說明                         |
| ----------- | --------- | ----------- | ---------------------------- |
| `enabled`   | `boolean` | `false`     | 完全啟用或停用夢境           |
| `frequency` | `string`  | `0 3 * * *` | 完整夢境掃描的選用 cron 頻率 |
| `model`     | `string`  | 預設模型    | 選用的夢境日記子代理模型覆寫 |

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
- `dreaming.model` 使用現有的外掛子代理信任閘門；啟用它之前請設定 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 當設定的模型無法使用時，夢境日記會使用工作階段預設模型重試一次。信任或允許清單失敗會被記錄下來，且不會無聲地重試。
- 淺層/深層/REM 階段策略和閾值屬於內部行為，而非使用者可配置的選項。

</Note>

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [記憶概覽](/zh-Hant/concepts/memory)
- [記憶搜尋](/zh-Hant/concepts/memory-search)

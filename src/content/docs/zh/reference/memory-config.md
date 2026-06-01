---
summary: "内存搜索、嵌入提供商、QMD、混合搜索和多模态索引的所有配置选项"
title: "内存配置参考"
sidebarTitle: "内存配置"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

本页列出了 OpenClaw 内存搜索的每一个配置选项。有关概念性概述，请参阅：

<CardGroup cols={2}>
  <Card title="Memory overview" href="/zh/concepts/memory">
    内存的工作原理。
  </Card>
  <Card title="Builtin engine" href="/zh/concepts/memory-builtin">
    默认的 SQLite 后端。
  </Card>
  <Card title="QMD engine" href="/zh/concepts/memory-qmd">
    本地优先的 sidecar。
  </Card>
  <Card title="Memory search" href="/zh/concepts/memory-search">
    搜索管道和调优。
  </Card>
  <Card title="Active memory" href="/zh/concepts/active-memory">
    用于交互式会话的内存子代理。
  </Card>
</CardGroup>

除非另有说明，所有内存搜索设置均位于 `agents.defaults.memorySearch` 下的 `openclaw.json` 中。

<Note>
如果您正在寻找 **active memory** 功能开关和子代理配置，那位于 `plugins.entries.active-memory` 而不是 `memorySearch`。

Active memory 采用双门控模型：

1. 插件必须已启用并面向当前的代理 ID
2. 请求必须符合资格的交互式持久聊天会话

有关激活模型、插件拥有的配置、记录持久性和安全推出模式，请参阅 [Active Memory](/zh/concepts/active-memory)。

</Note>

---

## 提供商选择

| 键         | 类型      | 默认值       | 描述                                                                                                                                                                                                                                           |
| ---------- | --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | `"openai"`   | 嵌入适配器 ID，例如 `bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、`openai-compatible` 或 `voyage`；也可以是已配置的 `models.providers.<id>`，其 `api` 指向内存嵌入适配器或 OpenAI 兼容的模型 API |
| `model`    | `string`  | 提供商默认值 | 嵌入模型名称                                                                                                                                                                                                                                   |
| `fallback` | `string`  | `"none"`     | 主适配器失败时的备用适配器 ID                                                                                                                                                                                                                  |
| `enabled`  | `boolean` | `true`       | 启用或禁用记忆搜索                                                                                                                                                                                                                             |

当未设置 `provider` 时，OpenClaw 使用 OpenAI 嵌入。显式设置 `provider` 以使用 Gemini、Voyage、Mistral、DeepInfra、Bedrock、GitHub Copilot、
Ollama、本地 GGUF 模型或 OpenAI 兼容的 `/v1/embeddings` 端点。
仍然显示 `provider: "auto"` 的旧配置会解析为 `openai`。

### 自定义提供商 ID

`memorySearch.provider` 可以指向一个自定义 `models.providers.<id>` 条目，用于内存特定的提供商适配器（如 `ollama`OpenAI），或用于与 OpenAI 兼容的模型 API（如 `openai-responses` / `openai-completions`OpenClaw）。OpenClaw 会为嵌入适配器解析该提供商的 `api` 所有者，同时保留自定义提供商 ID 用于端点、身份验证和模型前缀处理。这允许多 GPU 或多主机设置将内存嵌入专用于特定的本地端点：

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

### API 密钥解析

远程嵌入需要 API 密钥。Bedrock 改用 AWS SDK 默认凭证链（实例角色、SSO、访问密钥）。

| 提供商         | 环境变量                                           | 配置键                              |
| -------------- | -------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS 凭证链                                         | 不需要 API 密钥                     |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | 通过设备登录进行身份验证配置文件    |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY` (占位符)                          | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`    |

<Note>Codex OAuth 仅涵盖聊天/补全，不满足嵌入请求。</Note>

---

## 远程端点配置

对于不应继承全局 OpenAI 聊天凭证的通用 OpenAI 兼容
`/v1/embeddings`OpenAI 服务器，请使用 `provider: "openai-compatible"`OpenAI。

<ParamField path="remote.baseUrl" type="string" API>
  自定义 API 基础 URL。
</ParamField>
<ParamField path="remote.apiKey" type="string" API>
  覆盖 API 密钥。
</ParamField>
<ParamField path="remote.headers" type="object">
  额外的 HTTP 标头（与提供商默认值合并）。
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

## 提供商特定配置

<AccordionGroup>
  <Accordion title="Gemini">
    | Key                    | Type     | Default                | Description                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072        |

    <Warning>
    更改模型或 `outputDimensionality` 会触发自动完全重新索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAIOpenAI 兼容的输入类型"OpenAI>
    OpenAI 兼容的嵌入端点可以选择使用提供商特定的 `input_type` 请求字段。这对于需要为查询和文档嵌入使用不同标签的非对称嵌入模型非常有用。

    | Key                 | Type     | Default | Description                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | unset   | 查询和文档嵌入共享的 `input_type`   |
    | `queryInputType`    | `string` | unset   | 查询时的 `input_type`；覆盖 `inputType`          |
    | `documentInputType` | `string` | unset   | 索引/文档的 `input_type`；覆盖 `inputType`      |

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

    更改这些值会影响提供商批量索引的嵌入缓存标识，当上游模型对标签的处理不同时，应该随后进行内存重新索引。

  </Accordion>
  <Accordion title="Bedrock"APIOpenClaw>
    ### Bedrock 嵌入配置

    Bedrock 使用 AWS SDK 默认凭证链 — 无需 API 密钥。如果 OpenClaw 在 EC2 上运行并具有启用 Bedrock 的实例角色，只需设置提供商和模型：

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

    | 键                    | 类型     | 默认值                        | 描述                     |
    | ---------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID  |
    | `outputDimensionality` | `number` | 模型默认                  | 对于 Titan V2：256、512 或 1024 |

    **支持的模型**（具有系列检测和维度默认值）：

    | 模型 ID                                   | 提供商   | 默认维度 | 可配置维度    |
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

    带有吞吐量后缀的变体（例如 `amazon.titan-embed-text-v1:2:8k`）继承基础模型的配置。

    **身份验证：** Bedrock 身份验证使用标准的 AWS SDK 凭证解析顺序：

    1. 环境变量 (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. SSO 令牌缓存
    3. Web 身份令牌凭证
    4. 共享凭证和配置文件
    5. ECS 或 EC2 元数据凭证

    区域从 `AWS_REGION`、`AWS_DEFAULT_REGION`、`amazon-bedrock` 提供商 `baseUrl` 解析，或默认为 `us-east-1`。

    **IAM 权限：** IAM 角色或用户需要：

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    为了遵循最小权限原则，请将 `InvokeModel` 限定为特定模型：

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="Local (GGUF + node-llama-cpp)">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | auto-downloaded        | Path to GGUF 模型 file                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp default | Cache dir for downloaded models                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | Context window size for the embedding context. 4096 covers typical chunks (128–512 tokens) while bounding non-weight VRAM. Lower to 1024–2048 on constrained hosts. `"auto"` uses the 模型's trained maximum — not recommended for 8B+ models (Qwen3-Embedding-8B: 40 960 tokens → ~32 GB VRAM vs ~8.8 GB at 4096). |

    Default 模型: `embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB, auto-downloaded). Source checkouts still require native build approval: `pnpm approve-builds` then `pnpm rebuild node-llama-cpp`.

    Use the standalone CLI to verify the same 提供商 path the Gateway(网关) uses:

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    Set `provider: "local"` explicitly for local GGUF embeddings. `hf:` and HTTP(S) 模型 references are supported for explicit local configs, but they do not change the default 提供商.

  </Accordion>
</AccordionGroup>

### 内联嵌入超时

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  覆盖内存索引期间内联嵌入批次的超时时间。

未设置则使用提供商默认值：对于本地/自托管提供商（例如 `local`、`ollama` 和 `lmstudio`）为 600 秒，对于托管提供商为 120 秒。当本地 CPU 密集型嵌入批处理正常但缓慢时，请增加此值。

</ParamField>

---

## 混合搜索配置

均在 `memorySearch.query.hybrid` 之下：

| 键                    | 类型      | 默认值 | 描述                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 启用混合 BM25 + 向量搜索 |
| `vectorWeight`        | `number`  | `0.7`  | 向量分数的权重 (0-1)     |
| `textWeight`          | `number`  | `0.3`  | BM25 分数的权重 (0-1)    |
| `candidateMultiplier` | `number`  | `4`    | 候选池大小倍数           |

<Tabs>
  <Tab title="MMR (多样性)">
    | 键           | 类型      | 默认值 | 描述                          |
    | ------------- | --------- | ------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | 启用 MMR 重排序                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多样性，1 = 最大相关性 |
  </Tab>
  <Tab title="时间衰减 (近期性)">
    | 键                          | 类型      | 默认值 | 描述               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | 启用近期性提升      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | 分数每 N 天减半 |

    常青文件（`MEMORY.md`，位于 `memory/` 中的无日期文件）永远不会衰减。

  </Tab>
</Tabs>

### 完整示例

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

## 其他内存路径

| 键           | 类型       | 描述                   |
| ------------ | ---------- | ---------------------- |
| `extraPaths` | `string[]` | 要索引的其他目录或文件 |

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

路径可以是绝对路径或相对于工作区的路径。系统会递归扫描目录中的 `.md` 文件。符号链接的处理取决于活动的后端：内置引擎会忽略符号链接，而 QMD 则遵循底层 QMD 扫描器的行为。

对于代理范围（agent-scoped）的跨代理记录搜索，请使用 `agents.list[].memorySearch.qmd.extraCollections` 而不是 `memory.qmd.paths`。这些额外的集合遵循相同的 `{ path, name, pattern? }` 形状，但它们是按代理合并的，并且当路径指向当前工作区外部时，可以保留显式的共享名称。如果相同的解析路径同时出现在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中，QMD 将保留第一个条目并跳过重复项。

---

## 多模态内存 (Gemini)

使用 Gemini Embedding 2 与 Markdown 一起索引图像和音频：

| 键                        | 类型       | 默认值     | 描述                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引文件的最大大小                    |

<Note>仅适用于 `extraPaths` 中的文件。默认内存根目录仅限 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。</Note>

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`（图像）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## 嵌入缓存

| 键                 | 类型      | 默认值  | 描述                   |
| ------------------ | --------- | ------- | ---------------------- |
| `cache.enabled`    | `boolean` | `true`  | 在 SQLite 中缓存块嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大缓存嵌入数         |

防止在重新索引或转录更新时对未更改的文本进行重新嵌入。

---

## 批量索引

| 键                            | 类型      | 默认值  | 描述             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | 并行内联嵌入     |
| `remote.batch.enabled`        | `boolean` | `false` | 启用批量嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 并行批处理作业   |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批处理完成   |
| `remote.batch.pollIntervalMs` | `number`  | --      | 轮询间隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批处理超时       |

适用于 `openai`、`gemini` 和 `voyage`。对于大规模回填，OpenAI 批处理通常是最快且最便宜的。

`remote.nonBatchConcurrency` 控制本地/自托管提供商以及当提供商批量 API 未激活时的托管提供商所使用的内联嵌入调用。对于非批量索引，Ollama 默认为 `1`，以免压垮较小的本地主机；在较大的机器上可以设置更高的值。

这与 `sync.embeddingBatchTimeoutSeconds` 是分开的，后者控制内联嵌入调用的超时时间。

---

## 会话记忆搜索（实验性）

索引会话转录并通过 `memory_search` 展示它们：

| 键                            | 类型       | 默认值       | 描述                         |
| ----------------------------- | ---------- | ------------ | ---------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 启用会话索引                 |
| `sources`                     | `string[]` | `["memory"]` | 添加 `"sessions"` 以包含转录 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的字节阈值           |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的消息阈值           |

<Warning>会话索引是可选加入的，并且异步运行。结果可能略有延迟。会话日志存储在磁盘上，因此请将文件系统访问视为信任边界。</Warning>

---

## SQLite 向量加速 (sqlite-vec)

| 键                           | 类型      | 默认值  | 描述                         |
| ---------------------------- | --------- | ------- | ---------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 进行向量查询 |
| `store.vector.extensionPath` | `string`  | bundled | 覆盖 sqlite-vec 路径         |

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内余弦相似度计算。

---

## 索引存储

| 键                    | 类型     | 默认值                                | 描述                                    |
| --------------------- | -------- | ------------------------------------- | --------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支持 `{agentId}` 标记）       |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 分词器（`unicode61` 或 `trigram`） |

---

## QMD 后端配置

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置都位于 `memory.qmd` 下：

| 键                       | 类型      | 默认值   | 描述                                                                  |
| ------------------------ | --------- | -------- | --------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可执行文件路径；当服务 `PATH` 与您的 shell 不同时，请设置绝对路径 |
| `searchMode`             | `string`  | `search` | 搜索命令：`search`，`vsearch`，`query`                                |
| `includeDefaultMemory`   | `boolean` | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md`                               |
| `paths[]`                | `array`   | --       | 额外路径：`{ name, path, pattern? }`                                  |
| `sessions.enabled`       | `boolean` | `false`  | 索引会话记录                                                          |
| `sessions.retentionDays` | `number`  | --       | Transcript retention                                                  |
| `sessions.exportDir`     | `string`  | --       | Export directory                                                      |

`searchMode: "search"`OpenClaw 是仅限词法/BM25 的。对于该模式，OpenClaw 不会运行语义向量就绪探测或 QMD 嵌入维护，包括在 `memory status --deep` 期间；`vsearch` 和 `query` 仍然需要 QMD 向量就绪和嵌入。

OpenClaw 倾向于使用当前的 QMD 集合和 MCP 查询形状，但通过在需要时尝试兼容的集合模式标志和旧的 MCP 工具名称，保持旧版 QMD 版本继续工作。当 QMD 宣布支持多个集合过滤器时，同源集合由一个 QMD 进程搜索；旧版 QMD 构建保留每个集合的兼容性路径。同源是指持久内存集合被分组在一起，而会话记录集合保持为单独的组，以便源多样化仍然具有这两个输入。

<Note>QMD 模型覆盖设置保留在 QMD 端，而不是 OpenClaw 配置中。如果需要全局覆盖 QMD 模型，请在网关运行时环境中设置环境变量，例如 OpenClaw`QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。</Note>

<AccordionGroup>
  <Accordion title="Update schedule">
    | Key                       | Type      | Default | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | Refresh interval                      |
    | `update.debounceMs`       | `number`  | `15000` | Debounce file changes                 |
    | `update.onBoot`           | `boolean` | `true`  | Refresh when the long-lived QMD manager opens; also gates opt-in startup refresh |
    | `update.startup`          | `string`  | `off`   | Optional gateway-start refresh: `off`, `idle`, or `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | Delay before `startup: "idle"` refresh runs |
    | `update.waitForBootSync`  | `boolean` | `false` | Block manager opening until its initial refresh completes |
    | `update.embedInterval`    | `string`  | --      | Separate embed cadence                |
    | `update.commandTimeoutMs` | `number`  | --      | Timeout for QMD commands              |
    | `update.updateTimeoutMs`  | `number`  | --      | Timeout for QMD update operations     |
    | `update.embedTimeoutMs`   | `number`  | --      | Timeout for QMD embed operations      |
  </Accordion>
  <Accordion title="Limits">
    | Key                       | Type     | Default | Description                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | 最大搜索结果数         |
    | `limits.maxSnippetChars`  | `number` | --      | 限制片段长度       |
    | `limits.maxInjectedChars` | `number` | --      | 限制注入的总字符数 |
    | `limits.timeoutMs`        | `number` | `4000`  | 搜索超时             |
  </Accordion>
  <Accordion title="Scope">
    控制哪些会话可以接收 QMD 搜索结果。架构与 [`session.sendPolicy`](/zh/gateway/config-agents#session) 相同：

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

    默认配置允许直接和渠道会话，但仍然拒绝群组。

    默认为仅限私信（私信）。`match.keyPrefix` 匹配规范化的会话键；`match.rawKeyPrefix` 匹配包括 `agent:<id>:` 在内的原始键。

  </Accordion>
  <Accordion title="Citations">
    `memory.citations` 适用于所有后端：

    | Value            | Behavior                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (默认) | 在片段中包含 `Source: <path#line>` 页脚    |
    | `on`             | 始终包含页脚                               |
    | `off`            | 省略页脚（路径仍在内部传递给代理） |

  </Accordion>
</AccordionGroup>

QMD 启动刷新在网关启动期间使用一次性子进程路径。当内存搜索被打开供交互使用时，长生命周期的 QMD 管理器仍然拥有常规文件监视器和间隔计时器。

### 完整 QMD 示例

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

Dreaming 配置在 `plugins.entries.memory-core.config.dreaming` 下，而不是 `agents.defaults.memorySearch` 下。

Dreaming 作为一个计划的 sweeps 运行，并使用内部 light/deep/REM 阶段作为实现细节。

有关概念行为和斜杠命令，请参阅 [Dreaming](/zh/concepts/dreaming)。

### 用户设置

| 键                                     | 类型      | 默认值      | 描述                                                                                 |
| -------------------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------ |
| `enabled`                              | `boolean` | `false`     | 完全启用或禁用做梦功能                                                               |
| `frequency`                            | `string`  | `0 3 * * *` | 完整的梦境扫描的可选 cron 频率                                                       |
| `model`                                | `string`  | 默认模型    | 可选的梦境日记子代理模型覆盖                                                         |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`       | 从每个提升至 `MEMORY.md` 的短期记忆片段中保留的最大估计 token 数；来源元数据保持可见 |

### 示例

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
- Dreaming 会将机器状态写入 `memory/.dreams/`。
- Dreaming 会将人类可读的叙事输出写入 `DREAMS.md`（或现有的 `dreams.md`）。
- `dreaming.model` 使用现有的插件子代理信任门；在启用它之前请设置 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 当配置的模型不可用时，Dream Diary 会使用会话默认模型重试一次。信任或允许列表失败将被记录，并且不会静默重试。
- 浅睡/深睡/REM 阶段策略和阈值是内部行为，不是面向用户的配置。

</Note>

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [记忆概述](/zh/concepts/memory)
- [记忆搜索](/zh/concepts/memory-search)

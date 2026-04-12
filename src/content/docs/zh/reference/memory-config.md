---
title: "内存配置参考"
summary: "内存搜索、嵌入提供商、QMD、混合搜索和多模态索引的所有配置选项"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# 内存配置参考

本页面列出了 OpenClaw 内存搜索的每个配置选项。有关概念概述，请参阅：

- [Memory Overview](/en/concepts/memory) -- 记忆的工作原理
- [Builtin Engine](/en/concepts/memory-builtin) -- 默认的 SQLite 后端
- [QMD Engine](/en/concepts/memory-qmd) -- 本地优先的 sidecar
- [Memory Search](/en/concepts/memory-search) -- 搜索管道和调优
- [Active Memory](/en/concepts/active-memory) -- 为交互式会话启用记忆子代理

除非另有说明，所有记忆搜索设置均位于 `agents.defaults.memorySearch` 下的
`openclaw.json` 中。

如果您正在寻找 **active memory** 功能开关和子代理配置，
它们位于 `plugins.entries.active-memory` 而不是 `memorySearch` 中。

Active memory 使用双重门控模型：

1. 必须启用插件并针对当前的代理 ID
2. 请求必须是符合条件的交互式持久聊天会话

有关激活模型、
插件拥有的配置、脚本持久化和安全推出模式，请参阅 [Active Memory](/en/concepts/active-memory)。

---

## 提供商选择

| 键         | 类型      | 默认值     | 描述                                                                                 |
| ---------- | --------- | ---------- | ------------------------------------------------------------------------------------ |
| `provider` | `string`  | 自动检测   | 嵌入适配器 ID：`openai`、`gemini`、`voyage`、`mistral`、`bedrock`、`ollama`、`local` |
| `model`    | `string`  | 提供商默认 | 嵌入模型名称                                                                         |
| `fallback` | `string`  | `"none"`   | 主适配器失败时的备用适配器 ID                                                        |
| `enabled`  | `boolean` | `true`     | 启用或禁用记忆搜索                                                                   |

### 自动检测顺序

当未设置 `provider` 时，OpenClaw 选择第一个可用的：

1. `local` -- 如果已配置 `memorySearch.local.modelPath` 且文件存在。
2. `openai` -- 如果可以解析 OpenAI 密钥。
3. `gemini` -- 如果可以解析 Gemini 密钥。
4. `voyage` -- 如果可以解析 Voyage 密钥。
5. `mistral` -- 如果可以解析 Mistral 密钥。
6. `bedrock` -- 如果 AWS SDK 凭证链解析成功（实例角色、访问密钥、配置文件、SSO、Web 身份或共享配置）。

`ollama` 受支持但不会自动检测（需显式设置）。

### API 密钥解析

远程嵌入需要 API 密钥。Bedrock 改用 AWS SDK 默认凭证链（实例角色、SSO、访问密钥）。

| 提供商  | 环境变量                  | 配置键                            |
| ------- | ------------------------- | --------------------------------- |
| OpenAI  | `OPENAI_API_KEY`          | `models.providers.openai.apiKey`  |
| Gemini  | `GEMINI_API_KEY`          | `models.providers.google.apiKey`  |
| Voyage  | `VOYAGE_API_KEY`          | `models.providers.voyage.apiKey`  |
| Mistral | `MISTRAL_API_KEY`         | `models.providers.mistral.apiKey` |
| Bedrock | AWS 凭证链                | 不需要 API 密钥                   |
| Ollama  | `OLLAMA_API_KEY` (占位符) | --                                |

Codex OAuth 仅涵盖聊天/补全，不满足嵌入请求。

---

## 远程端点配置

对于自定义 OpenAI 兼容端点或覆盖提供商默认设置：

| 键               | 类型     | 描述                                   |
| ---------------- | -------- | -------------------------------------- |
| `remote.baseUrl` | `string` | 自定义 API 基础 URL                    |
| `remote.apiKey`  | `string` | 覆盖 API 密钥                          |
| `remote.headers` | `object` | 额外的 HTTP 标头（与提供商默认值合并） |

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

| 键                     | 类型     | 默认值                 | 描述                                |
| ---------------------- | -------- | ---------------------- | ----------------------------------- |
| `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072 |

<Warning>更改模型或 `outputDimensionality` 会触发自动完全重建索引。</Warning>

---

## Bedrock 嵌入配置

Bedrock 使用 AWS SDK 默认凭证链 -- 不需要 API 密钥。
如果 OpenClaw 在 EC2 上运行并具有启用 Bedrock 的实例角色，只需设置
提供商和模型：

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

| 键                     | 类型     | 默认值                         | 描述                            |
| ---------------------- | -------- | ------------------------------ | ------------------------------- |
| `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID        |
| `outputDimensionality` | `number` | 模型默认值                     | 对于 Titan V2：256、512 或 1024 |

### 支持的模型

支持以下模型（具有系列检测和维度默认值）：

| 模型 ID                                    | 提供商     | 默认维度 | 可配置维度           |
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

带吞吐量后缀的变体（例如 `amazon.titan-embed-text-v1:2:8k`）继承
基础模型的配置。

### 身份验证

Bedrock 身份验证使用标准的 AWS SDK 凭证解析顺序：

1. 环境变量（`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`）
2. SSO 令牌缓存
3. Web 身份令牌凭证
4. 共享凭证和配置文件
5. ECS 或 EC2 元数据凭证

区域是从 `AWS_REGION`、`AWS_DEFAULT_REGION`、
`amazon-bedrock` 提供商 `baseUrl` 解析的，或者默认为 `us-east-1`。

### IAM 权限

IAM 角色或用户需要：

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

为了遵循最小权限原则，请将 `InvokeModel` 限制为特定模型：

```
arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
```

---

## 本地嵌入配置

| 键                    | 类型     | 默认值                | 描述                |
| --------------------- | -------- | --------------------- | ------------------- |
| `local.modelPath`     | `string` | 自动下载              | GGUF 模型文件的路径 |
| `local.modelCacheDir` | `string` | node-llama-cpp 默认值 | 下载模型的缓存目录  |

默认模型：`embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB，自动下载）。
需要本机构建：`pnpm approve-builds` 然后 `pnpm rebuild node-llama-cpp`。

---

## 混合搜索配置

所有内容均在 `memorySearch.query.hybrid` 下：

| 键                    | 类型      | 默认值 | 描述                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 启用混合 BM25 + 向量搜索 |
| `vectorWeight`        | `number`  | `0.7`  | 向量评分的权重 (0-1)     |
| `textWeight`          | `number`  | `0.3`  | BM25 评分的权重 (0-1)    |
| `candidateMultiplier` | `number`  | `4`    | 候选池大小倍数           |

### MMR（多样性）

| 键            | 类型      | 默认值  | 描述                           |
| ------------- | --------- | ------- | ------------------------------ |
| `mmr.enabled` | `boolean` | `false` | 启用 MMR 重排序                |
| `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多样性，1 = 最大相关性 |

### 时间衰减（近期）

| 键                           | 类型      | 默认值  | 描述            |
| ---------------------------- | --------- | ------- | --------------- |
| `temporalDecay.enabled`      | `boolean` | `false` | 启用近期加权    |
| `temporalDecay.halfLifeDays` | `number`  | `30`    | 评分每 N 天减半 |

常青文件（`MEMORY.md`，`memory/` 中的非日期文件）永不衰减。

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

## 额外的记忆路径

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

路径可以是绝对路径或相对于工作区的路径。目录将递归扫描 `.md` 文件。符号链接的处理取决于活动的后端：
内置引擎忽略符号链接，而 QMD 遵循底层 QMD
扫描器行为。

对于代理范围的跨代理转录搜索，请使用 `agents.list[].memorySearch.qmd.extraCollections` 而不是 `memory.qmd.paths`。
这些额外的集合遵循相同的 `{ path, name, pattern? }` 形状，但它们是按代理合并的，并且当路径指向当前工作区之外时，可以保留显式的共享名称。
如果相同的解析路径同时出现在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中，QMD 将保留第一个条目并跳过重复项。

---

## 多模态记忆 (Gemini)

使用 Gemini Embedding 2 与 Markdown 一起索引图像和音频：

| 键                        | 类型       | 默认值     | 描述                                  |
| ------------------------- | ---------- | ---------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引                        |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的最大文件大小                    |

仅适用于 `extraPaths` 中的文件。默认记忆根目录仅限 Markdown。
需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`
（图像）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## 嵌入缓存

| 键 (Key)           | 类型      | 默认值  | 描述                   |
| ------------------ | --------- | ------- | ---------------------- |
| `cache.enabled`    | `boolean` | `false` | 在 SQLite 中缓存块嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大缓存嵌入数         |

防止在重新索引或转录更新期间对未更改的文本进行重新嵌入。

---

## 批量索引

| 键 (Key)                      | 类型      | 默认值  | 描述           |
| ----------------------------- | --------- | ------- | -------------- |
| `remote.batch.enabled`        | `boolean` | `false` | 启用批量 API   |
| `remote.batch.concurrency`    | `number`  | `2`     | 并行批处理作业 |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批处理完成 |
| `remote.batch.pollIntervalMs` | `number`  | --      | 轮询间隔       |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批处理超时     |

适用于 `openai`、`gemini` 和 `voyage`。对于大规模回填，OpenAI 批处理通常是最快且最经济的。

---

## 会话记忆搜索（实验性）

索引会话记录并通过 `memory_search` 展示：

| 键                            | 类型       | 默认值       | 描述                         |
| ----------------------------- | ---------- | ------------ | ---------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 启用会话索引                 |
| `sources`                     | `string[]` | `["memory"]` | 添加 `"sessions"` 以包含记录 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的字节阈值           |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的消息阈值           |

会话索引默认关闭，并异步运行。结果可能略有滞后。会话日志存储在磁盘上，因此请将文件系统访问视为信任边界。

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
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支持 `{agentId}` token）      |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 分词器（`unicode61` 或 `trigram`） |

---

## QMD 后端配置

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置均位于
`memory.qmd` 下：

| 键                       | 类型      | 默认值   | 描述                                    |
| ------------------------ | --------- | -------- | --------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可执行文件路径                      |
| `searchMode`             | `string`  | `search` | 搜索命令：`search`、`vsearch`、`query`  |
| `includeDefaultMemory`   | `boolean` | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md` |
| `paths[]`                | `array`   | --       | 额外路径：`{ name, path, pattern? }`    |
| `sessions.enabled`       | `boolean` | `false`  | 索引会话记录                            |
| `sessions.retentionDays` | `number`  | --       | 记录保留                                |
| `sessions.exportDir`     | `string`  | --       | 导出目录                                |

OpenClaw 优先使用当前的 QMD 集合和 MCP 查询形状，但在需要时通过回退到旧版 `--mask` 集合标志
和较旧的 MCP 工具名称来保持较旧的 QMD 版本正常工作。

QMD 模型覆盖保留在 QMD 一侧，而不在 OpenClaw 配置中。如果您需要
全局覆盖 QMD 的模型，请在网关
运行时环境中设置环境变量，例如
`QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。

### 更新计划

| 键                        | 类型      | 默认值  | 描述                 |
| ------------------------- | --------- | ------- | -------------------- |
| `update.interval`         | `string`  | `5m`    | 刷新间隔             |
| `update.debounceMs`       | `number`  | `15000` | 文件变更防抖         |
| `update.onBoot`           | `boolean` | `true`  | 启动时刷新           |
| `update.waitForBootSync`  | `boolean` | `false` | 阻塞启动直至刷新完成 |
| `update.embedInterval`    | `string`  | --      | 独立的嵌入节奏       |
| `update.commandTimeoutMs` | `number`  | --      | QMD 命令超时         |
| `update.updateTimeoutMs`  | `number`  | --      | QMD 更新操作超时     |
| `update.embedTimeoutMs`   | `number`  | --      | QMD 嵌入操作超时     |

### 限制

| 键                        | 类型     | 默认值 | 描述               |
| ------------------------- | -------- | ------ | ------------------ |
| `limits.maxResults`       | `number` | `6`    | 最大搜索结果数     |
| `limits.maxSnippetChars`  | `number` | --     | 限制片段长度       |
| `limits.maxInjectedChars` | `number` | --     | 限制注入的总字符数 |
| `limits.timeoutMs`        | `number` | `4000` | 搜索超时           |

### 范围

控制哪些会话可以接收 QMD 搜索结果。模式与
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

默认为仅私信。 `match.keyPrefix` 匹配规范化的会话键；
`match.rawKeyPrefix` 匹配包含 `agent:<id>:` 的原始键。

### 引用

`memory.citations` 适用于所有后端：

| 值             | 行为                                    |
| -------------- | --------------------------------------- |
| `auto`（默认） | 在片段中包含 `Source: <path#line>` 页脚 |
| `on`           | 始终包含页脚                            |
| `off`          | 省略页脚（路径仍在内部传递给代理）      |

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

## 梦境（实验性）

梦境在 `plugins.entries.memory-core.config.dreaming` 下配置，
而不是在 `agents.defaults.memorySearch` 下。

梦境作为一个定期的扫描运行，并使用内部浅度/深度/REM 阶段作为
实现细节。

有关概念行为和斜杠命令，请参见 [Dreaming](/en/concepts/dreaming)。

### 用户设置

| 键          | 类型      | 默认值      | 描述                           |
| ----------- | --------- | ----------- | ------------------------------ |
| `enabled`   | `boolean` | `false`     | 完全启用或禁用做梦             |
| `frequency` | `string`  | `0 3 * * *` | 完整的梦境扫描的可选 cron 频率 |

### 示例

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

注意事项：

- 做梦会将机器状态写入 `memory/.dreams/`。
- 做梦会将人类可读的叙述输出写入 `DREAMS.md`（或现有的 `dreams.md`）。
- 浅度/深度/REM 阶段策略和阈值属于内部行为，而非面向用户的配置。

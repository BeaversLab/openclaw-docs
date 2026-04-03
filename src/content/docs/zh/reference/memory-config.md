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

- [内存概述](/en/concepts/memory) -- 内存的工作原理
- [内置引擎](/en/concepts/memory-builtin) -- 默认 SQLite 后端
- [QMD 引擎](/en/concepts/memory-qmd) -- 本地优先的配套程序
- [内存搜索](/en/concepts/memory-search) -- 搜索管道和调优

除非另有说明，否则所有内存搜索设置均位于 `openclaw.json` 中的 `agents.defaults.memorySearch` 下。

---

## 提供商选择

| 键         | 类型      | 默认值       | 描述                                                                      |
| ---------- | --------- | ------------ | ------------------------------------------------------------------------- |
| `provider` | `string`  | 自动检测     | 嵌入适配器 ID：`openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` |
| `model`    | `string`  | 提供商默认值 | 嵌入模型名称                                                              |
| `fallback` | `string`  | `"none"`     | 主适配器失败时的后备适配器 ID                                             |
| `enabled`  | `boolean` | `true`       | 启用或禁用内存搜索                                                        |

### 自动检测顺序

当未设置 `provider` 时，OpenClaw 会选择第一个可用的选项：

1. `local` -- 如果已配置 `memorySearch.local.modelPath` 且文件存在。
2. `openai` -- 如果可以解析 OpenAI 密钥。
3. `gemini` -- 如果可以解析 Gemini 密钥。
4. `voyage` -- 如果可以解析 Voyage 密钥。
5. `mistral` -- 如果可以解析 Mistral 密钥。

支持 `ollama` 但不会自动检测（需显式设置）。

### API 密钥解析

Remote embeddings require an API key. OpenClaw resolves from:
auth profiles, `models.providers.*.apiKey`, or 环境变量.

| 提供商  | 环境变量                  | 配置键                            |
| ------- | ------------------------- | --------------------------------- |
| OpenAI  | `OPENAI_API_KEY`          | `models.providers.openai.apiKey`  |
| Gemini  | `GEMINI_API_KEY`          | `models.providers.google.apiKey`  |
| Voyage  | `VOYAGE_API_KEY`          | `models.providers.voyage.apiKey`  |
| Mistral | `MISTRAL_API_KEY`         | `models.providers.mistral.apiKey` |
| Ollama  | `OLLAMA_API_KEY` (占位符) | --                                |

Codex OAuth covers chat/completions only and does not satisfy embedding
requests.

---

## 远程端点配置

For custom OpenAI-compatible endpoints or overriding 提供商 defaults:

| 键               | 类型     | 描述                                             |
| ---------------- | -------- | ------------------------------------------------ |
| `remote.baseUrl` | `string` | 自定义 API 基础 URL                              |
| `remote.apiKey`  | `string` | 覆盖 API 密钥                                    |
| `remote.headers` | `object` | Extra HTTP headers (merged with 提供商 defaults) |

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

| 键                     | 类型     | 默认值                 | 描述                                       |
| ---------------------- | -------- | ---------------------- | ------------------------------------------ |
| `model`                | `string` | `gemini-embedding-001` | Also supports `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | For Embedding 2: 768, 1536, or 3072        |

<Warning>Changing 模型 or `outputDimensionality` triggers an automatic full reindex.</Warning>

---

## 本地嵌入配置

| 键                    | 类型     | 默认值              | 描述                 |
| --------------------- | -------- | ------------------- | -------------------- |
| `local.modelPath`     | `string` | auto-downloaded     | GGUF 模型文件的路径  |
| `local.modelCacheDir` | `string` | node-llama-cpp 默认 | 已下载模型的缓存目录 |

Default 模型: `embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB, auto-downloaded).
Requires native build: `pnpm approve-builds` then `pnpm rebuild node-llama-cpp`.

---

## 混合搜索配置

All under `memorySearch.query.hybrid`:

| 键                    | 类型      | 默认值 | 描述                     |
| --------------------- | --------- | ------ | ------------------------ |
| `enabled`             | `boolean` | `true` | 启用混合 BM25 + 向量搜索 |
| `vectorWeight`        | `number`  | `0.7`  | 向量分数的权重 (0-1)     |
| `textWeight`          | `number`  | `0.3`  | BM25 分数的权重 (0-1)    |
| `candidateMultiplier` | `number`  | `4`    | 候选池大小倍数           |

### MMR (多样性)

| 键 (Key)      | 类型 (Type) | 默认值 (Default) | 描述 (Description)             |
| ------------- | ----------- | ---------------- | ------------------------------ |
| `mmr.enabled` | `boolean`   | `false`          | 启用 MMR 重排序                |
| `mmr.lambda`  | `number`    | `0.7`            | 0 = 最大多样性，1 = 最大相关性 |

### 时间衰减 (近期性)

| 键 (Key)                     | 类型 (Type) | 默认值 (Default) | 描述 (Description) |
| ---------------------------- | ----------- | ---------------- | ------------------ |
| `temporalDecay.enabled`      | `boolean`   | `false`          | 启用近期性提升     |
| `temporalDecay.halfLifeDays` | `number`    | `30`             | 分数每 N 天减半    |

常青文件 (`MEMORY.md`，即 `memory/` 中的非日期文件) 永远不会衰减。

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

| 键 (Key)     | 类型 (Type) | 描述 (Description)     |
| ------------ | ----------- | ---------------------- |
| `extraPaths` | `string[]`  | 要索引的额外目录或文件 |

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

路径可以是绝对路径或相对于工作区的路径。目录将递归扫描 `.md` 文件。符号链接的处理取决于活动后端：
内置引擎会忽略符号链接，而 QMD 遵循底层的 QMD
扫描器行为。

对于作用于代理的跨代理转录本搜索，请使用
`agents.list[].memorySearch.qmd.extraCollections` 而不是 `memory.qmd.paths`。
这些额外的集合遵循相同的 `{ path, name, pattern? }` 结构，但
它们按代理合并，并且当路径指向当前工作区之外时，可以保留显式的共享名称。
如果相同的解析路径同时出现在 `memory.qmd.paths` 和
`memorySearch.qmd.extraCollections` 中，QMD 将保留第一个条目并跳过
重复项。

---

## 多模态记忆 (Gemini)

使用 Gemini Embedding 2 与 Markdown 一起索引图像和音频：

| 键 (Key)                  | 类型 (Type) | 默认值 (Default) | 描述 (Description)                    |
| ------------------------- | ----------- | ---------------- | ------------------------------------- |
| `multimodal.enabled`      | `boolean`   | `false`          | 启用多模态索引                        |
| `multimodal.modalities`   | `string[]`  | --               | `["image"]`，`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`    | `10000000`       | 索引文件的最大大小                    |

仅适用于 `extraPaths` 中的文件。默认记忆根保持仅限 Markdown 格式。
需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`
(图像)；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac` (音频)。

---

## 嵌入缓存

| 键                 | 类型      | 默认值  | 描述                     |
| ------------------ | --------- | ------- | ------------------------ |
| `cache.enabled`    | `boolean` | `false` | 在 SQLite 中缓存分块嵌入 |
| `cache.maxEntries` | `number`  | `50000` | 最大缓存嵌入数           |

防止在重新索引或转录更新期间对未更改的文本进行重新嵌入。

---

## 批量索引

| 键                            | 类型      | 默认值  | 描述             |
| ----------------------------- | --------- | ------- | ---------------- |
| `remote.batch.enabled`        | `boolean` | `false` | 启用批量嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 并行批处理作业   |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批量处理完成 |
| `remote.batch.pollIntervalMs` | `number`  | --      | 轮询间隔         |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批处理超时       |

适用于 `openai`、`gemini` 和 `voyage`。对于大批量回填，OpenAI 批处理通常最快且最便宜。

---

## 会话记忆搜索（实验性）

索引会话记录并通过 `memory_search` 展示它们：

| 键                            | 类型       | 默认值       | 描述                         |
| ----------------------------- | ---------- | ------------ | ---------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 启用会话索引                 |
| `sources`                     | `string[]` | `["memory"]` | 添加 `"sessions"` 以包含记录 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的字节阈值           |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的消息阈值           |

会话索引是可选的，并且异步运行。结果可能会有轻微延迟。会话日志存储在磁盘上，因此请将文件系统访问视为信任边界。

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

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置都位于 `memory.qmd` 下：

| 键                       | 类型      | 默认值   | 描述                                    |
| ------------------------ | --------- | -------- | --------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可执行文件路径                      |
| `searchMode`             | `string`  | `search` | 搜索命令：`search`、`vsearch`、`query`  |
| `includeDefaultMemory`   | `boolean` | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md` |
| `paths[]`                | `array`   | --       | 额外路径：`{ name, path, pattern? }`    |
| `sessions.enabled`       | `boolean` | `false`  | 索引会话记录                            |
| `sessions.retentionDays` | `number`  | --       | 记录保留                                |
| `sessions.exportDir`     | `string`  | --       | 导出目录                                |

### 更新计划

| 键                        | 类型      | 默认值  | 说明                   |
| ------------------------- | --------- | ------- | ---------------------- |
| `update.interval`         | `string`  | `5m`    | 刷新间隔               |
| `update.debounceMs`       | `number`  | `15000` | 文件更改防抖           |
| `update.onBoot`           | `boolean` | `true`  | 启动时刷新             |
| `update.waitForBootSync`  | `boolean` | `false` | 启动时阻塞直到刷新完成 |
| `update.embedInterval`    | `string`  | --      | 独立的嵌入频率         |
| `update.commandTimeoutMs` | `number`  | --      | QMD 命令超时           |

### 限制

| 键                        | 类型     | 默认值 | 说明               |
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

默认为仅私信。`match.keyPrefix` 匹配规范化的会话键；
`match.rawKeyPrefix` 匹配包含 `agent:<id>:` 的原始键。

### 引用

`memory.citations` 适用于所有后端：

| 值             | 行为                                    |
| -------------- | --------------------------------------- |
| `auto`（默认） | 在片段中包含 `Source: <path#line>` 页脚 |
| `on`           | 始终包含页脚                            |
| `off`          | 省略页脚（路径仍在内部传递给代理）      |

### 完整的 QMD 示例

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

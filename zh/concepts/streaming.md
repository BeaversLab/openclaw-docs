---
summary: "Streaming + 分块行为（块回复、草稿流、限制）"
read_when:
  - 解释各渠道的 streaming 或分块如何工作
  - 修改 block streaming 或渠道分块行为
  - 排查重复/过早的块回复或草稿流
---
# Streaming + 分块

OpenClaw 有两层独立的“streaming”：
- **Block streaming（渠道）**：assistant 写到一定程度就发送已完成的**块**。这些是普通渠道消息（不是 token delta）。
- **Token-ish streaming（仅 Telegram）**：生成中以**草稿气泡**更新部分文本；最终消息在结束时发送。

目前没有真正的 token streaming 到外部渠道消息。Telegram 草稿流是唯一的部分流式表面。

## Block streaming（渠道消息）

Block streaming 会在输出可用时以粗粒度块发送。

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```
Legend:
- `text_delta/events`：模型流式事件（对非流式模型可能很稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界与断点偏好。
- `channel send`：实际出站消息（块回复）。

**控制项：**
- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认 off）。
- 渠道覆盖：`*.blockStreaming`（及每账号变体）强制按渠道开/关。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（发送前合并流式块）。
- 渠道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 渠道分块模式：`*.chunkMode`（默认 `length`，`newline` 会先按空行分段再按长度切块）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17），避免 UI 裁切。

**边界语义：**
- `text_end`：chunker 产出就发送；每个 `text_end` 都会 flush。
- `message_end`：等 assistant 消息结束再 flush 缓冲。

`message_end` 仍会使用 chunker；若缓冲文本超过 `maxChars`，结束时可能发多个块。

## 分块算法（低/高边界）

Block chunking 由 `EmbeddedBlockChunker` 实现：
- **低边界**：缓冲 < `minChars` 不发送（除非强制）。
- **高边界**：优先在 `maxChars` 前切分；必要时强制在 `maxChars` 处切。
- **断点偏好**：`paragraph` → `newline` → `sentence` → `whitespace` → 硬切。
- **代码围栏**：不会在围栏内切分；若必须在 `maxChars` 处强切，会闭合并重新打开围栏以保持 Markdown 合法。

`maxChars` 会被夹到渠道 `textChunkLimit`，因此不能超过渠道上限。

## 合并（merge streamed blocks）

启用 block streaming 后，OpenClaw 可在发送前**合并连续块**，减少“单行刷屏”，仍保持渐进输出。

- 合并等待**空闲间隙**（`idleMs`）再 flush。
- 缓冲受 `maxChars` 限制，超过即 flush。
- `minChars` 防止太小片段发送，直到累计足够文本（最终 flush 会发送剩余内容）。
- Joiner 由 `blockStreamingChunk.breakPreference` 推导：
  - `paragraph` → `\n\n`
  - `newline` → `\n`
  - `sentence` → 空格
- 可通过 `*.blockStreamingCoalesce`（含 per-account）覆盖。
- 默认 Signal/Slack/Discord 的 coalesce `minChars` 提升到 1500（除非覆盖）。

## 块间类人节奏

开启 block streaming 后，你可以在块之间加入**随机化停顿**（首块之后）。这让多气泡回复更自然。

- 配置：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 覆盖）。
- 模式：`off`（默认）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 仅作用于**块回复**，不影响最终回复或工具摘要。

## “流式分块”还是“一次性发完”

映射如下：
- **流式分块**：`blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（边生成边发）。非 Telegram 渠道还需显式 `*.blockStreaming: true`。
- **结束再发**：`blockStreamingBreak: "message_end"`（一次 flush，超长时仍可能多块）。
- **不启用 block streaming**：`blockStreamingDefault: "off"`（只发最终回复）。

**渠道注意：**非 Telegram 渠道的 block streaming **默认关闭**，除非显式设置 `*.blockStreaming: true`。Telegram 可在不开块回复的情况下流式草稿（`channels.telegram.streamMode`）。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults`，不是根配置。

## Telegram 草稿流（token-ish）

Telegram 是唯一支持草稿流的渠道：
- 在**带话题的私聊**中使用 Bot API `sendMessageDraft`。
- `channels.telegram.streamMode: "partial" | "block" | "off"`。
  - `partial`：用最新流式文本更新草稿。
  - `block`：按块更新草稿（同 chunker 规则）。
  - `off`：不做草稿流。
- 草稿分块配置（仅 `streamMode: "block"`）：`channels.telegram.draftChunk`（默认：`minChars: 200`、`maxChars: 800`）。
- 草稿流与 block streaming 相互独立；非 Telegram 渠道默认不启用 block 回复，需 `*.blockStreaming: true`。
- 最终回复仍是普通消息。
- `/reasoning stream` 会将推理流入草稿气泡（仅 Telegram）。

当草稿流开启时，OpenClaw 会禁用该条回复的 block streaming，避免双重 streaming。

```
Telegram (private + topics)
  └─ sendMessageDraft (draft bubble)
       ├─ streamMode=partial → update latest text
       └─ streamMode=block   → chunker updates draft
  └─ final reply → normal message
```
Legend:
- `sendMessageDraft`：Telegram 草稿气泡（非真实消息）。
- `final reply`：普通 Telegram 消息发送。

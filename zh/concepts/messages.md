---
summary: "消息流、会话、队列与推理可见性"
read_when:
  - 解释入站消息如何成为回复
  - 澄清会话、队列模式或流式行为
  - 记录推理可见性与用量影响
---
# Messages

本页汇总 OpenClaw 如何处理入站消息、会话、队列、流式与推理可见性。

## 消息流（高层）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

关键开关在配置中：
- `messages.*` 用于前缀、队列与群组行为。
- `agents.defaults.*` 用于块流式与分块默认值。
- 渠道覆盖（`channels.whatsapp.*`、`channels.telegram.*` 等）用于上限与流式开关。

完整 schema 参见 [Configuration](/zh/gateway/configuration)。

## 入站去重

渠道可能在重连后重投同一消息。OpenClaw 使用以 channel/account/peer/session/message id 为键的短期缓存，避免重复投递触发新的 agent 运行。

## 入站去抖

来自**同一发送者**的快速连续消息可通过 `messages.inbound` 合并成一次 agent 回合。去抖以渠道 + 会话为作用域，并使用最新消息进行回复串联/ID。

配置（全局默认 + 渠道覆盖）：
```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500
      }
    }
  }
}
```

注：
- 去抖仅适用于**纯文本**消息；媒体/附件会立即 flush。
- 控制命令会绕过去抖，保持独立。

## 会话与设备

会话由 gateway 拥有，而非客户端。
- 私聊会折叠到 agent 主会话 key。
- 群/频道拥有各自的会话 key。
- 会话存储与转录位于 gateway 主机。

多个设备/渠道可映射到同一会话，但历史不会完全回写到每个客户端。建议：长对话使用一个主设备以避免上下文分叉。Control UI 与 TUI 始终显示 gateway 侧会话转录，因此是事实来源。

详情： [Session management](/zh/concepts/session)。

## 入站 body 与历史上下文

OpenClaw 将**prompt body** 与 **command body** 分离：
- `Body`：发送给 agent 的提示文本，可能包含渠道封装与可选历史包装。
- `CommandBody`：用于指令/命令解析的原始用户文本。
- `RawBody`：`CommandBody` 的旧别名（保留兼容）。

当渠道提供历史时，使用统一包装：
- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对**非私聊**（群/频道/房间），**当前消息 body** 会以发送者标签为前缀（与历史条目风格一致）。这使实时消息与队列/历史消息在 agent prompt 中一致。

历史缓冲仅包含**待处理**消息：包含未触发运行的群消息（例如 mention 门控被拦截的消息），并**排除**已在会话转录中的消息。

指令剥离仅作用于**当前消息**部分，确保历史不受影响。对有历史包装的渠道，应将 `CommandBody`（或 `RawBody`）设置为原始消息文本，并将 `Body` 保持为合并后的提示。历史缓冲可通过 `messages.groupChat.historyLimit`（全局默认）及渠道覆盖如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit` 配置（设 `0` 禁用）。

## 队列与跟进

如果已有运行，入站消息可以排队、注入当前运行或收集为跟进回合。

- 通过 `messages.queue`（以及 `messages.queue.byChannel`）配置。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及 backlog 变体。

详情： [Queueing](/zh/concepts/queue)。

## 流式、分块与批处理

Block streaming 会在模型产出文本块时发送部分回复。
分块遵循渠道文本限制并避免拆分围栏代码。

关键设置：
- `agents.defaults.blockStreamingDefault`（`on|off`，默认 off）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲的合并）
- `agents.defaults.humanDelay`（块回复之间的类人延迟）
- 渠道覆盖：`*.blockStreaming` 与 `*.blockStreamingCoalesce`（非 Telegram 渠道需显式 `*.blockStreaming: true`）

详情： [Streaming + chunking](/zh/concepts/streaming)。

## 推理可见性与 token

OpenClaw 可显示或隐藏模型推理：
- `/reasoning on|off|stream` 控制可见性。
- 推理内容一旦产生，仍计入 token 用量。
- Telegram 支持将推理流式输出到草稿气泡。

详情： [Thinking + reasoning directives](/zh/tools/thinking) 与 [Token use](/zh/token-use)。

## 前缀、串线与回复

出站消息格式由 `messages` 集中控制：
- `messages.responsePrefix`（出站前缀）与 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 与渠道默认值进行回复串线

详情： [Configuration](/zh/gateway/configuration#messages) 与各渠道文档。

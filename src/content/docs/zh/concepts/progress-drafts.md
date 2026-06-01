---
summary: "进度草稿：一条在代理运行时更新的可见进行中消息"
read_when:
  - Configuring visible progress updates for long-running chat turns
  - Choosing between partial, block, and progress streaming modes
  - Explaining how OpenClaw updates one channel message while work is in progress
  - Troubleshooting progress drafts, standalone progress messages, or finalization fallback
title: "进度草稿"
---

Progress drafts 使长时间的 Agent 轮次在聊天中感觉生动，而不会将对话变成一堆临时状态回复。

当启用 Progress drafts 时，OpenClaw 仅在轮次证明其正在执行实际工作后才创建一条可见的进行中消息，在 Agent 读取、规划、调用工具或等待批准时更新该消息，然后在该渠道可以安全执行此操作时将该草稿转换为最终答案。

```text
Shelling...
📖 from docs/concepts/progress-drafts.md
🔎 Web Search: for "discord edit message"
🛠️ Bash: run tests
```

当您希望在重度使用工具的工作期间有一条整洁的状态消息，并在轮次完成时得到最终答案，请使用 Progress drafts。

## 快速开始

每个渠道启用进度草稿：`streaming.mode: "progress"`

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
      },
    },
  },
}
```

这通常就足够了。OpenClaw 将选择一个自动的单字标签，等待工作持续至少五秒或发出第二个工作事件，在有实际工作发生时添加紧凑的进度行，并抑制该轮次的重复独立进度闲聊。

## 用户看到的内容

Progress draft 有两个部分：

| 部分   | 目的                                                         |
| ------ | ------------------------------------------------------------ |
| 标签   | 一个简短的起始/状态行，例如 `Working` 或 `Shelling`。        |
| 进度行 | 使用与详细输出相同的工具图标和细节格式化程序的紧凑运行更新。 |

当代理开始有意义的工作并且持续忙碌五秒钟或发出第二个工作事件时，该标签会出现。它是滚动进度行列表的一部分，因此一旦出现足够的具体工作，起始状态就会滚走。纯文本回复不显示进度草稿。只有当代理发出有用的工作更新时，才会添加进度行，例如 `🛠️ Bash: run tests`、`🔎 Web Search: for "discord edit message"` 或 `✍️ Write: to /tmp/file`。默认情况下，它们使用与 `/verbose` 相同的紧凑解释模式；如果在调试时希望附加原始命令/详细信息，请设置 `agents.defaults.toolProgressDetail: "raw"`。如果可能，最终答案将替换草稿；否则 OpenClaw 将正常发送最终答案，并根据渠道的传输方式清理或停止更新草稿。

## 选择模式

`channels.<channel>.streaming.mode` 控制可见的进行中行为：

| 模式       | 最适合                         | 聊天中显示的内容                 |
| ---------- | ------------------------------ | -------------------------------- |
| `off`      | 安静渠道                       | 仅最终答案。                     |
| `partial`  | 观察答案文本出现               | 一个使用最新答案文本编辑的草稿。 |
| `block`    | 较大的答案预览块               | 一个以较大块更新或附加的预览。   |
| `progress` | 重度使用工具或长时间运行的轮次 | 一个状态草稿，然后是最终答案。   |

当用户更关心“正在发生什么”而不是逐字观看答案文本流时，请选择 `progress`。

当答案本身就是进度信号时，请选择 `partial`。

当您希望以较大的文本块更新草稿预览时，请选择 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是预览流式传输，而不是正常的块交付。当您想要正常的块回复时，请使用 `streaming.block.enabled` 或传统的 `blockStreaming`。

## 配置标签

进度标签位于 `channels.<channel>.streaming.progress` 之下。

默认标签是 `auto`OpenClaw，它会从 OpenClaw 的内置
单字标签池中进行选择：

```text
Working
Shelling
Scuttling
Clawing
Pinching
Molting
Bubbling
Tiding
Reefing
Cracking
Sifting
Brining
Nautiling
Krilling
Barnacling
Lobstering
Tidepooling
Pearling
Snapping
Surfacing
```

使用固定标签：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "Investigating",
        },
      },
    },
  },
}
```

使用您自己的自动标签池：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          labels: ["Checking", "Reading", "Testing", "Finishing"],
        },
      },
    },
  },
}
```

隐藏标签并仅显示进度行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: false,
        },
      },
    },
  },
}
```

## 控制进度行

在进度模式下，进度行默认启用。它们来自真实的运行事件：工具启动、项目更新、任务计划、批准、命令输出、补丁摘要以及类似的代理活动。

当单个工具调用仍在运行时，工具也可以发出类型化进度。
这就是缓慢的获取或搜索操作可以在工具返回其最终结果之前更新可见草稿的方式。
进度更新是一个部分工具结果，具有空的模型内容和显式的公共渠道元数据：

```json
{
  "content": [],
  "progress": {
    "text": "Fetching page content...",
    "visibility": "channel",
    "privacy": "public",
    "id": "web_fetch:fetching"
  }
}
```

OpenClaw 在渠道进度 UI 中仅渲染 OpenClaw`progress.text`。
正常的工具结果稍后会作为 `content` 和 `details` 到达，并且
是唯一返回给模型的部分。

在向工具添加进度时，请使用简短、通用的消息，并将其延迟到
操作已挂起足够长的时间以至于有用时：

```typescript
const clearProgressTimer = scheduleToolProgress(onUpdate, { text: "Fetching page content...", id: "web_fetch:fetching" }, 5_000, { signal });

try {
  return await runToolWork();
} finally {
  clearProgressTimer();
}
```

这种模式意味着快速调用不会显示进度行，长时间调用在挂起期间会显示一行，
而取消调用会在过时进度出现之前清除计时器。
进度文本是公共 UI 侧边渠道，因此不得包含机密、原始参数、
获取的内容、命令输出或页面文本。

OpenClaw 对进度草稿和 OpenClaw`/verbose` 使用相同的格式化程序：

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` 是默认值，它使用 `🛠️ check JS syntax for /tmp/app.js` 等简洁的标签来保持草稿稳定。
`"raw"` 会在可用时追加底层命令/详细信息，
这在调试时很有用，但在聊天中会显得更嘈杂。

例如，同一条命令根据详细信息模式的不同会显示得不同：

| 模式      | 进度行                                                         |
| --------- | -------------------------------------------------------------- |
| `explain` | `🛠️ check JS syntax for /tmp/app.js`                           |
| `raw`     | `🛠️ check JS syntax for /tmp/app.js, node --check /tmp/app.js` |

限制保持可见的行数：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 4,
        },
      },
    },
  },
}
```

进度行会自动压缩，以减少编辑草稿时聊天气泡的重排。

OpenClaw 默认会截断过长的进度行，以免重复的草稿编辑在每次更新时产生不同的换行。
默认每行预算为 120 个字符。
散文会在单词边界处截断，而路径或原始命令等长详细信息
则通过中间省略号缩短，以使后缀保持可见。

调整每行预算：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLineChars: 160,
        },
      },
    },
  },
}
```

Slack 可以将进度行渲染为结构化的 Block Kit 字段，而不是单一文本正文：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          render: "rich",
        },
      },
    },
  },
}
```

富文本渲染保留了相同的纯文本回退，因此不支持更丰富形状的渠道和客户端仍可显示紧凑的进度文本。

保留单个进度草稿，但隐藏工具和任务行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: false,
        },
      },
    },
  },
}
```

使用 `toolProgress: false` 时，OpenClaw 仍会为该轮次抑制较旧的独立工具进度消息。除了配置的标签（如果有）外，渠道在最终回答之前在视觉上保持安静。

## 渠道行为

每个渠道都使用其支持的最简洁的传输方式：

| 渠道            | 进度传输                              | 备注                                                 |
| --------------- | ------------------------------------- | ---------------------------------------------------- |
| Discord         | 发送一条消息，然后编辑它。            | 当最终文本适合一条安全的预览消息时，会就地编辑。     |
| Matrix          | 发送一个事件，然后编辑它。            | 账户级别的流式传输配置控制账户级别的草稿。           |
| Microsoft Teams | 在个人聊天中使用原生 Teams 流式传输。 | `streaming.mode: "block"` 映射到 Teams 块传送。      |
| Slack           | 原生流式传输或可编辑的草稿帖子。      | 线程可用性影响是否可以使用原生流式传输。             |
| Telegram        | 发送一条消息，然后编辑它。            | 较旧的可见草稿可能会被替换，以便最终时间戳保持有用。 |
| Mattermost      | 可编辑的草稿帖子。                    | 工具活动被折叠到同一条草稿风格的帖子中。             |

不支持安全编辑的渠道通常会回退到正在输入指示器或仅发送最终内容。

## 最终确定

当最终回答准备就绪时，OpenClaw 会尝试保持聊天整洁：

- 如果草稿可以安全地变为最终回答，OpenClaw 会就地编辑它。
- 如果渠道使用原生进度流式传输，当原生传输接受最终文本时，OpenClaw 会完成该流。
- 如果最终回答包含媒体、批准提示、显式回复目标、过多块或编辑/发送失败，OpenClaw 会通过正常的渠道传送路径发送最终回答。

回退路径是有意为之。发送一个新的最终回答，比丢失文本、错误回复线程或用渠道无法安全表示的负载覆盖草稿要好。

## 故障排除

**我只看到最终答案。**

检查处理该消息的帐户或渠道是否将 `channels.<channel>.streaming.mode` 设置为 `progress`。当渠道无法安全地编辑正确的消息时，某些群组或引用回复路径可能会在一轮对话中禁用草稿预览。

**我看到了标签但没有工具行。**

检查 `streaming.progress.toolProgress`。如果是 `false`OpenClaw，OpenClaw 将保持单一草稿行为，但会隐藏工具和任务进度行。

**我看到的是一条新的最终消息，而不是编辑后的草稿。**

这是一种安全回退机制。它可能发生在媒体回复、长答案、显式回复目标、旧的 Telegram 草稿、缺少 Slack 线程目标、预览消息被删除或本机流最终化失败时。

**我仍然看到独立的进度消息。**

当草稿处于活动状态时，进度模式会抑制默认的独立工具进度消息。如果仍然出现独立消息，请验证该轮次确实正在使用进度模式，而不是 `streaming.mode: "off"` 或无法为该消息创建草稿的渠道路径。

**Teams 的行为与 Discord 或 Telegram 不同。**

Microsoft Teams 在个人聊天中使用本机流，而不是通用的发送并编辑预览传输。Teams 还将 Microsoft Teams`streaming.mode: "block"`DiscordTelegram 视为 Teams 块传递，因为它没有 Discord 和 Telegram 使用的相同草稿预览块模式。

## 相关

- [流式传输和分块](/zh/concepts/streaming)
- [消息](/zh/concepts/messages)
- [渠道配置](/zh/gateway/config-channels)
- [Discord](Discord/en/channels/discord)
- [Matrix](Matrix/en/channels/matrix)
- [Microsoft Teams](Microsoft Teams/en/channels/msteams)
- [Slack](Slack/en/channels/slack)
- [Telegram](Telegram/en/channels/telegram)

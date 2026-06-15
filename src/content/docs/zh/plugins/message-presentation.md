---
summary: "语义化消息卡片、按钮、选择器、回退文本以及渠道插件的传递提示"
title: "消息呈现"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

消息展示是 OpenClaw 用于富文本出站聊天界面的共享契约。它允许代理、CLI 命令、审批流程和插件一次性描述消息意图，而每个渠道插件则尽可能渲染出最佳的原生形态。

使用展示层以实现可移植的消息 UI：

- 文本部分
- 小型上下文/页脚文本
- 分隔线
- 按钮
- 选择菜单
- 卡片标题和基调

请勿将特定于提供商的原生字段（如 Discord Discord`components`Slack、Slack
`blocks`Telegram、Telegram `buttons`、Teams `card` 或 Feishu `card`）添加到共享
消息工具中。这些是渠道插件拥有的渲染器输出。

## 契约

插件作者从以下位置导入公共契约：

```ts
import type { MessagePresentation, ReplyPayloadDelivery } from "openclaw/plugin-sdk/interactive-runtime";
```

形态：

```ts
type MessagePresentation = {
  title?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  blocks: MessagePresentationBlock[];
};

type MessagePresentationBlock = { type: "text"; text: string } | { type: "context"; text: string } | { type: "divider" } | { type: "buttons"; buttons: MessagePresentationButton[] } | { type: "select"; placeholder?: string; options: MessagePresentationOption[] };

type MessagePresentationAction = { type: "command"; command: string } | { type: "callback"; value: string };

type MessagePresentationButton = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
  url?: string;
  webApp?: { url: string };
  /** @deprecated Use webApp. Accepted for legacy JSON payloads only. */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
};

type ReplyPayloadDelivery = {
  pin?:
    | boolean
    | {
        enabled: boolean;
        notify?: boolean;
        required?: boolean;
      };
};
```

按钮语义：

- `action.type: "command"` 通过核心的命令路径运行原生斜杠命令。将其用于内置命令按钮和菜单。
- `action.type: "callback"` 通过渠道的交互路径承载不透明的插件数据。渠道插件不得将回调数据重新解释为斜杠命令。
- `value` 是旧的不透明回调值。新控件应使用 `action`，以便渠道插件无需从文本中猜测即可映射命令和回调。
- `url` 是链接按钮。它可以不存在于 `value` 之中。
- `webApp` 描述了一个渠道原生 Web 应用按钮。Telegram 将其渲染为 `web_app`，并且仅在私人聊天中支持它。为了兼容性，在松散的 JSON 负载中仍然接受 `web_app`，但 TypeScript 生产者应使用 `webApp`。
- `label` 是必需的，并且也用于文本回退。
- `style` 是建议性的。渲染器应将不支持的样式映射到安全的默认值，而不是导致发送失败。
- `priority` 是可选的。当渠道通告了操作限制且必须丢弃控件时，核心会首先保留较高优先级的按钮，并在相同优先级的按钮中保留原始顺序。当所有控件都适合时，将保留编写顺序。
- `disabled` 是可选的。渠道必须通过 `supportsDisabled` 选择加入；否则，核心会将禁用的控件降级为非交互式回退文本。
- `reusable` 是可选的。支持可重用原生回调的渠道可能会在成功交互后保持操作可用。将其用于可重复或幂等的操作，如刷新、检查或更多详情；对于正常的一次性审批和破坏性操作，请保持其未设置状态。

选择语义：

- `options[].action` 具有与按钮 `action` 相同的命令/回调含义。
- `options[].value` 是旧的选择应用程序值。
- `placeholder` 是建议性的，可能会被不支持原生选择的渠道忽略。
- 如果渠道不支持选择菜单，回退文本将列出这些标签。

## 生产者示例

简单卡片：

```json
{
  "title": "Deploy approval",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "Canary is ready to promote." },
    { "type": "context", "text": "Build 1234, staging passed." },
    {
      "type": "buttons",
      "buttons": [
        { "label": "Approve", "value": "deploy:approve", "style": "success" },
        { "label": "Decline", "value": "deploy:decline", "style": "danger" }
      ]
    }
  ]
}
```

仅 URL 链接按钮：

```json
{
  "blocks": [
    { "type": "text", "text": "Release notes are ready." },
    {
      "type": "buttons",
      "buttons": [{ "label": "Open notes", "url": "https://example.com/release" }]
    }
  ]
}
```

Telegram Mini App 按钮：

```json
{
  "blocks": [
    {
      "type": "buttons",
      "buttons": [{ "label": "Launch", "web_app": { "url": "https://example.com/app" } }]
    }
  ]
}
```

选择菜单：

```json
{
  "title": "Choose environment",
  "blocks": [
    {
      "type": "select",
      "placeholder": "Environment",
      "options": [
        { "label": "Canary", "value": "env:canary" },
        { "label": "Production", "value": "env:prod" }
      ]
    }
  ]
}
```

CLI 发送：

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "Deploy approval" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Canary is ready."},{"type":"buttons","buttons":[{"label":"Approve","value":"deploy:approve","style":"success"},{"label":"Decline","value":"deploy:decline","style":"danger"}]}]}'
```

固定投递：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

具有显式 JSON 的固定投递：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## 渲染器契约

渠道插件在其出站适配器上声明渲染支持：

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
    limits: {
      actions: {
        maxActions: 25,
        maxActionsPerRow: 5,
        maxRows: 5,
        maxLabelLength: 80,
        maxValueBytes: 100,
        supportsStyles: true,
        supportsDisabled: false,
      },
      selects: {
        maxOptions: 25,
        maxLabelLength: 100,
        maxValueBytes: 100,
      },
      text: {
        maxLength: 2000,
        encoding: "characters",
        markdownDialect: "discord-markdown",
      },
    },
  },
  deliveryCapabilities: {
    pin: true,
  },
  renderPresentation({ payload, presentation, ctx }) {
    return renderNativePayload(payload, presentation, ctx);
  },
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

功能布尔值描述了渲染器可以使哪些内容具有交互性。可选的
`limits` 描述了核心在调用渲染器之前可以调整的通用信封：

```ts
type ChannelPresentationCapabilities = {
  supported?: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  limits?: {
    actions?: {
      maxActions?: number;
      maxActionsPerRow?: number;
      maxRows?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
      supportsStyles?: boolean;
      supportsDisabled?: boolean;
      supportsLayoutHints?: boolean;
    };
    selects?: {
      maxOptions?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
    };
    text?: {
      maxLength?: number;
      encoding?: "characters" | "utf8-bytes" | "utf16-units";
      markdownDialect?: "plain" | "markdown" | "html" | "slack-mrkdwn" | "discord-markdown";
      supportsEdit?: boolean;
    };
  };
};
```

核心在渲染之前将通用限制应用于语义控件。渲染器仍然拥有针对原生块数量、
卡片大小、URL 限制以及无法在通用契约中表达的提供商特性的最终特定于提供商的验证和剪裁。
如果限制移除了块中的所有控件，核心会将标签保留为非交互式上下文文本，以便投递的消息
仍然具有可见的回退形式。

## 核心渲染流程

当 `ReplyPayload` 或消息操作包含 `presentation` 时，核心：

1. 规范化展示负载。
2. 解析目标渠道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器通告时，应用通用功能限制，例如操作计数、标签长度和
   选择选项计数。
5. 当适配器可以渲染负载时调用 `renderPresentation`。
6. 当适配器不存在或无法渲染时，回退到保守文本。
7. 通过正常渠道投递路径发送生成的负载。
8. 在第一条成功
   发送的消息之后，应用投递元数据，例如 `delivery.pin`。

核心拥有回退行为，因此生产者可以保持与渠道无关。渠道
插件拥有原生渲染和交互处理。

## 降级规则

展示内容必须能够安全地在受限渠道上发送。

回退文本包括：

- `title` 作为第一行
- `text` 块作为普通段落
- `context` 块作为紧凑上下文行
- `divider` 块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择选项标签

不支持的本地控件应降级处理，而不是导致整个发送失败。

- 当禁用内联按钮时，Telegram 发送文本后备内容。
- 不支持选择功能的渠道会将选择选项列为文本。
- 纯 URL 按钮会变为本地链接按钮或后备 URL 行。
- 可选的置顶失败不会导致已发送的消息失败。

主要的例外是 `delivery.pin.required: true`；如果请求强制置顶但渠道无法置置已发送的消息，则投递报告失败。

## 提供商映射

当前捆绑的渲染器：

| 渠道            | 本地渲染目标   | 备注                                                                                                         |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Discord         | 组件和组件容器 | 为现有的提供商本地载荷生成器保留旧版 `channelData.discord.components`，但新的共享发送应使用 `presentation`。 |
| Slack           | Block Kit      | 为现有的提供商本地载荷生成器保留旧版 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。       |
| Telegram        | 文本加内联键盘 | 按钮/选择需要目标界面支持内联按钮功能；否则使用文本后备。                                                    |
| Mattermost      | 文本加交互属性 | 其他块降级为文本。                                                                                           |
| Microsoft Teams | Adaptive Cards | 当同时提供两者时，纯 `message` 文本会包含在卡片中。                                                          |
| Feishu          | 交互式卡片     | 卡片标题可以使用 `title`；正文避免重复该标题。                                                               |
| 纯文本渠道      | 文本后备       | 没有渲染器的渠道仍然可以获得可读的输出。                                                                     |

提供商本地载荷兼容性是针对现有回复生成器的过渡措施。这不是添加新的共享本地字段的理由。

## Presentation 与 InteractiveReply

`InteractiveReply` 是批准和交互助手使用的旧版内部子集。它支持：

- 文本
- 按钮
- 选择

`MessagePresentation` 是规范化的共享发送协议。它增加了：

- 标题
- 语气
- 上下文
- 分隔线
- 纯 URL 按钮
- 通过 `ReplyPayload.delivery` 传递通用投递元数据

桥接旧代码时，请使用 `openclaw/plugin-sdk/interactive-runtime` 中的助手：

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接受或生成 `MessagePresentation`。现有的 `interactive` 载荷是 `presentation` 的已弃用子集；运行时仍为旧的生产者提供支持。

旧版 `InteractiveReply*` 类型和转换辅助函数在 SDK 中被标记为 `@deprecated`：

- `InteractiveReply`、`InteractiveReplyBlock`、`InteractiveReplyButton`、
  `InteractiveReplyOption`、`InteractiveReplySelectBlock` 和
  `InteractiveReplyTextBlock`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` 和
`presentationToInteractiveControlsReply(...)` 仍可作为旧版渠道实现的渲染器桥接使用。新的生产者代码不应调用
它们；请发送 `presentation` 并让核心/渠道适配处理渲染。

审批辅助函数也有以演示优先的替代方案：

- 使用 `buildApprovalPresentationFromActionDescriptors(...)` 代替
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- 使用 `buildApprovalPresentation(...)` 代替
  `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 代替
  `buildExecApprovalInteractiveReply(...)`

对于没有文本回退的演示块（例如仅分隔线的演示），`renderMessagePresentationFallbackText(...)` 返回空字符串。需要非空发送主体的传输可以传递
`emptyFallback` 以选择最小主体，而无需更改默认回退约定。

## 投递固定

固定是投递行为，而非演示。请使用 `delivery.pin` 代替
提供商原生字段，如 `channelData.telegram.pin`。

语义：

- `pin: true` 固定第一条成功投递的消息。
- `pin.notify` 默认为 `false`。
- `pin.required` 默认为 `false`。
- 可选固定失败会降级并保持已发送消息不变。
- 必需固定失败会导致投递失败。
- 分块消息固定的是已发送的第一个分块，而不是尾部分块。

对于提供商支持这些操作的现有消息，手动 `pin`、`unpin` 和 `pins` 消息操作仍然存在。

## 插件作者清单

- 当渠道能够渲染或安全地降级语义呈现时，请从 `describeMessageTool(...)` 声明 `presentation`。
- 将 `presentationCapabilities` 添加到运行时出站适配器。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件设置代码中。
- 请将原生 UI 库排除在热加载设置/目录路径之外。
- 当已知通用功能限制时，请在 `presentationCapabilities.limits` 上声明。
- 在渲染器和测试中保留最终的平台限制。
- 为不支持的按钮、选择器、URL 按钮、标题/文本重复以及混合的 `message` 和 `presentation` 发送添加回退测试。
- 仅当提供商能够固定已发送消息 ID 时，才通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加传递固定支持。
- 不要通过共享消息操作架构公开新的提供商原生卡片/块/组件/按钮字段。

## 相关文档

- [消息 CLI](/zh/cli/message)
- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件架构](/zh/plugins/architecture-internals#message-tool-schemas)
- [渠道呈现重构计划](/zh/plan/ui-channels)

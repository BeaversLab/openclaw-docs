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

type MessagePresentationButton = {
  label: string;
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
  value: string;
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

- 当渠道支持可点击控件时，`value` 是一个通过渠道
  现有交互路径传回的应用操作值。
- `url` 是一个链接按钮。它可以独立于 `value` 存在。
- `webApp` 描述了一个渠道原生 Web 应用按钮。Telegram 将其
  渲染为 `web_app`，并且仅在私聊中支持。为了兼容性，在松散的 JSON 载荷中仍接受 `web_app`，但 TypeScript 生产者
  应使用 `webApp`。
- `label` 是必需的，并且也用于文本回退。
- `style` 是建议性的。渲染器应将不支持的样式映射为安全的
  默认值，而不是导致发送失败。
- `priority` 是可选的。当渠道通告了操作限制并且必须
  丢弃控件时，核心会首先保留高优先级按钮，并在同等优先级的按钮之间保持
  原始顺序。当所有控件都适合时，将保留
  创作顺序。
- `disabled` 是可选的。渠道必须通过 `supportsDisabled` 选择加入；否则
  核心会将禁用的控件降级为非交互式回退文本。
- `reusable` 是可选的。支持可重用原生回调的渠道可以在成功交互后保持操作可用。将其用于可重复或幂等的操作，例如刷新、检查或更多详情；对于常规的一次性审批和破坏性操作，请保持未设置状态。

选择语义：

- `options[].value` 是选定的应用程序值。
- `placeholder` 是建议性的，可能会被不支持原生选择的渠道忽略。
- 如果渠道不支持选择，回退文本将列出标签。

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

仅限 URL 的链接按钮：

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

带有显式 JSON 的固定投递：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## 渲染器合约

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

能力布尔值描述了渲染器可以交互的内容。可选的 `limits` 描述了核心在调用渲染器之前可以调整的通用信封：

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

核心在渲染之前对语义控件应用通用限制。渲染器仍然拥有针对原生块数量、卡片大小、URL 限制以及无法在通用合约中表达的提供商怪癖的最终提供商特定验证和裁剪。如果限制移除了块中的所有控件，核心会将标签保留为非交互式上下文文本，以便投递的消息仍然具有可见的回退。

## 核心渲染流程

当 `ReplyPayload` 或消息操作包含 `presentation` 时，核心会：

1. 规范化呈现负载。
2. 解析目标渠道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器通告时，应用通用能力限制，例如操作数量、标签长度和选择选项数量。
5. 当适配器可以渲染负载时调用 `renderPresentation`。
6. 当适配器不存在或无法渲染时，回退到保守文本。
7. 通过常规渠道投递路径发送结果负载。
8. 在第一条成功发送的消息之后应用投递元数据，例如 `delivery.pin`。

Core 负责降级行为，以便生产者可以保持与渠道无关。渠道插件负责原生渲染和交互处理。

## 降级规则

演示内容在受限渠道上发送必须是安全的。

降级文本包括：

- `title` 作为第一行
- `text` 块作为普通段落
- `context` 块作为紧凑的上下文行
- `divider` 块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择选项标签

不支持的原生控件应该降级，而不是导致整个发送失败。示例：

- Telegram 禁用内联按钮时发送文本降级。
- 不支持选择的渠道会以文本形式列出选择选项。
- 仅限 URL 的按钮会变为原生链接按钮或降级 URL 行。
- 可选的 Pin 失败不会导致已发送的消息失败。

主要的例外是 `delivery.pin.required: true`；如果请求将 Pin 设置为必需，但渠道无法 Pin 已发送的消息，则投递报告失败。

## 提供商映射

当前捆绑的渲染器：

| 渠道            | 原生渲染目标   | 备注                                                                                                           |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器 | 为现有的提供商原生负载生产者保留传统的 `channelData.discord.components`，但新的共享发送应使用 `presentation`。 |
| Slack           | Block Kit      | 为现有的提供商原生负载生产者保留传统的 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。       |
| Telegram        | 文本加内联键盘 | 按钮/选择需要目标表面的内联按钮功能；否则使用文本降级。                                                        |
| Mattermost      | 文本加交互属性 | 其他块降级为文本。                                                                                             |
| Microsoft Teams | Adaptive Cards | 当同时提供时，普通的 `message` 文本会包含在卡片中。                                                            |
| Feishu          | 交互式卡片     | 卡片标题可以使用 `title`；正文避免重复该标题。                                                                 |
| 纯文本渠道      | 文本降级       | 没有渲染器的渠道仍然会获得可读的输出。                                                                         |

提供程序原生负载兼容性是现有回复生成器的过渡便利措施。它不是添加新的共享原生字段的理由。

## Presentation 与 InteractiveReply

`InteractiveReply` 是由审批和交互辅助器使用的较旧的内部子集。它支持：

- 文本
- 按钮
- 选择

`MessagePresentation` 是规范的共享发送协议。它增加了：

- 标题
- 语气
- 上下文
- 分隔线
- 仅 URL 按钮
- 通过 `ReplyPayload.delivery` 传递通用交付元数据

在桥接较旧的代码时，使用 `openclaw/plugin-sdk/interactive-runtime` 中的辅助器：

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接受或生成 `MessagePresentation`。现有的 `interactive` 负载是 `presentation` 的已弃用子集；运行时保留对较旧生成器的支持。

传统的 `InteractiveReply*` 类型和转换辅助器在 SDK 中被标记为 `@deprecated`：

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

`presentationToInteractiveReply(...)` 和 `presentationToInteractiveControlsReply(...)` 作为传统渠道实现的渲染器桥接器仍然可用。新的生成器代码不应调用它们；发送 `presentation` 并让核心/渠道适配处理渲染。

审批辅助器也有以 Presentation 为首的替代方案：

- 使用 `buildApprovalPresentationFromActionDescriptors(...)` 代替
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- 使用 `buildApprovalPresentation(...)` 代替
  `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 代替
  `buildExecApprovalInteractiveReply(...)`

对于没有文本回退的展示块（例如仅分隔符的展示），`renderMessagePresentationFallbackText(...)` 返回空字符串。需要非空发送正文的传输可以传递 `emptyFallback` 以选择最小的正文，而无需更改默认回退协定。

## 交付固定

固定是交付行为，而非展示方式。请使用 `delivery.pin` 而非提供商原生字段（如 `channelData.telegram.pin`）。

语义：

- `pin: true` 固定第一个成功交付的消息。
- `pin.notify` 默认为 `false`。
- `pin.required` 默认为 `false`。
- 可选固定失败会降级并保持已发送消息不变。
- 必需固定失败将导致交付失败。
- 分块消息固定第一个交付的块，而不是尾部块。

对于提供商支持这些操作的现有消息，手动 `pin`、`unpin` 和 `pins` 消息操作仍然存在。

## 插件作者检查清单

- 当渠道可以渲染或安全降级语义展示时，从 `describeMessageTool(...)` 声明 `presentation`。
- 将 `presentationCapabilities` 添加到运行时出站适配器。
- 在运行时代码中实现 `renderPresentation`，而不是在控制面插件设置代码中。
- 请勿将原生 UI 库放入热设置/编录路径中。
- 当已知通用能力限制时，请在 `presentationCapabilities.limits` 上声明。
- 在渲染器和测试中保留最终平台限制。
- 为不支持的按钮、选择、URL 按钮、标题/文本重复以及混合 `message` 和 `presentation` 发送添加回退测试。
- 仅当提供商可以固定已发送消息 ID 时，才通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加交付固定支持。
- 请勿通过共享消息操作架构公开新的提供商原生卡片/块/组件/按钮字段。

## 相关文档

- [消息 CLI](/zh/cli/message)
- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件架构](/zh/plugins/architecture-internals#message-tool-schemas)
- [频道展示重构计划](/zh/plan/ui-channels)

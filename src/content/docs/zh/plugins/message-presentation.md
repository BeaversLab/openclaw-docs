---
summary: "语义化消息卡片、按钮、选择菜单、回退文本以及渠道插件的传递提示"
title: "消息展示"
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

不要将新的 Discord 原生字段（如 Slack `components`、Telegram
`blocks`、Telegram `buttons`、Teams `card` 或 Feishu `card`）添加到共享
消息 Telegram 中。这些是渠道插件拥有的渲染器输出。

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

- `value` 是一个应用程序操作值，当渠道支持可点击控件时，
  它会通过渠道现有的交互路径回传。
- `url` 是一个链接按钮。它可以在没有 `value` 的情况下存在。
- `label` 是必需的，并且也用于文本回退。
- `style` 是建议性的。渲染器应将不支持的样式映射到安全的
  默认值，而不是导致发送失败。

选择语义：

- `options[].value` 是选定的应用程序值。
- `placeholder` 是建议性的，可能会被没有原生
  选择支持的渠道忽略。
- 如果渠道不支持选择菜单，回退文本将列出标签。

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

固定传递：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

使用显式 JSON 的固定传递：

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

能力字段是有意设计的简单布尔值。它们描述的是
渲染器可以使哪些内容变为交互式，而不是每一个原生平台的限制。渲染器仍然
拥有平台特定的限制，例如最大按钮数量、块数量和
卡片大小。

## 核心渲染流程

当 `ReplyPayload` 或消息操作包含 `presentation` 时，核心将：

1. 标准化展示载荷。
2. 解析目标渠道的出站适配器。
3. 读取 `presentationCapabilities`。
4. 当适配器能够渲染载荷时，调用 `renderPresentation`。
5. 当适配器不存在或无法渲染时，回退到保守文本。
6. 通过正常渠道发送路径发送生成的载荷。
7. 在第一条消息成功发送后，应用投递元数据（例如 `delivery.pin`）。

核心拥有回退行为，以便生产者能够保持与渠道无关。渠道插件拥有原生渲染和交互处理。

## 降级规则

展示功能必须能够安全地发送到受限渠道。

回退文本包括：

- `title` 作为第一行
- `text` 块作为普通段落
- `context` 块作为紧凑的上下文行
- `divider` 块作为视觉分隔符
- 按钮标签，包括链接按钮的 URL
- 选择选项标签

不支持的原生控件应该降级，而不是导致整个发送失败。例如：

- 禁用了内联按钮的 Telegram 发送文本回退。
- 不支持选择功能的渠道会将选择选项作为文本列出。
- 仅限 URL 的按钮会变为原生链接按钮或回退 URL 行。
- 可选的置顶失败不会导致已发送的消息失败。

主要的例外是 `delivery.pin.required: true`；如果请求将置顶设为必填，且渠道无法置顶已发送的消息，则投递将报告失败。

## 提供商映射

当前捆绑的渲染器：

| 渠道            | 原生渲染目标       | 备注                                                                                                           |
| --------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Discord         | 组件和组件容器     | 为现有的提供商原生载荷生产者保留传统的 `channelData.discord.components`，但新的共享发送应使用 `presentation`。 |
| Slack           | Block Kit          | 为现有的提供商原生载荷生产者保留传统的 `channelData.slack.blocks`，但新的共享发送应使用 `presentation`。       |
| Telegram        | 文本加内联键盘     | 按钮/选择需要目标界面具备内联按钮功能；否则使用文本回退。                                                      |
| Mattermost      | 文本加上交互式属性 | 其他块会降级为文本。                                                                                           |
| Microsoft Teams | 自适应卡片         | 当两者都提供时，纯 `message` 文本会包含在卡片中。                                                              |
| 飞书            | 交互式卡片         | 卡片头部可以使用 `title`；正文避免重复该标题。                                                                 |
| 普通渠道        | 文本回退           | 没有渲染器的渠道仍然会获得可读的输出。                                                                         |

提供商原生负载兼容性是现有回复生成器的过渡便利措施。这不是添加新的共享原生字段的理由。

## Presentation 与 InteractiveReply

`InteractiveReply` 是由审批和交互助手使用的较旧的内部子集。它支持：

- 文本
- 按钮
- 选择列表

`MessagePresentation` 是规范的共享发送协定。它添加了：

- 标题
- 语气
- 上下文
- 分隔线
- 仅限 URL 的按钮
- 通过 `ReplyPayload.delivery` 进行通用传递元数据

在桥接旧代码时，使用来自 `openclaw/plugin-sdk/interactive-runtime` 的助手：

```ts
import { interactiveReplyToPresentation, normalizeMessagePresentation, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新代码应直接接受或生成 `MessagePresentation`。

## 投递固定

固定是投递行为，不是展示行为。请使用 `delivery.pin` 而不是提供商原生字段，例如 `channelData.telegram.pin`。

语义：

- `pin: true` 固定第一条成功投递的消息。
- `pin.notify` 默认为 `false`。
- `pin.required` 默认为 `false`。
- 可选固定失败会降级并保持已发送的消息完整。
- 必需固定失败会导致投递失败。
- 分块消息固定的是第一个投递的块，而不是尾部块。

对于提供商支持这些操作的现有消息，手动 `pin`、`unpin` 和 `pins` 消息操作仍然存在。

## 插件作者检查清单

- 当渠道可以渲染或安全降级语义展示时，从 `describeMessageTool(...)` 声明 `presentation`。
- 将 `presentationCapabilities` 添加到运行时出站适配器。
- 在运行时代码中实现 `renderPresentation`，而不是在控制平面插件设置代码中。
- 请将原生 UI 库排除在热设置/目录路径之外。
- 在渲染器和测试中保留平台限制。
- 为不支持的按钮、选择、URL 按钮、标题/文本重复以及混合 `message` 加上 `presentation` 发送添加回退测试。
- 仅当提供商能够固定已发送消息 ID 时，才通过 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 添加传递固定支持。
- 不要通过共享消息操作架构暴露新的提供商原生卡片/块/组件/按钮字段。

## 相关文档

- [消息 CLI](/zh/cli/message)
- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件架构](/zh/plugins/architecture-internals#message-tool-schemas)
- [渠道展示重构计划](/zh/plan/ui-channels)

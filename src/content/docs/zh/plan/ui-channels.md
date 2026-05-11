---
summary: 将语义消息呈现与渠道原生 UI 渲染器分离。
title: 渠道呈现重构计划
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

## 状态

已针对共享代理、CLI、插件功能和出站交付表面实现：

- `ReplyPayload.presentation` 承载语义消息 UI。
- `ReplyPayload.delivery.pin` 承载已发送消息的固定请求。
- 共享消息操作暴露 `presentation`、`delivery` 和 `pin`，而不是提供商原生的 `components`、`blocks`、`buttons` 或 `card`。
- 核心通过插件声明的出站功能来渲染或自动降级呈现。
- Discord、Slack、Telegram、Mattermost、MS Teams 和 Feishu 渲染器使用通用合约。
- Discord 渠道控制平面代码不再导入基于 Carbon 的 UI 容器。

规范文档现位于 [Message Presentation](/zh/plugins/message-presentation)。
将此计划保留为历史实现上下文；更新规范指南以反映合约、渲染器或回退行为的变更。

## 问题

渠道 UI 目前分散在几个不兼容的表面上：

- 核心通过 `buildCrossContextComponents` 拥有一个 Discord 形状的跨上下文渲染器钩子。
- Discord `channel.ts` 可以通过 `DiscordUiContainer` 导入原生 Carbon UI，这会将运行时 UI 依赖项引入渠道插件控制平面。
- 代理和 CLI 暴露了原生负载的逃生舱口，例如 Discord `components`、Slack `blocks`、Telegram 或 Mattermost `buttons`，以及 Teams 或 Feishu `card`。
- `ReplyPayload.channelData` 同时承载传输提示和原生 UI 信封。
- 通用 `interactive` 模型存在，但它比 Discord、Slack、Teams、Feishu、LINE、Telegram 和 Mattermost 已经使用的更丰富的布局要窄。

这使得核心能够感知原生 UI 形状，削弱了插件运行时的延迟加载，并为代理提供了太多特定于提供商的方式来表达相同的消息意图。

## 目标

- 核心根据声明的功能决定消息的最佳语义呈现。
- 扩展声明能力并将语义呈现渲染为原生传输负载。
- Web 控制界面与聊天原生界面保持分离。
- 原生渠道负载不会通过共享代理或 CLI 消息表面暴露。
- 不支持的呈现功能会自动降级为最佳文本表示形式。
- 置入已发送消息等传递行为属于通用传递元数据，而非呈现。

## 非目标

- 不为 `buildCrossContextComponents` 提供向后兼容的填充层。
- 不为 `components`、`blocks`、`buttons` 或 `card` 提供公共的原生逃生舱。
- 核心不导入渠道原生的 UI 库。
- 没有针对打包渠道的特定于提供商的 SDK 缝隙。

## 目标模型

在 `ReplyPayload` 中添加一个核心拥有的 `presentation` 字段。

```ts
type MessagePresentationTone = "neutral" | "info" | "success" | "warning" | "danger";

type MessagePresentation = {
  tone?: MessagePresentationTone;
  title?: string;
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
```

在迁移过程中，`interactive` 成为 `presentation` 的子集：

- `interactive` 文本块映射到 `presentation.blocks[].type = "text"`。
- `interactive` 按钮块映射到 `presentation.blocks[].type = "buttons"`。
- `interactive` 选择块映射到 `presentation.blocks[].type = "select"`。

外部代理和 CLI 模式现在使用 `presentation`；`interactive` 仍然是现有回复生成器的内部传统解析/呈现助手。

## 传递元数据

添加一个核心拥有的 `delivery` 字段，用于非 UI 的发送行为。

```ts
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

语义：

- `delivery.pin = true` 意味着置入第一个成功传递的消息。
- `notify` 默认为 `false`。
- `required` 默认为 `false`；不支持的渠道或置入失败会通过继续传递自动降级。
- 手动 `pin`、`unpin` 和 `list-pins` 消息操作仍然适用于现有消息。

当前的 Telegram ACP 主题绑定应该从 `channelData.telegram.pin = true` 移至 `delivery.pin = true`。

## 运行时能力契约

将呈现和交付渲染挂钩添加到运行时出站适配器，而不是控制平面渠道插件。

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
};

type ChannelDeliveryCapabilities = {
  pinSentMessage?: boolean;
};

type ChannelOutboundAdapter = {
  presentationCapabilities?: ChannelPresentationCapabilities;

  renderPresentation?: (params: { payload: ReplyPayload; presentation: MessagePresentation; ctx: ChannelOutboundSendContext }) => ReplyPayload | null;

  deliveryCapabilities?: ChannelDeliveryCapabilities;

  pinDeliveredMessage?: (params: { cfg: OpenClawConfig; accountId?: string | null; to: string; threadId?: string | number | null; messageId: string; notify: boolean }) => Promise<void>;
};
```

核心行为：

- 解析目标渠道和运行时适配器。
- 请求呈现能力。
- 在渲染之前降级不支持的块。
- 调用 `renderPresentation`。
- 如果不存在渲染器，则将呈现转换为文本后备。
- 成功发送后，当请求并支持 `delivery.pin` 时，调用 `pinDeliveredMessage`。

## 渠道映射

Discord：

- 在仅运行时模块中将 `presentation` 渲染为组件 v2 和 Carbon 容器。
- 将强调色辅助工具保留在轻量级模块中。
- 从渠道插件控制平面代码中移除 `DiscordUiContainer` 导入。

Slack：

- 将 `presentation` 渲染为 Block Kit。
- 移除 agent 和 CLI `blocks` 输入。

Telegram：

- 将文本、上下文和分隔线渲染为文本。
- 在为目标界面配置并允许的情况下，将操作和选择渲染为内联键盘。
- 当禁用内联按钮时使用文本后备。
- 将 ACP 主题固定移动到 `delivery.pin`。

Mattermost：

- 在配置的位置将操作渲染为交互式按钮。
- 将其他块渲染为文本后备。

MS Teams：

- 将 `presentation` 渲染为自适应卡片。
- 保留手动固定/取消固定/列出固定操作。
- 如果 Graph 支持对目标对话可靠，则可选择实现 `pinDeliveredMessage`。

Feishu：

- 将 `presentation` 渲染为交互式卡片。
- 保留手动固定/取消固定/列出固定操作。
- 如果 API 行为可靠，则可选择实现 `pinDeliveredMessage` 以进行已发送消息的固定。

LINE：

- 尽可能将 `presentation` 渲染为 Flex 或模板消息。
- 不支持的块回退到文本。
- 从 `channelData` 中移除 LINE UI 负载。

纯文本或受限渠道：

- 将呈现转换为具有保守格式的文本。

## 重构步骤

1. 重新应用 Discord 版本修复，该修复将 `ui-colors.ts` 与 Carbon 支持的 UI 分离，并从 `extensions/discord/src/channel.ts` 中移除 `DiscordUiContainer`。
2. 将 `presentation` 和 `delivery` 添加到 `ReplyPayload`、出站负载规范化、传递摘要和钩子负载中。
3. 在狭窄的 SDK/运行时子路径中添加 `MessagePresentation` 架构和解析器辅助函数。
4. 将消息能力 `buttons`、`cards`、`components` 和 `blocks` 替换为语义呈现能力。
5. 添加用于呈现渲染和传递固定的运行时出站适配器钩子。
6. 用 `buildCrossContextPresentation` 替换跨上下文组件构造。
7. 删除 `src/infra/outbound/channel-adapters.ts` 并从渠道插件类型中移除 `buildCrossContextComponents`。
8. 更改 `maybeApplyCrossContextMarker` 以附加 `presentation` 而不是原生参数。
9. 更新插件分派发送路径，使其仅消耗语义呈现和传递元数据。
10. 移除代理和 CLI 原生负载参数：`components`、`blocks`、`buttons` 和 `card`。
11. 移除创建原生消息工具架构的 SDK 辅助函数，用呈现架构辅助函数替换它们。
12. 从 `channelData` 中移除 UI/原生信封；在审查每个剩余字段之前，仅保留传输元数据。
13. 迁移 Discord、Slack、Telegram、Mattermost、MS Teams、飞书和 LINE 渲染器。
14. 更新消息 CLI、渠道页面、插件 SDK 和能力手册的文档。
15. 针对 Discord 和受影响的渠道入口点运行导入扩展分析。

步骤 1-11 和 13-14 已在此重构中针对共享代理、CLI、插件能力和出站适配器契约实现。步骤 12 仍然是针对提供商私有的 `channelData` 传输信封的更深层次内部清理过程。如果我们想要类型/测试关卡之外的量化导入扩展数据，步骤 15 仍然是后续验证。

## 测试

添加或更新：

- 呈现规范化测试。
- 针对不受支持块的呈现自动降级测试。
- 针对插件分派和核心传递路径的跨上下文标记测试。
- Discord、Slack、Telegram、Mattermost、MS Teams、Feishu、LINE 和文本回退的通道渲染矩阵测试。
- 消息工具 schema 测试，证明原生字段已移除。
- CLI 测试，证明原生标志已移除。
- Discord 入口点导入惰性回归，覆盖 Carbon。
- 传递固定 测试，覆盖 Telegram 和通用回退。

## 开放问题

- `delivery.pin` 应该在第一阶段为 Discord、Slack、MS Teams 和 Feishu 实现，还是先仅为 Telegram 实现？
- `delivery` 是否最终应该吸收现有字段，如 `replyToId`、`replyToCurrent`、`silent` 和 `audioAsVoice`，还是应该专注于发送后的行为？
- 演示是否应该直接支持图片或文件引用，或者媒体目前是否应与 UI 布局保持分离？

## 相关

- [Channels overview](/zh/channels)
- [Message presentation](/zh/plugins/message-presentation)

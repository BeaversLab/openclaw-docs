---
title: 渠道展示重构计划
summary: 将语义化消息展示与渠道原生 UI 渲染器解耦。
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

# 渠道展示重构计划

## 状态

已针对共享代理、CLI、插件功能和出站交付面实现：

- `ReplyPayload.presentation` 承载语义化消息 UI。
- `ReplyPayload.delivery.pin` 承载已发送消息的置顶请求。
- 共享消息操作暴露 `presentation`、`delivery` 和 `pin`，而不是提供商原生的 `components`、`blocks`、`buttons` 或 `card`。
- 核心通过插件声明的出站功能渲染或自动降级展示。
- Discord、Slack、Telegram、Mattermost、MS Teams 和 Feishu 渲染器使用通用协议。
- Discord 渠道控制平面代码不再导入基于 Carbon 的 UI 容器。

规范文档现在位于 [Message Presentation](/zh/plugins/message-presentation)。
保留此计划作为历史实现上下文；当契约、渲染器或回退行为发生变化时，请更新规范指南。

## 问题

渠道 UI 目前分散在几个不兼容的表面上：

- Core 通过 `buildCrossContextComponents` 拥有一个 Discord 形状的跨上下文渲染器钩子。
- Discord `channel.ts` 可以通过 `DiscordUiContainer` 导入原生 Carbon UI，这会将运行时 UI 依赖项拉入渠道插件控制平面。
- 代理和 CLI 暴露了原生负载逃生舱口，例如 Discord `components`、Slack `blocks`、Telegram 或 Mattermost `buttons`，以及 Teams 或 Feishu `card`。
- `ReplyPayload.channelData` 既承载传输提示，也承载原生 UI 信封。
- 通用的 `interactive` 模型已存在，但它比 Discord、Slack、Teams、Feishu、LINE、Telegram 和 Mattermost 已使用的更丰富的布局要窄。

这使得核心感知原生 UI 形状，削弱了插件运行时的惰性，并给了代理太多特定于提供商的方式来表达相同的消息意图。

## 目标

- 核心根据声明的功能决定消息的最佳语义展示。
- 扩展声明功能并将语义展示渲染为原生传输负载。
- Web Control UI 与聊天原生 UI 保持分离。
- 原生渠道载荷不会通过共享代理或 CLI 消息界面暴露。
- 不支持的表现功能会自动降级为最佳文本表示形式。
- 发送消息的置顶等交付行为属于通用交付元数据，而非表现层。

## 非目标

- 不为 `buildCrossContextComponents` 提供向后兼容的填充层。
- 不为 `components`、`blocks`、`buttons` 或 `card` 提供公开的原生逃生舱口。
- 不核心导入渠道原生的 UI 库。
- 不为捆绑的渠道提供特定于提供商的 SDK 接口。

## 目标模型

向 `ReplyPayload` 添加一个核心拥有的 `presentation` 字段。

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

在迁移期间，`interactive` 变为 `presentation` 的子集：

- `interactive` 文本块映射到 `presentation.blocks[].type = "text"`。
- `interactive` 按钮块映射到 `presentation.blocks[].type = "buttons"`。
- `interactive` 选择块映射到 `presentation.blocks[].type = "select"`。

外部代理和 CLI 架表现在使用 `presentation`；`interactive` 仍然是现有回复生成器的内部旧版解析器/渲染助手。

## 传递元数据

为核心拥有的 `delivery` 字段添加用于非 UI 发送行为的设置。

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

- `delivery.pin = true` 意味着固定第一条成功传递的消息。
- `notify` 默认为 `false`。
- `required` 默认为 `false`；不支持的频道或固定失败会通过继续传递自动降级。
- 针对现有消息，仍保留手动 `pin`、`unpin` 和 `list-pins` 消息操作。

当前的 Telegram ACP 主题绑定应从 `channelData.telegram.pin = true` 迁移至 `delivery.pin = true`。

## 运行时能力契约

将呈现和交付渲染钩子添加到运行时出站适配器，而不是控制平面渠道插件。

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
- 询问呈现能力。
- 在渲染之前降级不支持的块。
- 调用 `renderPresentation`。
- 如果不存在渲染器，则将呈现转换为文本回退。
- 成功发送后，当请求并支持 `delivery.pin` 时，调用 `pinDeliveredMessage`。

## 渠道映射

Discord：

- 将 `presentation` 渲染为仅运行时模块中的 components v2 和 Carbon 容器。
- 将强调色辅助函数保留在轻量级模块中。
- 从渠道插件控制平面代码中移除 `DiscordUiContainer` 导入。

Slack：

- 将 `presentation` 渲染为 Block Kit。
- 移除 agent 和 CLI `blocks` 输入。

Telegram：

- 将文本、上下文和分隔符渲染为文本。
- 在为目标表面配置并允许时，将操作和选择渲染为内联键盘。
- 当内联按钮被禁用时使用文本回退。
- 将 ACP 主题固定移动到 `delivery.pin`。

Mattermost：

- 在配置了的地方将操作渲染为交互式按钮。
- 将其他块渲染为文本回退。

MS Teams：

- 将 `presentation` 渲染为 Adaptive Cards。
- 保留手动固定/取消固定/列出固定操作。
- 如果 Graph 支持对于目标对话是可靠的，则可选择性地实现 `pinDeliveredMessage`。

飞书：

- 将 `presentation` 渲染为交互式卡片。
- 保留手动置顶/取消置顶/列出置项操作。
- 如果 API 行为可靠，则可选择性地实现 `pinDeliveredMessage` 以对发送的消息进行置顶。

LINE：

- 尽可能将 `presentation` 渲染为 Flex 或模板消息。
- 对于不支持的块，回退到文本。
- 从 `channelData` 中移除 LINE UI 载荷。

纯文本或受限频道：

- 将表示转换为采用保守格式的文本。

## 重构步骤

1. 重新应用 Discord 版本修复，将 `ui-colors.ts` 与 Carbon 支持的 UI 分离，并从 `extensions/discord/src/channel.ts` 中移除 `DiscordUiContainer`。
2. 向 `ReplyPayload`、出站负载归一化、传递摘要和 hook 负载添加 `presentation` 和 `delivery`。
3. 在特定的 SDK/runtime 子路径中添加 `MessagePresentation` schema 和解析器辅助函数。
4. 将消息能力 `buttons`、`cards`、`components` 和 `blocks` 替换为语义呈现能力。
5. 为呈现渲染和传递固定添加运行时出站适配器 hooks。
6. 使用 `buildCrossContextPresentation` 替换跨上下文组件构造。
7. 删除 `src/infra/outbound/channel-adapters.ts` 并从渠道插件类型中移除 `buildCrossContextComponents`。
8. 更改 `maybeApplyCrossContextMarker` 以附加 `presentation` 而不是原生参数。
9. 更新 plugin-dispatch 发送路径，使其仅消费语义化呈现和交付元数据。
10. 移除 agent 和 CLI 原生 payload 参数：`components`、`blocks`、`buttons` 和 `card`。
11. 移除创建原生消息工具模式的 SDK 辅助函数，将其替换为呈现模式辅助函数。
12. 从 `channelData` 中移除 UI/原生信封；仅保留传输元数据，直到审查完每个剩余字段。
13. 迁移 Discord、Slack、Telegram、Mattermost、MS Teams、Feishu 和 LINE 渲染器。
14. 更新消息 CLI、渠道页面、插件 SDK 和能力手册的文档。
15. 对 Discord 和受影响的渠道入口点运行导入分发分析。

在此重构中，步骤 1-11 和 13-14 已针对共享代理、CLI、插件功能和出站适配器契约实现。步骤 12 仍是对提供商私有 `channelData` 传输信封的更深层内部清理。步骤 15 仍然是后续验证，如果我们想要超出类型/测试门限的量化导入分发数字。

## 测试

添加或更新：

- 展示规范化测试。
- 不支持块的自展示降级测试。
- 插件分发和核心传递路径的跨上下文标记测试。
- 针对 Discord、Slack、Telegram、Mattermost、MS Teams、飞书、LINE 和文本回退的渠道渲染矩阵测试。
- 证明原生字段已消失的消息工具架构测试。
- 证明原生标志已消失的 CLI 测试。
- 涵盖 Carbon 的 Discord 入口点导入惰性回归测试。
- 涵盖 Telegram 和通用回退的传递固定测试。

## 未决问题

- 在第一阶段，应该为 Discord、Slack、MS Teams 和飞书实现 `delivery.pin`，还是先仅实现 Telegram？
- `delivery` 最终是否应该吸收现有的字段，如 `replyToId`、`replyToCurrent`、`silent` 和 `audioAsVoice`，还是应专注于发送后的行为？
- Presentation 是否应直接支持图片或文件引用，或者媒体内容目前应保持与 UI 布局分离？

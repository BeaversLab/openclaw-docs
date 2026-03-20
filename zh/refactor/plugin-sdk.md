---
summary: "计划：为所有消息连接器提供一套整洁的插件 SDK + 运行时"
read_when:
  - 定义或重构插件架构
  - 将渠道连接器迁移到插件 SDK/运行时
title: "插件 SDK 重构"
---

# 插件 SDK + 运行时重构计划

目标：每个消息连接器都是一个使用统一稳定 API 的插件（内置或外部）。
插件不得直接从 `src/**` 导入任何内容。所有依赖项必须通过 SDK 或运行时。

## 为何选择现在

- 当前的连接器混用了多种模式：直接导入核心、仅分发包的桥接以及自定义辅助函数。
- 这使得升级变得脆弱，并阻碍了构建整洁的外部插件表面。

## 目标架构（两层）

### 1) 插件 SDK（编译时、稳定、可发布）

范围：类型、辅助函数和配置工具。没有运行时状态，没有副作用。

内容（示例）：

- 类型：`ChannelPlugin`、适配器、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 配置辅助函数：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配对辅助函数：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 设置入口点：主机拥有的 `setup` + `setupWizard`；避免使用广泛的新手引导辅助函数。
- 工具参数辅助函数：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文档链接辅助函数：`formatDocsLink`。

交付方式：

- 作为 `openclaw/plugin-sdk` 发布（或从核心以 `openclaw/plugin-sdk` 导出）。
- 使用带有明确稳定性保证的语义化版本控制。

### 2) 插件运行时（执行表面、注入式）

范围：涉及核心运行时行为的所有内容。
通过 `OpenClawPluginApi.runtime` 访问，以便插件从不导入 `src/**`。

提议的表面（极简但完整）：

```ts
export type PluginRuntime = {
  channel: {
    text: {
      chunkMarkdownText(text: string, limit: number): string[];
      resolveTextChunkLimit(cfg: OpenClawConfig, channel: string, accountId?: string): number;
      hasControlCommand(text: string, cfg: OpenClawConfig): boolean;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher(params: {
        ctx: unknown;
        cfg: unknown;
        dispatcherOptions: {
          deliver: (payload: {
            text?: string;
            mediaUrls?: string[];
            mediaUrl?: string;
          }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: {
        cfg: unknown;
        channel: string;
        accountId: string;
        peer: { kind: RoutePeerKind; id: string };
      }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: {
        channel: string;
        id: string;
        meta?: { name?: string };
      }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(
        buffer: Uint8Array,
        contentType: string | undefined,
        direction: "inbound" | "outbound",
        maxBytes: number,
      ): Promise<{ path: string; contentType?: string }>;
    };
    mentions: {
      buildMentionRegexes(cfg: OpenClawConfig, agentId?: string): RegExp[];
      matchesMentionPatterns(text: string, regexes: RegExp[]): boolean;
    };
    groups: {
      resolveGroupPolicy(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
      ): {
        allowlistEnabled: boolean;
        allowed: boolean;
        groupConfig?: unknown;
        defaultConfig?: unknown;
      };
      resolveRequireMention(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
        override?: boolean,
      ): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: {
        debounceMs: number;
        buildKey: (v: T) => string | null;
        shouldDebounce: (v: T) => boolean;
        onFlush: (entries: T[]) => Promise<void>;
        onError?: (err: unknown) => void;
      }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: {
        useAccessGroups: boolean;
        authorizers: Array<{ configured: boolean; allowed: boolean }>;
      }): boolean;
    };
  };
  logging: {
    shouldLogVerbose(): boolean;
    getChildLogger(name: string): PluginLogger;
  };
  state: {
    resolveStateDir(cfg: OpenClawConfig): string;
  };
};
```

注：

- 运行时是访问核心行为的唯一方式。
- SDK 故意保持小型且稳定。
- 每个运行时方法都映射到现有的核心实现（无重复）。

## 迁移计划（分阶段、安全）

### 第 0 阶段：脚手架

- 引入 `openclaw/plugin-sdk`。
- 将 `api.runtime` 添加到 `OpenClawPluginApi` 中，使用上述接口。
- 在过渡期间保留现有的导入（弃用警告）。

### 第一阶段：桥接清理（低风险）

- 用 `api.runtime` 替换每个扩展的 `core-bridge.ts`。
- 首先迁移 BlueBubbles、Zalo 和 Zalo Personal（已经很接近）。
- 删除重复的桥接代码。

### 第二阶段：轻量级直接导入插件

- 将 Matrix 迁移到 SDK + 运行时。
- 验证新手引导、目录和群组提及逻辑。

### 第三阶段：重量级直接导入插件

- 迁移 MS Teams（最大的一组运行时辅助工具）。
- 确保回复/正在输入语义与当前行为匹配。

### 第四阶段：iMessage 插件化

- 将 iMessage 移入 `extensions/imessage`。
- 用 `api.runtime` 替换直接的核心调用。
- 保持配置键、CLI 行为和文档不变。

### 第五阶段：强制执行

- 添加 lint 规则/CI 检查：不从 `src/**` 进行 `extensions/**` 导入。
- 添加插件 SDK/版本兼容性检查（运行时 + SDK semver）。

## 兼容性和版本控制

- SDK：semver，已发布，记录的变更。
- 运行时：随核心发布版本化。添加 `api.runtime.version`。
- 插件声明所需的运行时范围（例如 `openclawRuntime: ">=2026.2.0"`）。

## 测试策略

- 适配器级单元测试（使用真实核心实现测试运行时函数）。
- 每个插件的黄金测试：确保没有行为漂移（路由、配对、允许列表、提及限制）。
- CI 中使用的单个端到端插件示例（安装 + 运行 + 冒烟测试）。

## 未解决的问题

- 在哪里托管 SDK 类型：单独的包还是核心导出？
- 运行时类型分发：在 SDK 中（仅类型）还是在核心中？
- 如何为内置插件和外部插件公开文档链接？
- 在过渡期间，我们是否允许仓库内的插件进行有限的直接核心导入？

## 成功标准

- 所有渠道连接器都是使用 SDK + 运行时的插件。
- 不从 `src/**` 进行 `extensions/**` 导入。
- 新的连接器模板仅依赖 SDK + 运行时。
- 外部插件可以在没有核心源代码访问权限的情况下进行开发和更新。

相关文档：[插件](/zh/tools/plugin)、[渠道](/zh/channels/index)、[配置](/zh/gateway/configuration)。

## 已实现渠道拥有的接缝

最近的重构工作拓宽了渠道插件契约，以便核心不再拥有特定于渠道的用户体验 (UX) 和路由行为：

- `messaging.buildCrossContextComponents`：渠道拥有的跨上下文 UI 标记
  （例如 Discord 组件 v2 容器）
- `messaging.enableInteractiveReplies`：渠道拥有的回复规范化切换
  （例如 Slack 交互式回复）
- `messaging.resolveOutboundSessionRoute`：渠道拥有的出站会话路由
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`：渠道拥有的
  `/channels capabilities` 探测显示以及额外的审计/作用域
- `threading.resolveAutoThreadId`：渠道拥有的同一会话自动串接
- `threading.resolveReplyTransport`：渠道拥有的回复与串接交付映射
- `actions.requiresTrustedRequesterSender`：渠道拥有的特权操作信任门
- `execApprovals.*`：渠道拥有的执行批准界面状态、转发抑制、
  挂起负载 UX 以及交付前钩子
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`：配置变更/移除时
  渠道拥有的清理
- `allowlist.supportsScope`：渠道拥有的允许列表作用域通告

在共享核心流中，应优先使用这些钩子，而不是新增 `channel === "discord"` / `telegram`
分支。

import en from "/components/footer/en.mdx";

<en />

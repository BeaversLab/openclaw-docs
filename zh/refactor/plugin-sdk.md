---
summary: "计划：统一插件 SDK + runtime，覆盖所有消息连接器"
read_when:
  - 定义或重构插件架构
  - 迁移频道连接器到插件 SDK/runtime
title: "Plugin SDK 重构"
---

# Plugin SDK + Runtime 重构计划

目标：每个消息连接器都是插件（内置或外部），使用一套稳定 API。
插件不再直接从 `src/**` 引入；所有依赖通过 SDK 或 runtime。

## 为什么现在

- 现有连接器混用模式：直接 core 引入、仅 dist bridge、自定义 helper。
- 导致升级脆弱，阻碍干净的外部插件接口。

## 目标架构（两层）

### 1) Plugin SDK（编译期、稳定、可发布）

范围：类型、helper、配置工具。无运行时状态、无副作用。

内容示例：

- Types：`ChannelPlugin`、adapters、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 配置 helper：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配对 helper：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- Onboarding helper：`promptChannelAccessConfig`、`addWildcardAllowFrom`、onboarding types。
- 工具参数 helper：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文档链接 helper：`formatDocsLink`。

交付：

- 发布为 `openclaw/plugin-sdk`（或在 core 中导出 `openclaw/plugin-sdk`）。
- 语义化版本管理并提供明确稳定性保证。

### 2) Plugin Runtime（执行面，注入）

范围：所有涉及 core 运行时行为的内容。
通过 `OpenClawPluginApi.runtime` 访问，插件不再 import `src/**`。

拟定接口（最小但完整）：

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
        peer: { kind: "dm" | "group" | "channel"; id: string };
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
        maxBytes: number
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
        groupId: string
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
        override?: boolean
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

说明：

- Runtime 是访问 core 行为的唯一入口。
- SDK 故意保持小而稳定。
- 每个 runtime 方法映射到现有 core 实现（不重复造轮子）。

## 迁移计划（分阶段，安全）

### Phase 0：脚手架

- 引入 `openclaw/plugin-sdk`。
- 给 `OpenClawPluginApi` 增加 `api.runtime`，包含以上接口。
- 过渡期保留现有 import（加弃用警告）。

### Phase 1：bridge 清理（低风险）

- 用 `api.runtime` 替换每个扩展的 `core-bridge.ts`。
- 先迁移 BlueBubbles、Zalo、Zalo Personal（已有接近）。
- 移除重复的 bridge 代码。

### Phase 2：轻量直引插件

- 迁移 Matrix 到 SDK + runtime。
- 验证 onboarding、directory、群聊 mention 逻辑。

### Phase 3：重度直引插件

- 迁移 MS Teams（运行时 helper 最多）。
- 确保 reply/typing 语义与当前一致。

### Phase 4：iMessage 插件化

- 将 iMessage 移至 `extensions/imessage`。
- 用 `api.runtime` 替换 core 直连。
- 保持配置键、CLI 行为、文档不变。

### Phase 5：强制执行

- 添加 lint 规则 / CI 检查：禁止 `extensions/**` 从 `src/**` 引入。
- 增加 SDK/Runtime 版本兼容检查（runtime + SDK semver）。

## 兼容性与版本

- SDK：语义化版本发布，变更有文档。
- Runtime：随 core 版本化；添加 `api.runtime.version`。
- 插件声明需要的 runtime 版本范围（如 `openclawRuntime: ">=2026.2.0"`）。

## 测试策略

- 适配器级单测（runtime 函数用真实 core 实现）。
- 插件金样测试：确保路由、配对、allowlist、mention gating 行为不漂移。
- CI 中运行一个端到端插件示例（安装 + 运行 + 冒烟）。

## 开放问题

- SDK 类型应独立包还是 core 导出？
- Runtime 类型放 SDK（仅 types）还是 core？
- 内置与外部插件的文档链接如何暴露？
- 过渡期是否允许少量 in-repo 插件直引 core？

## 成功标准

- 所有频道连接器均为 SDK + runtime 插件。
- `extensions/**` 不再从 `src/**` 引入。
- 新连接器模板仅依赖 SDK + runtime。
- 外部插件无需访问 core 源码即可开发与更新。

相关文档：[Plugins](/zh/plugin)、[Channels](/zh/channels/index)、[Configuration](/zh/gateway/configuration)。

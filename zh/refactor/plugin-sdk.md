---
summary: "计划：为所有消息连接器提供一个简洁的插件 SDK + runtime"
read_when:
  - Defining or refactoring the plugin architecture
  - Migrating channel connectors to the plugin SDK/runtime
title: "Plugin SDK 重构"
---

# Plugin SDK + Runtime 重构计划

目标：每个消息连接器都是使用一个稳定 API 的插件（内置或外部）。
插件不直接从 `src/**` 导入任何内容。所有依赖项都通过 SDK 或 runtime 传递。

## 为何是现在

- 当前的连接器混合了多种模式：直接导入核心、仅 dist 的桥接器和自定义辅助函数。
- 这使得升级变得脆弱，并阻碍了建立整洁的外部插件接口。

## 目标架构（两层）

### 1) Plugin SDK（编译时、稳定、可发布）

范围：类型、辅助函数和配置工具。无运行时状态，无副作用。

内容（示例）：

- 类型：`ChannelPlugin`、适配器、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 配置辅助函数：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配对辅助函数：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 入门辅助函数：`promptChannelAccessConfig`、`addWildcardAllowFrom`、入门类型。
- 工具参数辅助函数：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文档链接辅助函数：`formatDocsLink`。

交付：

- 作为 `openclaw/plugin-sdk` 发布（或从 `openclaw/plugin-sdk` 下的 core 导出）。
- 遵循语义化版本控制 (Semver)，并提供明确的稳定性保证。

### 2) Plugin Runtime（执行接口、注入式）

范围：所有涉及核心运行时行为的内容。
通过 `OpenClawPluginApi.runtime` 访问，以便插件从不导入 `src/**`。

建议的接口（最小但完整）：

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

备注：

- Runtime 是访问核心行为的唯一方式。
- SDK 旨在保持小巧和稳定。
- 每个 runtime 方法都映射到现有的核心实现（无重复）。

## 迁移计划（分阶段、安全）

### 阶段 0：搭建脚手架

- 引入 `openclaw/plugin-sdk`。
- 将上述接口添加到 `OpenClawPluginApi` 中的 `api.runtime`。
- 在过渡窗口期间保留现有的导入（弃用警告）。

### 阶段 1：清理桥接器（低风险）

- 用 `api.runtime` 替换每个扩展的 `core-bridge.ts`。
- 首先迁移 BlueBubbles、Zalo、Zalo Personal（已经很接近了）。
- 删除重复的桥接代码。

### 阶段 2：轻量级直接导入插件

- 将 Matrix 迁移到 SDK + 运行时。
- 验证入职引导、目录、群组提及逻辑。

### 阶段 3：重量级直接导入插件

- 迁移 MS Teams（最大的一组运行时辅助程序）。
- 确保回复/正在输入语义与当前行为匹配。

### 阶段 4：iMessage 插件化

- 将 iMessage 移至 `extensions/imessage`。
- 使用 `api.runtime` 替换直接核心调用。
- 保持配置键、CLI 行为和文档不变。

### 阶段 5：强制执行

- 添加 lint 规则 / CI 检查：禁止从 `src/**` 导入 `extensions/**`。
- 添加插件 SDK/版本兼容性检查（运行时 + SDK semver）。

## 兼容性和版本控制

- SDK：semver，已发布，有文档记录的变更。
- 运行时：随核心发布版本。添加 `api.runtime.version`。
- 插件声明所需的运行时范围（例如 `openclawRuntime: ">=2026.2.0"`）。

## 测试策略

- 适配器级单元测试（通过真实核心实现来运行运行时函数）。
- 每个插件的 Golden 测试：确保没有行为偏差（路由、配对、允许列表、提及门控）。
- 在 CI 中使用单个端到端插件示例（安装 + 运行 + 冒烟测试）。

## 未决问题

- 在哪里托管 SDK 类型：单独的包还是核心导出？
- 运行时类型分发：在 SDK（仅类型）中还是在核心中？
- 如何为捆绑插件与外部插件公开文档链接？
- 我们是否允许过渡期间仓库内的插件有限地直接导入核心？

## 成功标准

- 所有通道连接器都是使用 SDK + 运行时的插件。
- 禁止从 `src/**` 导入 `extensions/**`。
- 新的连接器模板仅依赖 SDK + 运行时。
- 可以在没有核心源代码访问权限的情况下开发和更新外部插件。

相关文档：[插件](/zh/en/tools/plugin)、[通道](/zh/en/channels/index)、[配置](/zh/en/gateway/configuration)。

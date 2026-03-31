---
title: "Plugin SDK 迁移"
sidebarTitle: "迁移到 SDK"
summary: "从旧版向后兼容层迁移到现代插件 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Plugin SDK 迁移

OpenClaw 已从广泛的向后兼容层转变为现代插件架构，具有专注且有文档记录的导入。如果您的插件是在新架构之前构建的，本指南将帮助您进行迁移。

## 有什么变化

旧的插件系统提供了两个完全开放的接口，允许插件从单个入口点导入它们需要的任何内容：

- **`openclaw/plugin-sdk/compat`** — 单个导入，重新导出了数十个辅助函数。引入它是为了在构建新插件架构的同时，让旧的基于 hook 的插件继续工作。
- **`openclaw/extension-api`** — 一座桥梁，允许插件直接访问主机端的辅助函数，例如嵌入式代理运行器。

这两个接口现在都已**弃用**。它们在运行时仍然有效，但新插件绝不能使用它们，现有插件应在下一个主要版本删除它们之前进行迁移。

<Warning>向后兼容层将在未来的主要版本中移除。 届时，仍从这些接口导入的插件将会中断。</Warning>

## 为什么要进行此更改

旧的方法导致了以下问题：

- **启动缓慢** — 导入一个辅助函数会加载数十个不相关的模块
- **循环依赖** — 广泛的重新导出使得很容易创建导入循环
- API 表面不清晰 — 无法区分哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这个问题：每个导入路径 (`openclaw/plugin-sdk/\<subpath\>`)
都是一个小的、独立的模块，具有明确的用途和记录在案的契约。

## 如何迁移

<Steps>
  <Step title="查找已弃用的导入">
    在您的插件中搜索来自任一已弃用接口的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Replace with focused imports">
    旧导出层的每个导出都对应一个特定的现代导入路径：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    对于主机端的辅助函数，请使用注入的插件运行时，而不是直接导入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    同样的模式也适用于其他旧版桥接辅助函数：

    | Old import | Modern equivalent |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | 会话存储辅助函数 | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Build and test">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="完整导入路径表">
  | 导入路径 | 用途 | 主要导出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 规范插件入口辅助器 | `definePluginEntry` | | `plugin-sdk/core` | 渠道入口定义、渠道构建器、基础类型 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface` | | `plugin-sdk/channel-pairing` | 私信配对原语 |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回复前缀 + 输入连线 | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | 配置适配器工厂 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 配置模式构建器 | 渠道配置模式类型 | | `plugin-sdk/channel-policy` | 群组/私信策略解析 | `resolveChannelGroupRequireMention` | |
  `plugin-sdk/channel-lifecycle` | 账户状态跟踪 | `createAccountStatusSink` | | `plugin-sdk/channel-runtime` | 运行时连线辅助器 | 渠道运行时实用工具 | | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 | | `plugin-sdk/runtime-store` | 持久化插件存储 | `createPluginRuntimeStore` | | `plugin-sdk/approval-runtime` | 批准提示辅助器 | Exec/plugin 批准负载和回复辅助器 | |
  `plugin-sdk/collection-runtime` | 有界缓存辅助器 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 诊断门控辅助器 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 错误格式化辅助器 | `formatUncaughtError`, 错误图辅助器 | | `plugin-sdk/fetch-runtime` | 封装 fetch/proxy 辅助器 | `resolveFetch`, proxy 辅助器 | | `plugin-sdk/host-runtime` |
  主机规范化辅助器 | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重试辅助器 | `RetryConfig`, `retryAsync`, policy 运行器 | | `plugin-sdk/allow-from` | 允许列表格式化 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允许列表输入映射 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 命令门控 | `resolveControlCommandGate` | |
  `plugin-sdk/secret-input` | 密钥输入解析 | 密钥输入辅助器 | | `plugin-sdk/webhook-ingress` | Webhook 请求辅助器 | Webhook 目标实用工具 | | `plugin-sdk/webhook-request-guards` | Webhook 正文防护辅助器 | 请求正文读取/限制辅助器 | | `plugin-sdk/reply-payload` | 消息回复类型 | 回复负载类型 | | `plugin-sdk/provider-onboard` | 提供商新手引导补丁 | 新手引导配置辅助器 | | `plugin-sdk/keyed-async-queue`
  | 有序异步队列 | `KeyedAsyncQueue` | | `plugin-sdk/testing` | 测试实用工具 | 测试辅助器和模拟 |
</Accordion>

使用与任务匹配的最窄的导入。如果您找不到导出，请检查 `src/plugin-sdk/` 处的源代码或在 Discord 中询问。

## 移除时间表

| 时间               | 发生什么                                           |
| ------------------ | -------------------------------------------------- |
| **现在**           | 已弃用的接口会发出运行时警告                       |
| **下一个主要版本** | 已弃用的接口将被移除；仍在使用它们的插件将无法运行 |

所有核心插件已迁移完成。外部插件应在下一个主要版本发布前进行迁移。

## 暂时抑制警告

在进行迁移工作时，设置这些环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时的应急手段，并非永久解决方案。

## 相关

- [入门指南](/en/plugins/building-plugins) — 构建您的第一个插件
- [SDK Overview](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — 构建渠道插件
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — 构建提供商插件
- [Plugin Internals](/en/plugins/architecture) — 架构深度剖析
- [Plugin Manifest](/en/plugins/manifest) — 清单架构参考

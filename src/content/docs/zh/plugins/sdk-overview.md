---
title: "插件 SDK 概述"
sidebarTitle: "SDK 概述"
summary: "导入映射、注册 API 参考以及 SDK 架构"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# 插件 SDK 概述

插件 SDK 是插件与核心之间的类型化契约。本页面是关于**导入内容**和**可注册内容**的参考。

<Tip>**正在寻找操作指南？** - 第一个插件？请从 [入门指南](/en/plugins/building-plugins) 开始 - 频道插件？请参阅 [频道插件](/en/plugins/sdk-channel-plugins) - 提供商插件？请参阅 [提供商插件](/en/plugins/sdk-provider-plugins)</Tip>

## 导入约定

请始终从特定的子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
```

每个子路径都是一个小型的、自包含的模块。这可以保持快速启动并防止循环依赖问题。

## 子路径参考

最常用的子路径，按用途分组。包含 100 多个子路径的完整列表位于 `scripts/lib/plugin-sdk-entrypoints.json` 中。

### 插件入口

| 子路径                    | 主要导出                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry` | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`         | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema` |

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface` |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Channel 配置模式类型 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | 防抖、提及匹配、信封辅助工具 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`、 `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目标解析/匹配辅助工具 |
    | `plugin-sdk/channel-contract` | Channel 契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连接 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/cli-backend` | CLI backend defaults + watchdog constants | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-models` | Legacy compat 提供商 模型 aliases; prefer 提供商-specific subpaths or `plugin-sdk/provider-model-shared` | |
  `plugin-sdk/provider-model-shared` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog` | | `plugin-sdk/provider-catalog` | Legacy compat 提供商 builder aliases; prefer 提供商-specific subpaths or `plugin-sdk/provider-catalog-shared` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` and similar | |
  `plugin-sdk/provider-stream` | Stream wrapper types | | `plugin-sdk/provider-onboard` | 新手引导配置补丁助手 | | `plugin-sdk/global-singleton` | Process-local singleton/map/cache helpers |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Secret input parsing helpers | | `plugin-sdk/webhook-ingress` | Webhook request/target helpers | | `plugin-sdk/webhook-request-guards` | Request body size/timeout helpers |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | 配置加载/写入辅助函数 | | `plugin-sdk/approval-runtime` | 执行和插件批准辅助函数 | | `plugin-sdk/infra-runtime` | 系统事件/心跳辅助函数 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助函数 | | `plugin-sdk/diagnostic-runtime` | 诊断标志和事件辅助函数 | |
  `plugin-sdk/error-runtime` | 错误图和格式化辅助函数 | | `plugin-sdk/fetch-runtime` | 封装的 fetch、代理和固定查找辅助函数 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机标准化辅助函数 | | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助函数 | | `plugin-sdk/agent-runtime` | 代理目录/身份/工作区辅助函数 | | `plugin-sdk/directory-runtime` | 基于配置的目录查询/去重 | |
  `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Capability and testing subpaths">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/image-generation` | 图像生成提供商类型 |
    | `plugin-sdk/media-understanding` | 媒体理解提供商类型 |
    | `plugin-sdk/speech` | 语音提供商类型 |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## 注册 API

`register(api)` 回调接收一个 `OpenClawPluginApi` 对象，其中包含以下方法：

### 功能注册

| 方法                                          | 注册内容              |
| --------------------------------------------- | --------------------- |
| `api.registerProvider(...)`                   | 文本推理 (LLM)        |
| `api.registerCliBackend(...)`                 | 本地 CLI 推理后端     |
| `api.registerChannel(...)`                    | 消息渠道              |
| `api.registerSpeechProvider(...)`             | 文本转语音 / STT 合成 |
| `api.registerMediaUnderstandingProvider(...)` | 图像/音频/视频分析    |
| `api.registerImageGenerationProvider(...)`    | 图像生成              |
| `api.registerWebSearchProvider(...)`          | 网络搜索              |

### 工具和命令

| 方法                            | 注册内容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必填或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                  |

### 基础设施

| 方法                                           | 注册内容                |
| ---------------------------------------------- | ----------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                |
| `api.registerHttpRoute(params)`                | Gateway(网关) HTTP 端点 |
| `api.registerGatewayMethod(name, handler)`     | Gateway(网关) RPC 方法  |
| `api.registerCli(registrar, opts?)`            | CLI 子命令              |
| `api.registerService(service)`                 | 后台服务                |
| `api.registerInteractiveHandler(registration)` | 交互式处理程序          |

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（例如 `claude-cli` 或 `codex-cli`）的默认配置。

- 后端 `id` 会成为模型引用（如 `claude-cli/opus`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。OpenClaw 会在运行 CLI 之前将 `agents.defaults.cliBackends.<id>` 合并到插件默认配置之上。
- 当后端在合并后需要兼容性重写（例如规范化旧标志形状）时，请使用 `normalizeConfig`。

### 独占插槽

| 方法                                       | 注册内容                   |
| ------------------------------------------ | -------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个） |
| `api.registerMemoryPromptSection(builder)` | 内存提示部分构建器         |
| `api.registerMemoryFlushPlan(resolver)`    | 内存刷新计划解析器         |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器           |

### 内存嵌入适配器

| 方法                                           | 注册内容                 |
| ---------------------------------------------- | ------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 活动插件的内存嵌入适配器 |

- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是内存插件专用的。
- `registerMemoryEmbeddingProvider` 允许活动内存插件注册一个
  或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义
  插件定义的 ID）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）会根据这些已注册
  的适配器 ID 进行解析。

### 事件和生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子 |
| `api.onConversationBindingResolved(handler)` | 对话绑定回调       |

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 是终局性的。一旦任何处理程序设置了它，优先级较低的处理程序将被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `message_sending`：返回 `{ cancel: true }` 是终局性的。一旦任何处理程序设置了它，优先级较低的处理程序将被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为未做决定（与省略 `cancel` 相同），而不是覆盖。

### API 对象字段

| 字段                     | 类型                      | 描述                                                 |
| ------------------------ | ------------------------- | ---------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                              |
| `api.name`               | `string`                  | 显示名称                                             |
| `api.version`            | `string?`                 | 插件版本（可选）                                     |
| `api.description`        | `string?`                 | 插件描述（可选）                                     |
| `api.source`             | `string`                  | 插件源路径                                           |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                   |
| `api.config`             | `OpenClawConfig`          | 当前配置快照                                         |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置    |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助程序](/en/plugins/sdk-runtime)            |
| `api.logger`             | `PluginLogger`            | 作用域日志记录器（`debug`，`info`，`warn`，`error`） |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`、`"setup-only"` 或 `"setup-runtime"`        |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                           |

## 内部模块约定

在您的插件中，请使用本地 barrel 文件进行内部导入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>`
  导入您自己的插件。请通过 `./api.ts` 或
  `./runtime-api.ts` 路由内部导入。SDK 路径仅用于外部契约。
</Warning>

## 相关

- [入口点](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 选项
- [运行时辅助工具](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空间参考
- [设置与配置](/en/plugins/sdk-setup) — 打包、清单、配置架构
- [测试](/en/plugins/sdk-testing) — 测试工具和 Lint 规则
- [SDK 迁移](/en/plugins/sdk-migration) — 从已弃用的接口迁移
- [插件内部机制](/en/plugins/architecture) — 深入的架构和功能模型

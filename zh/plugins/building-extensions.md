---
title: "构建扩展"
summary: "创建 OpenClaw 渠道和提供商扩展的分步指南"
read_when:
  - You want to create a new OpenClaw plugin or extension
  - You need to understand the plugin SDK import patterns
  - You are adding a new channel or provider to OpenClaw
---

# 构建扩展

本指南将从头开始介绍如何创建 OpenClaw 扩展。扩展可以添加渠道、模型提供商、工具或其他功能。

## 先决条件

- 已克隆 OpenClaw 仓库并安装了依赖项 (`pnpm install`)
- 熟悉 TypeScript (ESM)

## 扩展结构

每个扩展都位于 `extensions/<name>/` 下并遵循以下布局：

```
extensions/my-channel/
├── package.json          # npm metadata + openclaw config
├── index.ts              # Entry point (defineChannelPluginEntry)
├── setup-entry.ts        # Setup wizard (optional)
├── api.ts                # Public contract barrel (optional)
├── runtime-api.ts        # Internal runtime barrel (optional)
└── src/
    ├── channel.ts        # Channel adapter implementation
    ├── runtime.ts        # Runtime wiring
    └── *.test.ts         # Colocated tests
```

## 步骤 1：创建包

创建 `extensions/my-channel/package.json`：

```json
{
  "name": "@openclaw/my-channel",
  "version": "2026.1.1",
  "description": "OpenClaw My Channel plugin",
  "type": "module",
  "dependencies": {},
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (plugin)",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Short description of the channel.",
      "order": 80
    },
    "install": {
      "npmSpec": "@openclaw/my-channel",
      "localPath": "extensions/my-channel"
    }
  }
}
```

`openclaw` 字段告诉插件系统您的扩展提供什么。
对于提供商插件，请使用 `providers` 而不是 `channel`。

## 步骤 2：定义入口点

创建 `extensions/my-channel/index.ts`：

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Connects OpenClaw to My Channel",
  plugin: {
    // Channel adapter implementation
  },
});
```

对于提供商插件，请改用 `definePluginEntry`。

## 步骤 3：从专用子路径导入

插件 SDK 公开了许多专用的子路径。请始终从特定的
子路径导入，而不是从单一的整体根目录导入：

```typescript
// Correct: focused subpaths
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
import { createChannelPairingController } from "openclaw/plugin-sdk/channel-pairing";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";
import { resolveChannelGroupRequireMention } from "openclaw/plugin-sdk/channel-policy";

// Wrong: monolithic root (lint will reject this)
import { ... } from "openclaw/plugin-sdk";
```

常用子路径：

| 子路径                              | 用途                    |
| ----------------------------------- | ----------------------- |
| `plugin-sdk/core`                   | 插件入口定义，基本类型  |
| `plugin-sdk/channel-setup`          | 可选设置适配器/向导     |
| `plugin-sdk/channel-pairing`        | 私信配对原语            |
| `plugin-sdk/channel-reply-pipeline` | 前缀 + 正在输入回复连线 |
| `plugin-sdk/channel-config-schema`  | 配置架构构建器          |
| `plugin-sdk/channel-policy`         | 群组/私信策略助手       |
| `plugin-sdk/secret-input`           | 机密输入解析/助手       |
| `plugin-sdk/webhook-ingress`        | Webhook 请求/目标助手   |
| `plugin-sdk/runtime-store`          | 持久化插件存储          |
| `plugin-sdk/allow-from`             | 允许列表解析            |
| `plugin-sdk/reply-payload`          | 消息回复类型            |
| `plugin-sdk/provider-onboard`       | 提供商新手引导配置补丁  |
| `plugin-sdk/testing`                | 测试实用工具            |

使用与任务匹配的最窄原语。仅当不存在专用子路径时，才使用 `channel-runtime`
或其他较大的辅助桶。

## 步骤 4：使用本地桶（barrels）进行内部导入

在你的扩展中，创建桶文件用于内部代码共享，而不是通过插件 SDK 导入：

```typescript
// api.ts — public contract for this extension
export { MyChannelConfig } from "./src/config.js";
export { MyChannelRuntime } from "./src/runtime.js";

// runtime-api.ts — internal-only exports (not for production consumers)
export { internalHelper } from "./src/helpers.js";
```

**自导入防护**：切勿在生产文件中通过已发布的 SDK 契约路径反向导入你自己的扩展。应通过 `./api.ts` 或 `./runtime-api.ts` 路由内部导入。SDK 契约仅供外部使用者使用。

## 步骤 5：添加插件清单

在你的扩展根目录中创建 `openclaw.plugin.json`：

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "name": "My Channel Plugin",
  "description": "Connects OpenClaw to My Channel"
}
```

有关完整架构，请参阅 [插件清单](/zh/plugins/manifest)。

## 步骤 6：使用契约测试进行测试

OpenClaw 会对所有已注册的插件运行契约测试。添加扩展后，运行：

```bash
pnpm test:contracts:channels   # channel plugins
pnpm test:contracts:plugins    # provider plugins
```

契约测试会验证你的插件是否符合预期的接口（设置向导、会话绑定、消息处理、组策略等）。

对于单元测试，请从公共测试表面导入测试辅助程序：

```typescript
import { createTestRuntime } from "openclaw/plugin-sdk/testing";
```

## Lint 强制执行

三个脚本强制执行 SDK 边界：

1. **禁止单体根导入** — `openclaw/plugin-sdk` 根会被拒绝
2. **禁止直接 src/ 导入** — 扩展不能直接导入 `../../src/`
3. **禁止自导入** — 扩展不能导入其自己的 `plugin-sdk/<name>` 子路径

在提交之前运行 `pnpm check` 以验证所有边界。

## 检查清单

在提交扩展之前：

- [ ] `package.json` 具有正确的 `openclaw` 元数据
- [ ] 入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`
- [ ] 所有导入都使用聚焦的 `plugin-sdk/<subpath>` 路径
- [ ] 内部导入使用本地桶，而不是 SDK 自导入
- [ ] `openclaw.plugin.json` 清单存在且有效
- [ ] 契约测试通过 (`pnpm test:contracts`)
- [ ] 单元测试作为 `*.test.ts` 放置在一起
- [ ] `pnpm check` 通过（lint + 格式化）
- [ ] 文档页面已创建在 `docs/channels/` 或 `docs/plugins/` 下

import zh from "/components/footer/zh.mdx";

<zh />

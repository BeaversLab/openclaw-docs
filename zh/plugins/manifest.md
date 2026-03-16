---
summary: "插件清单 + JSON Schema 要求（严格配置验证）"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的捆绑包布局，请参阅 [插件捆绑包](/en/plugins/bundles)。

兼容的捆绑包格式使用不同的清单文件：

- Codex 捆绑包：`.codex-plugin/plugin.json`
- Claude 捆绑包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件
  布局
- Cursor 捆绑包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测那些捆绑包布局，但不会根据此处所述的
`openclaw.plugin.json` 架构对它们进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取
捆绑包元数据以及声明的技能根目录、Claude 命令根目录、Claude 捆绑包 `settings.json` 默认值
和支持的挂钩包。

每个原生 OpenClaw 插件 **必须** 在 **插件根目录** 中包含一个
`openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，
**而无需执行插件代码**。缺失或无效的清单将被视为
插件错误，并会阻止配置验证。

查看完整的插件系统指南：[插件](/en/tools/plugin)。

## 必填字段

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

必填键：

- `id` (string)：规范插件 ID。
- `configSchema` (object)：插件配置的 JSON 架构（内联）。

可选键：

- `kind` (string)：插件类型（示例：`"memory"`、`"context-engine"`）。
- `channels` (array)：由此插件注册的渠道 ID（示例：`["matrix"]`）。
- `providers` (array)：由此插件注册的提供商 ID。
- `skills` (array)：要加载的技能目录（相对于插件根目录）。
- `name` (string)：插件的显示名称。
- `description` (string)：简短插件摘要。
- `uiHints` (object)：用于 UI 呈现的配置字段标签/占位符/敏感标志。
- `version` (string)：插件版本（信息性）。

## JSON 架构要求

- **每个插件都必须附带 JSON 架构**，即使它不接受任何配置。
- 可以接受空 schema（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 ID 由
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但清单或 schema 损坏或缺失，
  验证将失败，并且 Doctor 会报告插件错误。
- 如果插件配置存在但插件已**禁用**，配置将被保留，
  并且 Doctor 和日志中将显示**警告**。

## 注意事项

- 原生 OpenClaw 插件**需要**清单，包括本地文件系统加载。
- 运行时仍然会单独加载插件模块；清单仅用于
  发现 + 验证。
- 通过 `plugins.slots.*` 选择独占插件种类。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine`
    选择（默认：内置 `legacy`）。
- 如果您的插件依赖于原生模块，请记录构建步骤和任何
  包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

import zh from "/components/footer/zh.mdx";

<zh />

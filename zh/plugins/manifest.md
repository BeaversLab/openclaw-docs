---
summary: "插件清单 + JSON Schema 要求（严格配置验证）"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

每个插件**必须**在**插件根目录**下附带一个 `openclaw.plugin.json` 文件。
OpenClaw 使用此清单来**在不执行插件代码的情况下**验证配置。缺少或无效的清单将被视为插件错误并阻止
配置验证。
请参阅完整的插件系统指南：[Plugins](/zh/en/tools/plugin)。

查看完整的插件系统指南：[插件](/zh/en/tools/plugin)。

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

- `id` (字符串)：规范插件 ID。
- `configSchema` (对象)：插件配置的 JSON Schema（内联）。

可选键：

- `kind` (字符串)：插件类型（例如：`"memory"`, `"context-engine"`）。
- `channels` (数组)：由此插件注册的通道 ID（例如：`["matrix"]`）。
- `providers` (数组)：由此插件注册的提供程序 ID。
- `skills` (数组)：要加载的技能目录（相对于插件根目录）。
- `name` (字符串)：插件的显示名称。
- `description` (字符串)：简短的插件摘要。
- `uiHints` (对象)：用于 UI 呈现的配置字段标签/占位符/敏感标记。
- `version` (字符串)：插件版本（信息性）。

## JSON Schema 要求

- **每个插件必须提供 JSON Schema**，即使它不接受任何配置。
- 允许使用空 Schema（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读取/写入时验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非该通道 ID 已被声明
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但清单或 Schema 损坏或缺失，
  验证将失败，Doctor 会报告插件错误。
- 如果插件配置存在但插件被**禁用**，该配置将被保留，并且
  Doctor + 日志中会显示**警告**。

## 注

- 清单是**所有插件都必需的**，包括本地文件系统加载的插件。
- 运行时仍会单独加载插件模块；清单仅用于
  发现和验证。
- 互斥的插件类型通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择
    （默认：内置 `legacy`）。
- 如果您的插件依赖于原生模块，请记录构建步骤以及任何
  包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

import zh from '/components/footer/zh.mdx';

<zh />

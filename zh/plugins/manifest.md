---
summary: "插件清单 + JSON schema 要求（严格配置校验）"
read_when:
  - 构建 OpenClaw 插件
  - 需要发布插件配置 schema 或排查插件校验错误
title: "插件清单"
---
# 插件清单（openclaw.plugin.json）

每个插件 **必须** 在 **插件根目录** 提供 `openclaw.plugin.json` 文件。
OpenClaw 使用该清单在 **不执行插件代码** 的情况下校验配置。
缺失或无效的清单会被视为插件错误，并阻断配置校验。

完整插件体系指南参见：[Plugins](/zh/plugin)。

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
- `id`（string）：插件规范 id。
- `configSchema`（object）：插件配置 JSON Schema（内联）。

可选键：
- `kind`（string）：插件类型（例如：`"memory"`）。
- `channels`（array）：此插件注册的频道 id（例如：`["matrix"]`）。
- `providers`（array）：此插件注册的 provider id。
- `skills`（array）：要加载的 skill 目录（相对插件根目录）。
- `name`（string）：插件展示名称。
- `description`（string）：插件简要说明。
- `uiHints`（object）：用于 UI 渲染的配置字段标签/占位/敏感标记。
- `version`（string）：插件版本（信息用途）。

## JSON Schema 要求

- **每个插件必须提供 JSON Schema**，即使不接受任何配置。
- 可使用空 schema（例如 `{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读写时校验，而非运行时。

## 校验行为

- 未知的 `channels.*` 键是 **错误**，除非该频道 id 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 与 `plugins.slots.*`
  必须引用 **可发现** 的插件 id。未知 id 为 **错误**。
- 插件已安装但清单或 schema 破损/缺失时，校验失败，Doctor 报告插件错误。
- 若插件配置存在但插件 **被禁用**，配置会保留，同时在 Doctor + 日志中提示 **warning**。

## 说明

- 清单对 **所有插件** 必须，包括本地文件系统加载的插件。
- 运行时仍会单独加载插件模块；清单仅用于发现 + 校验。
- 若插件依赖原生模块，请在文档中写明构建步骤及包管理器 allowlist 要求（例如 pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

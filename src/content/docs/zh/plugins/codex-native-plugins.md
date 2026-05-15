---
summary: "OpenClaw为 Codex 模式 OpenClaw 代理配置已迁移的本地 Codex 插件"
title: "本地 Codex 插件"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

本地 Codex 插件支持允许 Codex 模式的 OpenClaw 代理在处理 OpenClaw 轮次的同一 Codex 线程内，使用 Codex 应用服务器自身的应用和插件功能。

OpenClaw 不会将 Codex 插件转换为合成 OpenClaw`codex_plugin_*`OpenClaw OpenClaw 动态工具。插件调用保留在本地 Codex 转录中，且 Codex 应用服务器拥有应用支持的 MCP 执行权。

在基础 [Codex harness](/zh/plugins/codex-harness) 正常工作后，使用此页面。

## 要求

- 所选的 OpenClaw 代理运行时必须是本地 Codex harness。
- `plugins.entries.codex.enabled` 必须为 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 true。
- V1 仅支持迁移观察到的源 Codex 主目录中 `openai-curated` 安装的插件。
- 目标 Codex 应用服务器必须能够看到预期的市场、插件和应用清单。

`codexPlugins`OpenAI 对 PI 运行、普通 OpenAI 提供商运行、ACP 对话绑定或其他 harness 无效，因为这些路径不会创建具有本地 `apps` 配置的 Codex 应用服务器线程。

## 快速入门

从源 Codex 主目录预览迁移：

```bash
openclaw migrate codex --dry-run
```

当计划看起来正确时，应用迁移：

```bash
openclaw migrate apply codex --yes
```

迁移会为符合条件的插件写入显式的 `codexPlugins` 条目，并为所选插件调用 Codex 应用服务器 `plugin/install`。典型的迁移配置如下所示：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

更改 `codexPlugins` 后，使用 `/new`、`/reset` 或重启网关，以便未来的 Codex harness 会话使用更新的应用集启动。

## 本地插件设置的工作原理

该集成分为三个独立的状态：

- 已安装：Codex 在目标应用服务器运行时中拥有本地插件包。
- 已启用：OpenClaw 配置愿意使该插件可用于 Codex
  驱动轮次。
- 可访问：Codex 应用服务器确认该插件的应用条目对
  活跃帐户可用，并且可以映射到迁移的插件身份。

迁移是持久化的安装/资格步骤。运行时应用清单是
可访问性检查。Codex 驱动会话设置随后为已启用且可访问的插件应用
计算受限的线程应用配置。

线程应用配置是在 OpenClaw 建立 Codex 驱动会话
或替换过时的 Codex 线程绑定时计算的。它不会在每一轮都重新计算。

## V1 支持边界

V1 是有意限制的：

- 只有在源 Codex
  应用服务器清单中已安装的 `openai-curated` 插件才符合迁移资格。
- 迁移使用 `marketplaceName` 和
  `pluginName` 写入明确的插件身份；它不写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是全局启用开关。
- 没有 `plugins["*"]` 通配符，也没有授予任意
  安装权限的配置键。
- 不支持的市场、缓存的插件包、挂钩和 Codex 配置文件
  会保留在迁移报告中以供人工审查。

## 应用清单和所有权

OpenClaw 通过应用服务器 `app/list` 读取 Codex 应用清单，将其缓存
一小时，并异步刷新过时或缺失的条目。

只有当 OpenClaw 能够通过稳定的所有权将其映射回
迁移的插件时，插件应用才会被公开：

- 来自插件详情的精确应用 ID
- 已知的 MCP 服务器名称
- 唯一的稳定元数据

仅显示名称或所有权不明确的情况将被排除，直到下一次清单
刷新证明所有权为止。

## 线程应用配置

OpenClaw 为 Codex 线程注入受限的 `config.apps` 补丁：
`_default` 被禁用，并且仅启用由已启用迁移插件拥有的应用。

OpenClaw 根据有效的全局或每个插件的 `allow_destructive_actions` 策略设置应用级 OpenClaw`destructive_enabled`，并允许 Codex 强制执行来自其原生应用工具注释的破坏性工具元数据。`_default` 应用配置通过 `open_world_enabled: false` 被禁用。启用的插件应用通过 `open_world_enabled: true`OpenClaw 发出；OpenClaw 不会暴露单独的插件开放世界策略旋钮，也不维护每个插件的破坏性工具名称拒绝列表。

默认情况下会提示插件应用的工具批准模式，因为 OpenClaw 在此同线程路径中没有交互式应用启发 UI。

## 破坏性操作策略

破坏性插件启发默认失败并关闭：

- 全局 `allow_destructive_actions` 默认为 `false`。
- 每个插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- 当策略为 `false`OpenClaw 时，OpenClaw 返回确定性拒绝。
- 当策略为 `true`OpenClaw 时，OpenClaw 仅自动接受它可以映射到批准响应的安全架构，例如布尔值批准字段。
- 缺少插件标识、所有权不明确、缺少轮次 ID、错误的轮次 ID 或不安全的启发架构会直接拒绝而不进行提示。

## 故障排除

**`auth_required`：** 迁移已安装该插件，但其某个应用仍需要身份验证。显式插件条目被写入为禁用状态，直到您重新授权并启用它。

**`marketplace_missing` 或 `plugin_missing`：** 目标 Codex 应用服务器无法看到预期的 `openai-curated` 市场或插件。针对目标运行时重新运行迁移或检查 Codex 应用服务器插件状态。

**`app_inventory_missing` 或 `app_inventory_stale`OpenClaw：** 应用就绪状态来自空缓存或过时缓存。OpenClaw 计划异步刷新并排除插件应用，直到知道所有权和就绪状态。

**`app_ownership_ambiguous`：** 应用清单仅按显示名称匹配，因此该应用未暴露给 Codex 线程。

**配置已更改但代理无法看到插件：** 使用 `/new`、`/reset` 或重启网关。现有的 Codex 线程绑定将保留其启动时的应用配置，直到 OpenClaw 建立新的 harness 会话或替换过期的绑定。

**破坏性操作被拒绝：** 检查全局和每个插件的 `allow_destructive_actions` 值。即使策略为 true，不安全的引导模式和模糊的插件身份仍然会失败（fail closed）。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [配置参考](/zh/gateway/configuration-reference#codex-harness-plugin-config)
- [迁移 CLI](/zh/cli/migrate)

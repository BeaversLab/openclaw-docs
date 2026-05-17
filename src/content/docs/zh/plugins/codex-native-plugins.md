---
summary: "OpenClaw为 Codex 模式 OpenClaw 代理配置已迁移的本机 Codex 插件"
title: "本机 Codex 插件"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

本地 Codex 插件支持允许 Codex 模式的 OpenClaw 代理在处理 OpenClaw 轮次的同一 Codex 线程内，使用 Codex 应用服务器自身的应用和插件功能。

OpenClaw 不会将 Codex 插件转换为合成的 OpenClaw`codex_plugin_*`OpenClaw
OpenClaw 动态工具。插件调用保留在本机 Codex 转录中，并且
Codex 应用服务器拥有应用支持的 MCP 执行。

在基础 [Codex harness](/zh/plugins/codex-harness) 正常工作后，使用此页面。

## 要求

- 所选的 OpenClaw 代理运行时必须是本地 Codex harness。
- `plugins.entries.codex.enabled` 必须为 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 true。
- V1 仅支持迁移观察到的 `openai-curated` 插件，这些插件
  在源 Codex 主目录中是通过源安装的。
- 目标 Codex 应用服务器必须能够看到预期的市场、插件和应用清单。

`codexPlugins`OpenAI 对 PI 运行、普通 OpenAI 提供商运行、ACP
会话绑定或其他 harness 没有影响，因为这些路径不会创建
带有本机 `apps` 配置的 Codex 应用服务器线程。

## 快速入门

从源 Codex 主目录预览迁移：

```bash
openclaw migrate codex --dry-run
```

当您希望迁移在规划本机插件激活之前检查源应用
可访问性时，请使用严格源应用验证：

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

当计划看起来正确时，应用迁移：

```bash
openclaw migrate apply codex --yes
```

迁移会为符合条件的插件写入显式的 `codexPlugins` 条目，并
为选定的插件调用 Codex 应用服务器 `plugin/install`。典型的迁移
配置如下所示：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
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

更改 `codexPlugins` 后，使用 `/new`、`/reset` 或重启网关，以便
未来的 Codex harness 会话使用更新后的应用集启动。

## 本机插件设置的工作原理

该集成具有三个独立的状态：

- 已安装：Codex 在目标应用服务器运行时中拥有本地插件包。
- 已启用：OpenClaw 配置愿意使插件可用于 Codex
  harness 轮次。
- 可访问：Codex 应用服务器确认插件的应用条目
  可用于活动帐户，并且可以映射到迁移的插件身份。

迁移是持久的安装/资格步骤。在规划期间，OpenClaw 会读取源 Codex OpenClaw`plugin/read` 详细信息，并检查源 Codex 应用服务器帐户响应是否为 ChatGPT 订阅帐户。非 ChatGPT 或缺少帐户响应将使用 `codex_subscription_required` 跳过应用支持的插件。默认情况下，迁移不调用源 `app/list`；通过帐户门控的应用支持的源插件会在没有源应用可访问性验证的情况下进行规划，并且帐户查找传输故障将使用 `codex_account_unavailable` 跳过。使用 `--verify-plugin-apps` 时，迁移会获取新的源 `app/list` 快照，并要求每个拥有的应用在规划原生激活之前都存在、已启用且可访问。在该模式下，帐户查找传输故障将深入到源应用清单门控。运行时应用清单是迁移后的目标会话可访问性检查。Codex harness 会话设置随后为已启用且可访问的插件应用计算限制性线程应用配置。

当 OpenClaw 建立 Codex harness 会话或替换过时的 Codex 线程绑定时，会计算线程应用配置。它不会在每个回合中重新计算。

## V1 支持边界

V1 刻意范围较窄：

- 只有已安装在源 Codex 应用服务器清单中的 `openai-curated` 插件才符合迁移条件。
- 应用支持的源插件必须通过迁移时订阅门控。`--verify-plugin-apps` 增加了源应用清单门控。受订阅门控的帐户，以及在验证模式下无法访问、已禁用、缺失的源应用或源应用清单刷新故障，将作为跳过的手动项目报告，而不是已启用的配置条目。不可读的插件详细信息在源应用清单门控之前被跳过。
- 迁移使用 `marketplaceName` 和 `pluginName` 写入显式插件标识；它不写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是全局启用开关。
- 不存在 `plugins["*"]` 通配符，也不存在授予任意安装权限的配置密钥。
- 不支持的 marketplace、缓存的插件包、钩子和 Codex 配置文件会保留在迁移报告中以供人工审查。

## 应用清单和所有权

OpenClaw 通过应用服务器 `app/list` 读取 Codex 应用清单，将其缓存一小时，并异步刷新陈旧或缺失的条目。该缓存仅存在于内存中；重启 CLI 或网关会将其丢弃，OpenClaw 会在下一次 `app/list` 读取时重建它。

迁移和运行时使用单独的缓存密钥：

- 源迁移验证使用源 Codex 主目录和源应用服务器启动选项。此操作仅在设置 `--verify-plugin-apps` 时运行，并且它会强制对该规划运行进行一次全新的源 `app/list` 遍历。
- 目标运行时设置在构建 Codex 线程应用配置时，会使用目标代理的 Codex 应用服务器身份。插件激活会使该目标缓存密钥失效，然后在 `plugin/install` 后强制刷新它。

仅当 OpenClaw 能够通过稳定所有权将其映射回已迁移的插件时，才会公开该插件应用：

- 来自插件详情的精确应用 ID
- 已知的 MCP 服务器名称
- 唯一的稳定元数据

仅显示名称或所有权不明确的应用会被排除，直到下一次清单刷新证明其所有权。

## 线程应用配置

OpenClaw 会为 Codex 线程注入一个限制性 `config.apps` 补丁：`_default` 被禁用，并且仅启用由已启用的已迁移插件拥有的应用。

OpenClaw 根据有效的全局或每个插件 `allow_destructive_actions` 策略设置应用级别的 OpenClaw`destructive_enabled`，并允许 Codex 强制执行来自其原生应用工具注释的破坏性工具元数据。`_default` 应用配置通过 `open_world_enabled: false` 禁用。已启用的插件应用通过 `open_world_enabled: true`OpenClaw 发出；OpenClaw 不公开单独的插件开放世界策略旋钮，也不维护每个插件的破坏性工具名称拒绝列表。

对于插件应用，工具批准模式默认为自动，以便非破坏性读取工具可以在没有同一线程批准 UI 的情况下运行。破坏性工具仍受每个应用的 `destructive_enabled` 策略控制。

## 破坏性操作策略

对于已迁移的 Codex 插件，默认允许破坏性插件诱导（elicitations），而不安全的架构和模糊的所有权仍然会失败（fail closed）：

- 全局 `allow_destructive_actions` 默认为 `true`。
- 每个插件的 `allow_destructive_actions` 会覆盖该插件的全局策略。
- 当策略为 `false`OpenClaw 时，OpenClaw 返回确定的拒绝。
- 当策略为 `true`OpenClaw 时，OpenClaw 仅自动接受可以映射到批准响应的安全架构，例如布尔批准字段。
- 缺少插件身份、所有权模糊、缺少轮次 id、错误的轮次 id 或不安全的诱导架构会直接拒绝而不是提示。

## 故障排除

**`auth_required`：** 迁移已安装插件，但其某个应用仍需要身份验证。显式插件条目将被写入为禁用状态，直到您重新授权并启用它。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：**
迁移未安装插件，因为在设置 `--verify-plugin-apps` 时，源 Codex 应用清单未显示所有拥有的应用都存在、已启用且可访问。请在 Codex 中重新授权或启用该应用，然后使用 `--verify-plugin-apps` 重新运行迁移。

**`app_inventory_unavailable`：** 由于请求了严格的源应用验证，并且源 Codex 应用清单刷新失败，迁移未安装插件。请修复源 Codex 应用服务器的访问权限，或者如果您接受更快的基于账户限制的计划，请在不使用 `--verify-plugin-apps` 的情况下重试。

**`codex_subscription_required`：** 由于源 Codex 应用服务器账户未使用 ChatGPT 订阅账户登录，迁移未安装支持的应用插件。请使用订阅身份验证登录 Codex 应用，然后重新运行迁移。

**`codex_account_unavailable`：** 由于无法读取源 Codex 应用服务器账户，迁移未安装支持的应用插件。请修复源 Codex 应用服务器的身份验证，或者如果您希望在账户查找失败时让源应用清单决定资格，请使用 `--verify-plugin-apps` 重新运行。

**`marketplace_missing` 或 `plugin_missing`：** 目标 Codex 应用服务器看不到预期的 `openai-curated` 市场或插件。请针对目标运行时重新运行迁移，或检查 Codex 应用服务器插件状态。

**`app_inventory_missing` 或 `app_inventory_stale`OpenClaw：** 应用就绪状态来自空的或过时的缓存。OpenClaw 会安排异步刷新，并在知道所有权和就绪状态之前排除插件应用。

**`app_ownership_ambiguous`：** 应用清单仅按显示名称匹配，因此该应用未暴露给 Codex 线程。

**配置已更改但代理看不到插件：** 请使用 `/new`、`/reset`OpenClaw 或重启网关。现有的 Codex 线程绑定会保留它们开始时使用的应用配置，直到 OpenClaw 建立新的 harness 会话或替换过时的绑定。

**破坏性操作被拒绝：** 请检查全局和每个插件的 `allow_destructive_actions` 值。即使策略为 true，不安全的诱导模式和不明确的插件身份仍然会以失败关闭。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [Codex harness 运行时](/zh/plugins/codex-harness-runtime)
- [配置参考](/zh/gateway/configuration-reference#codex-harness-plugin-config)
- [迁移 CLI](CLI/en/cli/migrate)

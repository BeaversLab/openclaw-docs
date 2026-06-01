---
summary: "为 Codex 模式的 OpenClaw 代理配置已迁移的原生 Codex 插件"
title: "原生 Codex 插件"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

本地 Codex 插件支持允许 Codex 模式的 OpenClaw 代理在处理 OpenClaw 轮次的同一 Codex 线程内，使用 Codex 应用服务器自身的应用和插件功能。

OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*`
OpenClaw 动态工具。插件调用保留在原生 Codex 转录中，且
Codex 应用服务器拥有由应用支持的 MCP 执行。

在基础的 [Codex harness](/zh/plugins/codex-harness) 正常工作后，请使用此页面。

## 要求

- 所选的 OpenClaw 代理运行时必须是本地 Codex harness。
- `plugins.entries.codex.enabled` 必须为 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 true。
- V1 仅支持迁移时观察到在源 Codex 主目录中
  源安装的 `openai-curated` 插件。
- 目标 Codex 应用服务器必须能够看到预期的市场、插件和应用清单。

`codexPlugins`OpenClawOpenAI 对 OpenClaw 运行、普通 OpenAI 提供商运行、ACP
对话绑定或其他线束没有影响，因为这些路径不会创建具有原生 `apps` 配置的 Codex 应用服务器线程。

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

迁移会为符合条件的插件写入显式的 `codexPlugins` 条目，并针对所选插件
调用 Codex 应用服务器的 `plugin/install`。典型的迁移
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

更改 `codexPlugins` 后，新的 Codex 会话会自动获取
更新的应用集。使用 `/new` 或 `/reset` 来刷新当前会话。
插件启用或禁用的更改不需要重启网关。

## 从聊天中管理插件

当您想要从操作 Codex harness 的同一聊天中检查或更改
配置的原生 Codex 插件时，请使用 `/codex plugins`：

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` 是 `/codex plugins list` 的别名。列表输出显示
配置的插件密钥、开/关状态、Codex 插件名称，以及来自
`plugins.entries.codex.config.codexPlugins.plugins` 的市场。

`enable` 和 `disable` 仅写入 OpenClaw 配置位于
`~/.openclaw/openclaw.json`；它们不编辑 `~/.codex/config.toml` 或安装
新的 Codex 插件。只有所有者或具有 `operator.admin` 范围的网关客户端可以更改插件状态。

启用已配置的插件还会打开全局 `codexPlugins.enabled` 开关。如果插件被写入为禁用状态，因为
迁移返回了 `auth_required`，请在 OpenClaw 中启用之前，在 Codex 中重新授权该应用。

## 原生插件设置的工作原理

该集成有三个独立的状态：

- 已安装：Codex 在目标应用服务器运行时中拥有本地插件包。
- 已启用：OpenClaw 配置愿意使插件可用于 Codex
  驱动轮次。
- 可访问：Codex 应用服务器确认插件的应用条目可用于
  活跃帐户，并且可以映射到迁移的插件身份。

迁移是持久的安装/资格步骤。在规划期间，OpenClaw
读取源 Codex `plugin/read` 详细信息并检查源 Codex
应用服务器帐户响应是否为 ChatGPT 订阅帐户。非 ChatGPT 或
缺失的帐户响应会使用 `codex_subscription_required` 跳过应用支持的插件。
默认情况下，迁移不会调用源 `app/list`；通过帐户网关的应用支持的源插件是在没有
源应用可访问性验证的情况下规划的，并且帐户查找传输
失败会使用 `codex_account_unavailable` 跳过。使用 `--verify-plugin-apps` 时，
迁移会获取一个新的源 `app/list` 快照，并要求每个拥有的应用
在规划原生激活之前都存在、已启用且可访问。在
该模式下，帐户查找传输失败会落入源
应用清单网关。运行时应用清单是迁移后的目标会话可访问性
检查。Codex 驱动会话设置随后为已启用且可访问的插件应用计算限制性
线程应用配置。

当 OpenClaw 建立 Codex harness 会话或替换过时的 Codex 线程绑定时，会计算线程应用配置。它不会在每一轮重新计算，因此 OpenClaw`/codex plugins enable` 和 `/codex plugins disable` 会影响新的 Codex 对话。当当前对话应采用更新的应用集时，请使用 `/new` 或 `/reset`。

## V1 支持边界

V1 的范围故意受限：

- 只有源 Codex 应用服务器清单中已安装的 `openai-curated` 插件才符合迁移条件。
- 支持应用的源插件必须通过迁移时的订阅检查。`--verify-plugin-apps` 增加了源应用清单检查。在验证模式下，受订阅限制的帐户以及无法访问、已禁用、缺失的源应用或源应用清单刷新失败将被报告为跳过的手动项，而不是已启用的配置条目。不可读的插件详情会在源应用清单检查之前被跳过。
- 迁移会使用 `marketplaceName` 和 `pluginName` 写入显式插件标识；它不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是全局启用开关。
- 没有 `plugins["*"]` 通配符，也没有授予任意安装权限的配置键。
- 不支持的市场、缓存的插件包、钩子和 Codex 配置文件会保留在迁移报告中以供人工审查。

## 应用清单和所有权

OpenClaw 通过应用服务器 OpenClaw`app/list`CLIOpenClaw 读取 Codex 应用清单，将其缓存一小时，并异步刷新陈旧或缺失的条目。该缓存仅存在于内存中；重启 CLI 或网关会将其丢弃，OpenClaw 会在下一次 `app/list` 读取时重建它。

迁移和运行时使用单独的缓存键：

- 源迁移验证使用源 Codex 主目录和源应用服务器启动选项。这仅在设置 `--verify-plugin-apps` 时运行，并且它会强制对该规划运行进行全新的源 `app/list` 遍历。
- 目标运行时设置在构建 Codex 线程应用配置时，会使用目标代理的 Codex 应用服务器身份。插件激活会使该目标缓存键失效，并在 `plugin/install` 之后强制刷新它。

只有当 OpenClaw 能够通过稳定的所有权将其映射回迁移的插件时，插件应用才会被公开：

- 来自插件详情的精确应用 ID
- 已知的 MCP 服务器名称
- 唯一的稳定元数据

仅显示名称或所有权不明确的应用会被排除，直到下一次清单刷新证明其所有权。

## 线程应用配置

OpenClaw 会为 Codex 线程注入一个限制性的 `config.apps` 补丁：`_default` 被禁用，且仅启用由已启用迁移插件拥有的应用。

OpenClaw 根据有效的全局或按插件 `allow_destructive_actions` 策略设置应用级 `destructive_enabled`，并允许 Codex 从其原生应用工具注释中执行破坏性工具元数据。`_default` 应用配置被 `open_world_enabled: false` 禁用。已启用的插件应用使用 `open_world_enabled: true` 发出；OpenClaw 不公开单独的插件开放世界策略旋钮，也不维护按插件的破坏性工具名称拒绝列表。

默认情况下，插件应用的工具批准模式为自动，以便非破坏性读取工具可以在没有同一线程批准 UI 的情况下运行。破坏性工具仍受每个应用的 `destructive_enabled` 策略控制。

## 破坏性操作策略

默认情况下，允许迁移的 Codex 插件进行破坏性插件诱导，而不安全的架构和不明确的所有权仍会失败并关闭：

- 全局 `allow_destructive_actions` 默认为 `true`。
- 按插件 `allow_destructive_actions` 会覆盖该插件的全局策略。
- 当策略为 `false` 时，OpenClaw 返回确定性拒绝。
- 当策略为 `true` 时，OpenClaw 仅自动接受它可以映射到批准响应的安全架构，例如布尔批准字段。
- 插件标识缺失、所有权不明确、轮次 ID 缺失、轮次 ID 错误或诱导性架构不安全时，会拒绝而不是提示。

## 故障排除

**`auth_required`：** 迁移已安装该插件，但其某个应用仍需身份验证。在您重新授权并启用它之前，显式插件条目将被写入为已禁用状态。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：**
由于设置 `--verify-plugin-apps` 时，源 Codex 应用清单未显示所有已拥有的应用均存在、已启用且可访问，迁移未安装该插件。请在 Codex 中重新授权或启用该应用，然后使用 `--verify-plugin-apps` 重新运行迁移。

**`app_inventory_unavailable`：** 由于请求了严格的源应用验证，并且源 Codex 应用清单刷新失败，迁移未安装该插件。修复源 Codex 应用服务器访问权限，或者如果您接受更快的账户限制计划，请不使用 `--verify-plugin-apps` 重试。

**`codex_subscription_required`：** 由于源 Codex 应用服务器账户未使用 ChatGPT 订阅账户登录，迁移未安装该应用支持的插件。使用订阅身份登录 Codex 应用，然后重新运行迁移。

**`codex_account_unavailable`：** 由于无法读取源 Codex 应用服务器账户，迁移未安装该应用支持的插件。修复源 Codex 应用服务器身份验证，或者如果您希望在账户查找失败时由源应用清单决定资格，请使用 `--verify-plugin-apps` 重新运行。

**`marketplace_missing` 或 `plugin_missing`：** 目标 Codex 应用服务器无法看到预期的 `openai-curated` 市场或插件。针对目标运行时重新运行迁移，或检查 Codex 应用服务器插件状态。

**`app_inventory_missing` 或 `app_inventory_stale`：** 应用就绪状态来自空缓存或过期缓存。OpenClaw 会计划一次异步刷新，并排除插件应用，直到确定所有权和就绪状态。

**`app_ownership_ambiguous`：** 应用清单仅按显示名称匹配，因此该应用未暴露给 Codex 线程。

**配置已更改，但代理无法看到该插件：** 使用 `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`。现有的
Codex 线程绑定将保留其启动时的应用配置，直到 OpenClaw
建立新的 harness 会话或替换过时的绑定。

**破坏性操作被拒绝：** 检查全局和特定插件的
`allow_destructive_actions` 值。即使策略为 true，不安全的诱导模式
和模糊的插件标识仍将以失败关闭。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness reference](/zh/plugins/codex-harness-reference)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Configuration reference](/zh/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrate CLI](/zh/cli/migrate)

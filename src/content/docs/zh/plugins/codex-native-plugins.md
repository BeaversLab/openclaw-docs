---
summary: "OpenClaw为 Codex 模式 OpenClaw 代理配置迁移的本地 Codex 插件"
title: "本地 Codex 插件"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are configuring first-party Codex plugin marketplaces
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

本地 Codex 插件支持允许 Codex 模式的 OpenClaw 代理在处理 OpenClaw 轮次的同一 Codex 线程内，使用 Codex 应用服务器自身的应用和插件功能。

OpenClaw 不会将 Codex 插件转换为合成的 OpenClaw`codex_plugin_*`OpenClaw
OpenClaw 动态工具。插件调用保留在本地的 Codex 记录中，
且 Codex 应用服务器拥有应用支持的 MCP 执行权。

在基础 [Codex harness](/zh/plugins/codex-harness) 正常工作后，使用此页面。

## 要求

- 所选的 OpenClaw 代理运行时必须是本地 Codex harness。
- `plugins.entries.codex.enabled` 必须为 true。
- `plugins.entries.codex.config.codexPlugins.enabled` 必须为 true。
- V1 支持第一方 Codex 插件市场：`openai-curated`、
  `openai-bundled` 和 `openai-primary-runtime`。
- 迁移仅会自动发现在源 Codex 主目录中观察到的
  源安装 `openai-curated` 插件。
- 目标 Codex 应用服务器必须能够看到预期的市场、
  插件和应用清单。

`codexPlugins`OpenClawOpenAI 对 OpenClaw 运行、普通 OpenAI 提供商运行、ACP
会话绑定或其他工具没有影响，因为这些路径不会创建
具有本地 `apps` 配置的 Codex 应用服务器线程。

OpenAI 端的 Codex 访问权限、应用可用性以及工作区应用/插件控制
来自已登录的 Codex 账户。有关 OpenAI 账户和管理员模型，
请参阅 [将 Codex 与您的 ChatGPT 计划一起使用](OpenAIOpenAIhttps://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 快速入门

从源 Codex 主目录预览迁移：

```bash
openclaw migrate codex --dry-run
```

当您希望迁移在规划本地插件激活之前检查源应用
可访问性时，请使用严格的源应用验证：

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

当计划看起来正确时，应用迁移：

```bash
openclaw migrate apply codex --yes
```

迁移会为符合条件的精选插件写入显式 `codexPlugins` 条目，并为选定插件调用 Codex 应用服务器 `plugin/install`。当目标应用服务器清单暴露了这些插件应用时，显式配置也可以引用 Codex 的捆绑式和主运行时第一方市场。典型的迁移配置如下所示：

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

更改 `codexPlugins` 后，新的 Codex 对话会自动获取更新的应用集。使用 `/new` 或 `/reset` 来刷新当前对话。启用或禁用插件的更改不需要重启网关。

## 手动第一方市场条目

迁移会为符合条件的源安装插件写入 `openai-curated` 条目。对于位于 Codex 捆绑式或主运行时市场中的第一方插件，请在确认目标 Codex 应用服务器清单暴露了该市场和插件后，添加显式条目。

对每个第一方市场使用相同的配置结构：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            plugins: {
              chrome: {
                enabled: true,
                marketplaceName: "openai-bundled",
                pluginName: "chrome",
              },
              documents: {
                enabled: true,
                marketplaceName: "openai-primary-runtime",
                pluginName: "documents",
              },
            },
          },
        },
      },
    },
  },
}
```

`plugins` 下的键是 OpenClaw 的本地配置键。`pluginName` 和 `marketplaceName` 必须与 Codex 应用服务器清单完全匹配。如果插件未在 `/codex plugins list` 或 Codex 应用诊断中列出，OpenClaw 会保留该条目的配置，但无法将其应用暴露给 Codex 轮次。

## 从聊天管理插件

当您想要从操作 Codex 框架所在的同一聊天中检查或更改配置的原生 Codex 插件时，请使用 `/codex plugins`：

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` 是 `/codex plugins list` 的别名。列表输出显示来自 `plugins.entries.codex.config.codexPlugins.plugins` 的已配置插件键、开/关状态、Codex 插件名称和市场。

`enable` 和 `disable` 仅写入 OpenClaw 在 `~/.openclaw/openclaw.json` 的配置；它们不编辑 `~/.codex/config.toml` 也不安装新的 Codex 插件。只有所有者或具有 `operator.admin` 作用域的网关客户端才能更改插件状态。

启用已配置的插件也会打开全局
`codexPlugins.enabled` 开关。如果插件因迁移返回 `auth_required`
而被写入为禁用状态，请在 OpenClaw 中启用它之前在 Codex 中重新授权该应用。

## 原生插件设置的工作原理

该集成具有三个独立的状态：

- 已安装：Codex 在目标应用服务器运行时中拥有本地插件包。
- 已启用：OpenClaw 配置愿意将该插件提供给 Codex
  马具轮次。
- 可访问：Codex 应用服务器确认插件的应用条目可供
  活跃账户使用，并且可以映射到已迁移的插件身份。

迁移是持久的安装/资格步骤。在规划期间，OpenClaw
读取源 Codex `plugin/read` 详细信息，并检查源 Codex
应用服务器账户响应是否为 ChatGPT 订阅账户。非 ChatGPT 或
缺失的账户响应会跳过带有 `codex_subscription_required` 的应用支持插件。默认情况下，迁移
不会调用源 `app/list`；通过账户门控的应用支持源插件
在没有源应用可访问性验证的情况下进行规划，并且账户查找传输
故障会以 `codex_account_unavailable` 跳过。使用 `--verify-plugin-apps` 时，
迁移会获取全新的源 `app/list` 快照，并要求每个拥有的应用
在规划本机激活之前必须存在、已启用且可访问。在该
模式下，账户查找传输故障会通过到源
应用清单门控。运行时应用清单是迁移后的目标会话可访问性
检查。Codex 马具会话设置随后为已启用且可访问的插件应用
计算限制性的线程应用配置。

线程应用配置是在 OpenClaw 建立 Codex 马具会话
或替换过时的 Codex 线程绑定时计算的。它不会在每一轮中重新计算，因此
`/codex plugins enable` 和 `/codex plugins disable` 会影响新的 Codex
对话。当当前对话应采用
更新的应用集时，请使用 `/new` 或 `/reset`。

## V1 支持边界

V1 的范围有意设得很窄：

- 运行时配置接受 `openai-curated`、`openai-bundled` 和
  `openai-primary-runtime` 插件标识。
- 只有先前已安装在源 Codex 应用服务器清单中的 `openai-curated` 插件才符合自动迁移的资格。
- 支持应用的源插件必须通过迁移时的订阅关卡。
  `--verify-plugin-apps` 增加了源应用清单关卡。在验证模式下，受订阅限制的
  账户加上无法访问、已停用、缺失的源应用或源应用清单刷新失败，将被报告为跳过的手动
  项，而不是已启用的配置项。无法读取的插件详情会在源应用清单关卡之前被跳过。
- 迁移会使用 `marketplaceName` 和
  `pluginName` 写入明确的插件标识；它不会写入本地 `marketplacePath` 缓存路径。
- `codexPlugins.enabled` 是全局启用开关。
- 没有 `plugins["*"]` 通配符，也没有授予任意安装权限的配置键。
- 不支持的市场、缓存的插件包、钩子和 Codex 配置文件
  将保留在迁移报告中供手动审查。捆绑的和
  主运行时的第一方插件仍可通过明确的 `codexPlugins` 配置手动添加。

## 应用清单和所有权

OpenClaw 通过应用服务器 OpenClaw`app/list`CLIOpenClaw 读取 Codex 应用清单，将其缓存
一小时，并异步刷新过期或缺失的条目。缓存仅存在于内存中；重启 CLI 或网关会清除缓存，OpenClaw 将在下一次读取 `app/list` 时重建它。

迁移和运行时使用单独的缓存键：

- 源迁移验证使用源 Codex 主目录和源应用服务器
  启动选项。这仅在设置 `--verify-plugin-apps` 时运行，并且它
  会强制对该次规划运行进行一次全新的源 `app/list` 遍历。
- 目标运行时设置在构建 Codex 线程应用配置时，使用目标代理的 Codex 应用服务器身份。插件激活会使该目标缓存键失效，然后在 `plugin/install` 之后强制刷新它。

仅当 OpenClaw 能够通过稳定的所有权将其映射回已迁移的插件时，插件应用才会被公开：

- 来自插件详情的确切应用 ID
- 已知的 MCP 服务器名称
- 唯一的稳定元数据

仅显示名称或所有权不明确的内容将被排除，直到下一次清单刷新证明所有权。

## 线程应用配置

OpenClaw 为 Codex 线程注入了一个限制性的 `config.apps` 补丁：`_default` 被禁用，并且仅启用由已启用的已迁移插件拥有的应用。

OpenClaw 根据有效的全局或按插件 `allow_destructive_actions` 策略设置应用级 `destructive_enabled`，并让 Codex 从其原生应用工具注释强制执行破坏性工具元数据。`_default` 应用配置被 `open_world_enabled: false` 禁用。已启用的插件应用以 `open_world_enabled: true` 发出；OpenClaw 不公开单独的插件开放世界策略旋钮，也不维护按插件的破坏性工具名称拒绝列表。

默认情况下，插件应用的工具批准模式为自动，以便非破坏性读取工具可以在没有同一线程批准 UI 的情况下运行。破坏性工具仍受每个应用的 `destructive_enabled` 策略控制。

## 破坏性操作策略

默认情况下，对于已迁移的 Codex 插件，允许破坏性插件诱导，而不安全的模式和所有权不明确的情况仍然会失败关闭：

- 全局 `allow_destructive_actions` 默认为 `true`。
- 按插件 `allow_destructive_actions` 会覆盖该插件的全局策略。
- 当策略为 `false` 时，OpenClaw 返回确定性拒绝。
- 当策略为 `true` 时，OpenClaw 仅自动接受可以映射到批准响应的安全模式，例如布尔批准字段。
- 缺少插件身份、所有权不明确、缺少轮次 ID、轮次 ID 错误或诱引模式不安全，将导致拒绝而不是提示。

## 故障排除

**`auth_required`：** 迁移已安装插件，但其某个应用仍需身份验证。显式插件条目被写入为禁用状态，直到您重新授权并启用它。

**`app_inaccessible`、`app_disabled` 或 `app_missing`：** 迁移未安装插件，因为在设置 `--verify-plugin-apps` 时，源 Codex 应用清单未显示所有拥有的应用均存在、已启用且可访问。请在 Codex 中重新授权或启用应用，然后使用 `--verify-plugin-apps` 重新运行迁移。

**`app_inventory_unavailable`：** 迁移未安装插件，因为请求了严格的源应用验证，但源 Codex 应用清单刷新失败。请修复源 Codex 应用服务器访问权限，或者在您接受更快的帐户限制计划时，在不使用 `--verify-plugin-apps` 的情况下重试。

**`codex_subscription_required`：** 迁移未安装应用支持的插件，因为源 Codex 应用服务器帐户未使用 ChatGPT 订阅帐户登录。请使用订阅身份验证登录 Codex 应用，然后重新运行迁移。

**`codex_account_unavailable`：** 迁移未安装应用支持的插件，因为无法读取源 Codex 应用服务器帐户。请修复源 Codex 应用服务器身份验证，或者如果您希望在帐户查找失败时由源应用清单决定资格，请使用 `--verify-plugin-apps` 重新运行。

**`marketplace_missing` 或 `plugin_missing`：** 目标 Codex 应用服务器无法看到预期的第一方市场或插件。请针对目标运行时重新运行迁移，检查 Codex 应用服务器插件状态，或确认显式 `marketplaceName` 是 `openai-curated`、`openai-bundled` 或 `openai-primary-runtime` 之一。

**`app_inventory_missing` 或 `app_inventory_stale`：** 应用就绪状态来自空缓存或过时缓存。OpenClaw 计划异步刷新，并在知晓所有权和就绪状态之前排除插件应用。

**`app_ownership_ambiguous`：** 应用清单仅按显示名称匹配，因此该应用未暴露给 Codex 线程。

**配置已更改但代理无法看到插件：** 使用 `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`。现有的
Codex 线程绑定会保留其启动时的应用配置，直到 OpenClaw
建立新的 harness 会话或替换过时的绑定。

**破坏性操作被拒绝：** 检查全局和每个插件的
`allow_destructive_actions` 值。即使策略为 true，不安全的诱导
模式和模糊的插件标识仍然会失败关闭。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness reference](/zh/plugins/codex-harness-reference)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [Configuration reference](/zh/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrate CLI](/zh/cli/migrate)

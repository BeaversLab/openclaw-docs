---
summary: "OpenClaw为 Codex 模式下的 OpenClaw 代理设置 Codex Computer Use"
title: "Codex Computer Use"
read_when:
  - You want Codex-mode OpenClaw agents to use Codex Computer Use
  - You are deciding between Codex Computer Use, PeekabooBridge, and direct cua-driver MCP
  - You are deciding between Codex Computer Use and a direct cua-driver MCP setup
  - You are configuring computerUse for the bundled Codex plugin
  - You are troubleshooting /codex computer-use status or install
---

Computer Use 是一个用于本地桌面控制的 Codex 原生 MCP 插件。OpenClaw
不提供桌面应用程序，不自行执行桌面操作，也不绕过
Codex 权限。捆绑的 OpenClaw`codex` 插件仅准备 Codex 应用服务器：
它启用 Codex 插件支持，查找或安装配置的 Codex
Computer Use 插件，检查 `computer-use` MCP 服务器是否可用，
然后让 Codex 在 Codex 模式回合中拥有原生 MCP 工具调用。

当 OpenClaw 已在使用原生 Codex harness 时，请使用此页面。有关
运行时设置本身，请参阅 [Codex harness](OpenClaw/en/plugins/codex-harness)。

## OpenClaw.app 和 Peekaboo

OpenClaw.app 的 Peekaboo 集成与 Codex Computer Use 是分开的。该 macOS 应用可以托管 PeekabooBridge 套接字，以便 `peekaboo` CLI 可以重用应用的本地辅助功能和屏幕录制权限，用于 Peekaboo 自己的自动化工具。该桥接器不安装或代理 Codex Computer Use，且 Codex Computer Use 也不通过 PeekabooBridge 套接字进行调用。

当您希望 Peekaboo.app 充当 OpenClaw Peekaboo 自动化的权限感知主机时，请使用 [CLI bridge](/zh/platforms/mac/peekaboo)。当 Codex 模式的 OpenClaw 代理应在回合开始前拥有 Codex 原生的 `computer-use` MCP 插件时，请使用此页面。

## iOS app

iOS 应用与 Codex Computer Use 是分开的。它不安装或代理 Codex iOS`computer-use`iOSOpenClaw MCP 服务器，也不是桌面控制后端。相反，iOS 应用作为 OpenClaw 节点连接，并通过节点命令（例如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*`）暴露移动端功能。

当您希望代理通过网关驱动 iPhone 节点时，请使用 [iOS](iOS/en/platforms/iosmacOS)。当 Codex 模式代理应通过 Codex 原生 Computer Use 插件控制本地 macOS 桌面时，请使用此页面。

## 直接 cua-driver MCP

Codex Computer Use 并不是暴露桌面控制的唯一方式。如果您希望 OpenClaw 托管的运行时直接调用 TryCua 的驱动程序，请通过 OpenClaw 的 MCP 注册表使用上游 `cua-driver mcp` 服务器，而不是 Codex 专用的市场流程。

安装 `cua-driver` 后，您可以向其询问 OpenClaw 命令：

```bash
cua-driver mcp-config --client openclaw
```

或者自行注册 stdio 服务器：

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

这种方式保持了上游 MCP 工具表面（工具 surface）的完整性，包括驱动程序架构和结构化的 MCP 响应。当您希望 CUA 驱动程序作为普通的 OpenClaw MCP 服务器可用时，请使用此方法。当 Codex 应用服务器应负责插件安装、MCP 重载以及 Codex 模式轮次内的原生工具调用时，请使用本页上的 Codex Computer Use 设置。

CUA 的驱动程序特定于 macOS，并且仍然需要其应用程序提示的本地 macOS 权限，例如辅助功能和屏幕录制。OpenClaw 不会安装 macOSmacOSOpenClaw`cua-driver`、授予这些权限或绕过上游驱动程序的安全模型。

## 快速设置

当 Codex 模式轮次必须在线程开始前拥有可用的 Computer Use 时，请设置 `plugins.entries.codex.config.computerUse`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

使用此配置，OpenClaw 会在每次 Codex 模式轮次之前检查 Codex 应用服务器。如果 Computer Use 缺失但 Codex 应用服务器已发现可安装的 marketplace，OpenClaw 会请求 Codex 应用服务器安装或重新启用该插件并重新加载 MCP 服务器。在 macOS 上，当没有注册匹配的 marketplace 且存在标准 Codex 应用包时，OpenClaw 还会尝试在失败前从 `/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` 注册捆绑的 Codex marketplace。如果设置仍无法使 MCP 服务器可用，则该轮次将在线程开始之前失败。

更改 Computer Use 配置后，请在受影响的聊天中使用 `/new` 或 `/reset`，然后再测试现有的 Codex 线程是否已启动。

## 命令

在提供 `codex` 插件命令界面的任何聊天界面中使用 `/codex computer-use` 命令。这些是 OpenClaw 聊天/运行时命令，而非 `openclaw codex ...` CLI 子命令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 是只读的。它不添加市场来源、安装插件或启用 Codex 插件支持。

`install` 启用 Codex 应用服务器插件支持，可选择添加配置的市场来源，通过 Codex 应用服务器安装或重新启用配置的插件，重新加载 MCP 服务器，并验证 MCP 服务器是否暴露了工具。

## Marketplace choices

OpenClaw 使用与 Codex 自身公开的相同的应用服务器 API。市场字段选择 Codex 应该在哪里查找 OpenClawAPI`computer-use`。

| 字段                | 使用时机                                    | 安装支持                                     |
| ------------------- | ------------------------------------------- | -------------------------------------------- |
| 无市场字段          | 您希望 Codex 应用服务器使用它已知的市场。   | 是，当应用服务器返回本地市场时。             |
| `marketplaceSource` | 您有一个应用服务器可以添加的 Codex 市场源。 | 是，用于显式 `/codex computer-use install`。 |
| `marketplacePath`   | 您已经知道主机上的本地市场文件路径。        | 是，用于显式安装和轮次开始时的自动安装。     |
| `marketplaceName`   | 您希望按名称选择一个已注册的市场。          | 仅当所选市场具有本地路径时为是。             |

新的 Codex 环境可能需要短暂的时间来初始化其官方市场。在安装过程中，OpenClaw 会轮询 OpenClaw`plugin/list` 最多 `marketplaceDiscoveryTimeoutMs` 毫秒。默认值为 60 秒。

如果多个已知市场包含 Computer Use，OpenClaw 会优先选择 OpenClaw`openai-bundled`，然后是 `openai-curated`，最后是 `local`。未知的模糊匹配将失败关闭，并要求您设置 `marketplaceName` 或 `marketplacePath`。

## 捆绑的 macOS 市场

最近的 Codex 桌面版本在此处捆绑了 Computer Use：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

当 `computerUse.autoInstall` 为 true 且没有注册包含 `computer-use`OpenClaw 的市场时，OpenClaw 会尝试自动添加标准的捆绑市场根目录：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

您也可以在 Shell 中使用 Codex 显式注册它：

```bash
codex plugin marketplace add /Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

如果您使用非标准的 Codex 应用程序路径，请将 `computerUse.marketplacePath` 设置为本地市场文件路径，或运行一次 `/codex computer-use install --source <marketplace-source>`。

## 远程目录限制

Codex app-server 可以列出并读取仅限远程的目录条目，但目前不支持远程 `plugin/install`。这意味着 `marketplaceName` 可以选择仅限远程的市场进行状态检查，但安装和重新启用仍需要通过 `marketplaceSource` 或 `marketplacePath` 使用本地市场。

如果状态显示插件在远程 Codex 市场中可用但不支持远程安装，请使用本地源或路径运行安装：

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## 配置参考

| 字段                            | 默认值         | 含义                                                          |
| ------------------------------- | -------------- | ------------------------------------------------------------- |
| `enabled`                       | 推断           | 需要计算机使用。当设置了另一个计算机使用字段时，默认为 true。 |
| `autoInstall`                   | false          | 在回合开始时从已发现的市场安装或重新启用。                    |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安装等待 Codex 应用服务器市场发现的时间。                     |
| `marketplaceSource`             | 未设置         | 传递给 Codex 应用服务器 `marketplace/add` 的源字符串。        |
| `marketplacePath`               | 未设置         | 包含该插件的本地 Codex 市场文件路径。                         |
| `marketplaceName`               | 未设置         | 要选择的已注册 Codex 市场名称。                               |
| `pluginName`                    | `computer-use` | Codex 市场插件名称。                                          |
| `mcpServerName`                 | `computer-use` | 已安装插件暴露的 MCP 服务器名称。                             |

轮次开始时的自动安装有意拒绝已配置的 `marketplaceSource`
值。添加新源是一项显式的设置操作，因此请
使用 `/codex computer-use install --source <marketplace-source>` 一次，然后让
`autoInstall` 处理从已发现的本地市场进行的未来重新启用。
轮次开始时的自动安装可以使用已配置的 `marketplacePath`，因为该值
已经是主机上的本地路径。

## OpenClaw 检查的内容

OpenClaw 在内部报告稳定的设置原因，并为聊天格式化面向用户
的状态：

| 原因                         | 含义                                             | 下一步                                          |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| `disabled`                   | `computerUse.enabled` 解析为 false。             | 设置 `enabled` 或其他 Computer Use 字段。       |
| `marketplace_missing`        | 没有可用的匹配市场。                             | 配置源、路径或市场名称。                        |
| `plugin_not_installed`       | Marketplace 存在，但插件未安装。                 | 运行 install 或启用 `autoInstall`。             |
| `plugin_disabled`            | 插件已安装，但在 Codex 配置中被禁用。            | 运行 install 以重新启用它。                     |
| `remote_install_unsupported` | 选定的 marketplace 仅限远程。                    | 使用 `marketplaceSource` 或 `marketplacePath`。 |
| `mcp_missing`                | 插件已启用，但 MCP 服务器不可用。                | 检查 Codex Computer Use 和操作系统权限。        |
| `ready`                      | 插件和 MCP 工具可用。                            | 开始 Codex 模式回合。                           |
| `check_failed`               | 在状态检查期间，Codex app-server 请求失败。      | 检查 app-server 连接和日志。                    |
| `auto_install_blocked`       | Turn-start setup would need to add a new source. | Run explicit install first.                     |

The chat output includes the plugin state, MCP server state, marketplace, tools
when available, and the specific message for the failing setup step.

## macOS 权限

Computer Use 是特定于 macOS 的。Codex 拥有的 MCP 服务器在检查或控制应用之前，可能需要本地操作系统
权限。如果 OpenClaw 显示 Computer Use
已安装，但 MCP 服务器不可用，请首先验证 Codex 端的 Computer
Use 设置：

- Codex app-server 正在运行于应该发生桌面控制的同一主机上。
- Computer Use 插件已在 Codex 配置中启用。
- `computer-use` MCP 服务器出现在 Codex app-server MCP 状态中。
- macOS 已授予桌面控制应用所需的权限。
- 当前主机会话可以访问正在控制的桌面。

当 `computerUse.enabled` 为 true 时，OpenClaw 会故意以失败关闭。A
Codex-mode turn should not silently proceed without the native desktop tools
that the config required.

## 故障排除

**Status says not installed.** Run `/codex computer-use install`. If the
marketplace is not discovered, pass `--source` or `--marketplace-path`.

**Status says installed but disabled.** Run `/codex computer-use install` again.
Codex app-server install writes the plugin config back to enabled.

**Status says remote install is unsupported.** Use a local marketplace source or
path. Remote-only catalog entries can be inspected but not installed through the
current app-server API.

**Status says the MCP server is unavailable.** Re-run install once so MCP
servers reload. If it remains unavailable, fix the Codex Computer Use app,
Codex app-server MCP status, or macOS permissions.

**Status or a probe times out on `computer-use.list_apps`.** The plugin and MCP
server are present, but the local Computer Use bridge did not answer. Quit or
restart Codex Computer Use, relaunch Codex Desktop if needed, then retry in a
fresh OpenClaw 会话.

**Computer Use 工具显示 `Native hook relay unavailable`。** Codex 原生工具挂钩无法通过本地桥接或 OpenClaw 回退连接到活跃的 Gateway(网关) 中继。使用 `/new` 或 `/reset` 启动一个新的 OpenClaw 会话。如果问题持续存在，请重启网关，以便清除旧的应用服务器线程和挂钩注册，然后重试。

**轮次开始自动安装拒绝某个源。** 这是有意为之。请先使用显式的 `/codex computer-use install --source <marketplace-source>` 添加该源，然后未来的轮次开始自动安装才能使用已发现的本地市场。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Peekaboo bridge](/zh/platforms/mac/peekaboo)
- [iOS app](/zh/platforms/ios)

---
summary: "OpenClaw安装、配置和管理 OpenClaw 插件"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
sidebarTitle: "入门指南"
doc-schema-version: 1
---

插件通过通道、模型提供商、代理工具包、工具、技能、语音、实时转录、语音、媒体理解、生成、Web 获取、Web 搜索以及其他运行时功能扩展 OpenClaw。

当您想要安装插件、重启 Gateway(网关)、验证运行时是否已加载它以及排查常见设置故障时，请使用此页面。有关仅包含命令的示例，请参阅[管理插件](<Gateway(网关)/en/plugins/manage-plugins>)。有关捆绑、官方外部和仅源代码插件的完整生成清单，请参阅[插件清单](/zh/plugins/plugin-inventory)。

## 要求

在安装插件之前，请确保您具备：

- OpenClaw 的检出或安装，并且可使用 OpenClaw`openclaw`CLI CLI
- 对所选源的网络访问权限，例如 ClawHub、npm 或 git 主机
- 该插件设置文档中指定的任何特定于插件的凭据、配置密钥或操作系统工具
- 为您的通道提供服务的 Gateway(网关) 的重新加载或重启权限

## 快速开始

<Steps>
  <Step title="查找插件"ClawHub>
    在 [ClawHub](/zh/clawhub) 上搜索公共插件包：

    ```bash
    openclaw plugins search "calendar"
    ```ClawHubnpm

    ClawHub 是社区插件的主要发现界面。在启动切换期间，除非它们匹配官方插件 ID，否则普通的裸包规范仍从 npm 安装。匹配捆绑插件的原始 `@openclaw/*`OpenClaw 包规范使用当前 OpenClaw 构建中的捆绑副本。当您需要特定来源时，请使用显式前缀。

  </Step>

  <Step title="安装插件">
    ```bash
    # From ClawHub.
    openclaw plugins install clawhub:<package>

    # From npm.
    openclaw plugins install npm:<package>

    # From git.
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # From a local development checkout.
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    请像运行代码一样对待插件安装。当您需要可复现的生产环境安装时，请首选固定版本。

  </Step>

  <Step title="配置并启用它">
    在 `plugins.entries.<id>.config` 下配置特定于插件的设置。
    当插件尚未启用时启用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果您的配置使用了限制性的 `plugins.allow` 列表，则已安装的插件 ID 必须出现在该列表中，插件才能加载。
    `openclaw plugins install` 会将已安装的 ID 添加到现有的 `plugins.allow` 列表中，并从 `plugins.deny` 中删除相同的 ID，以便显式安装可以在重启后加载。

  </Step>

  <Step title="Gateway(网关)让 Gateway(网关) 重新加载"Gateway(网关)Gateway(网关)OpenClawGateway(网关)Gateway(网关)>
    安装、更新或卸载插件代码需要 Gateway(网关)
    重启。当受管理的 Gateway(网关) 已运行且启用了配置重新加载
    功能时，OpenClaw 会检测到更改的插件安装记录并自动重启
    Gateway(网关)。如果 Gateway(网关) 不受管理或重新加载被禁用，
    请手动重启它：

    ```bash
    openclaw gateway restart
    ```

    启用和禁用操作会更新配置并刷新冷注册表。
    对于实时运行时表面，运行时检查仍然是最清晰的验证路径。

  </Step>

  <Step title="验证运行时注册">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    当您需要证明已注册的工具、钩子、服务、Gateway(网关) 方法或插件拥有的 CLI 命令时，请使用 `--runtime`Gateway(网关)CLI。普通的 `inspect` 是冷清单和注册表检查。

  </Step>
</Steps>

## 配置

### 选择安装源

| 来源        | 使用场景                                               | 示例                                                           |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| ClawHub     | 您需要 OpenClaw 原生的发现、扫描、版本元数据和安装提示 | `openclaw plugins install clawhub:<package>`                   |
| npm         | 您需要直接的 npm 注册表或 dist-tag 工作流              | `openclaw plugins install npm:<package>`                       |
| git         | 您需要来自存储库的分支、标签或提交                     | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本地路径    | 您正在同一台机器上开发或测试插件                       | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | 您正在安装一个 Claude 兼容的 marketplace 插件          | `openclaw plugins install <plugin> --marketplace <source>`     |

纯包规范具有特殊的兼容性行为。如果纯名称匹配捆绑插件 ID，OpenClaw 将使用该捆绑源。如果它匹配官方外部插件 ID，OpenClaw 将使用官方包目录。其他普通的纯包规范将在启动切换期间通过 npm 安装。匹配捆绑插件的原始 OpenClawOpenClawnpm`@openclaw/*`npm 包规范也会在 npm 回退之前解析为捆绑副本。当您有意需要外部 npm 包而不是镜像拥有的捆绑副本时，请使用 `npm:@openclaw/<plugin>@<version>`npm。当您需要确定性的源选择时，请使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:`。有关完整的命令约定，请参阅 [`openclaw plugins`](/zh/cli/plugins#install)。

对于 npm 安装，未固定的包规范和 npm`@latest`OpenClawnpm 将选择声明与此 OpenClaw 构建兼容的最新稳定包。如果 npm 当前的最新版本声明了较新的 `openclaw.compat.pluginApi` 或 `openclaw.install.minHostVersion`OpenClaw，OpenClaw 将扫描较旧的稳定包版本，并安装符合要求的最新版本。确切的版本和显式的渠道标签（例如 `@beta`）将保持固定为所选包，并在不兼容时失败。

### 配置插件策略

常见的插件配置结构如下：

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

关键策略规则：

- `plugins.enabled: false` 禁用所有插件并跳过插件发现/加载工作。在此处于活动状态时，过时的插件引用将不起作用；如果您想删除过时的 ID，请在运行 doctor 清理之前重新启用插件。
- `plugins.deny` 优先于允许和每个插件的启用设置。
- `plugins.allow` 是一个独占允许列表。允许列表之外的插件拥有的工具将保持不可用状态，即使 `tools.allow` 包含 `"*"`。
- `plugins.entries.<id>.enabled: false` 禁用一个插件，同时保留其配置。
- `plugins.load.paths` 添加显式的本地插件文件或目录。
- 默认禁用工作区来源的插件；在使用本地工作区代码之前，请显式启用或将其加入允许列表。
- 除非配置显式覆盖，否则打包插件遵循其内置的默认开启/默认关闭元数据。
- `plugins.slots.<slot>` 为排他性类别（如内存和上下文引擎）选择一个插件。插槽选择通过计为显式激活来强制启用所选插件用于该插槽；即使该插件原本是可选加入的，也可以加载。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然会阻止它。
- 当配置指定了打包可选插件拥有的某个界面（如提供商/模型引用、渠道配置、CLI 后端或代理工具运行时）时，该插件可以自动激活。
- OpenAI 系列 Codex 路由将提供商和运行时插件边界分开：`openai-codex/*` 是旧版 OpenAI-提供商配置，而打包的 `codex` 插件拥有标准 `openai/*` 代理引用、显式 `agentRuntime.id: "codex"` 和旧版 `codex/*` 引用的 Codex 应用服务器运行时。

当配置验证报告过时的插件 ID、允许列表/工具不匹配或旧版打包插件路径时，请运行 `openclaw doctor` 或 `openclaw doctor --fix`。

## 了解插件格式

OpenClaw 识别两种插件格式：

| 格式               | 加载方式                                                    | 使用场景                                     |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| 原生 OpenClaw 插件 | `openclaw.plugin.json` 加载到进程中的运行时模块             | 您正在安装或构建特定于 OpenClaw 的运行时功能 |
| 兼容包             | 映射到 OpenClaw 插件清单的 Codex、Claude 或 Cursor 插件布局 | 您正在重用兼容的技能、命令、钩子或包元数据   |

两种格式均出现在 `openclaw plugins list`、`openclaw plugins inspect`、
`openclaw plugins enable` 和 `openclaw plugins disable` 中。请参阅
[Plugin bundles](/zh/plugins/bundles) 了解插件包兼容性边界，并参阅
[Building plugins](/zh/plugins/building-plugins) 了解原生插件创作。

## Plugin hooks

插件可以在运行时注册 hooks，但有两种具有不同用途的不同 API。

- 通过 `api.on(...)` 使用类型化 hooks 来处理运行时生命周期 hooks。这是
  中间件、策略、消息重写、提示词塑造和工具控制的首选接口。
- 仅当您希望参与 [Hooks](/zh/automation/hooks) 中描述的内部
  hook 系统时，才使用 `api.registerHook(...)`。这主要用于粗粒度
  命令/生命周期副作用以及与现有 HOOK 风格自动化的兼容性。

快速规则：

- 如果处理程序需要优先级、合并语义或阻止/取消行为，请使用
  类型化插件 hooks。
- 如果处理程序只是对 `command:new`、`command:reset`、`message:sent`
  或类似的粗粒度事件做出反应，则 `api.registerHook(...)` 也是可以的。

插件管理的内部 hooks 会带有
`plugin:<id>` 出现在 `openclaw hooks list` 中。您无法通过 `openclaw hooks` 启用或禁用它们；
请改为启用或禁用插件。

## 验证活动 Gateway(网关)

`openclaw plugins list` 和纯 `openclaw plugins inspect`Gateway(网关) 读取冷配置、
清单和注册表状态。它们不能证明正在运行的 Gateway(网关)
已导入相同的插件代码。

当插件显示已安装但实时聊天流量未使用它时：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

在插件安装、更新和卸载更改更改插件源后，托管的 Gateway(网关)会自动重启。在 VPS 或容器安装上，请
确保任何手动重启目标是实际提供
通道服务的 `openclaw gateway run` 子进程，而不仅仅是包装器或监督程序。

## 故障排除

| 症状                                                | 检查                                                                                                                      | 修复                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 插件出现在 `plugins list` 中，但运行时 hooks 未运行 | 使用 `openclaw plugins inspect <id> --runtime --json` 并通过 `gateway status --deep --require-rpc` 确认活动 Gateway(网关) | 在安装、更新、配置或源更改后重启活动 Gateway(网关)                          |
| 出现重复的渠道或工具所有权诊断信息                  | 运行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 检查每个可疑的插件，并比较渠道/工具所有权       | 禁用其中一个所有者，删除陈旧的安装，或使用清单 `preferOver` 进行有意的替换  |
| 配置指出缺少某个插件                                | 检查 [插件清单](/zh/plugins/plugin-inventory) 以确定其是捆绑插件、官方外部插件还是仅源代码插件                            | 安装外部包，启用捆绑插件，或删除陈旧的配置                                  |
| 安装期间配置无效                                    | 阅读验证消息，当它指向陈旧的插件状态时，运行 `openclaw doctor --fix`                                                      | Doctor 可以通过禁用条目并删除无效有效负载来隔离无效的插件配置               |
| 插件路径因可疑的所有权或权限而被阻止                | 检查配置错误之前的诊断信息                                                                                                | 修复文件系统所有权/权限，然后运行 `openclaw plugins registry --refresh`     |
| `OPENCLAW_NIX_MODE=1` 阻止生命周期命令              | 确认安装由 Nix 管理                                                                                                       | 在 Nix 源中更改插件选择，而不是使用插件变更器命令                           |
| 运行时依赖导入失败                                  | 检查插件是通过 npm/git/ClawHub 安装的还是从本地路径加载的                                                                 | 运行 `openclaw plugins update <id>`，重新安装源，或者自行安装本地插件依赖项 |

当陈旧的插件配置仍然命名一个不再可发现的渠道插件时，
Gateway(网关) 启动会跳过该插件支持的渠道，而不是阻止所有
其他渠道。运行 `openclaw doctor --fix` 以删除陈旧的插件和渠道
条目。没有陈旧插件证据的未知渠道键仍然无法
通过验证，以便拼写错误保持可见。

若要进行有意的渠道替换，首选插件应使用旧版或较低优先级的插件 ID 声明 `channelConfigs.<channel-id>.preferOver`OpenClaw。如果两个插件都被显式启用，OpenClaw 将保留该请求并报告重复的渠道或工具诊断信息，而不是静默选择一个所有者。

如果已安装的软件包报告它 `requires compiled runtime output for TypeScript entry ...`，则说明该软件包发布时未包含 OpenClaw 运行时所需的 JavaScript 文件。请在发布者提供编译后的 JavaScript 后更新或重新安装，或者在此之前禁用/卸载该插件。

### 插件路径所有权被阻止

如果插件诊断信息显示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
且随后的配置验证显示 `plugin present but blocked`OpenClawOpenClaw，则说明 OpenClaw 发现插件文件的所有者与加载它们的进程所属的 Unix 用户不同。请保留插件配置不变；修复文件系统所有权，或以拥有状态目录的同一用户身份运行 OpenClaw。

对于 Docker 安装，官方镜像以 Docker`node` (uid `1000`OpenClaw) 身份运行，因此主机绑定挂载的 OpenClaw 配置和工作区目录通常应由 uid `1000` 拥有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您有意以 root 身份运行 OpenClaw，请将托管插件根目录修复为 root 所有权：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修复所有权后，请重新运行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以使持久化的插件注册表与修复后的文件相匹配。

### 插件工具设置缓慢

如果代理轮次在准备工具时似乎停滞，请启用跟踪日志并检查插件工具工厂计时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要列出了总工厂时间和最慢的插件工具工厂，包括插件 ID、声明的工具名称、结果形状以及工具是否为可选。当单个工厂耗时至少 1 秒或插件工具工厂准备总耗时至少 5 秒时，慢速行将提升为警告。

OpenClaw 会缓存成功的插件工具工厂结果，以便在具有相同有效请求上下文的重复解析中使用。缓存键包括有效的运行时配置、工作区、代理/会话 ID、沙箱策略、浏览器设置、交付上下文、请求者身份和所有权状态，因此依赖于这些受信任字段的工厂会在上下文更改时重新运行。如果时间仍然很长，插件可能是在返回其工具定义之前执行了昂贵的工作。

如果一个插件占用了大部分时间，请检查其运行时注册信息：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖项加载移至工具执行路径之后，而不是在工具工厂内部执行。

有关依赖项根、包元数据验证、注册表记录、启动重新加载行为和旧版清理的信息，请参阅[插件依赖项解析](/zh/plugins/dependency-resolution)。

## 相关

- [管理插件](/zh/plugins/manage-plugins) - 列表、安装、更新、卸载和发布的命令示例
- [`openclaw plugins`](/zh/cli/pluginsCLI) - 完整的 CLI 参考
- [插件清单](/zh/plugins/plugin-inventory) - 生成的捆绑和外部插件列表
- [插件参考](/zh/plugins/reference) - 生成的每个插件的参考页面
- [社区插件](/zh/plugins/communityClawHub) - ClawHub 发现和文档 PR 策略
- [插件依赖项解析](/zh/plugins/dependency-resolution) - 安装根、注册表记录和运行时边界
- [构建插件](/zh/plugins/building-plugins) - 本机插件创作指南
- [插件 SDK 概述](/zh/plugins/sdk-overviewAPI) - 运行时注册、挂钩和 API 字段
- [插件清单](/zh/plugins/manifest) - 清单和包元数据

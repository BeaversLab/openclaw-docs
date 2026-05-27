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

当您想要安装插件、重启 Gateway(网关)、验证运行时是否已加载它以及排查常见的设置失败时，请使用此页面。有关仅命令行的示例，请参阅[管理插件](<Gateway(网关)/en/plugins/manage-plugins>)。有关捆绑的、官方外部的和仅源代码插件的完整生成清单，请参阅[插件清单](/zh/plugins/plugin-inventory)。

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

    ClawHub 是社区插件的主要发现界面。在启动切换期间，普通的裸包规格仍从 npm 安装。当您需要特定源时，请使用显式前缀。

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

  <Step title="配置并启用">
    在 `plugins.entries.<id>.config` 下配置特定于插件的设置。
    当插件尚未启用时启用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果您的配置使用了限制性的 `plugins.allow` 列表，则安装的插件
    ID 必须出现在其中，插件才能加载。
    `openclaw plugins install` 会将安装的 ID 添加到现有的
    `plugins.allow` 列表中，并从 `plugins.deny` 中移除相同的 ID，以便
    在重启后加载显式安装的插件。

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

    当您需要证明已注册的工具、钩子、服务、
    Gateway(网关) 方法或插件拥有的 CLI 命令时，请使用 `--runtime`Gateway(网关)CLI。普通的 `inspect` 是冷
    清单和注册表检查。

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

裸包规格具有特殊的兼容性行为。如果裸名称匹配捆绑的插件 ID，OpenClaw 将使用该捆绑源。如果它匹配官方外部插件 ID，OpenClaw 将使用官方包目录。其他普通的裸包规格在启动切换期间通过 npm 安装。当您需要确定性源选择时，请使用 OpenClawOpenClawnpm`clawhub:`、`npm:`、`git:` 或 `npm-pack:`。有关完整的命令约定，请参阅 [`openclaw plugins`](/zh/cli/plugins#install)。

### 配置插件策略

通用插件配置结构如下：

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

- `plugins.enabled: false` 禁用所有插件并跳过插件发现/加载工作。在此激活期间，过时的插件引用将不起作用；如果您希望删除过时的 ID，请在运行 doctor 清理之前重新启用插件。
- `plugins.deny` 优先于允许列表和每个插件的启用设置。
- `plugins.allow` 是一个排他性允许列表。允许列表之外的插件拥有的工具将保持不可用，即使 `tools.allow` 包含 `"*"`。
- `plugins.entries.<id>.enabled: false` 禁用单个插件，同时保留其配置。
- `plugins.load.paths` 添加显式的本地插件文件或目录。
- 工作区源插件默认处于禁用状态；在使用本地工作区代码之前，请显式启用或将其添加到允许列表中。
- 捆绑插件遵循其内置的默认开启/默认关闭元数据，除非配置明确覆盖它们。
- `plugins.slots.<slot>` 为内存和上下文引擎等排他性类别选择一个插件。插槽选择通过算作显式激活来强制启用所选插件的该插槽；即使它本应是选择加入（opt-in）的，它也可以加载。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然会阻止它。
- 打包的可选插件可以在配置指定其拥有的某个界面时自动激活，例如提供商/模型引用、渠道配置、CLI 后端或代理工具运行时。
- OpenAI 系列 Codex 路由将提供商和运行时插件边界分开：`openai-codex/*` 是旧版 OpenAI 提供商配置，而打包的 `codex` 插件拥有用于标准 `openai/*` 代理引用、显式 `agentRuntime.id: "codex"` 和旧版 `codex/*` 引用的 Codex 应用服务器运行时。

当配置验证报告过时的插件 ID、允许列表/工具不匹配或旧版打包插件路径时，运行 `openclaw doctor` 或 `openclaw doctor --fix`。

## 了解插件格式

OpenClaw 识别两种插件格式：

| 格式               | 加载方式                                                    | 使用场景                                   |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------ |
| 原生 OpenClaw 插件 | `openclaw.plugin.json` 加载到进程中的运行时模块             | 您正在安装或构建 OpenClaw 特定的运行时功能 |
| 兼容包             | 映射到 OpenClaw 插件清单的 Codex、Claude 或 Cursor 插件布局 | 您正在重用兼容的技能、命令、钩子或包元数据 |

两种格式均出现在 `openclaw plugins list`、`openclaw plugins inspect`、
`openclaw plugins enable` 和 `openclaw plugins disable` 中。有关捆绑包兼容性边界，请参阅
[插件捆绑包](/zh/plugins/bundles)；有关原生插件创作，请参阅
[构建插件](/zh/plugins/building-plugins)。

## 插件钩子

插件可以在运行时注册钩子，但存在两种具有不同功能的不同 API。

- 通过 `api.on(...)` 使用类型化钩子来处理运行时生命周期钩子。这是用于中间件、策略、消息重写、提示整形和工具控制的首选界面。
- 仅当您希望参与 [Hooks](/zh/automation/hooks) 中描述的内部 hook 系统时，才使用 `api.registerHook(...)`。这主要用于粗粒度的命令/生命周期副作用以及与现有 HOOK 风格的自动化兼容。

快速规则：

- 如果处理程序需要优先级、合并语义或阻止/取消行为，请使用类型化的 plugin hooks。
- 如果处理程序仅对 `command:new`、`command:reset`、`message:sent` 或类似的粗粒度事件做出反应，则 `api.registerHook(...)` 就足够了。

插件管理的内部 hooks 会带有 `plugin:<id>` 出现在 `openclaw hooks list` 中。您无法通过 `openclaw hooks` 启用或禁用它们；请改为启用或禁用插件。

## 验证活动 Gateway

`openclaw plugins list` 和普通的 `openclaw plugins inspect`Gateway(网关) 读取冷配置、清单和注册表状态。它们不能证明正在运行的 Gateway 已导入相同的插件代码。

当插件显示为已安装但实时聊天流量未使用它时：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

Managed Gateways 在更改插件源的安装、更新和卸载操作后会自动重启。在 VPS 或容器安装中，请确保任何手动重启都针对为您的渠道提供服务的实际 `openclaw gateway run` 子进程，而不仅仅是包装器或监视程序。

## 故障排除

| 症状                                              | 检查                                                                                                                               | 修复                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 插件出现在 `plugins list` 中但运行时 hooks 未运行 | 使用 `openclaw plugins inspect <id> --runtime --json`Gateway(网关) 并通过 `gateway status --deep --require-rpc` 确认活动的 Gateway | 在安装、更新、配置或源代码更改后，重启活动的 Gateway                      |
| 出现重复的渠道或工具所有权诊断信息                | 运行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 检查每个可疑的插件，并比较渠道/工具所有权                | 禁用一个所有者，删除过时的安装，或使用清单 `preferOver` 进行有意的替换    |
| 配置显示插件缺失                                  | 检查 [Plugin inventory](/zh/plugins/plugin-inventory) 以确定它是捆绑的、官方外部的还是仅限源代码的                                 | 安装外部包，启用捆绑插件，或删除过时的配置                                |
| 安装期间配置无效                                  | 阅读验证消息，并在其指向过时的插件状态时运行 `openclaw doctor --fix`                                                               | Doctor 可以通过禁用条目并删除无效的有效负载来隔离无效的插件配置           |
| 由于可疑的所有权或权限，插件路径被阻止            | 检查配置错误之前的诊断信息                                                                                                         | 修复文件系统所有权/权限，然后运行 `openclaw plugins registry --refresh`   |
| `OPENCLAW_NIX_MODE=1` 阻止生命周期命令            | 确认安装是否由 Nix 管理                                                                                                            | 在 Nix 源中更改插件选择，而不是使用插件变更器命令                         |
| 运行时依赖项导入失败                              | 检查插件是通过 npm/git/ClawHub 安装的还是从本地路径加载的                                                                          | 运行 `openclaw plugins update <id>`，重新安装源，或自行安装本地插件依赖项 |

当过时的插件配置仍然命名一个不再可发现的渠道插件时，
Gateway(网关) 启动会跳过该插件支持的渠道，而不是阻止所有
其他渠道。运行 `openclaw doctor --fix` 以删除过时的插件和渠道
条目。没有过时插件证据的未知渠道键仍然无法通过
验证，以便拼写错误保持可见。

对于有意的渠道替换，首选插件应使用
旧版或较低优先级的插件 ID 声明
`channelConfigs.<channel-id>.preferOver`。如果两个插件都被显式启用，OpenClaw 将保留该请求
并报告重复的渠道或工具诊断，而不是静默选择
一个所有者。

如果已安装的包报告它 `requires compiled runtime output for
TypeScript entry ...`，则该包是在没有 JavaScript 文件的情况下发布的，
而这些文件是 OpenClaw 运行时所需要的。在发布者提供
编译的 JavaScript 后更新或重新安装，或者在此之前禁用/卸载该插件。

### 受阻的插件路径所有权

如果插件诊断显示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
并且配置验证紧接着显示 `plugin present but blocked`，则说明 OpenClaw 发现
插件文件的所有 Unix 用户与正在加载它们的进程不同。请保留插件配置不变；修复文件系统所有权或
以拥有状态目录的同一用户身份运行 OpenClaw。

对于 Docker 安装，官方镜像以 `node` (uid `1000`) 身份运行，因此
主机挂载的 OpenClaw 配置和工作区目录通常应
归 uid `1000` 所有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您有意以 root 身份运行 OpenClaw，请将受管插件根目录修复为
root 所有权：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修复所有权后，请重新运行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持久化的插件注册表与
修复后的文件相匹配。

### 插件工具设置缓慢

如果在准备工具时代理轮次似乎停滞，请启用跟踪日志并
检查插件工具工厂计时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要列出了总工厂时间和最慢的插件工具工厂，
包括插件 ID、声明的工具名称、结果形状以及工具是否
可选。当单个工厂耗时至少 1 秒或插件工具工厂总准备耗时至少 5 秒时，慢速行将被提升为警告。

OpenClaw 会缓存成功的插件工具工厂结果，以便针对
相同有效请求上下文进行重复解析。缓存键包括有效
运行时配置、工作区、代理/会话 ID、沙箱策略、浏览器设置、
交付上下文、请求者身份和所有权状态，因此当上下文更改时，
依赖于这些受信任字段的工厂会被重新运行。如果计时
仍然很高，则插件可能在返回其工具
定义之前正在进行昂贵的工作。

如果某个插件占据了大部分时间，请检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将
昂贵的依赖项加载移至工具执行路径之后，而不是在
工具工厂内部进行。

关于依赖根、包元数据验证、注册表记录、启动
重载行为和遗留清理，请参阅
[Plugin dependency resolution](/zh/plugins/dependency-resolution)。

## 相关

- [Manage plugins](/zh/plugins/manage-plugins) - 列表、安装、更新、卸载和发布的命令示例
- [`openclaw plugins`](/zh/cli/plugins) - 完整的 CLI 参考
- [Plugin inventory](/zh/plugins/plugin-inventory) - 生成的捆绑和外部插件列表
- [Plugin reference](/zh/plugins/reference) - 生成的单个插件参考页面
- [Community plugins](/zh/plugins/community) - ClawHub 发现和文档 PR 策略
- [Plugin dependency resolution](/zh/plugins/dependency-resolution) - 安装根、注册表记录和运行时边界
- [Building plugins](/zh/plugins/building-plugins) - 原生插件创作指南
- [Plugin SDK overview](/zh/plugins/sdk-overview) - 运行时注册、挂钩和 API 字段
- [Plugin manifest](/zh/plugins/manifest) - 清单和包元数据

---
summary: "`openclaw configure`（交互式配置提示）的 CLI 参考"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "配置"
---

# `openclaw configure`

用于对现有设置进行针对性更改的交互式提示：凭据、设备、代理默认值、网关、渠道、插件、技能和健康检查。

使用 `openclaw onboard` 进行完整的首次运行引导旅程，使用 `openclaw setup` 仅用于基础配置/工作区，以及当您只需要渠道帐户设置时使用 `openclaw channels add`。

<Note>
**模型**部分包含一个用于 `agents.defaults.models` 允许列表（在 `/model` 和模型选择器中显示的内容）的多选。特定于提供程序的设置选项会将其选定的模型合并到现有的允许列表中，而不是替换配置中已有的不相关提供程序。

从 configure 重新运行提供程序身份验证会保留现有的 `agents.defaults.model.primary`，即使提供程序的身份验证步骤返回带有其自己的推荐默认模型的配置补丁。这意味着添加或重新验证 xAI、OpenRouter 或其他提供程序应该使新模型可用，而不会取代您当前的主要模型。当您有意想要更改默认模型时，请使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。

</Note>

当 configure 从提供程序身份验证选择开始时，默认模型和允许列表选择器会自动首选该提供程序。对于成对的提供程序（如 Volcengine 和 BytePlus），同样的偏好也匹配其编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果首选提供程序过滤器会产生空列表，configure 会回退到未过滤的目录，而不是显示空白的选择器。

<Tip>不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。</Tip>

对于网络搜索，`openclaw configure --section web` 允许您选择提供程序
并配置其凭据。某些提供程序还会显示特定于提供程序的
后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY` 并
  让您选择一个 `x_search` 模型。
- **Kimi** 可以询问 Moonshot API 区域（MoonshotAPI`api.moonshot.ai` 对比 `api.moonshot.cn`）以及默认的 Kimi 网络搜索模型。

相关内容：

- Gateway(网关) 配置参考：[配置](<Gateway(网关)/en/gateway/configuration>)
- Config CLI：[Config](CLI/en/cli/config)

## 选项

- `--section <section>`：可重复的部分筛选器

可用部分：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

注意：

- 完整的向导和与 Gateway(网关) 相关的部分会询问 Gateway 运行的位置并更新 Gateway(网关)`gateway.mode`。不包含 `gateway`、`daemon` 或 `health` 的部分筛选器会直接进入请求的设置。
- 在写入本地配置后，当所选的设置路径需要时，configure 会安装所选的可下载插件。远程 Gateway(网关) 配置不会安装本地插件包。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置期间提示输入渠道/房间允许列表。您可以输入名称或 ID；向导会在可能的情况下将名称解析为 ID。
- 如果您运行守护进程安装步骤，令牌认证需要一个令牌，并且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef 但不会将解析后的明文令牌值持久化到主管服务环境元数据中。
- 如果令牌认证需要一个令牌，且配置的令牌 SecretRef 未解析，configure 会阻止守护进程安装，并提供可操作的修复指导。
- 如果配置了 `gateway.auth.token` 和 `gateway.auth.password` 并且未设置 `gateway.auth.mode`，configure 将阻止守护进程安装，直到显式设置模式。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## 相关

- [CLI 参考](CLI/en/cli)
- [配置](/zh/gateway/configuration)

---
summary: "`openclaw configure`（交互式配置提示）的 CLI 参考"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

注意：**模型**部分现在包含一个用于 `agents.defaults.models` 许可列表的多选功能（显示在 `/model` 和模型选择器中）。提供者范围的设置选择将其选定的模型合并到现有的许可列表中，而不是替换配置中已有的不相关提供者。

当配置从提供商身份验证选择开始时，默认模型和允许列表选择器会自动优先选择该提供商。对于 Volcengine/BytePlus 等配对提供商，同样的首选项也匹配其编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果首选提供商筛选会导致空列表，配置将回退到未筛选的目录，而不是显示空白的选择器。

提示：不带子命令的 `openclaw config` 会打开相同的向导。请使用 `openclaw config get|set|unset` 进行非交互式编辑。

对于网络搜索，`openclaw configure --section web` 允许您选择提供商并配置其凭据。某些提供商还会显示特定于提供商的后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，并使用相同的 `XAI_API_KEY`，并允许您选择 `x_search` 模型。
- **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` 与 `api.moonshot.cn`）以及默认的 Kimi 网络搜索模型。

相关：

- Gateway(网关) 配置参考：[Configuration](/zh/gateway/configuration)
- 配置 CLI：[Config](/zh/cli/config)

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

备注：

- 选择 Gateway(网关) 的运行位置总是会更新 `gateway.mode`。如果您只需要这样，可以在没有其他部分的情况下选择“继续”。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置期间提示输入渠道/房间允许列表。您可以输入名称或 ID；向导会在可能的情况下将名称解析为 ID。
- 如果您运行守护进程安装步骤，令牌身份验证需要一个令牌，并且 `gateway.auth.token` 由 SecretRef 管理，则 configure 会验证 SecretRef，但不会将解析后的明文令牌值持久化到监督服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，configure 会阻止守护进程安装并提供可行的修复指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，configure 将阻止守护进程安装，直到明确设置模式。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

---
summary: "`openclaw configure`（交互式配置提示）的 CLI 参考"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "配置"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

<Note>
**模型** 部分包含一个用于 `agents.defaults.models` 白名单的多选框（显示在 `/model` 和模型选择器中）。特定于提供商的设置选项将其选定的模型合并到现有的白名单中，而不是替换配置中已有的不相关提供商。从配置中重新运行提供商身份验证会保留现有的 `agents.defaults.model.primary`。当您有意更改默认模型时，请使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。
</Note>

当配置从提供商身份验证选项开始时，默认模型和白名单选择器会自动首选该提供商。对于像 Volcengine 和 BytePlus 这样的配对提供商，相同的首选项也匹配其编码计划变体（`volcengine-plan/*`，`byteplus-plan/*`）。如果首选提供商过滤器会产生空列表，配置将回退到未过滤的目录，而不是显示空白的选择器。

<Tip>不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。</Tip>

对于网络搜索，`openclaw configure --section web` 允许您选择提供商
并配置其凭据。某些提供商还会显示特定于提供商的
后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY` 并
  让您选择一个 `x_search` 模型。
- **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` 对比
  `api.moonshot.cn`）和默认的 Kimi 网络搜索模型。

相关：

- Gateway(网关) 配置参考：[配置](/zh/gateway/configuration)
- 配置 CLI：[配置](/zh/cli/config)

## 选项

- `--section <section>`：可重复的章节筛选器

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

- 选择 Gateway(网关) 的运行位置总是会更新 `gateway.mode`。如果这就是您所需的全部内容，您可以选择“继续”而无需配置其他部分。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置期间提示输入渠道/房间允许列表。您可以输入名称或 ID；向导会在可能的情况下将名称解析为 ID。
- 如果您运行守护进程安装步骤，令牌认证需要一个令牌，并且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef，但不会将解析后的明文令牌值持久化到 supervisor 服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，configure 会阻止守护进程安装并提供可行的修复指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，configure 将阻止守护进程安装，直到显式设置模式。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## 相关

- [CLI 参考](/zh/cli)
- [配置](/zh/gateway/configuration)

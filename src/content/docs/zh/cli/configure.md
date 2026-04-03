---
summary: "`openclaw configure`（交互式配置提示）的 CLI 参考"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "configure"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

注意：**Model（模型）** 部分现在包含针对 `agents.defaults.models` allowlist（在 `/model` 和模型选择器中显示的内容）的多选功能。

提示：不带子命令运行 `openclaw config` 会打开相同的向导。请使用 `openclaw config get|set|unset` 进行非交互式编辑。

对于网络搜索，`openclaw configure --section web` 让您选择提供商并配置其凭证。如果您选择 **Grok**，configure 还可以显示一个单独的后续步骤，以便使用相同的 `XAI_API_KEY` 启用 `x_search` 并选择 `x_search` 模型。其他网络搜索提供商不会显示该步骤。

相关：

- Gateway(网关) 配置参考：[Configuration](/en/gateway/configuration)
- 配置 CLI：[Config](/en/cli/config)

说明：

- 选择 Gateway(网关) 的运行位置总是会更新 `gateway.mode`。如果您只需要这样做，可以在没有其他部分的情况下选择“Continue”（继续）。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置过程中提示输入渠道/房间允许列表。您可以输入名称或 ID；向导会在可能的情况下将名称解析为 ID。
- 如果您运行守护程序安装步骤，令牌身份验证需要一个令牌，并且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef，但不会将解析后的纯文本令牌值持久化到主管服务环境元数据中。
- 如果令牌身份验证需要令牌，但配置的令牌 SecretRef 未解析，configure 会阻止守护程序安装并提供可行的修复指导。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置，但未设置 `gateway.auth.mode`，configure 将阻止守护程序安装，直到明确设置模式为止。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
```

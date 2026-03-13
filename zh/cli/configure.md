---
summary: "`openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - You want to tweak credentials, devices, or agent defaults interactively
title: "配置"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

注意：**Model** 部分现在包含 `agents.defaults.models` 白名单（在 `/model` 和模型选择器中显示的内容）的多选功能。

提示：不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。

相关：

- 网关配置参考：[Configuration](/zh/en/gateway/configuration)
- 配置 CLI：[Config](/zh/en/cli/config)

备注：

- 选择网关运行的位置总是会更新 `gateway.mode`。如果仅需要此项，您可以在不选择其他部分的情况下选择“继续”。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置过程中提示输入频道/房间白名单。您可以输入名称或 ID；向导会尽可能将名称解析为 ID。
- 如果您运行守护进程安装步骤，令牌身份验证需要令牌，并且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef，但不会将解析后的明文令牌值持久化到主管服务环境元数据中。
- 如果令牌身份验证需要令牌，但配置的令牌 SecretRef 未解析，configure 会阻止守护进程安装，并提供可操作的修复指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，configure 将阻止守护进程安装，直到明确设置模式。

## 示例

```bash
openclaw configure
openclaw configure --section model --section channels
```

import zh from '/components/footer/zh.mdx';

<zh />

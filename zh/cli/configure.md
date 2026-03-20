---
summary: "CLI 参考文档 `openclaw configure`（交互式配置提示）"
read_when:
  - 您希望以交互方式调整凭据、设备或代理默认值
title: "configure"
---

# `openclaw configure`

用于设置凭据、设备和代理默认值的交互式提示。

注意：**模型**部分现在包含针对 `agents.defaults.models` 允许列表的多选功能（即 `/model` 和模型选择器中显示的内容）。

提示：不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。

相关：

- Gateway(网关) 配置参考：[Configuration](/zh/gateway/configuration)
- 配置 CLI：[Config](/zh/cli/config)

备注：

- 选择 Gateway(网关) 的运行位置始终会更新 `gateway.mode`。如果您只需要此操作，可以在不填写其他部分的情况下选择“继续”。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置过程中提示输入频道/房间白名单。您可以输入名称或 ID；向导会尽可能将名称解析为 ID。
- 如果您运行守护进程安装步骤，令牌身份验证需要令牌，且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef，但不会将解析后的明文令牌值持久化到主管服务环境元数据中。
- 如果令牌身份验证需要令牌，但配置的令牌 SecretRef 未解析，configure 会阻止守护进程安装，并提供可操作的修复指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，并且未设置 `gateway.auth.mode`，configure 将阻止守护进程安装，直到明确设置模式。

## 示例

```bash
openclaw configure
openclaw configure --section model --section channels
```

import en from "/components/footer/en.mdx";

<en />

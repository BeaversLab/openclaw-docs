---
summary: "`openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - "You want to tweak credentials, devices, or agent defaults interactively"
title: "configure"
---

# `openclaw configure`

用于设置凭证、设备和代理默认值的交互式提示。

注意：**模型**部分现在包含 `agents.defaults.models` 允许列表的多选（显示在 `/model` 和模型选择器中）。

提示：不带子命令的 `openclaw config` 会打开相同的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。

相关内容：

- Gateway 配置参考：[Configuration](/en/gateway/configuration)
- 配置 CLI：[Config](/en/cli/config)

注意：

- 选择 Gateway 运行位置始终会更新 `gateway.mode`。如果只需要此操作，您可以在不选择其他部分的情况下选择"Continue"。
- 面向频道的服务（Slack/Discord/Matrix/Microsoft Teams）会在设置期间提示输入频道/房间允许列表。您可以输入名称或 ID；向导会在可能的情况下将名称解析为 ID。

## 示例

```bash
openclaw configure
openclaw configure --section models --section channels
```

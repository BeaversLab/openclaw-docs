---
summary: "`openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - 你想交互式调整凭据、设备或 agent 默认值
title: "`openclaw configure`"
---

# `openclaw configure`

交互式提示，用于设置凭据、设备和 agent 默认值。

注意：**Model** 部分现在包含 `agents.defaults.models` allowlist 的多选
（用于 `/model` 与模型选择器可见性）。

提示：不带子命令运行 `openclaw config` 会打开同一向导。非交互式编辑请用
`openclaw config get|set|unset`。

相关：
- Gateway 配置参考：[Configuration](/zh/gateway/configuration)
- Config CLI：[Config](/zh/cli/config)

说明：
- 选择 Gateway 运行位置始终会更新 `gateway.mode`。若只需要这一项，可选择 “Continue” 跳过其他部分。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置中会询问频道/房间 allowlist。你可以输入名称或 ID；向导会在可能时解析名称为 ID。

## 示例

```bash
openclaw configure
openclaw configure --section models --section channels
```

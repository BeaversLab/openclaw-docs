---
summary: "对节点配对、前台要求、权限和工具故障进行故障排除"
read_when:
  - Node is connected but camera/canvas/screen/exec tools fail
  - You need the node pairing versus approvals mental model
title: "节点故障排除"
---

# 节点故障排除

当节点在状态中可见但节点工具失败时，请使用此页面。

## 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行节点特定的检查：

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康信号：

- 节点已连接并已配对用于角色 `node`。
- `nodes describe` 包含您正在调用的功能。
- Exec 批准显示预期的模式/允许列表。

## 前台要求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 节点上仅限前台使用。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果您看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用置于前台并重试。

## 权限矩阵

| Capability                   | iOS                                     | Android                                      | macOS node app                | Typical failure code           |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | 相机（片段音频需要麦克风）           | 相机（片段音频需要麦克风）                | 相机（片段音频需要麦克风） | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | 屏幕录制（麦克风可选）       | 屏幕截取提示（麦克风可选）       | 屏幕录制              | `*_PERMISSION_REQUIRED`        |
| `location.get`               | 使用时或始终（取决于模式） | 基于模式的前台/后台位置 | Location permission           | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | 不适用（节点主机路径）                    | 不适用（节点主机路径）                         | 需要执行批准       | `SYSTEM_RUN_DENIED`            |

## 配对与批准

这些是不同的关卡：

1. **设备配对**：此节点能否连接到网关？
2. **Exec 批准**：此节点能否运行特定的 shell 命令？

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配对，请先批准节点设备。
如果配对正常但 `system.run` 失败，请修复执行批准/允许列表。

## 常见节点错误代码

- `NODE_BACKGROUND_UNAVAILABLE` → 应用程序处于后台；将其切换至前台。
- `CAMERA_DISABLED` → 节点设置中禁用了相机开关。
- `*_PERMISSION_REQUIRED` → 缺少/拒绝操作系统权限。
- `LOCATION_DISABLED` → 定位模式已关闭。
- `LOCATION_PERMISSION_REQUIRED` → 未授予请求的定位模式。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 应用程序处于后台，但仅存在“使用时”权限。
- `SYSTEM_RUN_DENIED: approval required` → exec 请求需要明确批准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表模式阻止。
  在 Windows 节点主机上，除非通过询问流程批准，否则像 `cmd.exe /c ...` 这样的 shell-wrapper 形式
  在允许列表模式下被视为允许列表未命中。

## 快速恢复循环

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准设备配对。
- 重新打开节点应用（前台）。
- 重新授予操作系统权限。
- 重新创建/调整执行批准策略。

相关：

- [/nodes/index](/en/nodes/index)
- [/nodes/camera](/en/nodes/camera)
- [/nodes/location-command](/en/nodes/location-command)
- [/tools/exec-approvals](/en/tools/exec-approvals)
- [/gateway/pairing](/en/gateway/pairing)

import zh from '/components/footer/zh.mdx';

<zh />

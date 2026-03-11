---
summary: "排查节点配对、前台要求、权限和工具故障"
read_when:
  - "Node is connected but camera/canvas/screen/exec tools fail"
  - "You need the node pairing versus approvals mental model"
title: "节点故障排除"
---

# 节点故障排除

当节点在状态中可见但节点工具失败时，使用此页面。

## 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行节点特定检查：

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康信号：

- 节点已连接并为角色 `node` 配对。
- `nodes describe` 包含您正在调用的功能。
- Exec 批准显示预期的模式/允许列表。

## 前台要求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 节点上仅限前台。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果您看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用程序置于前台并重试。

## 权限矩阵

| Capability                   | iOS                                     | Android                                      | macOS node app                | Typical failure code           |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | Camera (+ mic for clip audio)           | Camera (+ mic for clip audio)                | Camera (+ mic for clip audio) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | Screen Recording (+ mic optional)       | Screen capture prompt (+ mic optional)       | Screen Recording              | `*_PERMISSION_REQUIRED`        |
| `location.get`               | While Using or Always (depends on mode) | Foreground/Background location based on mode | Location permission           | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | n/a (node host path)                    | n/a (node host path)                         | Exec approvals required       | `SYSTEM_RUN_DENIED`            |

## 配对与批准

这些是不同的关卡：

1. **设备配对**：此节点能否连接到 Gateway？
2. **Exec 批准**：此节点能否运行特定的 shell 命令？

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配对，请先批准节点设备。
如果配对正常但 `system.run` 失败，请修复 exec 批准/允许列表。

## 常见节点错误代码

- `NODE_BACKGROUND_UNAVAILABLE` → 应用程序在后台；将其置于前台。
- `CAMERA_DISABLED` → 相机切换在节点设置中被禁用。
- `*_PERMISSION_REQUIRED` → 操作系统权限缺失/被拒绝。
- `LOCATION_DISABLED` → 位置模式关闭。
- `LOCATION_PERMISSION_REQUIRED` → 未授予请求的位置模式。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 应用程序在后台，但仅存在"使用时"权限。
- `SYSTEM_RUN_DENIED: approval required` → exec 请求需要明确批准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表模式阻止。
  在 Windows 节点主机上，shell 包装器形式如 `cmd.exe /c ...` 被视为允许列表未命中，
  在允许列表模式下，除非通过询问流程批准。

## 快速恢复循环

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准设备配对。
- 重新打开节点应用程序（前台）。
- 重新授予操作系统权限。
- 重新创建/调整 exec 批准策略。

相关：

- [/nodes/index](/zh/nodes/index)
- [/nodes/camera](/zh/nodes/camera)
- [/nodes/location-command](/zh/nodes/location-command)
- [/tools/exec-approvals](/zh/tools/exec-approvals)
- [/gateway/pairing](/zh/gateway/pairing)

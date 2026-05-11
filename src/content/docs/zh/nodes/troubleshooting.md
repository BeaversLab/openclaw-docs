---
summary: "对节点配对、前台要求、权限和工具故障进行故障排除"
read_when:
  - Node is connected but camera/canvas/screen/exec tools fail
  - You need the node pairing versus approvals mental model
title: "Node 故障排除"
---

当节点在状态中可见但节点工具失败时，请使用此页面。

## 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行特定于节点的检查：

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康信号：

- 节点已连接并已针对角色 `node` 完成配对。
- `nodes describe` 包含您正在调用的功能。
- Exec 批准显示预期的模式/允许列表。

## 前台要求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 节点上仅限前台运行。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果您看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用置于前台并重试。

## 权限矩阵

| 功能                         | iOS                             | Android                      | macOS 节点应用            | 典型故障代码                   |
| ---------------------------- | ------------------------------- | ---------------------------- | ------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | 相机（用于剪辑音频的 + 麦克风） | 相机 (+ 剪辑音频需麦克风)    | 相机 (+ 剪辑音频需麦克风) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | 屏幕录制（+ 麦克风可选）        | 屏幕录制提示（+ 麦克风可选） | 屏幕录制                  | `*_PERMISSION_REQUIRED`        |
| `location.get`               | 使用时或始终（取决于模式）      | 基于模式的前台/后台位置      | 位置权限                  | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | 不适用（节点主机路径）          | 不适用 (节点主机路径)        | 需要 Exec 批准            | `SYSTEM_RUN_DENIED`            |

## 配对与批准

这些是不同的关卡：

1. **设备配对**：此节点能否连接到 Gateway？
2. **Gateway(网关) 节点命令策略**：Gateway(网关) 命令 ID 是否被 `gateway.nodes.allowCommands` / `denyCommands` 和平台默认设置允许？
3. **Exec 批准**：此节点能否在本地运行特定的 Shell 命令？

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配对，请先批准节点设备。
如果 `nodes describe` 缺少命令，请检查 Gateway 节点命令策略以及该节点在连接时是否实际声明了该命令。
如果配对正常但 `system.run` 失败，请修复该节点上的 Exec 批准/允许列表。

Node pairing is an identity/trust gate, not a per-command approval surface. For `system.run`, the per-node policy lives in that node's exec approvals file (`openclaw approvals get --node ...`), not in the gateway pairing record.

For approval-backed `host=node` runs, the gateway also binds execution to the
prepared canonical `systemRunPlan`. If a later caller mutates command/cwd or
会话 metadata before the approved run is forwarded, the gateway rejects the
run as an approval mismatch instead of trusting the edited payload.

## Common node error codes

- `NODE_BACKGROUND_UNAVAILABLE` → app is backgrounded; bring it foreground.
- `CAMERA_DISABLED` → camera toggle disabled in node settings.
- `*_PERMISSION_REQUIRED` → OS permission missing/denied.
- `LOCATION_DISABLED` → location mode is off.
- `LOCATION_PERMISSION_REQUIRED` → requested location mode not granted.
- `LOCATION_BACKGROUND_UNAVAILABLE` → app is backgrounded but only While Using permission exists.
- `SYSTEM_RUN_DENIED: approval required` → exec request needs explicit approval.
- `SYSTEM_RUN_DENIED: allowlist miss` → command blocked by allowlist mode.
  On Windows node hosts, shell-wrapper forms like `cmd.exe /c ...` are treated as allowlist misses in
  allowlist mode unless approved via ask flow.

## Fast recovery loop

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

If still stuck:

- Re-approve device pairing.
- Re-open node app (foreground).
- Re-grant OS permissions.
- Recreate/adjust exec approval policy.

Related:

- [/nodes/index](/zh/nodes/index)
- [/nodes/camera](/zh/nodes/camera)
- [/nodes/location-command](/zh/nodes/location-command)
- [/tools/exec-approvals](/zh/tools/exec-approvals)
- [/gateway/pairing](/zh/gateway/pairing)

## Related

- [Nodes overview](/zh/nodes)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
- [Channel 故障排除](/zh/channels/troubleshooting)

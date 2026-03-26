---
summary: "疑難排解節點配對、前景要求、權限與工具失敗"
read_when:
  - Node is connected but camera/canvas/screen/exec tools fail
  - You need the node pairing versus approvals mental model
title: "節點疑難排解"
---

# 節點疑難排解

當節點在狀態中可見但節點工具失敗時，請使用此頁面。

## 指令階梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後執行節點特定檢查：

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康訊號：

- 節點已連線並已針對角色 `node` 完成配對。
- `nodes describe` 包含您正在呼叫的功能。
- Exec 審核顯示預期的模式/允許清單。

## 前景要求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 節點上僅限前景使用。

快速檢查與修復：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果您看到 `NODE_BACKGROUND_UNAVAILABLE`，請將節點應用程式帶到前景並重試。

## 權限矩陣

| 功能                         | iOS                                     | Android                                      | macOS node app                | Typical failure code           |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | Camera (+ mic for clip audio)           | Camera (+ mic for clip audio)                | Camera (+ mic for clip audio) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | Screen Recording (+ mic optional)       | Screen capture prompt (+ mic optional)       | Screen Recording              | `*_PERMISSION_REQUIRED`        |
| `location.get`               | While Using or Always (depends on mode) | Foreground/Background location based on mode | Location permission           | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | n/a (node host path)                    | n/a (node host path)                         | Exec approvals required       | `SYSTEM_RUN_DENIED`            |

## 配對與核准

這是不同的閘門：

1. **裝置配對**：此節點能否連接到閘道？
2. **Exec 核准**：此節點能否執行特定的 shell 指令？

快速檢查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配對，請先批准節點裝置。
如果配對正常但 `system.run` 失敗，請修復 exec 批准/允許清單。

## 常見節點錯誤代碼

- `NODE_BACKGROUND_UNAVAILABLE` → 應用程式已在背景執行；請將其帶到前景。
- `CAMERA_DISABLED` → 相機切換在節點設定中已停用。
- `*_PERMISSION_REQUIRED` → 作業系統權限遺失/被拒絕。
- `LOCATION_DISABLED` → 定位模式已關閉。
- `LOCATION_PERMISSION_REQUIRED` → 未授予請求的定位模式。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 應用程式已在背景執行，但僅存在「使用 App 時」權限。
- `SYSTEM_RUN_DENIED: approval required` → exec 請求需要明確批准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允許清單模式阻擋。
  在 Windows 節點主機上，除非透過詢問流程批准，否則像 `cmd.exe /c ...` 這類 shell-wrapper 表單在允許清單模式下會被視為允許清單遺漏。

## 快速恢復迴圈

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准裝置配對。
- 重新開啟節點應用程式 (前景)。
- 重新授予 OS 權限。
- 重新建立/調整 exec 批准原則。

相關連結：

- [/nodes/index](/zh-Hant/nodes/index)
- [/nodes/camera](/zh-Hant/nodes/camera)
- [/nodes/location-command](/zh-Hant/nodes/location-command)
- [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)
- [/gateway/pairing](/zh-Hant/gateway/pairing)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

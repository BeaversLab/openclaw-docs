---
summary: "疑難排解節點配對、前景需求、權限與工具失敗"
read_when:
  - Node 已連線但相機/畫布/螢幕/exec 工具失敗
  - 您需要了解節點配對與批准的心智模型
title: "Node 疑難排解"
---

# Node 疑難排解

當節點在狀態中可見但節點工具失敗時，請使用本頁面。

## 指令階層

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

- Node 已連線並已針對角色 `node` 進行配對。
- `nodes describe` 包含您正在呼叫的功能。
- Exec 批准顯示預期的模式/允許清單。

## 前景需求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 節點上僅限前景使用。

快速檢查與修復：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果您看到 `NODE_BACKGROUND_UNAVAILABLE`，請將節點應用程式帶到前景並重試。

## 權限矩陣

| 功能                   | iOS                                     | Android                                      | macOS node 應用程式                | 典型失敗代碼           |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------ |
| `camera.snap`、`camera.clip` | 相機（+ 麥克風用於剪輯音訊）           | 相機（+ 麥克風用於剪輯音訊）                | 相機 (+ 麥克風用於剪輯音訊) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | 螢幕錄製 (+ 麥克風選用)       | 螢幕擷取提示 (+ 麥克風選用)       | 螢幕錄製              | `*_PERMISSION_REQUIRED`        |
| `location.get`               | 使用 App 時或永遠 (取決於模式) | 根據模式決定的前景/背景位置 | 位置權限           | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | 不適用（節點主機路徑）                    | 不適用 (節點主機路徑)                         | 需要 Exec 批准       | `SYSTEM_RUN_DENIED`            |

## 配對與批准

這些是不同的關卡：

1. **裝置配對**：此節點能否連接到閘道？
2. **Exec 批准**：此節點能否執行特定的 shell 指令？

快速檢查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配對，請先批准節點裝置。
如果配對正常但 `system.run` 失敗，請修復 exec 批准/允許清單。

## 常見的節點錯誤代碼

- `NODE_BACKGROUND_UNAVAILABLE` → app 已在背景；請將其帶到前景。
- `CAMERA_DISABLED` → 相機切換在節點設定中已停用。
- `*_PERMISSION_REQUIRED` → 缺少/拒絕 OS 權限。
- `LOCATION_DISABLED` → 位置模式已關閉。
- `LOCATION_PERMISSION_REQUIRED` → 未授予請求的位置模式。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 應用程式處於背景，但僅擁有「使用 App 時」權限。
- `SYSTEM_RUN_DENIED: approval required` → exec 請求需要明確批准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令已被允許清單模式封鎖。
  在 Windows node 主機上，除非透過詢問流程批准，否則像 `cmd.exe /c ...` 這類的 shell 包裝形式在允許清單模式下會被視為未命中允許清單。

## 快速復原循環

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准裝置配對。
- 重新開啟 node 應用程式（前景）。
- 重新授予 OS 權限。
- 重新建立/調整 exec 批准政策。

相關連結：

- [/nodes/index](/zh-Hant/nodes/index)
- [/nodes/camera](/zh-Hant/nodes/camera)
- [/nodes/location-command](/zh-Hant/nodes/location-command)
- [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)
- [/gateway/pairing](/zh-Hant/gateway/pairing)

import en from "/components/footer/en.mdx";

<en />

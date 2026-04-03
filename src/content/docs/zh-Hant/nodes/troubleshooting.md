---
summary: "疑難排解節點配對、前景需求、權限與工具失敗"
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

- 節點已連線並已針對角色 `node` 配對。
- `nodes describe` 包含您正在呼叫的功能。
- 執行核准顯示預期的模式/允許清單。

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

| 功能                         | iOS                               | Android                     | macOS 節點應用程式        | 典型失敗代碼                   |
| ---------------------------- | --------------------------------- | --------------------------- | ------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | 相機 (+ 剪輯音訊的麥克風)         | 相機 (+ 剪輯音訊的麥克風)   | 相機 (+ 剪輯音訊的麥克風) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | 螢幕錄製 (+ 麥克風選用)           | 螢幕擷取提示 (+ 麥克風選用) | 螢幕錄製                  | `*_PERMISSION_REQUIRED`        |
| `location.get`               | 使用 App 時或 always (取決於模式) | 基於模式的前景/背景位置     | 位置權限                  | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | n/a (節點主機路徑)                | n/a (節點主機路徑)          | 需要執行核准              | `SYSTEM_RUN_DENIED`            |

## 配對與核准

這些是不同的閘門：

1. **裝置配對**：此節點能否連線至閘道？
2. **閘道節點指令原則**：RPC 指令 ID 是否被 `gateway.nodes.allowCommands` / `denyCommands` 和平台預設值所允許？
3. **Exec 核准**：此節點能否在本機執行特定的 shell 指令？

快速檢查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配對，請先核准節點裝置。
如果 `nodes describe` 缺少指令，請檢查閘道節點指令原則，以及節點在連線時是否實際宣告了該指令。
如果配對正常但 `system.run` 失敗，請修復該節點上的 exec 核准/允許清單。

節點配對是一個身分/信任閘門，而非針對每個指令的核准介面。對於 `system.run`，個別節點的原則位於該節點的 exec 核准檔案 (`openclaw approvals get --node ...`) 中，而非閘道配對記錄中。

## 常見節點錯誤代碼

- `NODE_BACKGROUND_UNAVAILABLE` → 應用程式已在背景執行；請將其帶到前景。
- `CAMERA_DISABLED` → 相機切換在節點設定中已停用。
- `*_PERMISSION_REQUIRED` → OS 權限缺失/被拒絕。
- `LOCATION_DISABLED` → 位置模式已關閉。
- `LOCATION_PERMISSION_REQUIRED` → 未授予要求的位置模式。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 應用程式已在背景執行，但僅存在「使用 App 時」的權限。
- `SYSTEM_RUN_DENIED: approval required` → exec 請求需要明確核准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單模式封鎖。
  在 Windows 節點主機上，諸如 `cmd.exe /c ...` 的 shell 包裝表單在允許清單模式中會被視為允許清單不符，除非透過要求流程核准。

## 快速恢復循環

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新核准裝置配對。
- 重新開啟節點應用程式 (前景)。
- 重新授權 OS 權限。
- 重新建立/調整 exec 核准原則。

相關連結：

- [/nodes/index](/en/nodes/index)
- [/nodes/camera](/en/nodes/camera)
- [/nodes/location-command](/en/nodes/location-command)
- [/tools/exec-approvals](/en/tools/exec-approvals)
- [/gateway/pairing](/en/gateway/pairing)

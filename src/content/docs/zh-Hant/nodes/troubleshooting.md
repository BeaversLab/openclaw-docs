---
summary: "疑難排解節點配對、前景需求、權限與工具失敗"
read_when:
  - Node is connected but camera/canvas/screen/exec tools fail
  - You need the node pairing versus approvals mental model
title: "節點疑難排解"
---

當節點在狀態中可見但節點工具失敗時，請使用此頁面。

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

- 節點已連線並已針對角色 `node` 完成配對。
- `nodes describe` 包含您正在呼叫的功能。
- Exec 核准顯示預期的模式/允許清單。

## 前景需求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 節點上僅限前景使用。

快速檢查與修復：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果您看到 `NODE_BACKGROUND_UNAVAILABLE`，請將節點應用程式帶到前景並重試。

## 權限對照表

| 功能                         | iOS                         | Android                     | macOS 節點應用程式        | 典型失敗代碼                   |
| ---------------------------- | --------------------------- | --------------------------- | ------------------------- | ------------------------------ |
| `camera.snap`、`camera.clip` | 相機 (剪輯音訊需加麥克風)   | 相機 (+ 剪輯音訊的麥克風)   | 相機 (+ 剪輯音訊的麥克風) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | 螢幕錄製 (麥克風為選用)     | 螢幕擷取提示 (麥克風為選用) | 螢幕錄製                  | `*_PERMISSION_REQUIRED`        |
| `location.get`               | 使用期間或永遠 (取決於模式) | 根據模式決定的前景/背景位置 | 位置權限                  | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | 不適用 (節點主機路徑)       | n/a (節點主機路徑)          | 需要 Exec 核准            | `SYSTEM_RUN_DENIED`            |

## 配對與核准

這些是不同的閘道：

1. **裝置配對**：此節點能否連線到閘道？
2. **閘道節點指令原則**：RPC 指令 ID 是否由 `gateway.nodes.allowCommands` / `denyCommands` 和平台預設值所允許？
3. **Exec 核准**：此節點能否在本地執行特定的 Shell 指令？

快速檢查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配對，請先核准節點裝置。
如果 `nodes describe` 缺少指令，請檢查閘道節點指令原則，以及節點是否實際在連線時宣告了該指令。
如果配對正常但 `system.run` 失敗，請修復該節點上的 Exec 核准/允許清單。

節點配對是一種身分/信任閘道，而非針對每個指令的批准介面。對於 `system.run`，針對各節點的策略位於該節點的 exec 批准檔案 (`openclaw approvals get --node ...`) 中，而非在閘道配對紀錄中。

對於由批准支援的 `host=node` 執行，閘道也會將執行綁定至
準備好的標準 `systemRunPlan`。如果後續的呼叫者在已批准的執行被轉發之前
變更了 command/cwd 或 session metadata，閘道會將該執行視為批准不符
而拒絕，而不是信任經過編輯的 payload。

## 常見節點錯誤代碼

- `NODE_BACKGROUND_UNAVAILABLE` → app 處於背景中；請將其帶到前景。
- `CAMERA_DISABLED` → 相機切換功能在節點設定中已停用。
- `*_PERMISSION_REQUIRED` → 遺失/拒絕 OS 權限。
- `LOCATION_DISABLED` → 定位模式已關閉。
- `LOCATION_PERMISSION_REQUIRED` → 未授予請求的定位模式。
- `LOCATION_BACKGROUND_UNAVAILABLE` → app 處於背景中，但僅存在「使用 App 時」的權限。
- `SYSTEM_RUN_DENIED: approval required` → exec 請求需要明確批准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單模式封鎖。
  在 Windows 節點主機上，類似 `cmd.exe /c ...` 的 shell-wrapper 表單
  會被視為允許清單遺漏，除非透過詢問流程批准，否則在允許清單模式中將
  如此處理。

## 快速復原迴圈

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准裝置配對。
- 重新開啟節點 app (前景)。
- 重新授予 OS 權限。
- 重新建立/調整 exec 批准策略。

## 相關

- [節點概觀](/zh-Hant/nodes)
- [相機節點](/zh-Hant/nodes/camera)
- [Location 指令](/zh-Hant/nodes/location-command)
- [Exec 核准](/zh-Hant/tools/exec-approvals)
- [閘道配對](/zh-Hant/gateway/pairing)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting)
- [通道疑難排解](/zh-Hant/channels/troubleshooting)

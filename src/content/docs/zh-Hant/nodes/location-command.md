---
summary: "Location command for nodes (location.get), permission modes, and Android foreground behavior"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "Location Command"
---

# 位置指令（節點）

## TL;DR

- `location.get` 是一個節點指令（透過 `node.invoke`）。
- 預設關閉。
- Android 應用程式設定使用選擇器：關閉 / 使用時。
- 獨立切換開關：精確位置。

## 為何使用選擇器（而不只是切換開關）

OS 權限是多層級的。我們可以在應用程式中提供選擇器，但 OS 仍會決定實際授予的權限。

- iOS/macOS 可能會在系統提示/設定中顯示**使用時**或**始終**。
- Android 應用程式目前僅支援前景位置。
- 精確位置是單獨授予的權限（iOS 14+ 的「精確」、Android 的「精細」與「粗略」）。

UI 中的選擇器驅動我們要求的模式；實際授予的權限則存於 OS 設定中。

## 設定模型

每個節點裝置：

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

UI 行為：

- 選取 `whileUsing` 會請求前景權限。
- 如果 OS 拒絕請求的等級，則回復至最高授予等級並顯示狀態。

## 權限對應（node.permissions）

選用。macOS 節點透過權限對應回報 `location`；iOS/Android 可能會省略它。

## 指令：`location.get`

透過 `node.invoke` 呼叫。

參數（建議）：

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

回應負載：

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

錯誤（穩定代碼）：

- `LOCATION_DISABLED`: 選擇器已關閉。
- `LOCATION_PERMISSION_REQUIRED`: 缺少請求模式的權限。
- `LOCATION_BACKGROUND_UNAVAILABLE`: 應用程式處於背景，但僅允許使用時。
- `LOCATION_TIMEOUT`: 及時無法定位。
- `LOCATION_UNAVAILABLE`: 系統錯誤 / 無提供者。

## 背景行為

- Android 應用程式在背景時會拒絕 `location.get`。
- 在 Android 上請求位置時，請保持 OpenClaw 開啟。
- 其他節點平台可能會有所不同。

## 模型/工具整合

- 工具介面：`nodes` 工具新增 `location_get` 動作（需要節點）。
- CLI：`openclaw nodes location get --node <id>`。
- Agent 指引：僅在用戶已啟用位置資訊並了解其範圍時呼叫。

## UX 文案（建議）

- 關閉：“位置資訊分享已停用。”
- 使用期間：“僅在 OpenClaw 開啟時。”
- 精確：“使用精確 GPS 位置。切換關閉以分享大略位置。”

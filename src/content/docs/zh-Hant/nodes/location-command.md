---
summary: "節點位置指令 (location.get)、權限模式與 Android 前台行為"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "位置指令"
---

# 位置指令 (節點)

## 總結

- `location.get` 是一個節點指令 (透過 `node.invoke`)。
- 預設關閉。
- Android 應用程式設定使用選擇器：關閉 / 使用時允許。
- 獨立切換開關：精確位置。

## 為何使用選擇器 (而不只是開關)

OS 權限是多層級的。我們可以在應用程式中公開選擇器，但實際授權仍由 OS 決定。

- iOS/macOS 可能會在系統提示/設定中公開 **使用時允許** 或 **始終**。
- Android 應用程式目前僅支援前台位置。
- 精確位置是一個獨立的授權 (iOS 14+ 的「精確」，Android 的「fine」與「coarse」)。

UI 中的選擇器驅動我們請求的模式；實際授權存在於 OS 設定中。

## 設定模型

每個節點裝置：

- `location.enabledMode`：`off | whileUsing`
- `location.preciseEnabled`：布林值

UI 行為：

- 選擇 `whileUsing` 會請求前景權限。
- 如果作業系統拒絕請求的層級，則恢復為最高已授權的層級並顯示狀態。

## 權限對應 (node.permissions)

選填。macOS 節點透過權限映射回報 `location`；iOS/Android 可能會省略。

## 指令：`location.get`

透過 `node.invoke` 呼叫。

參數 (建議)：

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

回應酬載：

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

錯誤 (穩定代碼)：

- `LOCATION_DISABLED`：選擇器已關閉。
- `LOCATION_PERMISSION_REQUIRED`：請求的模式缺少權限。
- `LOCATION_BACKGROUND_UNAVAILABLE`：應用程式已在背景，但僅允許「使用時」定位。
- `LOCATION_TIMEOUT`：無法及時定位。
- `LOCATION_UNAVAILABLE`：系統故障 / 沒有提供者。

## 背景行為

- Android 應用程式在背景時會拒絕 `location.get`。
- 在 Android 上請求位置時，請保持 OpenClaw 開啟。
- 其他節點平台可能會有所不同。

## 模型/工具整合

- 工具介面：`nodes` 工具新增 `location_get` 動作（需要節點）。
- CLI：`openclaw nodes location get --node <id>`。
- 代理方針：僅在使用者啟用位置並了解範圍時呼叫。

## UX 文字（建議）

- 關閉：「位置分享已停用。」
- 使用期間：「僅在 OpenClaw 開啟時。」
- 精確：「使用精確 GPS 定位。切換關閉以分享大略位置。」

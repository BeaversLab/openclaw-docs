---
title: "工具迴圈偵測"
summary: "如何啟用並調整偵測重複工具呼叫迴圈的防護機制"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# 工具迴圈偵測

OpenClaw 可以防止代理陷入重複的工具呼叫模式中。
此防護機制**預設為停用**。

請僅在必要的地方啟用它，因為在嚴格的設定下，它可能會阻擋合理的重複呼叫。

## 為何存在此功能

- 偵測無法取得進度的重複序列。
- 偵測高頻率且無結果的迴圈（相同工具、相同輸入、重複錯誤）。
- 針對已知的輪詢工具偵測特定的重複呼叫模式。

## 配置區塊

全域預設值：

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

各代理覆寫（選用）：

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### 欄位行為

- `enabled`：主開關。`false` 表示不執行迴圈偵測。
- `historySize`：保留用於分析的近期工具呼叫數量。
- `warningThreshold`：將模式分類為僅警告前的閾值。
- `criticalThreshold`：阻擋重複迴圈模式的閾值。
- `globalCircuitBreakerThreshold`：全域無進度中斷器閾值。
- `detectors.genericRepeat`：偵測重複的相同工具 + 相同參數模式。
- `detectors.knownPollNoProgress`：偵測已知的類輪詢模式且無狀態變更。
- `detectors.pingPong`：偵測交替的乒乓模式。

## 建議設定

- 從 `enabled: true` 開始，保持預設值不變。
- 保持閾值的順序為 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`。
- 如果發生誤報：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`
  - （選用）提高 `globalCircuitBreakerThreshold`
  - 僅停用造成問題的偵測器
  - 降低 `historySize` 以減少嚴格的歷史記錄背景

## 日誌與預期行為

當偵測到迴圈時，OpenClaw 會報告迴圈事件，並根據嚴重程度阻擋或抑制下一個工具週期。
這能保護使用者免於過度的 token 消耗和鎖死，同時維持正常的工具存取。

- 優先使用警告和暫時抑制。
- 僅在累積重複證據時才升級處理。

## 備註

- `tools.loopDetection` 與代理層級的覆蓋合併。
- 個別代理配置完全覆蓋或擴展全域值。
- 如果不存在配置，防護機制保持關閉。

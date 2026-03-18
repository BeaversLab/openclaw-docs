---
title: "Tool-loop detection"
description: "配置可選的防護機制，以防止重複或停滯的工具呼叫迴圈"
summary: "如何啟用並調整偵測重複工具呼叫迴圈的防護機制"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# Tool-loop detection

OpenClaw 可以防止代理陷入重複的工具呼叫模式。
此防護機制**預設為停用**。

僅在需要時啟用，因為嚴格的設定可能會阻擋合理的重複呼叫。

## Why this exists

- 偵測無法取得進度的重複序列。
- 偵測高頻率且無結果的迴圈（相同的工具、相同的輸入、重複的錯誤）。
- 針對已知輪詢工具，偵測特定的重複呼叫模式。

## Configuration block

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

各代理的覆寫（可選）：

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

### Field behavior

- `enabled`：主開關。`false` 表示不執行迴圈偵測。
- `historySize`：保留用於分析之最近工具呼叫的數量。
- `warningThreshold`：將模式分類為僅警告之前的閾值。
- `criticalThreshold`：阻擋重複迴圈模式的閾值。
- `globalCircuitBreakerThreshold`：全域無進度中斷器閾值。
- `detectors.genericRepeat`：偵測重複的相同工具 + 相同參數模式。
- `detectors.knownPollNoProgress`：偵測已知的類輪詢模式且無狀態變更。
- `detectors.pingPong`：偵測交替的乒乓模式。

## Recommended setup

- 從 `enabled: true` 開始，保持預設值不變。
- 將閾值按 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold` 順序排列。
- 如果發生誤報：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`
  - （可選）提高 `globalCircuitBreakerThreshold`
  - 僅停用造成問題的偵測器
  - 降低 `historySize` 以減少嚴格的歷史記錄內容

## Logs and expected behavior

當檢測到循環時，OpenClaw 會報告循環事件，並根據嚴重程度封鎖或抑制下一個工具週期。這可在保護使用者免於 token 費用失控和系統鎖定的同時，維持正常的工具存取。

- 優先使用警告和暫時性抑制。
- 僅當累積重複證據時才升級處理。

## 備註

- `tools.loopDetection` 會與代理程式層級的覆寫合併。
- 每個代理程式的組態會完全覆寫或延伸全域值。
- 如果沒有組態，防護機制會保持關閉。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

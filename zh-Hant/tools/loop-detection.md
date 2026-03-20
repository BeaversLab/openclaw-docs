---
title: "Tool-loop detection"
description: "Configure optional guardrails for preventing repetitive or stalled tool-call loops"
summary: "How to enable and tune guardrails that detect repetitive tool-call loops"
read_when:
  - 用戶報告代理程式重複呼叫工具時陷入停滯
  - 您需要調整重複呼叫防護
  - 您正在編輯代理程式工具/執行時原則
---

# Tool-loop detection

OpenClaw 可防止代理程式陷入重複的工具呼叫模式。
此防護**預設為停用**。

僅在需要時啟用，因為嚴格的設定可能會阻擋合理的重複呼叫。

## Why this exists

- 偵測無法取得進度的重複序列。
- 偵測高頻率的無結果迴圈（相同工具、相同輸入、重複錯誤）。
- 偵測已知輪詢工具的特定重複呼叫模式。

## Configuration block

Global defaults:

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

Per-agent override (optional):

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

- `enabled`: Master switch. `false` means no loop detection is performed.
- `historySize`: number of recent tool calls kept for analysis.
- `warningThreshold`: threshold before classifying a pattern as warning-only.
- `criticalThreshold`: threshold for blocking repetitive loop patterns.
- `globalCircuitBreakerThreshold`: global no-progress breaker threshold.
- `detectors.genericRepeat`: detects repeated same-tool + same-params patterns.
- `detectors.knownPollNoProgress`: detects known polling-like patterns with no state change.
- `detectors.pingPong`: detects alternating ping-pong patterns.

## Recommended setup

- Start with `enabled: true`, defaults unchanged.
- Keep thresholds ordered as `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- If false positives occur:
  - raise `warningThreshold` and/or `criticalThreshold`
  - (optionally) raise `globalCircuitBreakerThreshold`
  - disable only the detector causing issues
  - reduce `historySize` for less strict historical context

## Logs and expected behavior

當檢測到迴圈時，OpenClaw 會回報一個迴圈事件，並根據嚴重程度封鎖或抑制下一個工具週期。
這可以保護使用者免於過度消耗 Token 並避免系統鎖死，同時維持正常的工具存取權。

- 優先使用警告與暫時性抑制。
- 僅當累積重複證據時才升級處理。

## 備註

- `tools.loopDetection` 與代理程式層級的覆寫值合併。
- 各別代理程式的設定會完全覆寫或延伸全域值。
- 若不存在任何設定，防護機制將保持關閉。

import en from "/components/footer/en.mdx";

<en />

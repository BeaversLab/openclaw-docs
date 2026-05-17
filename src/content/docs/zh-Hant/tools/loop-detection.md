---
summary: "如何啟用和調整檢測重複工具呼叫迴圈的防護機制"
title: "工具迴圈檢測"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
  - You hit `compaction_loop_persisted` aborts after a context-overflow retry
---

OpenClaw 擁有兩個協同運作的防護機制，用於應對重複的工具呼叫模式：

1. **迴圈檢測** (`tools.loopDetection.enabled`) — 預設停用。監控滾動工具呼叫紀錄中的重複模式和未知工具重試。
2. **壓縮後防護** (`tools.loopDetection.postCompactionGuard`) — 預設啟用，除非 `tools.loopDetection.enabled` 被明確設為 `false`。在每次壓縮重試後啟動，並在代理於視窗內發出相同的 `(tool, args, result)` 三元組時中止執行。

兩者都在同一個 `tools.loopDetection` 區塊中配置，但只要主開關未明確關閉，壓縮後防護就會執行。設定 `tools.loopDetection.enabled: false` 即可同時停用這兩個機制。

## 存在原因

- 檢測無法取得進展的重複序列。
- 檢測高頻率的無結果迴圈（相同工具、相同輸入、重複錯誤）。
- 針對已知輪詢工具檢測特定的重複呼叫模式。
- 防止「情境溢位 → 壓縮 → 相同迴圈」的循環無限期執行。

## 配置區塊

全域預設值，顯示所有記錄的欄位：

```json5
{
  tools: {
    loopDetection: {
      enabled: false, // master switch for the rolling-history detectors
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      unknownToolThreshold: 10,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
      postCompactionGuard: {
        windowSize: 3, // armed after compaction-retry; runs unless enabled is explicitly false
      },
    },
  },
}
```

單一代理覆寫（可選）：

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

| 欄位                             | 預設值  | 作用                                                                           |
| -------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `enabled`                        | `false` | 滾動歷史紀錄檢測器的主開關。設定 `false` 也會停用壓縮後防護。                  |
| `historySize`                    | `30`    | 保留用於分析的近期工具呼叫數量。                                               |
| `warningThreshold`               | `10`    | 將模式分類為僅警告前的閾值。                                                   |
| `criticalThreshold`              | `20`    | 封鎖重複且無進度迴圈模式的閾值。                                               |
| `unknownToolThreshold`           | `10`    | 在錯過這麼多次後，封鎖對同一個不可用工具的重複呼叫。                           |
| `globalCircuitBreakerThreshold`  | `30`    | 所有偵測器的全域無進度中斷器閾值。                                             |
| `detectors.genericRepeat`        | `true`  | 對重複的相同工具與相同參數模式發出警告，並在相同呼叫也傳回相同結果時進行封鎖。 |
| `detectors.knownPollNoProgress`  | `true`  | 偵測已知的無狀態變化輪詢類模式。                                               |
| `detectors.pingPong`             | `true`  | 偵測交替的乒乓模式。                                                           |
| `postCompactionGuard.windowSize` | `3`     | 保護機制保持啟用的壓縮後工具呼叫次數，以及中止執行的相同三元組計數。           |

對於 `exec`，無進度檢查會比較穩定的指令結果，並忽略易變的執行時期元數據，例如持續時間、PID、工作階段 ID 和工作目錄。當有執行 ID 可用時，最近的工具呼叫歷史記錄僅在該執行內評估，因此排程的心跳週期和新的執行不會繼承先前執行中的過期迴圈計數。

## 建議設定

- 對於較小的模型，請設定 `enabled: true` 並將閾值保持為預設值。旗艦模型很少需要滾動歷史記錄偵測，可以將主開關保持在 `false`，同時仍能從壓縮後保護機制中受益。
- 將閾值保持為 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold` 的順序。
- 如果發生誤報：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`。
  - 選擇性提高 `globalCircuitBreakerThreshold`。
  - 僅停用導致問題的特定偵測器 (`detectors.<name>: false`)。
  - 減少 `historySize` 以放寬歷史記錄上下文的嚴格性。
- 若要停用所有功能 (包括壓縮後保護機制)，請明確設定 `tools.loopDetection.enabled: false`。

## 壓縮後保護機制

當執行器在內容溢出後完成壓縮重試時，它會啟用一個短期保護機制來監視接下來的幾次工具呼叫。如果代理程式在視窗內多次發出相同的 `(toolName, argsHash, resultHash)` 三元組，保護機制將斷定壓縮未打破迴圈，並以 `compaction_loop_persisted` 錯誤中止執行。

此防護措施由主控 `tools.loopDetection.enabled` 標誌控制，但有一個轉折：當標誌未設定或為 `true` 時，它會保持**啟用**，僅在標誌明確設定為 `false` 時才會停用。這是有意為之的。此防護措施的存在是為了逃避否則會消耗無限 token 的壓縮迴圈，因此即使沒有進行設定的使用者也能獲得保護。

```json5
{
  tools: {
    loopDetection: {
      // master switch; set false to disable the guard along with the rolling detectors
      enabled: true,
      postCompactionGuard: {
        windowSize: 3, // default
      },
    },
  },
}
```

- 較低的 `windowSize` 更嚴格（在中止前嘗試次數較少）。
- 較高的 `windowSize` 給予代理程式更多的復原嘗試次數。
- 當結果正在變化時，防護措施絕不會中止，只有在視窗內的結果在位元組上完全相同時才會中止。
- 它是有意設計得狹窄的：它僅在壓縮重試緊接其後的後果中觸發。

<Note>每當主控標誌未明確設定為 `false` 時，即使您從未撰寫過 `tools.loopDetection` 區塊，壓縮後防護措施都會執行。若要驗證，請在壓縮事件之後立即在閘道日誌中尋找 `post-compaction guard armed for N attempts`。</Note>

## 日誌與預期行為

當偵測到迴圈時，OpenClaw 會回報一個迴圈事件，並根據嚴重性抑制或阻擋下一個工具週期。這保護使用者免於失控的 token 消耗和鎖死，同時保留正常的工具存取權。

- 警告會先出現。
- 當模式持續超過警告閾值時，接著會進行抑制。
- 嚴重閾值會阻擋下一個工具週期，並在執行記錄中顯示清晰的迴圈偵測原因。
- 壓縮後防護措施會發出 `compaction_loop_persisted` 錯誤，其中包含造成問題的工具名稱和相同呼叫次數。

## 相關連結

<CardGroup cols={2}>
  <Card title="執行核准" href="/zh-Hant/tools/exec-approvals" icon="shield">
    Shell 執行的允許/拒絕原則。
  </Card>
  <Card title="思考層級" href="/zh-Hant/tools/thinking" icon="brain">
    推理努力層級與供應商原則的互動。
  </Card>
  <Card title="子代理" href="/zh-Hant/tools/subagents" icon="users">
    產生隔離的代理程式以限制失控行為。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 `tools.loopDetection` 結構描述與合併語意。
  </Card>
</CardGroup>

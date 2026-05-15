---
summary: "針對非精確提醒的推斷式後續追蹤記憶"
title: "推斷的承諾"
sidebarTitle: "承諾"
read_when:
  - You want OpenClaw to remember natural follow-ups
  - You want to understand how inferred check-ins differ from reminders
  - You want to review or dismiss follow-up commitments
---

承諾是短暫的後續追蹤記憶。啟用後，OpenClaw 可以察覺對話建立了未來的回報機會，並記得在稍後重新提及。

範例：

- 您提到明天有一場面試。OpenClaw 可能會在事後進行回報。
- 您說您筋疲力盡。OpenClaw 可能會稍後詢問您是否睡覺了。
- 代理程式說它會在某事變更後進行後續追蹤。OpenClaw 可能會追蹤那個未完成的迴圈。

承諾不是像 `MEMORY.md` 這樣的持久性事實，也不是精確的提醒。它們介於記憶與自動化之間：OpenClaw 記住對話相關的義務，然後心跳機制會在到期時傳送它。

## 啟用承諾

承諾預設為關閉。請在設定中啟用它們：

```bash
openclaw config set commitments.enabled true
openclaw config set commitments.maxPerDay 3
```

等效的 `openclaw.json`：

```json
{
  "commitments": {
    "enabled": true,
    "maxPerDay": 3
  }
}
```

`commitments.maxPerDay` 限制了每個代理程式工作階段在滾動的一天內可以傳送多少推斷的後續追蹤。預設值為 `3`。

## 運作方式

在代理程式回覆後，OpenClaw 可能會在獨立的上下文中執行隱藏的背景擷取傳遞。該傳遞僅尋找推斷的後續承諾。它不會寫入可見的對話，也不會要求主要代理程式對擷取進行推理。

當它找到高信度的候選項時，OpenClaw 會儲存包含以下內容的承諾：

- 代理程式 ID
- 工作階段金鑰
- 原始頻道和傳送目標
- 到期時間窗
- 簡短的建議回報
- 供心跳決定是否傳送的非指令性元資料

傳送透過心跳進行。當承諾到期時，心跳會將承諾新增至相同代理程式和頻道範圍的心跳週期。模型可以傳送一個自然的回報或回覆 `HEARTBEAT_OK` 以將其關閉。如果心跳設定為 `target: "none"`，到期的承諾將保持內部狀態，不會傳送外部回報。承諾傳送提示不會重播原始對話文字，且到期承諾的心跳週期在沒有 OpenClaw 工具的情況下執行。

OpenClaw 永遠不會在寫入推斷的承諾後立即傳送它。
到期時間被限制為至少在承諾建立後的一個心跳間隔，因此後續追蹤不會在被推斷出的同一時刻回傳。

## 範圍

承諾的範圍限定在建立它們的確切代理和頻道語境中。在 Discord 與一個代理交談時推斷出的後續追蹤，不會由另一個代理、另一個頻道或無關的會話傳送。

此範圍是該功能的一部分。自然的檢查應該感覺像是同一個對話的延續，而不是一個全域的提醒系統。

## 承諾與提醒的比較

| 需求                                   | 使用                                   |
| -------------------------------------- | -------------------------------------- |
| "在下午 3 點提醒我"                    | [已排程任務](/zh-Hant/automation/cron-jobs) |
| "在 20 分鐘後傳送通知給我"             | [已排程任務](/zh-Hant/automation/cron-jobs) |
| "每個工作日執行此報告"                 | [已排程任務](/zh-Hant/automation/cron-jobs) |
| "我明天有一個面試"                     | 承諾                                   |
| "我整晚都沒睡"                         | 承諾                                   |
| "如果我不回覆這個開放的執行緒，請跟進" | 承諾                                   |

精確的使用者請求已屬於排程器路徑。承諾僅用於推斷的後續追蹤：即使用者未要求提醒，但對話明確產生了有用的未來檢查時刻。

## 管理承諾

使用 CLI 來檢查和清除已儲存的承諾：

```bash
openclaw commitments
openclaw commitments --all
openclaw commitments --agent main
openclaw commitments --status snoozed
openclaw commitments dismiss cm_abc123
```

請參閱 [`openclaw commitments`](/zh-Hant/cli/commitments) 以取得指令參考。

## 隱私與成本

承諾提取使用 LLM 過程，因此啟用它會在符合條件的回合後增加背景模型使用量。該過程對使用者可見的對話是隱藏的，但它可以讀取決定是否存在後續追蹤所需的近期交換內容。

已儲存的承諾是本機 OpenClaw 狀態。它們是操作記憶體，而非長期記憶體。請使用以下方式停用該功能：

```bash
openclaw config set commitments.enabled false
```

## 疑難排解

如果預期的後續追蹤沒有出現：

- 確認 `commitments.enabled` 為 `true`。
- 檢查 `openclaw commitments --all` 中的待處理、已解散、已延後或已過期
  記錄。
- 確保代理的心跳正在執行。
- 檢查該代理會話是否已達到 `commitments.maxPerDay`。
- 請記住，精確的提醒會在承諾提取過程中被跳過，應改為出現在[排程任務](/zh-Hant/automation/cron-jobs)下。

## 相關

- [記憶概覽](/zh-Hant/concepts/memory)
- [主動記憶](/zh-Hant/concepts/active-memory)
- [Heartbeat](/zh-Hant/gateway/heartbeat)
- [排程任務](/zh-Hant/automation/cron-jobs)
- [`openclaw commitments`](/zh-Hant/cli/commitments)
- [組態參考](/zh-Hant/gateway/configuration-reference#commitments)

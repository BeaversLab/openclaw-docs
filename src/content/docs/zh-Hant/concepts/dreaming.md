---
title: "做夢（實驗性）"
summary: "包含淺層、深層與 REM 階段的背景記憶整合，以及夢境日記"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# 做夢（實驗性功能）

做夢是 `memory-core` 中的背景記憶整合系統。
它能協助 OpenClaw 將強大的短期訊號轉移至持久記憶，同時
保持過程的可解釋性與可審閱性。

做夢功能是 **選用 (opt-in)** 的，預設為停用。

## 做夢寫入的內容

做夢會保留兩種輸出：

- `memory/.dreams/` 中的 **機器狀態**（回溯儲存、階段訊號、攝入檢查點、鎖定）。
- `DREAMS.md`（或現有的 `dreams.md`）中的 **人類可讀輸出**，以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的選用階段報告檔案。

長期晉升仍僅寫入 `MEMORY.md`。

## 階段模型

做夢使用三個協作階段：

| 階段 | 目的                     | 持久寫入         |
| ---- | ------------------------ | ---------------- |
| 輕度 | 排序並暫存最近的短期素材 | 否               |
| 深度 | 評分並提升持久候選項目   | 是 (`MEMORY.md`) |
| REM  | 反思主題和重複出現的想法 | 否               |

這些階段是內部實作細節，並非分開的「模式」
供使用者設定。

### 輕度階段

輕度階段會攝入最近的每日記憶訊號和回憶追蹤，對其進行去重，
並暫存候選行。

- 從短期回憶狀態和最近的每日記憶檔案讀取。
- 當儲存包含內聯輸出時，會寫入受管理的 `## Light Sleep` 區塊。
- 記錄強化訊號以供稍後的深度排名使用。
- 絕不寫入 `MEMORY.md`。

### 深度階段

深度階段決定什麼內容會成為長期記憶。

- 使用加權評分和閾值門檻來排列候選項目。
- 需要 `minScore`、`minRecallCount` 和 `minUniqueQueries` 通過。
- 在寫入之前，從即時的每日檔案中重新還原片段，因此會跳過過時/已刪除的片段。
- 將晉升的條目附加到 `MEMORY.md`。
- 將 `## Deep Sleep` 摘要寫入 `DREAMS.md`，並選擇性寫入 `memory/dreaming/deep/YYYY-MM-DD.md`。

### REM 階段

REM 階段提取模式和反思訊號。

- 根據最近的短期追蹤記錄，建立主題與反思摘要。
- 當儲存包含內聯輸出時，會寫入受管理的 `## REM Sleep` 區塊。
- 記錄深度排名所使用的 REM 增強訊號。
- 絕不寫入 `MEMORY.md`。

## 夢日記

做夢也會在 `DREAMS.md` 中保持一份敘事式的 **夢境日記**。
在每個階段累積足夠素材後，`memory-core` 會執行盡力的背景
子代理輪次（使用預設執行期模型）並附加一則簡短的日記條目。

這份日記是專供人類在 Dreams UI 中閱讀的，並非促進來源。

## 深度排名訊號

深度排名使用六個加權基礎訊號加上階段增強：

| 訊號       | 權重 | 描述                          |
| ---------- | ---- | ----------------------------- |
| 頻率       | 0.24 | 該條目累積了多少短期訊號      |
| 相關性     | 0.30 | 該條目的平均檢索品質          |
| 查詢多樣性 | 0.15 | 呈現該條目的不同查詢/日期情境 |
| 近時性     | 0.15 | 隨時間衰減的新鮮度分數        |
| 鞏固度     | 0.10 | 多日重複出現的強度            |
| 概念豐富度 | 0.06 | 來自片段/路徑的概念標籤密度   |

淺層和 REM 階段的命中會從
`memory/.dreams/phase-signals.json` 增加少量的近期遞減加成。

## 排程

啟用後，`memory-core` 會自動管理一個 cron 任務以進行完整的做夢
掃描。每次掃描會依序執行各階段：light -> REM -> deep。

預設週期行為：

| 設定                 | 預設值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |

## 快速開始

啟用夢境機制：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

使用自訂掃描週期啟用夢境機制：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "timezone": "America/Los_Angeles",
            "frequency": "0 */6 * * *"
          }
        }
      }
    }
  }
}
```

## 斜線指令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流程

使用 CLI 促進功能進行預覽或手動套用：

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

手動 `memory promote` 預設使用深層階段閾值，除非使用
CLI 旗標覆寫。

解釋為什麼特定候選項會或不會晉升：

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

預覽 REM 反思、候選事實和深度提升輸出，而不寫入任何內容：

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## 關鍵預設值

所有設定都位於 `plugins.entries.memory-core.config.dreaming` 之下。

| 鍵          | 預設值      |
| ----------- | ----------- |
| `enabled`   | `false`     |
| `frequency` | `0 3 * * *` |

階段策略、閾值和儲存行為是內部實作細節（非使用者面向的設定）。

請參閱 [Memory configuration reference](/en/reference/memory-config#dreaming-experimental)
以取得完整的鍵列表。

## Dreams 使用者介面

啟用後，Gateway 的 **Dreams** 分頁會顯示：

- 目前的啟用狀態
- 階段層級狀態和受控掃描的存在
- 短期、長期和今日提升的計數
- 下次預定執行的時間
- 可展開的夢境日記閱讀器，由 `doctor.memory.dreamDiary` 支援

## 相關

- [記憶](/en/concepts/memory)
- [記憶搜尋](/en/concepts/memory-search)
- [memory CLI](/en/cli/memory)
- [Memory configuration reference](/en/reference/memory-config)

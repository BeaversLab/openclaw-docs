---
summary: "CLI 參考資料，用於 `openclaw memory` (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "memory"
---

# `openclaw memory`

管理語意記憶索引與搜尋。
由啟用的記憶外掛程式提供（預設：`memory-core`；設定 `plugins.slots.memory = "none"` 以停用）。

相關：

- 記憶概念：[記憶](/en/concepts/memory)
- 記憶 Wiki：[記憶 Wiki](/en/plugins/memory-wiki)
- Wiki CLI：[wiki](/en/cli/wiki)
- 外掛程式：[外掛程式](/en/tools/plugin)

## 範例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory status --fix
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory promote --limit 10 --min-score 0.75
openclaw memory promote --apply
openclaw memory promote --json --min-recall-count 0 --min-unique-queries 0
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
openclaw memory rem-harness
openclaw memory rem-harness --json
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 選項

`memory status` 和 `memory index`：

- `--agent <id>`：將範圍限制為單一代理程式。若未指定，這些指令將針對每個已設定的代理程式執行；如果未設定代理程式清單，則會回退為預設代理程式。
- `--verbose`：在探測和索引期間輸出詳細記錄。

`memory status`：

- `--deep`：探測向量 + 嵌入可用性。
- `--index`：如果儲存空間已變更（髒資料），則執行重新索引（隱含 `--deep`）。
- `--fix`：修復過期的召回鎖定並正規化升級中繼資料。
- `--json`：列印 JSON 輸出。

`memory index`：

- `--force`：強制執行完整重新索引。

`memory search`：

- 查詢輸入：傳遞位置參數 `[query]` 或 `--query <text>`。
- 如果兩者都提供，則以 `--query` 為準。
- 如果兩者都未提供，指令將以錯誤碼結束。
- `--agent <id>`：將範圍限制為單一代理程式（預設：預設代理程式）。
- `--max-results <n>`：限制傳回的結果數量。
- `--min-score <n>`：過濾掉低分數的相符項目。
- `--json`：列印 JSON 結果。

`memory promote`：

預覽並套用短期記憶升級。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 將升級寫入 `MEMORY.md`（預設：僅預覽）。
- `--limit <n>` -- 限制顯示的候選數量。
- `--include-promoted` -- 包含先前週期中已提升的條目。

完整選項：

- 使用加權提升信號 (`frequency`, `relevance`, `query diversity`, `recency`, `consolidation`, `conceptual richness`) 對 `memory/YYYY-MM-DD.md` 中的短期候選進行排序。
- 使用來自記憶檢索和每日攝入通過的短期信號，以及輕度/REM 階段增強信號。
- 啟用夢境時，`memory-core` 會自動管理一個 cron 任務，該任務會在後台執行完整掃描 (`light -> REM -> deep`)（無需手動 `openclaw cron add`）。
- `--agent <id>`：範圍限制於單一代理（預設：預設代理）。
- `--limit <n>`：傳回/套用的候選最大數量。
- `--min-score <n>`：最低加權提升分數。
- `--min-recall-count <n>`：候選所需的最低檢索次數。
- `--min-unique-queries <n>`：候選所需的最低不同查詢數量。
- `--apply`：將選定的候選附加到 `MEMORY.md` 並將其標記為已提升。
- `--include-promoted`：在輸出中包含已提升的候選。
- `--json`：列印 JSON 輸出。

`memory promote-explain`：

解釋特定的提升候選及其分數細節。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查詢的候選鍵、路徑片段或程式碼片段。
- `--agent <id>`：範圍限制於單一代理（預設：預設代理）。
- `--include-promoted`：包含已提升的候選。
- `--json`：列印 JSON 輸出。

`memory rem-harness`：

預覽 REM 反思、候選事實和深度提升輸出，而不寫入任何內容。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：範圍限制於單一代理（預設：預設代理）。
- `--include-promoted`：包含已提升的深度候選。
- `--json`：列印 JSON 輸出。

## 夢境（實驗性）

夢境是後台記憶整合系統，包含三個協作階段：**淺層**（sort/stage 短期素材）、**深層**（promote 持久事實至 `MEMORY.md`），以及 **REM**（reflect and surface themes）。

- 透過 `plugins.entries.memory-core.config.dreaming.enabled: true` 啟用。
- 從聊天中使用 `/dreaming on|off` 切換（或使用 `/dreaming status` 檢查）。
- 夢境在一個管理的排程執行（`dreaming.frequency`）上運行，並按順序執行階段：淺層、REM、深層。
- 只有深層階段會將持久記憶寫入 `MEMORY.md`。
- 人類可讀的階段輸出和日記條目會寫入 `DREAMS.md`（或現有的 `dreams.md`），並在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中提供可選的各階段報告。
- 排名使用加權信號：回憶頻率、檢索相關性、查詢多樣性、時間近度、跨天整合，以及衍生概念豐富度。
- 在寫入 `MEMORY.md` 之前，晉升會重新讀取即時每日筆記，因此已編輯或刪除的短期片段不會從過時的回憶儲存快照中晉升。
- 排程和手動 `memory promote` 執行共用相同的深層階段預設值，除非您傳遞 CLI 閾值覆蓋。
- 自動執行會分散到已配置的記憶工作區。

預設排程：

- **掃描頻率**：`dreaming.frequency = 0 3 * * *`
- **深層閾值**：`minScore=0.8`、`minRecallCount=3`、`minUniqueQueries=3`、`recencyHalfLifeDays=14`、`maxAgeDays=30`

範例：

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

注意：

- `memory index --verbose` 會列印各階段詳情（提供者、模型、來源、批次活動）。
- `memory status` 包含透過 `memorySearch.extraPaths` 配置的任何額外路徑。
- 如果有效的作用中記憶遠端 API 金鑰欄位配置為 SecretRefs，指令會從作用中閘道快照解析這些值。如果閘道無法使用，指令會快速失敗。
- 閘道版本差異注意：此指令路徑需要支援 `secrets.resolve` 的閘道；較舊的閘道會傳回未知方法錯誤。
- 使用 `dreaming.frequency` 調整計劃掃描的頻率。深度提升策略在內部是固定的；當您需要一次性手動覆蓋時，請在 `memory promote` 上使用 CLI 旗標。
- 請參閱 [Dreaming](/en/concepts/dreaming) 以了解完整的階段描述和配置參考。

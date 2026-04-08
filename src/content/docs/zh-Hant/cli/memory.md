---
summary: "`openclaw memory` (status/index/search/promote) 的 CLI 參考"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "memory"
---

# `openclaw memory`

管理語意記憶索引與搜尋。
由啟用的記憶外掛程式提供 (預設為 `memory-core`；設定 `plugins.slots.memory = "none"` 以停用)。

相關：

- 記憶概念：[記憶](/en/concepts/memory)
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
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 選項

`memory status` 和 `memory index`：

- `--agent <id>`：將範圍限定在單一代理程式。若未指定，這些指令會對每個已設定的代理程式執行；若未設定代理程式清單，則會退回至預設代理程式。
- `--verbose`：在探測和索引期間輸出詳細記錄。

`memory status`：

- `--deep`：探測向量 + 嵌入可用性。
- `--index`：如果儲存處於髒狀態，則執行重新索引 (隱含 `--deep`)。
- `--fix`：修復過期的召回鎖定並標準化升級中繼資料。
- `--json`：列印 JSON 輸出。

`memory index`：

- `--force`：強制執行完整重新索引。

`memory search`：

- 查詢輸入：傳遞位置 `[query]` 或 `--query <text>`。
- 如果兩者都有提供，則以 `--query` 為準。
- 如果未提供任何一項，該指令會以錯誤狀態結束。
- `--agent <id>`：將範圍限定在單一代理程式 (預設為預設代理程式)。
- `--max-results <n>`：限制傳回的結果數量。
- `--min-score <n>`：篩選掉低分數的相符項目。
- `--json`：列印 JSON 結果。

`memory promote`：

預覽並套用短期記憶升級。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 將升級寫入 `MEMORY.md` (預設為僅預覽)。
- `--limit <n>` -- 限制顯示的候選項目數量。
- `--include-promoted` -- 包含先前週期中已升級的項目。

完整選項：

- 使用加權晉升信號 (`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`) 對來自 `memory/YYYY-MM-DD.md` 的短期候選項進行排序。
- 使用來自記憶回憶和每日攝入階段的短期信號，加上淺層/REM 階段強化信號。
- 當啟用夢境功能時，`memory-core` 會自動管理一個在背景執行完整掃描 (`light -> REM -> deep`) 的 cron 任務 (無需手動 `openclaw cron add`)。
- `--agent <id>`：將範圍限制為單一代理程式 (預設：預設代理程式)。
- `--limit <n>`：要傳回/套用的候選項數量上限。
- `--min-score <n>`：最低加權晉升分數。
- `--min-recall-count <n>`：候選項所需的最低回憶次數。
- `--min-unique-queries <n>`：候選項所需的最低不同查詢次數。
- `--apply`：將選取的候選項附加到 `MEMORY.md` 並將其標記為已晉升。
- `--include-promoted`：在輸出中包含已晉升的候選項。
- `--json`：列印 JSON 輸出。

## 夢境 (實驗性)

夢境是背景記憶整合系統，具有三個協作階段：**淺層** (排序/暫存短期資料)、**深層** (將持久事實晉升到 `MEMORY.md`) 以及 **REM** (反思並呈現主題)。

- 使用 `plugins.entries.memory-core.config.dreaming.enabled: true` 啟用。
- 從聊天中使用 `/dreaming on|off` 切換 (或使用 `/dreaming status` 檢查)。
- 夢境依據一個管理的掃描時程表 (`dreaming.frequency`) 執行，並依序執行各階段：淺層、REM、深層。
- 只有深層階段會將持久記憶寫入 `MEMORY.md`。
- 人類可讀的階段輸出和日記條目會寫入 `DREAMS.md` (或現有的 `dreams.md`)，並可選地在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中提供每階段報告。
- 排名使用加權信號：回憶頻率、檢索相關性、查詢多樣性、時間近度、跨天整合以及衍生概念的豐富度。
- 在寫入 `MEMORY.md` 之前，提升會重新讀取即時的每日筆記，因此已編輯或已刪除的短期片段不會從過時的回憶儲存快照中被提升。
- 排程和手動 `memory promote` 執行共用相同的深度階段預設值，除非您傳遞 CLI 臨界值覆寫。
- 自動執行會分散到已配置的記憶體工作區。

預設排程：

- **掃描頻率**：`dreaming.frequency = 0 3 * * *`
- **深度臨界值**：`minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

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

- `memory index --verbose` 會列印每階段的詳細資訊（提供者、模型、來源、批次活動）。
- `memory status` 包含透過 `memorySearch.extraPaths` 配置的任何額外路徑。
- 如果實際生效的記憶體遠端 API 金鑰欄位配置為 SecretRefs，該指令會從有效閘道快照中解析這些數值。如果閘道無法使用，該指令會快速失敗。
- 閘道版本差異說明：此指令路徑需要支援 `secrets.resolve` 的閘道；較舊的閘道會傳回未知方法錯誤。
- 使用 `dreaming.frequency` 調整排程掃描頻率。深度提升策略原為內部機制；當您需要一次性手動覆寫時，請在 `memory promote` 上使用 CLI 標誌。
- 有關完整的階段描述和配置參考，請參閱 [Dreaming](/en/concepts/dreaming)。

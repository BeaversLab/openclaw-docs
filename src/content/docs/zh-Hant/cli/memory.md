---
summary: "CLI 參考資料，用於 `openclaw memory` (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You're debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "記憶"
---

# `openclaw memory`

管理語意記憶索引與搜尋。
由內建的 `memory-core` 外掛提供。當 `plugins.slots.memory` 選擇 `memory-core`（預設值）時，此指令可用；其他記憶外掛會公開其專屬的 CLI 命名空間。

相關：

- 記憶概念：[Memory](/zh-Hant/concepts/memory)
- 記憶 Wiki：[Memory Wiki](/zh-Hant/plugins/memory-wiki)
- Wiki CLI：[wiki](/zh-Hant/cli/wiki)
- 外掛程式：[Plugins](/zh-Hant/tools/plugin)

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

- `--agent <id>`：將範圍限制在單一代理程式。若未指定，這些指令會針對每個已設定的代理程式執行；如果未設定代理程式清單，則會退回至預設代理程式。
- `--verbose`：在探查和索引期間輸出詳細日誌。

`memory status`：

- `--deep`：探查本機向量存放區就緒狀態、嵌入提供者就緒狀態，以及語意向量搜尋就緒狀態。純 `memory status` 保持快速，不會執行即時嵌入或提供者探索工作；未知的向量存放區或語意向量狀態表示在該指令中未進行探查。QMD 詞彙 `searchMode: "search"` 即使使用 `--deep` 也會跳過語意向量探查和嵌入維護。
- `--index`：如果存放區髒了則執行重新索引（暗示 `--deep`）。
- `--fix`：修復過期的召回鎖定並正規化提升元資料。
- `--json`：列印 JSON 輸出。

如果 `memory status` 顯示 `Dreaming status: blocked`，表示受控的夢境定時任務 (cron) 已啟用，但驅動它的心跳針對預設代理程式 並未觸發。關於兩個常見原因，請參閱 [Dreaming never runs](/zh-Hant/concepts/dreaming#dreaming-never-runs-status-shows-blocked)。

`memory index`：

- `--force`：強制執行完整的重新索引。

`memory search`：

- 查詢輸入：傳遞位置參數 `[query]` 或 `--query <text>`。
- 如果兩者都有提供，則以 `--query` 為準。
- 如果兩者都未提供，該指令將以錯誤結束。
- `--agent <id>`：限定到單一代理（預設：預設代理）。
- `--max-results <n>`：限制返回的結果數量。
- `--min-score <n>`：過濾掉低分匹配項。
- `--json`：列印 JSON 結果。

`memory promote`：

預覽並套用短期記憶晉升。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 將提昇內容寫入 `MEMORY.md`（預設：僅預覽）。
- `--limit <n>` -- 限制顯示的候選數量。
- `--include-promoted` -- 包含在先前週期中已提昇的條目。

完整選項：

- 使用加權提昇訊號（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`）對 `memory/YYYY-MM-DD.md` 中的短期候選進行排序。
- 使用來自記憶召回和每日攝入階段的短期信號，加上淺層/REM 階段增強信號。
- 當啟用夢境時，`memory-core` 會自動管理一個 cron 任務，在後台執行完整掃描（`light -> REM -> deep`）（無需手動 `openclaw cron add`）。
- `--agent <id>`：限定到單一代理（預設：預設代理）。
- `--limit <n>`：傳回/套用的最大候選數量。
- `--min-score <n>`：最低加權提昇分數。
- `--min-recall-count <n>`：候選所需的最低召回次數。
- `--min-unique-queries <n>`：候選所需的最低不同查詢次數。
- `--apply`：將選取的候選附加到 `MEMORY.md` 並將其標記為已提昇。
- `--include-promoted`：在輸出中包含已提昇的候選。
- `--json`：列印 JSON 輸出。

`memory promote-explain`：

解釋特定的推廣候選項目及其分數細項。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查找的候選鍵、路徑片段或摘要片段。
- `--agent <id>`：限定到單一代理（預設：預設代理）。
- `--include-promoted`：包含已提昇的候選。
- `--json`：列印 JSON 輸出。

`memory rem-harness`：

預覽 REM 反思、候選事實以及深度推廣輸出，而不寫入任何內容。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：限定到單一代理（預設：預設代理）。
- `--include-promoted`：包含已提升的深度候選。
- `--json`：列印 JSON 輸出。

## 夢境

Dreaming 是一個包含三個協作階段的背景記憶整合系統：**light**（排序/暫存短期素材）、**deep**（將持久事實提升至 `MEMORY.md`），以及 **REM**（反思並浮現主題）。

- 使用 `plugins.entries.memory-core.config.dreaming.enabled: true` 啟用。
- 從聊天中使用 `/dreaming on|off` 切換（或使用 `/dreaming status` 檢查）。
- Dreaming 依據一個受管理的掃描時程（`dreaming.frequency`）執行，並按順序執行各階段：light、REM、deep。
- 只有 deep 階段會將持久記憶寫入 `MEMORY.md`。
- 人類可讀的階段輸出和日記條目會寫入 `DREAMS.md`（或現有的 `dreams.md`），並可選擇在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中提供各階段的報告。
- 排名使用加權訊號：回憶頻率、檢索相關性、查詢多樣性、時間近度、跨日合併以及衍生的概念豐富度。
- 在寫入 `MEMORY.md` 之前，提升機制會重新讀取即時的每日筆記，因此已編輯或刪除的短期片段不會從過時的回溯儲存快照中被提升。
- 排程和手動的 `memory promote` 執行共用相同的 deep 階段預設值，除非您傳遞 CLI 臨界值覆寫。
- 自動執行會分散在設定的記憶工作區上。

預設排程：

- **掃描頻率**：`dreaming.frequency = 0 3 * * *`
- **Deep 臨界值**：`minScore=0.8`、`minRecallCount=3`、`minUniqueQueries=3`、`recencyHalfLifeDays=14`、`maxAgeDays=30`

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

備註：

- `memory index --verbose` 會列印各階段的詳細資訊（提供者、模型、來源、批次活動）。
- `memory status` 包含透過 `memorySearch.extraPaths` 設定的任何額外路徑。
- 如果有效的作用中記憶遠端 API 金鑰欄位設定為 SecretRefs，指令會從作用中的閘道快照解析這些值。如果閘道無法使用，指令會快速失敗。
- Gateway 版本差異說明：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 會傳回未知方法的錯誤。
- 使用 `dreaming.frequency` 調整排程的掃描頻率。深度提升策略 原則上為內部機制，但 `dreaming.phases.deep.maxPromotedSnippetTokens` 除外，它會限制已提升片段的長度，同時保持來源可見。當您需要一次性手動閾值覆寫時，請使用 `memory promote` 上的 CLI 標誌。
- `memory rem-harness --path <file-or-dir> --grounded` 會預覽來自歷史每日筆記的具基礎依據的 `What Happened`、`Reflections` 和 `Possible Lasting Updates`，而不會寫入任何內容。
- `memory rem-backfill --path <file-or-dir>` 會將可還原的具基礎依據的日記條目寫入 `DREAMS.md` 以供 UI 檢閱。
- `memory rem-backfill --path <file-or-dir> --stage-short-term` 也會將具基礎依據的持久候選者 加入到即時的短期提升存放區 中，以便正常的深度階段可以對其進行排名。
- `memory rem-backfill --rollback` 會移除先前寫入的具基礎依據的日記條目，而 `memory rem-backfill --rollback-short-term` 會移除先前暫存的具基礎依據的短期候選者。
- 關於完整的階段描述與設定參考，請參閱 [Dreaming](/zh-Hant/concepts/dreaming)。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [記憶概覽](/zh-Hant/concepts/memory)

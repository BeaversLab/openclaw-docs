---
summary: "CLI 參考資料，用於 `openclaw memory` (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "記憶"
---

# `openclaw memory`

管理語意記憶索引與搜尋。
由啟用的記憶外掛程式提供（預設：`memory-core`；設定 `plugins.slots.memory = "none"` 以停用）。

相關：

- 記憶概念：[記憶](/zh-Hant/concepts/memory)
- 記憶 Wiki：[記憶 Wiki](/zh-Hant/plugins/memory-wiki)
- Wiki CLI：[wiki](/zh-Hant/cli/wiki)
- 外掛程式：[外掛程式](/zh-Hant/tools/plugin)

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

- `--deep`：探測向量 + 嵌入可用性。純 `memory status` 保持快速，不會執行即時嵌入檢查。QMD 詞彙 `searchMode: "search"` 會跳過語意向量探測和嵌入維護，即使有 `--deep` 也一樣。
- `--index`：如果儲存空間髒了則執行重新索引（暗示 `--deep`）。
- `--fix`：修復過期的召回鎖並正規化提升元資料。
- `--json`：列印 JSON 輸出。

如果 `memory status` 顯示 `Dreaming status: blocked`，則表示受管理的夢境 cron 已啟用，但驅動它的心跳未針對預設代理程式觸發。請參閱 [Dreaming never runs](/zh-Hant/concepts/dreaming#dreaming-never-runs-status-shows-blocked) 以了解兩個常見原因。

`memory index`：

- `--force`：強制執行完整重新索引。

`memory search`：

- 查詢輸入：傳遞位置參數 `[query]` 或 `--query <text>`。
- 如果兩者都有提供，則 `--query` 優先。
- 如果兩者都未提供，該指令將以錯誤結束。
- `--agent <id>`：範圍限制在單一代理程式（預設：預設代理程式）。
- `--max-results <n>`：限制傳回的結果數量。
- `--min-score <n>`：篩選掉低分匹配項。
- `--json`：列印 JSON 結果。

`memory promote`：

預覽並套用短期記憶晉升。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 將提升內容寫入 `MEMORY.md`（預設：僅預覽）。
- `--limit <n>` -- 限制顯示的候選數量。
- `--include-promoted` -- 包含先前週期中已提升的項目。

完整選項：

- 使用加權晉升信號（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`），對來自 `memory/YYYY-MM-DD.md` 的短期候選項進行排名。
- 使用來自記憶召回和每日攝入階段的短期信號，加上淺層/REM 階段增強信號。
- 啟用夢境功能時，`memory-core` 會自動管理一個在背景執行完整掃描（`light -> REM -> deep`）的 cron 工作（無需手動 `openclaw cron add`）。
- `--agent <id>`：將範圍限定於單一代理程式（預設為預設代理程式）。
- `--limit <n>`：要傳回/套用的最大候選項數量。
- `--min-score <n>`：最低加權晉升分數。
- `--min-recall-count <n>`：候選項所需的最低召回次數。
- `--min-unique-queries <n>`：候選項所需的最低不同查詢計數。
- `--apply`：將選定的候選項附加到 `MEMORY.md` 並將其標記為已晉升。
- `--include-promoted`：在輸出中包含已晉升的候選項。
- `--json`：列印 JSON 輸出。

`memory promote-explain`：

解釋特定的推廣候選項目及其分數細項。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查詢的候選項金鑰、路徑片段或程式碼片段。
- `--agent <id>`：將範圍限定於單一代理程式（預設為預設代理程式）。
- `--include-promoted`：包含已晉升的候選項。
- `--json`：列印 JSON 輸出。

`memory rem-harness`：

預覽 REM 反思、候選事實以及深度推廣輸出，而不寫入任何內容。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：將範圍限定於單一代理程式（預設為預設代理程式）。
- `--include-promoted`：包含已晉升的深度候選項。
- `--json`：列印 JSON 輸出。

## 夢境

夢境是具有三個協作階段的背景記憶整合系統：**輕度**（排序/暫存短期素材）、**深度**（將持久事實晉升至 `MEMORY.md`）和 **REM**（反思並浮現主題）。

- 使用 `plugins.entries.memory-core.config.dreaming.enabled: true` 啟用。
- 從聊天中使用 `/dreaming on|off` 切換（或使用 `/dreaming status` 檢查）。
- 夢境（Dreaming）在單一管理的掃描排程（`dreaming.frequency`）上運行，並依序執行各階段：輕度、快速眼動（REM）、深度。
- 只有深度階段會將持久記憶寫入 `MEMORY.md`。
- 人類可讀的階段輸出和日記條目會寫入 `DREAMS.md`（或現有的 `dreams.md`），並在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中提供選用的各階段報告。
- 排名使用加權訊號：回憶頻率、檢索相關性、查詢多樣性、時間近度、跨日合併以及衍生的概念豐富度。
- 提昇機制在寫入 `MEMORY.md` 之前會重新讀取即時的每日筆記，因此已編輯或刪除的短期片段不會從過時的召回儲存庫（recall-store）快照中被提昇。
- 排程和手動 `memory promote` 執行共用相同的深度階段預設值，除非您傳入 CLI 閾值覆寫參數。
- 自動執行會分散在設定的記憶工作區上。

預設排程：

- **掃描頻率**：`dreaming.frequency = 0 3 * * *`
- **深度閾值**：`minScore=0.8`、`minRecallCount=3`、`minUniqueQueries=3`、`recencyHalfLifeDays=14`、`maxAgeDays=30`

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
- 閘道版本差異說明：此指令路徑需要支援 `secrets.resolve` 的閘道；舊版閘道會傳回未知方法（unknown-method）錯誤。
- 使用 `dreaming.frequency` 調整排程掃描頻率。深度提昇策略在內部處理；當您需要一次性手動覆寫時，請在 `memory promote` 上使用 CLI 標誌。
- `memory rem-harness --path <file-or-dir> --grounded` 會在不寫入任何內容的情況下，預覽來自歷史每日筆記的可落地 `What Happened`、`Reflections` 和 `Possible Lasting Updates`。
- `memory rem-backfill --path <file-or-dir>` 會將可還原的可落地日記條目寫入 `DREAMS.md` 以供 UI 檢閱。
- `memory rem-backfill --path <file-or-dir> --stage-short-term` 也會將可落地的持久候選項目植入即時的短期提昇儲存庫，以便正常的深度階段對其進行排名。
- `memory rem-backfill --rollback` 會移除先前寫入的可落地日記條目，而 `memory rem-backfill --rollback-short-term` 會移除先前暫存的可落地短期候選項目。
- 請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以取得完整的階段描述和設定參考。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [記憶體概覽](/zh-Hant/concepts/memory)

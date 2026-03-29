---
summary: "CLI 參考資料：`openclaw memory` (status/index/search)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
title: "memory"
---

# `openclaw memory`

管理語意記憶體索引與搜尋。
由啟用的記憶體外掛程式提供（預設：`memory-core`；設定 `plugins.slots.memory = "none"` 以停用）。

相關：

- 記憶體概念：[記憶體](/en/concepts/memory)
- 外掛程式：[外掛程式](/en/tools/plugin)

## 範例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 選項

`memory status` 和 `memory index`：

- `--agent <id>`：將範圍限定為單一代理程式。若未指定，這些指令會針對每個已設定的代理程式執行；若未設定代理程式清單，則會退回至預設代理程式。
- `--verbose`：在探查和索引期間輸出詳細記錄。

`memory status`：

- `--deep`：探查向量與嵌入可用性。
- `--index`：如果存放區已變更，則執行重新索引（隱含 `--deep`）。
- `--json`：列印 JSON 輸出。

`memory index`：

- `--force`：強制執行完整重新索引。

`memory search`：

- 查詢輸入：傳遞位置 `[query]` 或 `--query <text>`。
- 如果兩者都有提供，以 `--query` 為準。
- 如果都未提供，指令會以錯誤狀態結束。
- `--agent <id>`：將範圍限定為單一代理程式（預設為預設代理程式）。
- `--max-results <n>`：限制傳回的結果數量。
- `--min-score <n>`：篩選掉低分數的匹配項。
- `--json`：列印 JSON 結果。

備註：

- `memory index --verbose` 會列印各階段的詳細資訊（提供者、模型、來源、批次活動）。
- `memory status` 包含透過 `memorySearch.extraPaths` 設定的任何額外路徑。
- 如果實際生效的記憶體遠端 API 金鑰欄位設定為 SecretRefs，該指令會從啟用的閘道快照中解析這些值。如果閘道無法使用，該指令會快速失敗。
- Gateway 版本偏斜說明：此指令路徑需要支援 `secrets.resolve` 的 gateway；較舊的 gateway 會傳回 unknown-method 錯誤。

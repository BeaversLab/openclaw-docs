---
summary: "`openclaw memory` (status/index/search) 的 CLI 參考"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
title: "memory"
---

# `openclaw memory`

管理語意記憶體索引與搜尋。
由現用的記憶體外掛提供（預設為 `memory-core`；請設定 `plugins.slots.memory = "none"` 以停用）。

相關：

- 記憶體概念：[記憶體](/zh-Hant/concepts/memory)
- 外掛：[外掛](/zh-Hant/tools/plugin)

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

- `--agent <id>`：將範圍限定至單一代理程式。若未指定，這些指令會對每個已設定的代理程式執行；若未設定代理程式清單，則會回退至預設代理程式。
- `--verbose`：在探測和索引期間輸出詳細日誌。

`memory status`：

- `--deep`：探測向量 + 嵌入可用性。
- `--index`：如果存放區已變更，請執行重新索引（隱含 `--deep`）。
- `--json`：列印 JSON 輸出。

`memory index`：

- `--force`：強制執行完整重新索引。

`memory search`：

- 查詢輸入：傳遞位置 `[query]` 或 `--query <text>`。
- 如果同時提供兩者，`--query` 優先。
- 如果兩者皆未提供，指令會結束並回報錯誤。
- `--agent <id>`：將範圍限定至單一代理程式（預設為預設代理程式）。
- `--max-results <n>`：限制傳回的結果數量。
- `--min-score <n>`：篩選掉低分數的相符項目。
- `--json`：列印 JSON 結果。

注意事項：

- `memory index --verbose` 會列印各階段的詳細資訊（提供者、模型、來源、批次活動）。
- `memory status` 包含透過 `memorySearch.extraPaths` 設定的任何額外路徑。
- 若實際生效的遠端記憶體 API 金鑰欄位設定為 SecretRefs，指令會從現用的閘道快照中解析這些值。若閘道無法使用，指令會快速失敗。
- 網關版本差異提示：此指令路徑需要支援 `secrets.resolve` 的網關；舊版網關會回傳 unknown-method 錯誤。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

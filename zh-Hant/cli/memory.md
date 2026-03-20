---
summary: "`openclaw memory`（狀態/索引/搜尋）的 CLI 參考"
read_when:
  - 您想要索引或搜尋語意記憶
  - 您正在偵錯記憶體可用性或索引
title: "memory"
---

# `openclaw memory`

管理語意記憶索引與搜尋。
由作用中的記憶體外掛提供（預設：`memory-core`；設定 `plugins.slots.memory = "none"` 以停用）。

相關：

- 記憶概念：[Memory](/zh-Hant/concepts/memory)
- 外掛：[Plugins](/zh-Hant/tools/plugin)

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

- `--agent <id>`：將範圍限制在單一代理程式。若沒有它，這些指令會針對每個已設定的代理程式執行；如果未設定代理程式清單，則會回退至預設代理程式。
- `--verbose`：在探測和索引期間輸出詳細日誌。

`memory status`：

- `--deep`：探查向量 + 嵌入可用性。
- `--index`：如果存儲髒了則運行重建索引（意味著 `--deep`）。
- `--json`：列印 JSON 輸出。

`memory index`：

- `--force`：強制完全重建索引。

`memory search`：

- 查詢輸入：傳遞位置參數 `[query]` 或 `--query <text>`。
- 如果兩者都提供，`--query` 優先。
- 如果未提供任何一項，該命令將以錯誤退出。
- `--agent <id>`：範圍限制為單個代理程式（預設：預設代理程式）。
- `--max-results <n>`：限制傳回的結果數量。
- `--min-score <n>`：過濾掉低分匹配項。
- `--json`：列印 JSON 結果。

備註：

- `memory index --verbose` 會列印每個階段的詳細資訊（提供者、模型、來源、批次活動）。
- `memory status` 包含透過 `memorySearch.extraPaths` 設定的任何額外路徑。
- 如果有效的啟用記憶體遠端 API 金鑰欄位設定為 SecretRefs，指令會從有效的閘道快照解析這些值。如果閘道無法使用，指令會快速失敗。
- 閘道版本差異說明：此指令路徑需要支援 `secrets.resolve` 的閘道；較舊的閘道會傳回 unknown-method 錯誤。

import en from "/components/footer/en.mdx";

<en />

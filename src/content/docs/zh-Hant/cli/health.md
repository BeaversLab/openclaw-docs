---
summary: "CLI 參考資料：`openclaw health` (透過 RPC 取得 Gateway 健康狀態快照)"
read_when:
  - You want to quickly check the running Gateway's health
title: "Health"
---

# `openclaw health`

從執行中的 Gateway 取得健康狀態。

## 選項

| 標誌             | 預設值  | 描述                                                     |
| ---------------- | ------- | -------------------------------------------------------- |
| `--json`         | `false` | 列印機器可讀的 JSON 而非文字。                           |
| `--timeout <ms>` | `10000` | 連線逾時，以毫秒為單位。                                 |
| `--verbose`      | `false` | 詳細日誌記錄。強制執行即時探測並展開各個代理程式的輸出。 |
| `--debug`        | `false` | `--verbose` 的別名。                                     |

範例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

備註：

- 預設的 `openclaw health` 會要求執行中的閘道提供其健康狀態快照。當閘道已經有新鮮的快取快照時，它可以傳回該快取內容，並在背景重新整理。
- `--verbose` 會強制執行即時探測，列印閘道連線詳細資訊，並對所有設定的帳戶和代理程式展開人類可讀的輸出。
- 當設定了多個代理程式時，輸出會包含各代理程式的會話儲存。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [閘道健康狀態](/zh-Hant/gateway/health)

---
summary: "CLI 參考資料：`openclaw health` (透過 RPC 取得 Gateway 健康狀態快照)"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

從執行中的 Gateway 取得健康狀態。

選項：

- `--json`: 機器可讀取的輸出
- `--timeout <ms>`: 連線逾時時間，以毫秒為單位 (預設 `10000`)
- `--verbose`: 詳細記錄
- `--debug`: `--verbose` 的別名

範例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

備註：

- 預設的 `openclaw health` 會詢問執行中的 Gateway 其健康狀態快照。當
  Gateway 已經有新的快取快照時，它可以回傳該快取負載並
  在背景重新整理。
- `--verbose` 會強制進行即時探測，列印 Gateway 連線詳細資訊，並將
  人類可讀的輸出擴展至所有設定的帳戶和代理程式。
- 當設定多個代理程式時，輸出包含每個代理程式的會話存放區。

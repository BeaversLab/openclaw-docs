---
summary: "CLI 參考指南：`openclaw health` （透過 RPC 進行 Gateway 健康狀態端點）"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

從執行中的 Gateway 取得健康狀態。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

備註：

- `--verbose` 會執行即時探測，並在設定多個帳戶時列印每個帳戶的計時。
- 當設定多個代理程式時，輸出會包含每個代理程式的 Session Store。

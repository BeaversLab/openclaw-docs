---
summary: "CLI 參考資料 `openclaw health` （透過 RPC 取得的 Gateway 健康狀態端點）"
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

- `--verbose` 會執行即時探測，並在設定多個帳戶時列印每個帳戶的計時資訊。
- 當設定多個代理程式時，輸出包含各代理程式的 session stores。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

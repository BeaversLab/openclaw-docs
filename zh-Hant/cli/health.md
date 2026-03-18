---
summary: "CLI 參考資料，用於 `openclaw health`（透過 RPC 的 Gateway 健康檢查端點）"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

從執行中的 Gateway 擷取健康狀態。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

備註：

- `--verbose` 會執行即時探測，並在設定多個帳戶時列印每個帳戶的計時。
- 當設定多個代理程式時，輸出會包含每個代理程式的會話存放區。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

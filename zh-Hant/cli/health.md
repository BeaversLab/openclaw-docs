---
summary: "CLI 參考資料 for `openclaw health` (透過 RPC 的 gateway health endpoint)"
read_when:
  - 您想要快速檢查執行中的 Gateway 健康狀態
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

- `--verbose` 會執行即時探測並在設定多個帳戶時列印各帳戶的計時資訊。
- 當設定多個代理程式時，輸出會包含每個代理程式的會話存放區。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

---
summary: "透過 RPC 追蹤 Gateway 日誌的 `openclaw logs` CLI 參考資料"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `openclaw logs`

透過 RPC 追蹤 Gateway 檔案日誌 (適用於遠端模式)。

相關連結：

- 日誌記錄概覽：[Logging](/zh-Hant/logging)

## 範例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
```

使用 `--local-time` 以您當地的時區顯示時間戳記。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

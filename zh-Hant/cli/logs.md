---
summary: "`openclaw logs` 的 CLI 參考（透過 RPC 追蹤 Gateway 日誌）"
read_when:
  - 您需要遠端追蹤 Gateway 日誌（不使用 SSH）
  - 您想要用於工具的 JSON 日誌行
title: "logs"
---

# `openclaw logs`

透過 RPC 追蹤 Gateway 檔案日誌（適用於遠端模式）。

相關：

- 日誌總覽：[Logging](/zh-Hant/logging)

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

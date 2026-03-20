---
summary: "`openclaw reset` 的 CLI 參考（重設本機狀態/組態）"
read_when:
  - 您想要清除本機狀態同時保留已安裝的 CLI
  - 您想要預先執行會移除內容的模擬執行
title: "reset"
---

# `openclaw reset`

重設本機組態/狀態（保留已安裝的 CLI）。

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

如果您在移除本機狀態之前想要可還原的快照，請先執行 `openclaw backup create`。

import en from "/components/footer/en.mdx";

<en />

---
summary: "`openclaw pairing`（核准/列出配對請求）的 CLI 參考資料"
read_when:
  - You’re using pairing-mode DMs and need to approve senders
title: "配對"
---

# `openclaw pairing`

核准或檢查 DM 配對請求（針對支援配對的頻道）。

相關：

- 配對流程：[配對](/zh-Hant/channels/pairing)

## 指令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## 注意事項

- 頻道輸入：以位置參數傳遞 (`pairing list telegram`) 或使用 `--channel <channel>`。
- `pairing list` 針對多帳號頻道支援 `--account <accountId>`。
- `pairing approve` 支援 `--account <accountId>` 和 `--notify`。
- 如果僅設定一個支援配對的頻道，則允許使用 `pairing approve <code>`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

---
summary: "CLI 參考手冊：`openclaw pairing`（批准/列出配對請求）"
read_when:
  - You’re using pairing-mode DMs and need to approve senders
title: "配對"
---

# `openclaw pairing`

批准或檢視 DM 配對請求（針對支援配對的頻道）。

相關主題：

- 配對流程：[配對](/en/channels/pairing)

## 指令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## 備註

- 頻道輸入：以位置參數方式傳遞（`pairing list telegram`）或使用 `--channel <channel>`。
- `pairing list` 支援多帳號頻道的 `--account <accountId>`。
- `pairing approve` 支援 `--account <accountId>` 和 `--notify`。
- 如果只設定了一個支援配對的頻道，則允許使用 `pairing approve <code>`。

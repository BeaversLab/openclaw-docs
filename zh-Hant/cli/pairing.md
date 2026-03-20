---
summary: "`openclaw pairing` 的 CLI 參考資料（核准/列出配對請求）"
read_when:
  - 您正在使用配對模式 DM，並且需要核准傳送者
title: "pairing"
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

## 備註

- 通道輸入：以位置方式 (`pairing list telegram`) 或使用 `--channel <channel>` 傳遞。
- `pairing list` 支援 `--account <accountId>` 以用於多帳號通道。
- `pairing approve` 支援 `--account <accountId>` 和 `--notify`。
- 如果僅設定了一個具備配對功能的通道，則允許 `pairing approve <code>`。

import en from "/components/footer/en.mdx";

<en />

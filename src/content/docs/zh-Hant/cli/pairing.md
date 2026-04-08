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

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## `pairing list`

列出單一通道的待處理配對請求。

選項：

- `[channel]`：位置性通道 ID
- `--channel <channel>`：明確指定通道 ID
- `--account <accountId>`：多帳號通道的帳號 ID
- `--json`：機器可讀輸出

備註：

- 如果設定了多個支援配對的通道，您必須以位置方式或使用 `--channel` 提供通道。
- 只要通道 ID 有效，允許使用擴充通道。

## `pairing approve`

核准待處理的配對碼並允許該發送者。

用法：

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- 當僅設定一個支援配對的通道時，`openclaw pairing approve <code>`

選項：

- `--channel <channel>`：明確指定通道 ID
- `--account <accountId>`：多帳號通道的帳號 ID
- `--notify`：透過同一通道傳送確認訊息給請求者

## 備註

- 通道輸入：以位置方式傳遞 (`pairing list telegram`) 或使用 `--channel <channel>`。
- `pairing list` 支援多帳號通道的 `--account <accountId>`。
- `pairing approve` 支援 `--account <accountId>` 和 `--notify`。
- 如果僅設定一個支援配對的通道，則允許使用 `pairing approve <code>`。

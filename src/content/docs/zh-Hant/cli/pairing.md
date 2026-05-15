---
summary: "CLI 參考手冊：`openclaw pairing`（批准/列出配對請求）"
read_when:
  - You're using pairing-mode DMs and need to approve senders
title: "配對"
---

# `openclaw pairing`

批准或檢視 DM 配對請求（針對支援配對的頻道）。

相關主題：

- 配對流程：[配對](/zh-Hant/channels/pairing)

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

擁有者引導：

- 當您批准配對碼時，如果 `commands.ownerAllowFrom` 為空，OpenClaw 也會將已批准的傳送者記錄為指令擁有者，使用像是 `telegram:123456789` 這樣的通道範圍條目。
- 這僅會引導第一個擁有者。後續的配對批准不會取代或擴充 `commands.ownerAllowFrom`。
- 指令擁有者是被允許執行僅限擁有者之指令以及批准危險動作（例如 `/diagnostics`、`/export-trajectory`、`/config` 和 exec 批准）的人工操作員帳戶。

## 備註

- 通道輸入：透過位置傳遞 (`pairing list telegram`) 或使用 `--channel <channel>`。
- `pairing list` 支援 `--account <accountId>` 以用於多帳戶通道。
- `pairing approve` 支援 `--account <accountId>` 和 `--notify`。
- 如果僅設定了一個具有配對功能的通道，則允許使用 `pairing approve <code>`。
- 如果您在這個引導機制存在之前就已經批准過傳送者，請執行 `openclaw doctor`；當未設定指令擁有者時它會發出警告，並顯示 `openclaw config set commands.ownerAllowFrom ...` 指令以進行修復。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [通道配對](/zh-Hant/channels/pairing)

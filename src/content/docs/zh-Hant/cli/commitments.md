---
summary: "`openclaw commitments` 的 CLI 參考（檢查及消除推斷的後續追蹤）"
read_when:
  - You want to inspect inferred follow-up commitments
  - You want to dismiss pending check-ins
  - You are auditing what heartbeat may deliver
title: "`openclaw commitments`"
---

列出並管理推斷的後續追蹤承諾（commitments）。

承諾是選用、短暫的後續追蹤記憶，根據對話語境建立。請參閱 [推斷的承諾](/zh-Hant/concepts/commitments) 以了解概念指南。

若未指定子指令，`openclaw commitments` 會列出待處理的承諾。

## 使用方式

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## 選項

- `--all`：顯示所有狀態，而不僅是待處理的承諾。
- `--agent <id>`：篩選至單一代理程式 ID。
- `--status <status>`：依狀態篩選。數值：`pending`、`sent`、
  `dismissed`、`snoozed` 或 `expired`。
- `--json`：輸出機器可讀的 JSON。

## 範例

列出待處理的承諾：

```bash
openclaw commitments
```

列出所有已儲存的承諾：

```bash
openclaw commitments --all
```

篩選至單一代理程式：

```bash
openclaw commitments --agent main
```

尋找已延後的承諾：

```bash
openclaw commitments --status snoozed
```

消除一或多個承諾：

```bash
openclaw commitments dismiss cm_abc123 cm_def456
```

匯出為 JSON：

```bash
openclaw commitments --all --json
```

## 輸出

文字輸出包含：

- 承諾 ID
- 狀態
- 種類
- 最早到期時間
- 範圍
- 建議的 check-in 文字

JSON 輸出也包含承諾儲存路徑與完整的已儲存紀錄。

## 相關

- [推斷的承諾](/zh-Hant/concepts/commitments)
- [記憶概覽](/zh-Hant/concepts/memory)
- [Heartbeat](/zh-Hant/gateway/heartbeat)
- [已排程任務](/zh-Hant/automation/cron-jobs)

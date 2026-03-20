---
summary: "`openclaw system` 的 CLI 參考資料（系統事件、心跳、存在）"
read_when:
  - 您想要將系統事件加入佇列而不建立 cron job
  - 您需要啟用或停用心跳
  - 您想要檢查系統存在項目
title: "system"
---

# `openclaw system`

閘道的系統級輔助工具：將系統事件加入佇列、控制心跳，以及檢視存在。

## 常用指令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 工作階段將系統事件加入佇列。下一次心跳會將其作為 `System:` 行注入到提示中。使用 `--mode now` 立即觸發心跳；`next-heartbeat` 則等待下一次預定的計時器。

旗標：

- `--text <text>`：必要的系統事件文字。
- `--mode <mode>`：`now` 或 `next-heartbeat`（預設值）。
- `--json`：機器可讀取的輸出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：顯示上一次心跳事件。
- `enable`：重新開啟心跳（如果之前被停用，請使用此項）。
- `disable`：暫停心跳。

旗標：

- `--json`：機器可讀取的輸出。

## `system presence`

列出閘道目前已知的系統存在項目（節點、執行個體和類似的狀態行）。

旗標：

- `--json`：機器可讀取的輸出。

## 備註

- 需要一個執行中且可透過您目前的設定（本機或遠端）連線的閘道。
- 系統事件是暫時性的，不會在重新啟動後保留。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

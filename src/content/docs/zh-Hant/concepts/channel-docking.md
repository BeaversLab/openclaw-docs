---
summary: "在已連結的聊天頻道之間移動單一 OpenClaw 會話的回覆路由"
title: "頻道對接"
read_when:
  - You want replies for one active session to move from Telegram to Discord, Slack, Mattermost, or another linked channel
  - You are configuring session.identityLinks for cross-channel direct messages
  - A /dock command says the sender is not linked or no active session exists
---

頻道對接就像單一 OpenClaw 會話的來電轉接。

它保持相同的對話上下文，但改變該會話未來回覆的傳送位置。

## 範例

Alice 可以在 Telegram 和 Discord 上傳訊息給 OpenClaw：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456"],
    },
  },
}
```

如果 Alice 從 Telegram 傳送此內容：

```text
/dock_discord
```

OpenClaw 會保持目前的會話上下文並改變回覆路由：

| 對接前                    | 在 `/dock_discord` 之後  |
| ------------------------- | ------------------------ |
| 回覆傳送至 Telegram `123` | 回覆傳送至 Discord `456` |

該會話不會被重建。對話紀錄歷史仍保留在同一個會話中。

## 為何使用

當某個任務在一個聊天應用程式中開始，但後續的回應應該發送到其他地方時，請使用對接。

常見流程：

1. 從 Telegram 啟動代理程式任務。
2. 移動到您正在協調工作的 Discord。
3. 從 Telegram 會話傳送 `/dock_discord`。
4. 保持相同的 OpenClaw 會話，但在 Discord 中接收未來的回覆。

## 所需設定

對接需要 `session.identityLinks`。來源發送者和目標對等端必須位於同一個身分群組中：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456", "slack:U123"],
    },
  },
}
```

這些值是帶有頻道前綴的對等端 ID：

| 值             | 含義                        |
| -------------- | --------------------------- |
| `telegram:123` | Telegram 發送者 ID `123`    |
| `discord:456`  | Discord 直接對等端 ID `456` |
| `slack:U123`   | Slack 使用者 ID `U123`      |

標準金鑰（上面的 `alice`）僅是共用的身分群組名稱。Dock 指令使用帶有頻道前綴的值來證明來源發送者和目標對等端是同一個人。

## 指令

Dock 指令是由支援原生指令的已載入頻道外掛程式所產生。目前內建的指令：

| 目標頻道   | 指令               | 別名               |
| ---------- | ------------------ | ------------------ |
| Discord    | `/dock-discord`    | `/dock_discord`    |
| Mattermost | `/dock-mattermost` | `/dock_mattermost` |
| Slack      | `/dock-slack`      | `/dock_slack`      |
| Telegram   | `/dock-telegram`   | `/dock_telegram`   |

底線別名在 Telegram 等原生指令介面上很有用。

## 會改變什麼

停駁會更新目前的工作階段傳送欄位：

| 工作階段欄位    | 在 `/dock_discord` 之後的範例 |
| --------------- | ----------------------------- |
| `lastChannel`   | `discord`                     |
| `lastTo`        | `456`                         |
| `lastAccountId` | 目標頻道帳號，或 `default`    |

這些欄位會保存在工作階段儲存空間中，並供該工作階段後續的回覆傳送使用。

## 不會改變什麼

停駁不會：

- 建立頻道帳號
- 連接新的 Discord、Telegram、Slack 或 Mattermost 機器人
- 授權給使用者
- 繞過頻道允許清單或 DM 政策
- 將對話記錄移至另一個工作階段
- 讓無關的使用者共用一個工作階段

它僅會變更目前工作階段的傳送路由。

## 疑難排解

**指令顯示傳送者尚未連結。**

將目前的傳送者和目標對等端都新增到同一個
`session.identityLinks` 群組。例如，如果 Telegram 傳送者 `123` 應該停駁
到 Discord 對等端 `456`，請同時包含 `telegram:123` 和 `discord:456`。

**指令顯示沒有現有的工作階段。**

從現有的直接聊天工作階段進行停駁。該指令需要一個現有的工作階段
條目，以便它可以儲存新的路由。

**回覆仍然傳送到舊頻道。**

請檢查指令是否回覆了成功訊息，並確認目標
對等端 ID 是否符合該頻道使用的 ID。停駁僅會變更目前
的工作階段路由；其他工作階段可能仍路由到其他地方。

**我需要切換回來。**

從已連結的傳送者傳送原始頻道的對應指令，例如 `/dock_telegram` 或
`/dock-telegram`。

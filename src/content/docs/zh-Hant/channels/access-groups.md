---
summary: "可重用的訊息通道發送者允許清單"
read_when:
  - Configuring the same allowlist across multiple message channels
  - Sharing DM and group sender access rules
  - Reviewing message-channel access control
title: "存取群組"
---

存取群組是您定義一次的命名發送者清單，並可以使用 `accessGroup:<name>` 從通道允許清單中引用。

當相同的人應該被允許跨多個訊息通道，或者當一個受信任的集合應同時套用於私訊和群組發送者授權時，請使用它們。

存取群組本身不授予存取權限。只有當允許清單欄位引用某個群組時，該群組才會生效。

## 靜態訊息發送者群組

靜態發送者群組使用 `type: "message.senders"`。

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
}
```

成員清單是以訊息通道 ID 為鍵值：

| 鍵值       | 含義                                         |
| ---------- | -------------------------------------------- |
| `"*"`      | 針對每個引用該群組的訊息通道檢查的共享條目。 |
| `discord`  | 僅針對 Discord 允許清單匹配檢查的條目。      |
| `telegram` | 僅針對 Telegram 允許清單匹配檢查的條目。     |
| `whatsapp` | 僅針對 WhatsApp 允許清單匹配檢查的條目。     |

條目將根據目標通道的普通 `allowFrom` 規則進行匹配。OpenClaw 不會在通道之間轉換發送者 ID。如果 Alice 擁有 Telegram ID 和 Discord ID，請在相應的鍵值下列出這兩個 ID。

## 從允許清單引用群組

在訊息通道路徑支援發送者允許清單的任何地方，使用 `accessGroup:<name>` 引用群組。

私訊允許清單範例：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
    telegram: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

群組發送者允許清單範例：

```json5
{
  accessGroups: {
    oncall: {
      type: "message.senders",
      members: {
        whatsapp: ["+15551234567"],
        googlechat: ["users/1234567890"],
      },
    },
  },
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["accessGroup:oncall"],
    },
    googlechat: {
      spaces: {
        "spaces/AAA": {
          users: ["accessGroup:oncall"],
        },
      },
    },
  },
}
```

您可以混合使用群組和直接條目：

```json5
{
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators", "discord:123456789012345678"],
    },
  },
}
```

## 支援的訊息通道路徑

存取群組可用於共享的訊息通道授權路徑，包括：

- 私訊發送者允許清單，例如 `channels.<channel>.allowFrom`
- 群組發送者允許清單，例如 `channels.<channel>.groupAllowFrom`
- 使用相同發送者匹配規則的特定通道每個房間發送者允許清單
- 重複使用訊息通道發送者允許清單的指令授權路徑

頻道支援取決於該頻道是否透過共享的 OpenClaw 發送者授權輔助程式連接。目前內建的支援包括 Discord、Feishu、Google Chat、iMessage、LINE、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQBot、Signal、WhatsApp、Zalo 和 Zalo Personal。靜態 `message.senders` 群組設計為與頻道無關，因此新的訊息頻道應透過使用共享的插件 SDK 輔助程式來支援它們，而不是使用自訂的允許清單擴充。

## 插件診斷

插件作者可以檢查結構化的存取群組狀態，而無需將其擴充回平坦的允許清單：

```typescript
import { resolveAccessGroupAllowFromState } from "openclaw/plugin-sdk/security-runtime";

const state = await resolveAccessGroupAllowFromState({
  accessGroups: cfg.accessGroups,
  allowFrom: channelConfig.allowFrom,
  channel: "my-channel",
  accountId: "default",
  senderId,
  isSenderAllowed,
});
```

結果會回報已參照、已匹配、遺失、不支援和失敗的群組。當您需要診斷或符合性測試時，請使用此功能。僅針對仍期望平坦 `allowFrom` 陣列的相容路徑使用 `expandAllowFromWithAccessGroups(...)`。

## Discord 頻道受眾

Discord 也支援動態存取群組類型：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

`discord.channelAudience` 表示「允許目前可以檢視此公會頻道的 Discord DM 發送者」。OpenClaw 會在授權時透過 Discord 解析發送者，並套用 Discord `ViewChannel` 權限規則。

當 Discord 頻道已經是團隊的資訊來源（例如 `#maintainers` 或 `#on-call`）時，請使用此功能。

需求和失敗行為：

- Bot 需要存取權限才能存取公會和頻道。
- Bot 需要 Discord 開發者入口網站中的 **Server Members Intent**。
- 當 Discord 傳回 `Missing Access`、發送者無法解析為公會成員，或該頻道屬於另一個公會時，存取群組將會失敗並封閉存取。

更多 Discord 特定的範例：[Discord 存取控制](/zh-Hant/channels/discord#access-control-and-routing)

## 安全性備註

- 存取群組是允許清單別名，而非角色。它們不會建立擁有者、核准配對請求或單獨授予工具權限。
- `dmPolicy: "open"` 仍然需要在有效的 DM 允許清單中包含 `"*"`。參照存取群組並不等同於公開存取。
- 遺失的群組名稱會導致封閉式失敗。如果 `allowFrom` 包含 `accessGroup:operators` 但 `accessGroups.operators` 不存在，則該條目不會授權給任何人。
- 保持頻道 ID 穩定。當頻道同時支援數字/使用者 ID 和顯示名稱時，優先使用數字/使用者 ID。

## 疑難排解

如果傳送者應該符合條件但被封鎖：

1. 請確認允許清單欄位包含確切的 `accessGroup:<name>` 參考。
2. 請確認 `accessGroups.<name>.type` 是正確的。
3. 請確認傳送者 ID 列在對應的頻道金鑰下，或是 `"*"` 下。
4. 請確認該條目使用該頻道的標準允許清單語法。
5. 針對 Discord 頻道受眾，請確認機器人可以看到伺服器頻道，並已啟用伺服器成員意圖。

在編輯存取控制組態後執行 `openclaw doctor`。它會在執行階段之前攔截許多無效的允許清單和原則組合。

---
summary: "用於傳入訊息授權的實驗性通道輸入 API"
read_when:
  - Building or migrating a messaging channel plugin
  - Changing DM or group allowlists, route gates, command auth, event auth, or mention activation
  - Reviewing channel ingress redaction or SDK compatibility boundaries
title: "Channel ingress API"
sidebarTitle: "Channel Ingress"
---

# Channel ingress API

Channel ingress 是傳入通道事件的實驗性存取控制邊界。請使用 `openclaw/plugin-sdk/channel-ingress-runtime` 進行接收路徑。
較舊的 `openclaw/plugin-sdk/channel-ingress` 子路徑仍作為已棄用的相容性外觀匯出，供第三方外掛程式使用。

外掛程式擁有平台事實和副作用。核心擁有通用策略：DM/群組允許清單、配對儲存 DM 項目、路由閘道、指令閘道、事件授權、提及啟動、編輯診斷和准入。

## Runtime Resolver

```ts
import { defineStableChannelIngressIdentity, resolveChannelMessageIngress } from "openclaw/plugin-sdk/channel-ingress-runtime";

const identity = defineStableChannelIngressIdentity({
  key: "platform-user-id",
  normalize: normalizePlatformUserId,
  sensitivity: "pii",
});

const result = await resolveChannelMessageIngress({
  channelId: "my-channel",
  accountId,
  identity,
  subject: { stableId: platformUserId },
  conversation: { kind: isGroup ? "group" : "direct", id: conversationId },
  event: { kind: "message", authMode: "inbound", mayPair: !isGroup },
  policy: {
    dmPolicy: config.dmPolicy,
    groupPolicy: config.groupPolicy,
    groupAllowFromFallbackToAllowFrom: true,
  },
  allowFrom: config.allowFrom,
  groupAllowFrom: config.groupAllowFrom,
  accessGroups: cfg.accessGroups,
  route,
  readStoreAllowFrom,
  command: hasControlCommand ? { allowTextCommands: true, hasControlCommand } : undefined,
});
```

請勿預先計算有效的允許列表、指令擁有者或指令群組。解析器會從原始允許列表、存儲回調、路由描述符、存取群組、策略和對話類型中推導出這些內容。

## 結果

內建插件應直接使用現代投影：

- `ingress`：有序的閘門決策和准入
- `senderAccess`：僅限發送者/對話授權
- `routeAccess`：路由和路由發送者投影
- `commandAccess`：指令授權；當未執行指令閘門時為 false
- `activationAccess`：提及/啟動結果

事件授權在有序的 `ingress.graph` 和決定性的 `ingress.reasonCode` 上仍然可用；不會發出單獨的事件投影。

已棄用的第三方 SDK 輔助程式可能會在內部重建較舊的形狀。新的內建接收路徑不應將現代結果轉換回本機 DTO。

## 存取群組

`accessGroup:<name>` 項目保持編修狀態。Core 自行解析靜態 `message.senders` 群組，並僅針對需要平台查詢的動態群組呼叫 `resolveAccessGroupMembership`。遺失、不支援和失敗的群組會以封閉模式處理（即拒絕存取）。

## 事件模式

| `authMode`       | 含義                                 |
| ---------------- | ------------------------------------ |
| `inbound`        | 正常輸入傳送者閘道                   |
| `command`        | 用於回呼或範圍按鈕的指令閘道         |
| `origin-subject` | 行為者必須符合原始訊息主旨           |
| `route-only`     | 僅限用於路由範圍信任事件的路由閘道   |
| `none`           | 外掛程式擁有的內部事件會略過共用驗證 |

使用 `mayPair: false` 來處理反應、按鈕、回呼和原生指令。

## 路由與啟動

對於房間、主題、群組、串執或巢狀路由策略，請使用路由描述元：

```ts
route: {
  id: "room",
  allowed: roomAllowed,
  enabled: roomEnabled,
  senderPolicy: "replace",
  senderAllowFrom: roomAllowFrom,
  blockReason: "room_sender_not_allowlisted",
}
```

當外掛程式有多個可選的路由描述元時，請使用 `channelIngressRoutes(...)`；它會過濾停用的分支，同時保持路由事項通用，並依照每個描述元的 `precedence` 排序。

提及門控是一種啟動閘門。若未命中提及，則會傳回 `admission: "skip"`，因此回合核心不會處理僅觀測的回合。大多數通道應在發送者和指令閘門之後保留啟動。必須在發送者允許清單干擾之前安靜非提及流量的公開聊天介面，當文字指令繞過停用時，可以選擇加入 `activation.order: "before-sender"`。具有隱含啟動的通道（例如機器人執行緒中的回覆）可以傳遞 `activation.allowedImplicitMentionKinds`；投影的 `activationAccess.shouldBypassMention` 接著會回報指令或隱含啟動何時繞過了明確提及。

## 編修

原始發送者值和原始允許清單條目僅作為解析器輸入。它們不得出現在已解析狀態、決策、診斷、快照或相容性事實中。請使用不透明的主體 ID、條目 ID、路由 ID 和診斷 ID。

## 驗證

```bash
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts
pnpm plugin-sdk:api:check
```

---
summary: "用於頻道外掛程式的語意訊息卡、按鈕、選取項、後援文字和傳遞提示"
title: "訊息呈現"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

訊息呈現 (Message presentation) 是 OpenClaw 用於豐富傳出聊天 UI 的共享合約。
它讓代理程式、CLI 指令、核准流程和外掛程式只需描述一次訊息
意圖，而每個通道外掛程式則負責呈現它能做到的最佳原生形狀。

使用呈現功能來建立可攜式的訊息 UI：

- 文字區段
- 小型內容/頁尾文字
- 分隔線
- 按鈕
- 選單
- 卡片標題與語氣

請勿新增供應商原生的欄位（例如 Discord `components`、Slack
`blocks`、Telegram `buttons`、Teams `card` 或 Feishu `card`）至共用
訊息工具。這些是由頻道外掛程式擁有的渲染器輸出。

## 合約

外掛程式作者從以下位置匯入公開合約：

```ts
import type { MessagePresentation, ReplyPayloadDelivery } from "openclaw/plugin-sdk/interactive-runtime";
```

結構 (Shape)：

```ts
type MessagePresentation = {
  title?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  blocks: MessagePresentationBlock[];
};

type MessagePresentationBlock = { type: "text"; text: string } | { type: "context"; text: string } | { type: "divider" } | { type: "buttons"; buttons: MessagePresentationButton[] } | { type: "select"; placeholder?: string; options: MessagePresentationOption[] };

type MessagePresentationAction = { type: "command"; command: string } | { type: "callback"; value: string };

type MessagePresentationButton = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
  url?: string;
  webApp?: { url: string };
  /** @deprecated Use webApp. Accepted for legacy JSON payloads only. */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
};

type ReplyPayloadDelivery = {
  pin?:
    | boolean
    | {
        enabled: boolean;
        notify?: boolean;
        required?: boolean;
      };
};
```

按鈕語意：

- `action.type: "command"` 透過核心的指令路徑執行原生斜線指令。
  請將此用於內建指令按鈕和選單。
- `action.type: "callback"` 沿著頻道的互動路徑傳遞不透明的插件資料。
  頻道插件絕不得將回呼資料重新解釋為斜線指令。
- `value` 是舊版的不透明回呼值。新的控制項應使用 `action`，
  讓頻道插件無需從文字猜測即可對應指令和回呼。
- `url` 是連結按鈕。它可以不存在 `value`。
- `webApp` 描述頻道原生的網頁應用程式按鈕。Telegram 將其
  渲染為 `web_app` 且僅在私人聊天中支援。`web_app` 為了相容性，在寬鬆的 JSON 載荷中仍被接受，但 TypeScript 生產者
  應使用 `webApp`。
- `label` 是必填的，同時也用於文字後援。
- `style` 僅供參考。渲染器應將不支援的樣式對應至安全的
  預設值，而不是導致發送失敗。
- `priority` 是選填的。當頻道宣傳動作限制且必須捨棄控制項時，
  核心會優先保留高優先級的按鈕，並在同等優先級的按鈕中保持原始順序。當所有控制項皆可容納時，則保留
  編寫順序。
- `disabled` 是選填的。頻道必須透過 `supportsDisabled` 加入；
  否則核心會將停用的控制項降級為非互動式後援文字。
- `reusable` 是選填的。支援可重複使用原生回呼的頻道可能會
  在成功互動後讓動作保持可用。請將其用於
  可重複或等幂的動作，例如重新整理、檢查或更多詳細資訊；
  對於正常的一次性審核和破壞性動作，請勿設定此項。

選取語意：

- `options[].action` 與按鈕 `action` 具有相同的指令/回呼含義。
- `options[].value` 是舊版的選取應用程式值。
- `placeholder` 僅供參考，且可能被不支援
  原生選取的頻道忽略。
- 如果頻道不支援選取，後備文字會列出標籤。

## 生產者範例

簡單卡片：

```json
{
  "title": "Deploy approval",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "Canary is ready to promote." },
    { "type": "context", "text": "Build 1234, staging passed." },
    {
      "type": "buttons",
      "buttons": [
        { "label": "Approve", "value": "deploy:approve", "style": "success" },
        { "label": "Decline", "value": "deploy:decline", "style": "danger" }
      ]
    }
  ]
}
```

僅連結按鈕：

```json
{
  "blocks": [
    { "type": "text", "text": "Release notes are ready." },
    {
      "type": "buttons",
      "buttons": [{ "label": "Open notes", "url": "https://example.com/release" }]
    }
  ]
}
```

Telegram Mini App 按鈕：

```json
{
  "blocks": [
    {
      "type": "buttons",
      "buttons": [{ "label": "Launch", "web_app": { "url": "https://example.com/app" } }]
    }
  ]
}
```

選取選單：

```json
{
  "title": "Choose environment",
  "blocks": [
    {
      "type": "select",
      "placeholder": "Environment",
      "options": [
        { "label": "Canary", "value": "env:canary" },
        { "label": "Production", "value": "env:prod" }
      ]
    }
  ]
}
```

CLI 傳送：

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "Deploy approval" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Canary is ready."},{"type":"buttons","buttons":[{"label":"Approve","value":"deploy:approve","style":"success"},{"label":"Decline","value":"deploy:decline","style":"danger"}]}]}'
```

釘選傳遞：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

使用明確 JSON 的釘選傳遞：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## 轉譯器合約

頻道外掛程式在其輸出配接器上宣告轉譯支援：

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
    limits: {
      actions: {
        maxActions: 25,
        maxActionsPerRow: 5,
        maxRows: 5,
        maxLabelLength: 80,
        maxValueBytes: 100,
        supportsStyles: true,
        supportsDisabled: false,
      },
      selects: {
        maxOptions: 25,
        maxLabelLength: 100,
        maxValueBytes: 100,
      },
      text: {
        maxLength: 2000,
        encoding: "characters",
        markdownDialect: "discord-markdown",
      },
    },
  },
  deliveryCapabilities: {
    pin: true,
  },
  renderPresentation({ payload, presentation, ctx }) {
    return renderNativePayload(payload, presentation, ctx);
  },
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

功能布林值描述轉譯器可以將什麼設為互動式。選用的
`limits` 描述核心在呼叫轉譯器之前可以調整的通用外殼：

```ts
type ChannelPresentationCapabilities = {
  supported?: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  limits?: {
    actions?: {
      maxActions?: number;
      maxActionsPerRow?: number;
      maxRows?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
      supportsStyles?: boolean;
      supportsDisabled?: boolean;
      supportsLayoutHints?: boolean;
    };
    selects?: {
      maxOptions?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
    };
    text?: {
      maxLength?: number;
      encoding?: "characters" | "utf8-bytes" | "utf16-units";
      markdownDialect?: "plain" | "markdown" | "html" | "slack-mrkdwn" | "discord-markdown";
      supportsEdit?: boolean;
    };
  };
};
```

核心會在轉譯之前對語意控制項套用通用限制。轉譯器仍然擁有最終針對特定提供者的驗證和修剪，用於原生區塊計數、卡片大小、URL 限制，以及無法在通用合約中表達的提供者怪癖。如果限制從區塊中移除了所有控制項，核心會將標籤保留為非互動式內容文字，以便傳遞的訊息仍然具有可見的後備方案。

## 核心轉譯流程

當 `ReplyPayload` 或訊息動作包含 `presentation` 時，核心：

1. 正規化呈現載荷。
2. 解析目標頻道的輸出配接器。
3. 讀取 `presentationCapabilities`。
4. 當配接器宣稱支援時，套用通用功能限制，例如動作計數、標籤長度和選取選項計數。
5. 當配接器可以轉譯載荷時，呼叫 `renderPresentation`。
6. 當配接器不存在或無法轉譯時，後退為保守文字。
7. 透過正常頻道傳遞路徑傳送產生的載荷。
8. 在第一個成功傳送的訊息之後，套用傳遞中繼資料，例如 `delivery.pin`。

核心擁有後備行為，以便生產者可以保持與頻道無關。頻道外掛程式擁有原生轉譯和互動處理。

## 降級規則

呈現必須能夠安全地在受限頻道上傳送。

後備文字包括：

- `title` 作為第一行
- `text` 區塊作為正常段落
- `context` 區塊作為精簡內容行
- `divider` 區塊作為視覺分隔符
- 按鈕標籤，包括連結按鈕的 URL
- 選取選項標籤

不支援的原生控制項應該降級，而不是導致整個傳送失敗。
範例：

- 停用內聯按鈕的 Telegram 會傳送文字後援方案。
- 不支援選取功能的頻道會將選取選項以文字列表顯示。
- 僅含 URL 的按鈕會變成原生連結按鈕或後援 URL 行。
- 選用性的釘選失敗不會導致傳送的訊息失敗。

主要的例外是 `delivery.pin.required: true`；如果要求將釘選設為
必要且頻道無法釘選傳送的訊息，傳送回報將會失敗。

## 供應商對應

目前內建的渲染器：

| 頻道            | 原生渲染目標     | 備註                                                                                                              |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Discord         | 元件與元件容器   | 為現有的供應商原生 Payload 生產器保留舊版 `channelData.discord.components`，但新的共用傳送應使用 `presentation`。 |
| Slack           | Block Kit        | 為現有的供應商原生 Payload 生產器保留舊版 `channelData.slack.blocks`，但新的共用傳送應使用 `presentation`。       |
| Telegram        | 文字加上內聯鍵盤 | 按鈕/選取項目需要目標介面具備內聯按鈕功能；否則會使用文字後援方案。                                               |
| Mattermost      | 文字加上互動屬性 | 其他區塊會降級為文字。                                                                                            |
| Microsoft Teams | Adaptive Cards   | 當同時提供卡片與純 `message` 文字時，純文字會隨附於卡片中。                                                       |
| Feishu          | 互動式卡片       | 卡片標頭可以使用 `title`；內文會避免重複該標題。                                                                  |
| 純文字頻道      | 文字後援方案     | 沒有渲染器的頻道仍然會收到可讀的輸出。                                                                            |

供應商原生 Payload 相容性是現有回覆生產器的過渡輔助功能。
這不是新增共用原生欄位的理由。

## Presentation 與 InteractiveReply

`InteractiveReply` 是核准和互動
輔助程式使用的較舊內部子集。它支援：

- 文字
- 按鈕
- 選取項目

`MessagePresentation` 是標準的共用傳送合約。它新增了：

- 標題
- 語氣
- 上下文
- 分隔線
- 僅含 URL 的按鈕
- 透過 `ReplyPayload.delivery` 傳遞的一般傳送中繼資料

銜接舊程式碼時，請使用 `openclaw/plugin-sdk/interactive-runtime` 中的輔助程式：

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新程式碼應直接接受或產生 `MessagePresentation`。現有的
`interactive` Payload 是 `presentation` 的已棄用子集；執行時
仍支援較舊的 Producer。

舊版的 `InteractiveReply*` 型別和轉換輔助程式在 SDK 中已標記為
`@deprecated`：

- `InteractiveReply`、`InteractiveReplyBlock`、`InteractiveReplyButton`、
  `InteractiveReplyOption`、`InteractiveReplySelectBlock` 和
  `InteractiveReplyTextBlock`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` 和
`presentationToInteractiveControlsReply(...)` 仍可作為舊版 Channel 實作的轉譯器橋接器使用。
新的 Producer 程式碼不應呼叫它們；請傳送 `presentation` 並讓 Core/Channel
轉接處理轉譯。

核准輔助程式也有優先採用 Presentation 的替代方案：

- 使用 `buildApprovalPresentationFromActionDescriptors(...)` 而非
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- 使用 `buildApprovalPresentation(...)` 而非
  `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 而非
  `buildExecApprovalInteractiveReply(...)`

`renderMessagePresentationFallbackText(...)` 對於沒有文字後援的 Presentation 區塊（例如僅包含分隔線的
Presentation）會傳回空字串。需要非空傳送主體的 Transport 可以傳遞
`emptyFallback` 以選擇最小主體，而不變更預設後援合約。

## 傳遞固定

固定是傳遞行為，而非呈現方式。請使用 `delivery.pin` 而非
Provider 原生欄位，例如 `channelData.telegram.pin`。

語意：

- `pin: true` 會固定第一個成功傳遞的訊息。
- `pin.notify` 預設為 `false`。
- `pin.required` 預設為 `false`。
- 選用性固定的失敗會降級並保持傳送訊息完整。
- 必要性的固定失敗會導致傳遞失敗。
- 分段訊息會固定傳遞的第一個區塊，而非尾部區塊。

在提供者支援這些操作的現有訊息中，手動的 `pin`、`unpin` 和 `pins` 訊息動作仍然存在。

## 外掛作者檢查清單

- 當頻道能夠呈現或安全降級語意呈現時，從 `describeMessageTool(...)` 宣告 `presentation`。
- 將 `presentationCapabilities` 新增至執行時期出站配接器。
- 在執行時期程式碼中實作 `renderPresentation`，而非控制平面外掛設定程式碼。
- 保持原生 UI 函式庫不包含在熱設定/目錄路徑中。
- 當已知通用功能限制時，在 `presentationCapabilities.limits` 上宣告它們。
- 在轉譯器和測試中保留最終平台限制。
- 針對不支援的按鈕、選單、URL 按鈕、標題/文字重複，以及混合的 `message` 加上 `presentation` 傳送，新增後援測試。
- 僅當提供者能夠固定已傳送訊息 ID 時，才透過 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 新增傳遞固定支援。
- 不要透過共用的訊息動作架構公開新的提供者原生卡片/區塊/元件/按鈕欄位。

## 相關文件

- [訊息 CLI](/zh-Hant/cli/message)
- [外掛 SDK 總覽](/zh-Hant/plugins/sdk-overview)
- [外掛架構](/zh-Hant/plugins/architecture-internals#message-tool-schemas)
- [頻道呈現重構計畫](/zh-Hant/plan/ui-channels)

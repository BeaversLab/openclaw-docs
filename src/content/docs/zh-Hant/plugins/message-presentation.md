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

type MessagePresentationButton = {
  label: string;
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
  value: string;
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

- `value` 是一個應用程式動作值，當頻道支援可點擊控制項時，會透過頻道的現有互動路徑回傳。
- `url` 是連結按鈕。它可以在沒有 `value` 的情況下存在。
- `webApp` 描述頻道原生網頁應用程式按鈕。Telegram 將其渲染為
  `web_app` 且僅在私人聊天中支援。`web_app` 在寬鬆 JSON 載荷中仍
  被接受以保持相容性，但 TypeScript 生產者應使用 `webApp`。
- `label` 是必填的，並且也用於文字後援。
- `style` 是參考性質。渲染器應將不支援的樣式對應至安全的
  預設值，而不是導致發送失敗。
- `priority` 是選填的。當頻道宣佈動作限制且必須捨棄控制項時，
  核心會優先保留高優先級按鈕，並在相同優先級的按鈕中保持原始順序。
  當所有控制項都能容納時，則保留建立的順序。
- `disabled` 是選填的。頻道必須透過 `supportsDisabled` 宣告加入；
  否則核心會將停用的控制項降級為非互動式後援文字。
- `reusable` 為選填。支援可重複使用原生回呼的頻道，可以在成功互動後保留該動作。將其用於可重複或等冪的動作，例如重新整理、檢查或更多詳情；對於一般的一次性批准和破壞性動作，請勿設定此項。

選取語意：

- `options[].value` 是選取的應用程式值。
- `placeholder` 僅供參考，可能會被不支援原生選取功能的頻道忽略。
- 如果頻道不支援選取功能，後備文字會列出標籤。

## Producer examples

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

純 URL 連結按鈕：

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

釘選遞送：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

含明確 JSON 的釘選遞送：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## Renderer contract

頻道外掛程式會在其輸出轉接器上宣告轉譯支援：

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

功能布林值描述轉譯器可以將哪些項目設為互動式。選用的 `limits` 描述核心在呼叫轉譯器之前可以調整的通用信封：

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

核心會在轉譯前對語意控制套用通用限制。轉譯器仍擁有最終的提供者特定驗證與裁剪，處理原生區塊計數、卡片大小、URL 限制，以及無法在通用合約中表示的提供者特性。如果限制移除了區塊中的所有控制項，核心會將標籤保留為非互動式內容文字，以便傳送訊息仍具有可見的後備方案。

## Core render flow

當 `ReplyPayload` 或訊息動作包含 `presentation` 時，核心會：

1. 正規化展示載荷。
2. 解析目標頻道的輸出轉接器。
3. 讀取 `presentationCapabilities`。
4. 當轉接器通告時，套用通用功能限制，例如動作計數、標籤長度和選取選項計數。
5. 當轉接器可以轉譯載荷時，呼叫 `renderPresentation`。
6. 當轉接器不存在或無法轉譯時，回退為保守的文字。
7. 透過一般的頻道遞送路徑傳送產生的載荷。
8. 在第一封成功傳送的訊息之後，套用遞送中繼資料，例如 `delivery.pin`。

核心擁有回退行為，因此生產者可以保持與頻道無關。頻道外掛程式擁有原生轉譯和互動處理。

## Degradation rules

簡報必須安全地發送到有限制的頻道。

後備文字包括：

- `title` 作為第一行
- `text` 區塊作為普通段落
- `context` 區塊作為簡潔的上下文行
- `divider` 區塊作為視覺分隔符
- 按鈕標籤，包括連結按鈕的 URL
- 選取選項標籤

不支援的原生控制項應該降級，而不是導致整個發送失敗。
範例：

- 停用內聯按鈕的 Telegram 會發送後備文字。
- 不支援選取功能的頻道會以文字形式列出選取選項。
- 僅 URL 的按鈕會變成原生連結按鈕或後備 URL 行。
- 可選的置頂失敗不會導致已發送的消息失敗。

主要的例外是 `delivery.pin.required: true`；如果請求
必須置頂且頻道無法置頂已發送的消息，傳遞將報告失敗。

## 供應商對應

目前捆綁的渲染器：

| 頻道            | 原生渲染目標     | 備註                                                                                                         |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Discord         | 元件和元件容器   | 為現有的供應商原生負載生產器保留舊版 `channelData.discord.components`，但新的共享發送應使用 `presentation`。 |
| Slack           | Block Kit        | 為現有的供應商原生負載生產器保留舊版 `channelData.slack.blocks`，但新的共享發送應使用 `presentation`。       |
| Telegram        | 文字加上內聯鍵盤 | 按鈕/選取器需要目標介面具備內聯按鈕功能；否則會使用文字後備。                                                |
| Mattermost      | 文字加上互動屬性 | 其他區塊會降級為文字。                                                                                       |
| Microsoft Teams | Adaptive Cards   | 當同時提供兩者時，純 `message` 文字會隨卡片一起包含。                                                        |
| Feishu          | 互動式卡片       | 卡片標頭可以使用 `title`；主體避免重複該標題。                                                               |
| 純文字頻道      | 文字後備         | 沒有渲染器的頻道仍然會獲得可讀的輸出。                                                                       |

供應商原生負載相容性是現有回覆生產器的過渡輔助。
這不是新增共享原生欄位的理由。

## Presentation vs InteractiveReply

`InteractiveReply` 是核准和互動
幫手使用的較舊內部子集。它支援：

- 文字
- 按鈕
- 選取器

`MessagePresentation` 是標準的共用發送契約。它增加了：

- title
- tone
- context
- divider
- 僅限 URL 的按鈕
- 透過 `ReplyPayload.delivery` 提供通用的傳遞中繼資料

橋接舊有程式碼時，請使用 `openclaw/plugin-sdk/interactive-runtime` 中的輔助函式：

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新程式碼應直接接受或產生 `MessagePresentation`。現有的
`interactive` Payload 是 `presentation` 的已棄用子集；執行時期
仍保留對舊有產生器的支援。

舊版的 `InteractiveReply*` 型別和轉換輔助函式在 SDK 中已標記為
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
`presentationToInteractiveControlsReply(...)` 仍可作為舊版通道實作的轉譯器橋樑。
新的產生器程式碼不應呼叫它們；請發送 `presentation` 並讓核心/通道調適層處理轉譯。

核准輔助函式也有以呈現為優先的取代項目：

- 使用 `buildApprovalPresentationFromActionDescriptors(...)` 代替
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- 使用 `buildApprovalPresentation(...)` 代替
  `buildApprovalInteractiveReply(...)`
- 使用 `buildExecApprovalPresentation(...)` 代替
  `buildExecApprovalInteractiveReply(...)`

對於沒有文字後備的呈現區塊（例如僅有分隔線的呈現），
`renderMessagePresentationFallbackText(...)` 會傳回空字串。需要非空發送主體的傳輸層
可以傳入 `emptyFallback` 以選擇最小化的主體，而無需改變預設後備契約。

## 傳遞釘選

釘選是傳遞行為，而非呈現。請使用 `delivery.pin` 代替
提供者原生的欄位（例如 `channelData.telegram.pin`）。

語意：

- `pin: true` 會釘選第一則成功傳遞的訊息。
- `pin.notify` 預設為 `false`。
- `pin.required` 預設為 `false`。
- 選用性釘選失敗會降級並保持已傳送訊息不變。
- 必要釘選失敗會導致傳送失敗。
- 分塊訊息會釘選第一個傳送的區塊，而不是尾部區塊。

在提供者支援這些操作的現有訊息中，手動 `pin`、`unpin` 和 `pins` 訊息動作仍然存在。

## 外掛作者檢查清單

- 當管道可以轉譯或安全降級語意呈現時，從 `describeMessageTool(...)` 宣告 `presentation`。
- 將 `presentationCapabilities` 新增至執行時期輸出介面卡。
- 在執行時期程式碼中實作 `renderPresentation`，而非控制平面外掛設定程式碼。
- 請勿將原生 UI 程式庫放入熱設定/目錄路徑中。
- 當已知通用功能限制時，在 `presentationCapabilities.limits` 上宣告它們。
- 在轉譯器和測試中保留最終的平台限制。
- 針對不支援的按鈕、選取器、URL 按鈕、標題/文字重複，以及混合 `message` 加上 `presentation` 的傳送，新增後備測試。
- 僅當提供者能夠釘選已傳送訊息 ID 時，透過 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 新增傳送釘選支援。
- 請勿透過共享訊息動作架構公開新的提供者原生卡片/區塊/元件/按鈕欄位。

## 相關文件

- [訊息 CLI](/zh-Hant/cli/message)
- [外掛 SDK 概覽](/zh-Hant/plugins/sdk-overview)
- [外掛架構](/zh-Hant/plugins/architecture-internals#message-tool-schemas)
- [管道呈現重構計畫](/zh-Hant/plan/ui-channels)

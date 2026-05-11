---
summary: "適合通道外掛程式的語意訊息卡片、按鈕、選單、後備文字及傳遞提示"
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

請勿將特定供應商的原生欄位（例如 Discord `components`、Slack
`blocks`、Telegram `buttons`、Teams `card` 或 Feishu `card`）新增至共享
訊息工具中。這些是由通道外掛程式擁有的轉譯器輸出。

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

- `value` 是一個應用程式動作值，當通道支援可點擊控制項時，
  會透過通道的現有互動路徑回傳。
- `url` 是連結按鈕。它可以不含 `value` 而存在。
- `label` 為必填，同時也用於文字後備中。
- `style` 為建議性質。轉譯器應將不支援的樣式對應至安全的
  預設值，而不應導致傳送失敗。

選單語意：

- `options[].value` 是選取的應用程式值。
- `placeholder` 為建議性質，可能會被不支援原生
  選單的通道忽略。
- 如果通道不支援選單，後備文字會列出標籤。

## 產生者範例

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

僅 URL 連結按鈕：

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

選單：

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

包含明確 JSON 的釘選傳遞：

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

通道外掛程式會在其傳出介面卡上宣告轉譯支援：

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
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

功能欄位刻意設計為簡單的布林值。它們描述的是轉譯器能讓什麼具備互動性，
而非每個原生平台的限制。轉譯器仍需處理平台特定的限制，例如按鈕數量上限、區塊數量上限和
卡片大小。

## 核心轉譯流程

當 `ReplyPayload` 或訊息動作包含 `presentation` 時，核心：

1. 正規化展示 payload。
2. 解析目標通道的輸出配接器。
3. 讀取 `presentationCapabilities`。
4. 當配接器可以渲染 payload 時呼叫 `renderPresentation`。
5. 當配接器不存在或無法渲染時，回退到保守文字。
6. 透過正常通道傳遞路徑發送產生的 payload。
7. 在第一個成功發送的訊息之後，應用傳遞元數據，例如 `delivery.pin`。

核心擁有回退行為，因此生產者可以保持與通道無關。通道外掛擁有原生渲染和互動處理。

## 降級規則

展示必須能夠安全地在有限的通道上發送。

回退文字包括：

- `title` 作為第一行
- `text` 區塊作為正常段落
- `context` 區塊作為精簡上下文行
- `divider` 區塊作為視覺分隔符
- 按鈕標籤，包括連結按鈕的 URL
- 選取選項標籤

不支援的原生控制項應該降級而不是導致整個發送失敗。
例如：

- 停用內聯按鈕的 Telegram 發送文字回退。
- 不支援選取的通道會將選取選項列為文字。
- 僅 URL 的按鈕會變成原生連結按鈕或回退 URL 行。
- 可選的釘選失敗不會導致已發送的訊息失敗。

主要的例外是 `delivery.pin.required: true`；如果將釘選要求為
必須且通道無法釘選已發送的訊息，則傳遞報告失敗。

## 提供者對應

目前內建的渲染器：

| 通道            | 原生渲染目標     | 備註                                                                                                              |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Discord         | 元件和元件容器   | 為現有的提供者原生 payload 生產者保留舊版 `channelData.discord.components`，但新的共享發送應使用 `presentation`。 |
| Slack           | Block Kit        | 為現有的提供者原生 payload 生產者保留舊版 `channelData.slack.blocks`，但新的共享發送應使用 `presentation`。       |
| Telegram        | 文字加上內聯鍵盤 | 按鈕/選取需要目標介面的內聯按鈕功能；否則使用文字回退。                                                           |
| Mattermost      | 文字加上互動屬性 | 其他區塊會降級為文字。                                                                                            |
| Microsoft Teams | Adaptive Cards   | 當同時提供卡片時，純 `message` 文字會隨附於卡片中。                                                               |
| Feishu          | 互動式卡片       | 卡片標頭可以使用 `title`；主體會避免重複該標題。                                                                  |
| 純文字頻道      | 文字回退         | 沒有渲染器的頻道仍會收到可讀的輸出。                                                                              |

提供者原生 Payload 相容性是現有回覆產生器的過渡權宜措施。這不是新增共享原生欄位的理由。

## Presentation 與 InteractiveReply 的比較

`InteractiveReply` 是核准和互動輔助函式使用的舊版內部子集。它支援：

- 文字
- 按鈕
- 選單

`MessagePresentation` 是標準的共用傳送合約。它新增了：

- 標題
- 語氣
- 內容
- 分隔線
- 僅限 URL 的按鈕
- 透過 `ReplyPayload.delivery` 傳遞通用傳送中繼資料

橋接舊程式碼時，請使用 `openclaw/plugin-sdk/interactive-runtime` 中的輔助函式：

```ts
import { interactiveReplyToPresentation, normalizeMessagePresentation, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新程式碼應直接接受或產生 `MessagePresentation`。

## 傳送釘選

釘選是傳送行為，而不是呈現方式。請使用 `delivery.pin` 而非提供者原生欄位（例如 `channelData.telegram.pin`）。

語意：

- `pin: true` 會釘選第一個成功傳送的訊息。
- `pin.notify` 預設為 `false`。
- `pin.required` 預設為 `false`。
- 選用的釘選失敗會降級，並保留已傳送的訊息。
- 必要的釘選失敗會導致傳送失敗。
- 分塊訊息會釘選第一個傳送的區塊，而不是尾部區塊。

對於提供者支援這些作業的現有訊息，手動 `pin`、`unpin` 和 `pins` 訊息動作仍然存在。

## 外掛作者檢查清單

- 當頻道可以呈現或安全降級語意呈現時，請從 `describeMessageTool(...)` 宣告 `presentation`。
- 將 `presentationCapabilities` 新增至執行時間輸出轉接器。
- 請在執行時間程式碼中實作 `renderPresentation`，而非控制平面外掛設定程式碼。
- 請將原生 UI 程式庫排除在熱設定/目錄路徑之外。
- 請在渲染器和測試中保留平台限制。
- 針對不支援的按鈕、選擇器、URL 按鈕、標題/文字重複，以及混合 `message` 加上 `presentation` 傳送，加入後備測試。
- 僅當提供者能釘選已傳送訊息 ID 時，才透過 `deliveryCapabilities.pin` 和 `pinDeliveredMessage` 新增傳遞釘選支援。
- 不要透過共享訊息動作架構暴露新的提供者原生卡片/區塊/元件/按鈕欄位。

## 相關文件

- [訊息 CLI](/zh-Hant/cli/message)
- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [Plugin 架構](/zh-Hant/plugins/architecture-internals#message-tool-schemas)
- [通道呈現重構計畫](/zh-Hant/plan/ui-channels)

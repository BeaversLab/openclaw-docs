---
title: "訊息呈現"
summary: "給頻道外掛程式使用的語意化訊息卡片、按鈕、選單、後援文字，以及傳遞提示"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

# 訊息呈現

訊息呈現是 OpenClaw 用於豐富型輸出聊天 UI 的共享合約。
它讓代理程式、CLI 指令、核准流程與外掛程式只需描述一次訊息
意圖，而每個頻道外掛程式則負責渲染其所能呈現的最佳原生形式。

使用呈現來建立可攜式的訊息 UI：

- 文字區段
- 小型情境/頁尾文字
- 分隔線
- 按鈕
- 選單
- 卡片標題與語氣

請勿將 Discord `components`、Slack
`blocks`、Telegram `buttons`、Teams `card` 或 Feishu `card` 等新的提供者原生欄位加入至共享
訊息工具中。這些是由頻道外掛程式擁有的渲染器輸出。

## 合約

外掛程式作者從以下位置匯入公開合約：

```ts
import type { MessagePresentation, ReplyPayloadDelivery } from "openclaw/plugin-sdk/interactive-runtime";
```

結構：

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

- `value` 是一個應用程式動作值，當頻道支援可點擊控制項時，會透過頻道的
  現有互動路徑進行路由。
- `url` 是一個連結按鈕。它可以在沒有 `value` 的情況下存在。
- `label` 是必填的，並且也用於文字後援中。
- `style` 僅供參考。渲染器應將不支援的樣式對應至安全的
  預設值，而不是導致傳送失敗。

選單語意：

- `options[].value` 是所選取的應用程式值。
- `placeholder` 僅供參考，且可能會被不支援原生
  選單的頻道忽略。
- 如果頻道不支援選單，後援文字會列出標籤。

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

僅限 URL 的連結按鈕：

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

固定傳遞：

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

包含明確 JSON 的固定傳遞：

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## 渲染器合約

頻道外掛程式在其輸出介面卡上宣告渲染支援：

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

功能欄位刻意設計為簡單的布林值。它們描述的是
渲染器能夠讓什麼變成可互動，而不是每一個原生平台的限制。渲染器仍然
擁有平台特定的限制，例如最大按鈕數量、區塊數量和
卡片大小。

## 核心渲染流程

當 `ReplyPayload` 或訊息動作包含 `presentation` 時，核心會：

1. 正規化呈現內容的載荷。
2. 解析目標頻道的輸出配接器。
3. 讀取 `presentationCapabilities`。
4. 當配接器可以渲染該載荷時，呼叫 `renderPresentation`。
5. 當配接器不存在或無法渲染時，回退為保守的文字。
6. 透過正常的頻道傳送路徑傳送產生的載荷。
7. 在第一次成功傳送訊息後，套用傳送元資料，例如 `delivery.pin`。

核心擁有回退行為，以便生產者能保持與頻道無關。頻道外掛則擁有原生渲染和互動處理。

## 降級規則

呈現內容必須能安全地在受限的頻道上傳送。

回退文字包含：

- `title` 作為第一行
- `text` 區塊作為一般段落
- `context` 區塊作為精簡的語境行
- `divider` 區塊作為視覺分隔符號
- 按鈕標籤，包括連結按鈕的 URL
- 選取選項標籤

不支援的原生控制項應該降級，而不是導致整個傳送失敗。範例：

- 停用內聯按鈕的 Telegram 會傳送文字回退。
- 不支援選取功能的頻道會將選取選項以文字列出。
- 純 URL 按鈕會變成原生連結按鈕或回退 URL 行。
- 選擇性的釘選失敗不會導致已傳送的訊息失敗。

主要的例外是 `delivery.pin.required: true`；如果要求必要釘選且頻道無法釘選該訊息，傳送會回報失敗。

## 供應商對應

目前內建的渲染器：

| 頻道            | 原生渲染目標     | 備註                                                                                                           |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Discord         | 元件和元件容器   | 為現有的供應商原生載荷生產者保留舊版的 `channelData.discord.components`，但新的共用傳送應使用 `presentation`。 |
| Slack           | Block Kit        | 為現有的供應商原生載荷生產者保留舊版的 `channelData.slack.blocks`，但新的共用傳送應使用 `presentation`。       |
| Telegram        | 文字加內聯鍵盤   | 按鈕/選取需要目標介面具備內聯按鈕功能；否則會使用文字回退。                                                    |
| Mattermost      | 文字加上互動屬性 | 其他區塊會降級為文字。                                                                                         |
| Microsoft Teams | Adaptive Cards   | 當同時提供純 `message` 文字和卡片時，純文字會包含在卡片中。                                                    |
| 飛書            | 互動式卡片       | 卡片標題可以使用 `title`；內容區會避免重複該標題。                                                             |
| 純文字頻道      | 文字回退         | 沒有渲染器的頻道仍然會獲得可讀的輸出。                                                                         |

提供者原生負載相容性是現有回覆產生器的過渡性支援。這不是新增共享原生欄位的理由。

## Presentation 與 InteractiveReply

`InteractiveReply` 是由核准和輔助函式使用的較舊內部子集。它支援：

- 文字
- 按鈕
- 選單

`MessagePresentation` 是標準的共享發送合約。它新增了：

- 標題
- 語氣
- 上下文
- 分隔線
- 僅 URL 按鈕
- 透過 `ReplyPayload.delivery` 傳遞通用遞送中繼資料

在橋接較舊的程式碼時，使用 `openclaw/plugin-sdk/interactive-runtime` 中的輔助函式：

```ts
import { interactiveReplyToPresentation, normalizeMessagePresentation, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

新程式碼應直接接受或產生 `MessagePresentation`。

## 遞送釘選

釘選是遞送行為，而非呈現方式。請使用 `delivery.pin` 而非提供者原生欄位，例如 `channelData.telegram.pin`。

語意：

- `pin: true` 會釘選第一個成功遞送的訊息。
- `pin.notify` 預設為 `false`。
- `pin.required` 預設為 `false`。
- 選用釘選失敗會降級並保持已發送訊息不變。
- 必要釘選失敗會導致遞送失敗。
- 分塊訊息會釘選第一個遞送的區塊，而非最後一個區塊。

手動的 `pin`、`unpin` 和 `pins` 訊息操作仍然存在於提供者支援這些操作的現有訊息中。

## 外掛作者檢查清單

- 當頻道可以呈現或安全地降級語意呈現時，從 `describeMessageTool(...)` 宣告 `presentation`。
- 將 `presentationCapabilities` 新增到執行時期外傳配接器。
- 在執行時期程式碼中實作 `renderPresentation`，而非在控制平面外掛設定程式碼中。
- 請將原生 UI 程式庫排除在熱設定/目錄路徑之外。
- 在轉譯器和測試中保留平台限制。
- 針對不支援的按鈕、選擇器、URL 按鈕、標題/文字
  重複，以及混合 `message` 加上 `presentation` 傳送，新增後備測試。
- 僅當提供者能釘選已傳送的訊息 ID 時，透過 `deliveryCapabilities.pin` 和
  `pinDeliveredMessage` 新增傳遞釘選支援。
- 不要透過共用的訊息動作架構公開新的提供者原生卡片/區塊/元件/按鈕欄位。

## 相關文件

- [訊息 CLI](/zh-Hant/cli/message)
- [外掛 SDK 概覽](/zh-Hant/plugins/sdk-overview)
- [外掛架構](/zh-Hant/plugins/architecture#message-tool-schemas)
- [通道呈現重構計畫](/zh-Hant/plan/ui-channels)

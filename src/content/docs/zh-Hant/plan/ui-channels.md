---
title: Channel Presentation 重構計劃
summary: 將語意化訊息呈現與通道原生 UI 渲染器解耦。
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

# Channel Presentation 重構計劃

## 狀態

已針對共享代理程式、CLI、外掛功能以及傳遞介面實作：

- `ReplyPayload.presentation` 攜帶語意化訊息 UI。
- `ReplyPayload.delivery.pin` 攜帶已傳送訊息的釘選請求。
- 共享訊息操作公開 `presentation`、`delivery` 和 `pin`，而非供應商原生的 `components`、`blocks`、`buttons` 或 `card`。
- 核心透過外掛宣告的傳出功能來渲染或自動降級呈現效果。
- Discord、Slack、Telegram、Mattermost、MS Teams 和 Feishu 渲染器使用通用合約。
- Discord 通道控制平面程式碼不再匯入 Carbon 支援的 UI 容器。

正式文件現位於 [Message Presentation](/zh-Hant/plugins/message-presentation)。
請將此計劃保留為歷史實作背景；若合約、渲染器或後續行為有變更，請更新正式指南。

## 問題

通道 UI 目前分散於數個不相容的介面：

- 核心透過 `buildCrossContextComponents` 擁有一個 Discord 形狀的跨上下文渲染器掛鉤。
- Discord `channel.ts` 可以透過 `DiscordUiContainer` 匯入原生 Carbon UI，這會將執行時期 UI 相依性拉入通道外掛控制平面。
- 代理程式和 CLI 公開原生 payload 逃逸方法，例如 Discord `components`、Slack `blocks`、Telegram 或 Mattermost `buttons`，以及 Teams 或 Feishu `card`。
- `ReplyPayload.channelData` 同時攜帶傳輸提示和原生 UI 封套。
- 通用 `interactive` 模型存在，但它比 Discord、Slack、Teams、Feishu、LINE、Telegram 和 Mattermost 已經使用的更豐富佈局更狹隘。

這使得核心能夠感知原生 UI 形狀，削弱了外掛執行時期的延遲載入特性，並給了代理程式太多供應商特定的方式來表達相同的訊息意圖。

## 目標

- Core 根據聲明的功能決定訊息的最佳語義呈現方式。
- 擴充套件聲明功能，並將語義呈現渲染為原生傳輸負載。
- Web 控制介面與聊天原生介面保持分離。
- 原生頻道負載不會透過共享 agent 或 CLI 訊息介面公開。
- 不支援的呈現功能會自動降級為最佳的文字表示形式。
- 傳送行為（例如釘選已發送的訊息）屬於通用傳遞元數據，而非呈現。

## 非目標

- 不為 `buildCrossContextComponents` 提供向後相容性填充。
- 不為 `components`、`blocks`、`buttons` 或 `card` 提供公開的原生逃生艙。
- 核心不導入頻道原生的 UI 函式庫。
- 不為捆綁的頻道提供特定於供應商的 SDK 接縫。

## 目標模型

在 `ReplyPayload` 中新增一個核心擁有的 `presentation` 欄位。

```ts
type MessagePresentationTone = "neutral" | "info" | "success" | "warning" | "danger";

type MessagePresentation = {
  tone?: MessagePresentationTone;
  title?: string;
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
```

在遷移期間，`interactive` 成為 `presentation` 的子集：

- `interactive` 文字區塊對應到 `presentation.blocks[].type = "text"`。
- `interactive` 按鈕區塊對應到 `presentation.blocks[].type = "buttons"`。
- `interactive` 選擇區塊對應到 `presentation.blocks[].type = "select"`。

外部 agent 和 CLI 結構描述現在使用 `presentation`；`interactive` 則保留為內部舊版解析器/渲染輔助工具，供現有的回覆產生器使用。

## 傳遞元數據

新增一個核心擁有的 `delivery` 欄位，用於非 UI 的傳送行為。

```ts
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

語義：

- `delivery.pin = true` 表示釘選第一個成功傳送的訊息。
- `notify` 預設為 `false`。
- `required` 預設為 `false`；不支援的頻道或釘選失敗會透過繼續傳遞來自動降級。
- 手動 `pin`、`unpin` 和 `list-pins` 訊息操作保留用於現有訊息。

目前的 Telegram ACP 主題綁定應從 `channelData.telegram.pin = true` 移至 `delivery.pin = true`。

## 運行時功能合約

將展示和傳送渲染鉤子新增至運行時輸出介面卡，而非控制平面頻道外掛程式。

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
};

type ChannelDeliveryCapabilities = {
  pinSentMessage?: boolean;
};

type ChannelOutboundAdapter = {
  presentationCapabilities?: ChannelPresentationCapabilities;

  renderPresentation?: (params: { payload: ReplyPayload; presentation: MessagePresentation; ctx: ChannelOutboundSendContext }) => ReplyPayload | null;

  deliveryCapabilities?: ChannelDeliveryCapabilities;

  pinDeliveredMessage?: (params: { cfg: OpenClawConfig; accountId?: string | null; to: string; threadId?: string | number | null; messageId: string; notify: boolean }) => Promise<void>;
};
```

核心行為：

- 解析目標頻道和運行時介面卡。
- 詢問展示能力。
- 在渲染前降級不支援的區塊。
- 呼叫 `renderPresentation`。
- 如果沒有渲染器，將展示轉換為文字後備方案。
- 成功傳送後，當請求並支援 `delivery.pin` 時，呼叫 `pinDeliveredMessage`。

## 頻道對應

Discord：

- 在僅限運行時的模組中，將 `presentation` 渲染為元件 v2 和 Carbon 容器。
- 將輔色輔助函式保留在輕量級模組中。
- 從頻道外掛程式控制平面程式碼中移除 `DiscordUiContainer` 匯入。

Slack：

- 將 `presentation` 渲染為 Block Kit。
- 移除代理程式和 CLI `blocks` 輸入。

Telegram：

- 將文字、上下文和分隔線渲染為文字。
- 在已配置且允許目標介面時，將動作和選擇渲染為內聯鍵盤。
- 停用內聯按鈕時使用文字後備方案。
- 將 ACP 主題釘選移至 `delivery.pin`。

Mattermost：

- 在配置的地方將動作渲染為互動式按鈕。
- 將其他區塊渲染為文字後備方案。

MS Teams：

- 將 `presentation` 渲染為 Adaptive Cards。
- 保留手動釘選/取消釘選/列出釘選動作。
- 如果 Graph 支援對於目標對話可靠，則選擇性地實作 `pinDeliveredMessage`。

Feishu：

- 將 `presentation` 渲染為互動式卡片。
- 保留手動釘選/取消釘選/列出釘選動作。
- 如果 API 行為可靠，則選擇性地實作 `pinDeliveredMessage` 以進行傳送訊息的釘選。

LINE：

- 盡可能將 `presentation` 渲染為 Flex 或範本訊息。
- 將不支援的區塊後備為文字。
- 從 `channelData` 中移除 LINE UI 承載。

純文字或受限頻道：

- 將展示轉換為採用保守格式的文字。

## 重構步驟

1. 重新套用 Discord 發行修復程式，將 `ui-colors.ts` 從 Carbon 支援的 UI 分離，並從 `extensions/discord/src/channel.ts` 移除 `DiscordUiContainer`。
2. 新增 `presentation` 和 `delivery` 到 `ReplyPayload`、輸出載荷正規化、傳遞摘要以及 Hook 載荷中。
3. 在狹窄的 SDK/運行時子路徑中新增 `MessagePresentation` 結構描述和解析器輔助函式。
4. 使用語意呈現功能取代訊息功能 `buttons`、`cards`、`components` 和 `blocks`。
5. 新增運行時輸出轉接器 Hook，用於呈現轉譯和傳遞釘選。
6. 使用 `buildCrossContextPresentation` 取代跨情境元件建構。
7. 刪除 `src/infra/outbound/channel-adapters.ts` 並從通道外掛類型中移除 `buildCrossContextComponents`。
8. 變更 `maybeApplyCrossContextMarker` 以附加 `presentation`，而不是原生參數。
9. 更新外掛分派發送路徑，使其僅使用語意呈現和傳遞中繼資料。
10. 移除 Agent 和 CLI 的原生載荷參數：`components`、`blocks`、`buttons` 和 `card`。
11. 移除建立原生訊息工具結構描述的 SDK 輔助函式，並以呈現結構描述輔助函式取代。
12. 從 `channelData` 中移除 UI/原生包層；在審查每個剩餘欄位之前，僅保留傳輸中繼資料。
13. 遷移 Discord、Slack、Telegram、Mattermost、MS Teams、飛書和 LINE 轉譯器。
14. 更新訊息 CLI、通道頁面、外掛 SDK 和功能食譜的文件。
15. 針對 Discord 和受影響的通道進入點執行匯出擴散分析。

步驟 1-11 和 13-14 已在此重構中針對共用 Agent、CLI、外掛功能和輸出轉接器合約實作。步驟 12 仍然是針對供應商私用 `channelData` 傳輸包層的更深入內部清理階段。步驟 15 則保留為後續驗證，如果我們需要超出類型/測試閘道的量化匯出擴散數字。

## 測試

新增或更新：

- 呈現正規化測試。
- 針對不支援區塊的呈現自動降級測試。
- 外掛分派和核心傳遞路徑的跨情境標記測試。
- 針對 Discord、Slack、Telegram、Mattermost、MS Teams、飛書、LINE 和文字回退的通道呈現矩陣測試。
- 訊息工具 Schema 測試，證明原生欄位已移除。
- CLI 測試，證明原生旗標已移除。
- Discord 進入點匯入延遲迴歸測試，涵蓋 Carbon。
- 傳遞固定測試，涵蓋 Telegram 和通用回退。

## 未解決的問題

- 應在第一階段為 Discord、Slack、MS Teams 和飛書實作 `delivery.pin`，還是先僅針對 Telegram 實作？
- `delivery` 是否應最終吸收現有欄位，例如 `replyToId`、`replyToCurrent`、`silent` 和 `audioAsVoice`，還是繼續專注於傳送後的行為？
- 呈現層應直接支援圖片或檔案參照，還是讓媒體暫時與 UI 佈局分離？

---
summary: 將語意訊息呈現與通道原生 UI 渲染器解耦。
title: 通道呈現重構計劃
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

## 狀態

已針對共享代理程式、CLI、外掛程式功能以及輸出傳遞介面實作：

- `ReplyPayload.presentation` 承載語意訊息 UI。
- `ReplyPayload.delivery.pin` 承載已傳送訊息的釘選請求。
- 共享訊息操作公開 `presentation`、`delivery` 和 `pin`，而不是提供者原生的 `components`、`blocks`、`buttons` 或 `card`。
- Core 透過外掛程式宣告的輸出功能來呈現或自動降級呈現。
- Discord、Slack、Telegram、Mattermost、MS Teams 和 Feishu 渲染器會使用通用合約。
- Discord 通道控制平面程式碼不再匯入 Carbon 支援的 UI 容器。

正式文件現位於 [訊息呈現](/zh-Hant/plugins/message-presentation)。
請將此計劃保留為歷史實作內容；若合約、渲染器或後備行為有所變更，請更新正式指南。

## 問題

通道 UI 目前分散在數個不相容的介面上：

- Core 透過 `buildCrossContextComponents` 擁有一個 Discord 形狀的跨語境渲染器掛勾。
- Discord `channel.ts` 可以透過 `DiscordUiContainer` 匯入原生 Carbon UI，這會將執行時期 UI 相依性拉進通道外掛程式控制平面。
- 代理程式和 CLI 公開原生 payload 脫逸方法，例如 Discord `components`、Slack `blocks`、Telegram 或 Mattermost `buttons`，以及 Teams 或 Feishu `card`。
- `ReplyPayload.channelData` 同時承載傳輸提示和原生 UI 封套。
- 通用 `interactive` 模型已存在，但它比 Discord、Slack、Teams、Feishu、LINE、Telegram 和 Mattermost 已使用的更豐富版面配置更狹隘。

這會讓 Core 意識到原生 UI 形狀，削弱外掛程式執行時期的延遲載入，並讓代理程式有太多提供者特定方式來表達相同的訊息意圖。

## 目標

- Core 從宣告的功能中決定訊息的最佳語意呈現。
- 擴充功能宣告能力並將語義展示轉譯為原生傳輸承載。
- Web 控制介面與聊天原生介面保持分離。
- 原生通道承載不會透過共享代理程式或 CLI 訊息介面公開。
- 不支援的展示功能會自動降級為最佳的文字表示形式。
- 釘選已發送訊息等傳遞行為屬於一般傳遞元數據，而非展示。

## 非目標

- 沒有針對 `buildCrossContextComponents` 的向後相容性填充層。
- 沒有針對 `components`、`blocks`、`buttons` 或 `card` 的公開原生逃逸機制。
- 核心程式碼不匯入通道原生的 UI 程式庫。
- 沒有針對內建通道的供應商特定 SDK 縫隙。

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

在遷移期間，`interactive` 變成 `presentation` 的子集：

- `interactive` 文字區塊對應到 `presentation.blocks[].type = "text"`。
- `interactive` 按鈕區塊對應到 `presentation.blocks[].type = "buttons"`。
- `interactive` 選擇區塊對應到 `presentation.blocks[].type = "select"`。

外部代理程式和 CLI 綱要現在使用 `presentation`；`interactive` 保持為現有回覆產生器的內部舊版剖析/轉譯輔助工具。

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

- `delivery.pin = true` 表示釘選第一個成功傳遞的訊息。
- `notify` 預設為 `false`。
- `required` 預設為 `false`；不支援的通道或釘選失敗會透過繼續傳遞自動降級。
- 手動 `pin`、`unpin` 和 `list-pins` 訊息動作保留給現有訊息。

目前的 Telegram ACP 主題綁定應從 `channelData.telegram.pin = true` 移至 `delivery.pin = true`。

## 執行時期能力合約

將呈現和傳遞渲染掛鉤新增至執行時期輸出介接器，而非控制平面頻道外掛程式。

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

- 解析目標頻道和執行時期介接器。
- 詢問呈現能力。
- 在渲染前降級不支援的區塊。
- 呼叫 `renderPresentation`。
- 如果不存在渲染器，將呈現轉換為文字後援方案。
- 成功傳送後，當請求並支援 `delivery.pin` 時，呼叫 `pinDeliveredMessage`。

## 頻道映射

Discord：

- 在僅限執行時期的模組中，將 `presentation` 渲染為 components v2 和 Carbon 容器。
- 將強調色彩輔助函式保留在輕量級模組中。
- 從頻道外掛程式控制平面程式碼中移除 `DiscordUiContainer` 匯入。

Slack：

- 將 `presentation` 渲染為 Block Kit。
- 移除 Agent 和 CLI 的 `blocks` 輸入。

Telegram：

- 將文字、內文和分隔線渲染為文字。
- 當已設定且允許目標介面時，將動作和選擇渲染為內聯鍵盤。
- 停用內聯按鈕時使用文字後援方案。
- 將 ACP 主題釘選移至 `delivery.pin`。

Mattermost：

- 在已設定的位置將動作渲染為互動式按鈕。
- 將其他區塊渲染為文字後援方案。

MS Teams：

- 將 `presentation` 渲染為 Adaptive Cards。
- 保留手動釘選/取消釘選/列出釘選的動作。
- 如果目標對話的 Graph 支援可靠，則選擇性實作 `pinDeliveredMessage`。

Feishu：

- 將 `presentation` 渲染為互動式卡片。
- 保留手動釘選/取消釘選/列出釘選的動作。
- 如果 API 行為可靠，則選擇性實作 `pinDeliveredMessage` 以進行已傳送訊息的釘選。

LINE：

- 盡可能將 `presentation` 渲染為 Flex 或範本訊息。
- 針對不支援的區塊，降級為文字。
- 從 `channelData` 中移除 LINE UI 承載。

純文字或受限制的頻道：

- 將呈現轉換為具保守格式的文字。

## 重構步驟

1. 重新套用 Discord 版本修復，該修復將 `ui-colors.ts` 從 Carbon 支援的 UI 分離，並從 `extensions/discord/src/channel.ts` 中移除 `DiscordUiContainer`。
2. 將 `presentation` 和 `delivery` 新增至 `ReplyPayload`、輸出負載正規化、傳遞摘要以及 Hook 負載。
3. 在狹窄的 SDK/runtime 子路徑中新增 `MessagePresentation` 結構描述和解析器輔助程式。
4. 將訊息功能 `buttons`、`cards`、`components` 和 `blocks` 取換為語意呈現功能。
5. 新增用於呈現渲染和傳遞釘選的執行時期輸出配接器 Hooks。
6. 用 `buildCrossContextPresentation` 取換跨上下文元件建構。
7. 刪除 `src/infra/outbound/channel-adapters.ts` 並從通道外掛類型中移除 `buildCrossContextComponents`。
8. 變更 `maybeApplyCrossContextMarker` 以附加 `presentation` 而非原生參數。
9. 更新外插件分派發送路徑以僅使用語意呈現和傳遞中繼資料。
10. 移除代理程式和 CLI 原生負載參數：`components`、`blocks`、`buttons` 和 `card`。
11. 移除建立原生訊息工具結構描述的 SDK 輔助程式，並將其取換為呈現結構描述輔助程式。
12. 從 `channelData` 中移除 UI/原生信封；僅保留傳輸中繼資料，直到審查每個剩餘欄位為止。
13. 遷移 Discord、Slack、Telegram、Mattermost、MS Teams、飛書和 LINE 的渲染器。
14. 更新訊息 CLI、通道頁面、外掛 SDK 和功能食譜的文件。
15. 對 Discord 和受影響的通道入口點執行匯出分發分析。

步驟 1-11 和 13-14 已在此重構中針對共用代理程式、CLI、外掛功能和輸出配接器合約實作。步驟 12 仍是針對提供者專用 `channelData` 傳輸信封的更深层內部清理階段。步驟 15 則是後續驗證，如果我們需要超出類型/測試門檻的量化匯出分發數值。

## 測試

新增或更新：

- 呈現正規化測試。
- 不支援區塊的呈現自動降級測試。
- 外插件分派和核心傳遞路徑的跨上下文標記測試。
- 針對 Discord、Slack、Telegram、Mattermost、MS Teams、Feishu、LINE 和文字後備的頻道渲染矩陣測試。
- 證明原生欄位已移除的訊息工具架構測試。
- 證明原生旗標已移除的 CLI 測試。
- 涵蓋 Carbon 的 Discord 進入點匯入惰性回歸測試。
- 涵蓋 Telegram 和通用後備的傳遞固定測試。

## 未解決的問題

- 應該在第一階段為 Discord、Slack、MS Teams 和 Feishu 實作 `delivery.pin`，還是先僅針對 Telegram 實作？
- `delivery` 最終應該吸收現有欄位，例如 `replyToId`、`replyToCurrent`、`silent` 和 `audioAsVoice`，還是應該專注於傳送後的行為？
- 呈現層是否應該直接支援圖片或檔案參照，還是媒體應暫時與 UI 佈局分開？

## 相關

- [頻道概述](/zh-Hant/channels)
- [訊息呈現](/zh-Hant/plugins/message-presentation)

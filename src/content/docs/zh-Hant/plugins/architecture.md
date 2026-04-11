---
summary: "外掛內部：能力模型、所有權、契約、載入管線和執行時期輔助程式"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "外掛內部"
sidebarTitle: "內部"
---

# Plugin Internals

<Info>這是**深度架構參考**。如需實用指南，請參閱： - [安裝並使用外掛](/en/tools/plugin) — 用戶指南 - [入門教學](/en/plugins/building-plugins) — 第一個外掛教學 - [頻道外掛](/en/plugins/sdk-channel-plugins) — 建構訊息頻道 - [提供者外掛](/en/plugins/sdk-provider-plugins) — 建構模型提供者 - [SDK 概覽](/en/plugins/sdk-overview) — import map 與註冊 API</Info>

This page covers the internal architecture of the OpenClaw plugin system.

## Public capability model

Capabilities are the public **native plugin** model inside OpenClaw. Every
native OpenClaw plugin registers against one or more capability types:

| Capability     | Registration method                              | Example plugins                      |
| -------------- | ------------------------------------------------ | ------------------------------------ |
| Text inference | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推論後端   | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 語音           | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 即時文字轉錄   | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 即時語音       | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒體理解       | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 圖像生成       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音樂生成       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 影片生成       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 網頁擷取       | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 網路搜尋       | `api.registerWebSearchProvider(...)`             | `google`                             |
| 頻道 / 傳訊    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

註冊零個能力但提供 hooks、工具或服務的外掛是**僅使用舊版 hook** 的外掛。該模式仍受到完全支援。

### 外部相容性立場

能力模型已在核心中落地，並由目前的內建/原生外掛使用，但外掛相容性的門檻仍需高於「它已被匯出，因此它已被凍結」。

目前的指導方針：

- **現有外部外掛：** 維持基於 hook 的整合運作；將此視為相容性基準
- **新的內建/原生外掛：** 優先使用明確的能力註冊，而非特定廠商的深入存取或新的僅使用 hook 的設計
- **採用功能註冊的外掛程式：** 允許，但請將特定功能的輔助介面視為持續演進中，除非文件明確將合約標記為穩定

實用規則：

- 功能註冊 API 是預期的發展方向
- 在過渡期間，舊版鉤子仍然是外掛程式最安全的無中斷路徑
- 匯出的輔助子路徑並非完全等同；請優先使用狹義記載的合約，而非附帶的輔助匯出

### 外掛程式形狀

OpenClaw 會根據每個已載入外掛程式的實際註冊行為（而不僅僅是靜態元資料）將其分類為一種形狀：

- **plain-capability** -- 恰好註冊一種功能類型（例如僅提供者的外掛程式，如 `mistral`）
- **hybrid-capability** -- 註冊多種功能類型（例如 `openai` 擁有文字推論、語音、媒體理解和圖像生成功能）
- **hook-only** -- 僅註冊鉤子（類型化或自訂），不註冊功能、工具、指令或服務
- **non-capability** -- 註冊工具、指令、服務或路由，但不註冊功能

使用 `openclaw plugins inspect <id>` 來查看外掛程式的形狀和功能細分。詳情請參閱 [CLI 參考資料](/en/cli/plugins#inspect)。

### 舊版鉤子

`before_agent_start` 鉤子仍然作為僅鉤子外掛程式的相容性路徑受到支援。現實世界中的舊版外掛程式仍然依賴它。

方向：

- 保持其運作
- 將其記載為舊版
- 優先使用 `before_model_resolve` 進行模型/提供者覆寫工作
- 優先使用 `before_prompt_build` 進行提示詞變異工作
- 僅在實際使用率下降，且裝置覆蓋率證明移轉安全性後才移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到以下標籤之一：

| 訊號                       | 含義                                               |
| -------------------------- | -------------------------------------------------- |
| **config valid**           | 設定解析正常且外掛程式已解析                       |
| **compatibility advisory** | 外掛程式使用受支援但較舊的模式（例如 `hook-only`） |
| **legacy warning**         | 外掛程式使用 `before_agent_start`，該功能已被棄用  |
| **hard error**             | 設定無效或外掛程式載入失敗                         |

目前 `hook-only` 和 `before_agent_start` 都不會導致您的外掛程式崩潰 ——
`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些
訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛程式系統分為四層：

1. **資訊清單 + 探索**
   OpenClaw 從設定的路徑、工作區根目錄、
   全域擴充功能根目錄和內綑擴充功能中尋找候選外掛程式。探索機制會先讀取原生
   `openclaw.plugin.json` 資訊清單以及受支援的內綑資訊清單。
2. **啟用 + 驗證**
   核心系統會決定探索到的外掛程式是已啟用、已停用、已封鎖，
   還是被選中用於記憶體等獨佔插槽。
3. **執行時間載入**
   原生 OpenClaw 外掛程式會透過 jiti 載入至同一進程，並將
   功能註冊到中央登錄表中。相容的內綑會被標準化為
   登錄記錄，而無需匯入執行時間程式碼。
4. **介面消耗**
   OpenClaw 的其餘部分會讀取登錄表以公開工具、頻道、提供者
   設定、Hook、HTTP 路由、CLI 指令和服務。

具體來說，對於外掛程式 CLI，根指令探索分為兩個階段：

- 剖析時期的元資料來自 `registerCli(..., { descriptors: [...] })`
- 真正的外掛程式 CLI 模組可以保持延遲載入，並在首次呼叫時註冊

這樣既能將外掛程式擁有的 CLI 程式碼保留在外掛程式內部，又能讓 OpenClaw
在剖析之前預留根指令名稱。

重要的設計邊界：

- 探索 + 設定驗證應該僅透過 **資訊清單/架構元資料** 運作，
  而無需執行外掛程式程式碼
- 原生執行時間行為來自外掛程式模組的 `register(api)` 路徑

這種分割讓 OpenClaw 能夠在完整執行時間啟動之前驗證設定、解釋遺失/已停用的外掛程式，
並建構 UI/架構提示。

### 頻道外掛程式與共用訊息工具

對於一般的聊天動作，頻道外掛程式不需要註冊個別的傳送/編輯/反應工具。
OpenClaw 在核心中保留一個共用的 `message` 工具，
而頻道外掛程式則擁有其背後特定於頻道的探索和執行邏輯。

目前的邊界是：

- core 擁有共享的 `message` 工具主機、提示連線、會話/執行緒記帳以及執行分派
- 通道外掛擁有範圍限定的動作探索、能力探索，以及任何通道特定的 schema 片段
- 通道外掛擁有提供者特定的會話對話語法，例如對話 ID 如何編碼執行緒 ID 或繼承自父對話
- 通道外掛透過其動作配接器執行最終動作

對於通道外掛，SDK 表面是
`ChannelMessageActionAdapter.describeMessageTool(...)`。該統一的探索呼叫讓外掛能夠一起回傳其可見的動作、能力和 schema 貢獻，以免這些部分分道揚鑣。

Core 將執行時範圍傳遞至該探索步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的傳入 `requesterSenderId`

這對於情境感知外掛很重要。通道可以根據使用中的帳戶、目前的房間/執行緒/訊息或受信任的請求者身分來隱藏或公開訊息動作，而不需要在核心 `message` 工具中硬編碼通道特定的分支。

這就是為什麼嵌入式執行器路由變更仍然是外掛工作的原因：執行器負責將目前的聊天/會話身分轉發至外掛探索邊界，以便共享的 `message` 工具針對當前輪次公開正確的通道擁有表面。

對於通道擁有的執行輔助程式，捆綁的外掛應將執行時保持在它們自己的擴充模組內。Core 不再擁有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 訊息動作執行時。我們不發佈單獨的 `plugin-sdk/*-action-runtime` 子路徑，且捆綁外掛應直接從其擁有的擴充模組匯入它們自己的本機執行時程式碼。

同樣的邊界通常也適用於提供者命名的 SDK 縫隙：core 不應匯入針對 Slack、Discord、Signal、WhatsApp 或類似擴充功能的特定通道便利 barrel。如果 core 需要某種行為，請使用捆綁外掛程式自己的 `api.ts` / `runtime-api.ts` barrel，或是將需求提升為共享 SDK 中的一個狹窄通用功能。

具體針對投票，有兩種執行路徑：

- `outbound.sendPoll` 是適用於符合常見投票模型之通道的共享基線
- `actions.handleAction("poll")` 是針對通道特定投票語意或額外投票參數的偏好路徑

Core 現在會將共享投票解析延遲到外掛程式投票分派拒絕該動作之後，因此外掛程式擁有的投票處理程序可以接受通道特定的投票欄位，而不會先被通用投票解析器阻擋。

如需完整的啟動順序，請參閱 [載入管線](#load-pipeline)。

## 功能擁有權模型

OpenClaw 將原生外掛程式視為 **公司** 或 **功能** 的擁有權邊界，而非一個裝滿無關整合的雜物袋。

這表示：

- 公司外掛程式通常應該擁有該公司所有面向 OpenClaw 的介面
- 功能外掛程式通常應該擁有其引入的完整功能介面
- 通道應該使用共享核心功能，而不是臨時重新實作提供者行為

範例：

- 捆綁的 `openai` 外掛程式擁有 OpenAI 模型提供者行為以及 OpenAI 語音 + 即時語音 + 媒體理解 + 圖像生成行為
- 捆綁的 `elevenlabs` 外掛程式擁有 ElevenLabs 語音行為
- 捆綁的 `microsoft` 外掛程式擁有 Microsoft 語音行為
- 捆綁的 `google` 外掛程式擁有 Google 模型提供者行為以及 Google 媒體理解 + 圖像生成 + 網路搜尋行為
- 捆綁的 `firecrawl` 外掛程式擁有 Firecrawl 網路擷取行為
- 捆綁的 `minimax`、`mistral`、`moonshot` 和 `zai` 外掛程式各自擁有其媒體理解後端
- 捆綁的 `qwen` 外掛程式擁有 Qwen 文字提供者行為，以及
  媒體理解和影片生成行為
- `voice-call` 外掛程式是一個功能外掛程式：它擁有通話傳輸、工具、
  CLI、路由和 Twilio 媒體串流橋接，但它消耗共享的語音
  以及即時轉錄和即時語音功能，而不是
  直接匯入供應商外掛程式

預期的最終狀態是：

- OpenAI 駐留在一個外掛程式中，即使它跨越文字模型、語音、圖片和
  未來的影片
- 另一個供應商可以為其自己的領域做同樣的事情
- 通道不在乎哪個供應商外掛程式擁有該提供者；它們消耗核心
  公開的共享功能合約

這是關鍵區別：

- **外掛程式** = 所有權邊界
- **功能** = 多個外掛程式可以實作或消耗的核心合約

因此，如果 OpenClaw 新增一個新的領域（例如影片），第一個問題不是
「哪個提供者應該硬編碼影片處理？」。第一個問題是「核心影片功能合約是什麼？」。
一旦該合約存在，供應商外掛程式就可以對其進行註冊，而通道/功能外掛程式可以消耗它。

如果該功能尚不存在，正確的做法通常是：

1. 在核心中定義缺失的功能
2. 以類型化的方式透過外掛程式 API/執行時期公開它
3. 針對該功能連接通道/功能
4. 讓供應商外掛程式註冊實作

這保持了所有權的明確性，同時避免了依賴於
單一供應商或一次性外掛程式特定程式碼路徑的核心行為。

### 功能分層

在決定程式碼屬於哪裡時，請使用此心智模型：

- **核心功能層**：共享的協調、原則、後備、組態
  合併規則、傳遞語意和類型化合約
- **供應商外掛程式層**：供應商特定的 API、驗證、模型目錄、語音
  合成、圖片生成、未來的影片後端、使用量端點
- **通道/功能外掛程式層**：Slack/Discord/語音通話/等整合，
  消耗核心功能並在表面上呈現它們

例如，TTS 遵循此形狀：

- 核心擁有回覆時間 TTS 原則、後備順序、偏好設定和通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消耗電話 TTS 執行時期輔助程式

未來的功能應優先採用相同的模式。

### 多功能公司外掛範例

公司外掛在外部應感覺渾然一體。如果 OpenClaw 擁有模型、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網路擷取和網路搜尋的共用合約，供應商可以在一個地方擁有其所有介面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import { describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // vendor speech config — implement the SpeechProviderPlugin interface directly
    });

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // credential + fetch logic
      }),
    );
  },
};

export default plugin;
```

重要的不是確切的輔助程式名稱，而是其形狀：

- 一個外掛擁有供應商介面
- 核心仍然擁有功能合約
- 通道和功能外掛消耗 `api.runtime.*` 輔助程式，而非供應商程式碼
- 合約測試可以斷言外掛已註冊其聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已將影像/音訊/影片理解視為一個共用功能。相同的擁有權模型適用於此：

1. 核心定義媒體理解合約
2. 供應商外掛視情況註冊 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道和功能外掛消耗共用的核心行為，而不是直接連接供應商程式碼

這可以避免將某個供應商的影片假設烘焙到核心中。外掛擁有供應商介面；核心擁有功能合約和後備行為。

影片生成已經使用相同的序列：核心擁有類型化的功能合約和執行時期輔助程式，供應商外掛針對它註冊 `api.registerVideoGenerationProvider(...)` 實作。

需要具體的推出檢查清單？請參閱
[功能食譜](/en/tools/capability-cookbook)。

## 合約與執行

外掛 API 介面刻意在 `OpenClawPluginApi` 中進行類型化和集中。該合約定義了支援的註冊點和外掛可能依賴的執行時期輔助程式。

為何這很重要：

- 外掛作者獲得一個穩定的內部標準
- 核心可以拒絕重複的擁有權，例如兩個外掛註冊相同的供應商 ID
- 啟動時可以針對格式錯誤的註冊提供可執行的診斷資訊
- 合約測試可以執行捆綁外掛的擁有權並防止無聲偏移

有兩個執行層級：

1. **執行時期註冊強制執行**
   外掛程式註冊表會在外掛程式載入時驗證註冊。範例：
   重複的提供者 ID、重複的語音提供者 ID 以及格式錯誤的
   註冊會產生外掛程式診斷資訊，而不是未定義的行為。
2. **合約測試**
   套件的外掛程式會在測試執行期間被擷取到合約註冊表中，以便
   OpenClaw 可以明確斷言擁有權。目前這用於模型
   提供者、語音提供者、網路搜尋提供者以及套件註冊
   擁有權。

實際效果是 OpenClaw 預先知道哪個外掛程式擁有哪個
表面。這讓核心和頻道可以無縫組成，因為擁有權是
被宣告、型別化且可測試的，而不是隱含的。

### 什麼屬於合約

良好的外掛程式合約是：

- 具型別的
- 小的
- 特定功能的
- 由核心擁有
- 可被多個外掛程式重用
- 可由頻道/功能消耗而無需廠商知識

不良的外掛程式合約是：

- 隱藏在核心中的廠商特定政策
- 繞過註冊表的一次性外掛程式緊急逃生門
- 直接存取廠商實作的頻道程式碼
- 非 `OpenClawPluginApi` 或
  `api.runtime` 一部分的臨時執行時期物件

如有疑問，請提高抽象層級：先定義功能，然後
讓外掛程式插入其中。

## 執行模型

原生 OpenClaw 外掛程式與閘道 **同處理序** 執行。它們未
沙箱化。已載入的原生外掛程式具有與
核心程式碼相同的處理序層級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、掛鉤和服務
- 原生外掛程式的錯誤可能會導致閘道當機或不穩定
- 惡意的原生外掛程式相當於在 OpenClaw 處理程序內執行任意程式碼

相容的套件預設情況下更安全，因為 OpenClaw 目前將它們
視為中繼資料/內容套件。在目前的版本中，這主要是指套件
技能。

對於非套件的外掛程式，請使用允許清單和明確的安裝/載入路徑。請將
工作區外掛程式視為開發時期的程式碼，而非生產環境預設值。

對於捆綁的 workspace 套件名稱，請預設將插件 id 錨定在 npm 名稱中：`@openclaw/<id>`，或者當套件刻意公開更狹窄的插件角色時，使用核准的類型後綴，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要的信任提示：

- `plugins.allow` 信任的是**插件 id**，而非來源出處。
- 當啟用或加入允許清單時，id 與捆綁插件相同的 workspace 插件會刻意遮蔽該捆綁副本。
- 這是正常的，且對於本機開發、修補程式測試和熱修復很有用。

## 匯出邊界

OpenClaw 匯出的是能力，而非實作便利性。

保持能力註冊為公開。修剪非契約的輔助匯出：

- 捆綁插件特定的輔助子路徑
- 非意指作為公開 API 的執行時管道子路徑
- 供應商特定的便利輔助程式
- 屬於實作細節的設定/上架輔助程式

部分捆綁插件的輔助子路徑仍保留在產生的 SDK 匯出對應中，以維持相容性和捆綁插件維護。目前的範例包括 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 以及幾個 `plugin-sdk/matrix*` 縫隙。請將其視為保留的實作細節匯出，而非新的第三方插件的推薦 SDK 模式。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選插件根目錄
2. 讀取原生或相容的捆綁清單與套件元資料
3. 拒絕不安全的候選項
4. 正規化插件配置 (`plugins.enabled`、`allow`、`deny`、`entries`、`slots`、`load.paths`)
5. 決定每個候選項的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` (或 `activate(api)` —— 一個舊版別名) hooks，並將註冊收集到插件註冊表中
8. 將註冊表公開給指令/執行時層

<Note>`activate` 是 `register` 的舊版別名 — 加載器會解析存在的任何一個 (`def.register ?? def.activate`) 並在同一點調用它。所有打包的插件都使用 `register`；對於新插件，建議使用 `register`。</Note>

安全檢查發生在**運行時執行之前**。當入口點逃離插件根目錄、路徑為全局可寫，或者非打包插件的路徑所有權看起來可疑時，候選插件將被阻止。

### 清單優先行為

清單是控制平面的事實來源。OpenClaw 使用它來：

- 識別插件
- 發現聲明的通道/技能/配置結構或捆綁功能
- 驗證 `plugins.entries.<id>.config`
- 增強控制 UI 標籤/佔位符
- 顯示安裝/目錄元數據

對於原生插件，運行時模塊是數據平面部分。它註冊實際行為，例如鉤子、工具、命令或提供者流程。

### 加載器緩存的內容

OpenClaw 為以下內容保持短期的進程內緩存：

- 發現結果
- 清單註冊表數據
- 已加載的插件註冊表

這些緩存減少了突發啟動和重複命令的開銷。可以安全地將它們視為短期性能緩存，而非持久化存儲。

性能注意事項：

- 設置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用這些緩存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整緩存窗口。

## 註冊表模型

已加載的插件不會直接修改隨機的核心全局變量。它們註冊到中央插件註冊表中。

註冊表跟蹤：

- 插件記錄（身分、來源、起源、狀態、診斷）
- 工具
- 舊版鉤子和類型化鉤子
- 通道
- 提供者
- 網關 RPC 處理程序
- HTTP 路由
- CLI 註冊器
- 後台服務
- 插件擁有的命令

核心功能然後從該註冊表讀取，而不是直接與插件模塊通信。這使得加載過程保持單向：

- 插件模塊 -> 註冊表註冊
- 核心運行時 -> 註冊表消費

這種分離對於可維護性很重要。這意味著大多數核心表面只需要一個集成點：「讀取註冊表」，而不是「對每個插件模塊進行特殊處理」。

## 對話綁定回調

綁定對話的外掛程式可以在審核獲得解析時做出反應。

使用 `api.onConversationBindingResolved(...)` 在綁定
請求獲得批准或拒絕後接收回呼：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回呼負載欄位：

- `status`: `"approved"` 或 `"denied"`
- `decision`: `"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`: 已獲批准請求的解析後綁定
- `request`: 原始請求摘要、分離提示、傳送者 ID 及
  對話元資料

此回呼僅供通知。它不會改變誰被允許綁定
對話，並且在核心審核處理完成後執行。

## 提供者執行階段 Hooks

提供者外掛程式現在有兩個層級：

- 清單元資料：`providerAuthEnvVars` 用於在執行階段載入前快速查詢提供者環境授權
  、`channelEnvVars` 用於在執行階段載入前快速查詢通道環境/設定
  ，以及 `providerAuthChoices` 用於在執行階段載入前快速獲取上架/授權選擇
  標籤和 CLI 標誌元資料
- 設定階段 hooks：`catalog` / 舊版 `discovery` 加上 `applyConfigDefaults`
- runtime hooks: `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `resolveExternalAuthProfiles`,
  `shouldDeferSyntheticProfileAuth`,
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `contributeResolvedModelCompat`, `capabilities`,
  `normalizeToolSchemas`, `inspectToolSchemas`,
  `resolveReasoningOutputMode`, `prepareExtraParams`, `createStreamFn`,
  `wrapStreamFn`, `resolveTransportTurnState`,
  `resolveWebSocketSessionPolicy`, `formatApiKey`, `refreshOAuth`,
  `buildAuthDoctorHint`, `matchesContextOverflowError`,
  `classifyFailoverReason`, `isCacheTtlEligible`,
  `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`,
  `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `createEmbeddingProvider`,
  `buildReplayPolicy`,
  `sanitizeReplayHistory`, `validateReplayTurns`, `onModelSelected`

OpenClaw 仍然擁有通用代理迴圈、故障轉移、記錄處理和
工具策略的控制權。這些掛鉤是供應商特定行為的擴展介面，而
無需完整的自訂推論傳輸。

當提供者具有基於環境變數的憑證，且通用 auth/status/model-picker 路徑應在不載入插件執行時的情況下看到這些憑證時，請使用清單 `providerAuthEnvVars`。當 onboarding/auth-choice CLI 介面應在無需載入提供者執行時的情況下得知提供者的選擇 ID、群組標籤和簡單的單一標誌 auth 連線時，請使用清單 `providerAuthChoices`。請將提供者執行時 `envVars` 用於操作員導向的提示，例如入門標籤或 OAuth client-id/client-secret 設定變數。

當通道具有驅動於環境變數的 auth 或設定，且通用 shell-env 後備機制、config/status 檢查或設定提示應在不載入通道執行時的情況下看到這些內容時，請使用清單 `channelEnvVars`。

### Hook 順序與用法

對於模型/提供者插件，OpenClaw 會大致依照此順序呼叫 Hook。「使用時機」欄位是快速決策指南。

| #   | Hook                              | 功能                                                                                       | 使用時機                                                                                              |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 產生期間，將提供者設定發佈到 `models.providers`                           | 提供者擁有目錄或基本 URL 預設值                                                                       |
| 2   | `applyConfigDefaults`             | 在設定具體化期間套用提供者擁有的全域設定預設值                                             | 預設值取決於 auth 模式、環境或提供者模型家族語意                                                      |
| --  | _(內建模型查閱)_                  | OpenClaw 會先嘗試正常的註冊表/目錄路徑                                                     | _(非插件 hook)_                                                                                       |
| 3   | `normalizeModelId`                | 在查閱前正規化舊版或預覽模型 ID 別名                                                       | 提供者在解析正式模型前擁有別名清理權責                                                                |
| 4   | `normalizeTransport`              | 在通用模型組裝前正規化提供者家族 `api` / `baseUrl`                                         | 提供者擁有同一傳輸家族中自訂提供者 ID 的傳輸清理權責                                                  |
| 5   | `normalizeConfig`                 | 在執行時/提供者解析前正規化 `models.providers.<id>`                                        | 提供者需要隨附於插件的設定清理；內建的 Google 家族協助程式也會支援受支援的 Google 設定項目            |
| 6   | `applyNativeStreamingUsageCompat` | 對設定提供者套用原生串流使用相容性重寫                                                     | 提供者需要端點驅動的原生串流使用中繼資料修復                                                          |
| 7   | `resolveConfigApiKey`             | 在執行階段授權載入之前，解析配置提供者的 env-marker 授權                                   | 提供者具有提供者擁有的 env-marker API 金鑰解析；`amazon-bedrock` 在此處也內建了 AWS env-marker 解析器 |
| 8   | `resolveSyntheticAuth`            | 公開本地/自託管或配置支援的授權，而不持久化純文字                                          | 提供者可以使用合成/本機憑證標記操作                                                                   |
| 9   | `resolveExternalAuthProfiles`     | 疊加提供者擁有的外部授權設定檔；CLI/應用程式擁有憑證的預設 `persistence` 為 `runtime-only` | 提供者重複使用外部授權憑證，而不持久化複製的重新整理權杖                                              |
| 10  | `shouldDeferSyntheticProfileAuth` | 降低儲存的合成設定檔佔位符在 env/config 支援的授權之後的優先級                             | 提供者儲存的合成佔位符設定檔不應獲得優先權                                                            |
| 11  | `resolveDynamicModel`             | 針對本地註冊表中尚未有的提供者擁有模型 ID 進行同步後援                                     | 提供者接受任意上游模型 ID                                                                             |
| 12  | `prepareDynamicModel`             | 非同步預熱，然後 `resolveDynamicModel` 再次運行                                            | 提供者在解析未知 ID 之前需要網路中繼資料                                                              |
| 13  | `normalizeResolvedModel`          | 在嵌入式執行器使用解析的模型之前的最終重寫                                                 | 提供者需要傳輸重寫，但仍使用核心傳輸                                                                  |
| 14  | `contributeResolvedModelCompat`   | 為另一個相容傳輸後端的供應商模型提供相容性標誌                                             | 提供者在代理傳輸上識別自己的模型，而不接管提供者                                                      |
| 15  | `capabilities`                    | 共享核心邏輯使用的提供者擁有的轉錄/工具中繼資料                                            | 提供者需要轉錄/提供者家族的特殊行為                                                                   |
| 16  | `normalizeToolSchemas`            | 在嵌入式執行器看到工具架構之前將其標準化                                                   | 提供者需要傳輸家族架構清理                                                                            |
| 17  | `inspectToolSchemas`              | 在標準化後公開提供者擁有的架構診斷                                                         | 提供者需要關鍵字警告，而無需教導核心特定於提供者的規則                                                |
| 18  | `resolveReasoningOutputMode`      | 選擇原生與標記推理輸出合約                                                                 | 供應商需要標記推理/最終輸出，而非原生欄位                                                             |
| 19  | `prepareExtraParams`              | 通用串流選項包裝器之前的請求參數正規化                                                     | 供應商需要預設請求參數或各供應商參數清理                                                              |
| 20  | `createStreamFn`                  | 使用自訂傳輸完全取代正常的串流路徑                                                         | 供應商需要自訂連線協定，而不僅僅是包裝器                                                              |
| 21  | `wrapStreamFn`                    | 套用通用包裝器後的串流包裝器                                                               | 供應商需要請求標頭/主體/模型相容性包裝器，而不需自訂傳輸                                              |
| 22  | `resolveTransportTurnState`       | 附加原生每輪次傳輸標頭或元資料                                                             | 供應商希望通用傳輸發送供應商原生的輪次身分識別                                                        |
| 23  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 標頭或會話冷卻策略                                                      | 供應商希望通用 WS 傳輸調整會話標頭或後援策略                                                          |
| 24  | `formatApiKey`                    | 驗證設定檔格式化器：儲存的設定檔變成執行時 `apiKey` 字串                                   | 供應商儲存額外驗證元資料，並需要自訂執行時權杖形狀                                                    |
| 25  | `refreshOAuth`                    | OAuth 重新整理覆寫，用於自訂重新整理端點或重新整理失敗策略                                 | 供應商不適用於共用的 `pi-ai` 重新整理器                                                               |
| 26  | `buildAuthDoctorHint`             | OAuth 重新整理失敗時附加修復提示                                                           | 供應商在重新整理失敗後需要供應商擁有的驗證修復指引                                                    |
| 27  | `matchesContextOverflowError`     | 供應商擁有的上下文視窗溢出匹配器                                                           | 供應商具有通用啟發式會錯過的原始溢出錯誤                                                              |
| 28  | `classifyFailoverReason`          | 供應商擁有的故障原因分類                                                                   | 供應商可以將原始 API/傳輸錯誤對應到速率限制/過載等                                                    |
| 29  | `isCacheTtlEligible`              | 代理/回傳供應商的提示快取策略                                                              | 供應商需要代理特定的快取 TTL 閘控                                                                     |
| 30  | `buildMissingAuthMessage`         | 通用缺少驗證恢復訊息的替代                                                                 | 供應商需要供應商特定的缺少驗證恢復提示                                                                |
| 31  | `suppressBuiltInModel`            | 過時上游模型抑制加上可選的使用者面向錯誤提示                                               | 提供者需要隱藏過時的上傳行或將其替換為廠商提示                                                        |
| 32  | `augmentModelCatalog`             | 在發現後附加的合成/最終目錄行                                                              | 提供者需要在 `models list` 和選擇器中使用合成向前相容行                                               |
| 33  | `isBinaryThinking`                | 針對二元思維提供者的開/關推論切換                                                          | 提供者僅公開二元思維開/關                                                                             |
| 34  | `supportsXHighThinking`           | 為選取的模型 `xhigh` 推論支援                                                              | 提供者僅在部分模型上需要 `xhigh`                                                                      |
| 35  | `resolveDefaultThinkingLevel`     | 特定模型系列的預設 `/think` 層級                                                           | 提供者擁有模型系列的預設 `/think` 政策                                                                |
| 36  | `isModernModelRef`                | 用於即時設定檔過濾器和測試選擇的現代模型匹配器                                             | 提供者擁有即時/測試的首選模型匹配                                                                     |
| 37  | `prepareRuntimeAuth`              | 在推論之前將設定的憑證交換為實際的執行時期 Token/金鑰                                      | 提供者需要 Token 交換或短期請求憑證                                                                   |
| 38  | `resolveUsageAuth`                | 解析 `/usage` 的使用量/計費憑證及相關狀態表面                                              | 提供者需要自訂使用量/配額 Token 解析或不同的使用量憑證                                                |
| 39  | `fetchUsageSnapshot`              | 在解析驗證後擷取並正規化提供者特定的使用量/配額快照                                        | 提供者需要提供者特定的使用量端點或 Payload 解析器                                                     |
| 40  | `createEmbeddingProvider`         | 為記憶/搜尋建構提供者擁有的嵌入適配器                                                      | 記憶嵌入行為屬於提供者外掛                                                                            |
| 41  | `buildReplayPolicy`               | 傳回控制提供者文字紀錄處理的重播政策                                                       | 提供者需要自訂文字紀錄政策（例如，思考區塊剝離）                                                      |
| 42  | `sanitizeReplayHistory`           | 在通用文字紀錄清理後重寫重播歷史                                                           | 提供者需要超出共用壓縮輔助工具的提供者特定重播重寫                                                    |
| 43  | `validateReplayTurns`             | 嵌入式執行器之前的最終重播回合驗證或重構                                                   | 提供者傳輸在通用清理後需要更嚴格的回合驗證                                                            |
| 44  | `onModelSelected`                 | 執行提供者擁有的選取後副作用                                                               | 當模型啟用時，提供者需要遙測或提供者擁有的狀態                                                        |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 首先檢查
匹配的提供者外掛，然後回退到其他具有掛鉤功能的提供者外掛
直到其中一個實際更改了模型 ID 或傳輸/配置。這保持了
別名/相容性提供者填充層的工作，而無需呼叫者知道哪個
內建外掛擁有重寫權。如果沒有提供者掛鉤重寫受支援的
Google 系列配置條目，內建的 Google 配置正規化器仍會應用
該相容性清理。

如果提供者需要完全自訂的線路協定或自訂請求執行器，
那是一類不同的擴充功能。這些掛鉤適用於仍在 OpenClaw 正常推理循環上執行的
提供者行為。

### 提供者範例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 內建範例

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`buildAuthDoctorHint`、
  `resolveUsageAuth`、`fetchUsageSnapshot`、`isCacheTtlEligible`、
  `resolveDefaultThinkingLevel`、`applyConfigDefaults`、`isModernModelRef`
  和 `wrapStreamFn`，因為它擁有 Claude 4.6 前向相容性、
  提供者系列提示、驗證修復指導、使用端點整合、
  提示快取資格、感知驗證的配置預設值、Claude
  預設/自適應思考策略，以及針對
  beta 標頭、`/fast` / `serviceTier` 和 `context1m` 的 Anthropic 特定串流重構。
- Anthropic 的 Claude 專用串流輔助工具目前保留在捆綁插件自己的公用 `api.ts` / `contract-api.ts` 接縫中。該套件表面匯出 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
  `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及底層的 Anthropic 包裝器建構器，而不是圍繞單一提供者的 beta-header 規則來擴充通用 SDK。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因為它擁有 GPT-5.4 向前相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 標準化、Codex 感知授權
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考 /
  即時模型策略；`openai-responses-defaults` 串流系列擁有
  用於歸因標頭、
  `/fast`/`serviceTier`、文字詳細程度、原生 Codex 網頁搜尋、
  推理相容負載塑形以及 Responses 上下文管理的共用原生 OpenAI Responses 包裝器。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該提供者是直通且可能在 OpenClaw 靜態目錄更新前公開新的
  模型 ID；它還使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 將
  提供者特定的請求標頭、路由中繼資料、推理補丁和
  提示快取策略排除在核心之外。其重播策略來自
  `passthrough-gemini` 系列，而 `openrouter-thinking` 串流系列
  擁有代理推理注入和不支援模型 / `auto` 跳過。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要提供者擁有的設備登入、模型後備行為、Claude 逐字稿
  的怪癖、GitHub token -> Copilot token 交換，以及提供者擁有的使用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍然在核心 OpenAI 傳輸上運行，但擁有其傳輸/基礎 URL
  標準化、OAuth 重新整理後備策略、預設傳輸選擇、
  合成 Codex 目錄列，以及 ChatGPT 使用量端點整合；它
  與直接 OpenAI 共用相同的 `openai-responses-defaults` 串流系列。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel`、
  `buildReplayPolicy`、`sanitizeReplayHistory`、
  `resolveReasoningOutputMode`、`wrapStreamFn` 和 `isModernModelRef`，因為
  `google-gemini` 重播系列擁有 Gemini 3.1 向前相容後備、
  原生 Gemini 重播驗證、引導重播清理、標記
  推理輸出模式和現代模型匹配，而
  `google-thinking` 串流系列擁有 Gemini 思維承載標準化；
  Gemini CLI OAuth 也使用 `formatApiKey`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 進行 token 格式化、token 解析和配額端點
  連線。
- Anthropic Vertex 透過 `anthropic-by-model` 重播系列使用 `buildReplayPolicy`，因此
  特定於 Claude 的重播清理保持範圍限制在 Claude ID，而不是每個 `anthropic-messages` 傳輸。
- Amazon Bedrock 使用 `buildReplayPolicy`、`matchesContextOverflowError`、
  `classifyFailoverReason` 和 `resolveDefaultThinkingLevel`，因為它擁有
  Bedrock 特有的針對 Anthropic-on-Bedrock 流量的限流/未就緒/上下文溢出錯誤分類；
  其重試策略仍共用同一個僅限 Claude 的 `anthropic-by-model` 防護。
- OpenRouter、Kilocode、Opencode 和 Opencode Go 使用 `buildReplayPolicy`
  透過 `passthrough-gemini` 重試系列，因為它們透過 OpenAI 相容傳輸代理 Gemini
  模型，且需要 Gemini 思維簽名清理，而不需要原生 Gemini 重試驗證或
  引導重寫。
- MiniMax 使用 `buildReplayPolicy` 透過
  `hybrid-anthropic-openai` 重試系列，因為一個提供者同時擁有
  Anthropic 訊息和 OpenAI 相容語意；它在 Anthropic 端保持僅限 Claude 的
  思維區塊丟棄，同時將推理輸出模式覆寫回原生，而 `minimax-fast-mode` 串流系列擁有
  共用串流路徑上的快速模式模型重寫。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共用的
  OpenAI 傳輸，但需要提供者擁有的思維負載正規化；
  `moonshot-thinking` 串流系列將設定加上 `/think` 狀態映射到其
  原生二進制思維負載。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供者擁有的請求標頭、
  推理負載正規化、Gemini 轉錄提示和 Anthropic
  快取 TTL 閘控；`kilocode-thinking` 串流系列在共用代理串流路徑上保持 Kilo 思維
  注入，同時跳過 `kilo/auto` 和
  其他不支援明確推理負載的代理模型 ID。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 備援、
  `tool_stream` 預設值、二元思維 UX、現代模型匹配，以及使用權限
  - 配額擷取；`tool-stream-default-on` 串流系列讓預設開啟的
    `tool_stream` 包裝器不會介入各提供者手寫的膠合代碼。
- xAI 使用 `normalizeResolvedModel`、`normalizeTransport`、
  `contributeResolvedModelCompat`、`prepareExtraParams`、`wrapStreamFn`、
  `resolveSyntheticAuth`、`resolveDynamicModel` 和 `isModernModelRef`，
  因為它擁有原生 xAI Responses 傳輸正規化、Grok 快速模式別名重寫、預設
  `tool_stream`、嚴格工具 / 推理負載清理、外掛擁有工具的備援
  授權重用、前向相容 Grok 模型解析，以及提供者擁有的相容性修補（例如 xAI
  工具架構設定檔、不支援的架構關鍵字、原生 `web_search`，以及
  HTML 實體工具呼叫引數解碼）。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities`，
  以保持文字紀錄/工具的特殊性不進入核心。
- 僅目錄捆綁的提供者（如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）僅使用
  `catalog`。
- Qwen 針對其文字提供者使用 `catalog`，並針對其多模態表面使用
  共用的媒體理解與影片生成註冊。
- MiniMax 和小米使用 `catalog` 加上使用掛鉤 (usage hooks)，因為它們的 `/usage`
  行為是由外掛程式擁有的，即使推論仍然透過共享傳輸運行。

## 執行時期輔助函式

外掛程式可以透過 `api.runtime` 存取選定的核心輔助函式。對於 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

備註：

- `textToSpeech` 會傳回檔案/語音備註介面的正常核心 TTS 輸出負載。
- 使用核心 `messages.tts` 組態和提供者選擇。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對於每個提供者是可選的。將其用於供應商擁有的語音選擇器或設定流程。
- 語音清單可以包含更豐富的元數據，例如地區設定、性別和個性標籤，供具備提供者感知能力的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援電話語音。Microsoft 不支援。

外掛程式也可以透過 `api.registerSpeechProvider(...)` 註冊語音提供者。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

備註：

- 將 TTS 原則、後備和回覆傳遞保留在核心中。
- 使用語音提供者進行供應商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會被正規化為 `microsoft` 提供者 ID。
- 首選的擁有權模型是以公司為導向的：當 OpenClaw 新增這些能力合約時，一個供應商外掛程式可以擁有
  文字、語音、圖片和未來的媒體提供者。

對於圖片/音訊/影片理解，外掛程式註冊一個類型化的
媒體理解提供者，而不是通用的鍵/值包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

備註：

- 將編排、後備、組態和通道佈線保留在核心中。
- 將供應商行為保留在提供者外掛程式中。
- 新增擴充應保持類型化：新的可選方法、新的可選結果欄位、新的可選能力。
- 影片生成已經遵循相同的模式：
  - 核心擁有能力合約和執行時期輔助函式
  - 供應商外掛程式註冊 `api.registerVideoGenerationProvider(...)`
  - 功能/通道外掛程式使用 `api.runtime.videoGeneration.*`

對於媒體理解執行時期輔助函式，外掛程式可以呼叫：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

對於音訊轉錄，外掛程式可以使用媒體理解執行時期
或較舊的 STT 別名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

備註：

- `api.runtime.mediaUnderstanding.*` 是
  圖片/音訊/影片理解的首選共享介面。
- 使用核心媒體理解音訊配置 (`tools.media.audio`) 和提供者後援順序。
- 當未產生轉錄輸出時（例如跳過/不支援的輸入），回傳 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 保留作為相容性別名。

外掛程式也可以透過 `api.runtime.subagent` 啟動背景子代理程式執行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

備註：

- `provider` 和 `model` 是選用的每次執行覆寫，而非永續的工作階段變更。
- OpenClaw 僅對受信任的呼叫者遵循這些覆寫欄位。
- 對於外掛程式擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 進行選擇加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的標準 `provider/model` 目標，或使用 `"*"` 明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然可以運作，但覆寫請求會被拒絕，而不是無聲地後援。

對於網路搜尋，外掛程式可以使用共享的執行時段輔助程式，而不是
深入代理程式工具連線：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

外掛程式也可以透過
`api.registerWebSearchProvider(...)` 註冊網路搜尋提供者。

備註：

- 將提供者選擇、憑證解析和共享請求語意保留在核心中。
- 使用網路搜尋提供者進行供應商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴代理程式工具包裝函式的功能/通道外掛程式的首選共享介面。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用設定的影像生成提供者鏈結生成影像。
- `listProviders(...)`：列出可用的影像生成提供者及其功能。

## 閘道 HTTP 路由

外掛程式可以使用 `api.registerHttpRoute(...)` 公開 HTTP 端點。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由欄位：

- `path`：閘道 HTTP 伺服器下的路由路徑。
- `auth`：必填。使用 `"gateway"` 要求正常的閘道驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/網路掛鉤驗證。
- `match`：選用。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：選用。允許同一個外掛程式替換其既有的路由註冊。
- `handler`：當路由處理了請求時傳回 `true`。

備註：

- `api.registerHttpHandler(...)` 已移除，會導致外掛程式載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 外掛程式路由必須明確宣告 `auth`。
- 除非設定 `replaceExisting: true`，否則會拒絕完全相同的 `path + match` 衝突，且一個外掛程式無法取代另一個外掛程式的路由。
- 會拒絕具有不同 `auth` 層級的重疊路由。請將 `exact`/`prefix` 循鏈保留在相同的驗證層級上。
- `auth: "plugin"` 路由**不會**自動接收操作員執行時間範圍。它們是用於外掛程式管理的 webhook/簽章驗證，而非具特權的 Gateway 協助程式呼叫。
- `auth: "gateway"` 路由在 Gateway 請求執行時間範圍內執行，但該範圍是刻意保守的：
  - 共享密碼 bearer auth（`gateway.auth.mode = "token"` / `"password"`）會將外掛程式路由執行時間範圍固定為 `operator.write`，即使呼叫者傳送了 `x-openclaw-scopes` 亦然
  - 受信任的身分載入 HTTP 模式（例如私人入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`）僅在標頭明確存在時才接受 `x-openclaw-scopes`
  - 如果這些身分載入外掛程式路由請求上缺少 `x-openclaw-scopes`，執行時間範圍會退回至 `operator.write`
- 實務規則：不要假設 gateway-auth 外掛程式路由是隱含的管理介面。如果您的路由需要僅限管理員的行為，請要求身分載入驗證模式，並記錄明確的 `x-openclaw-scopes` 標頭合約。

## 外掛程式 SDK 匯入路徑

在撰寫外掛時，請使用 SDK 子路徑，而非單一的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/plugin-entry` 用於外掛註冊的基本元件。
- `openclaw/plugin-sdk/core` 用於通用共用的外掛協定。
- `openclaw/plugin-sdk/config-schema` 用於根目錄的 `openclaw.json` Zod 綱要匯出 (`OpenClawSchema`)。
- 穩定的頻道基本元件，例如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/setup-runtime`、
  `openclaw/plugin-sdk/setup-adapter-runtime`、
  `openclaw/plugin-sdk/setup-tools`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress`，用於共用的設定/驗證/回覆/Webhook 連線。
  `channel-inbound` 是 debounce、提及匹配、 inbound mention-policy 輔助程式、信封格式化以及 inbound envelope
  context 輔助程式的共用主體。
  `channel-setup` 是狹隘的選擇性安裝設定縫合點。
  `setup-runtime` 是 `setupEntry` /
  延遲啟動所使用的執行時期安全設定介面，包括 import-safe 的設定修補配接器。
  `setup-adapter-runtime` 是具備環境感知能力的帳號設定配接器縫合點。
  `setup-tools` 是小型的 CLI/封存/文件輔助縫合點 (`formatCliCommand`,
  `detectBinary`、 `extractArchive`、 `resolveBrewExecutable`、 `formatDocsLink`、
  `CONFIG_DIR`)。
- 網域子路徑，例如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/allow-from`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/telegram-command-config`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/approval-gateway-runtime`、
  `openclaw/plugin-sdk/approval-handler-adapter-runtime`、
  `openclaw/plugin-sdk/approval-handler-runtime`、
  `openclaw/plugin-sdk/approval-runtime`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/infra-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/status-helpers`、
  `openclaw/plugin-sdk/text-runtime`、
  `openclaw/plugin-sdk/runtime-store` 以及
  `openclaw/plugin-sdk/directory-runtime`，用於共享執行時期/設定輔助工具。
  `telegram-command-config` 是 Telegram 自訂指令
  正規化/驗證的狹窄公開接縫，即使隨附的
  Telegram 合約介面暫時無法使用，它仍然保持可用。
  `text-runtime` 是共享的文字/markdown/日誌記錄接縫，包括
  助理可見文字剝離、markdown 渲染/分塊輔助工具、刪減
  輔助工具、指令標籤輔助工具和安全文字公用程式。
- 特定於核准的通道接縫應該在插件上優先使用一個 `approvalCapability`
  合約。Core 接著會透過該功能讀取核准授權、傳遞、渲染、
  原生路由以及延遲原生處理程式行為，而不是將核准行為混入不相關的插件欄位中。
- `openclaw/plugin-sdk/channel-runtime` 已被棄用，僅作為較舊插件的
  相容性填充層保留。新程式碼應改為匯入狹窄的
  通用基本元素，而 repo 程式碼不應新增對該
  填充層的匯入。
- 隨附的擴充功能內部保持私有。外部插件應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可以使用 repo
  中插件套件根目錄下的公開進入點，例如 `index.js`、`api.js`、
  `runtime-api.js`、`setup-entry.js`，以及範圍狹窄的檔案，例如
  `login-qr-api.js`。切勿從核心或
  另一個擴充功能匯入插件套件的 `src/*`。
- Repo entry point split:
  `<plugin-package-root>/api.js` 是 helper/types barrel，
  `<plugin-package-root>/runtime-api.js` 是 runtime-only barrel，
  `<plugin-package-root>/index.js` 是 bundled plugin entry，
  而 `<plugin-package-root>/setup-entry.js` 是 setup plugin entry。
- Current bundled provider examples:
  - Anthropic 使用 `api.js` / `contract-api.js` 來取得 Claude stream helpers（例如
    `wrapAnthropicProviderStream`）、beta-header helpers 和 `service_tier`
    解析。
  - OpenAI 使用 `api.js` 來取得 provider builders、default-model helpers 和
    realtime provider builders。
  - OpenRouter 使用 `api.js` 來取得其 provider builder 以及 onboarding/config
    helpers，而 `register.runtime.js` 仍可重新匯出通用的
    `plugin-sdk/provider-stream` helpers 以供 repo 內部使用。
- Facade-loaded public entry points 在存在時會優先使用 active runtime config snapshot，
  當 OpenClaw 尚未提供 runtime snapshot 時，則回退到磁碟上的 resolved config file。
- Generic shared primitives 仍然是首選的 public SDK contract。一小組
  保留的 bundled channel-branded helper seams 仍然存在。應將其視為 bundled-maintenance/compatibility seams，而非
  新的第三方 import targets；新的跨通道 contracts 仍應置於
  generic `plugin-sdk/*` subpaths 或 plugin-local `api.js` /
  `runtime-api.js` barrels。

Compatibility note:

- 在新程式碼中避免使用 root `openclaw/plugin-sdk` barrel。
- Prefer the narrow stable primitives first. The newer setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool subpaths are the intended contract for new
  bundled and external plugin work.
  Target parsing/matching belongs on `openclaw/plugin-sdk/channel-targets`.
  Message action gates and reaction message-id helpers belong on
  `openclaw/plugin-sdk/channel-actions`.
- 打包的擴充功能特定的 helper barrels 預設是不穩定的。如果某個 helper 僅由打包的擴充功能需要，請將其保留在擴充功能的本地 `api.js` 或 `runtime-api.js` 接縫後方，而不是將其提升到 `openclaw/plugin-sdk/<extension>` 中。
- 新的共享 helper 接縫應該是通用的，而非特定於頻道的。共享目標解析屬於 `openclaw/plugin-sdk/channel-targets`；特定於頻道的內部細節應保留在擁有該外掛程式的本地 `api.js` 或 `runtime-api.js` 接縫後方。
- 特定於功能的子路徑（例如 `image-generation`、`media-understanding` 和 `speech`）之所以存在，是因為打包/原生外掛程式目前正在使用它們。它們的存在本身並不意味著每個匯出的 helper 都是長期凍結的外部合約。

## 訊息工具架構

外掛程式應擁有特定於頻道的 `describeMessageTool(...)` 架構貢獻。請將特定於提供者的欄位保留在外掛程式中，而不是放在共享核心裡。

對於共享的可移植架構片段，請重複使用透過 `openclaw/plugin-sdk/channel-actions` 匯出的通用 helper：

- `createMessageToolButtonsSchema()` 用於按鈕網格樣式的 Payload
- `createMessageToolCardSchema()` 用於結構化卡片 Payload

如果某個架構形狀僅對一個提供者有意義，請在該外掛程式的來源中定義它，而不是將其提升到共享 SDK 中。

## 頻道目標解析

頻道外掛程式應擁有特定於頻道的目標語意。請保持共用輸出主機的通用性，並使用訊息配接器表面來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查詢之前，標準化的目標應被視為 `direct`、`group` 還是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- `messaging.targetResolver.resolveTarget(...)` 是當核心在標準化或目錄未命中後需要最終提供者擁有的解析時的外掛程式後援。
- 一旦目標解析完成，`messaging.resolveOutboundSessionRoute(...)` 即擁有特定於提供者的會話路由建構。

建議的拆分：

- 在搜尋對等節點/群組之前，使用 `inferTargetChatType` 進行類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」檢查。
- 使用 `resolveTarget` 作為特定提供者的正規化後備方案，而非用於廣泛的目錄搜尋。
- 將提供者原生的 ID（如聊天 ID、執行緒 ID、JID、代碼 和房間 ID）保留在 `target` 值或提供者特定的參數中，而非放在通用的 SDK 欄位裡。

## 基於配置的目錄

從配置衍生目錄項目的外掛應將該邏輯保留在外掛內，並重複使用 `openclaw/plugin-sdk/directory-runtime` 中的共享輔助程式。

當通道需要基於配置的對等節點/群組（例如以下情況）時，請使用此功能：

- 由白名單驅動的 DM 對等節點
- 已配置的通道/群組映射
- 帳戶範圍的靜態目錄後備方案

`directory-runtime` 中的共享輔助程式僅處理通用操作：

- 查詢過濾
- 限制套用
- 去重/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

特定通道的帳戶檢查和 ID 正規化應保留在外掛實作中。

## 提供者目錄

提供者外掛可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型目錄。

`catalog.run(...)` 返回與 OpenClaw 寫入 `models.providers` 相同的形狀：

- 一個提供者項目的 `{ provider }`
- 多個提供者項目的 `{ providers }`

當外掛擁有特定提供者的模型 ID、基本 URL 預設值或需要驗證的模型中繼資料時，請使用 `catalog`。

`catalog.order` 控制外掛目錄相對於 OpenClaw 內建隱式提供者的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當存在驗證設定檔時出現的提供者
- `paired`：綜合多個相關提供者項目的提供者
- `late`：最後一輪，在其他隱式提供者之後

後續的提供者在鍵值衝突時獲勝，因此外掛可以使用相同的提供者 ID 意圖覆蓋內建的提供者項目。

相容性：

- `discovery` 仍可作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的外掛註冊了通道，建議與 `resolveAccount(...)` 一起實作
`plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是執行時路徑。它可以假定憑證
  已完全具體化，並且當缺少所需密鑰時能快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 和 doctor/config
  修復流程等唯讀指令路徑，不應僅為了
  描述設定就需要具體化執行時憑證。

建議的 `inspectAccount(...)` 行為：

- 僅返回描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要僅為了報告唯讀
  可用性而返回原始 Token 值。返回 `tokenStatus: "available"`（以及匹配的來源
  欄位）對於狀態類型指令來說就足夠了。
- 當憑證透過 SecretRef 設定但在
  目前指令路徑中無法取得時，請使用 `configured_unavailable`。

這讓唯讀指令能夠回報「已設定但在此指令路徑中無法取得」，
而不是崩潰或將帳戶誤報為未設定。

## 套件包

外掛目錄可能包含帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛。如果該包列出了多個擴充功能，外掛 ID 將變為 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依套件，請將它們安裝在該目錄中，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 項目都必須留在外掛程式目錄內。逃離套件目錄的
項目將會被拒絕。

安全性說明：`openclaw plugins install` 會使用 `npm install --omit=dev --ignore-scripts` 安裝外掛程式相依套件
（無生命週期指令碼，執行時期無開發相依套件）。請保持外掛程式相依套件樹為「純 JS/TS」，
並避免需要 `postinstall` 建置的套件。

選用項：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。
當 OpenClaw 需要針對已停用的通道外掛程式提供設定介面，
或是當通道外掛程式已啟用但尚未設定時，它會載入 `setupEntry`
而非完整的外掛程式進入點。當您的主要外掛程式進入點還連接了工具、
掛勾或其他僅執行時期的程式碼時，這能讓啟動和設定更輕量。

選用項：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛程式在閘道的預先監聽啟動階段期間，
選擇使用相同的 `setupEntry` 路徑，即使通道已經設定也是如此。

僅在 `setupEntry` 完整覆蓋閘道開始監聽前必須存在的啟動介面時
才使用此選項。實務上，這表示設定進入點必須註冊啟動所依賴的
每個通道擁有的功能，例如：

- 通道註冊本身
- 任何必須在閘道開始監聽前可用的 HTTP 路由
- 任何必須在相同視窗期間存在的閘道方法、工具或服務

如果您的完整進入點仍擁有任何必要的啟動功能，請勿啟用此旗標。
讓外掛程式保持預設行為，並讓 OpenClaw 在啟動期間載入完整進入點。

捆綁通道也可以發布僅供設定的合約介面協助程式，讓核心
在載入完整通道執行時期之前進行查詢。目前的設定升級介面為：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core uses that surface when it needs to promote a legacy single-account channel
config into `channels.<id>.accounts.*` without loading the full plugin entry.
Matrix is the current bundled example: it moves only auth/bootstrap keys into a
named promoted account when named accounts already exist, and it can preserve a
configured non-canonical default-account key instead of always creating
`accounts.default`.

Those setup patch adapters keep bundled contract-surface discovery lazy. Import
time stays light; the promotion surface is loaded only on first use instead of
re-entering bundled channel startup on module import.

When those startup surfaces include gateway RPC methods, keep them on a
plugin-specific prefix. Core admin namespaces (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) remain reserved and always resolve
to `operator.admin`, even if a plugin requests a narrower scope.

Example:

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### Channel catalog metadata

Channel plugins can advertise setup/discovery metadata via `openclaw.channel` and
install hints via `openclaw.install`. This keeps the core catalog data-free.

Example:

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

Useful `openclaw.channel` fields beyond the minimal example:

- `detailLabel`: secondary label for richer catalog/status surfaces
- `docsLabel`: override link text for the docs link
- `preferOver`: lower-priority plugin/channel ids this catalog entry should outrank
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: selection-surface copy controls
- `markdownCapable`: marks the channel as markdown-capable for outbound formatting decisions
- `exposure.configured`: hide the channel from configured-channel listing surfaces when set to `false`
- `exposure.setup`: hide the channel from interactive setup/configure pickers when set to `false`
- `exposure.docs`: mark the channel as internal/private for docs navigation surfaces
- `showConfigured` / `showInSetup`：為相容性仍接受的舊版別名；建議使用 `exposure`
- `quickstartAllowFrom`：將管道加入標準快速入門 `allowFrom` 流程
- `forceAccountBinding`：即使只存在一個帳戶，也要求明確的帳戶綁定
- `preferSessionLookupForAnnounceTarget`：在解析公告目標時，偏好使用會話查詢

OpenClaw 也可以合併 **外部管道目錄**（例如 MPM 登錄檔匯出）。將 JSON 檔案放置於以下任一路徑：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

## 上下文引擎外掛

上下文引擎外掛擁有用於攝取、組裝和壓縮的會話上下文編排功能。使用 `api.registerContextEngine(id, factory)` 從您的外掛中註冊它們，然後使用 `plugins.slots.contextEngine` 選擇啟用的引擎。

當您的外掛需要取代或擴充預設的上下文管線，而不僅僅是新增記憶體搜尋或掛鉤時，請使用此功能。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

如果您的引擎**不**擁有壓縮演算法，請保留 `compact()` 的實作並明確地委派它：

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## 新增新功能

當外掛需要不符合目前 API 的行為時，請使用私有途徑繞過外掛系統。請新增缺失的功能。

建議順序：

1. 定義核心契約
   決定核心應擁有哪些共享行為：原則、後援、設定合併、生命週期、面向管道的語意以及執行時期輔助程式形狀。
2. 新增型別化外掛註冊/執行時期介面
   以最小且有用的型別化功能介面擴充 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心 + 頻道/功能消費者
   頻道和功能外掛應該透過核心來消費新功能，
   而非直接匯入廠商實作。
4. 註冊廠商實作
   廠商外掛接著針對該功能註冊它們的後端。
5. 新增合約覆蓋範圍
   新增測試，讓所有權和註冊形狀隨著時間保持明確。

這就是 OpenClaw 如何在不變成針對單一供應商
世界觀的硬編碼情況下保持獨特觀點。請參閱 [Capability Cookbook](/en/tools/capability-cookbook)
以取得具體的檔案檢查清單和實作範例。

### 功能檢查清單

當您新增功能時，實作通常應該同時涉及這些層面：

- `src/<capability>/types.ts` 中的核心合約類型
- `src/<capability>/runtime.ts` 中的核心執行器/執行時期輔助程式
- `src/plugins/types.ts` 中的外掛 API 註冊層面
- `src/plugins/registry.ts` 中的外掛註冊表連線
- 當功能/頻道外掛需要消費時，
  `src/plugins/runtime/*` 中的外掛執行時期暴露
- `src/test-utils/plugin-registration.ts` 中的捕獲/測試輔助程式
- `src/plugins/contracts/registry.ts` 中的所有權/合約斷言
- `docs/` 中的操作員/外掛文件

如果缺少其中一個層面，這通常是功能
尚未完全整合的跡象。

### 功能範本

最小模式：

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

合約測試模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

這讓規則保持簡單：

- 核心擁有功能合約 + 協調
- 廠商外掛擁有廠商實作
- 功能/頻道外掛消費執行時期輔助程式
- 合約測試讓所有權保持明確

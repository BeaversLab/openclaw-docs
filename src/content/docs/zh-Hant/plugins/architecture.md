---
summary: "外掛內部結構：功能模型、所有權、合約、載入管線與執行時期輔助工具"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "外掛內部結構"
sidebarTitle: "內部結構"
---

# 外掛內部結構

<Info>這是 **深度架構參考**。如需實用指南，請參閱： - [安裝並使用外掛程式](/zh-Hant/tools/plugin) — 使用者指南 - [快速入門](/zh-Hant/plugins/building-plugins) — 第一個外掛程式教學 - [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 建立訊息傳遞頻道 - [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins) — 建立模型提供者 - [SDK 概觀](/zh-Hant/plugins/sdk-overview) — 匯入映射和註冊 API</Info>

本頁涵蓋 OpenClaw 外掛系統的內部架構。

## 公開功能模型

功能是 OpenClaw 內部公開的**原生外掛**模型。每個
原生 OpenClaw 外掛都會針對一或多種功能類型進行註冊：

| 功能            | 註冊方法                                         | 範例外掛                             |
| --------------- | ------------------------------------------------ | ------------------------------------ |
| 文字推理        | `api.registerProvider(...)`                      | `openai`、`anthropic`                |
| CLI 推理後端    | `api.registerCliBackend(...)`                    | `openai`、`anthropic`                |
| 語音            | `api.registerSpeechProvider(...)`                | `elevenlabs`、`microsoft`            |
| 即時轉錄        | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 即時語音        | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)`    | `openai`、`google`                   |
| 圖像生成        | `api.registerImageGenerationProvider(...)`       | `openai`、`google`、`fal`、`minimax` |
| 音樂生成        | `api.registerMusicGenerationProvider(...)`       | `google`、`minimax`                  |
| 影片生成        | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 網頁擷取        | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 網路搜尋        | `api.registerWebSearchProvider(...)`             | `google`                             |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

註冊零個功能但提供 hooks、工具或服務的插件是一個 **僅有 legacy hook** 的插件。該模式仍然完全受支援。

### 外部兼容性立場

功能模型已落地核心並被捆綁/原生插件使用，但外部插件兼容性仍需要比「它已被匯出，因此它是凍結的」更高的標準。

當前指引：

- **現有的外部插件：** 保持基於 hook 的整合正常運作；將此視為兼容性基準
- **新的捆綁/原生插件：** 優先使用明確的功能註冊，而非供應商特定的深度存取或新的僅有 hook 的設計
- **採用功能註冊的外部插件：** 允許，但除非文件明確將合約標記為穩定，否則請將特定功能的輔助介面視為不斷演進

實用規則：

- 功能註冊 API 是預期的發展方向
- 在過渡期間，legacy hooks 仍然是外部插件最安全的無破壞性路徑
- 匯出的輔助子路徑並非都平等；優先使用狹窄的文件化合約，而非偶然的輔助匯出

### Plugin 形狀

OpenClaw 根據每個已載入插件的實際註冊行為（而不僅僅是靜態元資料）將其歸類為一種形狀：

- **plain-capability** -- 註冊確切的一種功能類型（例如僅提供者的插件，如 `mistral`）
- **hybrid-capability** -- 註冊多種功能類型（例如 `openai` 擁有文字推論、語音、媒體理解和圖像生成）
- **hook-only** -- 僅註冊 hooks（型別化或自訂），不註冊功能、工具、指令或服務
- **non-capability** -- 註冊工具、指令、服務或路由，但不註冊功能

使用 `openclaw plugins inspect <id>` 來查看外掛程式的結構和功能
細分。詳情請參閱 [CLI 參考資料](/zh-Hant/cli/plugins#inspect)。

### Legacy hooks

`before_agent_start` hook 仍作為純 hook 外掛的相容路徑受到支援。現有的實際外掛仍然依賴它。

方向：

- 保持其運作
- 將其記錄為舊版
- 針對模型/提供者覆寫工作，優先使用 `before_model_resolve`
- 針對提示詞變異工作，優先使用 `before_prompt_build`
- 僅在實際使用量下降且 fixture 覆蓋率證明遷移安全後移除

### 相容性信號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，可能會看到
以下其中一個標籤：

| 信號                       | 含義                                            |
| -------------------------- | ----------------------------------------------- |
| **config valid**           | Config 解析正常且外掛已解析                     |
| **compatibility advisory** | 外掛使用了受支援但較舊的模式 (例如 `hook-only`) |
| **legacy warning**         | 外掛使用了已棄用的 `before_agent_start`         |
| **hard error**             | Config 無效或外掛載入失敗                       |

無論是 `hook-only` 還是 `before_agent_start` 目前都不會導致您的外掛中斷 --
`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些
信號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛系統分為四層：

1. **Manifest + discovery**
   OpenClaw 從配置路徑、工作區根目錄、
   全域擴充功能根目錄以及內綑擴充功能中尋找候選外掛。探索機制會先讀取原生
   `openclaw.plugin.json` manifests 以及支援的 bundle manifests。
2. **啟用 + 驗證**
   Core 決定已探索的外掛是啟用、停用、阻擋，還是
   被選入獨佔插槽（例如 memory）。
3. **Runtime 載入**
   原生 OpenClaw 外掛透過 jiti 在程序內載入，並將
   功能註冊到中央註冊表。相容的 bundle 會被正規化為
   註冊表記錄，而無須匯入 runtime 程式碼。
4. **Surface 消費**
   OpenClaw 的其餘部分會讀取註冊表以公開工具、頻道、提供者
   設定、hooks、HTTP 路由、CLI 指令和服務。

具體來說，對於外掛 CLI，根指令探索分為兩個階段：

- 解析時期的元數據來自 `registerCli(..., { descriptors: [...] })`
- 真正的外掛 CLI 模組可以保持延遲載入，並在首次呼叫時註冊

這樣可以將外掛擁有的 CLI 程式碼保留在外掛內部，同時讓 OpenClaw
在解析之前保留根命令名稱。

重要的設計邊界：

- 探索 + 設定驗證應該可以透過 **清單/架構元資料** 運作，
  而無需執行外掛程式碼
- 原生執行時期行為來自外掛模組的 `register(api)` 路徑

這種區分讓 OpenClaw 能在完整的執行時期啟動之前驗證設定、說明遺失/停用的外掛，並
建構 UI/架構提示。

### 通道外掛與共享訊息工具

通道外掛不需要針對一般的聊天動作註冊單獨的傳送/編輯/回應工具。OpenClaw 在核心中保留一個共享的 `message` 工具，而
通道外掛則擁有其後面的特定通道探索與執行權。

目前的邊界是：

- 核心擁有共享的 `message` 工具主機、提示連線、階段/執行緒
  簿記，以及執行分派
- 通道外掛擁有範圍動作探索、功能探索，以及任何
  通道特定的架構片段
- 通道外掛擁有供應商特定的階段對話文法，例如
  對話 ID 如何編碼執行緒 ID 或繼承自父層對話
- 通道外掛透過其動作配接器執行最終動作

對於通道外掛，SDK 介面是
`ChannelMessageActionAdapter.describeMessageTool(...)`。那個統一的探索
呼叫讓外掛能一起傳回其可見動作、功能和架構
貢獻，以免這些部分彼此脫節。

當通道特定的訊息工具參數包含媒體來源（例如
本機路徑或遠端媒體 URL）時，外掛也應該從 `describeMessageTool(...)` 傳回
`mediaSourceParams`。核心會使用該明確清單來
套用沙箱路徑正規化和輸出媒體存取提示，
而無需將外掛擁有的參數名稱寫死。
建議優先使用該處的動作範圍對應，而非單一通道的平面清單，這樣
僅限設定檔的媒體參數就不會在無關的動作（如
`send`）上被正規化。

核心會將執行時期範圍傳遞到該探索步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

這對於上下文相關外掛來說很重要。頻道可以根據活動帳號、當前房間/執行緒/訊息或受信任的請求者身分來隱藏或顯示訊息操作，而無需在核心 `message` 工具中硬編碼特定於頻道的分支。

這就是為什麼嵌入式執行器路由更改仍然是外掛工作的原因：執行器負責將當前聊天/會話身分轉發到外掛發現邊界，以便共享的 `message` 工具為當前輪次公開正確的頻道擁有的介面。

對於頻道擁有的執行輔助程式，捆綁的外掛應將執行時保留在其自己的擴充模組中。核心不再擁有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 訊息操作執行時。我們不會發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，捆綁的外掛應直接從其擴充擁有的模組匯入自己的本機執行時代碼。

同樣的邊界也適用於一般以提供者命名的 SDK 接縫：核心不應匯入特定於頻道的便利匯總檔案，用於 Slack、Discord、Signal、WhatsApp 或類似的擴充功能。如果核心需要某種行為，可以消耗捆綁外掛自己的 `api.ts` / `runtime-api.ts` 匯總檔案，或者將需求提升為共享 SDK 中的狹窄通用功能。

具體對於投票，有兩個執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的頻道的共享基線
- `actions.handleAction("poll")` 是特定於頻道的投票語義或額外投票參數的首選路徑

核心現在將共享投票解析延遲到外掛投票調度拒絕該操作之後，因此外掛擁有的投票處理程式可以接受特定於頻道的投票欄位，而不會先被通用投票解析器阻擋。

如需完整的啟動順序，請參閱 [載入管線](#load-pipeline)。

## 功能擁有權模型

OpenClaw 將原生外掛視為 **公司** 或 **功能** 的擁有權邊界，而不是無關整合的雜物袋。

這意味著：

- 公司插件通常應該擁有該公司所有面向 OpenClaw 的介面
- 功能插件通常應該擁有其引入的完整功能介面
- 通道應該消費共享的核心能力，而不是臨時重新實作提供者行為

範例：

- 內建的 `openai` 插件擁有 OpenAI 模型提供者行為，以及 OpenAI 的語音 + 即時語音 + 媒體理解 + 圖像生成行為
- 內建的 `elevenlabs` 插件擁有 ElevenLabs 語音行為
- 內建的 `microsoft` 插件擁有 Microsoft 語音行為
- 內建的 `google` 插件擁有 Google 模型提供者行為，加上 Google 的媒體理解 + 圖像生成 + 網路搜尋行為
- 內建的 `firecrawl` 插件擁有 Firecrawl 網頁擷取行為
- 內建的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件擁有各自的媒體理解後端
- 內建的 `qwen` 插件擁有 Qwen 文字提供者行為，加上媒體理解和影片生成行為
- `voice-call` 插件是一個功能插件：它擁有通訊傳輸、工具、CLI、路由和 Twilio 媒體串流橋接，但它消費共享的語音以及即時轉錄和即時語音能力，而不是直接匯入供應商插件

預期的最終狀態是：

- 即使 OpenAI 涵蓋文字模型、語音、圖像和未來的影片，它也位於一個插件中
- 其他供應商可以為其自身的範圍做同樣的事情
- 通道不在乎哪個供應商插件擁有該提供者；它們消費核心公開的共享能力合約

這是關鍵區別：

- **plugin** = 所有權邊界
- **capability** = 多個插件可以實作或消費的核心合約

因此，如果 OpenClaw 新增一個新的領域（例如影片），第一個問題不是「哪個提供者應該硬編碼影片處理？」。第一個問題是「核心影片能力合約是什麼？」。一旦該合約存在，供應商插件就可以註冊它，而通道/功能插件就可以消費它。

如果該能力尚不存在，通常的正確做法是：

1. 在核心中定義缺失的能力
2. 透過外掛程式 API/執行時以類型化的方式將其公開
3. 針對該能力連接通道/功能
4. 讓供應商外掛程式註冊實作

這在保持所有權明確的同時，避免了依賴單一供應商或一次性特定外掛程式程式碼路徑的核心行為。

### 能力分層

在決定程式碼所屬位置時，請使用此心智模型：

- **核心能力層**：共享的協調、策略、後備、配置合併規則、傳遞語意以及類型化合約
- **供應商外掛程式層**：供應商特定的 API、驗證、模型目錄、語音合成、影像生成、未來的影片後端、使用量端點
- **通道/功能外掛程式層**：Slack/Discord/語音通話等整合，消耗核心能力並將其呈現在介面上

例如，TTS 遵循此形狀：

- 核心擁有回覆時間 TTS 策略、後備順序、偏好設定和通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消耗電話 TTS 執行時輔助程式

未來的能力應優先採用相同的模式。

### 多能力公司外掛程式範例

公司外掛程式在外部應感覺協調一致。如果 OpenClaw 對模型、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網頁擷取和網頁搜尋有共享合約，供應商可以在一個地方擁有其所有介面：

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

重要的不是確切的輔助程式名稱。重要的是形狀：

- 一個外掛程式擁有供應商介面
- 核心仍然擁有能力合約
- 通道和功能外掛程式消耗 `api.runtime.*` 輔助程式，而非供應商程式碼
- 合約測試可以斷言外掛程式註冊了其聲稱擁有的能力

### 能力範例：影片理解

OpenClaw 已經將影像/音訊/影片理解視為一個共享能力。相同的所有權模型適用於此：

1. 核心定義媒體理解合約
2. 供應商外掛程式視情況註冊 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道與功能插件使用共享的核心行為，而不是
   直接連接到供應商程式碼

這避免了將某個供應商的影片假設硬編碼到核心中。插件擁有
供應商表面；核心擁有功能合約與後援行為。

影片生成已經使用了相同的序列：核心擁有型別化
功能合約與執行階段輔助程式，而供應商插件針對它註冊
`api.registerVideoGenerationProvider(...)` 實作。

需要具體的推出檢查清單？請參閱
[功能食譜](/zh-Hant/tools/capability-cookbook)。

## 合約與執行

插件 API 表面故意在
`OpenClawPluginApi` 中進行了型別定義與集中管理。該合約定義了支援的註冊點，以及
插件可以依賴的執行階段輔助程式。

為何這很重要：

- 插件作者獲得一個穩定的內部標準
- 核心可以拒絕重複的所有權，例如兩個插件註冊相同的
  提供者 ID
- 啟動時可以針對格式錯誤的註冊提供可操作的診斷訊息
- 合約測試可以強制執行打包插件的所有權，並防止無聲偏移

有兩層執行機制：

1. **執行階段註冊執行**
   插件註冊表會在插件載入時驗證註冊。範例：
   重複的提供者 ID、重複的語音提供者 ID 和格式錯誤的
   註冊會產生插件診斷訊息，而不是未定義的行為。
2. **合約測試**
   打包的插件會在測試執行期間擷取到合約註冊表中，以便
   OpenClaw 可以明確斷言所有權。目前這用於模型
   提供者、語音提供者、網路搜尋提供者以及打包註冊
   所有權。

實際效果是 OpenClaw 預先知道哪個插件擁有哪個
表面。這讓核心與通道能夠無縫組成，因為所有權是
被宣告、型別化且可測試的，而不是隱含的。

### 合約中應包含什麼

好的插件合約是：

- 經過型別定義的
- 小型的
- 功能特定的
- 由核心擁有
- 可由多個插件重複使用
- 可由通道/功能在無需供應商知識的情況下使用

糟糕的插件合約是：

- 隱藏在核心中的供應商特定政策
- 繞過註冊表的一次性插件緊急逃生門
- 直接深入供應商實作的通道程式碼
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的臨時執行時物件

如有疑問，請提高抽象層級：先定義功能，然後再讓
外掛程式接入其中。

## 執行模型

原生 OpenClaw 外掛程式與閘道**同進程 (in-process)** 執行。它們不會
被沙箱化。已載入的原生外掛程式具有與核心程式碼相同的
進程級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、掛鉤 和服務
- 原生外掛程式的錯誤可能會導致閘道當機或不穩定
- 惡意的原生外掛程式相當於在 OpenClaw 程序內執行任意程式碼

相容套件 預設情況下更安全，因為 OpenClaw 目前將其
視為元資料/內容包。在目前的版本中，這主要意味著捆綁的
技能。

對於非捆綁的外掛程式，請使用允許清單 和明確的安裝/載入路徑。請將
工作區外掛程式視為開發時期的程式碼，而非生產環境的預設值。

對於捆綁的工作區套件名稱，請將外掛程式 ID 錨定在 npm
名稱中：預設為 `@openclaw/<id>`，或當該套件有意
公開較狹窄的外掛程式角色時，使用已批准的類型後綴，例如
`-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要信任說明：

- `plugins.allow` 信任的是**外掛程式 ID**，而非來源出處。
- 當啟用/列入允許清單時，與捆綁外掛程式具有相同 ID 的工作區
  外掛程式會刻意遮蔽該捆綁副本。
- 這對於本地開發、修補測試 和熱修復 來說是正常且有用的。

## 匯出邊界

OpenClaw 匯出的是功能，而非實作便利性。

保持功能註冊公開。修剪非合約的輔助匯出：

- 特定於捆綁外掛程式的輔助子路徑
- 非旨在作為公開 API 的執行時管道 子路徑
- 供應商特定的便利輔助程式
- 屬於實作細節的設定/入門 輔助程式

部分內建外掛程式的輔助子路徑仍保留在生成的 SDK 匯出對應表中，以維持相容性與內建外掛程式的維護。目前的範例包括
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 以及數個 `plugin-sdk/matrix*` 縫合點。請將這些視為保留的實作細節匯出，而非新第三方外掛程式的推薦 SDK 模式。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛程式根目錄
2. 讀取原生或相容的 bundle 清單與套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛程式設定 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 決定每個候選項的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` (或 `activate(api)` — 一個舊版別名) 掛鉤並將註冊資訊收集到外掛程式登錄表中
8. 將登錄表公開給指令/執行時層

<Note>`activate` 是 `register` 的舊版別名 — 載入器會解析存在的任一者 (`def.register ?? def.activate`) 並在同一點呼叫它。所有內建外掛程式都使用 `register`；對於新外掛程式，建議優先使用 `register`。</Note>

安全檢查機制發生在執行時執行**之前**。當入口點逸出外掛程式根目錄、路徑可被任何人寫入，或對於非內建外掛程式而言路徑所有權看起來可疑時，候選項會被封鎖。

### 優先使用清單的行為

清單是控制平面的唯一資訊來源。OpenClaw 使用它來：

- 識別外掛程式
- 探索已宣告的頻道/技能/設定架構或 bundle 功能
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/預留位置
- 顯示安裝/目錄元資料
- 在不載入外掛程式執行時的情況下保留低成本啟用與設定描述項

對於原生外掛程式，執行時模組是資料平面部分。它會註冊實際行為，例如掛鉤、工具、指令或提供者流程。

選用的 manifest `activation` 和 `setup` 區塊保留在控制平面上。
它們是僅用於啟動規劃和設定發現的元資料描述符；
它們不取代執行時期註冊、`register(...)` 或 `setupEntry`。
第一批實際啟動消費者現在會使用 manifest 指令、channel 和 provider 提示，
在更廣泛的 registry 具體化之前縮小外掛載入範圍：

- CLI 載入縮小至擁有所請求主要指令的外掛
- channel 設定/外掛解析縮小至擁有所請求
  channel id 的外掛
- 明確 provider 設定/執行時期解析縮小至擁有
  所請求 provider id 的外掛

設定發現現在偏好描述符擁有的 id，例如 `setup.providers` 和
`setup.cliBackends`，以便在回退到 `setup-api` 針對仍需要設定時期執行時期 hooks 的外掛之前，縮小候選外掛範圍。如果多於一個發現的外掛宣告相同的正規化設定 provider 或 CLI 後端
id，設定查詢會拒絕模稜兩可的擁有者，而不是依賴發現
順序。

### 載入器快取內容

OpenClaw 維護簡短的處理程序內快取以用於：

- 發現結果
- manifest registry 資料
- 已載入的外掛 registry

這些快取減少了突發啟動和重複指令的開銷。將它們視為短期效能快取是安全的，而非持久化。

效能備註：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取視窗。

## Registry 模型

已載入的外掛不會直接變更隨機的核心全域變數。它們會註冊到
中央外掛 registry。

Registry 追蹤：

- 外掛記錄 (身分、來源、起源、狀態、診斷)
- 工具
- 舊版 hooks 和型別化 hooks
- channels
- providers
- gateway RPC 處理程序
- HTTP 路由
- CLI 註冊程式
- 背景服務
- 外掛擁有的指令

核心功能接著從該 registry 讀取，而不是直接與外掛模組溝通。
這讓載入保持單向：

- 外掛模組 -> registry 註冊
- 核心執行時期 -> registry 消耗

這種分離對於可維護性至關重要。這意味著大多數核心表面只需要一個整合點：「讀取註冊表」，而不是「對每個插件模組進行特殊處理」。

## 對話綁定回呼

綁定對話的插件可以在批准解決後做出反應。

使用 `api.onConversationBindingResolved(...)` 在綁定請求被批准或拒絕後接收回呼：

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

回呼有效欄位 (Callback payload fields)：

- `status`: `"approved"` 或 `"denied"`
- `decision`: `"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`: 已批准請求的解決綁定
- `request`: 原始請求摘要、分離提示、發送者 ID 和
  對話元資料

此回呼僅用於通知。它不會改變誰被允許綁定對話，並且在核心批准處理完成後運行。

## 提供者運行時鉤子

提供者插件現在具有兩個層級：

- 清單元資料：`providerAuthEnvVars` 用於在運行時載入之前進行廉價的提供者環境授權查找，
  `providerAuthAliases` 用於共享授權的提供者變體，
  `channelEnvVars` 用於在運行時載入之前進行廉價的通道環境/設置查找，
  以及 `providerAuthChoices` 用於在運行時載入之前進行廉價的入門/授權選擇標籤和
  CLI 標誌元資料
- 配置時鉤子：`catalog` / 舊版 `discovery` 以及 `applyConfigDefaults`
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
  `isBinaryThinking`, `supportsXHighThinking`, `supportsAdaptiveThinking`,
  `supportsMaxThinking`,
  `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `createEmbeddingProvider`,
  `buildReplayPolicy`,
  `sanitizeReplayHistory`, `validateReplayTurns`, `onModelSelected`

OpenClaw 仍然擁有通用的 agent 迴圈、故障轉移、記錄處理和工具原則。這些 hooks 是擴充提供者特定行為的介面，而不需要完整的自訂推論傳輸。

當提供者具有基於環境的憑證，而通用授權/狀態/模型選擇器路徑應在不加載插件運行時的情況下看到這些憑證時，使用清單 `providerAuthEnvVars`。當一個提供者 ID 應重用另一個提供者 ID 的環境變數、授權設定檔、支援設定檔的授權以及 API 金鑰入門選擇時，使用清單 `providerAuthAliases`。當入門/授權選擇 CLI 介面應在不加載提供者運行時的情況下得知提供者的選擇 ID、群組標籤和簡單的單一旗標授權接線時，使用清單 `providerAuthChoices`。將提供者運行時 `envVars` 保留給操作員導向的提示，例如入門標籤或 OAuth 用戶端 ID/用戶端密鑰設定變數。

當通道具有環境驅動的授權或設定，且通用 shell-env 後備、設定/狀態檢查或設定提示應在不加載通道運行時的情況下看到這些內容時，使用清單 `channelEnvVars`。

### Hook 順序與用法

對於模型/提供者插件，OpenClaw 大致按此順序呼叫 hook。「使用時機」欄位是快速決策指南。

| #   | Hook                              | 作用                                                                                              | 使用時機                                                                                                        |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 生成期間，將提供者設定發佈到 `models.providers`                                  | 提供者擁有目錄或基礎 URL 預設值                                                                                 |
| 2   | `applyConfigDefaults`             | 在配置具體化期間套用提供者擁有的全域配置預設值                                                    | 預設值取決於 auth 模式、環境或提供者模型系列語意                                                                |
| --  | _(內建模型查詢)_                  | OpenClaw 先嘗試正常的註冊表/目錄路徑                                                              | _(非 plugin hook)_                                                                                              |
| 3   | `normalizeModelId`                | 在查詢之前正規化舊版或預覽模型 ID 別名                                                            | 提供者擁有正規模型解析前的別名清理                                                                              |
| 4   | `normalizeTransport`              | 在通用模型組裝之前，標準化提供者系列 `api` / `baseUrl`                                            | 提供者擁有相同傳輸系列中自訂提供者 ID 的傳輸清理                                                                |
| 5   | `normalizeConfig`                 | 在運行時/提供者解析之前標準化 `models.providers.<id>`                                             | Provider 需要配置清理，這應該與外掛程式共存；打包的 Google 系列輔助程式也支援支援的 Google 配置項目作為最後防線 |
| 6   | `applyNativeStreamingUsageCompat` | 對配置提供者套用原生串流使用相容性重寫                                                            | Provider 需要端點驅動的原生串流使用中繼資料修復                                                                 |
| 7   | `resolveConfigApiKey`             | 在執行階段授權載入之前，解析配置提供者的環境標記授權                                              | 提供者具有提供者自有的環境標記 API 金鑰解析；`amazon-bedrock` 在此處也有內建的 AWS 環境標記解析器               |
| 8   | `resolveSyntheticAuth`            | 展示本機/自託管或配置支援的授權，而不會持久化純文字                                               | Provider 可以使用合成/本機憑證標記運作                                                                          |
| 9   | `resolveExternalAuthProfiles`     | 疊加提供者自有的外部授權設定檔；對於 CLI/應用程式自有的憑證，預設 `persistence` 為 `runtime-only` | Provider 重複使用外部授權憑證，而不持久化複製的重新整理權杖                                                     |
| 10  | `shouldDeferSyntheticProfileAuth` | 將儲存的合成設定檔預留位置降低至環境/配置支援的授權之後                                           | Provider 儲存不應獲得優先權的合成預留位置設定檔                                                                 |
| 11  | `resolveDynamicModel`             | 針對本地註冊表中尚未存在的提供者擁有模型 ID 的同步回退                                            | Provider 接受任意上游模型 ID                                                                                    |
| 12  | `prepareDynamicModel`             | 非同步預熱，然後 `resolveDynamicModel` 再次執行                                                   | Provider 在解析未知 ID 之前需要網路中繼資料                                                                     |
| 13  | `normalizeResolvedModel`          | 在嵌入式執行器使用解析的模型之前的最終重寫                                                        | Provider 需要傳輸重寫，但仍使用核心傳輸                                                                         |
| 14  | `contributeResolvedModelCompat`   | 為位於另一個相容傳輸後面的供應商模型提供相容性標誌                                                | Provider 在代理傳輸上識別自己的模型，而不接管提供者                                                             |
| 15  | `capabilities`                    | 共享核心邏輯使用的提供者擁有的文字記錄/工具中繼資料                                               | Provider 需要文字記錄/提供者系別的怪癖行為                                                                      |
| 16  | `normalizeToolSchemas`            | 在嵌入式執行器看到工具架構之前將其正規化                                                          | Provider 需要傳輸系列架構清理                                                                                   |
| 17  | `inspectToolSchemas`              | 在正規化後顯示提供者擁有的架構診斷                                                                | 提供者想要關鍵字警告，而不必教導核心特定於提供者的規則                                                          |
| 18  | `resolveReasoningOutputMode`      | 選擇原生與標記的推理輸出合約                                                                      | 提供者需要標記的推理/最終輸出，而不是原生欄位                                                                   |
| 19  | `prepareExtraParams`              | 在通用串流選項包裝器之前的請求參數正規化                                                          | 提供者需要預設請求參數或每個提供者的參數清理                                                                    |
| 20  | `createStreamFn`                  | 使用自訂傳輸完全替換正常的串流路徑                                                                | 提供者需要自訂連線協定，而不僅僅是一個包裝器                                                                    |
| 21  | `wrapStreamFn`                    | 套用通用包裝器後的串流包裝器                                                                      | 提供者需要請求標頭/主體/模型相容性包裝器，而不需要自訂傳輸                                                      |
| 22  | `resolveTransportTurnState`       | 附加原生每輪次傳輸標頭或元資料                                                                    | 提供者希望通用傳輸發送提供者原生的輪次身分                                                                      |
| 23  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 標頭或工作階段冷卻策略                                                         | 提供者希望通用 WebSocket 傳輸調整工作階段標頭或後備策略                                                         |
| 24  | `formatApiKey`                    | Auth-profile formatter: stored profile becomes the runtime `apiKey` string                        | 提供者儲存額外的驗證元資料，並需要自訂執行時權杖形狀                                                            |
| 25  | `refreshOAuth`                    | OAuth 更新覆蓋，用於自訂更新端點或更新失敗策略                                                    | Provider does not fit the shared `pi-ai` refreshers                                                             |
| 26  | `buildAuthDoctorHint`             | 當 OAuth 更新失敗時附加的修復提示                                                                 | 提供者需要在更新失敗後提供由提供者擁有的驗證修復指導                                                            |
| 27  | `matchesContextOverflowError`     | 提供者擁有的上下文視窗溢出匹配器                                                                  | 提供者具有通用啟發式演算法會錯過的原始溢出錯誤                                                                  |
| 28  | `classifyFailoverReason`          | 提供者擁有的故障轉移原因分類                                                                      | 提供者可以將原始 API/傳輸錯誤映射到速率限制/過載等                                                              |
| 29  | `isCacheTtlEligible`              | 針對代理/回傳提供者的提示快取策略                                                                 | 提供者需要特定於代理的快取 TTL 閘控                                                                             |
| 30  | `buildMissingAuthMessage`         | 通用遺失驗證恢復訊息的替換方案                                                                    | 供應商需要特定於供應商的遺失驗證恢復提示                                                                        |
| 31  | `suppressBuiltInModel`            | 過時的上游模型抑制加上可選的使用者導向錯誤提示                                                    | 供應商需要隱藏過時的上游資料列，或將其替換為供應商提示                                                          |
| 32  | `augmentModelCatalog`             | 在探索後附加的合成/最終目錄資料列                                                                 | Provider needs synthetic forward-compat rows in `models list` and pickers                                       |
| 33  | `isBinaryThinking`                | 針對二元思維供應商的推論開關                                                                      | 供應商僅公開二元思維開/關                                                                                       |
| 34  | `supportsXHighThinking`           | `xhigh` reasoning support for selected models                                                     | Provider wants `xhigh` on only a subset of models                                                               |
| 35  | `supportsAdaptiveThinking`        | `adaptive` thinking support for selected models                                                   | Provider wants `adaptive` shown only for models with provider-managed adaptive thinking                         |
| 36  | `supportsMaxThinking`             | `max` reasoning support for selected models                                                       | Provider wants `max` shown only for models with provider max thinking                                           |
| 37  | `resolveDefaultThinkingLevel`     | Default `/think` level for a specific model family                                                | Provider owns default `/think` policy for a model family                                                        |
| 38  | `isModernModelRef`                | Modern-model matcher for live profile filters and smoke selection                                 | Provider owns live/smoke preferred-model matching                                                               |
| 39  | `prepareRuntimeAuth`              | Exchange a configured credential into the actual runtime token/key just before inference          | Provider needs a token exchange or short-lived request credential                                               |
| 40  | `resolveUsageAuth`                | Resolve usage/billing credentials for `/usage` and related status surfaces                        | Provider needs custom usage/quota token parsing or a different usage credential                                 |
| 41  | `fetchUsageSnapshot`              | 在授權解決後，取得並正規化供應商專屬的使用量/配額快照                                             | 供應商需要一個供應商專屬的使用量端點或負載解析器                                                                |
| 42  | `createEmbeddingProvider`         | 為記憶體/搜尋建置一個供應商擁有的嵌入介面卡                                                       | 記憶體嵌入行為屬於供應商外掛                                                                                    |
| 43  | `buildReplayPolicy`               | 傳回一個控制供應商文字紀錄處理的重播原則                                                          | 供應商需要自訂的文字紀錄原則（例如，思考區塊剝離）                                                              |
| 44  | `sanitizeReplayHistory`           | 在通用文字紀錄清理後重寫重播歷史                                                                  | 供應商需要超出共享壓縮輔助函式的供應商專屬重播重寫                                                              |
| 45  | `validateReplayTurns`             | 在內嵌執行器之前進行最終的重播回合驗證或重塑                                                      | 供應商傳輸在通用清理後需要更嚴格的回合驗證                                                                      |
| 46  | `onModelSelected`                 | 執行供應商擁有的選取後副作用                                                                      | 當模型變為使用中時，供應商需要遙測或供應商擁有的狀態                                                            |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 會先檢查
相符的供應商外掛，然後透過其他具有掛鉤能力的供應商外掛
直到其中一個實際變更了模型 ID 或傳輸/設定。這使得
別名/相容性供應商填充層能正常運作，而無需呼叫者知道哪個
內建外掛擁有該重寫。如果沒有供應商掛鉤重寫支援的
Google 系列設定項目，內建的 Google 設定正規化工具仍會套用
該相容性清理。

如果供應商需要完全自訂的傳輸協定或自訂請求執行器，
那是另一類別的擴充功能。這些掛鉤適用於仍在
OpenClaw 正常推斷迴圈上執行的供應商行為。

### 供應商範例

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
  `supportsAdaptiveThinking`、`supportsMaxThinking`、`resolveDefaultThinkingLevel`、`applyConfigDefaults`、`isModernModelRef`
  和 `wrapStreamFn`，因為它擁有 Claude 4.6 向前相容性、
  提供者系列提示、驗證修復指導、使用端點整合、
  提示快取資格、感知驗證的設定預設值、Claude
  預設/自適應思考政策，以及針對測試版標頭、
  `/fast` / `serviceTier` 和 `context1m` 的 Anthropic 專屬串流調整。
- Anthropic 的 Claude 專屬串流輔助程式目前仍保留在捆綁外掛程式
  自己的公開 `api.ts` / `contract-api.ts` 縫隙中。該套件表面
  匯出 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
  `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和較低層級的
  Anthropic 包裝器建構器，而不是圍繞單一提供者的測試版標頭規則來擴展通用 SDK。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`，
  因為它擁有 GPT-5.4 向前相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 正規化、感知 Codex 的驗證
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考 /
  即時模型政策；`openai-responses-defaults` 串流系列擁有
  用於歸因標頭、
  `/fast`/`serviceTier`、文字詳細程度、原生 Codex 網路搜尋、
  推理相容負載調整和 Responses 內容管理的共享原生 OpenAI Responses 包裝器。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該提供者是透傳的，且可能在 OpenClaw 的靜態目錄更新前公開新的
  模型 ID；它還使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 來將
  提供者特定的請求標頭、路由元數據、推理修補和
  快取策略保留在核心之外。其重放策略來自
  `passthrough-gemini` 系列的，而 `openrouter-thinking` 串流系列
  則擁有代理推理注入和不支援的模型 / `auto` 跳過處理。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities` 加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要提供者擁有的裝置登入、模型後續行為、Claude 逐字稿
  怪癖、GitHub 權杖 -> Copilot 權杖交換，以及提供者擁有的使用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog` 加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍在核心 OpenAI 傳輸上運行，但擁有其傳輸/基礎 URL
  正規化、OAuth 重新整理後續策略、預設傳輸選擇、
  合成 Codex 目錄列和 ChatGPT 使用量端點整合；它
  與直接 OpenAI 共用相同的 `openai-responses-defaults` 串流系列。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel`、
  `buildReplayPolicy`、`sanitizeReplayHistory`、
  `resolveReasoningOutputMode`、`wrapStreamFn` 和 `isModernModelRef`，因為
  `google-gemini` replay 系列擁有 Gemini 3.1 向前相容回退、
  原生 Gemini replay 驗證、bootstrap replay 清理、標記
  推理輸出模式和現代模型匹配，而
  `google-thinking` stream 系列擁有 Gemini thinking payload 正規化；
  Gemini CLI OAuth 也使用 `formatApiKey`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 進行 token 格式化、token 解析和配額端點
  連接。
- Anthropic Vertex 使用 `buildReplayPolicy` 透過
  `anthropic-by-model` replay 系列，使 Claude 特定的 replay 清理保持
  作用於 Claude ID，而非每個 `anthropic-messages` 傳輸。
- Amazon Bedrock 使用 `buildReplayPolicy`、`matchesContextOverflowError`、
  `classifyFailoverReason` 和 `resolveDefaultThinkingLevel`，因為它擁有
  Bedrock 特定的節流/未就緒/內容溢出錯誤分類
  （針對 Anthropic-on-Bedrock 流量）；其 replay 策略仍共用相同的
  僅限 Claude 的 `anthropic-by-model` 防護。
- OpenRouter、Kilocode、Opencode 和 Opencode Go 使用 `buildReplayPolicy`
  透過 `passthrough-gemini` replay 系列，因為它們透過 OpenAI 相容傳輸代理 Gemini
  模型，且需要 Gemini
  思考簽章清理，而不需要原生 Gemini replay 驗證或
  bootstrap 重寫。
- MiniMax 使用 `buildReplayPolicy` 透過
  `hybrid-anthropic-openai` replay 系列，因為一個提供者同時擁有
  Anthropic-message 和 OpenAI 相容語意；它在 Anthropic 端保持僅限 Claude
  的 thinking 區塊丟棄，同時將推理輸出
  模式覆寫回原生，而 `minimax-fast-mode` stream 系列擁有
  共用串流路徑上的快速模式模型重寫。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共享的
  OpenAI 傳輸，但需要提供商擁有的思考載荷標準化；`moonshot-thinking`
  串流系列將配置加上 `/think` 狀態對應到其
  原生二進制思考載荷。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供商擁有的請求標頭、
  推理載荷標準化、Gemini 逐字稿提示以及 Anthropic
  快取 TTL 閘控；`kilocode-thinking` 串流系列在共享代理串流路徑上保持 Kilo 思考
  注入，同時跳過 `kilo/auto` 和
  其他不支援明確推理載荷的代理模型 ID。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 後備、
  `tool_stream` 預設值、二進制思考 UX、現代模型匹配以及
  使用授權和配額擷取；`tool-stream-default-on` 串流系列使
  預設開啟的 `tool_stream` 包裝器免於各提供商的手寫膠水代碼。
- xAI 使用 `normalizeResolvedModel`、`normalizeTransport`、
  `contributeResolvedModelCompat`、`prepareExtraParams`、`wrapStreamFn`、
  `resolveSyntheticAuth`、`resolveDynamicModel` 和 `isModernModelRef`
  因為它擁有原生 xAI Responses 傳輸標準化、Grok 快速模式
  別名重寫、預設 `tool_stream`、strict-tool / reasoning-payload
  清理、外掛擁有工具的後備授權重用、前向相容 Grok
  模型解析，以及提供商擁有的相容性補丁，例如 xAI tool-schema
  設定檔、不支援的架構關鍵字、原生 `web_search` 和
  HTML 實體工具呼叫引數解碼。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities` 將
  轉錄/工具怪癖排除在核心之外。
- 僅目錄的捆綁提供者，例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`
  僅使用 `catalog`。
- Qwen 對其文字提供者使用 `catalog`，並針對其多模態介面使用共享的媒體理解和
  影片生成註冊。
- MiniMax 和小米使用 `catalog` 加上使用量掛鉤，因為它們的 `/usage`
  行為是由外掛程式擁有的，即使推論仍透過共享傳輸運行。

## 執行時期輔助工具

外掛程式可以透過 `api.runtime` 存取選定的核心輔助工具。對於 TTS：

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

- `textToSpeech` 傳回檔案/語音備忘錄介面的正常核心 TTS 輸出酬載。
- 使用核心 `messages.tts` 組態和提供者選取。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對於每個提供者是可選的。將其用於供應商擁有的語音選擇器或設定流程。
- 語音列表可以包含更豐富的中繼資料，例如地區設定、性別和人格標籤，以供具備提供者意識的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援電話。Microsoft 則不支援。

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
- 使用語音提供者處理供應商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會正規化為 `microsoft` 提供者 ID。
- 首選的擁有權模型是以公司為導向：隨著 OpenClaw 新增那些
  能力合約，一個供應商外掛程式可以擁有文字、語音、影像和未來的媒體提供者。

對於圖片/音訊/影片理解，外掛程式會註冊一個類型化的
media-understanding provider，而不是通用的 key/value bag：

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

- 將編排、後備、配置和通道連線保留在核心中。
- 將供應商行為保留在提供者外掛程式中。
- 擴充功能應保持類型化：新的可選方法、新的可選
  結果欄位、新的可選能力。
- 影片生成已遵循相同的模式：
  - 核心擁有能力合約和執行時期輔助程式
  - 供應商外掛程式註冊 `api.registerVideoGenerationProvider(...)`
  - 功能/通道外掛程式使用 `api.runtime.videoGeneration.*`

對於 media-understanding 執行時期輔助程式，外掛程式可以呼叫：

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

對於音訊轉錄，外掛程式可以使用 media-understanding 執行時期
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

- `api.runtime.mediaUnderstanding.*` 是用於
  圖片/音訊/影片理解的首選共用介面。
- 使用核心 media-understanding 音訊配置 (`tools.media.audio`) 和提供者後備順序。
- 當未產生轉錄輸出時（例如跳過/不支援的輸入），傳回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 保留為相容性別名。

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

- `provider` 和 `model` 是每次執行的可選覆寫，而非持續的工作階段變更。
- OpenClaw 僅對受信任的呼叫者接受這些覆寫欄位。
- 對於外掛程式擁有的後備執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 選擇加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的標準 `provider/model` 目標，或使用 `"*"` 明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後備。

對於網路搜尋，外掛程式可以使用共享的執行時期輔助程式，而不是
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
- 對於供應商特定的搜尋傳輸，請使用網路搜尋提供者。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴 agent 工具包裝器的功能/通道外掛的首選共享介面。

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

- `generate(...)`：使用設定的圖像生成提供者鏈生成圖像。
- `listProviders(...)`：列出可用的圖像生成提供者及其功能。

## Gateway HTTP 路由

外掛可以使用 `api.registerHttpRoute(...)` 暴露 HTTP 端點。

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

- `path`：Gateway HTTP 伺服器下的路由路徑。
- `auth`：必填。使用 `"gateway"` 要求正常的 Gateway 身份驗證，或使用 `"plugin"` 進行外掛管理的身份驗證/webhook 驗證。
- `match`：可選。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：可選。允許同一個外掛替換其現有的路由註冊。
- `handler`：當路由處理請求時返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已被移除，將導致外掛載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 外掛路由必須明確宣告 `auth`。
- 除非設定 `replaceExisting: true`，否則會拒絕完全相同的 `path + match` 衝突，且一個外掛無法替換另一個外掛的路由。
- 會拒絕具有不同 `auth` 級別的重疊路由。請將 `exact`/`prefix` 轉發鏈保持在相同的身份驗證級別。
- `auth: "plugin"` 路由**不**會自動接收操作員運行時範圍。它們用於外掛管理的 webhook/簽名驗證，而非特權 Gateway 輔助呼叫。
- `auth: "gateway"` 路由在 Gateway 請求運行時範圍內運行，但該範圍是有意為之的保守範圍：
  - 共用密碼 bearer auth (`gateway.auth.mode = "token"` / `"password"`) 確保 plugin-route 執行範圍固定於 `operator.write`，即使呼叫者發送了 `x-openclaw-scopes`
  - 受信任的身分識別 HTTP 模式（例如私有入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`）僅在標頭明確存在時接受 `x-openclaw-scopes`
  - 如果這些帶有身分識別的 plugin-route 請求中缺少 `x-openclaw-scopes`，執行範圍會回退至 `operator.write`
- 實用規則：不要假設 gateway-auth plugin route 是隱含的管理介面。如果您的 route 需要僅限管理員的行為，請要求帶有身分識別的 auth 模式並記錄明確的 `x-openclaw-scopes` 標頭合約。

## Plugin SDK 匯出路徑

撰寫外掛時，使用 SDK 子路徑而不是單一的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/plugin-entry` 用於外掛註冊原語。
- `openclaw/plugin-sdk/core` 用於通用共享的外掛介面合約。
- `openclaw/plugin-sdk/config-schema` 用於根 `openclaw.json` Zod schema
  匯出 (`OpenClawSchema`)。
- 穩定的通道原語，例如 `openclaw/plugin-sdk/channel-setup`、
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
  `openclaw/plugin-sdk/webhook-ingress`，用於共享的設定/驗證/回覆/網路掛接
  連線。`channel-inbound` 是 debounce、提及匹配、
  入站提及政策輔助程式、信封格式化和入站信封
  內容輔助程式的共用主區。
  `channel-setup` 是狹窄的選用安裝設定縫隙。
  `setup-runtime` 是 `setupEntry` 使用的執行時期安全設定介面 /
  延遲啟動，包括匯入安全的設定修補程式介面卡。
  `setup-adapter-runtime` 是具環境感知能力的帳號設定介面卡縫隙。
  `setup-tools` 是小型 CLI/封存/文件輔助程式縫隙 (`formatCliCommand`、
  `detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、
  `CONFIG_DIR`)。
- 諸如 `openclaw/plugin-sdk/channel-config-helpers`、
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
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime` 等網域子路徑用於共享的執行時期/設定輔助程式。
  `telegram-command-config` 是 Telegram 自訂指令正規化/驗證的狹窄公共接縫，即使打包的 Telegram 合約介面暫時無法使用，它仍然保持可用。
  `text-runtime` 是共享的文字/markdown/記錄接縫，包括助理可見文字剝離、markdown 渲染/分塊輔助程式、編修輔助程式、指令標籤輔助程式和安全文字工具。
- 特定於核准的頻道接縫應該偏好插件上的一個 `approvalCapability`
  合約。Core 隨後透過該功能讀取核准驗證、傳送、渲染、
  原生路由和延遲原生處理程式行為，而不是將核准行為混合到不相關的插件欄位中。
- `openclaw/plugin-sdk/channel-runtime` 已被棄用，僅作為較舊插件的相容性填充層保留。新程式碼應改為導入較狹窄的通用原語，且 repo 程式碼不應新增該填充層的導入。
- 打包的擴充功能內部保持私有。外部插件應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可以使用位於插件套件根目錄下的 repo 公共進入點，例如 `index.js`、`api.js`、
  `runtime-api.js`、`setup-entry.js`，以及狹窄範圍的檔案，例如
  `login-qr-api.js`。切勿從核心或其他擴充功能匯入插件套件的 `src/*`。
- Repo entry point split:
  `<plugin-package-root>/api.js` 是 helper/types barrel，
  `<plugin-package-root>/runtime-api.js` 是 runtime-only barrel，
  `<plugin-package-root>/index.js` 是 bundled plugin entry，
  而 `<plugin-package-root>/setup-entry.js` 是 setup plugin entry。
- Current bundled provider examples:
  - Anthropic 使用 `api.js` / `contract-api.js` 作為 Claude stream helpers，例如
    `wrapAnthropicProviderStream`、beta-header helpers，以及 `service_tier`
    解析。
  - OpenAI 使用 `api.js` 作為 provider builders、default-model helpers 以及
    realtime provider builders。
  - OpenRouter 使用 `api.js` 作為其 provider builder 以及 onboarding/config
    helpers，而 `register.runtime.js` 仍可重新匯出通用
    `plugin-sdk/provider-stream` helpers 以供 repo-local 使用。
- Facade-loaded public entry points 在存在的情況下偏好使用 active runtime config snapshot，
  當 OpenClaw 尚未提供 runtime snapshot 時，則回退到磁碟上的 resolved config file。
- Generic shared primitives 仍是首選的 public SDK contract。一小組
  保留的 bundled channel-branded helper seams 相容性集仍然
  存在。請將其視為 bundled-maintenance/compatibility seams，而非新的
  third-party import targets；新的 cross-channel contracts 應仍置於
  generic `plugin-sdk/*` subpaths 或 plugin-local `api.js` /
  `runtime-api.js` barrels。

Compatibility note:

- Avoid the root `openclaw/plugin-sdk` barrel for new code.
- Prefer the narrow stable primitives first. The newer setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool subpaths are the intended contract for new
  bundled and external plugin work.
  Target parsing/matching belongs on `openclaw/plugin-sdk/channel-targets`.
  Message action gates and reaction message-id helpers belong on
  `openclaw/plugin-sdk/channel-actions`.
- 預設情況下，打包的擴充功能專用 helper barrels 並不穩定。如果某個 helper 僅被打包的擴充功能所需要，請將其保留在擴充功能的本機 `api.js` 或 `runtime-api.js` 縫合之後，而不是將其提升到 `openclaw/plugin-sdk/<extension>` 中。
- 新的共享 helper 縫合應該是通用的，而不是特定於通道品牌的。共享目標解析屬於 `openclaw/plugin-sdk/channel-targets`；特定於通道的內部細節保留在擁有插件的本機 `api.js` 或 `runtime-api.js` 縫合之後。
- 存在特定於功能的子路徑，例如 `image-generation`、`media-understanding` 和 `speech`，因為打包/原生插件今天正在使用它們。僅僅它們的存在並不意味著每個匯出的 helper 都是長期凍結的外部合約。

## 訊息工具架構

插件應擁有特定於通道的 `describeMessageTool(...)` 架構貢獻。將特定於提供者的欄位保留在插件中，而不是在共享核心中。

對於共享的可移植架構片段，請重用透過 `openclaw/plugin-sdk/channel-actions` 匯出的通用 helper：

- `createMessageToolButtonsSchema()` 用於按鈕網格樣式的 payload
- `createMessageToolCardSchema()` 用於結構化卡片 payload

如果架構形狀僅對某個提供者有意義，請在該插件自己的原始碼中定義它，而不是將其提升到共享 SDK 中。

## 通道目標解析

通道插件應擁有特定於通道的目標語意。保持共享的出站主機通用，並使用訊息配接器表面來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查詢之前，正規化的目標是否應被視為 `direct`、`group` 或 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- 當核心在正規化或目錄未命中之後需要最終的提供者擁有權解析時，`messaging.targetResolver.resolveTarget(...)` 是插件後備方案。
- 一旦解析了目標，`messaging.resolveOutboundSessionRoute(...)` 便擁有特定於提供者的會話路由建構。

建議的分割方式：

- 對於應在搜尋對等/群組之前發生的類別決策，請使用 `inferTargetChatType`。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 請將 `resolveTarget` 用於提供者特定的正規化備援，而非用於廣泛的目錄搜尋。
- 請將提供者原生的 ID（如聊天 ID、執行緒 ID、JID、帳號和房間 ID）保留在 `target` 值或提供者特定的參數中，而非放在通用的 SDK 欄位裡。

## 由配置支援的目錄

從配置衍生目錄條目的外掛程式應將該邏輯保留在外掛程式中，並重複使用來自
`openclaw/plugin-sdk/directory-runtime` 的共享協助程式。

當頻道需要由配置支援的對等/群組時使用此選項，例如：

- 由允許清單驅動的 DM 對等
- 已配置的頻道/群組對應
- 帳號範圍的靜態目錄備援

`directory-runtime` 中的共享協助程式僅處理通用操作：

- 查詢過濾
- 套用限制
- 去重/正規化協助程式
- 建置 `ChannelDirectoryEntry[]`

特定頻道的帳號檢查和 ID 正規化應保留在外掛程式實作中。

## 提供者目錄

提供者外掛程式可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型目錄。

`catalog.run(...)` 會傳回與 OpenClaw 寫入
`models.providers` 相同的結構：

- 單一提供者條目的 `{ provider }`
- 多個提供者條目的 `{ providers }`

當外掛程式擁有提供者特定的模型 ID、基底 URL 預設值，或需要驗證才能存取的模型元資料時，請使用 `catalog`。

`catalog.order` 控制外掛程式的目錄相對於 OpenClaw 內建隱含提供者的合併時機：

- `simple`：純 API 金鑰或由環境變數驅動的提供者
- `profile`：當驗證設定檔存在時出現的提供者
- `paired`：綜合多個相關提供者條目的提供者
- `late`：最後一輪，在其他隱含提供者之後

較後面的提供者在金鑰衝突時優先，因此外掛程式可以故意使用相同的提供者 ID 覆寫內建提供者條目。

相容性：

- `discovery` 仍作為舊版別名運作
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的外掛註冊了通道，建議在 `resolveAccount(...)` 旁一併實作
`plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它可以假設憑證
  已完全具體化，並在缺少所需密碼時快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修復流程等唯讀指令路徑，不應僅為了描述設定
  而需要具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅回傳描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要僅為了回報唯讀可用性
  而回傳原始權杖值。回傳 `tokenStatus: "available"`（以及相符的來源
  欄位）對於狀態類型指令已足夠。
- 當憑證透過 SecretRef 設定但在
  目前的指令路徑中無法使用時，請使用 `configured_unavailable`。

這讓唯讀指令能回報「已設定但在本指令路徑中無法使用」，
而不是崩潰或錯誤地回報帳戶未設定。

## 套件包

外掛目錄可能包含一個帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛。如果套件包列出多個擴充功能，外掛 ID
會變成 `name/<fileBase>`。

如果您的外掛程式匯入了 npm 相依性，請將其安裝在該目錄中，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：每個 `openclaw.extensions` 項目在解析符號連結後必須保留在外掛程式目錄內。逃離套件目錄的項目將被拒絕。

安全提示：`openclaw plugins install` 使用
`npm install --omit=dev --ignore-scripts` 安裝外掛程式相依性（無生命週期腳本，執行時期無開發相依性）。請保持外掛程式相依性樹為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

可選：`openclaw.setupEntry` 可以指向一個輕量級的僅設置模組。
當 OpenClaw 需要為已停用的通道外掛程式提供設置介面時，或
當通道外掛程式已啟用但尚未配置時，它會載入 `setupEntry`
而不是完整的外掛程式進入點。當您的主要外掛程式進入點同時連接了工具、掛鉤或其他僅限執行時期的
程式碼時，這能讓啟動和設置更加輕量。

可選：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛程式在閘道器預監聽啟動階段選擇加入相同的 `setupEntry` 路徑，即使該通道已經配置過。

僅當 `setupEntry` 完全涵蓋閘道器開始監聽前必須存在的啟動介面時，才使用此選項。實際上，這意味著設置進入點
必須註冊啟動所依賴的每個通道所擁有的功能，例如：

- 通道註冊本身
- 任何必須在閘道器開始監聽之前可用的 HTTP 路由
- 任何必須在同一視窗期間存在的閘道器方法、工具或服務

如果您的完整進入點仍然擁有任何必要的啟動功能，請勿啟用
此旗標。請將外掛程式保持在預設行為，並讓 OpenClaw 在啟動期間載入
完整進入點。

捆綁的通道也可以發布僅限設置的合約介面輔助程式，供核心
在載入完整通道執行時期之前參考。目前的設置
推廣介面是：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core uses that surface when it needs to promote a legacy single-account channel
config into `channels.<id>.accounts.*` without loading the full plugin entry.
Matrix is the current bundled example: it moves only auth/bootstrap keys into a
named promoted account when named accounts already exist, and it can preserve a
configured non-canonical default-account key instead of always creating
`accounts.default`。

那些設置修補適配器保持了內建介面發現的懶加載。導入時間保持輕量；升級介面僅在首次使用時加載，而不是在模組導入時重新進入內建通道啟動。

當那些啟動介面包含網關 RPC 方法時，請將它們保留在插件特定的前綴下。核心管理命名空間（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態，並且總是解析為
`operator.admin`，即使插件請求的是更窄的範圍。

範例：

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

### 通道目錄元數據

通道插件可以透過 `openclaw.channel` 宣傳設置/發現元數據，並透過 `openclaw.install` 提供安裝提示。這保持了核心目錄的無數據狀態。

範例：

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

除了最小範例外，還有一些有用的 `openclaw.channel` 欄位：

- `detailLabel`：用於更豐富的目錄/狀態介面的次要標籤
- `docsLabel`：覆蓋文件連結的連結文字
- `preferOver`：此目錄條目應排名在前的較低優先級插件/通道 ID
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：選擇介面複製控制
- `markdownCapable`：將通道標記為支援 Markdown，以便進行出站格式化決策
- `exposure.configured`：當設置為 `false` 時，在已配置通道列表介面中隱藏該通道
- `exposure.setup`：當設置為 `false` 時，在互動式設置/配置選擇器中隱藏該通道
- `exposure.docs`：將通道標記為內部/私有，用於文件導航介面
- `showConfigured` / `showInSetup`：為了相容性仍接受的舊版別名；建議使用 `exposure`
- `quickstartAllowFrom`：讓通道加入標準的快速入門 `allowFrom` 流程
- `forceAccountBinding`：即使僅存在一個帳戶，也要求明確的帳戶綁定
- `preferSessionLookupForAnnounceTarget`：在解析公告目標時優先使用工作階段查找

OpenClaw 也可以合併**外部通道目錄**（例如 MPM 註冊表匯出）。將 JSON 檔案放置於以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一個或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

## Context engine 插件

Context engine 插件負責工作階段語境的匯入、組裝和壓縮編排。使用 `api.registerContextEngine(id, factory)` 從您的插件註冊它們，然後使用 `plugins.slots.contextEngine` 選擇活動引擎。

當您的插件需要替換或擴展預設的語境管線，而不僅僅是新增記憶體搜尋或掛鉤時，請使用此功能。

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

當插件需要不符合目前 API 的行為時，不要使用私有的存取方式繞過插件系統。請新增缺失的功能。

建議順序：

1. 定義核心合約
   決定核心應該擁有哪些共享行為：原則、後備、設定合併、生命週期、面向通道的語意以及執行時期輔助程式形狀。
2. 新增型別化的插件註冊/執行時期介面
   使用最小且有用的型別化功能介面擴展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. wire core + channel/feature consumers
   Channels and feature plugins should consume the new capability through core,
   not by importing a vendor implementation directly.
4. register vendor implementations
   Vendor plugins then register their backends against the capability.
5. add contract coverage
   Add tests so ownership and registration shape stay explicit over time.

This is how OpenClaw stays opinionated without becoming hardcoded to one
provider's worldview. See the [Capability Cookbook](/zh-Hant/tools/capability-cookbook)
for a concrete file checklist and worked example.

### Capability checklist

When you add a new capability, the implementation should usually touch these
surfaces together:

- core contract types in `src/<capability>/types.ts`
- core runner/runtime helper in `src/<capability>/runtime.ts`
- plugin API registration surface in `src/plugins/types.ts`
- plugin registry wiring in `src/plugins/registry.ts`
- plugin runtime exposure in `src/plugins/runtime/*` when feature/channel
  plugins need to consume it
- capture/test helpers in `src/test-utils/plugin-registration.ts`
- ownership/contract assertions in `src/plugins/contracts/registry.ts`
- operator/plugin docs in `docs/`

If one of those surfaces is missing, that is usually a sign the capability is
not fully integrated yet.

### Capability template

Minimal pattern:

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

Contract test pattern:

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

That keeps the rule simple:

- core owns the capability contract + orchestration
- vendor plugins own vendor implementations
- feature/channel plugins consume runtime helpers
- contract tests keep ownership explicit

---
summary: "Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Plugin internals"
sidebarTitle: "Internals"
---

這是 OpenClaw 外掛系統的**深度架構參考**。如需實用指南，請從下方的專屬頁面開始。

<CardGroup cols={2}>
  <Card title="Install and use plugins" icon="plug" href="/zh-Hant/tools/plugin">
    新增、啟用及疑難排解外掛的終端使用者指南。
  </Card>
  <Card title="Building plugins" icon="rocket" href="/zh-Hant/plugins/building-plugins">
    使用最小可運作清單的第一個外掛教學。
  </Card>
  <Card title="Channel plugins" icon="comments" href="/zh-Hant/plugins/sdk-channel-plugins">
    建立訊息頻道外掛。
  </Card>
  <Card title="Provider plugins" icon="microchip" href="/zh-Hant/plugins/sdk-provider-plugins">
    建立模型提供者外掛。
  </Card>
  <Card title="SDK overview" icon="book" href="/zh-Hant/plugins/sdk-overview">
    匯入映射與註冊 API 參考。
  </Card>
</CardGroup>

## 公開功能模型

功能是 OpenClaw 內部的公開**原生外掛**模型。每個原生 OpenClaw 外掛都會向一或多種功能類型註冊：

| 功能            | 註冊方法                                         | 範例外掛                             |
| --------------- | ------------------------------------------------ | ------------------------------------ |
| 文字推理        | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理後端    | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 嵌入            | `api.registerEmbeddingProvider(...)`             | 供應商擁有的向量外掛程式             |
| 語音            | `api.registerSpeechProvider(...)`                | `elevenlabs`，`microsoft`            |
| 即時轉錄        | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 即時語音        | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)`    | `openai`，`google`                   |
| 會議記錄來源    | `api.registerMeetingNotesSourceProvider(...)`    | `discord`，`meeting-notes`           |
| 圖像生成        | `api.registerImageGenerationProvider(...)`       | `openai`，`google`，`fal`，`minimax` |
| 音樂生成        | `api.registerMusicGenerationProvider(...)`       | `google`，`minimax`                  |
| 影片生成        | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 網頁擷取        | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 網頁搜尋        | `api.registerWebSearchProvider(...)`             | `google`                             |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                       | `msteams`，`matrix`                  |
| 閘道探索        | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>註冊零項功能但提供 Hook、工具、探索服務或背景服務的外掛程式是 **僅限傳統 Hook** 的外掛程式。該模式仍完全受支援。</Note>

### 外部相容性立場

功能模型已落地於核心，並由內建/原生外掛程式使用，但外部外掛程式相容性仍需比「只要已匯出，即已凍結」更嚴格的標準。

| 外掛程式情況               | 指導原則                                                                   |
| -------------------------- | -------------------------------------------------------------------------- |
| 現有外部外掛程式           | 讓基於 Hook 的整合繼續運作；這是相容性基準。                               |
| 新的內建/原生外掛程式      | 優先使用明確的功能註冊，而非供應商特定的深入存取或新的僅限 Hook 設計。     |
| 採用功能註冊的外部外掛程式 | 允許使用，但除非文件標記為穩定，否則請將特定功能的輔助介面視為持續演進中。 |

功能註冊是預期的方向。在過渡期間，舊版掛鉤仍是外部外掛最安全的不中斷路徑。匯出的輔助子路徑並非完全同等——比起附帶的輔助匯出，優先選擇狹義且記載於文件的合約。

### 外掛形態

OpenClaw 根據每個已載入外掛的實際註冊行為（而不僅是靜態中繼資料）將其歸類為一種形態：

<AccordionGroup>
  <Accordion title="plain-capability">註冊剛好一種功能類型（例如僅提供者的外掛，如 `mistral`）。</Accordion>
  <Accordion title="hybrid-capability">註冊多種功能類型（例如 `openai` 擁有文字推論、語音、媒體理解和影像生成）。</Accordion>
  <Accordion title="hook-only">僅註冊掛鉤（型別或自訂），不包含功能、工具、指令或服務。</Accordion>
  <Accordion title="non-capability">註冊工具、指令、服務或路由，但不包含功能。</Accordion>
</AccordionGroup>

使用 `openclaw plugins inspect <id>` 查看外掛的形態和功能細分。詳情請參閱 [CLI 參考資料](/zh-Hant/cli/plugins#inspect)。

### 舊版掛鉤

`before_agent_start` 掛鉤仍受支援，作為僅掛鉤外掛的相容性路徑。現實世界中的舊版外掛仍然依賴它。

方向：

- 維持其運作
- 將其記載為舊版
- 針對模型/提供者覆寫工作，優先使用 `before_model_resolve`
- 針對提示詞變異工作，優先使用 `before_prompt_build`
- 僅在實際使用率下降且測試覆蓋率證明移轉安全後才移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，可能會看到以下其中一個標籤：

| 訊號           | 含義                                              |
| -------------- | ------------------------------------------------- |
| **組態有效**   | 組態解析正常且外掛已解析                          |
| **相容性建議** | 外掛使用受支援但較舊的模式（例如 `hook-only`）    |
| **舊版警告**   | 外掛程式使用了 `before_agent_start`，該功能已棄用 |
| **嚴重錯誤**   | 配置無效或外掛程式載入失敗                        |

`hook-only` 或 `before_agent_start` 目前都不會導致您的外掛程式中斷：`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概觀

OpenClaw 的外掛程式系統包含四個層級：

<Steps>
  <Step title="資訊清單 + 探索">OpenClaw 會從已設定的路徑、工作區根目錄、全域外掛程式根目錄以及隨附的外掛程式中尋找候選外掛程式。探索程序會先讀取原生 `openclaw.plugin.json` 資訊清單以及支援的套件資訊清單。</Step>
  <Step title="啟用 + 驗證">核心會決定已探索到的外掛程式是已啟用、已停用、已封鎖，還是被選取用於記憶體等獨佔插槽。</Step>
  <Step title="執行階段載入">原生 OpenClaw 外掛程式會在處理程序內載入，並將功能註冊到中央註冊表中。打包的 JavaScript 透過原生 `require` 載入；第三方本機原始碼 TypeScript 是緊急 Jiti 後援方案。相容的套件會正規化為註冊表記錄，而不匯入執行階段程式碼。</Step>
  <Step title="介面消耗">OpenClaw 的其餘部分會讀取註冊表，以公開工具、通道、提供者設定、Hook、HTTP 路由、CLI 指令和服務。</Step>
</Steps>

具體來說，對於外掛程式 CLI，根指令探索分為兩個階段：

- 解析時期的元資料來自 `registerCli(..., { descriptors: [...] })`
- 實際的外掛程式 CLI 模組可以保持延遲載入，並在第一次叫用時註冊

這樣能讓外掛程式擁有的 CLI 程式碼保留在外掛程式內，同時仍讓 OpenClaw 在解析前保留根指令名稱。

重要的設計邊界：

- 資訊清單/配置驗證應該能透過 **資訊清單/結構描述元資料** 運作，而無需執行外掛程式程式碼
- 原生功能發現可能會載入受信任的外掛程式進入點程式碼，以建立非啟用的註冊表快照
- 原生執行時期行為來自外掛程式模組的 `register(api)` 路徑，並帶有 `api.registrationMode === "full"`

這種分離讓 OpenClaw 能在完整執行時期啟動之前驗證組態、解釋遺失/已停用的外掛程式，並建立 UI/綱要提示。

### 外掛程式元資料快照與查找表

Gateway 啟動時會為目前的組態快照建立一個 `PluginMetadataSnapshot`。該快照僅包含元資料：它儲存已安裝的外掛程式索引、資訊清單註冊表、資訊清單診斷、擁有者對應、外掛程式 ID 正規化器，以及資訊清單記錄。它不會保存已載入的外掛程式模組、提供者 SDK、套件內容或執行時期匯出項目。

感知外掛程式的組態驗證、啟動時自動啟用，以及 Gateway 外掛程式啟動程序會使用該快照，而不是獨立重建資訊清單/索引元資料。`PluginLookUpTable` 衍生自同一個快照，並針對目前的執行時期組態新增啟動外掛程式計畫。

啟動後，Gateway 會將目前的元資料快照保持為可替換的執行時期產品。重複的執行時期提供者發現可以借用該快照，而不必為每次提供者目錄傳遞重建已安裝的索引和資訊清單註冊表。當 Gateway 關閉、組態/外掛程式庫存變更以及已安裝索引寫入時，該快照會被清除或替換；當不存在相容的目前快照時，呼叫者會回退到冷資訊清單/索引路徑。相容性檢查必須包含外掛程式發現根目錄（例如 `plugins.load.paths` 和預設的代理程式工作區），因為工作區外掛程式是元資料範圍的一部分。

該快照和查找表讓重複的啟動決策保持在快速路徑上：

- 通道擁有權
- 延遲通道啟動
- 啟動外掛程式 ID
- 提供者和 CLI 後端擁有權
- 設定提供者、命令別名、模型目錄提供者和資訊清單合約擁有權
- 外掛程式組態綱要和通道組態綱要驗證
- 啟動自動啟用決策

安全邊界是快照替換，而非變更。當配置、外掛清單、安裝記錄或持久化索引策略變更時，請重建快照。切勿將其視為廣泛的可變全域註冊表，也請勿保留無限的歷史快照。執行時期外掛載入與中繼資料快照保持分離，以免過時的執行時期狀態被隱藏在快取中。

快取規則記載於 [Plugin architecture internals](/zh-Hant/plugins/architecture-internals#plugin-cache-boundary)：除非呼叫者持有當前流程的明確快照、查詢表或清單註冊表，否則清單和探索中繼資料皆為最新。隱藏的中繼資料快取和即時 TTL 並非外掛載入的一部分。只有執行時期載入器、模組和依賴構件快取可在程式碼或已安裝構件實際載入後繼續存在。

某些冷路徑呼叫者仍直接從持久化的已安裝外掛索引重建清單註冊表，而不是接收 Gateway `PluginLookUpTable`。該路徑現在會按需重建註冊表；當呼叫者已經擁有當前查詢表或明確的清單註冊表時，建議優先透過執行時期流程傳遞。

### 啟用規劃

啟用規劃是控制平面的一部分。在載入更廣泛的執行時期註冊表之前，呼叫者可以詢問哪些外掛與具體指令、提供者、通道、路由、代理程式工具或功能相關。

規劃器保持與當前清單行為相容：

- `activation.*` 欄位是明確的規劃器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks 仍作為清單擁有權的後備機制
- 僅限 ID 的規劃器 API 仍向現有呼叫者開放
- 規劃 API 會回報原因標籤，以便診斷工具能區分明確提示與擁有權後備

<Warning>切勿將 `activation` 視為生命週期 hook 或 `register(...)` 的替代品。它是用於縮小載入範圍的中繼資料。當擁有權欄位已能描述關聯時，請優先使用；僅將 `activation` 用於額外的規劃器提示。</Warning>

### 頻道外掛程式與共享訊息工具

頻道外掛程式不需要為一般的聊天動作註冊個別的傳送/編輯/回應工具。OpenClaw 在核心中保留一個共享的 `message` 工具，而頻道外掛程式則擁有其後的特定於頻道的發現與執行邏輯。

目前的邊界為：

- 核心擁有共享的 `message` 工具主機、提示連線、會話/執行緒簿記，以及執行分派
- 頻道外掛程式擁有範圍動作的發現、功能發現，以及任何特定於頻道的結構描述片段
- 頻道外掛程式擁有特定於提供者的會話對話語法，例如對話 ID 如何編碼執行緒 ID 或繼承自父對話
- 頻道外掛程式透過其動作介面卡執行最終動作

對於頻道外掛程式，SDK 介面為 `ChannelMessageActionAdapter.describeMessageTool(...)`。該統一的發現呼叫允許外掛程式同時傳回其可見動作、功能和結構描述貢獻，以防止這些部分出現不一致。

當特定於頻道的訊息工具參數包含媒體來源（例如本機路徑或遠端媒體 URL）時，外掛程式還應從 `describeMessageTool(...)` 傳回 `mediaSourceParams`。核心使用該明確清單來套用沙箱路徑正規化和傳出媒體存取提示，而無需將外掛程式擁有的參數名稱硬編碼。在那裡偏好使用動作範圍的映射，而不是單個頻道範圍的扁平清單，以便僅用於個人資料的媒體參數不會在無關的動作（如 `send`）上被正規化。

核心將執行時範圍傳遞到該發現步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的傳入 `requesterSenderId`

這對於上下文敏感的外掛程式很重要。頻道可以根據啟用的帳戶、目前的房間/執行緒/訊息或受信任的請求者身分來隱藏或公開訊息動作，而無需在核心的 `message` 工具中硬編碼特定於頻道的分支。

這就是為什麼 embedded-runner 路由更改仍是插件工作的原因：runner 負責將當前聊天/會話身分轉發到插件發現邊界，以便共享的 `message` 工具能為當前輪次暴露正確的通道擁有表面。

對於通道擁有的執行輔助程式，打包插件應將執行時保留在其自己的擴充模組中。核心不再擁有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 訊息動作執行時。我們不會發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，打包插件應直接從其擁有擴充功能的模組匯入自己的本機執行時代碼。

同樣的邊界也適用於一般的提供者命名 SDK 縫隙：核心不應匯入 Slack、Discord、Signal、WhatsApp 或類似擴充功能的通道特定便捷匯出檔。如果核心需要某種行為，請使用打包插件自己的 `api.ts` / `runtime-api.ts` 匯出檔，或者將該需求提升為共享 SDK 中狹窄的通用功能。

打包插件遵循相同的規則。打包插件的 `runtime-api.ts` 不應重新匯出自己品牌的 `openclaw/plugin-sdk/<plugin-id>` 外觀。這些品牌外觀保留為外部插件和舊版使用者的相容性填充層，但打包插件應使用本機匯出加上狹窄的通用 SDK 子路徑，例如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress`。新代碼不應添加特定於插件 ID 的 SDK 外觀，除非現有外部生態系統的相容性邊界需要。

具體針對投票，有兩條執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的通道的共享基準
- `actions.handleAction("poll")` 是通道特定投票語義或額外投票參數的首選路徑

核心現在會延遲共享投票解析，直到插件投票調度拒絕該動作之後，這樣插件擁有的投票處理程式就可以接受通道特定的投票欄位，而不會先被通用投票解析器阻擋。

請參閱 [Plugin architecture internals](/zh-Hant/plugins/architecture-internals) 以了解完整的啟動順序。

## 功能擁有權模型

OpenClaw 將原生外掛視為**公司**或**功能**的擁有權邊界，而非雜亂無章的整合集合。

這意味著：

- 公司外掛通常應擁有該公司所有面向 OpenClaw 的介面
- 功能外掛通常應擁有其引入的完整功能介面
- 通道應使用共享的核心功能，而非臨時重新實現提供者行為

<AccordionGroup>
  <Accordion title="供應商多功能">`openai` 擁有文字推論、語音、即時語音、媒體理解和圖像生成。 `google` 擁有文字推論以及媒體理解、圖像生成和網路搜尋。 `qwen` 擁有文字推論以及媒體理解和影片生成。</Accordion>
  <Accordion title="供應商單一功能">`elevenlabs` 和 `microsoft` 擁有語音； `firecrawl` 擁有網路擷取； `minimax` / `mistral` / `moonshot` / `zai` 擁有媒體理解後端。</Accordion>
  <Accordion title="功能外掛">`voice-call` 擁有通話傳輸、工具、CLI、路由和 Twilio 媒體串流橋接，但使用共享的語音、即時轉錄和即時語音功能，而非直接匯入供應商外掛。</Accordion>
</AccordionGroup>

預期的最終狀態是：

- OpenAI 駐留在一個外掛中，即使它涵蓋了文字模型、語音、圖像和未來的影片
- 其他供應商可以對其自己的功能範圍執行相同的操作
- 通道不在乎哪個供應商外掛擁有該提供者；它們使用核心公開的共享功能合約

這是關鍵區別：

- **外掛** = 擁有權邊界
- **功能** = 多個外掛可以實現或使用的核心合約

因此，如果 OpenClaw 新增一個領域（例如影片），第一個問題不是「哪個供應商應該將影片處理邏輯硬編碼？」。第一個問題是「核心影片能力合約是什麼？」。一旦該合約存在，供應商插件便可以註冊該合約，而通道/功能插件則可以使用它。

如果該能力尚未存在，通常正確的做法是：

<Steps>
  <Step title="定義能力">在核心中定義缺失的能力。</Step>
  <Step title="透過 SDK 公開">透過插件 API/執行時以型別化的方式公開它。</Step>
  <Step title="連接消費者">將通道/功能針對該能力進行連接。</Step>
  <Step title="供應商實作">讓供應商插件註冊實作。</Step>
</Steps>

這使所有權保持明確，同時避免依賴單一供應商或特定於插件的一次性程式碼路徑的核心行為。

### 能力分層

在決定程式碼歸屬時，請使用此心智模型：

<Tabs>
  <Tab title="核心能力層">共享的協調、策略、後備、配置合併規則、交付語意以及型別化合約。</Tab>
  <Tab title="供應商插件層">供應商特定的 API、驗證、模型目錄、語音合成、影像生成、未來的影片後端、使用量端點。</Tab>
  <Tab title="通道/功能插件層">Slack/Discord/語音通話/等整合，其消耗核心能力並將其呈現在介面上。</Tab>
</Tabs>

例如，TTS 遵循此形狀：

- core 擁有回覆時刻 TTS 策略、後備順序、偏好設定以及通道交付
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消耗電話 TTS 執行時輔助程式

未來的能力應優先採用相同的模式。

### 多能力公司插件範例

企業外掛程式從外部來看應該感覺是渾然一體的。如果 OpenClaw 對於模型、語音、即時轉錄、即時語音、媒體理解、圖像生成、影片生成、網頁擷取和網頁搜尋都有共享合約，供應商就可以在一個地方擁有所有的介面：

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

重要的不是確切的輔助函式名稱。重要的是結構：

- 一個外掛程式擁有供應商介面
- 核心仍然擁有功能合約
- 通道和功能外掛程式使用 `api.runtime.*` 輔助函式，而非供應商程式碼
- 合約測試可以斷言外掛程式註冊了其聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已經將影像/音訊/影片理解視為一個共享功能。同樣的所有權模型也適用於此：

<Steps>
  <Step title="核心定義合約">核心定義媒體理解合約。</Step>
  <Step title="供應商外掛程式註冊">供應商外掛程式視情況註冊 `describeImage`、`transcribeAudio` 和 `describeVideo`。</Step>
  <Step title="消費者使用共享行為">通道和功能外掛程式使用共享的核心行為，而不是直接連線到供應商程式碼。</Step>
</Steps>

這樣可以避免將某個供應商的影片假設硬編碼到核心中。外掛程式擁有供應商介面；核心擁有功能合約和後備行為。

影片生成已經使用了相同的序列：核心擁有類型化的功能合約和執行時輔助函式，供應商外掛程式針對它註冊 `api.registerVideoGenerationProvider(...)` 實作。

需要具體的推出檢查清單？請參閱 [功能食譜](/zh-Hant/tools/capability-cookbook)。

## 合約與執行

外掛程式 API 介面是有意設定為類型化並集中在 `OpenClawPluginApi` 中。該合約定義了支援的註冊點以及外掛程式可能依賴的執行時輔助函式。

為何這很重要：

- 外掛程式作者獲得一個穩定的內部標準
- 核心可以拒絕重複的所有權，例如兩個外掛程式註冊相同的供應商 ID
- 啟動時可以針對格式錯誤的註冊提供可操作的診斷資訊
- 合約測試可以強制執行套件外掛程式的擁有權，並防止無聲偏移

有兩層強制執行機制：

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">外掛程式註冊表會在外掛程式載入時驗證註冊。例如：重複的提供者 ID、重複的語音提供者 ID，以及格式錯誤的註冊會產生外掛程式診斷資訊，而不是未定義的行為。</Accordion>
  <Accordion title="Contract tests">套件外掛程式會在測試執行期間被擷取到合約註冊表中，以便 OpenClaw 能明確宣告擁有權。目前這用於模型提供者、語音提供者、網路搜尋提供者，以及套件註冊擁有權。</Accordion>
</AccordionGroup>

實際效果是 OpenClaw 能預先知道哪個外掛程式擁有哪個介面。這讓核心和通道能無縫組合，因為擁有權是被宣告、具類型且可測試的，而不是隱含的。

### 合約中應包含什麼

<Tabs>
  <Tab title="Good contracts">
    - 具類型
    - 小型
    - 特定於功能
    - 由核心擁有
    - 可由多個外掛程式重複使用
    - 可由通道/功能在無廠商知識的情況下使用

  </Tab>
  <Tab title="Bad contracts">
    - 隱藏在核心中的特定廠商原則
    - 繞過註冊表的一次性外掛程式應急手段
    - 直接存取廠商實作的通道程式碼
    - 不屬於 `OpenClawPluginApi` 或 `api.runtime` 一部分的特定執行階段物件

  </Tab>
</Tabs>

如果有疑問，請提高抽象層級：先定義功能，然後讓外掛程式插入其中。

## 執行模型

原生 OpenClaw 外掛程式與閘道 **在行程內 (in-process)** 執行。它們未被沙箱化。已載入的原生外掛程式具有與核心程式碼相同的行程層級信任邊界。

<Warning>原生外掛程式影響：外掛程式可以註冊工具、網路處理程式、掛勾和服務；外掛程式錯誤可能導致閘道當機或不穩定；且惡意的原生外掛程式等同於在 OpenClaw 行程內執行任意程式碼。</Warning>

相容的套件預設較為安全，因為 OpenClaw 目前將其視為中繼資料/內容套件。在目前的版本中，這主要指套件的技能。

對於非套件的外掛，使用允許清單及明確的安裝/載入路徑。將工作區外掛視為開發時期的程式碼，而非生產環境預設值。

對於套件的工作區套件名稱，請將外掛 ID 預設錨定在 npm 名稱：`@openclaw/<id>`，或當該套件刻意公開較狹隘的外掛角色時，使用已核准的類型字尾，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

<Note>**信任提示：** `plugins.allow` 信任的是**外掛 ID**，而非來源出處。當具有與套件外掛相同 ID 的工作區外掛被啟用/列入允許清單時，會刻意覆蓋套件的副本。這是正常且有助於本地開發、修補測試及熱修復的行為。套件外掛的信任是從來源快照解析的——即載入時磁碟上的清單與程式碼——而非安裝中繼資料。損壞或被替換的安裝記錄無法在靜默狀態下，將套件外掛的信任範圍擴大至實際來源聲稱的範圍之外。</Note>

## 匯出邊界

OpenClaw 匯出的是能力，而非實作便利性。

保持能力註冊為公開。修剪非合約的輔助匯出：

- 套件外掛專屬的輔助子路徑
- 非意圖作為公開 API 的執行期管道子路徑
- 供應商特定的便利輔助程式
- 屬於實作細節的設置/入門輔助程式

保留的套件外掛輔助子路徑已從產生的 SDK 匯出對應表中移除。請將擁有者特定的輔助程式保留在所屬的外掛套件內；僅將可重複使用的主機行為提升為通用的 SDK 合約，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

## 內部與參考

如需了解載入管線、登錄模型、提供者執行階段掛鉤、Gateway HTTP 路由、訊息工具架構、通道目標解析、提供者目錄、內容引擎外掛，以及新增功能的指南，請參閱 [外掛架構內部機制](/zh-Hant/plugins/architecture-internals)。

## 相關內容

- [建置外掛](/zh-Hant/plugins/building-plugins)
- [外掛資訊清單](/zh-Hant/plugins/manifest)
- [外掛 SDK 設定](/zh-Hant/plugins/sdk-setup)

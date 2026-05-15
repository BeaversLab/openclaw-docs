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

| 功能         | 註冊方法                                         | 範例外掛                             |
| ------------ | ------------------------------------------------ | ------------------------------------ |
| 文字推理     | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理後端 | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 語音         | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 即時轉錄     | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 即時語音     | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒體理解     | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 影像生成     | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音樂生成     | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 影片生成     | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 網頁擷取     | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 網路搜尋     | `api.registerWebSearchProvider(...)`             | `google`                             |
| 頻道 / 傳訊  | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| 閘道探索     | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>若外掛程式未註冊任何功能，但提供 Hook、工具、探索服務或背景服務，則屬於**僅舊版 Hook**外掛程式。該模式仍完全受到支援。</Note>

### 外部相容性立場

功能模型已在核心中落地，並目前由內建/原生外掛程式使用，但外部外掛程式的相容性仍需要比「只要匯出即凍結」更嚴格的標準。

| 外掛程式情況               | 指引                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| 現有的外部外掛程式         | 保持基於 Hook 的整合正常運作；這是相容性的基準線。                           |
| 新的內建/原生外掛程式      | 優先使用明確的功能註冊，而非供應商特定的存取方式或新的僅 Hook 設計。         |
| 採用功能註冊的外部外掛程式 | 允許使用，但除非文件將其標記為穩定，否則應將功能特定的輔助介面視為可能變更。 |

功能註冊是預期的方向。在過渡期間，舊版 Hook 仍是外部外掛程式最安全的無中斷路徑。匯出的輔助子路徑並非都相同 — 優先使用狹義的記載合約，而非附帶的輔助匯出。

### 外掛程式形狀

OpenClaw 會根據每個已載入外掛的實際註冊行為（而不僅僅是靜態元數據）將其歸類為一種形狀：

<AccordionGroup>
  <Accordion title="plain-capability">恰好註冊一種能力類型（例如僅提供者的外掛，如 `mistral`）。</Accordion>
  <Accordion title="hybrid-capability">註冊多種能力類型（例如 `openai` 擁有文字推理、語音、媒體理解和圖像生成能力）。</Accordion>
  <Accordion title="hook-only">僅註冊 Hooks（型別化或自定義），不包含能力、工具、指令或服務。</Accordion>
  <Accordion title="non-capability">註冊工具、指令、服務或路由，但不包含能力。</Accordion>
</AccordionGroup>

使用 `openclaw plugins inspect <id>` 檢視外掛程式的形狀和功能細分。詳情請參閱 [CLI 參考](/zh-Hant/cli/plugins#inspect)。

### 舊版 Hooks

`before_agent_start` hook 作為僅 Hook 外掛的相容路徑仍受支援。現實世界中的舊版外掛仍然依賴它。

方向：

- 保持其正常運作
- 將其記錄為舊版
- 針對模型/提供者覆寫工作，優先使用 `before_model_resolve`
- 針對提示詞修改工作，優先使用 `before_prompt_build`
- 僅在實際使用率下降且測試覆蓋率證明遷移安全後才移除

### 相容性信號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到以下標籤之一：

| 信號           | 含義                                         |
| -------------- | -------------------------------------------- |
| **配置有效**   | 配置解析正常且外掛解析成功                   |
| **相容性建議** | 外掛使用支援但較舊的模式（例如 `hook-only`） |
| **舊版警告**   | 外掛使用 `before_agent_start`，該功能已棄用  |
| **嚴重錯誤**   | 配置無效或外掛載入失敗                       |

目前 `hook-only` 或 `before_agent_start` 都不會導致您的外掛程式損壞：`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛程式系統分為四層：

<Steps>
  <Step title="資訊清單 + 探索">OpenClaw 會從設定的路徑、工作區根目錄、全域外掛程式根目錄和套件的外掛程式中尋找候選外掛程式。探索功能會先讀取原生 `openclaw.plugin.json` 資訊清單以及支援的套件資訊清單。</Step>
  <Step title="啟用 + 驗證">核心系統會決定已探索的外掛程式是啟用、停用、封鎖，還是被選取用於獨佔插槽（例如記憶體）。</Step>
  <Step title="Runtime loading">原生 OpenClaw 外掛程式會在程序內載入，並將功能註冊到中央註冊表中。封裝的 JavaScript 透過原生 `require` 載入；第三方本機原始碼 TypeScript 是緊急備用的 Jiti。相容的套件會被正規化為註冊表記錄，而不會匯入執行時代碼。</Step>
  <Step title="介面消耗">OpenClaw 的其餘部分會讀取註冊表以公開工具、通道、提供者設定、勾點、HTTP 路由、CLI 指令和服務。</Step>
</Steps>

對於外掛程式 CLI，根指令探索分為兩個階段：

- 解析時期的元資料來自 `registerCli(..., { descriptors: [...] })`
- 真正的外掛程式 CLI 模組可以保持延遲載入，並在第一次呼叫時註冊

這樣可以將外掛程式擁有的 CLI 程式碼保留在外掛程式內部，同時仍讓 OpenClaw 在解析之前保留根指令名稱。

重要的設計邊界：

- 資訊清單/設定驗證應該能夠在不執行外掛程式碼的情況下，透過 **資訊清單/架構元資料** 運作
- 原生功能探索可能會載入受信任的外掛程式進入點程式碼，以建構非啟用性的註冊表快照
- 原生執行時期行為來自外掛模組的 `register(api)` 路徑，帶有 `api.registrationMode === "full"`

這種分離讓 OpenClaw 能夠在完整的執行時期啟動之前驗證設定、說明遺失/已停用的外掛，並建置 UI/Schema 提示。

### 外掛元資料快照與查找表

Gateway 啟動時會為目前的設定快照建立一個 `PluginMetadataSnapshot`。該快照僅包含元資料：它儲存已安裝的外掛索引、資訊清單註冊表、資訊清單診斷、擁有者對應、外掛 ID 正規化器和資訊清單記錄。它不保存已載入的外掛模組、提供者 SDK、套件內容或執行時期匯出。

感知外掛的設定驗證、啟動時自動啟用和 Gateway 外掛引導程序會使用該快照，而不是獨立重建資訊清單/索引元資料。`PluginLookUpTable` 衍生自同一個快照，並為目前的執行時期設定新增啟動外掛計劃。

啟動後，Gateway 會將目前的元資料快照保留為可替換的執行時期產品。重複的執行時期提供者探索可以借用該快照，而無需為每次提供者目錄傳遞重建已安裝的索引和資訊清單註冊表。在 Gateway 關閉、設定/外掛清單變更以及已安裝索引寫入時，會清除或替換該快照；當不存在相容的目前快照時，呼叫者會回退到冷資訊清單/索引路徑。相容性檢查必須包含外掛探索根目錄，例如 `plugins.load.paths` 和預設代理程式工作區，因為工作區外掛是元資料範圍的一部分。

該快照和查找表讓重複的啟動決策保持在快速路徑上：

- 通道所有權
- 延遲通道啟動
- 啟動外掛 ID
- 提供者和 CLI 後端所有權
- 設定提供者、指令別名、模型目錄提供者和清單合約所有權
- 外掛設定 Schema 和通道設定 Schema 驗證
- 啟動自動啟用決策

安全邊界是快照替換，而不是變更。當設定、外掛清單、安裝記錄或持久化索引原則變更時，請重建快照。不要將其視為廣泛的可變全域註冊表，也不要保留無限制的歷史快照。執行時期外掛載入與元資料快照保持分離，以免過期的執行時期狀態被隱藏在元資料快取之後。

快取規則記載於 [Plugin architecture internals](/zh-Hant/plugins/architecture-internals#plugin-cache-boundary)：除非呼叫端持有目前流程的明確快照、查詢表或清單註冊表，否則清單和探索元資料都是最新的。隱藏的元資料快取和牆上時鐘 TTL 不是外掛程式載入的一部分。只有在程式碼或已安裝的構件實際載入後，執行時期載入器、模組和相依性構件快取才可能持續存在。

部分冷路徑呼叫端仍然直接從持續存在的已安裝外掛程式索引重建清單註冊表，而不是接收 Gateway `PluginLookUpTable`。該路徑現在會按需重建註冊表；當呼叫端已經擁有目前的查詢表或明確的清單註冊表時，建議透過執行時期流程傳遞它們。

### 啟用規劃

啟用規劃是控制平面的一部分。呼叫端可以在載入更廣泛的執行時期註冊表之前，詢問哪些外掛程式與具體的命令、提供者、通道、路由、代理程式駕駛裝置或功能相關。

規劃器保持目前的清單行為相容：

- `activation.*` 欄位是明確的規劃器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks 仍然是清單擁有權的後備機制
- 僅限 ID 的規劃器 API 仍然可供現有呼叫端使用
- 計劃 API 會回報原因標籤，以便診斷工具能區分明確提示與擁有權後備機制

<Warning>請勿將 `activation` 視為生命週期 hook 或 `register(...)` 的替代品。它是用於縮小載入範圍的元資料。當擁有權欄位已經能描述該關係時，請優先使用它們；僅將 `activation` 用於額外的規劃器提示。</Warning>

### 通道外掛程式與共用訊息工具

通道外掛程式不需要為一般的聊天動作註冊個別的傳送/編輯/反應工具。OpenClaw 在核心中維護一個共用的 `message` 工具，而通道外掛程式擁有其背後的特定通道探索與執行邏輯。

目前的邊界是：

- core 擁有共享的 `message` 工具主機、提示詞連接、會話/執行緒記錄保存以及執行分派
- 通道外掛擁有範圍限定的動作探索、功能探索，以及任何通道特定的 Schema 片段
- 通道外掛擁有供應商特定的會話對話語法，例如對話 ID 如何編碼執行緒 ID 或繼承自父對話
- 通道外掛透過其動作配接器執行最終動作

對於通道外掛，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。該統一的探索呼叫允許外掛同時返回其可見的動作、功能和 Schema 貢獻，以便這些部分不會分離。

當通道特定的訊息工具參數攜帶媒體來源（例如本機路徑或遠端媒體 URL）時，外掛也應從 `describeMessageTool(...)` 返回 `mediaSourceParams`。Core 使用該明確列表來應用沙箱路徑正規化和傳出媒體存取提示，而無需對外掛擁有的參數名稱進行硬編碼。在那裡優先使用動作範圍的映射，而不是一個通道範圍的扁平列表，以便僅限配置檔案的媒體參數不會在像 `send` 這樣的無關動作上被正規化。

Core 將執行時範圍傳遞到該探索步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的傳入 `requesterSenderId`

這對於上下文敏感的外掛很重要。通道可以根據活動帳戶、當前房間/執行緒/訊息或受信任的請求者身份來隱藏或公開訊息動作，而無需在核心 `message` 工具中對通道特定分支進行硬編碼。

這就是為什麼嵌入式執行器路由更改仍然是外掛工作的原因：執行器負責將當前聊天/會話身份轉發到外掛探索邊界，以便共享 `message` 工具為當前回合公開正確的通道擁有表面。

對於通道擁有的執行輔助程式，捆綁外掛程式應將執行執行時保留在其自己的擴充模組中。核心不再擁有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 訊息動作執行時。我們不發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，捆綁外掛程式應直接從其擁有的擴充模組匯入自己的本機執行時程式碼。

同樣的邊界通常也適用於提供者命名的 SDK 縫合：核心不應匯入 Slack、Discord、Signal、WhatsApp 或類似擴充功能的通道特定便利匯入檔案。如果核心需要某種行為，請使用捆綁外掛程式自己的 `api.ts` / `runtime-api.ts` 匯入檔案，或者將需求提升為共享 SDK 中一個狹隘的通用功能。

捆綁外掛程式遵循相同的規則。捆綁外掛程式的 `runtime-api.ts` 不應重新匯出其自己的品牌化 `openclaw/plugin-sdk/<plugin-id>` 外觀。這些品牌化外觀仍然是外部外掛程式和舊版使用者的相容性填充層，但捆綁外掛程式應使用本機匯出加上狹隘的通用 SDK 子路徑，例如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress`。除非現有外部生態系統的相容性邊界有要求，否則新程式碼不應新增特定於外掛程式 ID 的 SDK 外觀。

具體針對投票，有兩條執行路徑：

- `outbound.sendPoll` 是適用於常見投票模型的通道的共享基準
- `actions.handleAction("poll")` 是通道特定投票語意或額外投票參數的首選路徑

核心現在會延遲共享投票解析，直到外掛程式投票調度拒絕該動作之後，因此外掛程式擁有的投票處理程式可以接受通道特定的投票欄位，而不會先被通用投票解析器阻擋。

有關完整的啟動序列，請參閱[外掛程式架構內部](/zh-Hant/plugins/architecture-internals)。

## 功能擁有權模型

OpenClaw 將原生外掛程式視為**公司**或**功能**的擁有權邊界，而不是無關整合的集合袋。

這意味著：

- 公司外掛程式通常應該擁有該公司所有面向 OpenClaw 的介面
- 功能外掛程式通常應擁有其引入的完整功能範圍
- 通道應使用共享的核心能力，而非臨時重新實現提供者行為

<AccordionGroup>
  <Accordion title="供應商多能力">`openai` 擁有文字推論、語音、即時語音、媒體理解和圖像生成。 `google` 擁有文字推論以及媒體理解、圖像生成和網路搜尋。 `qwen` 擁有文字推論以及媒體理解和影片生成。</Accordion>
  <Accordion title="供應商單一能力">`elevenlabs` 和 `microsoft` 擁有語音； `firecrawl` 擁有網路擷取； `minimax` / `mistral` / `moonshot` / `zai` 擁有媒體理解後端。</Accordion>
  <Accordion title="功能外掛程式">`voice-call` 擁有通話傳輸、工具、CLI、路由和 Twilio 媒體串流橋接，但使用共享的語音、即時轉錄和即時語音能力，而非直接匯入供應商外掛程式。</Accordion>
</AccordionGroup>

預期的最終狀態是：

- 即使 OpenAI 涵蓋文字模型、語音、圖像和未來的影片，它仍位於一個外掛程式中
- 其他供應商也可以對其自己的範圍做同樣的處理
- 通道不在乎哪個供應商外掛程式擁有該提供者；它們使用核心公開的共享能力合約

這是關鍵的區別：

- **外掛程式** = 擁有權邊界
- **能力** = 多個外掛程式可以實現或使用的核心合約

因此，如果 OpenClaw 新增一個新的領域（例如影片），第一個問題不是「哪個提供者應該硬編碼影片處理？」。第一個問題是「核心影片能力合約是什麼？」。一旦該合約存在，供應商外掛程式就可以向其註冊，通道/功能外掛程式就可以使用它。

如果該能力尚不存在，正確的做法通常是：

<Steps>
  <Step title="定義功能">在核心中定義缺失的功能。</Step>
  <Step title="透過 SDK 公開">透過外掛 API / 執行時環境以型別安全的方式公開它。</Step>
  <Step title="連線消費者">針對該功能連線通道/功能。</Step>
  <Step title="廠商實作">讓廠商外掛註冊實作。</Step>
</Steps>

這在保持權責明確的同時，避免了依賴單一廠商或一次性外掛特定程式碼路徑的核心行為。

### 功能分層

在決定程式碼所屬位置時，請使用此心智模型：

<Tabs>
  <Tab title="核心功能層">共享的編排、策略、後備、配置合併規則、傳遞語意以及型別化合約。</Tab>
  <Tab title="廠商外掛層">廠商專屬的 API、驗證、模型目錄、語音合成、影像生成、未來的視訊後端、使用端點。</Tab>
  <Tab title="通道/功能外掛層">消費核心功能並將其呈現在介面上的 Slack/Discord/語音通話/等整合。</Tab>
</Tabs>

例如，TTS 遵循此形式：

- core 擁有回覆時間 TTS 策略、後備順序、偏好設定以及通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消費電話語音 TTS 執行時環境輔助程式

未來的功能應優先採用相同的模式。

### 多功能公司外掛範例

從外部來看，公司外掛應該感覺是一個整體。如果 OpenClaw 對於模型、語音、即時轉錄、即時語音、媒體理解、影像生成、視訊生成、網頁擷取和網頁搜尋有共享合約，廠商可以在一個地方擁有其所有介面：

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

重要的是輔助程式的確切名稱。重要的是形式：

- 一個外掛擁有廠商介面
- core 仍然擁有功能合約
- 頻道和功能外掛使用 `api.runtime.*` 輔助程式，而非供應商程式碼
- 合約測試可以斷言外掛已註冊其聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已將圖片/音訊/影片理解視為一個共用功能。同樣的所有權模型也適用於此：

<Steps>
  <Step title="Core defines the contract">Core 定義了媒體理解合約。</Step>
  <Step title="Vendor plugins register">供應商外掛視情況註冊 `describeImage`、`transcribeAudio` 和 `describeVideo`。</Step>
  <Step title="Consumers use the shared behavior">頻道和功能外掛使用共用的 Core 行為，而不是直接連線到供應商程式碼。</Step>
</Steps>

這樣可以避免將某個供應商的影片假設硬編碼到 Core 中。外掛擁有供應商介面；Core 擁有功能合約和後備行為。

影片生成已經使用相同的序列：Core 擁有類型化的功能合約和執行時期輔助程式，而供應商外掛則針對其註冊 `api.registerVideoGenerationProvider(...)` 實作。

需要具體的推出檢查清單？請參閱 [Capability Cookbook](/zh-Hant/tools/capability-cookbook)。

## 合約與強制執行

外掛 API 介面是經過刻意型別化並集中於 `OpenClawPluginApi` 中。該合約定義了支援的註冊點以及外掛可依賴的執行時期輔助程式。

為何這很重要：

- 外掛作者獲得一個穩定的內部標準
- Core 可以拒絕重複的所有權，例如兩個外掛註冊相同的供應商 ID
- 啟動時可以針對格式錯誤的註冊提供可操作的診斷資訊
- 合約測試可以強制執行捆綁外掛的所有權，並防止無聲偏移

有兩層強制執行機制：

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">外掛程式註冊表會在外掛程式載入時驗證註冊。例如：重複的提供者 ID、重複的語音提供者 ID，以及格式錯誤的註冊會產生外掛程式診斷，而不是未定義的行為。</Accordion>
  <Accordion title="Contract tests">捆綁的外掛程式會在測試執行期間被擷取到合約註冊表中，以便 OpenClaw 可以明確斷言所有權。目前這用於模型提供者、語音提供者、網路搜尋提供者以及捆綁註冊的所有權。</Accordion>
</AccordionGroup>

實際的效果是，OpenClaw 能夠事先知道哪個外掛程式擁有哪個介面。這讓核心和通道能夠無縫組合，因為所有權是被宣告、型別化且可測試的，而不是隱含的。

### 什麼屬於合約

<Tabs>
  <Tab title="Good contracts">
    - 具有型別
    - 小型
    - 特定於功能
    - 由核心擁有
    - 可被多個外掛程式重複使用
    - 可被通道/功能消耗而無需供應商知識

  </Tab>
  <Tab title="Bad contracts">
    - 隱藏在核心中的供應商特定政策
    - 繞過註冊表的一次性外掛程式應急手段
    - 直接深入供應商實作的通道程式碼
    - 不屬於 `OpenClawPluginApi` 或 `api.runtime` 的臨時執行階段物件

  </Tab>
</Tabs>

如果有疑問，請提高抽象層級：先定義功能，然後再讓外掛程式插入其中。

## 執行模型

原生 OpenClaw 外掛程式與閘道 **同進程 (in-process)** 執行。它們未受到沙盒機制保護。已載入的原生外掛程式具有與核心程式碼相同的進程層級信任邊界。

<Warning>原生外掛程式影響：外掛程式可以註冊工具、網路處理程式、鉤子和服務；外掛程式錯誤可能會導致閘道當機或不穩定；惡意的原生外掛程式相當於在 OpenClaw 進程內執行任意程式碼。</Warning>

相容的套件組合預設情況下更安全，因為 OpenClaw 目前將其視為元資料/內容套件。在目前的版本中，這主要是指捆綁的技能。

對於非捆綁的插件，請使用允許清單和明確的安裝/載入路徑。將工作區插件視為開發時期的程式碼，而非生產環境預設值。

對於捆綁的工作區套件名稱，預設情況下將插件 ID 錨定在 npm 名稱中：`@openclaw/<id>`；或者當該套件故意公開較窄的插件角色時，使用核准的型別後綴，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

<Note>**信任提示：** `plugins.allow` 信任的是**插件 ID**，而非來源出處。當啟用或加入允許清單時，擁有與捆綁插件相同 ID 的工作區插件會故意遮蔽（shadow）該捆綁副本。這對於本機開發、修補程式測試和熱修復是正常且有用的。捆綁插件的信任是從來源快照解析的——即載入時磁碟上的清單和程式碼——而非來自安裝元資料。損壞或替換的安裝記錄無法在不被察覺的情況下，將捆綁插件的信任範圍擴大到超出實際來源聲明的範圍。</Note>

## 匯出邊界

OpenClaw 匯出的是功能，而非實作上的便利性。

保持功能註冊為公開。修剪非契約性的輔助匯出：

- 特定於捆綁插件的輔助子路徑
- 不打算作為公開 API 的執行時期基礎設施子路徑
- 特定供應商的便利輔助函式
- 屬於實作細節的設定/入門輔助函式

保留的捆綁插件輔助子路徑已從產生的 SDK 匯出對應表中移除。請將特定擁有者的輔助函式保留在所屬的插件套件內；僅將可重複使用的 Host 行為提升為通用 SDK 契約，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

## 內部機制與參考

關於載入管線、註冊表模型、提供者執行時期勾點、Gateway HTTP 路由、訊息工具架構、通道目標解析、提供者目錄、語境引擎插件，以及新增功能的指南，請參閱[插件架構內部機制](/zh-Hant/plugins/architecture-internals)。

## 相關內容

- [建置插件](/zh-Hant/plugins/building-plugins)
- [外掛程式清單](/zh-Hant/plugins/manifest)
- [外掛程式 SDK 設定](/zh-Hant/plugins/sdk-setup)

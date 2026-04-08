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

<Info>這是**深度架構參考文件**。如需實用指南，請參閱： - [安裝與使用外掛](/en/tools/plugin) — 使用者指南 - [入門指南](/en/plugins/building-plugins) — 第一個外掛教學 - [頻道外掛](/en/plugins/sdk-channel-plugins) — 建構訊息頻道 - [提供者外掛](/en/plugins/sdk-provider-plugins) — 建構模型提供者 - [SDK 概覽](/en/plugins/sdk-overview) — 匯入映射與註冊 API</Info>

This page covers the internal architecture of the OpenClaw plugin system.

## Public capability model

Capabilities are the public **native plugin** model inside OpenClaw. Every
native OpenClaw plugin registers against one or more capability types:

| Capability     | Registration method                              | Example plugins                      |
| -------------- | ------------------------------------------------ | ------------------------------------ |
| Text inference | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| 語音           | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 即時轉錄       | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 即時語音       | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒體理解       | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 影像生成       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音樂生成       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 影片生成       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 網路擷取       | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 網路搜尋       | `api.registerWebSearchProvider(...)`             | `google`                             |
| 頻道 / 傳訊    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

註冊零個功能但提供鉤子、工具或服務的外掛，屬於**僅限傳統鉤子** 的外掛。該模式仍完全受支援。

### 外部相容性立場

功能模型已於核心程式碼落成，目前內建/原生外掛正在使用，但外部外掛的相容性仍需比「只要匯出即視為凍結」更高的門檻。

目前指引：

- **既有外部外掛：** 維持基於鉤子的整合運作；將此視為相容性基準
- **新的打包/原生外掛程式：** 優先使用明確的功能註冊，而非
  廠商特定的深入存取或僅限 hook 的新設計
- **採用功能註冊的外部外掛程式：** 允許，但請將
  特定功能的輔助介面視為不斷演進的，除非文件明確將
  合約標記為穩定

實用規則：

- 功能註冊 API 是預期的發展方向
- 舊版 hooks 仍然是過渡期間外部外掛程式最安全的不中斷路徑
- 匯出的輔助子路徑並非完全平等；優先使用狹窄且已記載的
  合約，而非附帶的輔助匯出

### 外掛程式類型

OpenClaw 根據每個已載入外掛程式的實際
註冊行為（而不僅僅是靜態元資料）將其分類為一種類型：

- **純功能 (plain-capability)** -- 僅註冊一種功能類型（例如僅提供者的外掛程式，如 `mistral`）
- **混合功能 (hybrid-capability)** -- 註冊多種功能類型（例如
  `openai` 擁有文字推論、語音、媒體理解和圖像
  生成）
- **僅 hook (hook-only)** -- 僅註冊 hooks（類型化或自訂），不註冊功能、
  工具、指令或服務
- **非功能 (non-capability)** -- 註冊工具、指令、服務或路由，但不註冊
  功能

使用 `openclaw plugins inspect <id>` 查看外掛程式的類型和功能
細分。詳情請參閱 [CLI 參考資料](/en/cli/plugins#inspect)。

### 舊版 hooks

`before_agent_start` hook 仍受支援，作為僅 hook 外掛程式的相容路徑。
現實中的舊版外掛程式仍然依賴它。

方向：

- 保持其正常運作
- 將其記載為舊版
- 模型/提供者覆寫作業優先使用 `before_model_resolve`
- 提示變異作業優先使用 `before_prompt_build`
- 僅在實際使用量下降且測試覆蓋率證明移轉安全後移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到
其中一個標籤：

| 訊號           | 含義                                             |
| -------------- | ------------------------------------------------ |
| **設定有效**   | 設定解析成功且外掛程式已解析                     |
| **相容性建議** | 外掛程式使用支援但較舊的模式（例如 `hook-only`） |
| **舊版警告**   | 外掛程式使用已棄用的 `before_agent_start`        |
| **嚴重錯誤**   | 配置無效或外掛程式載入失敗                       |

`hook-only` 和 `before_agent_start` 目前都不會導致您的外掛程式中斷 --
`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些
信號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛程式系統分為四層：

1. **清單 + 探索**
   OpenClaw 從配置的路徑、工作區根目錄、
   全域擴充功能根目錄以及內建的擴充功能中尋找候選外掛程式。探索首先會讀取原生
   `openclaw.plugin.json` 清單以及支援的套件清單。
2. **啟用 + 驗證**
   Core 決定探索到的外掛程式是啟用、停用、被封鎖，還是
   被選入獨佔插槽（例如記憶體插槽）。
3. **執行時期載入**
   原生 OpenClaw 外掛程式透過 jiti 載入至程序內，並將
   功能註冊到中央註冊表中。相容的套件會被正規化為
   註冊表記錄，而不會匯入執行時期程式碼。
4. **介面消耗**
   OpenClaw 的其餘部分會讀取註冊表以公開工具、頻道、提供者
   設定、Hook、HTTP 路由、CLI 指令和服務。

特別針對外掛程式 CLI，根指令的探索分為兩個階段：

- 解析時期的元資料來自 `registerCli(..., { descriptors: [...] })`
- 實際的外掛程式 CLI 模組可以保持延遲載入，並在首次呼叫時註冊

這使外掛程式擁有的 CLI 程式碼保持在外掛程式內部，同時仍允許 OpenClaw
在解析之前保留根指令名稱。

重要的設計邊界：

- 探索 + 配置驗證應僅透過 **清單/架構元資料** 運作，
  而不執行外掛程式碼
- 原生執行時期行為來自外掛程式模組的 `register(api)` 路徑

這種區分讓 OpenClaw 能在完整執行時期啟動之前驗證配置、解釋遺失/停用的外掛程式，並
建置 UI/架構提示。

### 頻道外掛程式與共享訊息工具

頻道外掛程式不需要為正常的聊天動作註冊個別的傳送/編輯/反應工具。
OpenClaw 在核心中保留一個共享的 `message` 工具，而
頻道外掛程式則擁有其後特定於頻道的探索與執行邏輯。

目前的邊界是：

- core 擁有共享的 `message` tool host、prompt wiring、session/thread
  bookkeeping，以及 execution dispatch
- channel plugins 擁有範圍限定的 action discovery、capability discovery，以及任何
  channel-specific schema fragments
- channel plugins 擁有 provider-specific session conversation grammar，例如
  conversation ids 如何編碼 thread ids 或繼承自 parent conversations
- channel plugins 透過其 action adapter 執行最終的 action

對於 channel plugins，SDK surface 是
`ChannelMessageActionAdapter.describeMessageTool(...)`。該統一的 discovery
呼叫讓 plugin 能一起回傳其可見的 actions、capabilities 和 schema
貢獻，使這些部分不會分離。

Core 將 runtime scope 傳入該 discovery 步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- trusted inbound `requesterSenderId`

這對於 context-sensitive plugins 很重要。Channel 可以根據 active account、current room/thread/message，或
trusted requester identity 來隱藏或顯示
message actions，而不需在 core `message` tool 中
硬編碼 channel-specific branches。

這就是為什麼 embedded-runner routing 變更仍然是 plugin 工作的原因：runner 負責
將目前的 chat/session identity 轉發到 plugin discovery 邊界，以便共享的 `message` tool
針對目前回合顯示正確的 channel-owned surface。

對於 channel-owned execution helpers，bundled plugins 應將 execution
runtime 保留在其自己的 extension modules 內。Core 不再擁有 `src/agents/tools` 下的 Discord、
Slack、Telegram 或 WhatsApp message-action runtimes。
我們不發佈單獨的 `plugin-sdk/*-action-runtime` subpaths，且 bundled
plugins 應直接從其 extension-owned modules 匯入自己的 local runtime code。

同樣的邊界通常適用於提供者命名的 SDK 接縫：核心不應導入特定於通道的便利匯入檔案（barrel），例如針對 Slack、Discord、Signal、WhatsApp 或類似擴充功能的匯入檔案。如果核心需要某種行為，請使用捆綁插件自己的 `api.ts` / `runtime-api.ts` 匯入檔案，或將需求提升為共享 SDK 中的一個狹窄的通用能力。

特別是對於投票，有兩種執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的通道的共享基線
- `actions.handleAction("poll")` 是用於特定於通道的投票語義或額外投票參數的首選路徑

核心現在會延遲共享投票解析，直到插件投票分派拒絕該操作之後，因此插件擁有的投票處理程序可以接受特定於通道的投票欄位，而不會先被通用投票解析器阻擋。

有關完整的啟動順序，請參閱 [載入管線](#load-pipeline)。

## 能力所有權模型

OpenClaw 將原生插件視為**公司**或**功能**的所有權邊界，而不是不相關整合的隨意集合。

這意味著：

- 公司插件通常應擁有該公司所有面向 OpenClaw 的介面
- 功能插件通常應擁有其引入的完整功能介面
- 通道應使用共享的核心能力，而不是臨時重新實施提供者行為

範例：

- 內建的 `openai` 插件擁有 OpenAI 模型提供者行為，以及 OpenAI 語音 + 即時語音 + 媒體理解 + 圖像生成行為
- 內建的 `elevenlabs` 插件擁有 ElevenLabs 語音行為
- 內建的 `microsoft` 插件擁有 Microsoft 語音行為
- 內建的 `google` 插件擁有 Google 模型提供者行為以及 Google 媒體理解 + 圖像生成 + 網路搜尋行為
- 內建的 `firecrawl` 插件擁有 Firecrawl 網路擷取行為
- 內建的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件擁有其媒體理解後端
- 捆綁的 `qwen` 外掛程式擁有 Qwen 文字提供者行為，加上媒體理解和影片生成行為
- `voice-call` 外掛程式是一個功能外掛程式：它擁有通訊傳輸、工具、CLI、路由和 Twilio 媒體串流橋接，但它使用共享語音以及即時轉錄和即時語音功能，而不是直接匯入供應商外掛程式

預期的最終狀態是：

- OpenAI 駐留在一個外掛程式中，即使它跨越文字模型、語音、圖片和未來的影片
- 另一個供應商可以為其自己的領域做同樣的事情
- 通道不在乎哪個供應商外掛程式擁有該提供者；它們使用核心公開的共享功能契約

這是關鍵區別：

- **外掛程式** = 擁有權邊界
- **功能** = 多個外掛程式可以實作或使用的核心契約

因此，如果 OpenClaw 新增一個新的領域（例如影片），第一個問題不是「哪個提供者應該硬編碼影片處理？」。第一個問題是「核心影片功能契約是什麼？」。一旦該契約存在，供應商外掛程式就可以註冊它，通道/功能外掛程式就可以使用它。

如果該功能尚不存在，正確的做法通常是：

1. 在核心中定義缺失的功能
2. 透過外掛程式 API/執行時環境以類型化的方式公開它
3. 針對該功能連接通道/功能
4. 讓供應商外掛程式註冊實作

這保持了擁有權的明確性，同時避免了依賴單一供應商或一次性外掛程式特定程式碼路徑的核心行為。

### 功能分層

在決定程式碼屬於哪裡時，請使用這種心智模型：

- **核心功能層**：共享協調、政策、後備、設定合併規則、傳遞語意和類型化契約
- **供應商外掛程式層**：供應商特定的 API、驗證、型錄、語音合成、圖像生成、未來的影片後端、使用端點
- **通道/功能外掛程式層**：Slack/Discord/語音通話/等整合，它們使用核心功能並將其呈現在介面上

例如，TTS 遵循這種形狀：

- 核心擁有回覆時間 TTS 政策、後備順序、偏好和通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 使用電話語音合成（TTS）執行時輔助程式

未來的功能應優先採用相同的模式。

### 多功能廠商外掛程式範例

廠商外掛程式在外部應該感覺是一個整體。如果 OpenClaw 擁有模型、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網路擷取和網路搜尋的共用合約，廠商可以在一個地方擁有這所有的介面：

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

重要的不是輔助程式的確切名稱。重要的是結構：

- 一個外掛程式擁有廠商介面
- 核心仍然擁有功能合約
- 通道和功能外掛程式使用 `api.runtime.*` 輔助程式，而非廠商程式碼
- 合約測試可以斷言外掛程式註冊了其聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已將影像/音訊/影片理解視為一個共用功能。相同的擁有權模型適用於此：

1. 核心定義媒體理解合約
2. 廠商外掛程式視情況註冊 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道和功能外掛程式使用共用的核心行為，而非直接連接到廠商程式碼

這避免了將一個提供商的影片假設硬編碼到核心中。外掛程式擁有廠商介面；核心擁有功能合約和後備行為。

影片生成已經使用相同的序列：核心擁有類型化的功能合約和執行時輔助程式，而廠商外掛程式針對它註冊
`api.registerVideoGenerationProvider(...)` 實作。

需要具體的推出檢查清單？請參閱
[功能操作手冊](/en/tools/capability-cookbook)。

## 合約與執行

外掛程式 API 介面特意在
`OpenClawPluginApi` 中進行了類型定義和集中化管理。該合約定義了支援的註冊點以及外掛程式可以依賴的執行時輔助程式。

為什麼這很重要：

- 外掛程式作者獲得一個穩定的內部標準
- 核心可以拒絕重複的擁有權，例如兩個外掛程式註冊相同的
  提供者 ID
- 啟動時可以針對格式錯誤的註冊提供可採取行動的診斷資訊
- 合約測試可以強制執行捆綁外掛程式的擁有權並防止靜默偏離

有兩個執行層級：

1. **執行時期註冊強制執行**
   外掛程式註冊表會在外掛程式載入時驗證註冊。例如：重複的提供者 ID、重複的語音提供者 ID 和格式錯誤的註冊會產生外掛程式診斷資訊，而不是未定義的行為。
2. **合約測試**
   在測試執行期間，捆綁的外掛程式會被擷取到合約註冊表中，以便 OpenClaw 可以明確宣告所有權。目前這用於模型提供者、語音提供者、網路搜尋提供者以及捆綁註冊所有權。

實際效果是 OpenClaw 能夠預先知道哪個外掛程式擁有哪個介面。這讓核心和通道能夠無縫組合，因為所有權是被宣告、具型別且可測試的，而不是隱式的。

### 什麼屬於合約

好的外掛程式合約應具備：

- 具型別
- 精簡
- 特定功能
- 由核心擁有
- 可被多個外掛程式重複使用
- 可由通道/功能在無需供應商知識的情況下使用

糟糕的外掛程式合約則是：

- 隱藏在核心中的供應商特定原則
- 繞過註冊表的一次性外掛程式應急方案
- 直接深入供應商實作的通道程式碼
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的特定執行時期物件

如果有疑問，請提高抽象層級：先定義功能，然後再讓外掛程式接入。

## 執行模型

原生 OpenClaw 外掛程式與閘道 **同進程 (in-process)** 執行。它們未被沙箱化。已載入的原生外掛程式具有與核心程式碼相同的進程層級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、鉤子和服務
- 原生外掛程式的錯誤可能會導致閘道當機或不穩定
- 惡意的原生外掛程式等同於在 OpenClaw 進程內執行任意程式碼

相容的捆绑包預設更安全，因為 OpenClaw 目前將其視為中繼資料/內容套件。在目前的版本中，這主要是指捆绑的技能。

對於非捆绑的外掛程式，請使用允許清單和明確的安裝/載入路徑。請將工作區外掛程式視為開發時期的程式碼，而非生產環境的預設值。

對於捆綁的 workspace 套件名稱，請將 plugin id 錨定在 npm
名稱中：預設為 `@openclaw/<id>`，或是經批准的型別後綴，例如
`-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`，當
該套件故意公開較狹窄的 plugin 角色時。

重要信任說明：

- `plugins.allow` 信任 **plugin ids**，而非來源證明。
- 當啟用/允許列表中包含與捆綁 plugin 具有相同 id 的 workspace plugin 時，該 workspace plugin 會
  故意遮蔽（shadow）捆綁的副本。
- 這是正常的，並且對於本地開發、修補測試和熱修復很有用。

## 匯出邊界

OpenClaw 匯出的是能力（capabilities），而非實作便利性。

保持能力註冊為公開。修剪非合約的輔助匯出：

- 捆綁 plugin 專用的輔助子路徑
- 非意圖作為公開 API 的執行時管道（plumbing）子路徑
- 供應商特定的便利輔助程式
- 屬於實作細節的設定/入門輔助程式

部分捆綁 plugin 的輔助子路徑仍保留在產生的 SDK 匯出
對應表中，以利相容性和捆綁 plugin 維護。目前的範例包括
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 以及數個 `plugin-sdk/matrix*` 縫隙。請將這些視為
保留的實作細節匯出，而非建議新第三方 plugin 採用的 SDK 模式。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選 plugin 根目錄
2. 讀取原生或相容的捆綁資訊清單和套件元資料
3. 拒絕不安全的候選者
4. 正規化 plugin 設定 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 決定每個候選者的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` (或 `activate(api)` — 一個舊版別名) hooks，並將註冊收集到 plugin 登錄表中
8. 將登錄表公開給指令/執行時層級

<Note>`activate` 是 `register` 的舊版別名 — 載入器會解析存在的任一者 (`def.register ?? def.activate`) 並在同一點呼叫它。所有套件隨附的外掛程式都使用 `register`；建議新外掛程式優先使用 `register`。</Note>

安全防護機制發生在執行階段執行**之前**。當進入點逃離外掛程式根目錄、路徑為可寫入 (world-writable)，或對於未套件隨附的外掛程式而言路徑所有權看起來可疑時，候選項目會被封鎖。

### 優先使用清單 的行為

清單 是控制平面的真實來源。OpenClaw 使用它來：

- 識別外掛程式
- 探索已宣告的通道/技能/設定結構描述或套件隨附的功能
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/預留位置
- 顯示安裝/目錄中繼資料

對於原生外掛程式，執行階段模組是資料平面的一部分。它註冊實際行為，例如掛勾、工具、指令或提供者流程。

### 載入器快取的內容

OpenClaw 會為以下內容保持短暫的處理程序內快取：

- 探索結果
- 清單註冊表資料
- 已載入的外掛程式註冊表

這些快取能減少突發的啟動和重複指令的負擔。將它們視為短效的效能快取而非持久性儲存是安全的。

效能備註：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取時間範圍。

## 註冊表模型

已載入的外掛程式不會直接變更隨機的核心全域變數。它們會註冊到中央的外掛程式註冊表。

註冊表會追蹤：

- 外掛程式記錄 (身分識別、來源、來源、狀態、診斷)
- 工具
- 舊版掛勾和型別化掛勾
- 通道
- 提供者
- 閘道 RPC 處理常式
- HTTP 路由
- CLI 註冊員
- 背景服務
- 外掛程式擁有的指令

然後核心功能會從該註冊表讀取，而不是直接與外掛程式模組通訊。這讓載入保持單向性：

- 外掛程式模組 -> 註冊表註冊
- 核心執行階段 -> 註冊表取用

那種分離對於可維護性很重要。這意味著大多數核心介面只需要一個整合點：「讀取註冊表」，而不是「對每個外掛程式模組進行特殊處理」。

## 對話繫結回呼

綁定對話的外掛程式可以在審核通過或被拒絕時做出反應。

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

回呼欄位 (Payload fields)：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的解析綁定
- `request`：原始請求摘要、分離提示 (detach hint)、發送者 ID 和
  對話元資料

此回呼僅供通知。它不會改變誰被允許綁定對話，
並且在核心審核處理完成後運行。

## 提供者執行時間攔截 (Provider runtime hooks)

提供者外掛程式現在有兩個層級：

- 清單元資料：`providerAuthEnvVars` 用於在執行時間載入前進行低成本的環境驗證查詢，
  加上 `providerAuthChoices` 用於在執行時間載入前進行低成本的入門/驗證選擇
  標籤和 CLI 標誌元資料
- 配置時攔截：`catalog` / 舊版 `discovery` 加上 `applyConfigDefaults`
- runtime hooks: `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `shouldDeferSyntheticProfileAuth`,
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

OpenClaw 仍然擁有通用 agent 迴圈、故障轉移、轉錄處理和
工具政策。這些 hooks 是針對特定提供商行為的擴展介面，無需
構建完整的自訂推論傳輸。

當提供商具有基於環境變數的憑證時，使用 manifest `providerAuthEnvVars`，以便通用的驗證/狀態/模型選擇路徑無需加載插件
運行時即可看到這些憑證。當上線/驗證選擇 CLI
介面需要知道提供商的選擇 ID、群組標籤和簡單
的單標誌驗證連線，而無需加載提供商運行時時，使用 manifest `providerAuthChoices`。將提供商運行時
`envVars` 保留給操作員面向的提示，例如上線標籤或 OAuth
client-id/client-secret 設置變數。

### Hook 順序與用法

對於模型/提供者外掛，OpenClaw 會依照此粗略順序呼叫 Hook。「使用時機」欄是快速決策指南。

| #   | Hook                              | 功能                                                             | 使用時機                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 產生期間，將提供者設定發佈到 `models.providers` | 提供者擁有目錄或預設基礎 URL                                                                        |
| 2   | `applyConfigDefaults`             | 在設定具體化期間套用提供者擁有的全域設定預設值                   | 預設值取決於驗證模式、環境或提供者模型系列語意                                                      |
| --  | _(內建模型查閱)_                  | OpenClaw 先嘗試正常的註冊表/目錄路徑                             | _(非外掛 Hook)_                                                                                     |
| 3   | `normalizeModelId`                | 在查閱之前正規化舊版或預覽模型 ID 別名                           | 提供者擁有在正規模型解析之前的別名清理                                                              |
| 4   | `normalizeTransport`              | 在通用模型組裝之前正規化提供者系列 `api` / `baseUrl`             | 提供者擁有同一傳輸系列中自訂提供者 ID 的傳輸清理                                                    |
| 5   | `normalizeConfig`                 | 在執行時/提供者解析之前正規化 `models.providers.<id>`            | 提供者需要應與外掛共存的設定清理；內建的 Google 系列輔助程式也會保底支援的 Google 設定項目          |
| 6   | `applyNativeStreamingUsageCompat` | 對設定提供者套用原生串流使用相容性重寫                           | 提供者需要端點驅動的原生串流使用中繼資料修復                                                        |
| 7   | `resolveConfigApiKey`             | 在執行時驗證載入之前，解析設定提供者的環境標記驗證               | 提供者具有提供者擁有的環境標記 API 金鑰解析；`amazon-bedrock` 在此處也具有內建的 AWS 環境標記解析器 |
| 8   | `resolveSyntheticAuth`            | 公開本機/自託管或設定支援的驗證，而不會保存明文                  | 提供者可以使用合成/本機憑證標記                                                                     |
| 9   | `shouldDeferSyntheticProfileAuth` | 在環境/設定支援的驗證之後，降低儲存的合成設定檔佔位符優先級      | 提供者儲存不應取得優先權的合成佔位符設定檔                                                          |
| 10  | `resolveDynamicModel`             | 針對本地註冊表中尚未有的提供者擁有模型 ID 進行同步回退           | 提供者接受任意上游模型 ID                                                                           |
| 11  | `prepareDynamicModel`             | 非同步預熱，然後 `resolveDynamicModel` 再次執行                  | 提供者在解析未知 ID 之前需要網路元資料                                                              |
| 12  | `normalizeResolvedModel`          | 在嵌入式執行器使用已解析模型之前的最終重寫                       | 提供者需要傳輸重寫但仍使用核心傳輸                                                                  |
| 13  | `contributeResolvedModelCompat`   | 為位於另一個相容傳輸後面的供應商模型貢獻相容標誌                 | 提供者在代理傳輸上識別自己的模型而不接管提供者                                                      |
| 14  | `capabilities`                    | 提供者擁有的、由共享核心邏輯使用的文字記錄/工具元資料            | 提供者需要文字記錄/提供者系列的怪癖處理                                                             |
| 15  | `normalizeToolSchemas`            | 在嵌入式執行器看到工具架構之前進行正規化                         | 提供者需要傳輸系列的架構清理                                                                        |
| 16  | `inspectToolSchemas`              | 在正規化後顯示提供者擁有的架構診斷資訊                           | 提供者想要關鍵字警告而無需教導核心特定於提供者的規則                                                |
| 17  | `resolveReasoningOutputMode`      | 選擇原生與標記推理輸出合約                                       | 提供者需要標記推理/最終輸出而不是原生欄位                                                           |
| 18  | `prepareExtraParams`              | 在通用串流選項包裝器之前的請求參數正規化                         | 提供者需要預設請求參數或特定於提供者的參數清理                                                      |
| 19  | `createStreamFn`                  | 使用自訂傳輸完全替換正常的串流路徑                               | 提供者需要自訂線路協議，而不僅僅是包裝器                                                            |
| 20  | `wrapStreamFn`                    | 在應用通用包裝器後的串流包裝器                                   | 提供者需要請求標頭/正文/模型相容包裝器而無需自訂傳輸                                                |
| 21  | `resolveTransportTurnState`       | 附加原生每次輪次傳輸標頭或元資料                                 | 提供者希望通用傳輸發送提供者原生的輪次身分                                                          |
| 22  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 標頭或會話冷卻策略                            | 提供者希望通用 WS 傳輸調整會話標頭或後備策略                                                        |
| 23  | `formatApiKey`                    | 驗證設定檔格式化器：儲存的設定檔變成執行時期 `apiKey` 字串       | Provider 儲存額外的驗證元數據，且需要自訂的執行時期 token 形狀                                      |
| 24  | `refreshOAuth`                    | OAuth 重新整理覆寫，用於自訂重新整理端點或重新整理失敗策略       | Provider 不適用於共享的 `pi-ai` 重新整理器                                                          |
| 25  | `buildAuthDoctorHint`             | 當 OAuth 重新整理失敗時附加的修復提示                            | Provider 在重新整理失敗後需要 Provider 擁有的驗證修復指引                                           |
| 26  | `matchesContextOverflowError`     | Provider 擁有的上下文視窗溢出匹配器                              | Provider 具有通用啟發式演算法會錯過的原始溢出錯誤                                                   |
| 27  | `classifyFailoverReason`          | Provider 擁有的故障轉移原因分類                                  | Provider 可以將原始 API/傳輸錯誤映射到速率限制/過載等                                               |
| 28  | `isCacheTtlEligible`              | 針對代理/回傳 Provider 的提示快取策略                            | Provider 需要代理特定的快取 TTL 閘控                                                                |
| 29  | `buildMissingAuthMessage`         | 通用遺失驗證恢復訊息的替代方案                                   | Provider 需要 Provider 特定的遺失驗證恢復提示                                                       |
| 30  | `suppressBuiltInModel`            | 過時的上游模型抑制加上可選的使用者面向錯誤提示                   | Provider 需要隱藏過時的上傳列，或用廠商提示取代它們                                                 |
| 31  | `augmentModelCatalog`             | 在發現後附加的合成/最終目錄列                                    | Provider 需要在 `models list` 和選擇器中加入合成的前向相容列                                        |
| 32  | `isBinaryThinking`                | 針對二元思考 Provider 的開啟/關閉推理切換                        | Provider 僅公開二元思考的開啟/關閉                                                                  |
| 33  | `supportsXHighThinking`           | 針對所選模型的 `xhigh` 推理支援                                  | Provider 僅在部分模型上需要 `xhigh`                                                                 |
| 34  | `resolveDefaultThinkingLevel`     | 特定模型系列的預設 `/think` 層級                                 | Provider 擁有模型系列的預設 `/think` 策略                                                           |
| 35  | `isModernModelRef`                | 用於即時設定檔過濾器和冒煙測試選擇的現代模型匹配器               | Provider 擁有即時/冒煙測試首選模型的匹配                                                            |
| 36  | `prepareRuntimeAuth`              | 在推論剛開始前將設定的憑證交換成實際的執行時期 token/key         | 提供者需要權杖交換或短期請求憑證                                                                    |
| 37  | `resolveUsageAuth`                | 解析 `/usage` 的使用量/計費憑證及相關狀態介面                    | 提供者需要自訂使用量/配額權杖解析或不同的使用量憑證                                                 |
| 38  | `fetchUsageSnapshot`              | 在解析驗證後，擷取並正規化提供者特定的使用量/配額快照            | 提供者需要提供者特定的使用量端點或酬載解析器                                                        |
| 39  | `createEmbeddingProvider`         | 為記憶/搜尋建構提供者擁有的嵌入適配器                            | 記憶嵌入行為屬於提供者外掛                                                                          |
| 40  | `buildReplayPolicy`               | 傳回控制提供者文字紀錄處理的重播原則                             | 提供者需要自訂文字紀錄原則（例如，思考區塊剝離）                                                    |
| 41  | `sanitizeReplayHistory`           | 在一般文字紀錄清理後重寫重播歷程                                 | 提供者需要超出共享壓縮輔助功能的提供者特定重播重寫                                                  |
| 42  | `validateReplayTurns`             | 在內嵌執行器之前進行最終重播輪次驗證或重組                       | 提供者傳輸在一般清理後需要更嚴格的輪次驗證                                                          |
| 43  | `onModelSelected`                 | 執行提供者擁有的選取後副作用                                     | 當模型啟用時，提供者需要遙測或提供者擁有的狀態                                                      |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 會先檢查
相符的提供者外掛，然後依序檢查其他支援掛鉤的提供者外掛，
直到其中一個實際變更了模型 ID 或傳輸/設定。這能讓
別名/相容性提供者填充層正常運作，而無需呼叫者知道哪個
內建外掛擁有該重寫。如果沒有提供者掛鉤重寫支援的
Google 系列設定項目，內建的 Google 設定正規化工具仍會套用
該相容性清理。

如果提供者需要完全自訂的線路協定或自訂請求執行器，
那屬於另一種類別的擴充功能。這些掛鉤是用於仍執行於
OpenClaw 正常推理迴圈中的提供者行為。

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
  提供者系列提示、驗證修復指導、使用量端點整合、
  提示快取資格、具驗證感知的設定預設值、Claude
  預設/自適應思考策略，以及針對
  beta 標頭的 Anthropic 特定串流塑形、`/fast` / `serviceTier` 和 `context1m`。
- Anthropic 的 Claude 特定串流輔助程式目前仍保留在捆綁外掛程式自己的
  公用 `api.ts` / `contract-api.ts` 介面中。該套件表面
  匯出 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
  `resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 和較低層級的
  Anthropic 包裝函式建構器，而不是圍繞單一提供者的
  beta 標頭規則來擴展通用 SDK。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`，
  因為它擁有 GPT-5.4 前向相容性、直接 OpenAI
  `openai-completions` -> `openai-responses` 正規化、具 Codex 感知的
  驗證提示、Spark 抑制、合成 OpenAI 列表資料列，以及 GPT-5 思考 /
  即時模型策略；`openai-responses-defaults` 串流系列擁有
  用於歸屬標頭、
  `/fast`/`serviceTier`、文字詳細程度、原生 Codex 網頁搜尋、
  推理相容酬載塑形和 Responses 內容管理的共用
  原生 OpenAI Responses 包裝函式。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該提供者是直通的，可能會在 OpenClaw 的靜態目錄更新之前公開新的
  模型 ID；它也使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 將
  提供者特定的請求標頭、路由元資料、推理修補程式和
  prompt-cache 策略保留在核心之外。其重播策略來自
  `passthrough-gemini` 系列家族，而 `openrouter-thinking` 串流家族
  則擁有代理推理注入和不支援的模型 / `auto` 略過功能。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要提供者擁有的裝置登入、模型後備行為、Claude 逐字稿
  怪癖、GitHub 權杖 -> Copilot 權杖交換，以及提供者擁有的使用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍在核心 OpenAI 傳輸上運行，但擁有其傳輸/基底 URL
  正規化、OAuth 重新整理後備策略、預設傳輸選擇、
  合成 Codex 目錄列和 ChatGPT 使用量端點整合；它
  與直接連線的 OpenAI 共用相同的 `openai-responses-defaults` 串流家族。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel`、
  `buildReplayPolicy`、`sanitizeReplayHistory`、
  `resolveReasoningOutputMode`、`wrapStreamFn` 和 `isModernModelRef`，因為
  `google-gemini` replay 系列（family）擁有 Gemini 3.1 前向相容回退、
  原生 Gemini replay 驗證、bootstrap replay 清理、標記
  reasoning-output 模式以及現代模型匹配，而
  `google-thinking` stream 系列則擁有 Gemini 思維（thinking）負載正規化；
  Gemini CLI OAuth 也使用 `formatApiKey`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 進行 token 格式化、token 解析以及配額端點
  連接。
- Anthropic Vertex 使用透過
  `anthropic-by-model` replay 系列的 `buildReplayPolicy`，以便將
  Claude 專屬的 replay 清理範圍限制在 Claude ID，而非每個
  `anthropic-messages` 傳輸。
- Amazon Bedrock 使用 `buildReplayPolicy`、`matchesContextOverflowError`、
  `classifyFailoverReason` 和 `resolveDefaultThinkingLevel`，因為它擁有
  對於 Bedrock 上 Anthropic 流量的 Bedrock 專屬節流（throttle）/未就緒/內容溢位錯誤分類；
  其 replay 策略仍共用相同的
  僅限 Claude 的 `anthropic-by-model` 防護（guard）。
- OpenRouter、Kilocode、Opencode 和 Opencode Go 使用透過
  `passthrough-gemini` replay 系列的 `buildReplayPolicy`，
  因為它們透過 OpenAI 相容傳輸代理 Gemini
  模型，且需要 Gemini
  思維簽章（thought-signature）清理，而不需要原生 Gemini replay 驗證或
  bootstrap 重寫。
- MiniMax 使用透過
  `hybrid-anthropic-openai` replay 系列的 `buildReplayPolicy`，因為一個提供者同時擁有
  Anthropic-message 和 OpenAI 相容語意；它在 Anthropic 端保留僅限 Claude 的
  思維區塊（thinking-block）丟棄，同時將 reasoning
  輸出模式覆寫回原生，而 `minimax-fast-mode` stream 系列則擁有
  共用串流路徑上的快速模式模型重寫。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共享的
  OpenAI 傳輸，但需要提供者擁有的思考 payload 正規化；
  `moonshot-thinking` 串流系列將配置加上 `/think` 狀態對應到其
  原生二進位思考 payload。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供者擁有的請求標頭、
  推理 payload 正規化、Gemian 轉錄提示以及 Anthropic
  快取 TTL 閘控；`kilocode-thinking` 串流系列在共享代理串流路徑上保留 Kilo 思考
  注入，同時跳過 `kilo/auto` 和
  其他不支援顯式推理 payload 的代理模型 ID。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 退回機制、
  `tool_stream` 預設值、二進位思考 UX、現代模型比對，以及
  使用驗證和配額獲取；`tool-stream-default-on` 串流系列將
  預設開啟的 `tool_stream` 包裝器排除在每個提供者手寫膠合代碼之外。
- xAI 使用 `normalizeResolvedModel`、`normalizeTransport`、
  `contributeResolvedModelCompat`、`prepareExtraParams`、`wrapStreamFn`、
  `resolveSyntheticAuth`、`resolveDynamicModel` 和 `isModernModelRef`，
  因為它擁有原生 xAI Responses 傳輸正規化、Grok 快速模式
  別名重寫、預設 `tool_stream`、strict-tool / reasoning-payload
  清理、外掛擁有工具的退回驗證重用、前向相容 Grok
  模型解析，以及提供者擁有的相容性修補程式，例如 xAI 工具架構
  設定檔、不支援的架構關鍵字、原生 `web_search` 和 HTML 實體
  工具呼叫引數解碼。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities` 將
  轉錄/工具的怪異行為排除在核心之外。
- 僅目錄的內建提供者（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）僅使用
  `catalog`。
- Qwen 將 `catalog` 用於其文字提供者，並針對其多模態表面
  使用共享的媒體理解和視訊生成註冊。
- MiniMax 和小米使用 `catalog` 加上使用掛鉤，因為它們的 `/usage`
  行為是外掛程式擁有的，即使推論仍然透過共享
  傳輸執行。

## 執行時期輔助程式

外掛程式可以透過 `api.runtime` 存取選定的核心輔助程式。對於 TTS：

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

- `textToSpeech` 會傳回用於檔案/語音備忘錄表面的標準核心 TTS 輸出內容。
- 使用核心 `messages.tts` 組態和提供者選擇。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對於每個提供者是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音清單可以包含更豐富的中繼資料，例如地區設定、性別和個性標籤，供提供者感知的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援語音通訊。Microsoft 則不支援。

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

- 將 TTS 原則、後援和回覆傳遞保留在核心中。
- 使用語音提供者來處理廠商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會被正規化為 `microsoft` 提供者 ID。
- 首選的擁有權模型是導向公司的：隨著 OpenClaw 新增這些
  功能合約，一個廠商外掛程式可以擁有
  文字、語音、影像和未來的媒體提供者。

對於圖片/音訊/影片理解，外掛註冊一個類型化的媒體理解提供者，而不是通用的鍵值包：

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

- 將編排、後援、配置和通道連接保留在核心中。
- 將供應商行為保留在提供者外掛中。
- 擴充性擴展應保持類型化：新的可選方法、新的可選結果欄位、新的可選功能。
- 影片生成已經遵循相同的模式：
  - 核心擁有功能合約和執行時輔助程式
  - 供應商外掛註冊 `api.registerVideoGenerationProvider(...)`
  - 功能/通道外掛使用 `api.runtime.videoGeneration.*`

對於媒體理解執行時輔助程式，外掛可以呼叫：

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

對於音訊轉錄，外掛可以使用媒體理解執行時或較舊的 STT 別名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

備註：

- `api.runtime.mediaUnderstanding.*` 是圖片/音訊/影片理解的首選共享介面。
- 使用核心媒體理解音訊配置 (`tools.media.audio`) 和提供者後援順序。
- 當未產生轉錄輸出時（例如跳過/不支援的輸入），傳回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 作為相容性別名保留。

外掛也可以透過 `api.runtime.subagent` 啟動背景子代理程式執行：

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

- `provider` 和 `model` 是可選的單次執行覆寫，而非持續的會話變更。
- OpenClaw 僅對受信任的呼叫者遵守那些覆寫欄位。
- 對於外掛擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 選擇加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛限制為特定的規範 `provider/model` 目標，或使用 `"*"` 明確允許任何目標。
- 不受信任的外掛子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後援。

對於網路搜尋，外掛可以使用共享的執行時輔助程式，而不是深入代理程式工具連接：

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

外掛也可以透過 `api.registerWebSearchProvider(...)` 註冊網路搜尋提供者。

備註：

- 將提供者選擇、憑證解析和共享請求語意保留在核心中。
- 使用網路搜尋提供者進行供應商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴代理程式工具包裝器的功能/通道外掛的首選共用介面。

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

外掛可以使用 `api.registerHttpRoute(...)` 公開 HTTP 端點。

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
- `auth`：必填。使用 `"gateway"` 要求正常的 Gateway 認證，或使用 `"plugin"` 進行外掛管理的認證/Webhook 驗證。
- `match`：可選。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：可選。允許同一個外掛替換其現有的路由註冊。
- `handler`：當路由處理了請求時，返回 `true`。

備註：

- `api.registerHttpHandler(...)` 已被移除，將會導致外掛載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 外掛路由必須明確宣告 `auth`。
- 除非 `replaceExisting: true`，否則會拒絕完全相同的 `path + match` 衝突，並且一個外掛無法替換另一個外掛的路由。
- 具有不同 `auth` 級別的重疊路由會被拒絕。請將 `exact`/`prefix` 透傳鏈保持在相同的認證級別上。
- `auth: "plugin"` 路由**不會**自動接收操作員執行時範圍。它們用於外掛管理的 webhooks/簽名驗證，而非特權的 Gateway 輔助呼叫。
- `auth: "gateway"` 路由在 Gateway 請求執行時範圍內執行，但該範圍是有意保守的：
  - 共享密碼 bearer auth (`gateway.auth.mode = "token"` / `"password"`) 會將插件路由運行時範圍固定為 `operator.write`，即使呼叫者發送了 `x-openclaw-scopes`
  - 信任的承載身份 HTTP 模式（例如私有入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`）僅在標頭明確存在時才遵守 `x-openclaw-scopes`
  - 如果這些承載身份的插件路由請求中缺少 `x-openclaw-scopes`，則運行時範圍會回退到 `operator.write`
- 實用規則：不要假設閘道認證的插件路由是一個隱含的管理介面。如果您的路由需要僅限管理員的行為，請要求使用承載身份的認證模式並記錄明確的 `x-openclaw-scopes` 標頭契約。

## 插件 SDK 匯入路徑

在編寫插件時，使用 SDK 子路徑而不是單體的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/plugin-entry` 用於插件註冊原語。
- `openclaw/plugin-sdk/core` 用於通用共享的插件面向契約。
- `openclaw/plugin-sdk/config-schema` 用於根 `openclaw.json` Zod 結構描述
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
  `openclaw/plugin-sdk/webhook-ingress`，用於共享設定/驗證/回覆/webhook
  接線。`channel-inbound` 是 debounce、提及匹配、
  信封格式化以及入站信封上下文輔助程式的共用家園。
  `channel-setup` 是狹窄的可選安裝設定縫隙。
  `setup-runtime` 是 `setupEntry` /
  延遲啟動使用的執行時期安全設定表面，包括導入安全的設定修補程式介面卡。
  `setup-adapter-runtime` 是環境感知的帳號設定介面卡縫隙。
  `setup-tools` 是小型 CLI/歸檔/文件輔助縫隙 (`formatCliCommand`、
  `detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、
  `CONFIG_DIR`)。
- 領域子路徑（domain subpaths）如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/allow-from`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/telegram-command-config`、
  `openclaw/plugin-sdk/channel-policy`、
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
  `openclaw/plugin-sdk/directory-runtime` 用於共享的執行時期/配置輔助程式。
  `telegram-command-config` 是 Telegram 自訂指令標準化/驗證的狹窄公共介面，即使內建的 Telegram 合約介面暫時無法使用，它仍保持可用。
  `text-runtime` 是共享的文字/Markdown/日誌介面，包括助手可見文字剝離、Markdown 渲染/分塊輔助程式、編校輔助程式、指令標籤輔助程式和安全文字工具。
- 特定於審核的通道介面應優先選擇外掛程式上的一個 `approvalCapability`
  合約。Core 然後透過該功能讀取審核授權、交付、渲染和原生路由行為，而不是將審核行為混合到不相關的外掛程式欄位中。
- `openclaw/plugin-sdk/channel-runtime` 已被棄用，僅作為較舊外掛程式的相容性填充層（shim）保留。新程式碼應改為導入更狹窄的通用基本組件，且儲存庫程式碼不應新增對該填充層的導入。
- 內建的擴充功能內部保持私有。外部外掛程式應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可以使用外掛程式套件根目錄下的儲存庫公共進入點，例如 `index.js`、`api.js`、
  `runtime-api.js`、`setup-entry.js` 以及範圍狹小的檔案，例如
  `login-qr-api.js`。絕不要從核心或另一個擴充功能導入外掛程式套件的 `src/*`。
- Repo 入口點分拆：
  `<plugin-package-root>/api.js` 是輔助工具/類型的 barrel，
  `<plugin-package-root>/runtime-api.js` 是僅運行時的 barrel，
  `<plugin-package-root>/index.js` 是打包的插件入口，
  而 `<plugin-package-root>/setup-entry.js` 是設置插件的入口。
- 目前打包的供應商範例：
  - Anthropic 使用 `api.js` / `contract-api.js` 取得 Claude 串流輔助工具，例如
    `wrapAnthropicProviderStream`、beta-header 輔助工具以及 `service_tier`
    解析。
  - OpenAI 使用 `api.js` 取得供應商構建器、預設模型輔助工具以及
    即時供應商構建器。
  - OpenRouter 使用 `api.js` 作為其供應商構建器以及上架/配置
    輔助工具，而 `register.runtime.js` 仍然可以重新匯出通用
    `plugin-sdk/provider-stream` 輔助工具供 repo 內部使用。
- Facade 載入的公開入口點在可用時會優先使用有效的運行時配置快照，
  當 OpenClaw 尚未提供運行時快照時，則會回退到磁碟上的已解析配置檔案。
- 通用共享基元仍然是首選的公開 SDK 合約。一小部分
  保留的相容性打包通道品牌輔助工具縫隙仍然存在。
  應將其視為打包維護/相容性縫隙，而非新的
  第三方匯入目標；新的跨通道合約仍應放置於
  通用 `plugin-sdk/*` 子路徑或插件本地的 `api.js` /
  `runtime-api.js` barrels。

相容性說明：

- 在新程式碼中請避免使用根目錄 `openclaw/plugin-sdk` barrel。
- 請優先使用狹窄的穩定基元。較新的 setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool 子路徑是新打包和外部
  插件工作的預期合約。
  目標解析/匹配屬於 `openclaw/plugin-sdk/channel-targets`。
  訊息操作閘門和反應訊息 ID 輔助工具屬於
  `openclaw/plugin-sdk/channel-actions`。
- 打包的特定擴充功能的輔助模組預設並不穩定。如果某個輔助工具僅由打包的擴充功能所需，請將其保留在該擴充功能的本機 `api.js` 或 `runtime-api.js` 接縫之後，而不是將其提升至 `openclaw/plugin-sdk/<extension>`。
- 新的共享輔助接縫應該是通用的，而非特定於管道的。共享目標解析屬於 `openclaw/plugin-sdk/channel-targets`；特定管道的內部實作則保留在擁有該外掛的本機 `api.js` 或 `runtime-api.js` 接縫之後。
- 特定功能的子路徑（例如 `image-generation`、`media-understanding` 和 `speech`）之所以存在，是因為打包的/原生外掛目前使用了它們。它們的存在並不代表每個匯出的輔助工具都是長期凍結的外部合約。

## 訊息工具架構

外掛應該擁有特定管道的 `describeMessageTool(...)` 架構貢獻。請將特定提供者的欄位保留在外掛中，而不是放在共享的核心裡。

對於共享的可移植架構片段，請重用透過 `openclaw/plugin-sdk/channel-actions` 匯出的通用輔助工具：

- `createMessageToolButtonsSchema()` 用於按鈕網格樣式的負載
- `createMessageToolCardSchema()` 用於結構化卡片負載

如果某個架構形狀僅對單一提供者有意義，請在該外掛自己的來源中定義它，而不是將其提升至共享的 SDK。

## 管道目標解析

管道外掛應該擁有特定管道的目標語意。請保持共享的輸出主機為通用狀態，並使用訊息介面卡表面來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查詢之前，標準化的目標是否應被視為 `direct`、`group` 或 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入是否應該直接跳到類似 ID 的解析，而不是進行目錄搜尋。
- `messaging.targetResolver.resolveTarget(...)` 是外掛的後備方案，當核心在標準化或目錄查詢失敗後需要最終由提供者擁有的解析時使用。
- `messaging.resolveOutboundSessionRoute(...)` 負責在解析目標後建構特定提供者的會話路由。

建議的劃分方式：

- 請使用 `inferTargetChatType` 進行應在搜尋對等/群組之前發生的分類決策。
- 請使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 請使用 `resolveTarget` 作為提供者特定的正規化備選方案，而非用於廣泛的目錄搜尋。
- 請將提供者原生的 ID（如聊天 ID、主串 ID、JID、handle 和房間 ID）保留在 `target` 值或提供者特定的參數中，而非放在通用的 SDK 欄位裡。

## 基於設定檔支援的目錄

從設定檔衍生目錄項目的外掛程式應將該邏輯保留在外掛程式中，並重複使用來自
`openclaw/plugin-sdk/directory-runtime` 的共享輔助程式。

當頻道需要基於設定檔支援的對等/群組時使用此功能，例如：

- 由允許清單驅動的 DM 對等
- 已設定的頻道/群組對應
- 帳號範圍的靜態目錄備選方案

`directory-runtime` 中的共享輔助程式僅處理通用操作：

- 查詢過濾
- 限制套用
- 去重/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

頻道特定的帳號檢查和 ID 正規化應保留在外掛程式實作中。

## 提供者型錄

提供者外掛程式可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型型錄。

`catalog.run(...)` 會傳回與 OpenClaw 寫入 `models.providers` 相同的形狀：

- 一個提供者項目的 `{ provider }`
- 多個提供者項目的 `{ providers }`

當外掛程式擁有提供者特定的模型 ID、基本 URL 預設值或受驗證保護的模型中繼資料時，請使用 `catalog`。

`catalog.order` 控制外掛程式的型錄相對於 OpenClaw 內建隱含提供者的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當驗證設定檔存在時出現的提供者
- `paired`：綜合多個相關提供者項目的提供者
- `late`：最後一輪，在其他隱含提供者之後

在索引鍵衝突時，後面的提供者會獲勝，因此外掛程式可以刻意使用相同的提供者 ID 覆寫內建的提供者項目。

相容性：

- `discovery` 仍可作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的插件註冊了通道，建議與 `resolveAccount(...)` 一起實作
`plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它被允許假設憑證
  已完全具體化，並且當缺少必要的機密時可以快速失敗。
- 唯讀指令路徑，例如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修復流程，應該不需要僅為了描述組態而具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅傳回描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要僅為了回報唯讀可用性而傳回原始 token 值。傳回
  `tokenStatus: "available"`（以及相符的來源欄位）對於狀態樣式的指令來說就已足夠。
- 當憑證是透過 SecretRef 配置但在目前指令路徑中無法使用時，
  請使用 `configured_unavailable`。

這允許唯讀指令回報「已配置但在此指令路徑中無法使用」，
而不是當機或錯誤地回報帳戶未配置。

## 套件包

插件目錄可以包含一個帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個插件。如果該包列出了多個擴充功能，
插件 ID 將變為 `name/<fileBase>`。

如果您的外掛程式匯入了 npm 相依套件，請在該目錄中安裝它們，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 項目都必須保留在外掛程式
目錄內。逸出套件目錄的項目
將被拒絕。

安全說明：`openclaw plugins install` 使用
`npm install --omit=dev --ignore-scripts` 安裝外掛程式相依套件
（無生命週期腳本，執行時期無 dev 相依套件）。請保持外掛程式相依樹
為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。
當 OpenClaw 需要為已停用的通道外掛程式提供設定介面，或
當通道外掛程式已啟用但尚未設定時，它會載入 `setupEntry`
而非完整的外掛程式進入點。當您的主要外掛程式進入點也連接了工具、Hook 或其他僅限
執行時期的程式碼時，這能讓啟動和設定更輕量。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以在閘道
開始監聽之前的啟動階段，讓通道外掛程式採用相同的 `setupEntry` 路徑，
即使該通道已經設定過。

僅當 `setupEntry` 完整涵蓋閘道開始監聽前必須存在的
啟動介面時，才使用此選項。實務上，這意味著設定進入點
必須註冊啟動依賴的每個通道擁有的功能，例如：

- 通道註冊本身
- 任何必須在閘道開始監聽之前可用的 HTTP 路由
- 任何必須在同一時段存在的閘道方法、工具或服務

如果您的完整進入點仍然擁有任何所需的啟動功能，請勿啟用
此旗標。請讓外掛程式保持預設行為，並讓 OpenClaw 在啟動期間載入
完整進入點。

綁定的通道也可以發布僅限設定的合約介面輔助程式，讓核心
在載入完整通道執行時期之前進行諮詢。目前的設定
升級介面為：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core 使用該介面，當它需要將舊版單一帳號通道設定提升為 `channels.<id>.accounts.*` 而不載入完整的外掛條目時。Matrix 是目前內建的範例：當已存在命名帳號時，它僅將驗證/啟動金鑰移至命名的提升帳號，並且它可以保留設定的非正式預設帳號金鑰，而不是總是建立 `accounts.default`。

那些設定修補介面卡使內建的契約介面發現保持延遲載入。匯入時間保持輕量；升級介面僅在首次使用時載入，而不是在模組匯入時重新進入內建的通道啟動程序。

當這些啟動介面包含閘道 RPC 方法時，請將它們保留在特定外掛的前綴上。Core 管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態，且總是解析至 `operator.admin`，即使外掛請求更窄的範圍。

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

### 通道目錄中繼資料

通道外掛可以透過 `openclaw.channel` 宣傳設定/發現中繼資料，並透過 `openclaw.install` 提供安裝提示。這使核心目錄保持無資料狀態。

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

除了最小範例之外，有用的 `openclaw.channel` 欄位：

- `detailLabel`：用於更豐富的目錄/狀態介面的次要標籤
- `docsLabel`：覆寫文件連結的連結文字
- `preferOver`：此目錄條目應壓過的優先級較低的外掛/通道 ID
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：選擇介面複製控制
- `markdownCapable`：將通道標記為支援 Markdown 以用於輸出格式化決策
- `exposure.configured`：當設定為 `false` 時，從已設定通道列表介面中隱藏通道
- `exposure.setup`：當設定為 `false` 時，從互動式設定/設定選擇器中隱藏通道
- `exposure.docs`：將通道標記為內部/私有以用於文件導覽介面
- `showConfigured` / `showInSetup`：為了相容性仍接受的舊版別名；建議優先使用 `exposure`
- `quickstartAllowFrom`：選擇將頻道加入標準快速入門 `allowFrom` 流程
- `forceAccountBinding`：即使只存在一個帳戶，也要求明確的帳戶綁定
- `preferSessionLookupForAnnounceTarget`：在解析公告目標時，優先使用工作階段查詢

OpenClaw 也可以合併**外部頻道目錄**（例如，MPM 註冊表匯出）。請將 JSON 檔案置於以下任一路徑：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案
應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

## Context engine plugins

Context engine plugins 負責擷取、組裝和壓縮的 session context 協調流程。請從您的 plugin 中透過
`api.registerContextEngine(id, factory)` 註冊它們，然後使用
`plugins.slots.contextEngine` 選擇啟用的 engine。

當您的 plugin 需要取代或擴充預設 context pipeline，而不僅僅是新增記憶體搜尋或 hooks 時，請使用此功能。

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

如果您的 engine **不**擁有壓縮演算法，請保持 `compact()`
的實作並明確地委派它：

```ts
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

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
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## Adding a new capability

當 plugin 需要不符合目前 API 的行為時，請使用私有的繞過方式跳過 plugin 系統。請新增缺少的 capability。

建議順序：

1. 定義核心合約
   決定 core 應擁有哪些共用行為：原則、後備、配置合併、
   生命週期、面向頻道的語意以及執行時期輔助程式的形狀。
2. 新增型別化的 plugin 註冊/執行時期介面
   以最小且實用的型別化 capability 介面擴充
   `OpenClawPluginApi` 和/或 `api.runtime`。
3. wire core + channel/feature consumers
   Channels and feature plugins should consume the new capability through core,
   not by importing a vendor implementation directly.
4. register vendor implementations
   Vendor plugins then register their backends against the capability.
5. add contract coverage
   Add tests so ownership and registration shape stay explicit over time.

This is how OpenClaw stays opinionated without becoming hardcoded to one
provider's worldview. See the [Capability Cookbook](/en/tools/capability-cookbook)
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

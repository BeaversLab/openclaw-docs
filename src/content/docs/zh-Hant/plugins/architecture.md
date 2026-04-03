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

<Info>這是**深度架構參考**。如需實用指南，請參閱： - [安裝並使用外掛](/en/tools/plugin) — 使用者指南 - [快速入門](/en/plugins/building-plugins) — 第一個外掛教學 - [頻道外掛](/en/plugins/sdk-channel-plugins) — 建立訊息傳遞頻道 - [提供者外掛](/en/plugins/sdk-provider-plugins) — 建立模型提供者 - [SDK 概覽](/en/plugins/sdk-overview) — import map 和註冊 API</Info>

This page covers the internal architecture of the OpenClaw plugin system.

## Public capability model

Capabilities are the public **native plugin** model inside OpenClaw. Every
native OpenClaw plugin registers against one or more capability types:

| Capability      | Registration method                           | Example plugins           |
| --------------- | --------------------------------------------- | ------------------------- |
| Text inference  | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| CLI 推論後端    | `api.registerCliBackend(...)`                 | `openai`, `anthropic`     |
| 語音            | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| 圖像生成        | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| 網路搜尋        | `api.registerWebSearchProvider(...)`          | `google`                  |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

註冊零個能力但提供 hooks、工具或服務的外掛是一個**僅舊版 hook (legacy hook-only)** 的外掛。該模式仍然完全受到支援。

### 外部相容性立場

能力模型已在核心中落地，並且目前由捆綁/原生外掛使用，但外部外掛相容性仍然需要比「它已匯出，因此它是凍結的」更高的標準。

目前的指導方針：

- **現有的外部外掛：** 保持基於 hook 的整合正常運作；將此視為相容性基準
- **新的打包/原生外掛程式：** 優先使用明確的功能註冊，而非
  特定供應商的內部存取或僅使用 Hook 的新設計
- **採用功能註冊的外部外掛程式：** 允許使用，但除非文件明確將
  合約標記為穩定，否則應將特定功能的輔助介面視為可能變動

實務規則：

- 功能註冊 API 是預期的發展方向
- 在轉換期間，舊版 Hook 仍然是外部外掛程式最安全且不中斷的路徑
- 匯出的輔助子路徑並非完全同等；請優先使用狹義的文件化合約，而非附帶的輔助匯出

### 外掛程式形狀

OpenClaw 根據每個已載入外掛程式的實際註冊行為（而不僅僅是靜態元資料）將其分類為一種形狀：

- **plain-capability** — 註冊確切的一種能力類型（例如僅提供者的外掛，如 `mistral`）
- **hybrid-capability** — 註冊多種能力類型（例如
  `openai` 擁有文字推論、語音、媒體理解和影像生成）
- **僅掛鉤** -- 僅註冊鉤子（類型化或自定義），不註冊能力、
  工具、命令或服務
- **非能力** -- 註冊工具、命令、服務或路由，但不註冊
  能力

使用 `openclaw plugins inspect <id>` 來查看外掛的形狀和能力細目。詳細資訊請參閱 [CLI 參考資料](/en/cli/plugins#inspect)。

### 舊版鉤子

`before_agent_start` hook 作為僅 hook 外掛的相容路徑仍受支援。舊版的實際外掛仍依賴它。

方向：

- 保持其正常運作
- 將其記錄為舊版
- 針對模型/提供者覆寫作業，偏好使用 `before_model_resolve`
- 建議針對提示詞變異工作使用 `before_prompt_build`
- 僅在實際使用量下降且 fixture 覆蓋率證明遷移安全後移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到
以下其中一個標籤：

| 訊號                       | 含義                                              |
| -------------------------- | ------------------------------------------------- |
| **config valid**           | 設定解析正常且外掛解析成功                        |
| **compatibility advisory** | 外掛程式使用支援但較舊的模式（例如 `hook-only`）  |
| **legacy warning**         | 外掛程式使用 `before_agent_start`，該功能已被棄用 |
| **hard error**             | 設定無效或外掛載入失敗                            |

`hook-only` 或 `before_agent_start` 目前都不會導致您的外掛程式中斷 --
`hook-only` 僅供參考，而 `before_agent_start` 僅會觸發警告。這些
訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛系統有四個層級：

1. **清單 + 探索**
   OpenClaw 會從設定的路徑、工作區根目錄、
   全域擴充功能根目錄和捆綁的擴充功能中尋找候選外掛程式。探索過程會先讀取原生
   `openclaw.plugin.json` 清單以及支援的捆綁清單。
2. **啟用 + 驗證**
   核心決定已探索的外掛是啟用、停用、被封鎖，還是被選擇用於獨佔插槽（例如記憶體）。
3. **執行時期載入**
   原生 OpenClaw 外掛透過 jiti 在程式內載入，並將功能註冊到中央註冊表中。相容的套件會被正規化為註冊表記錄，而不匯入執行時期程式碼。
4. **介面消耗**
   OpenClaw 的其餘部分會讀取註冊表以公開工具、頻道、提供者設定、掛鉤、HTTP 路由、CLI 指令和服務。

特別針對外掛程式 CLI，根指令探索分為兩個階段：

- 剖析時期的元資料來自 `registerCli(..., { descriptors: [...] })`
- 真實的外掛程式 CLI 模組可以保持延遲載入，並在首次叫用時註冊

這樣可以將外掛程式擁有的 CLI 程式碼保留在外掛程式內，同時仍讓 OpenClaw
在剖析之前保留根指令名稱。

重要的設計邊界：

- 探索 + 設定驗證應該透過 **清單/結構描述元資料** 運作，
  而無需執行外掛程式碼
- 原生執行時期行為來自外掛程式模組的 `register(api)` 路徑

這種分離讓 OpenClaw 能夠在完整執行時期啟動之前驗證設定、說明遺失/已停用的外掛程式，並
建構 UI/結構描述提示。

### 通道外掛程式與共用訊息工具

通道外掛程式不需要為一般聊天動作註冊個別的傳送/編輯/反應工具。
OpenClaw 在核心中保留一個共用的 `message` 工具，
而通道外掛程式則擁有其後的通道特定探索與執行。

目前的邊界是：

- 核心擁有共用的 `message` 工具主機、提示詞連線、階段作業/執行緒
  簿記，以及執行分派
- 通道外掛程式擁有限範圍的動作探索、功能探索，以及任何
  通道特定的結構描述片段
- 通道插件擁有特定於提供者的會話對話文法，例如對話 ID 如何編碼執行緒 ID 或繼承自父對話
- 通道插件透過其 action adapter 執行最終動作

對於通道插件，SDK 介面為
`ChannelMessageActionAdapter.describeMessageTool(...)`。該統一的發現呼叫
允許插件同時返回其可見動作、功能和 schema
貢獻，以免這些部分脫節。

Core 將運行時作用域傳遞給該發現步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

這對於上下文敏感的插件很重要。通道可以根據活動帳號、當前房間/執行緒/訊息或
受信任的請求者身分隱藏或顯示
訊息動作，而無需在核心
`message` 工具中硬編碼特定於通道的分支。

這就是為什麼 embedded-runner 路由更改仍然是插件工作的原因：runner 負責將
當前聊天/會話身分轉發到插件
發現邊界，以便共享的 `message` 工具為當前輪次顯示正確的通道擁有的
介面。

對於通道擁有的執行輔助程式，捆綁插件應將執行
運行時保留在自己的擴充模組中。Core 不再擁有 `src/agents/tools` 下的
Discord、Slack、Telegram 或 WhatsApp 訊息動作運行時。
我們不發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，捆綁
插件應直接從其
擴充擁有的模組導入自己的本地運行時代碼。

具體對於投票，有兩條執行路徑：

- `outbound.sendPoll` 是適合通用
  投票模型的通道的共享基線
- `actions.handleAction("poll")` 是特定於通道的
  投票語義或額外投票參數的首選路徑

核心現在將通用輪詢解析延遲到外掛程式輪詢分派拒絕該操作之後，因此外掛程式擁有的輪詢處理程式可以接受特定通道的輪詢欄位，而不會先被通用輪詢解析器阻擋。

請參閱 [載入管線](#load-pipeline) 以了解完整的啟動順序。

## 功能擁有權模型

OpenClaw 將原生外掛程式視為 **公司** 或 **功能** 的擁有權邊界，而不是一堆無關整合項的雜燴。

這意味著：

- 公司外掛程式通常應該擁有該公司所有面向 OpenClaw 的介面
- 功能外掛程式通常應該擁有其引入的完整功能介面
- 通道應該使用共享的核心功能，而不是臨時重新實現提供者行為

範例：

- 內建的 `openai` 外掛程式擁有 OpenAI 模型提供者行為，以及 OpenAI 的語音 + 媒體理解 + 影像生成行為
- 內建的 `elevenlabs` 外掛程式擁有 ElevenLabs 語音行為
- 內建的 `microsoft` 外掛程式擁有 Microsoft 語音行為
- 內建的 `google` 外掛程式擁有 Google 模型提供者行為，以及 Google 的媒體理解 + 影像生成 + 網路搜尋行為
- 內建的 `minimax`、`mistral`、`moonshot` 和 `zai` 外掛程式各自擁有它們的媒體理解後端
- `voice-call` 外掛程式是一個功能外掛程式：它擁有通訊傳輸、工具、CLI、路由和執行時，但它使用核心 TTS/STT 功能，而不是發明第二個語音堆疊

預期的最終狀態是：

- 即使 OpenAI 涵蓋文字模型、語音、影像和未來的影片，它也應該位於一個外掛程式中
- 其他廠商也可以為其自己的領域做同樣的事情
- 通道不在乎哪個廠商外掛程式擁有該提供者；它們使用核心公開的共享功能合約

這是關鍵區別：

- **外掛程式** = 擁有權邊界
- **功能** = 多個外掛程式可以實作或使用的核心合約

因此，如果 OpenClaw 新增如視訊等領域，第一個問題不是
「哪個提供者應該將視訊處理硬編碼？」第一個問題是「核心視訊
能力契約是什麼？」一旦該契約存在，廠商外掛就可以
針對其進行註冊，而頻道/功能外掛則可以使用它。

如果該能力尚未存在，通常的正確做法是：

1. 在核心中定義缺失的能力
2. 以類型化的方式透過外掛 API/執行時公開它
3. 將頻道/功能與該能力連接
4. 讓廠商外掛註冊實作

這樣既保持了所有權的明確，又避免了依賴單一廠商或
一次性外掛特定程式碼路徑的核心行為。

### 能力分層

在決定程式碼所屬位置時，請使用此心智模型：

- **核心能力層**：共享的協調、原則、後援、設定
  合併規則、傳遞語意，以及類型化契約
- **廠商外掛層**：廠商特定的 API、驗證、模型目錄、語音
  合成、影像生成、未來的視訊後端、使用端點
- **頻道/功能外掛層**：Slack/Discord/語音通話/等整合
  它們使用核心能力並將其呈現在介面上

例如，TTS 遵循此形狀：

- 核心擁有回覆時間 TTS 原則、後援順序、偏好設定和頻道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 使用電話 TTS 執行時輔助程式

對於未來的能力，應優先採用相同的模式。

### 多能力公司外掛範例

公司外掛在外部應感覺協調一致。如果 OpenClaw 對模型、語音、
媒體理解和網路搜尋有共享的契約，廠商可以在一個地方
擁有其所有介面：

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

- 一個外掛擁有廠商介面
- 核心仍然擁有能力契約
- 頻道和功能外掛使用 `api.runtime.*` 輔助程式，而非廠商程式碼
- 契約測試可以斷言外掛註冊了其
  聲稱擁有的能力

### 能力範例：視訊理解

OpenClaw 已經將影像/音訊/視訊理解視為一個共享
能力。同樣的所有權模型也適用於此：

1. 核心定義了媒體理解合約
2. 供應商外掛程式視情況註冊 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道與功能外掛程式消費共享的核心行為，而不是
   直接連接到供應商程式碼

這樣可以避免將某一個供應商的影片假設硬編碼到核心中。外掛程式擁有
供應商介面；核心擁有功能合約與後援行為。

如果 OpenClaw 稍後新增一個新的領域，例如影片生成，請再次使用相同的
程序：先定義核心功能，然後讓供應商外掛程式
針對它註冊實作。

需要具體的推出檢查清單？請參閱
[功能Cookbook](/en/tools/capability-cookbook)。

## 合約與執行

外掛程式 API 介面經過刻意型別化並集中於
`OpenClawPluginApi` 中。該合約定義了支援的註冊點以及
外掛程式可能依賴的執行時期輔助程式。

為何這很重要：

- 外掛程式作者能獲得穩定的內部標準
- 核心可以拒絕重複的所有權，例如兩個外掛程式註冊相同的
  供應商 ID
- 啟動程序可以針對格式錯誤的註冊提供可採取行動的診斷資訊
- 合約測試可以強制執行捆綁外掛程式的所有權並防止無聲偏移

有兩層執行機制：

1. **執行時期註冊執行**
   外掛程式登錄區會在外掛程式載入時驗證註冊。範例：
   重複的供應商 ID、重複的語音供應商 ID，以及格式錯誤的
   註冊會產生外掛程式診斷資訊，而不是未定義的行為。
2. **合約測試**
   捆綁的外掛程式會在測試執行期間被擷取到合約登錄區中，以便
   OpenClaw 可以明確宣告所有權。目前這用於模型
   供應商、語音供應商、網路搜尋供應商，以及捆綁註冊
   所有權。

實際的效果是 OpenClaw 能預先知道哪個外掛程式擁有哪個
介面。這讓核心與通道能無縫組合，因為所有權是
明確宣告、經過型別化且可測試的，而非隱含的。

### 什麼屬於合約

良好的外掛程式合約是：

- 經過型別化
- 小型
- 特定於功能
- 由核心擁有
- 可被多個外掛程式重複使用
- 可由通道/功能消費而無需供應商知識

糟糕的外掛程式合約是：

- 隱藏在核心中的特定供應商政策
- 繞過註冊表的一次性外掛緊急出口
- 直接深入供應商實作的通道程式碼
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的臨時執行時期物件

如有疑問，請提高抽象層級：先定義能力，再讓外掛接入其中。

## 執行模型

原生 OpenClaw 外掛與 Gateway **在程序內** 執行。它們沒有被沙盒化。已載入的原生外掛擁有與核心程式碼相同的程序級信任邊界。

影響：

- 原生外掛可以註冊工具、網路處理程式、鉤子和服務
- 原生外掛的錯誤可能會導致 Gateway 當機或不穩定
- 惡意的原生外掛相當於在 OpenClaw 程序內執行任意程式碼

相容的套件預設情況下更安全，因為 OpenClaw 目前將它們視為元資料/內容套件。在目前的版本中，這主要是指打包的技能。

對於非打包的外掛，請使用允許清單和明確的安裝/載入路徑。請將工作區外插件視為開發時期的程式碼，而非生產環境預設值。

對於打包的工作區套件名稱，請保持外掛 ID 錨定在 npm 名稱上：預設為 `@openclaw/<id>`，或者當套件刻意暴露較狹窄的外掛角色時，使用批准的型別後綴，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要信任提示：

- `plugins.allow` 信任 **外掛 ID**，而非來源出處。
- 當啟用或加入允許清單時，與打包外掛具有相同 ID 的工作區外插件會刻意覆蓋打包的副本。
- 這是正常且有用的，可用於本地開發、修補程式測試和熱修復。

## 匯出邊界

OpenClaw 匯出的是能力，而非實作便利性。

保持能力註冊為公開。修剪非合約輔助匯出：

- 特定於打包外掛的輔助子路徑
- 非作為公開 API 預期的執行時期基礎架構子路徑
- 供應商特定的便利輔助函式
- 屬於實作細節的設定/入門輔助函式

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容的套件資訊清單與套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛設定 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 決定每個候選項的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` (或 `activate(api)` — 一個舊版別名) 掛鉤並將註冊資訊收集到外掛註冊表中
8. 將註冊表暴露給指令/執行時層級

<Note>`activate` 是 `register` 的舊版別名 — 載入器會解析存在的那一個 (`def.register ?? def.activate`) 並在同一點呼叫它。所有捆綁的外掛都使用 `register`；新外掛建議優先使用 `register`。</Note>

安全檢查機制發生在**執行時之前**。當入口點逃離外掛根目錄、路徑為全球可寫，或對於非捆綁外掛而言路徑所有權看起來可疑時，候選項會被封鎖。

### 資訊清單優先行為

資訊清單是控制平面的唯一真實來源。OpenClaw 使用它來：

- 識別外掛
- 探索已宣告的通道/技能/設定架構或套件功能
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/預留位置
- 顯示安裝/目錄元資料

對於原生外掛，執行時模組是資料平面部分。它會註冊實際行為，例如掛鉤、工具、指令或提供者流程。

### 載入器快取的內容

OpenClaw 會為以下內容保持短期進程內快取：

- 探索結果
- 資訊清單註冊表資料
- 已載入的外掛註冊表

這些快取可減少突發啟動和重複指令的開銷。它們可以安全地視為短期效能快取，而非持久化儲存。

效能備註：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取視窗。

## 註冊表模型

已載入的外掛不會直接變更隨機的核心全域變數。它們會註冊到中央外掛註冊表。

註冊表會追蹤：

- 外掛程式記錄 (身分、來源、起點、狀態、診斷)
- 工具
- 舊版掛鉤 和型別化掛鉤
- 通道
- 提供者
- 閘道 RPC 處理程序
- HTTP 路由
- CLI 註冊器
- 背景服務
- 外掛程式擁有的指令

核心功能隨後從該註冊表讀取，而不是直接與外掛程式模組對話。
這讓載入過程保持單向：

- 外掛程式模組 -> 註冊表註冊
- 核心執行時 -> 註冊表消耗

那種分離對可維護性至關重要。這意味著大多數核心介面只需要
一個整合點：「讀取註冊表」，而不是「針對每個外掛程式模組進行特殊處理」。

## 對話綁定回呼

綁定對話的外掛程式可以在批准解決後做出回應。

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

回呼負載欄位：

- `status`: `"approved"` 或 `"denied"`
- `decision`: `"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`: 已批准請求的已解決綁定
- `request`: 原始請求摘要、分離提示、傳送者 ID 和
  對話中繼資料

此回呼僅供通知。它不會改變誰被允許綁定對話，
並且在核心批准處理完成後執行。

## 提供者執行時掛鉤

提供者外掛程式現在有兩層：

- 清單中繼資料：`providerAuthEnvVars` 用於在執行時載入前進行低成本的環境驗證查找，
  加上 `providerAuthChoices` 用於在執行時載入前進行低成本的入門/驗證選擇
  標籤和 CLI 標誌中繼資料
- 設定時掛鉤：`catalog` / 舊版 `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍擁有通用 agent 循環、故障轉移、對話處理和工具策略。這些 hooks 是提供者特定行為的擴展表面，無需完整的自訂推論傳輸。

當提供者具有基於環境變數的憑證，且通用驗證/狀態/模型選擇路徑應在不加載插件運行時的情況下看到時，使用 manifest `providerAuthEnvVars`。當上架/驗證選擇 CLI 介面應在不加載提供者運行時的情況下知道提供者的 choice id、群組標籤和簡單的單一標誌驗證佈線時，使用 manifest `providerAuthChoices`。將提供者運行時 `envVars` 保留給操作員面向的提示，例如上架標籤或 OAuth client-id/client-secret 設定變數。

### Hook 順序與用法

對於模型/提供者插件，OpenClaw 大致按照此順序呼叫 hooks。「使用時機」欄是快速決策指南。

| #   | Hook                          | 功能                                                                | 使用時機                                                    |
| --- | ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `catalog`                     | 在 `models.json` 生成期間，將提供者設定發佈到 `models.providers` 中 | 提供者擁有目錄或基礎 URL 預設值                             |
| --  | _(內建模型查詢)_              | OpenClaw 首先嘗試正常的註冊表/目錄路徑                              | _(非 plugin hook)_                                          |
| 2   | `resolveDynamicModel`         | 針對提供者擁有但尚未在本地註冊表中的模型 ID 的同步備援              | 提供者接受任意的上游模型 ID                                 |
| 3   | `prepareDynamicModel`         | 非同步預熱，然後 `resolveDynamicModel` 再次執行                     | 提供者在解析未知 ID 之前需要網路元數據                      |
| 4   | `normalizeResolvedModel`      | 內嵌執行器使用解析出的模型之前的最終重寫                            | 提供者需要傳輸重寫，但仍使用核心傳輸                        |
| 5   | `capabilities`                | 提供者擁有的由共享核心邏輯使用的轉錄/工具元數據                     | 提供者需要轉錄/提供者家族的怪癖                             |
| 6   | `prepareExtraParams`          | 在通用串流選項包裝器之前的請求參數正規化                            | 提供者需要預設請求參數或特定於提供者的參數清理              |
| 7   | `wrapStreamFn`                | 應用通用包裝器之後的串流包裝器                                      | 提供者需要請求標頭/主體/模型相容性包裝器，而不需要自訂傳輸  |
| 8   | `formatApiKey`                | 驗證設定檔格式化器：儲存的設定檔變成執行時期 `apiKey` 字串          | 提供者儲存額外的驗證元數據，並需要自訂執行時期權杖形狀      |
| 9   | `refreshOAuth`                | OAuth 更新覆寫，用於自訂更新端點或更新失敗策略                      | 提供者不適用於共享的 `pi-ai` 更新器                         |
| 10  | `buildAuthDoctorHint`         | OAuth 更新失敗時附加的修復提示                                      | 提供者在更新失敗後需要提供者擁有的驗證修復指導              |
| 11  | `isCacheTtlEligible`          | 用於代理/回程提供者的提示快取策略                                   | 提供者需要特定於代理的快取 TTL 閘控                         |
| 12  | `buildMissingAuthMessage`     | 通用缺少驗證恢復訊息的替代                                          | 提供者需要特定於提供者的缺少驗證恢復提示                    |
| 13  | `suppressBuiltInModel`        | 過時的上游模型抑制加上可選的使用者面向錯誤提示                      | 提供者需要隱藏過時的上游行，或將其替換為供應商提示          |
| 14  | `augmentModelCatalog`         | 探索之後附加的合成/最終目錄行                                       | 提供者需要 `models list` 和選擇器中的合成向前相容行         |
| 15  | `isBinaryThinking`            | 二元思維提供者的開/關推理切換                                       | 提供者僅暴露二元思維開/關                                   |
| 16  | `supportsXHighThinking`       | 所選模型的 `xhigh` 推理支援                                         | Provider 僅在部分模型上需要 `xhigh`                         |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的預設 `/think` 等級                                    | Provider 擁有模型系列的預設 `/think` 策略                   |
| 18  | `isModernModelRef`            | 用於即時配置檔篩選和煙霧測試選擇的現代模型匹配器                    | Provider 擁有即時/煙霧測試的首選模型匹配                    |
| 19  | `prepareRuntimeAuth`          | 在推論前將已配置的憑證交換為實際的執行時期 token/key                | Provider 需要 token 交換或短效請求憑證                      |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的使用量/計費憑證及相關狀態表面                       | Provider 需要自訂的使用量/配額 token 解析或不同的使用量憑證 |
| 21  | `fetchUsageSnapshot`          | 在解析身份驗證後，獲取並正規化 Provider 特定的使用量/配額快照       | Provider 需要 Provider 特定的使用量端點或負載解析器         |

如果 Provider 需要完全自訂的線路協定或自訂請求執行器，
那是不同類別的擴充功能。這些 Hook 是針對仍在 OpenClaw
正常推論迴圈上執行的 Provider 行為。

### Provider 範例

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
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因為它擁有 Claude
  4.6 向前相容性、Provider 系列提示、身份驗證修復指導、使用量
  端點整合、提示快取資格，以及 Claude 預設/自適應
  思考策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities` 加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因為它擁有 GPT-5.4 向前相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 正規化、感知 Codex 的認證
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考 /
  即時模型策略。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel` 因為該提供者是透傳的，並且可能在 OpenClaw 的靜態目錄更新之前公開新的
  模型 ID；它還使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 以將
  提供者特定的請求標頭、路由元資料、推理補丁和
  提示快取策略排除在核心之外。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities` 加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot` 因為它
  需要提供者擁有的裝置登入、模型後援行為、Claude 轉錄
  怪癖、GitHub token -> Copilot token 交換，以及提供者擁有的使用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog` 加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot` 因為它
  仍然在核心 OpenAI 傳輸上運行，但擁有其傳輸/基礎 URL
  正規化、OAuth 重新整理後援策略、預設傳輸選擇、
  合成 Codex 目錄行以及 ChatGPT 使用量端點整合。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因為它們擁有 Gemini 3.1 的向後相容回退機制和
  現代模型匹配功能；Gemini CLI OAuth 還使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 進行 token 格式化、token
  解析以及配額端點的連線。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共享
  的 OpenAI 傳輸層，但需要提供者擁有的思考 Payload 標準化功能。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供者擁有的請求標頭、
  推理 Payload 標準化、Gemian 轉錄提示以及 Anthropic
  快取 TTL 閘控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 回退機制、
  `tool_stream` 預設值、二元思考 UX、現代模型匹配，以及
  使用權限驗證和配額獲取功能。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities`，以將
  轉錄/工具方面的特殊行為保留在核心之外。
- 僅目錄的內建提供者（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）
  僅使用 `catalog`。
- MiniMax 和小米使用 `catalog` 加上 usage hooks，因為它們的 `/usage`
  行為由外掛程式擁有，儘管推理仍透過共享
  傳輸層運行。

## 執行時期輔助程式

外掛程式可以透過 `api.runtime` 存取選定的核心協助程式。對於 TTS：

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

- `textToSpeech` 傳回檔案/語音備忘錄介面的標準核心 TTS 輸出酬載。
- 使用核心 `messages.tts` 組態和提供者選取。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對於每個提供者是可選的。將其用於供應商擁有的語音選擇器或設定流程。
- 語音清單可以包含更豐富的中繼資料，例如地區設定、性別和人格標籤，以用於具備提供者感知能力的選擇器。
- OpenAI 和 ElevenLabs 目前支援電話通訊。Microsoft 則否。

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
- 使用語音提供者來處理供應商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會正規化為 `microsoft` 提供者 ID。
- 首選的擁有權模型是以公司為導向：隨著 OpenClaw 新增這些功能合約，一個供應商外掛程式可以擁有文字、語音、影像和未來的媒體提供者。

對於影像/音訊/影片理解，外掛程式會註冊一個具類型的媒體理解提供者，而不是通用的索引鍵/值包：

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

- 將編排、後援、組態和通道連線保留在核心中。
- 將供應商行為保留在提供者外掛程式中。
- 加法性擴充應保持具類型：新的可選方法、新的可選結果欄位、新的可選功能。
- 如果 OpenClaw 稍後新增新功能（例如影片生成），請先定義核心功能合約，然後再讓供應商外掛程式針對其進行註冊。

對於媒體理解執行階段協助程式，外掛程式可以呼叫：

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

對於音訊轉錄，外掛程式可以使用媒體理解執行階段或較舊的 STT 別名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

備註：

- `api.runtime.mediaUnderstanding.*` 是影像/音訊/影片理解的首選共享介面。
- 使用核心媒體理解音訊組態 (`tools.media.audio`) 和提供者後援順序。
- 當未產生轉錄輸出時（例如已跳過/不支援的輸入），會傳回 `{ text: undefined }`。
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

- `provider` 和 `model` 是每次執行的選用覆寫，而非持續性的工作階段變更。
- OpenClaw 僅對受信任的呼叫者遵守這些覆寫欄位。
- 對於外掛程式擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 進行選用。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的標準 `provider/model` 目標，或使用 `"*"` 以明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然可以運作，但覆寫請求會被拒絕，而不是無聲地後援。

對於網路搜尋，外掛程式可以使用共用的執行時段輔助程式，而不是
深入探查代理程式工具連線：

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

注意事項：

- 將提供者選取、憑證解析和共用請求語意保留在核心中。
- 使用網路搜尋提供者進行供應商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴代理程式工具包裝函式的功能/通道外掛程式的首選共用介面。

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

- `generate(...)`：使用設定的圖像生成提供者鏈結生成圖像。
- `listProviders(...)`：列出可用的圖像生成提供者及其功能。

## Gateway HTTP 路由

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

- `path`：Gateway HTTP 伺服器下的路由路徑。
- `auth`：必要。使用 `"gateway"` 要求標準 Gateway 驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/Webhook 驗證。
- `match`：選用。`"exact"` (預設) 或 `"prefix"`。
- `replaceExisting`：選用。允許相同的外掛程式取代其自己現有的路由註冊。
- `handler`：當路由處理請求時傳回 `true`。

注意事項：

- `api.registerHttpHandler(...)` 已移除，將會導致外掛載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 外掛路由必須明確宣告 `auth`。
- 除非 `replaceExisting: true`，否則會拒絕精確的 `path + match` 衝突，且一個外掛無法取代另一個外掛的路由。
- 具有不同 `auth` 層級的重疊路由會被拒絕。請將 `exact`/`prefix` 貫穿鏈保持在同一個授權層級上。

## 外掛 SDK 匯入路徑

編寫外掛時，請使用 SDK 子路徑，而不是單一的 `openclaw/plugin-sdk` 匯入：

- 使用 `openclaw/plugin-sdk/plugin-entry` 來處理外掛註冊原語。
- 使用 `openclaw/plugin-sdk/core` 來處理通用的共用外掛合約。
- 使用穩定的通道原語，例如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress` 進行共用的設定/授權/回覆/Webhook
  連線。`channel-inbound` 是 debounce、提及匹配、
  信封格式化和輸入信封內容輔助函式的共用模組。
- 使用網域子路徑，例如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/allow-from`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/infra-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/status-helpers`、
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime` 進行共用的執行時期/設定輔助。
- `openclaw/plugin-sdk/channel-runtime` 僅作為相容性填充層保留。
  新程式碼應改為匯入更精細的原語。
- 打包擴充功能的內部細節保持私有。外部擴充功能應僅使用 `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心測試代碼可以使用擴充功能套件根目錄下的儲存庫公開進入點，例如 `index.js`、`api.js`、`runtime-api.js`、`setup-entry.js`，以及範圍狹窄的檔案，例如 `login-qr-api.js`。切勿從核心或其他擴充功能匯入擴充功能套件的 `src/*`。
- 儲存庫進入點分工：`<plugin-package-root>/api.js` 是輔助函式/型別的桶檔，`<plugin-package-root>/runtime-api.js` 是僅限執行時的桶檔，`<plugin-package-root>/index.js` 是打包擴充功能的進入點，而 `<plugin-package-root>/setup-entry.js` 是設定擴充功能的進入點。
- 不再保留任何打包的特定通道品牌的公開子路徑。通道特定的輔助函式和執行時縫隙位於 `<plugin-package-root>/api.js` 和 `<plugin-package-root>/runtime-api.js` 之下；公開 SDK 契約改為通用的共享原語。

相容性備註：

- 對於新程式碼，請避免使用根目錄 `openclaw/plugin-sdk` 桶檔。
- 優先使用狹窄穩定的原語。較新的 setup/pairing/reply/feedback/contract/inbound/threading/command/secret-input/webhook/infra/allowlist/status/message-tool 子路徑是預期用於新打包和外部擴充功能工作的契約。目標解析/比對屬於 `openclaw/plugin-sdk/channel-targets`。訊息操作閘門和反應訊息 ID 輔助函式屬於 `openclaw/plugin-sdk/channel-actions`。
- 打包的擴充功能特定輔助函式桶檔預設不穩定。如果某個輔助函式僅由打包的擴充功能需要，請將其保留在擴充功能的本機 `api.js` 或 `runtime-api.js` 縫隙之後，而不是將其提升至 `openclaw/plugin-sdk/<extension>`。
- 新的共享輔助函式縫隙應為通用的，而非特定通道品牌的。共享目標解析屬於 `openclaw/plugin-sdk/channel-targets`；特定通道的內部細節保留在擁有擴充功能的本機 `api.js` 或 `runtime-api.js` 縫隙之後。
- 特定功能的子路徑（例如 `image-generation`、
  `media-understanding` 和 `speech`）之所以存在，是因為打包/原生外掛目前
  使用它們。它們的存在本身並不代表每個匯出的輔助函式都是
  長期凍結的外部合約。

## 訊息工具架構

外掛應該擁有頻道特定的 `describeMessageTool(...)` 架構
貢獻。請將提供者專用欄位保留在外掛中，而不是在共享核心裡。

對於共享的可移植架構片段，請重用透過
`openclaw/plugin-sdk/channel-actions` 匯出的通用輔助函式：

- `createMessageToolButtonsSchema()` 用於按鈕網格風格的負載
- `createMessageToolCardSchema()` 用於結構化卡片負載

如果架構形狀只對某一個提供者有意義，請在該外掛自己的
原始碼中定義它，而不是將其提升到共享 SDK 中。

## 頻道目標解析

頻道外掛應該擁有頻道特定的目標語意。保持共享
的出站主機通用性，並使用訊息介接卡表面來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查找之前，標準化目標
  應被視為 `direct`、`group` 還是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入
  應該直接跳到類似 ID 的解析，而不是目錄搜尋。
- 當核心在標準化或目錄未命中後
  需要最終的提供者擁有解析時，`messaging.targetResolver.resolveTarget(...)` 是外掛後備方案。
- 一旦目標解析完成，`messaging.resolveOutboundSessionRoute(...)` 負責提供者專用的
  會話路由建構。

建議的拆分：

- 使用 `inferTargetChatType` 進行應在搜尋對等/群組之前
  發生的類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 進行提供者專用的標準化後備，而不是用於
  廣泛的目錄搜尋。
- 將提供者原生 ID（如聊天 ID、執行緒 ID、JID、代號和房間
  ID）保留在 `target` 值或提供者專用參數中，而不是在通用 SDK
  欄位中。

## 設定支援的目錄

從設定匯出目錄條目的外掛程式應將該邏輯保留在
外掛程式中，並重複使用來自
`openclaw/plugin-sdk/directory-runtime` 的共用協助程式。

當通道需要支援設定的對等/群組時使用此項，例如：

- 由允許清單驅動的 DM 對等
- 已設定的通道/群組對應
- 帳戶範圍的靜態目錄後備

`directory-runtime` 中的共用協助程式僅處理一般操作：

- 查詢篩選
- 限制套用
- 去重/正規化協助程式
- 建構 `ChannelDirectoryEntry[]`

通道特定的帳戶檢查和 ID 正規化應保留在
外掛程式實作中。

## 提供者目錄

提供者外掛程式可以使用
`registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型目錄。

`catalog.run(...)` 會傳回與 OpenClaw 寫入
`models.providers` 相同的形狀：

- 單一提供者條目的 `{ provider }`
- 多個提供者條目的 `{ providers }`

當外掛程式擁有提供者特定的模型 ID、基礎 URL
預設值，或需授權的模型中繼資料時，請使用 `catalog`。

`catalog.order` 控制外掛程式的目錄相對於 OpenClaw
內建隱含提供者的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當驗證設定檔存在時出現的提供者
- `paired`：綜合多個相關提供者條目的提供者
- `late`：最後一輪，在其他隱含提供者之後

後面的提供者在金鑰衝突時勝出，因此外掛程式可以使用相同的提供者 ID
刻意覆寫內建的提供者條目。

相容性：

- `discovery` 仍可作為舊版別名運作
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的插件註冊了通道，請優先實作
`plugin.config.inspectAccount(cfg, accountId)` 以及 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。允許假設憑證
  已完全具體化，並在缺少所需密鑰時快速失敗。
- 僅讀指令路徑，例如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修復流程，不應僅為了描述設定就需要具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅傳回描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要僅為了回報僅讀可用性就傳回原始權杖值。傳回
  `tokenStatus: "available"`（以及相符的來源欄位）對於狀態式指令
  來說就足夠了。
- 當憑證是透過 SecretRef 設定但在目前指令路徑中無法使用時，
  請使用 `configured_unavailable`。

這讓僅讀指令能夠回報「已設定但在本指令路徑中無法使用」，
而不是崩潰或錯誤地回報帳戶未設定。

## 套件包

外掛程式目錄可能包含一個帶有 `openclaw.extensions` 的
`package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛程式。如果套件包列出了多個擴充功能，
外掛程式 ID 會變成 `name/<fileBase>`。

如果您的外掛程式匯入了 npm 相依項，請將其安裝在該目錄中，
以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 條目
必須保留在外掛程式目錄內。脫離套件目錄的條目將被拒絕。

安全提示：`openclaw plugins install` 使用
`npm install --omit=dev --ignore-scripts` 安裝外掛相依性（無生命週期腳本，執行時期無開發相依性）。請保持外掛相依性樹為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量級的僅用於設定的模組。
當 OpenClaw 需要針對已停用的通道外掛提供設定介面，或者
當通道外掛已啟用但尚未設定時，它會載入 `setupEntry`
而不是完整的外掛入口點。當您的主要外掛入口點也連接了工具、掛鉤或其他僅限
執行時期的程式碼時，這能讓啟動和設定過程更輕量。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛在閘道的預監聽啟動階段選擇使用相同的 `setupEntry` 路徑，
即使該通道已經設定過。

僅當 `setupEntry` 完全涵蓋了閘道開始監聽前必須存在的啟動介面時，才使用此選項。
實務上，這意味著設定入口點必須註冊啟動所依賴的每個通道擁有的能力，例如：

- 通道註冊本身
- 任何必須在閘道開始監聽之前就可用的 HTTP 路由
- 任何必須在同一時段內存在的閘道方法、工具或服務

如果您的完整入口點仍然擁有任何必需的啟動能力，請勿啟用
此旗標。請保持外掛為預設行為，並讓 OpenClaw 在啟動期間載入
完整入口點。

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

### 通道目錄元資料

通道外掛可以透過 `openclaw.channel` 宣傳設定/探索元資料，並
透過 `openclaw.install` 提供安裝提示。這能讓核心目錄保持無資料狀態。

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

OpenClaw 也可以合併 **外部通道目錄**（例如，MPM
登錄檔匯出）。將 JSON 檔案放置在以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一個或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含
`{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

## Context engine 插件

Context engine 插件擁有會話上下文的編排，用於攝取、組裝
和壓縮。請使用 `api.registerContextEngine(id, factory)` 從您的插件註冊它們，然後使用
`plugins.slots.contextEngine` 選擇活動引擎。

當您的插件需要替換或擴展預設的上下文流程，而不僅僅是添加記憶體搜尋或掛鉤時，請使用此功能。

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

如果您的引擎**不**擁有壓縮算法，請保持 `compact()`
已實作並明確地委派它：

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

## 添加新功能

當插件需要不符合目前 API 的行為時，不要使用私有繞過方式繞過
插件系統。請添加缺失的功能。

建議順序：

1. 定義核心合約
   決定核心應該擁有哪些共享行為：策略、後備、配置合併、
   生命週期、面向通道的語意和運行時輔助形狀。
2. 添加類型化插件註冊/運行時介面
   使用最小有用的類型化功能介面擴展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心 + 通道/功能消費者
   通道和功能插件應該通過核心使用新功能，
   而不是直接導入供應商實作。
4. 註冊供應商實作
   供應商插件然後針對該功能註冊它們的後端。
5. 添加合約覆蓋率
   添加測試，以便所有權和註冊形狀隨著時間推移保持明確。

這就是 OpenClaw 在不變成針對某個供應商的世界觀的硬編碼的情況下保持主見的方式。有關具體的檔案檢查清單和實作範例，請參閱 [Capability Cookbook](/en/tools/capability-cookbook)。

### 功能檢查清單

當您添加新功能時，實作通常應該同時涉及這些介面：

- `src/<capability>/types.ts` 中的核心合約類型
- `src/<capability>/runtime.ts` 中的核心運行器/運行時輔助程式
- 在 `src/plugins/types.ts` 中的 plugin API 註冊介面
- 在 `src/plugins/registry.ts` 中的 plugin registry 佈線
- 在 `src/plugins/runtime/*` 中的 plugin runtime 暴露，當 feature/channel
  外掛需要使用它時
- 在 `src/test-utils/plugin-registration.ts` 中的 capture/test 輔助函數
- 在 `src/plugins/contracts/registry.ts` 中的 ownership/contract 斷言
- 在 `docs/` 中的 operator/plugin 文件

如果其中一個介面缺失，通常表示該能力尚未
完全整合。

### 能力範本

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
const clip = await api.runtime.videoGeneration.generateFile({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

合約測試模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

這讓規則保持簡單：

- core 擁有能力合約 + 編排
- vendor plugins 擁有 vendor 實作
- feature/channel plugins 使用 runtime 輔助工具
- 合約測試讓所有權明確化

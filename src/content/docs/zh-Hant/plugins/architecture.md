---
summary: "Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Plugin Internals"
sidebarTitle: "Internals"
---

# Plugin Internals

<Info>這是**深度架構參考**。若需實用指南，請參閱： - [安裝與使用外掛](/en/tools/plugin) — 使用者指南 - [快速入門](/en/plugins/building-plugins) — 第一個外掛教學 - [通道外掛](/en/plugins/sdk-channel-plugins) — 建構訊息傳遞通道 - [提供者外掛](/en/plugins/sdk-provider-plugins) — 建構模型提供者 - [SDK 概覽](/en/plugins/sdk-overview) — 匯入映射與註冊 API</Info>

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
| 圖像生成        | `api.registerImageGenerationProvider(...)`    | `openai`、`google`        |
| 網路搜尋        | `api.registerWebSearchProvider(...)`          | `google`                  |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                    | `msteams`、`matrix`       |

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

- **純功能 (plain-capability)** -- 僅註冊一種功能類型（例如僅提供者的外掛程式，如 `mistral`）
- **混合能力** -- 註冊多種能力類型（例如
  `openai` 擁有文本推理、語音、媒體理解和圖像
  生成）
- **僅掛鉤** -- 僅註冊鉤子（類型化或自定義），不註冊能力、
  工具、命令或服務
- **非能力** -- 註冊工具、命令、服務或路由，但不註冊
  能力

使用 `openclaw plugins inspect <id>` 查看插件的形式和能力
細分。詳情請參閱 [CLI 參考](/en/cli/plugins#inspect)。

### 舊版鉤子

`before_agent_start` 鉤子作為僅掛鉤插件的兼容路徑仍受支持。
舊的實際插件仍然依賴它。

方向：

- 保持其正常運作
- 將其記錄為舊版
- 優先使用 `before_model_resolve` 進行模型/提供者覆蓋工作
- 優先使用 `before_prompt_build` 進行提示詞變異工作
- 僅在實際使用量下降且 fixture 覆蓋率證明遷移安全後移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到
其中一個標籤：

| 訊號                       | 含義                                           |
| -------------------------- | ---------------------------------------------- |
| **config valid**           | 設定解析正常且外掛解析成功                     |
| **compatibility advisory** | 外掛使用受支援但較舊的模式（例如 `hook-only`） |
| **legacy warning**         | 外掛使用 `before_agent_start`，該項目已棄用    |
| **hard error**             | 設定無效或外掛載入失敗                         |

`hook-only` 和 `before_agent_start` 目前都不會導致您的外掛中斷 --
`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些
訊號也會顯示在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛系統有四個層級：

1. **清單 + 探索**
   OpenClaw 從設定的路徑、工作區根目錄、全域擴充功能根目錄和套件擴充功能中尋找候選外掛。探索首先會讀取原生的 `openclaw.plugin.json` 清單以及支援的套件清單。
2. **啟用 + 驗證**
   核心決定已探索的外掛是啟用、停用、被封鎖，還是被選擇用於獨佔插槽（例如記憶體）。
3. **執行時期載入**
   原生 OpenClaw 外掛透過 jiti 在程式內載入，並將功能註冊到中央註冊表中。相容的套件會被正規化為註冊表記錄，而不匯入執行時期程式碼。
4. **介面消耗**
   OpenClaw 的其餘部分會讀取註冊表以公開工具、頻道、提供者設定、掛鉤、HTTP 路由、CLI 指令和服務。

重要的設計邊界：

- discovery + config validation should work from **manifest/schema metadata**
  without executing plugin code
- native runtime behavior comes from the plugin module's `register(api)` path

That split lets OpenClaw validate config, explain missing/disabled plugins, and
build UI/schema hints before the full runtime is active.

### Channel plugins and the shared message tool

Channel plugins do not need to register a separate send/edit/react tool for
normal chat actions. OpenClaw keeps one shared `message` tool in core, and
channel plugins own the channel-specific discovery and execution behind it.

The current boundary is:

- core owns the shared `message` tool host, prompt wiring, session/thread
  bookkeeping, and execution dispatch
- channel plugins own scoped action discovery, capability discovery, and any
  channel-specific schema fragments
- 通道插件透過其操作介面卡執行最終操作

對於通道插件，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。該統一發現呼叫允許插件同時返回其可見操作、功能和架構貢獻，以便這些部分不會分離。

Core 將執行時作用域傳遞到該發現步驟中。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

這對於上下文感知的插件很重要。頻道可以根據活動帳戶、當前房間/執行緒/訊息或受信任的請求者身分來隱藏或顯示訊息操作，而無需在核心 `message` 工具中硬編碼特定頻道的分支。

這就是為什麼嵌入式執行器路由變更仍然是插件工作的原因：執行器負責將當前聊天/會話身分轉發到插件發現邊界，以便共享的 `message` 工具為當前輪次暴露正確的頻道擁有的介面。

對於通道擁有的執行輔助程式，套件化的外掛應將執行
執行時間保留在其自己的擴充模組中。Core 不再擁有 Discord、
Slack、Telegram 或 WhatsApp 訊息動作執行時間於 `src/agents/tools` 之下。
我們不發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，且套件化
的外掛應直接從其擴充擁有的模組匯入它們自己的本機執行時間程式碼。

特別是對於投票，有兩條執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的通道的共享基準
- `actions.handleAction("poll")` 是通道特定
  投票語意或額外投票參數的首選路徑

Core 現在將共享投票解析延遲到外掛投票調度拒絕該動作之後，因此外掛擁有的投票處理程式可以接受通道特定的投票欄位，而不會先被通用投票解析程式阻擋。

請參閱[載入管線](#load-pipeline)以了解完整的啟動順序。

## 功能擁有權模型

OpenClaw 將原生插件視為**公司**或**功能**的擁有權邊界，而不是不相關整合的雜湊包。

這意味著：

- 公司插件通常應該擁有該公司所有面向 OpenClaw 的介面
- 功能插件通常應該擁有其引進的完整功能介面
- 通道應該使用共享的核心功能，而不是臨時重新實作提供者行為

範例：

- 內建的 `openai` 插件擁有 OpenAI 模型提供者行為以及 OpenAI 語音 + 媒體理解 + 圖像生成行為
- 內建的 `elevenlabs` 插件擁有 ElevenLabs 語音行為
- 內建的 `microsoft` 插件擁有 Microsoft 語音行為
- 內建的 `google` 外掛程式擁有 Google 模型提供者行為，以及 Google
  媒體理解 + 圖像生成 + 網路搜尋行為
- 內建的 `minimax`、`mistral`、`moonshot` 和 `zai` 外掛程式擁有其
  媒體理解後端
- `voice-call` 外掛程式是一個功能外掛程式：它擁有通訊傳輸、工具、
  CLI、路由和運行時，但它使用核心 TTS/STT 能力，而不是
  發明第二個語音堆疊

預期的最終狀態是：

- OpenAI 存在於一個外掛程式中，即使它涵蓋了文字模型、語音、圖像和
  未來的影片
- 其他供應商可以為其自己的領域做同樣的事情
- 通道不關心哪個供應商外掛程式擁有提供者；它們使用核心公開的
  共用能力合約

這是關鍵區別：

- **plugin** = 所有權邊界
- **capability** = 多個外掛程式可以實作或使用的核心合約

所以如果 OpenClaw 新增一個新的領域（例如影片），第一個問題不是「哪個供應商應該將影片處理硬編碼？」。第一個問題是「核心影片能力合約是什麼？」。一旦該合約存在，供應商外掛程式就可以針對它進行註冊，而頻道/功能外掛程式則可以使用它。

如果該能力尚不存在，通常的正確做法是：

1. 在核心中定義缺失的能力
2. 以類型化的方式透過外掛程式 API/執行階段公開它
3. 針對該能力連接頻道/功能
4. 讓供應商外掛程式註冊實作

這使所有權保持明確，同時避免依賴單一供應商或一次性外掛程式特定程式碼路徑的核心行為。

### 能力分層

在決定程式碼所屬位置時，請使用此心智模型：

- **核心能力層**：共享編排、策略、後備、配置
  合併規則、傳遞語義以及型別化合約
- **供應商外掛層**：供應商特定的 API、驗證、模型目錄、語音
  合成、影像生成、未來的視訊後端、使用量端點
- **通道/功能外掛層**：Slack/Discord/語音通話/等整合
  消費核心能力並將其呈現在介面上

例如，TTS 遵循此形狀：

- 核心擁有回覆時間 TTS 策略、後備順序、偏好設定以及通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消費電話 TTS 執行時期輔助程式

未來的能力應優先採用相同的模式。

### 多能力公司外掛範例

企業外掛程式在外部應該給人一種協調一致的感覺。如果 OpenClaw 對模型、語音、媒體理解和網路搜尋有共享契約，廠商可以在一個地方擁有所有介面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import { buildOpenAISpeechProvider, createPluginBackedWebSearchProvider, describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider(
      buildOpenAISpeechProvider({
        id: "exampleai",
        // vendor speech config
      }),
    );

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

- 一個外掛程式擁有廠商介面
- 核心仍然擁有功能契約
- 通道和功能外掛程式使用 `api.runtime.*` 輔助函式，而非廠商程式碼
- 契約測試可以斷言外掛程式註冊了它聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已經將影像/音訊/影片理解視為一個共享功能。相同的擁有權模型也適用於此：

1. 核心定義媒體理解契約
2. 廠商外掛程式視情況註冊 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道和功能插件會使用共享的核心行為，而不是直接連接到廠商程式碼

這樣可以避免將某個提供者的影片假設硬編碼到核心中。外掛擁有廠商介面；核心則擁有功能合約和後援行為。

如果 OpenClaw 稍後新增了一個領域，例如影片生成，請再次使用相同的順序：先定義核心功能，然後讓廠商外掛註冊其實作。

需要具體的推出檢查清單？請參閱
[功能食譜](/en/tools/capability-cookbook)。

## 合約與執行

外掛 API 介面經過刻意型別定義並集中在
`OpenClawPluginApi` 中。該合約定義了支援的註冊點以及外掛可能依賴的執行時期輔助工具。

為何這很重要：

- 外掛作者能獲得一個穩定的內部標準
- core can reject duplicate ownership such as two plugins registering the same
  provider id
- startup can surface actionable diagnostics for malformed registration
- contract tests can enforce bundled-plugin ownership and prevent silent drift

There are two layers of enforcement:

1. **runtime registration enforcement**
   The plugin registry validates registrations as plugins load. Examples:
   duplicate provider ids, duplicate speech provider ids, and malformed
   registrations produce plugin diagnostics instead of undefined behavior.
2. **contract tests**
   Bundled plugins are captured in contract registries during test runs so
   OpenClaw can assert ownership explicitly. Today this is used for model
   providers, speech providers, web search providers, and bundled registration
   ownership.

實際效果是，OpenClaw 一開始就知道哪個外掛擁有哪個介面。這讓核心與通道能夠無縫組合，因為擁有權是被宣告、定型且可測試的，而非隱含的。

### 合約中應包含什麼

良好的外掛合約具備以下特點：

- 具備型別
- 小型
- 針對特定功能
- 由核心擁有
- 可由多個外掛重複使用
- 可由通道或功能在不了解供應商的情況下使用

糟糕的外掛合約具備以下特點：

- 隱藏在核心中的特定供應商政策
- 繞過登錄檔的一次性外掛緊急出口
- 直接存取供應商實作的通道程式碼
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的特設執行階段物件

如有疑問，請提高抽象層級：先定義功能，再讓外掛插入其中。

## 執行模型

原生 OpenClaw 外掛程式與 Gateway **在進程內**（in-process）一起運行。它們不
受沙盒保護。載入的原生外掛程式具有與核心程式碼相同的進程級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、掛鉤（hooks）和服務
- 原生外掛程式的錯誤可能導致 Gateway 當機或不穩定
- 惡意的原生外掛程式相當於在 OpenClaw 進程內執行任意程式碼

相容套件（Compatible bundles）預設更安全，因為 OpenClaw 目前將其
視為元資料/內容包。在目前的版本中，這主要指打包的技能（skills）。

對於非打包的外掛程式，請使用允許清單和明確的安裝/載入路徑。請將
工作區外掛程式視為開發階段程式碼，而非生產環境預設值。

對於捆綁的工作區套件名稱，請預設將外掛程式 id 固定在 npm
名稱中：`@openclaw/<id>`，或是經核准的類型後綴，例如
`-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`，當
該套件刻意暴露較狹窄的外掛程式角色時。

重要的信任提示：

- `plugins.allow` 信任的是**外掛程式 id**，而非來源出處。
- 當相同 id 的工作區外掛程式被啟用/加入允許清單時，該外掛程式會刻意遮蔽
  捆綁的副本。
- 這很正常，且對於本地開發、修補測試和熱修復很有用。

## 匯出邊界

OpenClaw 匯出的是能力，而非實作便利性。

保持能力註冊為公開。修剪非合約的輔助匯出：

- 打包外掛特定的輔助子路徑
- 非公共 API 的運行時管道子路徑
- 特定於供應商的便捷輔助程式
- 作為實作細節的設置/入門輔助程式

## 載入流程

在啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容的打包資訊清單和套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛組態 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 決定每個候選項是否啟用
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` 掛鉤並將註冊資訊收集到外掛註冊表中
8. 將註冊表公開給命令/執行時層

安全檢查發生在執行時**之前**。當入口點超出外掛根目錄、路徑為全域可寫，或是對於未打包的外掛其路徑所有權看起來可疑時，候選項會被阻擋。

### 優先清單行為

清單是控制平面的唯一事實來源。OpenClaw 使用它來：

- 識別外掛
- 探索已宣告的通道/技能/配置結構描述或捆綁功能
- 驗證 `plugins.entries.<id>.config`
- 增強控制 UI 標籤/佔位符
- 顯示安裝/目錄元數據

對於原生外掛，執行時模組是數據平面部分。它註冊實際行為，例如 hooks、tools、commands 或 provider flows。

### 載入器緩存的內容

OpenClaw 會為以下內容保持短暫的進程內緩存：

- 探索結果
- 清單註冊表數據
- 已載入的外掛註冊表

這些快取減少了突發啟動和重複命令的開銷。可以安全地將它們視為短效效能快取，而不是持久化。

效能提示：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取時間視窗。

## 註冊表模型

已載入的外掛程式不會直接修改隨機的核心全域變數。它們會註冊到一個中央外掛程式註冊表中。

註冊表追蹤：

- 外掛程式記錄（身分、來源、起源、狀態、診斷）
- 工具
- 舊版 Hook 和類型化 Hook
- 頻道
- 提供者
- 閘道 RPC 處理程序
- HTTP 路由
- CLI 註冊器
- 背景服務
- 外掛程式擁有的指令

核心功能然後從該註冊表讀取，而不是直接與外掛程式模組通訊。這使得載入過程變為單向：

- 外掛程式模組 -> 註冊表註冊
- 核心執行時期 -> 登錄表使用

這種區分對可維護性至關重要。這意味著大多數核心介面只需要一個整合點：「讀取登錄表」，而不是「針對每個插件模組進行特殊處理」。

## 對話綁定回呼

綁定對話的插件可以在審核通過後做出回應。

使用 `api.onConversationBindingResolved(...)` 以在綁定請求被批准或拒絕後接收回呼：

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

回呼承載欄位：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的解析綁定
- `request`：原始請求摘要、分離提示、傳送者 ID 和對話元數據

此回調僅為通知。它不會改變誰被允許綁定對話，且在核心批准處理完成後運行。

## 提供者運行時鉤子

提供者外掛現在有兩層：

- 清單元數據 (manifest metadata)：`providerAuthEnvVars` 用於在運行時載入前進行低成本的環境授權查找，以及 `providerAuthChoices` 用於在運行時載入前進行低成本的入門/授權選擇標籤和 CLI 標誌元數據
- 配置時間鉤子 (config-time hooks)：`catalog` / 舊版 `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍然擁有通用代理迴圈、故障轉移、紀錄處理和工具策略。這些掛鉤是針對供應商特定行為的擴充介面，而無需完整的自訂推論傳輸。

當供應商具有基於環境變數的憑證，且通用授權/狀態/模型選擇器路徑應在無需載入外掛程式執行時間的情況下看到時，請使用清單 `providerAuthEnvVars`。當上架/授權選擇 CLI 介面應該知道供應商的選擇 ID、群組標籤和簡單的單一旗標授權接線，而無需載入供應商執行時間時，請使用清單 `providerAuthChoices`。將供應商執行時間 `envVars` 用於操作員面向的提示，例如上架標籤或 OAuth client-id/client-secret 設定變數。

### 掛鉤順序與用法

對於模型/供應商外掛程式，OpenClaw 大致按此順序呼叫掛鉤。「使用時機」欄是快速決策指南。

| #   | 掛鉤                          | 作用                                                             | 使用時機                                                         |
| --- | ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `catalog`                     | 在 `models.json` 生成期間，將提供者配置發佈到 `models.providers` | 提供者擁有目錄或基礎 URL 預設值                                  |
| --  | （內建模型查找）              | OpenClaw 優先嘗試正常的註冊表/目錄路徑                           | （非插件鉤子）                                                   |
| 2   | `resolveDynamicModel`         | 針對本地註冊表中尚未存在的提供者自有模型 ID 的同步後備方案       | 提供者接受任意的上游模型 ID                                      |
| 3   | `prepareDynamicModel`         | 非同步預熱，然後 `resolveDynamicModel` 再次執行                  | 提供者在解析未知 ID 之前需要網路元資料                           |
| 4   | `normalizeResolvedModel`      | 嵌入式執行器使用解析後的模型之前的最終重寫                       | 提供者需要傳輸重寫，但仍使用核心傳輸                             |
| 5   | `capabilities`                | 由共享核心邏輯使用的 Provider 擁有的傳輸/工具元數據              | Provider 需要傳輸/Provider 系列的 quirks                         |
| 6   | `prepareExtraParams`          | 通用串流選項包裝器之前的請求參數標準化                           | Provider 需要預設請求參數或各 Provider 的參數清理                |
| 7   | `wrapStreamFn`                | 應用通用包裝器後的串流包裝器                                     | Provider 需要不包含自訂傳輸的請求標頭/主體/模型相容性包裝器      |
| 8   | `formatApiKey`                | Auth 設定檔格式器：儲存的設定檔變成執行時期 `apiKey` 字串        | Provider 儲存額外的 Auth 元數據，並需要自訂的執行時期 token 形狀 |
| 9   | `refreshOAuth`                | OAuth 重新整理覆寫，用於自訂重新整理端點或重新整理失敗策略       | Provider 不適合共享的 `pi-ai` 重新整理器                         |
| 10  | `buildAuthDoctorHint`         | 當 OAuth 重新整理失敗時附加的修復提示                            | 提供者需要在重新整理失敗後取得提供者擁有的驗證修復指引           |
| 11  | `isCacheTtlEligible`          | 代理/回傳提供者的提示快取原則                                    | 提供者需要特定的代理快取 TTL 閘控                                |
| 12  | `buildMissingAuthMessage`     | 通用缺少驗證復原訊息的替代方案                                   | 提供者需要特定的提供者缺少驗證復原提示                           |
| 13  | `suppressBuiltInModel`        | 過時的上游模型抑制加上可選的使用者面向錯誤提示                   | 提供者需要隱藏過時的上游列或將其替換為廠商提示                   |
| 14  | `augmentModelCatalog`         | 在探索之後附加的合成/最終目錄列                                  | 提供者需要在 `models list` 和選擇器中包含合成向前相容列          |
| 15  | `isBinaryThinking`            | 適用於二元思維提供者的開關推理解切換                             | 提供者僅公開二元思維開關                                         |
| 16  | `supportsXHighThinking`       | 為選定模型 `xhigh` 推理支援                                      | 提供者僅希望對部分模型啟用 `xhigh`                               |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的預設 `/think` 層級                                 | 提供者擁有模型系列的預設 `/think` 政策                           |
| 18  | `isModernModelRef`            | 用於即時設定檔過濾器和快速選擇的新型模型匹配器                   | 提供者擁有即時/快速首選模型匹配                                  |
| 19  | `prepareRuntimeAuth`          | 在推論之前將已設定的憑證交換為實際的執行時期 Token/金鑰          | 提供者需要 Token 交換或短期請求憑證                              |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的使用/計費憑證及相關狀態介面                      | 提供者需要自訂的使用/配額 token 解析或不同的使用憑證             |
| 21  | `fetchUsageSnapshot`          | 在解析認證後擷取並正規化提供者特定的使用/配額快照                | 提供者需要提供者特定的使用端點或 payload 解析器                  |

如果提供者需要完全自訂的傳輸協定或自訂請求執行器，
那屬於不同類別的擴充功能。這些掛鉤是針對仍在
OpenClaw 正常推論迴圈上執行的提供者行為。

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
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因為它擁有 Claude
  4.6 向前相容性、提供商系列提示、身份驗證修復指導、使用端點整合、
  提示詞快取資格以及 Claude 預設/自適應思考政策。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities` 加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因為它擁有 GPT-5.4 向前相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 正規化、感知 Codex 的驗證
  提示、Spark 抑制、合成的 OpenAI 列表行以及 GPT-5 思維 /
  即時模型政策。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該提供者是直通的，並可能在 OpenClaw 的靜態目錄更新之前公開新的
  模型 ID；它還使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 將
  特定於提供者的請求標頭、路由元數據、推理修補和
  prompt-cache 策略排除在核心之外。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities` 加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要提供者擁有的設備登入、模型後援行為、Claude 對話記錄
  怪癖、GitHub token -> Copilot token 交換，以及提供者擁有的用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍然在核心 OpenAI 傳輸上運行，但擁有傳輸/基礎 URL
  正規化、OAuth 重新整理後援策略、預設傳輸選擇、
  合成 Codex 目錄列以及 ChatGPT 使用端點整合。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因為它們擁有 Gemini 3.1 向前相容回退和
  現代模型匹配權；Gemini CLI OAuth 也使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 進行 token 格式化、token
  解析和配額端點連接。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共享的
  OpenAI 傳輸，但需要提供者擁有的思考 payload 正規化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供者擁有的請求標頭、
  推理 payload 正規化、Gemini 記錄提示和 Anthropic
  快取 TTL 閘控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 後備、
  `tool_stream` 預設值、二元思維 UX、現代模型匹配，以及
  使用量驗證與配額獲取。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities`，以將
  轉錄/工具的怪異行為排除在核心之外。
- 僅目錄打包的提供者（如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）僅
  使用 `catalog`。
- Qwen 入口網站使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和小米使用 `catalog` 加上使用掛鉤，因為它們的 `/usage`
  行為是由外掛程式擁有的，即使推論仍透過共享傳輸運行。

## 執行時期輔助程式

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

- `textToSpeech` 會針對檔案/語音訊息介面回傳標準的核心 TTS 輸出內容。
- 使用核心 `messages.tts` 組態與提供者選擇機制。
- 回傳 PCM 音訊緩衝區與取樣率。外掛程式必須為提供者進行重新取樣/編碼。
- `listVoices` 對各提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音列表可以包含更豐富的中繼資料，例如地區設定、性別和個性標籤，供提供者感知的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援電話功能。Microsoft 則不支援。

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

- 將 TTS 原則、備援機制與回覆傳遞保留在核心中。
- 使用語音提供者來處理廠商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會被正規化為 `microsoft` 提供者 ID。
- 首選的所有權模型是面向公司的：一個廠商外掛程式可以擁有文字、語音、影像以及未來的媒體提供者，隨著 OpenClaw 新增這些功能合約。

對於影像/音訊/視訊理解，外掛程式會註冊一個型別化的媒體理解提供者，而不是通用的鍵/值包：

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

- 將協調、後備、設定和通道連線保留在核心中。
- 將廠商行為保留在提供者外掛程式中。
- 擴充性新增應保持型別化：新的可選方法、新的可選結果欄位、新的可選功能。
- 如果 OpenClaw 稍後新增新功能（例如視訊生成），請先定義核心功能合約，然後讓廠商外掛程式針對它進行註冊。

對於媒體理解執行時期輔助程式，外掛程式可以呼叫：

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

對於音訊轉錄，外掛程式可以使用 media-understanding 執行環境
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

- `api.runtime.mediaUnderstanding.*` 是首選的共享介面，用於
  影像/音訊/影片理解。
- 使用核心 media-understanding 音訊設定 (`tools.media.audio`) 和提供者回退順序。
- 當未產生轉錄輸出時（例如已略過/不支援的輸入），會傳回 `{ text: undefined }`。
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

- `provider` 和 `model` 是每次執行的選用覆寫，而非永久性的會話變更。
- OpenClaw 僅對受信任的呼叫者遵循這些覆寫欄位。
- 對於外掛程式擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 選擇加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的正規 `provider/model` 目標，或使用 `"*"` 以明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後援。

對於網路搜尋，外掛程式可以使用共享的執行時期輔助程式，而不是深入代理程式工具的連線：

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
- 使用網路搜尋提供者處理供應商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是功能/通道插件的首選共享介面，這些插件需要搜尋行為而不依賴代理程式工具包裝器。

## Gateway HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 公開 HTTP 端點。

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
- `auth`：必填。使用 `"gateway"` 要求正常的 Gateway 身份驗證，或使用 `"plugin"` 進行外掛程式管理的身份驗證/Webhook 驗證。
- `match`：選填。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：選填。允許同一個插件替換其自己的現有路由註冊。
- `handler`：當路由處理了請求時，回傳 `true`。

備註：

- `api.registerHttpHandler(...)` 已過時。請使用 `api.registerHttpRoute(...)`。
- 插件路由必須明確宣告 `auth`。
- 除非 `replaceExisting: true`，否則會拒絕完全相同的 `path + match` 衝突，且一個插件不能取代另一個插件的路由。
- 會拒絕具有不同 `auth` 級別的重疊路由。請僅在相同的驗證級別上保留 `exact`/`prefix` 貫穿鏈（fallthrough chains）。

## 插件 SDK 匯入路徑

在撰寫插件時，使用 SDK 子路徑，而非單一的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/plugin-entry` 用於插件註冊基本元件。
- `openclaw/plugin-sdk/core` 用於通用的共享外掛程式介面合約。
- 穩定的通道基元（primitives），例如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress`，用於共享的設定/驗證/回覆/網路掛鉤
  連線。`channel-inbound` 是去抖動（debounce）、提及匹配、
  信封格式化以及入站信封內容輔助函式的共享主位置。
- 領域子路徑，例如 `openclaw/plugin-sdk/channel-config-helpers`、
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
  `openclaw/plugin-sdk/directory-runtime`，用於共享執行時/配置輔助程式。
- `openclaw/plugin-sdk/channel-runtime` 僅作為相容性填充層保留。
  新程式碼應改為導入更精簡的原語。
- 打包擴充功能的內部實作保持私有。外部擴充功能應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可使用
  `extensions/<id>/index.js`、`api.js`、`runtime-api.js`、
  `setup-entry.js` 下的 repo 公共進入點，以及範圍狹小的檔案，如 `login-qr-api.js`。切勿
  從核心或其他擴充功能 import `extensions/<id>/src/*`。
- Repo 進入點分工：
  `extensions/<id>/api.js` 是輔助函式/型別匯出點，
  `extensions/<id>/runtime-api.js` 是僅限執行時期的匯出點，
  `extensions/<id>/index.js` 是打包擴充功能的進入點，
  而 `extensions/<id>/setup-entry.js` 是設定擴充功能的進入點。
- 不再包含捆綁的特定通道品牌公共子路徑。特定通道的輔助程式和運行時接縫位於 `extensions/<id>/api.js` 和 `extensions/<id>/runtime-api.js` 下；公共 SDK 合約是通用的共享原語。

相容性說明：

- 對於新程式碼，請避免使用根 `openclaw/plugin-sdk` 桶檔案。
- 首先優先使用狹窄的穩定原語。較新的 setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool 子路徑是新捆綁和外部外掛工作的預期合約。
  目標解析/匹配屬於 `openclaw/plugin-sdk/channel-targets`。
  訊息操作閘門和反應訊息 ID 輔助程式屬於
  `openclaw/plugin-sdk/channel-actions`。
- 打包的擴充功能特定的 helper barrels 預設是不穩定的。如果
  helper 僅被打包的擴充功能所需要，請將其保留在擴充功能的
  本地 `api.js` 或 `runtime-api.js` 接縫之後，而不是將其提升到
  `openclaw/plugin-sdk/<extension>`。
- 品牌特定通道的打包 bars 除非被明確加回
  到公開合約中，否則保持私有。
- 存在特定功能的子路徑，例如 `image-generation`、
  `media-understanding` 和 `speech`，是因為打包的/原生外掛今天使用
  它們。它們的存在本身並不意味著每個匯出的 helper 都是
  長期凍結的外部合約。

## 訊息工具架構

外掛應該擁有通道特定的 `describeMessageTool(...)` 架構
貢獻。將提供者特定的欄位保留在外掛中，而不是在共享核心中。

對於共享的可移植 Schema 片段，請重複使用透過
`openclaw/plugin-sdk/channel-actions` 匯出的通用輔助函式：

- `createMessageToolButtonsSchema()` 用於按鈕網格樣式的 payload
- `createMessageToolCardSchema()` 用於結構化卡片 payload

如果某個 Schema 形狀僅對某個 Provider 有意義，請在該 Plugin 的
原始碼中定義它，而不是將其提升到共享 SDK 中。

## 通道目標解析

通道 Plugin 應擁有通道特定的目標語意。保持共享的
出站主機通用，並使用訊息介面卡層來處理 Provider 規則：

- `messaging.inferTargetChatType({ to })` 決定標準化的目標
  在目錄查詢之前應被視為 `direct`、`group` 還是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- 當核心在正規化或目錄未命中後需要最終的提供者擁有解析時，`messaging.targetResolver.resolveTarget(...)` 是外掛程式的後援機制。
- 一旦解析目標，`messaging.resolveOutboundSessionRoute(...)` 負責提供者特定的會話路由建構。

建議的分工：

- 使用 `inferTargetChatType` 進行應在搜尋對等/群組之前發生的類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 進行提供者特定的正規化後援，而非用於廣泛目錄搜尋。
- 請將提供者原生的 id（例如聊天 id、執行緒 id、JID、handles 和 room id）保留在 `target` 值或提供者特定的參數中，不要放在通用的 SDK 欄位裡。

## 基於設定檔的目錄

從設定檔衍生目錄項目的外掛程式應將該邏輯保留在外掛程式內，並重用來自 `openclaw/plugin-sdk/directory-runtime` 的共享輔助程式。

當頻道需要基於設定檔的對等/群組時使用此選項，例如：

- 由允許清單驅動的 DM 對等端
- 已設定的頻道/群組對應
- 帳戶範圍的靜態目錄後援

`directory-runtime` 中的共享輔助程式僅處理通用操作：

- 查詢篩選
- 限制套用
- 去重/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

特定頻道的帳戶檢查和 id 正規化應保留在外掛程式實作中。

## 提供者型錄

供應商外掛程式可以定義用於推斷的模型目錄，
透過 `registerProvider({ catalog: { run(...) { ... } } })`。

`catalog.run(...)` 會傳回與 OpenClaw 寫入
`models.providers` 相同的結構：

- 單一供應商項目的 `{ provider }`
- 多個供應商項目的 `{ providers }`

當外掛程式擁有供應商特定的模型 ID、基礎 URL
預設值，或受驗證保護的模型元資料時，請使用 `catalog`。

`catalog.order` 控制外掛程式的目錄相對於 OpenClaw
內建隱式供應商的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的供應商
- `profile`：當驗證設定檔存在時才會出現的供應商
- `paired`：綜合多個相關供應商項目的供應商
- `late`: 最後一輪，在其他隱式提供者之後

後註冊的提供者在金鑰衝突時獲勝，因此外掛程式可以刻意使用相同的提供者 ID 來覆寫內建提供者項目。

相容性：

- `discovery` 仍可作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的插件註冊了通道，建議同時實作
`plugin.config.inspectAccount(cfg, accountId)` 與 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它被允許假設憑證
  已完全具體化，並在缺少所需密鑰時快速失敗。
- 唯讀命令路徑，例如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修復流程，不應該僅為了描述組態而具體化執行時期認證資訊。

建議的 `inspectAccount(...)` 行為：

- 僅回傳描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 相關時包含認證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要返回原始令牌值僅為了報告唯讀
  可用性。返回 `tokenStatus: "available"` （以及匹配的 source
  欄位）足以應對狀態類型的指令。
- 當憑證透過 SecretRef 配置但在當前指令路徑中
  不可用時，請使用 `configured_unavailable`。

這允許唯讀指令報告「已配置但在當前指令路徑中不可用」，
而不是崩潰或錯誤地將帳戶報告為未配置。

## 套件包

外掛程式目錄可能包含一個帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會變成一個外掛程式。如果該套件列出了多個擴充功能，外掛程式 ID
會變成 `name/<fileBase>`。

如果您的外掛程式導入了 npm 相依項，請將其安裝在該目錄中，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：在解析符號連結之後，每個 `openclaw.extensions` 條目都必須位於外掛程式目錄內。逸出套件目錄的條目會被拒絕。

安全性提示：`openclaw plugins install` 會使用 `npm install --ignore-scripts`（無生命週期腳本）來安裝外掛程式相依元件。請保持外掛程式相依元件樹為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

選用項：`openclaw.setupEntry` 可以指向一個輕量級的僅用於設定的模組。當 OpenClaw 需要已停用頻道外掛程式的設定介面，或者當頻道外掛程式已啟用但尚未設定時，它會載入 `setupEntry` 而非完整的外掛程式進入點。當您的主要外掛程式進入點也連接了工具、掛鉤或其他僅在執行階段使用的程式碼時，這能讓啟動和設定更加輕量。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓頻道外掛在閘道的預先監聽啟動階段選擇加入相同的 `setupEntry` 路徑，即使該頻道已經設定過也是如此。

僅當 `setupEntry` 完整涵蓋閘道開始監聽前必須存在的啟動範圍時，才使用此選項。實務上，這表示設定入口必須註冊啟動所依賴的每一個頻道所擁有的功能，例如：

- 頻道註冊本身
- 任何必須在閘道開始監聽之前即可使用的 HTTP 路由
- 任何必須在同一視窗期間存在的閘道方法、工具或服務

如果您的主要入口仍然擁有任何必需的啟動功能，請勿啟用此旗標。讓外掛保持預設行為，並讓 OpenClaw 在啟動期間載入完整入口。

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

### 頻道目錄元數據

通道插件可以透過 `openclaw.channel` 宣傳設定/探索元數據，並透過 `openclaw.install` 提供安裝提示。這能使核心目錄不包含任何數據。

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
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw 也可以合併 **外部通道目錄**（例如 MPM 登錄檔匯出）。將 JSON 檔案置於以下任一路徑：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`） 指向一個或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## Context 引擎插件

Context engine plugins 擁有 session context orchestration，負責攝取、組裝和壓縮。您可以透過 `api.registerContextEngine(id, factory)` 從外掛程式註冊它們，然後使用 `plugins.slots.contextEngine` 選取使用中的引擎。

當您的外掛程式需要取代或擴充預設的 context pipeline，而不僅僅是新增記憶體搜尋或 hooks 時，請使用此功能。

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

如果您的引擎並**不**擁有壓縮演算法，請保留 `compact()` 的實作並明確地委派它：

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

當外掛程式需要不符合目前 API 的行為時，不要使用私有的 reach-in 繞過外掛程式系統。請新增缺少的功能。

Recommended sequence:

1. define the core contract
   決定核心應該擁有哪些共享行為：policy、fallback、config merge、lifecycle、channel-facing semantics 以及 runtime helper shape。
2. 新增型別外掛程式註冊/執行時介面
   使用最小且有用的型別功能介面來擴充 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心與通道/功能消費者
   通道與功能外掛程式應透過核心來使用新功能，而不是直接匯入廠商實作。
4. 註冊廠商實作
   廠商外掛程式隨後針對該功能註冊其後端。
5. 新增合約覆蓋範圍
   新增測試，確保擁有權與註冊形狀隨時間保持明確。

這就是 OpenClaw 如何在不硬編碼單一供應商觀點的情況下保持其主導性。請參閱 [Capability Cookbook](/en/tools/capability-cookbook) 以取得具體的檔案檢查清單與實作範例。

### 功能檢查清單

當您新增新功能時，實作通常應涉及以下這些介面：

- `src/<capability>/types.ts` 中的核心合約類型
- `src/<capability>/runtime.ts` 中的核心執行器/執行時期輔助程式
- `src/plugins/types.ts` 中的外掛程式 API 註冊介面
- `src/plugins/registry.ts` 中的外掛程式註冊表連線
- 當功能/通道外掛程式需要使用時，在 `src/plugins/runtime/*` 中公開外掛程式執行時期
- `src/test-utils/plugin-registration.ts` 中的捕捉/測試輔助程式
- `src/plugins/contracts/registry.ts` 中的所有權/合約斷言
- `docs/` 中的操作員/外掛程式文件

如果缺少其中一個介面，通常表示該功能尚未完全整合。

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

- 核心擁有功能合約與編排
- 供應商外掛程式擁有供應商實作
- 功能/通道外掛程式使用執行時期輔助程式
- 合約測試能確保所有權清晰明確

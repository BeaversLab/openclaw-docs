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

<Info>
  This is the **deep architecture reference**. For practical guides, see: - [Install and use plugins](/en/tools/plugin) — user guide - [Getting Started](/en/plugins/building-plugins) — first plugin tutorial - [Channel Plugins](/en/plugins/sdk-channel-plugins) — build a messaging channel - [Provider Plugins](/en/plugins/sdk-provider-plugins) — build a model provider - [SDK
  Overview](/en/plugins/sdk-overview) — import map and registration API
</Info>

This page covers the internal architecture of the OpenClaw plugin system.

## Public capability model

Capabilities are the public **native plugin** model inside OpenClaw. Every
native OpenClaw plugin registers against one or more capability types:

| Capability          | Registration method                           | Example plugins           |
| ------------------- | --------------------------------------------- | ------------------------- |
| Text inference      | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Speech              | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Media understanding | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Image generation    | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Web search          | `api.registerWebSearchProvider(...)`          | `google`                  |
| Channel / messaging | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

A plugin that registers zero capabilities but provides hooks, tools, or
services is a **legacy hook-only** plugin. That pattern is still fully supported.

### External compatibility stance

The capability model is landed in core and used by bundled/native plugins
today, but external plugin compatibility still needs a tighter bar than "it is
exported, therefore it is frozen."

Current guidance:

- **既有的外部外掛：** 保持基於 hook 的整合運作；將此視為相容性基準
- **新的打包/原生外掛：** 優先使用明確的功能註冊，而非供應商特定的深入存取或僅使用 hook 的新設計
- **採用功能註冊的外部外掛：** 允許使用，但除非文件明確標記契約為穩定，否則應將特定功能的輔助介面視為可能變動

實用準則：

- 功能註冊 API 是預期的發展方向
- 遺留 hooks 在過渡期間仍是外部外掛最安全、不會破壞的路徑
- 匯出的輔助子路徑並非完全相等；優先使用狹隘且記載於文件的契約，而非附帶的輔助匯出

### 外掛形態

OpenClaw 根據每個已載入外掛的實際註冊行為（而非僅是靜態元資料）將其分類為一種形態：

- **單一功能** -- 恰好註冊一種功能類型（例如僅供應商的外掛，如 `mistral`）
- **混合功能** -- 註冊多種功能類型（例如 `openai` 擁有文字推論、語音、媒體理解和圖像生成功能）
- **僅 Hook** -- 僅註冊 hooks（型別或自訂），不註冊功能、工具、指令或服務
- **非功能** -- 註冊工具、指令、服務或路由，但不註冊功能

使用 `openclaw plugins inspect <id>` 查看外掛的形態與功能細分。詳見 [CLI 參考文件](/en/cli/plugins#inspect)。

### 遺留 Hooks

`before_agent_start` hook 作為相容性路徑仍受支援，供僅使用 hook 的外掛使用。現實中的遺留外掛仍依賴它。

方向：

- 保持運作
- 將其記載為遺留
- 針對模型/供應商覆寫工作，優先使用 `before_model_resolve`
- 針對提示變更工作，優先使用 `before_prompt_build`
- 僅在實際使用量下降且 fixture 覆蓋率證明遷移安全後移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到以下其中一個標籤：

| 訊號           | 含義                                               |
| -------------- | -------------------------------------------------- |
| **設定有效**   | 設定解析正常且外掛已解析                           |
| **相容性建議** | 外掛程式使用受支援但較舊的模式（例如 `hook-only`） |
| **舊版警告**   | 外掛程式使用 `before_agent_start`，此功能已棄用    |
| **嚴重錯誤**   | 設定無效或外掛程式載入失敗                         |

無論是 `hook-only` 還是 `before_agent_start`，目前都不會中斷您的外掛程式 ——
`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些
訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛程式系統分為四層：

1. **資訊清單 + 探索**
   OpenClaw 會從設定的路徑、工作區根目錄、
   全域擴充功能根目錄和內建的擴充功能中尋找候選外掛程式。探索機制會先讀取原生
   `openclaw.plugin.json` 資訊清單以及受支援的套件資訊清單。
2. **啟用 + 驗證**
   核心決定探索到的外掛程式是啟用、停用、封鎖，還是
   被選取用於獨佔插槽（例如記憶體）。
3. **執行時期載入**
   原生 OpenClaw 外掛程式會透過 jiti 載入至同進程中，並將
   功能註冊到中央註冊表。相容的套件會被正規化為
   註冊表記錄，而不會匯入執行時期程式碼。
4. **介面消耗**
   OpenClaw 的其餘部分會讀取註冊表，以公開工具、頻道、提供者
   設定、hooks、HTTP 路由、CLI 指令和服務。

重要的設計邊界：

- 探索 + 設定驗證應該能根據 **資訊清單/架構元資料** 運作，
  而無需執行外掛程式碼
- 原生執行時期行為來自外掛模組的 `register(api)` 路徑

這種分離讓 OpenClaw 能在完整執行時期啟用前驗證設定、說明遺失/已停用的外掛程式，並
建構 UI/架構提示。

### 頻道外掛程式與共享訊息工具

頻道外掛程式不需要為一般聊天動作註冊個別的傳送/編輯/回應工具。
OpenClaw 在核心中維護一個共享的 `message` 工具，而
頻道外掛程式則擁有其後面特定於頻道的探索和執行邏輯。

目前的邊界是：

- 核心擁有共享的 `message` 工具主機、提示連線、會話/執行緒
  簿記以及執行分派
- 通道插件擁有作用域操作發現、功能發現以及任何通道特定的 schema 片段
- 通道插件通過其操作適配器執行最終操作

對於通道插件，SDK 表面是
`ChannelMessageActionAdapter.describeMessageTool(...)`。那個統一的發現
調用允許插件一起返回其可見的操作、功能和 schema
貢獻，以便這些部分不會分離。

Core 將運行時作用域傳遞給該發現步驟。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

這對於上下文敏感的插件很重要。通道可以根據活動帳戶、當前房間/線程/訊息或
受信任的請求者身份隱藏或顯示訊息操作，而無需在核心
`message` 工具中硬編碼通道特定的分支。

這就是為什麼嵌入式運行器路由更改仍然是插件工作的原因：運行器
負責將當前聊天/會話身份轉發到插件發現邊界，以便共享的 `message` 工具為當前輪次公開正確的通道擁有
的表面。

對於通道擁有的執行輔助程式，捆綁插件應將執行
運行時保留在各自的擴充模組中。Core 不再擁有 `src/agents/tools` 下的 Discord、
Slack、Telegram 或 WhatsApp 訊息操作運行時。
我們不會發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，並且捆綁
插件應直接從其擴充模組導入自己的本地運行時代碼。

具體對於投票，有兩條執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的通道的共享基線
- `actions.handleAction("poll")` 是通道特定
  投票語義或額外投票參數的首選路徑

Core 現在將共享投票解析延遲到插件投票調度拒絕
該操作之後，因此插件擁有的投票處理程序可以接受通道特定的投票
字段，而不會首先被通用投票解析器阻止。

請參閱[載入管線](#load-pipeline)以了解完整的啟動順序。

## 功能擁有權模型

OpenClaw 將原生插件視為**公司**或**功能**的擁有權邊界，而不是一個裝滿無關整合的「大雜燴」。

這意味著：

- 公司插件通常應該擁有該公司所有面向 OpenClaw 的介面
- 功能插件通常應該擁有其引入的完整功能介面
- 通道應該消費共享的核心功能，而不是臨時重新實作提供商行為

範例：

- 內建的 `openai` 插件擁有 OpenAI 模型提供商行為，以及 OpenAI 的語音 + 媒體理解 + 圖像生成行為
- 內建的 `elevenlabs` 插件擁有 ElevenLabs 語音行為
- 內建的 `microsoft` 插件擁有 Microsoft 語音行為
- 內建的 `google` 插件擁有 Google 模型提供商行為，以及 Google 的媒體理解 + 圖像生成 + 網路搜尋行為
- 內建的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件擁有各自的媒體理解後端
- `voice-call` 插件是一個功能插件：它擁有通話傳輸、工具、CLI、路由和執行時，但它消費核心 TTS/STT 功能，而不是發明第二個語音堆疊

預期的最終狀態是：

- 即使 OpenAI 涵蓋文字模型、語音、影像和未來的影片，它也應位於同一個插件中
- 其他廠商也可以為其自己的服務範圍做同樣的事
- 通道不在乎哪個廠商插件擁有提供商；它們消費核心公開的共享功能契約

這是關鍵區別：

- **插件** = 擁有權邊界
- **功能** = 多個插件可以實作或消費的核心契約

因此，如果 OpenClaw 新增一個新領域（例如影片），第一個問題不是「哪個提供商應該硬編碼影片處理？」。第一個問題是「核心影片功能契約是什麼？」。一旦該契約存在，廠商插件就可以註冊並對應它，而通道/功能插件就可以消費它。

如果該功能尚不存在，通常的正確做法是：

1. 在核心中定義缺失的功能
2. 透過外掛程式 API/執行時期以類型化的方式公開它
3. 針對該功能連接通道/功能
4. 讓供應商外掛程式註冊實作

這在保持所有權明確的同時，避免了依賴單一供應商或一次性外掛程式特定程式碼路徑的核心行為。

### 功能分層

在決定程式碼歸屬時使用此心智模型：

- **核心功能層**：共享的協調、策略、後備、設定合併規則、傳遞語意和類型合約
- **供應商外掛程式層**：供應商特定的 API、驗證、模型目錄、語音合成、影像生成、未來的影片後端、使用端點
- **通道/功能外掛程式層**：Slack/Discord/語音通話/等的整合，它們消費核心功能並將其呈現在表面上

例如，TTS 遵循此形狀：

- 核心擁有回覆時間 TTS 策略、後備順序、偏好設定和通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消費電話 TTS 執行時期輔助程式

未來的功能應優先採用相同的模式。

### 多功能公司外掛程式範例

公司外掛程式從外部看來應該感覺是一體的。如果 OpenClaw 針對模型、語音、媒體理解和網路搜尋有共享合約，供應商可以在一個地方擁有所有表面：

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

重要的不是確切的輔助程式名稱。重要的是形狀：

- 一個外掛程式擁有供應商表面
- 核心仍然擁有功能合約
- 通道和功能外掛程式消費 `api.runtime.*` 輔助程式，而非供應商程式碼
- 合約測試可以斷言外掛程式註冊了其聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已經將影像/音訊/影片理解視為一個共享功能。相同的所有權模型也適用於此：

1. 核心定義媒體理解合約
2. 供應商外掛程式視情況註冊 `describeImage`、`transcribeAudio` 和 `describeVideo`
3. 通道和功能外掛程式消費共享的核心行為，而不是直接連接到供應商程式碼

這避免了將某個供應商的影片假設硬編碼到核心中。外掛程式擁有
供應商表層；核心擁有能力合約和後援行為。

如果 OpenClaw 稍後新增一個新領域，例如影片生成，請再次使用相同的
順序：先定義核心能力，然後讓供應商外掛程式
針對它註冊實作。

需要具體的推出檢查清單？請參閱
[能力食譜](/en/tools/capability-cookbook)。

## 合約與執行

外掛程式 API 表層是有意設定型別並集中於
`OpenClawPluginApi` 中的。該合約定義了支援的註冊點，以及
外掛程式可以依賴的執行時期輔助程式。

為何這很重要：

- 外掛程式作者獲得一個穩定的內部標準
- 核心可以拒絕重複的所有權，例如兩個外掛程式註冊相同的
  供應商 ID
- 啟動時可以針對格式錯誤的註冊提供可行的診斷
- 合約測試可以強制執行打包外掛程式的所有權，並防止無聲偏移

有兩層執行機制：

1. **執行時期註冊執行**
   當外掛程式載入時，外掛程式註冊表會驗證註冊。範例：
   重複的供應商 ID、重複的語音供應商 ID 和格式錯誤的
   註冊會產生外掛程式診斷，而不是未定義的行為。
2. **合約測試**
   在測試執行期間，打包的外掛程式會被捕獲到合約註冊表中，以便
   OpenClaw 可以明確聲明所有權。目前這用於模型
   供應商、語音供應商、網路搜尋供應商，以及打包註冊
   所有權。

實際效果是 OpenClaw 預先知道哪個外掛程式擁有哪個
表層。這讓核心和通道能夠無縫組合，因為所有權是
已宣告、已設定型別且可測試的，而不是隱含的。

### 什麼屬於合約

良好的外掛程式合約是：

- 已設定型別
- 小型
- 針對特定能力
- 由核心擁有
- 可被多個外掛程式重複使用
- 可由通道/功能使用，無需供應商知識

糟糕的外掛程式合約是：

- 隱藏在核心中的供應商特定政策
- 繞過註冊表的臨時外掛程式緊急逃生門
- 直接存取供應商實作的通道程式碼
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的臨時執行時期物件

如有疑慮，請提高抽象層級：先定義功能，然後讓外掛接入其中。

## 執行模型

原生 OpenClaw 外掛與閘道**在同一進程**中執行。它們未被沙盒化。已載入的原生外掛具有與核心代碼相同的進程級信任邊界。

影響：

- 原生外掛可以註冊工具、網絡處理程序、掛鉤和服務
- 原生外掛的錯誤可能導致閘道崩潰或不穩定
- 惡意的原生外掛相當於在 OpenClaw 進程內執行任意代碼

相容的打包套件預設更安全，因為 OpenClaw 目前將它們視為元數據/內容包。在當前版本中，這主要意味著打包的技能。

對於未打包的外掛，請使用允許列表和明確的安裝/載入路徑。將工作區外掛視為開發時代的代碼，而非生產環境預設值。

對於打包的工作區套件名稱，請將外掛 ID 預設錨定在 npm 名稱中：`@openclaw/<id>`，或者當套件故意公開更狹窄的外掛角色時，使用經批准的類型後綴，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要信任提示：

- `plugins.allow` 信任的是**外掛 ID**，而非來源出處。
- 當啟用或加入允許列表時，ID 與打包外掛相同的工作區外掛會故意覆蓋打包的副本。
- 這很正常，且對於本地開發、補丁測試和熱修復很有用。

## 匯出邊界

OpenClaw 匯出的是功能，而非實作便利性。

保持功能註冊為公開。修剪非契約輔助匯出：

- 特定於打包外掛的輔助子路徑
- 非意圖作為公開 API 的運行時管道子路徑
- 特定供應商的便利輔助工具
- 屬於實作細節的設定/入門輔助工具

## 載入流程

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容打包套件清單及套件元數據
3. 拒絕不安全的候選項
4. 標準化外掛程式配置 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 決定每個候選項的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` hooks 並將註冊資訊收集到外掛程式註冊表中
8. 將註冊表暴露給指令/執行階段介面

安全檢查機制發生在執行階段執行**之前**。當入口點超出外掛程式根目錄、路徑可供任何人寫入，或對於非打包外掛程式而言路徑所有權看起來可疑時，候選項會被封鎖。

### 優先處理資訊清單的行為

資訊清單是控制層的真相來源。OpenClaw 使用它來：

- 識別外掛程式
- 探索已宣告的頻道/技能/配置 schema 或打包能力
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/佔位符
- 顯示安裝/目錄元資料

對於原生外掛程式，執行階段模組是資料層部分。它會註冊實際的行為，例如 hooks、工具、指令或提供者流程。

### 載入器快取的內容

OpenClaw 為以下內容保持短暫的行程內快取：

- 探索結果
- 資訊清單註冊表資料
- 已載入的外掛程式註冊表

這些快取可減少突發啟動和重複指令的負擔。將它們視為短暫的效能快取而非持久化儲存是安全的。

效能提示：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 來調整快取視窗。

## 註冊表模型

已載入的外掛程式不會直接變更隨機的核心全域變數。它們會註冊到中央外掛程式註冊表中。

註冊表追蹤：

- 外掛程式記錄 (身分識別、來源、起源、狀態、診斷)
- 工具
- 舊版 hooks 和型別化 hooks
- 頻道
- 提供者
- 閘道 RPC 處理程式
- HTTP 路由
- CLI 註冊員
- 背景服務
- 外掛程式擁有的指令

核心功能接著會從該註冊表讀取，而不是直接與外掛程式模組通訊。這讓載入過程保持單向性：

- 外掛程式模組 -> 註冊表註冊
- 核心執行階段 -> 註冊表使用

這種區分對可維護性至關重要。這意味著大多數核心介面只需
一個整合點：「讀取註冊表」，而不是「對每個插件模組進行特殊處理」。

## 對話綁定回調

綁定了對話的插件可以在批准被解析時做出反應。

使用 `api.onConversationBindingResolved(...)` 在綁定請求被批准或拒絕後接收回調：

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

回調承載欄位：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的解析綁定
- `request`：原始請求摘要、分離提示、發送者 ID 和
  對話元數據

此回調僅用於通知。它不會更改允許誰綁定對話，
並且在核心批准處理完成後運行。

## 提供者運行時鉤子

提供者插件現在有兩個層級：

- 清單元數據：`providerAuthEnvVars` 用於在運行時加載前進行廉價的環境授權查找，
  加上 `providerAuthChoices` 用於在運行時加載前進行廉價的入門/授權選擇
  標籤和 CLI 標誌元數據
- 配置時鉤子：`catalog` / 舊版 `discovery`
- 運行時鉤子：`resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、`capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、`refreshOAuth`、`buildAuthDoctorHint`、`isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、`resolveDefaultThinkingLevel`、`isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot`

OpenClaw 仍然擁有通用代理循環、故障轉移、逐字稿處理和工具策略。這些掛鉤是特定於提供者行為的擴展表面，而無需完整的自訂推論傳輸。

當提供者具有基於環境變數的憑證，且通用驗證/狀態/模型選擇器路徑應在不載入外掛執行時的情況下看到這些憑證時，請使用清單 `providerAuthEnvVars`。當載入/驗證選擇 CLI 介面需要知道提供者的選擇 ID、群組標籤和簡單的單一標誌驗證連線，而不載入提供者執行時時，請使用清單 `providerAuthChoices`。將提供者執行時 `envVars` 保留給操作員導向的提示，例如載入標籤或 OAuth 用戶端 ID/用戶端密鑰設定變數。

### 掛鉤順序與用法

對於模型/提供者外掛，OpenClaw 大致按此順序調用掛鉤。「使用時機」一欄是快速決策指南。

| #   | 掛鉤                          | 功能                                                              | 使用時機                                                       |
| --- | ----------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `catalog`                     | 在 `models.json` 生成期間將提供者設定發布到 `models.providers` 中 | 提供者擁有目錄或基底 URL 預設值                                |
| --  | _(內建模型查找)_              | OpenClaw 首先嘗試正常的註冊表/目錄路徑                            | _(非外掛掛鉤)_                                                 |
| 2   | `resolveDynamicModel`         | 針對尚未在本地註冊表中的提供者擁有模型 ID 的同步回退              | 提供者接受任意的上游模型 ID                                    |
| 3   | `prepareDynamicModel`         | 非同步預熱，然後 `resolveDynamicModel` 再次執行                   | 提供者在解析未知 ID 之前需要網路元數據                         |
| 4   | `normalizeResolvedModel`      | 在嵌入式執行器使用解析後的模型之前的最終重寫                      | 提供者需要傳輸重寫，但仍使用核心傳輸                           |
| 5   | `capabilities`                | 由共享核心邏輯使用的提供者擁有的逐字稿/工具元數據                 | 提供者需要逐字稿/提供者系列的特殊行為                          |
| 6   | `prepareExtraParams`          | 在通用串流選項包裝器之前的請求參數正規化                          | 提供者需要預設請求參數或每個提供者的參數清理                   |
| 7   | `wrapStreamFn`                | 應用通用包裝器後的串流包裝器                                      | 提供者需要請求標頭/主體/模型相容性包裝器，而無需自訂傳輸       |
| 8   | `formatApiKey`                | Auth-profile 格式化器：存儲的設定檔變成執行時 `apiKey` 字串       | Provider 儲存額外的驗證中繼資料，且需要自訂的執行時 token 形狀 |
| 9   | `refreshOAuth`                | OAuth 重新整理覆寫，用於自訂重新整理端點或重新整理失敗策略        | Provider 不適用共享的 `pi-ai` 重新整理器                       |
| 10  | `buildAuthDoctorHint`         | 當 OAuth 重新整理失敗時附加的修復提示                             | Provider 在重新整理失敗後需要 Provider 擁有的驗證修復指引      |
| 11  | `isCacheTtlEligible`          | Proxy/backhaul provider 的提示快取策略                            | Provider 需要 proxy 特定的快取 TTL 閘控                        |
| 12  | `buildMissingAuthMessage`     | 通用缺少驗證恢復訊息的取代內容                                    | Provider 需要 Provider 特定的缺少驗證恢復提示                  |
| 13  | `suppressBuiltInModel`        | 過時上游模型抑制加上可選的使用者面向錯誤提示                      | Provider 需要隱藏過時的上傳列或將其取代為廠商提示              |
| 14  | `augmentModelCatalog`         | 在探索後附加的合成/最終目錄列                                     | Provider 需要合成的前向相容列，位於 `models list` 和選擇器中   |
| 15  | `isBinaryThinking`            | 二元思考 Provider 的開/關推理切換                                 | Provider 僅公開二元思考的開/關                                 |
| 16  | `supportsXHighThinking`       | 已選取模型的 `xhigh` 推理支援                                     | Provider 只想在部分模型上啟用 `xhigh`                          |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的預設 `/think` 層級                                  | Provider 擁有模型系列的預設 `/think` 策略                      |
| 18  | `isModernModelRef`            | 用於即時設定檔過濾器和 smoke 選擇的現代模型匹配器                 | Provider 擁有即時/smoke 的偏好模型匹配                         |
| 19  | `prepareRuntimeAuth`          | 在推論之前立即將設定的憑證交換為實際的執行時 token/key            | Provider 需要 token 交換或短期要求的憑證                       |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的使用量/計費憑證及相關狀態介面                     | 供應商需要自訂的使用量/配額權杖解析或不同的使用量憑證          |
| 21  | `fetchUsageSnapshot`          | 在解析驗證後，擷取並正規化供應商特定的使用量/配額快照             | 供應商需要供應商特定的使用量端點或酬載解析器                   |

如果供應商需要完全自訂的傳輸協定或自訂請求執行器，那是不同類別的擴充功能。這些鉤子是針對仍執行於 OpenClaw 正常推論迴圈上的供應商行為。

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
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因為它擁有 Claude
  4.6 前向相容性、供應商系列提示、驗證修復指引、使用量端點整合、提示快取資格，以及 Claude 預設/自適應思考策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`，
  因為它擁有 GPT-5.4 前向相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 正規化、感知 Codex 的驗證
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考/
  即時模型策略。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該供應商是透傳的，且可能會在 OpenClaw 的靜態目錄更新之前公開新的模型 ID；它也使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 將
  供應商特定的請求標頭、路由中繼資料、推理修補程式和提示快取策略排除在核心之外。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，再加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要提供商擁有的設備登入、模型後備行為、Claude 對話記錄怪癖、
  GitHub 權杖 -> Copilot 權杖交換，以及提供商擁有的使用量端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，再加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍在核心 OpenAI 傳輸上運行，但擁有自己的傳輸/基礎 URL 正規化、
  OAuth 重新整理後備政策、預設傳輸選擇、合成 Codex 目錄列，
  以及 ChatGPT 使用量端點整合。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因為它們擁有 Gemini 3.1 向前相容後備和
  現代模型比對；Gemini CLI OAuth 也使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 進行權杖格式化、
  權杖解析和配額端點連線。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共享的
  OpenAI 傳輸，但需要提供商擁有的思考 Payload 正規化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供商擁有的請求標頭、
  推理 Payload 正規化、Gemini 對話記錄提示和 Anthropic
  快取 TTL 閘控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 退回、
  `tool_stream` 預設值、二元思考 UX、現代模型匹配，以及
  使用量驗證 + 配額擷取。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities`，以將
  轉錄/工具特性的怪異行為排除在核心之外。
- 僅目錄的內建提供者（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）僅使用
  `catalog`。
- Qwen portal 使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和小米使用 `catalog` 加上使用量 hooks，因為它們的 `/usage`
  行為是由外掛程式擁有的，即使推論仍透過共用的傳輸執行。

## 執行時輔助程式

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

- `textToSpeech` 會傳回檔案/語音備忘錄介面的標準核心 TTS 輸出承載。
- 使用核心 `messages.tts` 組態和提供者選擇。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對於每個提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音列表可以包含更豐富的中繼資料，例如地區設定、性別和個性標籤，供感知提供者的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援電話語音。Microsoft 則否。

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

- 將 TTS 政策、後備和回覆傳遞保留在核心中。
- 使用語音提供商來處理供應商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會被正規化為 `microsoft` 提供商 ID。
- 首選的所有權模型是以公司為導向的：一個供應商插件可以擁有文字、語音、圖片以及未來的媒體提供商，隨著 OpenClaw 新增這些功能合約。

對於圖片/音訊/視訊理解，插件註冊一個類型化的媒體理解提供商，而不是通用的鍵/值包：

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

- 將協調、後備、配置和通道連接保留在核心中。
- 將供應商行為保留在提供商插件中。
- 擴充功能應保持類型化：新增可選方法、新增可選結果欄位、新增可選功能。
- 如果 OpenClaw 稍後新增新功能（例如視訊產生），請先定義核心功能合約，然後讓供應商插件對其進行註冊。

對於媒體理解執行時輔助工具，插件可以呼叫：

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

對於音訊轉錄，插件可以使用媒體理解執行時或較舊的 STT 別名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

備註：

- `api.runtime.mediaUnderstanding.*` 是圖片/音訊/視訊理解的首選共享介面。
- 使用核心媒體理解音訊配置 (`tools.media.audio`) 和提供商後備順序。
- 當未產生轉錄輸出時（例如跳過/不支援的輸入），傳回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 仍保留為相容性別名。

插件也可以透過 `api.runtime.subagent` 啟動背景子代理程式執行：

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

- `provider` 和 `model` 是可選的每次執行覆寫，而非持續的工作階段變更。
- OpenClaw 僅對受信任的呼叫者遵循那些覆寫欄位。
- 對於插件擁有的後備執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的插件限制在特定的標準 `provider/model` 目標，或使用 `"*"` 明確允許任何目標。
- 不受信任的插件子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後備。

對於網路搜尋，外掛程式可以使用共享的執行時期輔助程式，而不是深入存取代理程式工具的接線：

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

外掛程式也可以透過 `api.registerWebSearchProvider(...)` 註冊網路搜尋提供者。

備註：

- 將提供者選擇、憑證解析和共享請求語意保留在核心中。
- 使用網路搜尋提供者進行特定廠商的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不想依賴代理程式工具包裝函式的功能/通道外掛程式的首選共享介面。

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
- `auth`：必填。使用 `"gateway"` 要求標準的 Gateway 驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/ webhook 驗證。
- `match`：選填。`"exact"`（預設值）或 `"prefix"`。
- `replaceExisting`：選填。允許同一個外掛程式替換自己現有的路由註冊。
- `handler`：當路由處理了請求時，回傳 `true`。

備註：

- `api.registerHttpHandler(...)` 已過時。請使用 `api.registerHttpRoute(...)`。
- 外掛程式路由必須明確宣告 `auth`。
- 除非 `replaceExisting: true`，否則會拒絕完全相同的 `path + match` 衝突，且一個外掛程式無法替換另一個外掛程式的路由。
- 具有不同 `auth` 層級的重疊路由會被拒絕。請將 `exact`/`prefix` 透傳鍊保持在相同的驗證層級上。

## 外掛程式 SDK 匯入路徑

在撰寫外掛程式時，請使用 SDK 子路徑，而不是單一的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/plugin-entry` 用於外掛程式註冊的基本要素。
- `openclaw/plugin-sdk/core` 用於通用共享的外掛程式介面。
- 穩定的通道原語（primitives），例如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress`，用於共享設定/驗證/回覆/網路掛鉤
  連線。`channel-inbound` 是去抖動、提及匹配、
  信封格式化以及入站信封上下文輔助程式的共用中心。
- 領域子路徑（subpaths），例如 `openclaw/plugin-sdk/channel-config-helpers`、
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
  `openclaw/plugin-sdk/directory-runtime`，用於共享執行時期/設定輔助程式。
- `openclaw/plugin-sdk/channel-runtime` 僅作為相容性填充（shim）保留。
  新程式碼應改用較狹窄的原語匯入。
- 打包的擴充功能內部保持私有。外部外掛應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可使用儲存庫
  中的 `extensions/<id>/index.js`、`api.js`、`runtime-api.js`、
  `setup-entry.js` 下的公用進入點，以及範圍狹窄的檔案（如 `login-qr-api.js`）。切勿
  從核心或其他擴充功能匯入 `extensions/<id>/src/*`。
- 儲存庫進入點分割：
  `extensions/<id>/api.js` 是輔助程式/型別集合桶（barrel），
  `extensions/<id>/runtime-api.js` 是僅限執行時期的集合桶，
  `extensions/<id>/index.js` 是打包外掛進入點，
  而 `extensions/<id>/setup-entry.js` 是設定外掛進入點。
- 不再有打包的通道品牌公用子路徑。通道特定的輔助程式和
  執行時期縫隙（seams）位於 `extensions/<id>/api.js` 和 `extensions/<id>/runtime-api.js` 之下；
  公用 SDK 契約則是通用的共享原語。

相容性注意：

- 避免在新的程式碼中使用根層級的 `openclaw/plugin-sdk` barrel。
- 優先使用狹窄且穩定的基礎元件。較新的 setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool 子路徑是針對新
  的捆綁和外部外掛工作的預期合約。
  目標解析/比對屬於 `openclaw/plugin-sdk/channel-targets`。
  訊息操作閘門和反應訊息 ID 輔助函式屬於
  `openclaw/plugin-sdk/channel-actions`。
- 捆綁的擴充功能特定輔助 barrels 預設並不穩定。如果
  輔助函式僅被捆綁擴充功能所需，請將其保留在擴充功能的
  本地 `api.js` 或 `runtime-api.js` 縫隙之後，而不是將其提升至
  `openclaw/plugin-sdk/<extension>`。
- Channel-branded 捆綁 bars 保持私有，除非它們被明確新增
  回到公開合約中。
- 特定功能的子路徑，例如 `image-generation`、
  `media-understanding` 和 `speech` 存在是因為捆綁/原生外掛目前使用
  它們。它們的存在本身並不意味著每個匯出的輔助函式都是一個
  長期凍結的外部合約。

## 訊息工具架構

外掛應擁有通道特定的 `describeMessageTool(...)` 架構
貢獻。將提供者特定的欄位保留在外掛中，而不是在共享核心中。

對於共享的可攜式架構片段，請重複使用透過
`openclaw/plugin-sdk/channel-actions` 匯出的通用輔助函式：

- `createMessageToolButtonsSchema()` 用於按鈕網格樣式的 payload
- `createMessageToolCardSchema()` 用於結構化卡片 payload

如果架構形狀僅對某個提供者有意義，請在該外掛的
自己的來源中定義它，而不是將其提升到共享 SDK 中。

## 通道目標解析

通道外掛應擁有通道特定的目標語意。保持共享
外寄主機通用，並使用訊息介面卡表面來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定正規化目標
  在目錄查詢之前應被視為 `direct`、`group` 還是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- `messaging.targetResolver.resolveTarget(...)` 是外掛的後備機制，當核心在正規化或目錄未命中後需要最終的提供者擁有的解析時使用。
- `messaging.resolveOutboundSessionRoute(...)` 負責解析目標後的提供者特定會話路由構建。

建議的分工：

- 使用 `inferTargetChatType` 進行應在搜尋對等/群組之前發生的類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 進行提供者特定的正規化後備，而非廣泛的目錄搜尋。
- 將提供者原生的 ID（如聊天 ID、執行緒 ID、JID、句柄和房間 ID）保留在 `target` 值或提供者特定的參數中，而非通用 SDK 欄位中。

## 基於配置的目錄

從配置衍生目錄條目的外掛應將該邏輯保留在外掛中，並重複使用來自 `openclaw/plugin-sdk/directory-runtime` 的共享輔助程式。

當通道需要基於配置的對等/群組時使用此選項，例如：

- 由允許清單驅動的直接訊息對等
- 配置的通道/群組映射
- 帳戶範圍的靜態目錄後備

`directory-runtime` 中的共享輔助程式僅處理通用操作：

- 查詢過濾
- 限制應用
- 去重/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

通道特定的帳戶檢查和 ID 正規化應保留在外掛實作中。

## 提供者目錄

提供者外掛可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型目錄。

`catalog.run(...)` 傳回與 OpenClaw 寫入 `models.providers` 相同的形狀：

- 單一提供者條目的 `{ provider }`
- 多個提供者條目的 `{ providers }`

當外掛擁有提供者特定的模型 ID、基本 URL 預設值或授權閘道的模型元資料時，請使用 `catalog`。

`catalog.order` 控制外掛目錄相對於 OpenClaw 內建隱式提供者的合併時機：

- `simple`: 簡單的 API 金鑰或由環境變數驅動的提供者
- `profile`: 當存在驗證設定檔時顯示的提供者
- `paired`: 整合多個相關提供者項目的提供者
- `late`: 最後一輪，在其他隱含提供者之後

後續的提供者在金鑰衝突時會獲勝，因此外掛程式可以故意使用相同的提供者 ID 覆寫內建的提供者項目。

相容性：

- `discovery` 仍可作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的的外掛程式註冊了一個通道，建議同時實作
`plugin.config.inspectAccount(cfg, accountId)` 和 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是執行時路徑。它可以假設憑證
  已完全具體化，並在缺少所需秘密時快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修復流程等唯讀指令路徑，不應僅為了描述設定
  就需要具體化執行時憑證。

建議的 `inspectAccount(...)` 行為：

- 僅回傳描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要僅為了回報唯讀可用性而回傳原始權杖值。回傳 `tokenStatus: "available"`（以及相符的來源
  欄位）對於狀態類型指令已足夠。
- 當憑證透過 SecretRef 設定但在目前指令路徑中無法取得時，請使用 `configured_unavailable`。

這讓唯讀指令能夠回報「已設定但在此指令路徑中無法使用」，而不是崩潰或錯誤地回報帳號未設定。

## 套件包

外掛目錄可以包含一個帶有 `package.json` 的 `openclaw.extensions`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛。如果套件包列出了多個擴充功能，外掛 ID 會變成 `name/<fileBase>`。

如果您的外掛引入了 npm 相依性，請將它們安裝在該目錄中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 條目都必須保持在這個外掛目錄內。逃離套件目錄的條目將會被拒絕。

安全提示：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安裝外掛相依性（沒有生命週期腳本）。請保持外掛相依性樹為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。當 OpenClaw 需要已停用頻道外掛的設定介面，或是當頻道外掛已啟用但尚未設定時，它會載入 `setupEntry` 而非完整的外掛入口。這能讓啟動和設定更輕量，特別是當您的主要外掛入口也連接了工具、掛鉤或其他僅執行時期的程式碼時。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以讓頻道外掛在閘道預聽啟動階段選擇使用相同的 `setupEntry` 路徑，即使該頻道已經設定完成。

僅在 `setupEntry` 完全涵蓋閘道開始監聽前必須存在的啟動介面時使用此功能。實務上，這意味著設定入口必須註冊啟動所依賴的每個頻道擁有的功能，例如：

- 頻道註冊本身
- 任何必須在閘道開始監聽前可用的 HTTP 路由
- 任何必須在同一視窗期間存在的閘道方法、工具或服務

如果您的完整入口仍然擁有任何必要的啟動功能，請勿啟用此旗標。請將外掛保持在預設行為，並讓 OpenClaw 在啟動期間載入完整入口。

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

通道外掛程式可以透過 `openclaw.channel` 宣佈設定/探索元數據，並透過 `openclaw.install` 宣佈安裝提示。這讓核心目錄不包含數據。

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

OpenClaw 也可以合併 **外部通道目錄**（例如，MPM 註冊表匯出）。將 JSON 檔案放置於以下其中一個位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## Context engine 外掛程式

Context engine 外掛程式擁有 session context 的編排，負責攝取、組合
和壓縮。從您的插件中使用
`api.registerContextEngine(id, factory)` 註冊它們，然後使用
`plugins.slots.contextEngine` 選取使用中的引擎。

當您的插件需要取代或擴充預設的 context
管線，而不僅僅是新增記憶體搜尋或 hooks 時，請使用此功能。

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

如果您的引擎**不**擁有壓縮演算法，請保持 `compact()`
已實作並明確委派它：

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

## 新增新功能

當插件需要不符合目前 API 的行為時，請不要使用私有的繞過方式
繞過外掛程式系統。請新增缺失的功能。

建議步驟：

1. 定義核心合約
   決定核心應該擁有哪些共享行為：政策、後備、設定合併、
   生命週期、面向通道的語意，以及執行時期輔助程式形狀。
2. 新增具類型的外掛程式註冊/執行時期介面
   以最小且有用的具類型功能介面擴充
   `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心 + 通道/功能消費者
   通道和功能外掛程式應透過核心來使用新功能，
   而不是直接匯入供應商實作。
4. 註冊供應商實作
   供應商外掛程式接著針對該功能註冊其後端。
5. 新增合約覆蓋率
   新增測試，以便擁有權和註冊形狀隨時間保持明確。

這就是 OpenClaw 在不對特定供應商的世界觀硬編碼的情況下，保持主觀見解的方式。如需具體的檔案檢查清單與實作範例，請參閱 [Capability Cookbook](/en/tools/capability-cookbook)。

### Capability 檢查清單

當您新增一個 capability 時，實作通常應該同時涉及這些層面：

- `src/<capability>/types.ts` 中的核心合約類型
- `src/<capability>/runtime.ts` 中的核心執行器/執行時期輔助函式
- `src/plugins/types.ts` 中的外掛 API 註冊介面
- `src/plugins/registry.ts` 中的外掛註冊表連線
- 當功能/頻道外掛需要使用時，在 `src/plugins/runtime/*` 中暴露的外掛執行時期介面
- `src/test-utils/plugin-registration.ts` 中的 capture/測試輔助函式
- `src/plugins/contracts/registry.ts` 中的所有權/合約斷言
- `docs/` 中的操作員/外掛文件

如果缺少其中任何一個層面，通常表示該 capability 尚未完全整合。

### Capability 範本

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

這能讓規則保持簡單：

- 核心擁有 capability 合約與協調
- 供應商外掛擁有供應商實作
- 功能/頻道外掛使用執行時期輔助函式
- 合約測試保持所有權明確

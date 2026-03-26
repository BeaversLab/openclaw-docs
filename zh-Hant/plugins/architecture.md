---
summary: "外掛架構內部：功能模型、所有權、合約、載入管線、執行時輔助程式"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "外掛架構"
---

# 外掛架構

本頁涵蓋 OpenClaw 外掛系統的內部架構。若需面向使用者的設定、探索和配置資訊，請參閱 [外掛](/zh-Hant/tools/plugin)。

## 公開功能模型

功能 是 OpenClaw 內部的公開 **原生外掛** 模型。每個
原生 OpenClaw 外掛都會針對一或多種功能類型進行註冊：

| 功能            | 註冊方法                                      | 外掛範例                  |
| --------------- | --------------------------------------------- | ------------------------- |
| 文字推論        | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| 語音            | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| 圖像生成        | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| 網路搜尋        | `api.registerWebSearchProvider(...)`          | `google`                  |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

註冊零個功能但提供 hook、工具或服務的外掛程式是**僅舊版 hook** 外掛程式。該模式仍然受到完全支援。

### 外部相容性立場

Capability 模型已落地於核心中，並被目前內建/原生插件使用，但外部插件的相容性仍需比「只要已匯出，即凍結」更嚴格的標準。

目前指導方針：

- **現有外部插件：** 保持基於 hook 的整合運作；將此視為相容性基準
- **新的內建/原生插件：** 優先使用明確的 capability 註冊，而非供應商特定的深入存取或僅含 hook 的新設計
- **採用 capability 註冊的外部插件：** 允許，但除非文件明確標記合約為穩定，否則請將特定於 capability 的輔助介面視為演進中

實用規則：

- capability 註冊 API 是預期的發展方向
- legacy hooks 在過渡期間仍是外部插件最安全的無破壞性路徑
- 匯出的輔助子路徑並非地位平等；請優先使用狹義且有文件記載的合約，而非附帶的輔助匯出

### 外掛程式形狀

OpenClaw 根據每個已載入外掛程式的實際註冊行為（而不僅僅是靜態元資料）將其歸類為一種形狀：

- **plain-capability（純能力）** -- 僅註冊一種能力類型（例如僅提供者的外掛程式，如 `mistral`）
- **hybrid-capability（混合能力）** -- 註冊多種能力類型（例如 `openai` 擁有文字推理、語音、媒體理解和影像生成）
- **hook-only（僅掛鉤）** -- 僅註冊掛鉤（型別化或自定義），不註冊能力、工具、指令或服務
- **non-capability（無能力）** -- 註冊工具、指令、服務或路由，但不註冊能力

使用 `openclaw plugins inspect <id>` 查看外掛程式的形狀和能力細分。詳情請參閱 [CLI 參考資料](/zh-Hant/cli/plugins#inspect)。

### 舊版掛鉤

`before_agent_start` hook 作為僅包含 hook 的插件的相容性路徑仍然受到支援。現有的實際插件仍然依賴它。

方向：

- 保持其運作
- 將其記錄為舊版
- 優先使用 `before_model_resolve` 進行模型/提供者覆寫工作
- 優先使用 `before_prompt_build` 進行提示變更工作
- 僅在實際使用量下降且裝置覆蓋率證明遷移安全性後移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到以下標籤之一：

| 訊號           | 含義                                           |
| -------------- | ---------------------------------------------- |
| **設定有效**   | 設定解析正常且插件已解析                       |
| **相容性建議** | 插件使用受支援但較舊的模式（例如 `hook-only`） |
| **舊版警告**   | 插件使用 `before_agent_start`，該功能已被棄用  |
| **嚴重錯誤**   | 設定無效或插件載入失敗                         |

目前，`hook-only` 和 `before_agent_start` 都不會導致您的外掛程式失效 ——
`hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些
訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構概覽

OpenClaw 的外掛程式系統分為四個層級：

1. **資訊清單 + 探索**
   OpenClaw 會從設定的路徑、工作區根目錄、
   全域擴充功能根目錄和隨附的擴充功能中尋找候選外掛程式。探索機制會先讀取原生
   `openclaw.plugin.json` 資訊清單，以及支援的套件資訊清單。
2. **啟用 + 驗證**
   核心系統會決定探索到的外掛程式是已啟用、已停用、已封鎖，
   還是被選取用於記憶體等獨佔插槽。
3. **Runtime loading**
   原生 OpenClaw 外掛程式透過 jiti 載入至處理序中，並將功能註冊到中央註冊表。相容的套件會被正規化為註冊表記錄，而不需匯入執行階段程式碼。
4. **Surface consumption**
   OpenClaw 的其餘部分會讀取註冊表以公開工具、管道、提供者設定、掛鉤、HTTP 路由、CLI 指令和服務。

重要的設計邊界：

- 探索 + 設定驗證應該能僅透過 **manifest/schema metadata** 運作，而不需執行外掛程式碼
- 原生執行階段行為來自外掛模組的 `register(api)` 路徑

這種區分讓 OpenClaw 能在完整執行階段啟動前驗證設定、說明缺失/停用的外掛，並建立 UI/Schema 提示。

### 管道外掛與共享訊息工具

通道外掛程式不需要為一般的聊天操作註冊個別的傳送/編輯/反應工具。OpenClaw 在核心中保留一個共享的 `message` 工具，而通道外掛程式擁有其背後通道特定的探索和執行功能。

目前的邊界為：

- core 擁有共享的 `message` 工具主機、提示連接、會話/執行緒記錄，以及執行分派
- 通道外掛程式擁有範圍動作探索、能力探索，以及任何通道特定的架構片段
- 通道外掛程式透過其動作介面卡執行最終動作

對於通道外掛程式，SDK 表面為 `ChannelMessageActionAdapter.describeMessageTool(...)`。該統一的探索呼叫允許外掛程式一起回傳其可見的動作、能力和架構貢獻，以便這些部分不會分離。

核心將執行時範圍傳遞到該探索步驟中。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

這對於上下文相關的外掛很重要。頻道可以根據目前帳戶、當前房間/執行緒/訊息或受信任的請求者身分隱藏或公開訊息操作，而無需在核心 `message` 工具中硬編碼特定於頻道的分支。

這就是為什麼嵌入式執行器路由更改仍然是外掛工作的原因：執行器負責將當前聊天/會話身分轉發到外掛發現邊界，以便共享 `message` 工具為當前輪次公開正確的頻道擁有的介面。

對於通道擁有的執行輔助程式，打包的外掛應將執行時保留在自身的擴充模組中。Core 不再擁有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 訊息操作執行時。我們不發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，打包的外掛應直接從其擴充擁有的模組匯入自身的本機執行時程式碼。

特別針對投票，有兩條執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的通道的共享基準
- `actions.handleAction("poll")` 是通道特定投票語義或額外投票參數的首選路徑

Core 現在將共享投票解析延後到外掛投票分派拒絕該操作之後，因此外掛擁有的投票處理程式可以接受通道特定的投票欄位，而不會先被通用投票解析程式阻擋。

完整的啟動程序請參閱 [載入管線](#load-pipeline)。

## 功能擁有權模型

OpenClaw 將原生插件視為**公司**或**功能**的擁有權邊界，而非無關整合項目的雜匯袋。

這意味著：

- 公司插件通常應擁有該公司所有面向 OpenClaw 的介面
- 功能插件通常應擁有其引入的完整功能介面
- 通道應消費共享的核心功能，而非臨時重新實作提供者行為

範例：

- 內建的 `openai` 插件擁有 OpenAI 模型提供者行為，以及 OpenAI 語音 + 媒體理解 + 圖像生成行為
- 內建的 `elevenlabs` 插件擁有 ElevenLabs 語音行為
- 內建的 `microsoft` 插件擁有 Microsoft 語音行為
- 捆綁的 `google` 外掛程式擁有 Google 模型提供者行為以及 Google
  媒體理解 + 影像生成 + 網路搜尋行為
- 捆綁的 `minimax`、`mistral`、`moonshot` 和 `zai` 外掛程式擁有其
  媒體理解後端
- `voice-call` 外掛程式是一個功能外掛程式：它擁有呼叫傳輸、工具、
  CLI、路由和運行時，但它使用核心 TTS/STT 功能，而不是
  發明第二個語音堆疊

預期的最終狀態是：

- OpenAI 位於一個外掛程式中，即使它涵蓋文字模型、語音、影像和
  未來的影片
- 其他廠商可以為其自己的範圍做同樣的事情
- 通道不關心哪個廠商外掛程式擁有提供者；它們使用核心
  公開的共享功能合約

這是關鍵區別：

- **plugin** = 所有权邊界
- **capability** = 多個外掛程式可以實作或使用的核心合約

因此，如果 OpenClaw 新增了一個新的領域（例如影片），第一個問題不是
「哪個供應商應該將影片處理硬編碼？」。第一個問題是「核心影片
能力合約是什麼？」。一旦該合約存在，供應商外掛程式就可以
針對它註冊，而通道/功能外掛程式就可以使用它。

如果該能力尚不存在，通常的正確做法是：

1. 在核心中定義缺失的能力
2. 透過外掛程式 API/執行時期以型別化的方式公開它
3. 將通道/功能連接到該能力
4. 讓供應商外掛程式註冊實作

這保持了所有權的明確性，同時避免了依賴單一供應商或一次性
外掛程式特定程式碼路徑的核心行為。

### 能力分層

在決定程式碼所屬位置時，請使用此心智模型：

- **核心能力層**：共享編排、策略、後備、組態
  合併規則、傳遞語意以及型別合約
- **廠商外掛層**：廠商特定的 API、認證、模型目錄、語音
  合成、影像生成、未來的影片後端，以及使用量端點
- **通道/功能外掛層**：Slack/Discord/語音通話/等整合
  其消費核心能力並將其呈現在介面上

例如，TTS 遵循此結構：

- 核心擁有回覆時間 TTS 策略、後備順序、偏好設定以及通道傳遞
- `openai`、`elevenlabs` 和 `microsoft` 擁有合成實作
- `voice-call` 消費電話 TTS 執行時期輔助程式

未來的能力應優先採用相同的模式。

### 多能力公司外掛程式範例

從外部來看，公司外掛應該感覺是一個整體。如果 OpenClaw 擁有用於模型、語音、媒體理解和網路搜尋的共享合約，供應商可以在一個地方擁有其所有表面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import {
  buildOpenAISpeechProvider,
  createPluginBackedWebSearchProvider,
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk";

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

重要的是輔助函式的確切名稱。重要的是形狀：

- 一個外掛擁有供應商表面
- 核心仍然擁有功能合約
- 通道和功能外掛使用 `api.runtime.*` 輔助函式，而不是供應商程式碼
- 合約測試可以斷言該外掛註冊了它聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已經將圖片/音訊/影片理解視為一個共享功能。相同的所有權模型適用於此：

1. 核心定義媒體理解合約
2. 供應商外掛視情況註冊 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道和功能外掛程式會消耗共享的核心行為，而不是直接連接到供應商程式碼

這可以避免將某個供應商的影片假設硬編碼到核心中。外掛程式擁有供應商層面；核心擁有能力契約和後備行為。

如果 OpenClaw 稍後添加一個新領域，例如影片生成，請再次使用相同的順序：先定義核心能力，然後讓供應商外掛程式針對其註冊實作。

需要具體的推出檢查清單？請參閱
[能力指南](/zh-Hant/tools/capability-cookbook)。

## 契約與執行

外掛程式 API 介面在 `OpenClawPluginApi` 中刻意進行了類型定義並集中管理。該契約定義了支援的註冊點以及外掛程式可以依賴的執行時期輔助工具。

為何這很重要：

- 外掛程式作者獲得一個穩定的內部標準
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

實際效果是 OpenClaw 預先就知道哪個外掛程式擁有哪個 surface。這讓核心和通道能夠無縫組合，因為擁有權是經過聲明、型別化且可測試的，而不是隱含的。

### 什麼屬於契約

良好的外掛程式契約具備以下特點：

- 具有型別
- 小巧
- 特定於功能
- 由核心擁有
- 可被多個外掛程式重複使用
- 可被通道/功能在不了解供應商的情況下使用

不良的外掛程式契約具備以下特點：

- 隱藏在核心中的供應商特定政策
- 繞過註冊表的一次性外掛程式應急手段
- 直接存取供應商實作的通道程式碼
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的臨時執行階段物件

如有疑問，請提高抽象層級：先定義功能，再讓外掛程式接入。

## 執行模型

原生 OpenClaw 外掛程式與 Gateway **同處理序** 運行。它們不
受沙盒限制。已載入的原生外掛程式具有與核心程式碼相同的
處理程序層級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、掛鉤 和服務
- 原生外掛程式的錯誤可能會導致 Gateway 當機或不穩定
- 惡意的原生外掛程式相當於在 OpenClaw 處理程序內執行任意程式碼

相容套組 預設情況下更安全，因為 OpenClaw 目前將它們
視為元資料/內容套組。在目前的版本中，這主要是指套組技能。

請對非套組外掛程式使用允許清單 和明確的安裝/載入路徑。請將
工作區外掛程式視為開發階段的程式碼，而非生產環境的預設值。

重要信任提示：

- `plugins.allow` 信任的是 **外掛程式 ID**，而非來源出處。
- 當工作區外掛啟用或列入允許清單時，若其 ID 與內建外掛相同，會有意遮蔽內建的副本。
- 這是正常且有用的行為，適用於本地開發、修補程式測試和熱修補。

## 匯出邊界

OpenClaw 匯出的是功能，而非實作上的便利性。

保持功能註冊為公開。修剪非合約的輔助匯出：

- 內建外掛特有的輔助子路徑
- 非預期作為公開 API 的運行時管道子路徑
- 供應商特有的便利輔助程式
- 屬於實作細節的設定/導入輔助程式

## 載入管線

啟動時，OpenClaw 大致會執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容的套件資訊清單及套件中繼資料
3. 拒絕不安全的候選項
4. 規範化外掛程式設定 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 決定每個候選項的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` hooks 並將註冊資訊收集至外掛程式註冊表中
8. 將註冊表暴露給指令/執行時層級

安全檢查機制發生在**執行時執行之前**。當入口點超出外掛程式根目錄、路徑可被全域寫入，或是非捆綁外掛程式的路徑所有權看起來可疑時，候選項將會被封鎖。

### 優先使用資訊清單的行為

清單是控制平面的單一真實來源。OpenClaw 使用它來：

- 識別外掛
- 探索宣告的通道/技能/配置架構或套件功能
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/佔位符
- 顯示安裝/目錄元資料

對於原生外掛，執行時模組是資料平面部分。它註冊實際行為，例如 hooks、tools、commands 或 provider flows。

### 載入器快取的內容

OpenClaw 會為以下內容保持短暫的進程內快取：

- 探索結果
- 清單註冊表資料
- 已載入的外掛註冊表

這些快取減少了突發啟動和重複指令的負擔。將它們視為短效的效能快取是安全的，而不是持久化。

效能提示：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取時間視窗。

## 註冊表模型

已載入的外掛不會直接修改隨機的核心全域變數。它們註冊到一個中央外掛註冊表中。

註冊表追蹤：

- 外掛記錄 (身分、來源、起源、狀態、診斷)
- tools
- legacy hooks 和 typed hooks
- channels
- providers
- gateway RPC 處理程式
- HTTP 路由
- CLI 註冊器
- 背景服務
- 外掛擁有的指令

然後，核心功能從該註冊表讀取，而不是直接與外掛模組通訊。這保持了載入的單向性：

- 外掛模組 -> 註冊表註冊
- 核心執行時 -> 註冊表使用

這種分離對可維護性很重要。這意味著大多數核心介面只需要一個整合點：「讀取註冊表」，而不是「對每個外掛模組進行特殊處理」。

## 對話繫結回呼

繫結對話的外掛可以在批准解析時做出反應。

使用 `api.onConversationBindingResolved(...)` 在繫結請求被批准或拒絕後接收回呼：

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

回呼載荷欄位：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的解析後繫結
- `request`：原始請求摘要、分離提示、寄件者 ID 以及
  對話中繼資料

此回調僅供通知使用。它不會改變允許綁定對話的人員，並且在核心核准處理完成後運行。

## 提供者執行時鉤子

提供者外掛現在具有兩個層級：

- 清單元資料： `providerAuthEnvVars` 用於在執行時載入之前進行低成本的 env-auth 查找，加上 `providerAuthChoices` 用於在執行時載入之前進行低成本的 onboarding/auth-choice 標籤和 CLI 標誌元資料
- 配置時鉤子： `catalog` / 舊版 `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍然擁有通用代理迴圈、故障轉移、交談記錄處理和
工具策略。這些鉤子是供應商特定行為的擴展表面，無需
構建完整的自訂推論傳輸。

當供應商具有基於環境變數的憑證，且通用身份驗證/狀態/模型選擇路徑
應在不加載插件運行時的情況下看到這些憑證時，請使用清單 `providerAuthEnvVars`。當
上架/身份驗證選擇 CLI 介面應在不加載供應商運行時的情況下
知道供應商的選擇 ID、群組標籤和簡單的單一標誌身份驗證連線時，
請使用清單 `providerAuthChoices`。將供應商運行時 `envVars`
用於操作員相關的提示，例如上架標籤或 OAuth
client-id/client-secret 設定變數。

### 鉤子順序與用法

對於模型/供應商插件，OpenClaw 大致按此順序呼叫鉤子。
「使用時機」欄是快速決策指南。

| #   | 鉤子                          | 作用                                                           | 使用時機                                                   |
| --- | ----------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `catalog`                     | 在 `models.json` 生成期間將提供者設定發布到 `models.providers` | 提供者擁有目錄或基礎 URL 預設值                            |
| --  | _(內建模型查詢)_              | OpenClaw 會先嘗試正常的註冊表/目錄路徑                         | _(不是外掛鉤子)_                                           |
| 2   | `resolveDynamicModel`         | 針對尚未出現在本地註冊表中的提供者擁有模型 ID 的同步後援       | 提供者接受任意上游模型 ID                                  |
| 3   | `prepareDynamicModel`         | 非同步預熱，然後 `resolveDynamicModel` 再次執行                | 提供者在解析未知 ID 之前需要網路元資料                     |
| 4   | `normalizeResolvedModel`      | 內嵌執行器使用解析出的模型之前的最終重寫                       | 提供者需要傳輸重寫，但仍使用核心傳輸                       |
| 5   | `capabilities`                | 由共享核心邏輯使用的提供者擁有的文字記錄/工具元數據            | 提供者需要文字記錄/提供者系列的特殊處理                    |
| 6   | `prepareExtraParams`          | 在通用串流選項包裝器之前請求參數標準化                         | 提供者需要預設請求參數或每個提供者的參數清理               |
| 7   | `wrapStreamFn`                | 應用通用包裝器之後的串流包裝器                                 | 提供者需要請求標頭/主體/模型相容性包裝器，而不使用自訂傳輸 |
| 8   | `formatApiKey`                | Auth 設定檔格式化器：儲存的設定檔變成執行時期 `apiKey` 字串    | 提供者儲存額外的 Auth 元數據並需要自訂執行時期 token 形狀  |
| 9   | `refreshOAuth`                | OAuth 更新覆寫，用於自訂更新端點或更新失敗政策                 | 提供者不符合共享的 `pi-ai` 更新器                          |
| 10  | `buildAuthDoctorHint`         | OAuth 重新整理失敗時附加的修復提示                             | 提供者在重新整理失敗後需要提供者擁有的驗證修復指導         |
| 11  | `isCacheTtlEligible`          | 代理/回傳提供者的提示快取原則                                  | 提供者需要特定代理的快取 TTL 閘控                          |
| 12  | `buildMissingAuthMessage`     | 取代通用的缺少驗證恢復訊息                                     | 提供者需要特定提供者的缺少驗證恢復提示                     |
| 13  | `suppressBuiltInModel`        | 過時的上游模型抑制加上可選的使用者面向錯誤提示                 | 提供者需要隱藏過時的上游列或用廠商提示取代它們             |
| 14  | `augmentModelCatalog`         | 探索後附加的合成/最終目錄列                                    | 提供者需要在 `models list` 和選擇器中新增合成的前向相容列  |
| 15  | `isBinaryThinking`            | 適用於二元思維提供者的開啟/關閉推理切換開關                    | 提供者僅公開二元思維的開啟/關閉                            |
| 16  | `supportsXHighThinking`       | 針對所選模型的 `xhigh` 推理支援                                | 提供者僅希望在部分模型上啟用 `xhigh`                       |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的預設 `/think` 等級                               | 提供者擁有模型系列的預設 `/think` 政策                     |
| 18  | `isModernModelRef`            | 用於即時設定檔過濾器及選擇測試的現代模型匹配器                 | 提供者擁有即時/選擇測試的首選模型匹配                      |
| 19  | `prepareRuntimeAuth`          | 在推論之前將設定的憑證交換為實際的執行時期記號/金鑰            | 提供者需要記號交換或短期請求憑證                           |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的用量/計費憑證以及相關狀態介面                  | 供應商需要自訂用量/配額權杖解析或不同的用量憑證            |
| 21  | `fetchUsageSnapshot`          | 在解析驗證後，擷取並正規化供應商特定的用量/配額快照            | 供應商需要供應商特定的用量端點或負載解析器                 |

如果供應商需要完全自訂的線路協定或自訂請求執行器，
那是不同類別的擴充功能。這些掛鉤是針對仍在 OpenClaw
正常推理迴圈上執行的供應商行為。

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
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因為其擁有 Claude
  4.6 向前相容性、供應商系列提示、驗證修復指導、使用量
  端點整合、提示快取資格，以及 Claude 預設/自適應
  思考策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities` 以及 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因為它擁有 GPT-5.4 向後相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 標準化、Codex 感知驗證
  提示、Spark 抑制、合成 OpenAI 列表行以及 GPT-5 思維 /
  即時模型政策。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該供應商是直通的，且可能在 OpenClaw 的靜態目錄更新前公開新的
  模型 ID；它也使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 來將
  供應商特定的請求標頭、路由元資料、推理修補（reasoning patches）和
  提示快取策略保留在核心之外。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要供應商擁有的裝置登入、模型後援行為、Claune 轉錄
  怪癖、GitHub 權杖 -> Copilot 權杖交換，以及供應商擁有的使用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍然在核心 OpenAI 傳輸上運行，但擁有其傳輸/基本 URL
  正規化、OAuth 刷新後備策略、預設傳輸選擇、
  合成 Codex 目錄行以及 ChatGPT 使用端點整合。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因為它們擁有 Gemini 3.1 向前相容後備以及
  現代模型比對功能；Gemini CLI OAuth 也使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 進行 Token 格式化、Token
  解析以及配額端點連線。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共用
  OpenAI 傳輸，但需要提供者擁有的思考 payload 正規化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要提供者擁有的請求標頭、
  推理 payload 正規化、Gemian 轉錄提示以及 Anthropic
  快取 TTL 閘控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 降級、
  `tool_stream` 預設值、二元思維 UX、現代模型匹配，以及
  使用授權和配額擷取。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities`，
  以將對話紀錄/工具處理的怪癖排除在核心之外。
- 僅目錄捆綁的提供者，例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine` 僅使用
  `catalog`。
- Qwen 入口網站使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和小米使用 `catalog` 加上使用情況鉤子，因為它們的 `/usage`
  行為是由外掛擁有的，儘管推論仍通過共享傳輸執行。

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

- `textToSpeech` 會傳回檔案/語音備忘錄介面的標準核心 TTS 輸出內容。
- 使用核心 `messages.tts` 組態和提供者選擇。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對每個提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音列表可以包含更豐富的中繼資料，例如地區設定、性別和人格標籤，供感知提供者的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援電話功能。Microsoft 則否。

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

- 將 TTS 政策、後援和回覆傳遞保留在核心中。
- 使用語音提供者來處理廠商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會被正規化為 `microsoft` 提供者 ID。
- 首選的所有權模型是以公司為導向的：一個廠商外掛程式可以擁有
  文字、語音、圖片以及未來的媒體提供者，隨著 OpenClaw 新增這些
  能力合約。

針對圖片/音訊/視訊理解，外掛程式需註冊一個類型化的
媒體理解提供者，而非通用的鍵值包袋：

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

- 將編排、後備、設定和通道連線保留在核心中。
- 將廠商行為保留在提供者外掛程式中。
- 增量擴充應保持類型化：新增可選方法、新增可選
  結果欄位、新增可選能力。
- 如果 OpenClaw 稍後新增例如視訊產生等新能力，請先定義
  核心能力合約，然後再讓廠商外掛程式向其註冊。

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

對於音訊轉錄，外掛程式可以使用 media-understanding 執行階段
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
  圖片/音訊/視訊理解的建議共用介面。
- 使用核心 media-understanding 音訊組態 (`tools.media.audio`) 和提供者回退順序。
- 當未產生轉錄輸出時（例如跳過/不支援的輸入），會傳回 `{ text: undefined }`。
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

- `provider` 和 `model` 是選用的單次執行覆寫，而非持續的工作階段變更。
- OpenClaw 僅對受信任的呼叫者遵循這些覆寫欄位。
- 對於外掛程式擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 加入使用。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的正規 `provider/model` 目標，或使用 `"*"` 以明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後援。

對於網路搜尋，外掛程式可以使用共享的執行時輔助程式，而不是深入探查代理程式工具的連線：

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
- `api.runtime.webSearch.*` 是功能/通道外掛程式的首選共享介面，這些外掛程式需要搜尋行為而不依賴代理程式工具包裝函式。

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
- `auth`：必填。使用 `"gateway"` 要求正常的 Gateway 驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/Webhook 驗證。
- `match`：選填。`"exact"` (預設值) 或 `"prefix"`。
- `replaceExisting`：選填。允許同一個外掛程式取代其現有的路由註冊。
- `handler`：當路由處理了請求時，回傳 `true`。

備註：

- `api.registerHttpHandler(...)` 已過時。請使用 `api.registerHttpRoute(...)`。
- 外掛路由必須明確宣告 `auth`。
- 除非 `replaceExisting: true`，否則會拒絕精確的 `path + match` 衝突，且一個外掛無法取代另一個外掛的路由。
- 具有不同 `auth` 層級的重疊路由會被拒絕。請將 `exact`/`prefix` 穿透鏈保持在同一個授權層級上。

## 外掛 SDK 匯入路徑

在撰寫外掛時，使用 SDK 子路徑而不是單體式的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/plugin-entry` 用於外掛註冊原語。
- `openclaw/plugin-sdk/core` 用於通用的共享外掛程式介面合約。
- 穩定的通道基本型別，例如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress`，用於共享設定/驗證/回覆/Webhook
  接線。
- 領域子路徑，例如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/channel-runtime`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime`，用於共享執行時期/設定輔助程式。
- 縮小 channel-core 子路徑，例如 `openclaw/plugin-sdk/discord-core`、
  `openclaw/plugin-sdk/telegram-core` 和 `openclaw/plugin-sdk/whatsapp-core`，
  用於特定於頻道的基元，這些基元應小於完整的
  channel helper barrels。
- Bundle 的擴充功能內部保持私有。外部擴充功能應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可以使用儲存庫
  中的公開進入點，位於 `extensions/<id>/index.js`、`api.js`、`runtime-api.js`、
  `setup-entry.js` 之下，以及範圍狹窄的檔案，例如 `login-qr-api.js`。切勿
  從核心或其他擴充功能匯入 `extensions/<id>/src/*`。
- Repo entry point split:
  `extensions/<id>/api.js` 是輔助/型別桶檔案,
  `extensions/<id>/runtime-api.js` 是僅限執行時的桶檔案,
  `extensions/<id>/index.js` 是打包的外掛入口,
  而 `extensions/<id>/setup-entry.js` 是設定外掛入口。
- `openclaw/plugin-sdk/telegram` 提供 Telegram 頻道外掛型別和共用的面向頻道的輔助函式。內建的 Telegram 實作內部細節保持為打包擴充功能的私有內容。
- `openclaw/plugin-sdk/discord` 提供 Discord 頻道外掛型別和共用的面向頻道的輔助函式。內建的 Discord 實作內部細節保持為打包擴充功能的私有內容。
- `openclaw/plugin-sdk/slack` 提供 Slack 頻道外掛型別和共用的面向頻道的輔助函式。內建的 Slack 實作內部細節保持為打包擴充功能的私有內容。
- `openclaw/plugin-sdk/imessage` 用於 iMessage 通道外掛程式類型和共用的通道導向輔助程式。內建的 iMessage 實作內部細節保留在捆綁擴充功能的私有範圍內。
- `openclaw/plugin-sdk/whatsapp` 用於 WhatsApp 通道外掛程式類型和共用的通道導向輔助程式。內建的 WhatsApp 實作內部細節保留在捆綁擴充功能的私有範圍內。
- `openclaw/plugin-sdk/bluebubbles` 保持公開，因為它提供了一個小而專注的輔助介面，且是故意共用的。

相容性備註：

- 避免在新的程式碼中使用根目錄的 `openclaw/plugin-sdk` 桶狀匯入。
- 優先使用狹窄且穩定的基元。較新的 setup/pairing/reply/
  secret-input/webhook 子路徑是新捆綁和外部外掛程式工作的預期契約。
- 隨附的擴充功能特定 helper barrels 預設是不穩定的。如果
  helper 僅被隨附的擴充功能所需要，請將其保留在擴充功能的本機
  `api.js` 或 `runtime-api.js` 縫隙之後，而不是將其提升至
  `openclaw/plugin-sdk/<extension>`。
- 諸如 `image-generation`、
  `media-understanding` 和 `speech` 等特定功能的子路徑之所以存在，是因為捆綁/原生外掛程式目前使用它們。它們的存在本身並不意味著每個匯出的輔助程式都是長期凍結的外部合約。

## 訊息工具架構

外掛應擁有特定通道的 `describeMessageTool(...)` 架構
貢獻。請將提供者特定的欄位保留在外掛中，而不是在共用核心中。

對於共用的可攜式架構片段，請重用透過 `openclaw/plugin-sdk/channel-runtime` 匯出的通用 helpers：

- `createMessageToolButtonsSchema()` 用於按鈕網格樣式 payload
- `createMessageToolCardSchema()` 用於結構化卡片 payload

如果某個 schema 形狀只對某一個 provider有意義，請在該 plugin 自己的原始碼中定義它，而不是將其提升到共享 SDK 中。

## Channel 目標解析

Channel plugin 應該擁有特定於 channel 的目標語意。保持共享的 outbound host 通用，並使用訊息介面卡 來處理 provider 規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查詢之前，是否應將標準化目標視為 `direct`、`group` 或 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心，是否應將輸入直接跳到類似 ID 的解析，而不是目錄搜尋。
- 當核心在正規化或目錄未命中後需要最終的提供者所有者解析時，`messaging.targetResolver.resolveTarget(...)` 是外掛程式的後備機制。
- 一旦解析了目標，`messaging.resolveOutboundSessionRoute(...)` 即負責提供者專屬的工作階段路由建構。

建議的劃分：

- 使用 `inferTargetChatType` 進行應在搜尋同層/群組之前發生的類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 進行提供者專屬的正規化後備，而非廣泛的目錄搜尋。
- 將提供者原生 ID（如聊天 ID、執行緒 ID、JIDs、handles 和房間 ID）保留在 `target` 值或提供者專屬參數中，而非一般 SDK 欄位中。

## 設定支援的目錄

從配置衍生目錄條目的外掛程式應將該邏輯保留在外掛程式中，並重複使用來自 `openclaw/plugin-sdk/directory-runtime` 的共享協助程式。

當通道需要由配置支援的同儕/群組時，請使用此選項，例如：

- 由允許清單驅動的 DM 同儕
- 已配置的通道/群組對應
- 帳戶範圍的靜態目錄後援

`directory-runtime` 中的共享協助程式僅處理一般操作：

- 查詢篩選
- 限制應用
- 去重/正規化協助程式
- 建構 `ChannelDirectoryEntry[]`

特定通道的帳戶檢查和 ID 正規化應保留在外掛程式實作中。

## 提供者目錄

提供者外掛程式可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型目錄。

`catalog.run(...)` 會傳回 OpenClaw 寫入 `models.providers` 的相同形狀：

- 單一提供者條目的 `{ provider }`
- 多個提供者條目的 `{ providers }`

當外掛擁有特定提供者的模型 ID、基本 URL 預設值或需授權的模型中繼資料時，請使用 `catalog`。

`catalog.order` 控制外掛的目錄相對於 OpenClaw 內建隱式提供者合併的時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當存在驗證設定檔時出現的提供者
- `paired`：綜合多個相關提供者條目的提供者
- `late`：最後一輪，在其他隱式提供者之後

發生索引鍵衝突時，後面的提供者會獲勝，因此外掛可以使用相同的提供者 ID 有意覆蓋內建的提供者條目。

相容性：

- `discovery` 仍作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的外掛註冊了一個通道，建議連同 `plugin.config.inspectAccount(cfg, accountId)` 一起實作 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它被允許假設憑證已完全具體化，並且可以在缺少必要的密鑰時快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 等唯讀指令路徑，以及 doctor/config
  修復流程，不應僅為了描述設定就需要具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅返回描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要僅為了回報唯讀可用性而返回原始權杖值。返回 `tokenStatus: "available"`（以及相符的來源欄位）對於狀態式指令已足夠。
- 當憑證是透過 SecretRef 設定但在目前指令路徑中無法取得時，請使用 `configured_unavailable`。

這使得唯讀指令可以回報「已設定但在此指令路徑中無法使用」，而不是崩潰或錯誤地回報帳戶未設定。

## 套件包

外掛程式目錄可能包含具有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛程式。如果套件包列出了多個擴充功能，外掛程式 ID 將變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依項，請在該目錄中安裝它們，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 條目都必須保留在外掛程式目錄內。脫離套件目錄的條目將被拒絕。

安全提示：`openclaw plugins install` 會使用 `npm install --ignore-scripts`（無生命周期腳本）安裝外掛相依性。請保持外掛相依性樹為「純 JS/TS」，並避免需要 `postinstall` 建構的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。當 OpenClaw 需要為已停用的通道外掛提供設定介面，或者當通道外掛已啟用但尚未設定時，它會載入 `setupEntry` 而非完整的外掛入口。這能在您的主要外掛入口同時連接工具、掛鉤或其他僅執行期程式碼時，讓啟動和設定過程更輕量。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛在閘道的預監聽啟動階段選擇加入相同的 `setupEntry` 路徑，即使該通道已經設定過也是如此。

僅當 `setupEntry` 完全涵蓋必須在閘道開始監聽之前存在的啟動表面時，才使用此選項。實際上，這意味著 setup 項目必須註冊啟動依賴的每個通道擁有的能力，例如：

- 通道註冊本身
- 任何必須在閘道開始監聽之前可用的 HTTP 路由
- 任何必須在同一視窗期間存在的閘道方法、工具或服務

如果您的完整項目仍然擁有任何必需的啟動能力，請勿啟用此旗標。保持外掛程式處於預設行為，並讓 OpenClaw 在啟動期間載入完整項目。

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

通道外掛程式可以透過 `openclaw.channel` 宣傳設定/探索元資料，並透過 `openclaw.install` 提供安裝提示。這使核心目錄保持免於資料負擔。

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

OpenClaw 也可以合併**外部通道目錄**（例如 MPM 註冊表匯出）。將 JSON 檔案置於以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一個或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 情境引擎外掛

情境引擎外掛擁有擷取、組裝和壓縮的會話情境協調流程。使用 `api.registerContextEngine(id, factory)` 從您的插件註冊它們，然後使用 `plugins.slots.contextEngine` 選取活動引擎。

當您的插件需要取代或擴充預設情境管線，而不僅僅是新增記憶體搜尋或掛鉤時，請使用此功能。

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
已實作並明確地委派給它：

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

## 新增功能

當外掛需要不符合當前 API 的行為時，請勿使用私有的深入存取繞過
外掛系統。請新增缺失的功能。

建議的順序：

1. 定義核心合約
   決定核心應擁有哪些共享行為：政策、後備、配置合併、
   生命週期、面向頻道的語意以及執行時期輔助程式形狀。
2. 新增具類型的外掛註冊/執行時期介面
   以最小且有用的
   具類型功能介面擴充 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心與頻道/功能消費者
   頻道和功能外掛應透過核心來使用新功能，
   而非直接匯入供應商的實作。
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
- `src/test-utils/plugin-registration.ts` 中的 capture/test helpers
- `src/plugins/contracts/registry.ts` 中的 ownership/contract assertions
- `docs/` 中的 operator/plugin docs

如果缺少其中任何一個部分，通常表示該功能尚未完全整合。

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

- core 擁有功能合約 + 編排
- vendor plugins 擁有 vendor 實作
- feature/channel plugins 使用 runtime helpers
- 合約測試保持所有權明確

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

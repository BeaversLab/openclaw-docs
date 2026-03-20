---
summary: "OpenClaw 外掛程式/擴充功能：探索、設定與安全性"
read_when:
  - 新增或修改外掛程式/擴充功能
  - 記錄外掛程式安裝或載入規則
  - 使用與 Codex/Claude 相容的外掛程式套件
title: "外掛程式"
---

# 外掛程式 (擴充功能)

## 快速入門 (不熟悉外掛程式？)

外掛程式可以是下列任一項：

- 原生 **OpenClaw 外掛程式** (`openclaw.plugin.json` + 執行時期模組)，或
- 相容的 **套件** (`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`)

這兩者都會顯示在 `openclaw plugins` 下，但只有原生 OpenClaw 外掛程式會在程序內執行執行時期程式碼。

大多數時候，當您想要使用尚未內建於核心 OpenClaw 的功能 (或是您想將選用功能保留在主要安裝之外) 時，就會使用外掛程式。

快速途徑：

1. 檢視已載入的項目：

```bash
openclaw plugins list
```

2. 安裝官方外掛程式 (範例：Voice Call)：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 規格僅限於 registry。請參閱 [安裝規則](/zh-Hant/cli/plugins#install) 以取得有關釘選、發行前版本閘道及支援規格格式的詳細資訊。

3. 重新啟動 Gateway，然後在 `plugins.entries.<id>.config` 下進行設定。

如需具體的外掛程式範例，請參閱 [Voice Call](/zh-Hant/plugins/voice-call)。
正在尋找第三方清單？請參閱 [社群外掛程式](/zh-Hant/plugins/community)。
需要套件相容性詳細資訊？請參閱 [外掛程式套件](/zh-Hant/plugins/bundles)。

對於相容的套件，請從本機目錄或封存檔安裝：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

若要從 Claude marketplace 安裝，請先列出 marketplace，然後依 marketplace 項目名稱安裝：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 會從 `~/.claude/plugins/known_marketplaces.json` 解析已知的 Claude marketplace 名稱。您也可以使用 `--marketplace` 傳遞明確的 marketplace 來源。

## 對話繫結回呼

繫結對話的外掛程式現在可以在解決核准時做出回應。

使用 `api.onConversationBindingResolved(...)` 在繫結請求獲得核准或拒絕後接收回呼：

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

回呼 payload 欄位：

- `status`: `"approved"` 或 `"denied"`
- `decision`: `"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的解析綁定
- `request`：原始請求摘要、分離提示、發送者 ID 和
  對話元數據

此回調僅用於通知。它不會改變允許綁定對話的人員，並且在核心批准處理完成後運行。

## 公共能力模型

能力是 OpenClaw 內部公共的**原生外掛**模型。每個
原生 OpenClaw 外掛都針對一或多種能力類型進行註冊：

| 能力          | 註冊方法                           | 範例外掛           |
| ------------------- | --------------------------------------------- | ------------------------- |
| 文字推理      | `api.registerProvider(...)`                   | `openai`、`anthropic`     |
| 語音              | `api.registerSpeechProvider(...)`             | `elevenlabs`、`microsoft` |
| 媒體理解 | `api.registerMediaUnderstandingProvider(...)` | `openai`、`google`        |
| 圖像生成    | `api.registerImageGenerationProvider(...)`    | `openai`、`google`        |
| 網路搜尋          | `api.registerWebSearchProvider(...)`          | `google`                  |
| 通道 / 訊息傳遞 | `api.registerChannel(...)`                    | `msteams`、`matrix`       |

註冊零個能力但提供掛鉤、工具或
服務的外掛是**僅舊版掛鉤**外掛。該模式仍被完全支援。

### 外部兼容性立場

能力模型已在核心落地，並且目前由內建/原生外掛使用，
但外部外掛兼容性仍需要比「它已導出，因此已凍結」更嚴格的標準。

當前指導原則：

- **現有外部外掛：** 保持基於掛鉤的整合正常運作；將
  此視為兼容性基線
- **新的內建/原生外掛：** 優先顯式能力註冊，
  而非供應商特定的深入調用或新的僅掛鉤設計
- **採用能力註冊的外部外掛：** 允許，但除非文檔明確標記
  合約為穩定，否則將特定能力的輔助介面視為正在演進

實用規則：

- 能力註冊 API 是預期方向
- 在過渡期間，舊版掛鉤仍然是外部外掛最安全且無中斷的途徑
- 匯出的輔助子路徑並非都相等；優先使用狹義的文件化契約，而非偶然的輔助匯出

### 外掛程式形狀

OpenClaw 根據每個已載入外掛程式的實際註冊行為（而不僅僅是靜態元資料）將其分類為一種形狀：

- **plain-capability** — 僅註冊一種功能類型（例如僅提供者的外掛程式，如 `mistral`）
- **hybrid-capability** — 註冊多種功能類型（例如 `openai` 擁有文字推論、語音、媒體理解和影像生成功能）
- **hook-only** — 僅註冊掛鉤（型別化或自訂），不註冊功能、工具、指令或服務
- **non-capability** — 註冊工具、指令、服務或路由，但不註冊功能

使用 `openclaw plugins inspect <id>` 查看外掛程式的形狀和功能細分。詳情請參閱 [CLI 參考資料](/zh-Hant/cli/plugins#inspect)。

### 舊版掛鉤

`before_agent_start` 掛鉤仍作為僅掛鉤外掛程式的相容性路徑受到支援。現實中的舊版外掛程式仍依賴它。

方向：

- 保持其運作
- 將其記錄為舊版
- 對於模型/提供者覆寫工作，優先使用 `before_model_resolve`
- 對於提示詞變異工作，優先使用 `before_prompt_build`
- 僅在實際使用量下降且固定裝置覆蓋率證明遷移安全後才移除

### 相容性訊號

當您執行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 時，您可能會看到其中一個標籤：

| 訊號                     | 含義                                                      |
| -------------------------- | ------------------------------------------------------------ |
| **config valid**           | 設定解析正常且外掛程式已解析                       |
| **compatibility advisory** | 外掛程式使用受支援但較舊的模式（例如 `hook-only`） |
| **legacy warning**         | 外掛程式使用已棄用的 `before_agent_start`        |
| **hard error**             | 設定無效或外掛程式載入失敗                   |

`hook-only` 或 `before_agent_start` 都不會在今天導致您的外掛程式中斷 — `hook-only` 僅供參考，而 `before_agent_start` 只會觸發警告。這些訊號也會出現在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架構

OpenClaw 的外掛程式系統有四層：

1. **資訊清單 + 探索**
   OpenClaw 會從已設定的路徑、工作區根目錄、
   全域擴充功能根目錄以及打包擴充功能中尋找候選外掛。探索機制會先讀取原生
   `openclaw.plugin.json` 資訊清單以及支援的打包資訊清單。
2. **啟用 + 驗證**
   核心會決定探索到的外掛是已啟用、已停用、已封鎖，
   還是被選取用於記憶體等獨佔插槽。
3. **執行階段載入**
   原生 OpenClaw 外掛透過 jiti 在程序內載入，並將
   能力註冊到中央註冊表中。相容的打包擴充功能會被正規化為
   註冊表記錄，而不會匯入執行階段程式碼。
4. **介面消耗**
   OpenClaw 的其餘部分會讀取註冊表，以公開工具、頻道、提供者
   設定、Hooks、HTTP 路由、CLI 指令和服務。

重要的設計邊界：

- 探索 + 設定驗證應僅依賴 **資訊清單/結構描述中繼資料**
  而無需執行外掛程式碼
- 原生執行階段行為來自外掛模組的 `register(api)` 路徑

這種分割讓 OpenClaw 能在完整執行階段啟用之前驗證設定、解釋遺失/已停用的外掛，並
   建立 UI/結構描述提示。

### 頻道外掛與共享訊息工具

頻道外掛不需要針對一般聊天動作註冊個別的傳送/編輯/回應工具。OpenClaw 會在核心中保留一個共享的 `message` 工具，
   而頻道外掛則擁有其後的頻道特定探索與執行邏輯。

目前的邊界為：

- 核心擁有共享 `message` 工具主機、提示連線、階段作業/執行緒
  簿記，以及執行分派
- 頻道外掛擁有範圍動作探索、能力探索，以及任何
  頻道特定的結構描述片段
- 頻道外掛透過其動作配接器執行最終動作

對於頻道外掛，SDK 介面為
   `ChannelMessageActionAdapter.describeMessageTool(...)`。這個統一的探索
   呼叫讓外掛能同時傳回其可見動作、能力和結構描述
   貢獻，以免這些部分分離。

核心會將執行階段範圍傳入該探索步驟。重要欄位包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

這對於上下文相關的插件很重要。通道可以根據當前帳戶、當前房間/線程/訊息或受信任的請求者身分來隱藏或顯示訊息操作，而無需在核心 `message` 工具中硬編碼通道特定的分支。

這就是為什麼嵌入式運行器路由更改仍然是插件工作的原因：運行器負責將當前聊天/會話身分轉發到插件發現邊界，以便共享 `message` 工具為當前回合暴露正確的通道擁有的介面。

對於通道擁有的執行輔助程序，捆綁插件應將執行時保留在其自己的擴展模組中。核心不再擁有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 訊息操作執行時。我們不發布單獨的 `plugin-sdk/*-action-runtime` 子路徑，並且捆綁插件應直接從其擴展擁有的模組導入自己的本地執行時代碼。

具體對於投票，有兩條執行路徑：

- `outbound.sendPoll` 是適合通用投票模型的通道的共享基線
- `actions.handleAction("poll")` 是通道特定的投票語義或額外投票參數的首選路徑

核心現在將共享投票解析延遲到插件投票調度拒絕該操作之後，因此插件擁有的投票處理程序可以接受通道特定的投票字段，而不會首先被通用投票解析程序阻止。

有關完整的啟動順序，請參閱[載入管道](#load-pipeline)。

## 功能所有權模型

OpenClaw 將原生插件視為**公司**或**功能**的所有權邊界，而不是不相關整合的百寶袋。

這意味著：

- 公司插件通常應擁有該公司所有面向 OpenClaw 的介面
- 功能插件通常應擁有其引入的完整功能介面
- 通道應使用共享核心功能，而不是臨時重新實現提供者行為

範例：

- 隨附的 `openai` 外掛程式擁有 OpenAI 模型提供者行為，以及 OpenAI 語音 + 媒體理解 + 影像生成行為
- 隨附的 `elevenlabs` 外掛程式擁有 ElevenLabs 語音行為
- 隨附的 `microsoft` 外掛程式擁有 Microsoft 語音行為
- 隨附的 `google` 外掛程式擁有 Google 模型提供者行為，以及 Google 媒體理解 + 影像生成 + 網路搜尋行為
- 隨附的 `minimax`、`mistral`、`moonshot` 和 `zai` 外掛程式各擁有其媒體理解後端
- `voice-call` 外掛程式是功能外掛程式：它擁有通訊傳輸、工具、CLI、路由和執行時期，但它使用核心 TTS/STT 功能，而不是發明第二個語音堆疊

預期的最終狀態是：

- 即使 OpenAI 涵蓋文字模型、語音、影像和未來的影片，它也只存在於一個外掛程式中
- 其他供應商可以對其自己的領域做同樣的事
- 通道不在乎哪個供應商外掛程式擁有該提供者；它們使用由核心公開的共享功能合約

這是關鍵區別：

- **外掛程式** = 擁有權邊界
- **功能** = 多個外掛程式可以實作或使用的核心合約

因此，如果 OpenClaw 新增一個新的領域（例如影片），第一個問題不是「哪個提供者應該硬式編碼影片處理？」。第一個問題是「核心影片功能合約是什麼？」。一旦該合約存在，供應商外掛程式就可以註冊它，而通道/功能外掛程式就可以使用它。

如果該功能尚不存在，正確的做法通常是：

1. 在核心中定義缺失的功能
2. 以類型化方式透過外掛程式 API/執行時期公開它
3. 針對該功能連接通道/功能
4. 讓供應商外掛程式註冊實作

這保持了擁有權的明確性，同時避免了依賴單一供應商或一次性外掛程式特定程式碼路徑的核心行為。

### 功能分層

在決定程式碼所屬位置時，請使用此心智模型：

- **核心功能層**：共享協調、政策、備援、設定合併規則、傳遞語意和類型化合約
- **廠商外掛層**：廠商專屬 API、身分驗證、模型目錄、語音
  合成、影像生成、未來的影片後端、使用量端點
- **通道/功能外掛層**：Slack/Discord/語音通話/等整合
  消費核心功能並將其呈現於介面上

例如，TTS 遵循此形狀：

- core 擁有回覆時間 TTS 政策、後備順序、偏好設定與通道傳遞
- `openai`、`elevenlabs` 與 `microsoft` 擁有合成實作
- `voice-call` 消費電話 TTS 執行時期輔助程式

未來的功能應偏好採用相同的模式。

### 多功能廠商外掛範例

廠商外掛從外部看來應具有一致性。若 OpenClaw 對模型、語音、媒體理解與網路搜尋有共用合約，廠商可在一個地方擁有所有介面：

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

重要的不是確切的輔助程式名稱。形狀才重要：

- 一個外掛擁有廠商介面
- core 仍擁有功能合約
- 通道與功能外掛消費 `api.runtime.*` 輔助程式，而非廠商程式碼
- 合約測試可斷言外掛已註冊其聲稱擁有的功能

### 功能範例：影片理解

OpenClaw 已將影像/音訊/影片理解視為一個共用
功能。同樣的所有權模型也適用於此：

1. core 定義媒體理解合約
2. 廠商外掛依情況註冊 `describeImage`、`transcribeAudio` 與
   `describeVideo`
3. 通道與功能外掛消費共用的 core 行為，而非
   直接連接至廠商程式碼

如此可避免將某個供應商的影片假設硬編碼至 core 中。外掛擁有
廠商介面；core 擁有功能合約與後備行為。

若 OpenClaw 稍後新增新領域，例如影片生成，請再次使用相同的
順序：先定義核心功能，再讓廠商外掛
針對其註冊實作。

需要具體的推出檢查清單？請參閱
[Capability Cookbook](/zh-Hant/tools/capability-cookbook)。

## 相容套件組合

OpenClaw 也識別兩種相容的外部套件組合配置：

- Codex 風格套件：`.codex-plugin/plugin.json`
- Claude 風格套件：`.claude-plugin/plugin.json` 或不含資訊清單 (manifest) 的預設 Claude 組件佈局
- Cursor 風格套件：`.cursor-plugin/plugin.json`

Claude 市集條目可以指向這些相容套件中的任何一種，或指向原生 OpenClaw 外掛來源。OpenClaw 會先解析市集條目，然後對解析出的來源執行正常安裝路徑。

它們會在此外掛清單中顯示為 `format=bundle`，並在詳細/檢查輸出中帶有 `codex`、`claude` 或 `cursor` 子類型。

請參閱 [外掛套件](/zh-Hant/plugins/bundles) 以了解確切的偵測規則、對應行為和目前的支援矩陣。

目前，OpenClaw 將這些視為**功能包**，而非原生執行時外掛：

- 目前已支援：套件內建的 `skills`
- 目前已支援：Claude `commands/` markdown 根目錄，已對應至正常的 OpenClaw 技能載入器
- 目前已支援：Claude 套件 `settings.json` 預設值，用於內嵌 Pi 代理程式設定（已清理 shell 覆寫金鑰）
- 目前已支援：套件 MCP 設定，已合併至內嵌 Pi 代理程式設定中作為 `mcpServers`，並在內嵌 Pi 代理程式回合中公開支援的 stdio 套件 MCP 工具
- 目前已支援：Cursor `.cursor/commands/*.md` 根目錄，已對應至正常的 OpenClaw 技能載入器
- 現已支援：使用 OpenClaw hook-pack 配置的 Codex bundle hook 目錄（`HOOK.md` + `handler.ts`/`handler.js`）
- 已偵測但尚未連線：其他宣告的套件功能，例如代理程式、Claude hook 自動化、Cursor 規則/hook 中繼資料、app/LSP 中繼資料、輸出樣式

這表示套件安裝/探索/列表/資訊/啟用功能皆可正常運作，且當套件啟用時，會載入套件技能、Claude 指令技能、Claude 套件設定預設值，以及相容的 Codex hook 目錄。受支援的套件 MCP 伺服器若使用受支援的 stdio 傳輸，也可能作為子程序執行以進行內嵌 Pi 工具呼叫，但套件執行時模組不會以同處理程序 (in-process) 方式載入。

Bundle hook 支援僅限於標準的 OpenClaw hook 目錄格式
(`HOOK.md` 加上宣告的 hook 根目錄下的 `handler.ts`/`handler.js`)。
供應商特定的 shell/JSON hook 執行時，包括 Claude `hooks.json`，
目前僅會被偵測到，而不會直接執行。

## 執行模型

原生 OpenClaw 外掛程式與 Gateway **同進程 (in-process)** 執行。它們並未
被沙箱化。已載入的原生外掛程式擁有與
核心程式碼相同的進程層級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、hooks 和服務
- 原生外掛程式的錯誤可能會導致 gateway 當機或不穩定
- 惡意的原生外掛程式等同於在
  OpenClaw 進程內執行任意程式碼

相容的 bundles 預設上更安全，因為 OpenClaw 目前將其
視為元資料/內容包。在目前的版本中，這主要是指內建的
技能。

請對非內建的外掛程式使用允許清單和明確的安裝/載入路徑。請將
工作區外掛程式視為開發時期的程式碼，而非生產環境的預設值。

重要信任提示：

- `plugins.allow` 信任的是 **外掛程式 id**，而非來源出處。
- 當啟用或加入允許清單時，擁有與內建外掛程式相同 id 的工作區外掛程式
  會刻意覆蓋內建的副本。
- 這是正常的行為，且對於本機開發、修補測試和熱修復很有用。

## 可用的外掛程式 (官方)

- Microsoft Teams 自 2026.1.15 起僅支援外掛程式；如果您使用 Teams，請安裝 `@openclaw/msteams`。
- Memory (Core) — 內建的記憶體搜尋外掛程式 (透過 `plugins.slots.memory` 預設啟用)
- Memory (LanceDB) — 內建的長期記憶外掛程式 (自動召回/擷取；設定 `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/zh-Hant/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh-Hant/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh-Hant/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh-Hant/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh-Hant/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh-Hant/channels/msteams) — `@openclaw/msteams`
- Anthropic provider runtime — bundled as `anthropic` (預設啟用)
- BytePlus provider catalog — bundled as `byteplus` (預設啟用)
- Cloudflare AI Gateway provider catalog — bundled as `cloudflare-ai-gateway` (預設啟用)
- Google web search + Gemini CLI OAuth — bundled as `google` (網路搜尋會自動載入；提供者驗證保持選用)
- GitHub Copilot provider runtime — bundled as `github-copilot` (預設啟用)
- Hugging Face provider catalog — bundled as `huggingface` (預設啟用)
- Kilo Gateway provider runtime — bundled as `kilocode` (預設啟用)
- Kimi Coding provider catalog — bundled as `kimi-coding` (預設啟用)
- MiniMax provider catalog + usage + OAuth — bundled as `minimax` (預設啟用；擁有 `minimax` 和 `minimax-portal`)
- Mistral provider capabilities — bundled as `mistral` (預設啟用)
- Model Studio provider catalog — bundled as `modelstudio` (預設啟用)
- Moonshot provider runtime — bundled as `moonshot` (預設啟用)
- NVIDIA provider catalog — bundled as `nvidia` (預設啟用)
- ElevenLabs speech provider — bundled as `elevenlabs` (預設啟用)
- Microsoft speech provider — bundled as `microsoft` (預設啟用；舊版 `edge` 輸入對應至此處)
- OpenAI provider runtime — bundled as `openai` (預設啟用；同時擁有 `openai` 和 `openai-codex`)
- OpenCode Go provider capabilities — bundled as `opencode-go` (預設啟用)
- OpenCode Zen provider capabilities — bundled as `opencode` (預設啟用)
- OpenRouter provider runtime — bundled as `openrouter` (預設啟用)
- Qianfan 提供者目錄 — 打包為 `qianfan`（預設啟用）
- Qwen OAuth（提供者驗證 + 目錄） — 打包為 `qwen-portal-auth`（預設啟用）
- Synthetic 提供者目錄 — 打包為 `synthetic`（預設啟用）
- Together 提供者目錄 — 打包為 `together`（預設啟用）
- Venice 提供者目錄 — 打包為 `venice`（預設啟用）
- Vercel AI Gateway 提供者目錄 — 打包為 `vercel-ai-gateway`（預設啟用）
- Volcengine 提供者目錄 — 打包為 `volcengine`（預設啟用）
- Xiaomi 提供者目錄 + 用量 — 打包為 `xiaomi`（預設啟用）
- Z.AI 提供者運行時 — 打包為 `zai`（預設啟用）
- Copilot Proxy（提供者驗證） — 本地 VS Code Copilot Proxy 橋接；與內建 `github-copilot` 設備登入不同（已打包，預設停用）

原生的 OpenClaw 外掛是透過 jiti 在執行時載入的 **TypeScript 模組**。
**組態驗證不會執行外掛程式碼**；它會改用外掛清單
和 JSON Schema。請參閱 [Plugin manifest](/zh-Hant/plugins/manifest)。

原生的 OpenClaw 外掛可以註冊功能和介面：

**功能**（公開外掛模型）：

- 文字推論提供者（模型目錄、驗證、執行時掛鉤）
- 語音提供者
- 媒體理解提供者
- 影像生成提供者
- 網路搜尋提供者
- 頻道 / 訊息連接器

**介面**（支援基礎設施）：

- Gateway RPC 方法與 HTTP 路由
- Agent 工具
- CLI 指令
- 背景服務
- Context 引擎
- 選用組態驗證
- **技能**（透過在外掛清單中列出 `skills` 目錄）
- **自動回覆指令**（無需呼叫 AI agent 即可執行）

原生的 OpenClaw 外掛與 Gateway 在同一行程內執行（請參閱
[Execution model](#execution-model) 以了解信任影響）。
工具撰寫指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

請將這些註冊視為**功能聲明**。外掛不應該隨意存取內部細節並「直接使其運作」。它應該針對 OpenClaw 能理解、驗證，且能在設定、上手、狀態、文件和執行階段行為中一致公開的明確介面進行註冊。

## 合約與執行

外掛 API 介面是經過刻意設定型別並集中於 `OpenClawPluginApi` 之中。該合約定義了支援的註冊點，以及外掛可以依賴的執行階段輔助工具。

為何這很重要：

- 外掛作者獲得一個穩定的內部標準
- 核心可以拒絕重複的所有權，例如兩個外掛註冊了相同的提供者 ID
- 啟動過程可以針對格式錯誤的註冊提供可行的診斷資訊
- 合約測試可以強制執行內建外掛的所有權，並防止無聲偏移

有兩層執行機制：

1. **執行階段註冊執行**
   外掛註冊表會在外掛載入時驗證註冊內容。例如：重複的提供者 ID、重複的語音提供者 ID 以及格式錯誤的註冊會產生外掛診斷資訊，而不是未定義的行為。
2. **合約測試**
   內建外掛會在測試執行期間被擷取至合約註冊表中，以便 OpenClaw 能明確斷言所有權。目前這用於模型提供者、語音提供者、網路搜尋提供者以及內建註冊所有權。

實際效果是 OpenClaw 預先知道哪個外掛擁有哪個介面。這讓核心和頻道能無縫組合，因為所有權是被宣告、設定型別且可測試的，而非隱含的。

### 什麼屬於合約

良好的外掛合約應該：

- 設定型別
- 小型
- 特定於功能
- 由核心擁有
- 可被多個外掛重複使用
- 可被頻道/功能消耗而不需供應商知識

不良的外掛合約是：

- 隱藏在核心中的供應商特定政策
- 繞過註冊表的一次性外掛逃生出口
- 頻道程式碼直接存取供應商實作
- 不屬於 `OpenClawPluginApi` 或
  `api.runtime` 一部分的臨時執行階段物件

如果有疑問，請提升抽象層級：先定義功能，然後再讓外掛插入其中。

## 匯出邊界

OpenClaw 匯出的是功能，而非實作上的便利性。

保持能力註冊公開。修剪非契約的輔助匯出：

- 綁定外掛特定的輔助子路徑
- 不打算作為公開 API 的運行時管道子路徑
- 供應商特定的便利輔助程式
- 屬於實作細節的設定/入門輔助程式

## 外掛檢查

使用 `openclaw plugins inspect <id>` 進行深度外掛內省。這是理解外掛形狀和註冊行為的標準指令。

```bash
openclaw plugins inspect openai
openclaw plugins inspect openai --json
```

檢查報告顯示：

- 身分、載入狀態、來源和根目錄
- 外掛形狀 (plain-capability、hybrid-capability、hook-only、non-capability)
- 能力模式和已註冊的能力
- 鉤子 (型別和自訂)、工具、指令、服務
- 通道註冊
- 設定策略標誌
- 診斷
- 外掛是否使用舊版 `before_agent_start` 鉤子
- 安裝元數據

分類來自實際的註冊行為，而不僅僅是靜態元數據。

摘要指令保持摘要導向：

- `plugins list` — 簡潔清單
- `plugins status` — 操作摘要
- `doctor` — 問題導向診斷
- `plugins inspect` — 深度細節

## 提供者運行時鉤子

提供者外掛現在有兩層：

- 清單元數據：`providerAuthEnvVars` 用於在運行時載入前進行廉價的 env-auth 查找，加上 `providerAuthChoices` 用於在運行時載入前進行廉價的入門/認證選擇標籤和 CLI 標誌元數據
- 設定時間鉤子：`catalog` / 舊版 `discovery`
- runtime hooks: `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、`capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、`refreshOAuth`、`buildAuthDoctorHint`、`isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、`resolveDefaultThinkingLevel`、`isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot`

OpenClaw 仍然擁有通用 agent 迴圈、故障轉移、文字記錄處理和工具策略。這些 hooks 是針對供應商特定行為的擴充介面，無需完整的自訂推論傳輸。

當供應商擁有基於環境變數的憑證，且通用 auth/status/model-picker 路徑應在不清載外掛執行時期的情況下看到這些憑證時，請使用 manifest `providerAuthEnvVars`。當 onboarding/auth-choice CLI 介面應在不清載供應商執行時期的情況下得知供應商的 choice id、群組標籤和簡單的單一旗標 auth 接線時，請使用 manifest `providerAuthChoices`。請將供應商執行時期 `envVars` 保留給操作員導向的提示，例如 onboarding 標籤或 OAuth client-id/client-secret 設定變數。

### Hook 順序與使用方式

對於模型/供應商外掛，OpenClaw 會大致按照此順序呼叫 hooks。「使用時機」欄位是快速決策指南。

| #   | Hook                          | 作用                                                                             | 使用時機                                                                          |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `catalog`                     | 在 `models.json` 產生期間將供應商設定發布到 `models.providers`          | 供應商擁有目錄或基本 URL 預設值                                         |
| —   | _(內建模型查閱)_     | OpenClaw 會先嘗試正常的 registry/catalog 路徑                                    | _(非外掛 hook)_                                                                |
| 2   | `resolveDynamicModel`         | 針對不在本地 registry 中的供應商擁有模型 ID 的同步備援                 | 供應商接受任意上游模型 ID                                        |
| 3   | `prepareDynamicModel`         | 非同步預熱，然後再次執行 `resolveDynamicModel`                                     | 提供者在解析未知 ID 之前需要網路元資料                         |
| 4   | `normalizeResolvedModel`      | 內嵌執行器使用已解析模型前的最終重寫                         | 提供者需要傳輸重寫，但仍使用核心傳輸                    |
| 5   | `capabilities`                | 共享核心邏輯使用的提供者擁有的對話/工具元資料                     | 提供者需要對話/提供者家族的怪癖處理                                     |
| 6   | `prepareExtraParams`          | 通用串流選項包裝器之前的請求參數正規化                        | 提供者需要預設請求參數或個別提供者的參數清理                  |
| 7   | `wrapStreamFn`                | 應用通用包裝器之後的串流包裝器                                        | 提供者需要請求標頭/主體/模型相容性包裝器，而不使用自訂傳輸 |
| 8   | `formatApiKey`                | 認證設定檔格式器：儲存的設定檔變成執行階段 `apiKey` 字串               | 提供者儲存額外的認證元資料，並需要自訂的執行階段權杖形狀           |
| 9   | `refreshOAuth`                | 針對自訂更新端點或更新失敗策略的 OAuth 覆寫            | 提供者不適合共享的 `pi-ai` 更新器                                  |
| 10  | `buildAuthDoctorHint`         | OAuth 更新失敗時附加的修復提示                                            | 提供者在更新失敗後需要提供者擁有的認證修復指導             |
| 11  | `isCacheTtlEligible`          | 針對代理/回傳提供者的提示快取策略                                         | 提供者需要代理特定的快取 TTL 閘控                                       |
| 12  | `buildMissingAuthMessage`     | 通用缺少認證復原訊息的替代項目                                | 提供者需要提供者特定的缺少認證復原提示                        |
| 13  | `suppressBuiltInModel`        | 過時的上游模型抑制加上可選的使用者面向錯誤提示                    | 提供者需要隱藏過時的上傳列或將其替換為廠商提示        |
| 14  | `augmentModelCatalog`         | 探索後附加的合成/最終目錄列                                    | 提供者需要在 `models list` 和選擇器中使用合成向前相容列            |
| 15  | `isBinaryThinking`            | 二元思考提供者的開啟/關閉推理切換                                    | 提供者僅公開二元思考的開啟/關閉                                         |
| 16  | `supportsXHighThinking`       | 所選模型的 `xhigh` 推理支援                                            | 提供者僅希望在部分模型上啟用 `xhigh`                                    |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的預設 `/think` 層級                                       | 提供者擁有模型系列的預設 `/think` 政策                             |
| 18  | `isModernModelRef`            | 用於即時設定檔篩選器和煙霧測試選擇的現代模型匹配器                        | 提供者擁有即時/煙霧測試的首選模型匹配                                    |
| 19  | `prepareRuntimeAuth`          | 在推論之前將設定的憑證交換為實際的執行時期 token 金鑰 | 提供者需要 token 交換或短期請求憑證                    |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的使用/計費憑證及相關狀態表面               | 提供者需要自訂使用/配額 token 解析或不同的使用憑證      |
| 21  | `fetchUsageSnapshot`          | 在解析驗證後獲取並正規化提供者特定的使用/配額快照       | 提供者需要提供者特定的使用端點或負載解析器                  |

如果提供者需要完全自訂的連線協定或自訂請求執行器，
則這是另一類擴充功能。這些掛鉤是針對仍在 OpenClaw
正常推論迴圈上執行的提供者行為。

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
  4.6 向前相容性、提供者系列提示、驗證修復指引、使用
  端點整合、提示快取資格，以及 Claude 預設/自適應
  思考政策。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，以及 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`，
  因為它擁有 GPT-5.4 向前相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 正規化、Codex 感知的
  驗證提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考 /
  即時模型策略。
- OpenRouter 使用 `catalog`，以及 `resolveDynamicModel` 和
  `prepareDynamicModel`，因為該提供者是直通的，可能會在 OpenClaw 的靜態目錄更新之前
  公開新的模型 ID。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，以及 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因為它
  需要提供者擁有的裝置登入、模型後備行為、Claude 轉錄
  怪癖、GitHub 權杖 -> Copilot 權杖交換，以及提供者擁有的
  使用量端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，以及
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它
  仍在核心 OpenAI 傳輸上運行，但擁有其傳輸/基底 URL
  正規化、OAuth 重新整理後備策略、預設傳輸選擇、
  合成 Codex 目錄行，以及 ChatGPT 使用量端點整合。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因為它們擁有 Gemini 3.1 向前相容後備和
  現代模型匹配；Gemini CLI OAuth 也使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 進行權杖格式化、權杖
  解析和配額端點接線。
- OpenRouter 使用 `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`
  將特定於供應商的請求標頭、路由元資料、推理修補
  和提示詞快取策略保持在核心之外。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍使用共享的
  OpenAI 傳輸層，但需要供應商擁有的思考負載正規化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要供應商擁有的請求標頭、
  推理負載正規化、Gemini 逐字稿提示和 Anthropic
  快取 TTL 閘控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 降級、
  `tool_stream` 預設值、二進制思考 UX、現代模型匹配以及
  使用量驗證 + 配額擷取。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities`，以將
  逐字稿/工具怪異行為保持在核心之外。
- 僅目錄型的捆綁供應商（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）
  僅使用 `catalog`。
- Qwen 入口網站使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和小米使用 `catalog` 加上使用量掛鉤，因為它們的 `/usage`
  行為是由外掛程式擁有的，儘管推論仍在共用傳輸層中執行。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容的 bundle 資訊清單與套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛設定 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 決定每個候選項的啟用狀態
6. 透過 jiti 載入已啟用的原生模組
7. 呼叫原生 `register(api)` hooks 並將註冊項目收集到外掛註冊表中
8. 將註冊表公開給指令/執行階段介面

安全檢查機制發生在執行階段**之前**。當進入點脫離外掛根目錄、路徑可被任何使用者寫入，或是對於非 bundle 外掛而言路徑所有權看起來可疑時，候選項會被阻擋。

### 資訊清單優先行為

資訊清單是控制平面的唯一事實來源。OpenClaw 使用它來：

- 識別外掛
- 探索已宣告的通道/技能/設定 schema 或 bundle 功能
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/佔位符
- 顯示安裝/目錄元資料

對於原生外掛，執行階段模組是資料平面部分。它會註冊實際行為，例如 hooks、工具、指令或提供者流程。

### 載入器快取的內容

OpenClaw 會為以下項目保留短期處理序內快取：

- 探索結果
- 資訊清單註冊表資料
- 已載入的外掛註冊表

這些快取能減少突發的啟動與重複指令的負擔。您可以放心地將它們視為短期效能快取，而非持久性儲存。

## 執行階段輔助程式

外掛可以透過 `api.runtime` 存取選定的核心輔助程式。針對 TTS：

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

- `textToSpeech` 會傳回針對檔案/語音備忘錄介面的標準核心 TTS 輸出內容。
- 使用核心 `messages.tts` 設定與提供者選擇。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛必須為提供者進行重採樣/編碼。
- `listVoices` 對每個提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音清單可以包含更豐富的元資料，例如地區設定、性別和人格標籤，供支援提供者感知的選擇器使用。
- OpenAI 和 ElevenLabs 目前支援電話通訊。Microsoft 則不支援。

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

- 將 TTS 原則、後援以及回覆傳遞保留在核心中。
- 使用語音提供者處理供應商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會被正規化為 `microsoft` 提供者 ID。
- 首選的擁有權模型是以公司為導向的：隨著 OpenClaw 新增這些功能合約，一個供應商外掛程式可以擁有文字、語音、影像和未來的媒體提供者。

對於影像/音訊/影片理解，外掛程式應註冊一個類型化的媒體理解提供者，而不是通用的鍵/值包：

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

- 將編排、後援、設定和通道連線保留在核心中。
- 將供應商行為保留在提供者外掛程式中。
- 累加擴充應保持類型化：新的可選方法、新的可選結果欄位、新的可選功能。
- 如果 OpenClaw 稍後新增新功能（例如影片產生），請先定義核心功能合約，然後讓供應商外掛程式對其進行註冊。

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

對於音訊轉錄，外掛程式可以使用媒體理解執行時期或較舊的 STT 別名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

備註：

- `api.runtime.mediaUnderstanding.*` 是影像/音訊/影片理解的首選共用介面。
- 使用核心媒體理解音訊設定 (`tools.media.audio`) 和提供者後援順序。
- 當未產生轉錄輸出（例如跳過/不支援的輸入）時，傳回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 仍保留為相容性別名。

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

- `provider` 和 `model` 是可選的單次執行覆寫，而非永續的工作階段變更。
- OpenClaw 僅對受信任的呼叫者遵守這些覆寫欄位。
- 對於外掛程式擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 來加入啟用。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的正規 `provider/model` 目標，或使用 `"*"` 來明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默回退。

對於網路搜尋，外掛程式可以使用共享執行時期輔助程式，而不是深入探討代理程式工具的連線：

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
- 使用網路搜尋提供者進行供應商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴代理程式工具包裝函式的功能/通道外掛程式的首選共享介面。

## 閘道 HTTP 路由

外掛程式可以使用 `api.registerHttpRoute(...)` 來公開 HTTP 端點。

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
- `auth`：必填。使用 `"gateway"` 要求正常的閘道驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/Webhook 驗證。
- `match`：選填。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：選填。允許同一個外掛程式替換其現有的路由註冊。
- `handler`：當路由處理了請求時，回傳 `true`。

備註：

- `api.registerHttpHandler(...)` 已過時。請使用 `api.registerHttpRoute(...)`。
- 外掛程式路由必須明確宣告 `auth`。
- 除非設定 `replaceExisting: true`，否則會拒絕完全相同的 `path + match` 衝突，並且一個外掛程式無法替換另一個外掛程式的路由。
- 會拒絕具有不同 `auth` 層級的重疊路由。請將 `exact`/`prefix` 穿透鏈保持在相同的驗證層級上。

## 外掛程式 SDK 匯入路徑

在編寫外掛程式時，使用 SDK 子路徑而不是單一的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/core` 用於最小的通用外掛程式導向合約。
  它還攜帶小型組件輔助程式，例如用於捆綁或第三方外掛程式入口接線的
  `definePluginEntry`、`defineChannelPluginEntry`、`defineSetupPluginEntry`
  和 `createChannelPluginBase`。
- 網域子路徑，例如用於共享執行時/組態輔助程式的
  `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/channel-runtime`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime`。
- 狹窄的通道核心子路徑，例如 `openclaw/plugin-sdk/discord-core`、
  `openclaw/plugin-sdk/telegram-core`、`openclaw/plugin-sdk/whatsapp-core`
  和 `openclaw/plugin-sdk/line-core`，用於特定通道的原語，
  這些原語應保持小於完整的通道輔助桶。
- `openclaw/plugin-sdk/compat` 仍作為較舊外部外掛程式的舊版移轉介面。捆綁的外掛程式不應使用它，並且非測試匯入會在測試環境之外發出一次性棄用警告。
- 捆綁擴充功能內部保持私有。外部外掛程式應僅使用
  `openclaw/plugin-sdk/*` 子路徑。OpenClaw 核心/測試程式碼可使用 `extensions/<id>/index.js`、`api.js`、`runtime-api.js`、
  `setup-entry.js` 下的 repo 公共入口點，以及範圍狹窄的檔案，例如 `login-qr-api.js`。切勿
  從核心或另一個擴充功能匯入 `extensions/<id>/src/*`。
- Repo 入口點分割：
  `extensions/<id>/api.js` 是輔助程式/類型桶，
  `extensions/<id>/runtime-api.js` 是僅執行時桶，
  `extensions/<id>/index.js` 是捆綁外掛程式入口，
  而 `extensions/<id>/setup-entry.js` 是設定外掛程式入口。
- `openclaw/plugin-sdk/telegram` 用於 Telegram 通道外掛程式類型和共享通道導向輔助程式。內建 Telegram 實作內部對捆綁擴充功能保持私有。
- `openclaw/plugin-sdk/discord` 用於 Discord 通道外掛類型和共用的面向通道的輔助工具。內建的 Discord 實作內部細節對打包的擴充功能保持私有。
- `openclaw/plugin-sdk/slack` 用於 Slack 通道外掛類型和共用的面向通道的輔助工具。內建的 Slack 實作內部細節對打包的擴充功能保持私有。
- `openclaw/plugin-sdk/signal` 用於 Signal 通道外掛類型和共用的面向通道的輔助工具。內建的 Signal 實作內部細節對打包的擴充功能保持私有。
- `openclaw/plugin-sdk/imessage` 用於 iMessage 通道外掛類型和共用的面向通道的輔助工具。內建的 iMessage 實作內部細節對打包的擴充功能保持私有。
- `openclaw/plugin-sdk/whatsapp` 用於 WhatsApp 通道外掛類型和共用的面向通道的輔助工具。內建的 WhatsApp 實作內部細節對打包的擴充功能保持私有。
- `openclaw/plugin-sdk/line` 用於 LINE 通道外掛。
- `openclaw/plugin-sdk/msteams` 用於打包的 Microsoft Teams 外掛介面。
- 其他打包的特定擴充功能子路徑仍然可用，其中 OpenClaw
  故意公開了面向擴充功能的輔助工具：
  `openclaw/plugin-sdk/acpx`、`openclaw/plugin-sdk/bluebubbles`、
  `openclaw/plugin-sdk/feishu`、`openclaw/plugin-sdk/googlechat`、
  `openclaw/plugin-sdk/irc`、`openclaw/plugin-sdk/lobster`、
  `openclaw/plugin-sdk/matrix`、
  `openclaw/plugin-sdk/mattermost`、`openclaw/plugin-sdk/memory-core`、
  `openclaw/plugin-sdk/minimax-portal-auth`、
  `openclaw/plugin-sdk/nextcloud-talk`、`openclaw/plugin-sdk/nostr`、
  `openclaw/plugin-sdk/synology-chat`、`openclaw/plugin-sdk/test-utils`、
  `openclaw/plugin-sdk/tlon`、`openclaw/plugin-sdk/twitch`、
  `openclaw/plugin-sdk/voice-call`、
  `openclaw/plugin-sdk/zalo` 和 `openclaw/plugin-sdk/zalouser`。

## 通道目標解析

通道外掛應擁有通道特定的目標語意。保持共用的
  出站主機通用，並使用訊息介面卡表面來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查詢之前，是否應將標準化的目標視為 `direct`、`group` 或 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心，輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- 當核心在標準化或目錄未找到匹配項後需要最終的提供者擁有者解析時，`messaging.targetResolver.resolveTarget(...)` 是外掛程式的後援。
- 一旦目標解析完成，`messaging.resolveOutboundSessionRoute(...)` 即負責提供者特定的會話路由構建。

建議的職責劃分：

- 使用 `inferTargetChatType` 進行應在搜尋對等/群組之前發生的類別決策。
- 使用 `looksLikeId` 進行「將其視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 進行提供者特定的標準化後援，而非廣泛的目錄搜尋。
- 將提供者原生的 ID（如聊天 ID、執行緒 ID、JID、帳號代碼和房間 ID）保留在 `target` 值或提供者特定的參數中，不要放在通用的 SDK 欄位裡。

## 基於設定檔的目錄

從設定檔匯出目錄條目的外掛程式應將該邏輯保留在外掛程式中，並重複使用 `openclaw/plugin-sdk/directory-runtime` 中的共用輔助程式。

當頻道需要基於設定檔的對等/群組（例如以下情況）時，請使用此功能：

- 由允許清單驅動的 DM 對等
- 已配置的頻道/群組對應
- 帳號範圍的靜態目錄後援

`directory-runtime` 中的共用輔助程式僅處理通用操作：

- 查詢篩選
- 限制套用
- 去重/標準化輔助程式
- 建構 `ChannelDirectoryEntry[]`

特定頻道的帳號檢查和 ID 標準化應保留在外掛程式實作中。

## 提供者目錄

提供者外掛程式可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型目錄。

`catalog.run(...)` 返回與 OpenClaw 寫入 `models.providers` 的形狀相同的形狀：

- 用於單一提供者條目的 `{ provider }`
- 用於多個提供者條目的 `{ providers }`

當外掛程式擁有提供者特定的模型 ID、預設基礎 URL
或需要驗證的模型元數據時，請使用 `catalog`。

`catalog.order` 控制外掛程式的目錄相對於 OpenClaw
內建隱含提供者的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當存在驗證設定檔時出現的提供者
- `paired`：綜合多個相關提供者項目的提供者
- `late`：最後一輪，在其他隱含提供者之後

在金鑰衝突時，後面的提供者會獲勝，因此外掛程式可以使用相同的提供者 ID
刻意覆寫內建的提供者項目。

相容性：

- `discovery` 仍作為舊版別名運作
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

相容性說明：

- `openclaw/plugin-sdk` 對現有的外部外掛程式仍持續支援。
- 新遷移和新開發的內建外掛程式應使用通道或擴充功能特定的
  子路徑；對於通用介面，請使用 `core` 加上明確的網域子路徑，並將
  `compat` 視為僅供遷移使用。
- 特定功能的子路徑（如 `image-generation`、
  `media-understanding` 和 `speech`）之所以存在，是因為內建/原生外掛程式目前
  使用它們。它們的存在本身並不意味著每個匯出的輔助程式都是
  長期凍結的外部合約。

## 唯讀通道檢查

如果您的外掛程式註冊了一個通道，請優先實作
`plugin.config.inspectAccount(cfg, accountId)` 以及 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它可以假設憑證
  已完全具體化，並且在缺少所需機密時可以快速失敗。
- 唯讀指令路徑（如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve`）以及 doctor/config
  修復流程應該不需要僅為了描述設定而具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅回傳描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要僅為了報告唯讀可用性而回傳原始 token 值。回傳 `tokenStatus: "available"`（以及對應的來源欄位）對於狀態類指令來說就足夠了。
- 當憑證是透過 SecretRef 設定但在目前指令路徑中無法使用時，請使用 `configured_unavailable`。

這允許唯讀指令回報「已設定但在此指令路徑中無法使用」，而不是當機或錯誤地將帳戶回報為未設定。

效能註記：

- 外掛程式探索和清單元資料使用短期進程內快取，以減少突發的啟動/重新載入工作。
- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取視窗。

## 探索與優先順序

OpenClaw 依序掃描：

1. 設定路徑

- `plugins.load.paths` (檔案或目錄)

2. 工作區擴充功能

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全域擴充功能

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 內建擴充功能 (隨 OpenClaw 附帶；混合預設開啟/預設關閉)

- `<openclaw>/extensions/*`

許多內建的提供者外掛程式預設為啟用，以便模型目錄/執行時期 Hook 在無需額外設定的情況下保持可用。其他外掛程式仍需透過 `plugins.entries.<id>.enabled` 或
`openclaw plugins enable <id>` 明確啟用。

預設開啟的內建外掛程式範例：

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- 啟用記憶槽外掛程式（預設槽：`memory-core`）

已安裝的外掛程式預設為啟用，但也可以用同樣的方式停用。

工作區外掛程式**預設為停用**，除非您明確啟用它們
或將它們加入允許清單。這是刻意設計的：一個簽出的程式庫不應該
無聲無息地變成生產閘道程式碼。

加固說明：

- 如果 `plugins.allow` 為空且可發現非捆綁外掛程式，OpenClaw 會記錄包含外掛程式 ID 和來源的啟動警告。
- 候選路徑在允許探索前會進行安全檢查。OpenClaw 會在以下情況封鎖候選者：
  - 擴充功能入口解析至外掛程式根目錄之外（包括符號連結/路徑遍歷逃逸），
  - 外掛程式根目錄/來源路徑可被任何人寫入，
  - 非捆綁外掛程式的路徑擁有權可疑（POSIX 擁有者既非目前的 uid 也不是 root）。
- 載入沒有安裝/載入路徑來源的非捆綁外掛程式會發出警告，以便您可以釘選信任（`plugins.allow`）或安裝追蹤（`plugins.installs`）。

每個原生 OpenClaw 外掛程式必須在其根目錄中包含一個
`openclaw.plugin.json` 檔案。如果路徑指向檔案，外掛程式根目錄是該檔案的目錄，且
必須包含清單。

相容的套件組合可以改為提供以下之一：

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`

套件組合目錄是從與原生外掛程式相同的根目錄探索的。

如果多個外掛程式解析到相同的 id，則上述順序中的第一個匹配項
獲勝，優先順序較低的副本將被忽略。

這意味著：

- 工作區外掛程式會刻意覆蓋具有相同 id 的內建外掛程式
- `plugins.allow: ["foo"]` 依 id 授權啟用的 `foo` 外掛程式，即使
  啟用的副本來自工作區而非內建的擴充功能根目錄
- 如果您需要更嚴格的來源控制，請使用明確的安裝/載入路徑，並在
  啟用前檢查解析出的外掛程式來源

### 啟用規則

啟用狀態是在探索之後解析的：

- `plugins.enabled: false` 會停用所有外掛程式
- `plugins.deny` 總是獲勝
- `plugins.entries.<id>.enabled: false` 會停用該外掛程式
- 來自工作區的外掛程式預設為停用
- 當 `plugins.allow` 不為空時，允許清單會限制啟用集合
- 允許清單是基於 **id**，而非基於來源
- 內建外掛程式預設為停用，除非：
  - 內建 id 位於內建的預設啟用集合中，或
  - 您明確啟用它，或
  - 通道設定隱含啟用內建的通道外掛程式
- 獨佔插槽可以強制啟用該插槽選定的外掛程式

在目前的核心中，內建的預設啟用 id 包括上述的本地/提供者輔助工具
以及啟用的記憶體插槽外掛程式。

### 套件包

外掛程式目錄可能包含帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛程式。如果套件包列出了多個擴充功能，外掛程式 id
會變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依性，請將其安裝在該目錄中，以便
`node_modules` 可用 (`npm install` / `pnpm install`)。

安全防護：每個 `openclaw.extensions` 條目在解析符號連結後必須保持在
外掛程式目錄內。逃離套件目錄的條目會被拒絕。

安全提示：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安裝外掛程式相依性
(無生命週期指令碼)。請保持外掛程式相依性樹為「純 JS/TS」，並避免需要
`postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。
當 OpenClaw 需要為已停用的通道外掛程式提供設定介面，或
當通道外掛程式已啟用但尚未設定時，它會載入 `setupEntry`
而不是完整的外掛程式進入點。當您的主要外掛程式進入點還連接了工具、hooks 或其他僅在執行時期
使用的程式碼時，這可以減輕啟動和設定的負擔。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛程式在閘道的預先聆聽啟動階段選擇使用相同的 `setupEntry` 路徑，即使該通道已經設定過。

僅在 `setupEntry` 完全覆蓋閘道開始聆聽之前必須存在的啟動介面時才使用此選項。實務上，這意味著設定進入點
必須註冊啟動相依的每一個通道擁有的功能，例如：

- 通道註冊本身
- 任何必須在閘道開始聆聽之前可用的 HTTP 路由
- 任何必須在同一時段存在的閘道方法、工具或服務

如果您的完整進入點仍然擁有任何所需的啟動功能，請勿啟用
此旗標。讓外掛程式保持預設行為，並讓 OpenClaw 在啟動期間載入
完整進入點。

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

通道外掛程式可以透過 `openclaw.channel` 宣傳設定/探索元資料，並透過
`openclaw.install` 提供安裝提示。這可讓核心目錄保持無資料狀態。

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

OpenClaw 也可以合併 **外部通道目錄**（例如 MPM
登錄檔匯出）。將 JSON 檔案放置於下列其中一個位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 外掛程式 ID

預設外掛程式 ID：

- 套件包：`package.json` `name`
- 獨立檔案：檔案基底名稱（`~/.../voice-call.ts` → `voice-call`）

如果外掛程式匯出 `id`，OpenClaw 會使用它，但若它與設定的 ID 不符則會發出警告。

## 註冊表模型

已載入的外掛程式不會直接修改隨機的核心全域變數。它們會註冊到一個
中央外掛程式註冊表中。

註冊表追蹤：

- 外掛程式記錄 (身分、來源、來源處、狀態、診斷)
- 工具
- 舊版鉤子和型別化鉤子
- 通道
- 提供者
- 閘道 RPC 處理程式
- HTTP 路由
- CLI 註冊程式
- 背景服務
- 外掛程式擁有的命令

核心功能接著會從該註冊表讀取，而不是直接與外掛程式模組通訊。
這會讓載入保持單向：

- 外掛程式模組 -> 註冊表註冊
- 核心執行時期 -> 註冊表取用

這種分離對可維護性很重要。這意味著大多數核心介面只需要
一個整合點：「讀取註冊表」，而不是「對每個外掛程式模組進行特殊處理」。

## 設定

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

欄位：

- `enabled`：主切換 (預設：true)
- `allow`：允許清單 (選用)
- `deny`：拒絕清單 (選用；拒絕優先)
- `load.paths`：額外的外掛程式檔案/目錄
- `slots`：獨佔插槽選擇器，例如 `memory` 和 `contextEngine`
- `entries.<id>`：個別外掛程式切換 + 設定

設定變更 **需要重新啟動閘道**。請參閱
[Configuration reference](/zh-Hant/configuration) 以取得完整的設定架構。

驗證規則 (嚴格)：

- 在 `entries`、`allow`、`deny` 或 `slots` 中出現的未知外掛程式 ID 屬於 **錯誤**。
- 未知的 `channels.<id>` 鍵屬於 **錯誤**，除非外掛程式清單宣告了
  通道 ID。
- 原生外掛程式設定是使用嵌入於
  `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 進行驗證。
- 相容套件目前不會公開原生 OpenClaw 設定架構。
- 如果外掛程式被停用，其設定會被保留，並且會發出 **警告**。

### 已停用 vs 遺失 vs 無效

這些狀態是有意區分的：

- **已停用 (disabled)**：外掛程式存在，但啟用規則將其關閉
- **遺失 (missing)**：設定參照了一個探索程序未找到的外掛程式 ID
- **無效 (invalid)**：外掛程式存在，但其設定不符合宣告的架構

OpenClaw 會保留已停用外掛程式的配置，因此將其重新開啟不會造成破壞。

## 外掛程式插槽（獨佔類別）

某些外掛程式類別是**獨佔的**（一次只能啟用一個）。請使用
`plugins.slots` 來選擇哪個外掛程式擁有該插槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

支援的獨佔插槽：

- `memory`：作用中的記憶體外掛程式（`"none"` 會停用記憶體外掛程式）
- `contextEngine`：作用中的內容引擎外掛程式（`"legacy"` 是內建預設值）

如果多個外掛程式宣告 `kind: "memory"` 或 `kind: "context-engine"`，只有
被選取的外掛程式會載入至該插槽。其他外掛程式將會停用並顯示診斷資訊。
請在您的 [外掛程式清單](/zh-Hant/plugins/manifest) 中宣告 `kind`。

### 內容引擎外掛程式

內容引擎外掛程式擁有工作階段內容的編排，用於擷取、組裝
和壓縮。請從您的外掛程式使用
`api.registerContextEngine(id, factory)` 進行註冊，然後使用
`plugins.slots.contextEngine` 選取作用中的引擎。

當您的外掛程式需要取代或擴充預設內容管線，而不僅僅是新增記憶體搜尋或掛勾時，請使用此功能。

## 控制 UI（結構描述 + 標籤）

控制 UI 使用 `config.schema`（JSON 結構描述 + `uiHints`）來呈現更好的表單。

OpenClaw 會根據探索到的外掛程式在執行時期增強 `uiHints`：

- 為 `plugins.entries.<id>` / `.enabled` / `.config` 新增個別外掛程式的標籤
- 在以下位置合併選用的外掛程式提供的配置欄位提示：
  `plugins.entries.<id>.config.<field>`

如果您希望外掛程式配置欄位顯示良好的標籤/佔位符（並將機密標記為敏感），
請在外掛程式清單中隨附您的 JSON 結構描述提供 `uiHints`。

範例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

請參閱 [`openclaw plugins` CLI 參考資料](/zh-Hant/cli/plugins) 以取得每個
指令的完整詳細資訊（安裝規則、檢查輸出、市集安裝、解除安裝）。

外掛程式也可以註冊自己的頂層指令（例如：
`openclaw voicecall`）。

## 外掛程式 API（概觀）

外掛程式會匯出以下任一項：

- 一個函數：`(api) => { ... }`
- 一個物件：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是外掛附加行為的地方。常見的註冊包括：

- `registerTool`
- `registerHook`
- `on(...)` 用於類型化生命週期鉤子
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

實際上，`register(api)` 也是外掛宣告**所有權**的地方。
該所有權應清晰地對應至：

- 供應商介面，例如 OpenAI、ElevenLabs 或 Microsoft
- 功能介面，例如語音通話

避免將一個供應商的功能分散到不相關的外掛中，除非有強烈的產品理由。預設情況下應該每個供應商/功能對應一個外掛，並透過核心功能合約將共享的協調流程與供應商特定的行為分開。

## 新增新功能

當外掛需要不符合當前 API 的行為時，不要透過私有的繞過方式跳過外掛系統。請新增缺失的功能。

建議的順序：

1. 定義核心合約
   決定核心應擁有哪些共享行為：政策、後備、設定合併、生命週期、面向頻道的語意，以及執行階段輔助程式形狀。
2. 新增類型化外掛註冊/執行階段介面
   使用最小有用的類型化功能介面來擴展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心 + 頻道/功能消費者
   頻道和功能外掛應該透過核心來使用新功能，而不是直接匯入供應商的實作。
4. 註冊供應商實作
   然後，供應商外掛會針對該功能註冊它們的後端。
5. 新增合約覆蓋率
   新增測試，以便讓所有權和註冊形狀隨時間推移保持明確。

這就是 OpenClaw 在不與單一提供商的世界觀硬編碼綁定的情況下，保持其觀點的方式。請參閱[能力食譜](/zh-Hant/tools/capability-cookbook)以取得具體的檔案檢查清單和實作範例。

### 能力檢查清單

當您新增一項能力時，實作通常應同時涉及以下幾個層面："

- `src/<capability>/types.ts` 中的核心合約類型
- `src/<capability>/runtime.ts` 中的核心執行器/執行時期輔助函式
- `src/plugins/types.ts` 中的外掛程式 API 註冊介面
- `src/plugins/registry.ts` 中的外掛程式登錄檔連線
- 當功能/通道外掛程式需要使用時，在 `src/plugins/runtime/*` 中對外掛程式執行時期公開
- `src/test-utils/plugin-registration.ts` 中的擷取/測試輔助函式
- `src/plugins/contracts/registry.ts` 中的擁有權/合約斷言
- `docs/` 中的操作員/外掛程式文件

如果缺少其中一個層面，通常代表該能力尚未完全整合。"

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

這能保持規則簡單：

- 核心擁有能力合約 + 編排
- 供應商外掛程式擁有供應商實作
- 功能/通道外掛程式使用執行時期輔助函式
- 合約測試保持擁有權明確

Context engine 外掛程式也可以註冊由執行時期擁有的 context manager：

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

如果您的引擎並**不**擁有壓縮演算法，請保留 `compact()` 已實作並明確委派：

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

`ownsCompaction: false` 不會自動回退到舊版壓縮。如果您的引擎處於啟用狀態，其 `compact()` 方法仍會處理 `/compact` 和溢位復原。

然後在設定中啟用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## 外掛程式 Hooks

外掛程式可以在執行時期註冊 hooks。這讓外掛程式可以封裝事件驅動的自動化，而無需單獨安裝 hook 套件。

### 範例

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

備註：

- 透過 `api.registerHook(...)` 明確註冊 hooks。
- Hook 資格規則仍然適用 (OS/bins/env/config 需求)。
- 外掛程式管理的 hooks 會以 `plugin:<id>` 出現在 `openclaw hooks list` 中。
- 您無法透過 `openclaw hooks` 啟用/停用外掛程式管理的 hooks；請改為啟用/停用外掛程式。

### Agent 生命週期掛鉤 (`api.on`)

對於類型化的執行時期生命週期掛鉤，請使用 `api.on(...)`：

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

提示詞建構的重要掛鉤：

- `before_model_resolve`：在工作階段載入之前執行 (`messages` 尚不可用)。使用此掛鉤以確定性地覆寫 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`：在工作階段載入之後執行 (`messages` 可用)。使用此掛鉤來塑造提示詞輸入。
- `before_agent_start`：舊版相容性掛鉤。建議優先使用上述兩個明確的掛鉤。

核心強制執行的掛鉤政策：

- 操作員可以透過 `plugins.entries.<id>.hooks.allowPromptInjection: false` 針對每個外掛停用提示詞變異掛鉤。
- 當停用時，OpenClaw 會封鎖 `before_prompt_build` 並忽略從舊版 `before_agent_start` 返回的提示詞變異欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。

`before_prompt_build` 結果欄位：

- `prependContext`：在此次執行的使用者提示詞前置文字。最適合用於特定輪次或動態內容。
- `systemPrompt`：完整的系統提示詞覆寫。
- `prependSystemContext`：在目前的系統提示詞前置文字。
- `appendSystemContext`：在目前的系統提示詞附加文字。

嵌入式執行時期中的提示詞建構順序：

1. 將 `prependContext` 套用至使用者提示詞。
2. 當提供時，套用 `systemPrompt` 覆寫。
3. 套用 `prependSystemContext + current system prompt + appendSystemContext`。

合併與優先順序說明：

- 掛鉤處理程序依優先順序執行 (優先順序較高者先執行)。
- 對於合併的上下文欄位，數值會依執行順序串連。
- `before_prompt_build` 值會在舊版 `before_agent_start` 後備值之前套用。

移轉指引：

- 將靜態指引從 `prependContext` 移至 `prependSystemContext` (或 `appendSystemContext`)，以便提供者能夠快取穩定的系統前置內容。
- 保留 `prependContext` 給應保持與使用者訊息連結的每輪動態內容。

## 提供者外掛 (模型驗證)

外掛程式可以註冊 **模型提供者**，讓使用者可以在 OpenClaw 內執行 OAuth 或 API 金鑰設定，在引導/模型選擇器中顯示提供者設定，並貢獻隱含的提供者探索功能。

提供者外掛程式是模型提供者設定的模組化擴充介面。它們不再僅僅是「OAuth 輔助程式」。

### 提供者外掛程式生命週期

提供者外掛程式可以參與五個不同的階段：

1. **驗證**
   `auth[].run(ctx)` 執行 OAuth、API 金鑰擷取、裝置代碼或自訂
   設定，並傳回驗證設定檔以及可選的設定修補。
2. **非互動式設定**
   `auth[].runNonInteractive(ctx)` 處理 `openclaw onboard --non-interactive`
   而無需提示。當提供者需要超越內建簡單 API 金鑰路徑的自訂無頭設定時，請使用此功能。
3. **精靈整合**
   `wizard.setup` 將項目新增至 `openclaw onboard`。
   `wizard.modelPicker` 將設定項目新增至模型選擇器。
4. **隱含探索**
   `discovery.run(ctx)` 可以在模型解析/列出期間自動貢獻提供者設定。
5. **選取後後續處理**
   `onModelSelected(ctx)` 在選擇模型後執行。將此用於提供者
   特定工作，例如下載本地模型。

這是建議的劃分，因為這些階段有不同的生命週期需求：

- 驗證是互動式的，並寫入憑證/設定
- 非互動式設定由標誌/環境變數驅動，且不得提示
- 精靈中繼資料是靜態的且面向 UI
- 探索應該是安全的、快速的，並且能容忍失敗
- 選取後掛鉤是與所選模型相關的副作用

### 提供者驗證合約

`auth[].run(ctx)` 傳回：

- `profiles`：要寫入的驗證設定檔
- `configPatch`：可選的 `openclaw.json` 變更
- `defaultModel`：可選的 `provider/model` 參考
- `notes`：可選的使用者面備註

核心隨後：

1. 寫入傳回的驗證設定檔
2. 應用驗證設定檔設定連線
3. 合併設定修補
4. 選擇性應用預設模型
5. 在適當時執行提供者的 `onModelSelected` 掛鉤

這意味著提供者外掛程式擁有提供者特定的設定邏輯，而核心則擁有通用的持久性和設定合併路徑。

### 提供者非互動式合約

`auth[].runNonInteractive(ctx)` 是選用的。當提供者需要無介面設定，且無法透過內建通用 API 金鑰流程表達時，請實作它。

非互動式內容包含：

- 目前與基礎設定
- 已解析的入門 CLI 選項
- 執行時記錄/錯誤輔助工具
- 代理程式/工作區目錄，以便提供者可以將驗證資料持久化到入門流程其餘部分所使用的同一個範圍存放區中
- `resolveApiKey(...)` 用於從旗標、環境變數或現有驗證設定檔讀取提供者金鑰，同時遵守 `--secret-input-mode`
- `toApiKeyCredential(...)` 用於將解析出的金鑰轉換為驗證設定檔憑證，並使用適當的純文字與秘密參照儲存方式

請針對下列提供者使用此介面：

- 需要 `--custom-base-url` + `--custom-model-id` 的自助 OpenAI 相容執行環境
- 提供者特定的非互動式驗證或設定合成

請勿從 `runNonInteractive` 進行提示。請改用可採取動作的錯誤訊息來拒絕遺漏的輸入。

### 提供者精靈中繼資料

提供者驗證/入門中繼資料可以存在於兩個層級：

- 資訊清單 `providerAuthChoices`：低成本標籤、分組、`--auth-choice` ID，以及在執行時載入之前可用的簡單 CLI 旗標中繼資料
- 執行時 `wizard.setup` / `auth[].wizard`：取決於已載入提供者程式碼的更豐富行為

請將資訊清單中繼資料用於靜態標籤/旗標。當設定取決於動態驗證方法、方法備援或執行時驗證時，請使用執行時精靈中繼資料。

`wizard.setup` 控制提供者在分組入門流程中的顯示方式：

- `choiceId`：驗證選擇值
- `choiceLabel`：選項標籤
- `choiceHint`：簡短提示
- `groupId`：群組儲存區 ID
- `groupLabel`：群組標籤
- `groupHint`：群組提示
- `methodId`：要執行的驗證方法
- `modelAllowlist`：選用的授權後許可清單原則（`allowedKeys`、`initialSelections`、`message`）

`wizard.modelPicker` 控制供應商在模型選擇中如何顯示為「立即設定」
項目：

- `label`
- `hint`
- `methodId`

當供應商有多種驗證方法時，精靈可以指向一個
明確的方法，或讓 OpenClaw 綜合每個方法的選擇。

OpenClaw 會在外掛程式註冊時驗證供應商精靈元資料：

- 重複或空白的方法識別碼會被拒絕
- 當供應商沒有驗證方法時，精靈元資料會被忽略
- 無效的 `methodId` 綁定會被降級為警告，並退回到
  供應商剩餘的驗證方法

### 供應商探索合約

`discovery.run(ctx)` 回傳其中之一：

- `{ provider }`
- `{ providers }`
- `null`

在外掛程式擁有一個供應商 ID 的常見情況下，使用 `{ provider }`。
當外掛程式探索多個供應商項目時，使用 `{ providers }`。

探索內容包括：

- 目前的設定
- 代理程式/工作區目錄
- 程序環境變數
- 用於解析供應商 API 金鑰的輔助程式，以及探索安全的 API 金鑰值

探索應當：

- 快速
- 盡力而為
- 失敗時可安全跳過
- 小心副作用

它不應依賴提示或長時間執行的設定。

### 探索順序

供應商探索依序執行階段：

- `simple`
- `profile`
- `paired`
- `late`

使用：

- `simple` 進行低成本僅環境探索
- `profile` 當探索依賴驗證設定檔時
- `paired` 針對需要與另一個探索步驟協調的供應商
- `late` 進行高成本或區域網路探測

大多數自託管的供應商應該使用 `late`。

### 良好的供應商外掛程式邊界

適合用於供應商外掛程式：

- 具有自訂設定流程的本機/自託管供應商
- 供應商特定的 OAuth/裝置代碼登入
- 本機模型伺服器的隱式探索
- 選取後的副作用，例如模型拉取

較不適合的情況：

- 僅使用 API 金鑰的簡易供應商，且僅在環境變數、基礎 URL 和一個預設模型上有所不同

這些仍然可以成為插件，但主要的模組化效益來自於先提取行為豐富的供應商。

透過 `api.registerProvider(...)` 註冊供應商。每個供應商會公開一或多個驗證方法（OAuth、API 金鑰、裝置代碼等）。這些方法可用於：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- 模型選擇器中的「自訂供應商」設定項目
- 在模型解析/列舉期間的隱式供應商探索

範例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

備註：

- `run` 接收一個 `ProviderAuthContext`，其中包含 `prompter`、`runtime`、
  `openUrl`、`oauth.createVpsAwareHandlers`、`secretInputMode` 和
  `allowSecretRefPrompt` 輔助工具/狀態。上架/設定流程可以使用這些工具來遵循 `--secret-input-mode` 或提供環境變數/檔案/執行檔秘密參照擷取，而 `openclaw models auth` 則保持更緊湊的提示介面。
- `runNonInteractive` 接收一個 `ProviderAuthMethodNonInteractiveContext`，
  其中包含用於無介面上架的 `opts`、`agentDir`、`resolveApiKey` 和 `toApiKeyCredential` 輔助工具。
- 當您需要新增預設模型或供應商設定時，請傳回 `configPatch`。
- 傳回 `defaultModel`，以便 `--set-default` 能夠更新代理預設值。
- `wizard.setup` 會在 `openclaw onboard` / `openclaw setup --wizard` 等上架介面中新增供應商選項。
- `wizard.setup.modelAllowlist` 讓供應商在上架/設定期間縮小後續模型允許清單的提示範圍。
- `wizard.modelPicker` 會在模型選擇器中新增「設定此供應商」項目。
- `deprecatedProfileIds` 讓提供者擁有已停用 auth-profile id 的 `openclaw doctor` 清理作業。
- `discovery.run` 會針對外掛自己的提供者 id 傳回 `{ provider }`，或是針對多提供者探索傳回 `{ providers }`。
- `discovery.order` 控制提供者相對於內建探索階段的執行時機：`simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是用於提供者特定後續工作（例如拉取本機模型）的選取後 Hook。

### 註冊訊息傳遞通道

外掛可以註冊**通道外掛**，其運作方式類似於內建通道（WhatsApp、Telegram 等）。通道設定位於 `channels.<id>` 之下，並由您的通道外掛程式碼進行驗證。

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

注意：

- 請將設定置於 `channels.<id>` 之下（而非 `plugins.entries`）。
- `meta.label` 用於 CLI/UI 清單中的標籤。
- `meta.aliases` 會新增用於正規化和 CLI 輸入的替代 ID。
- `meta.preferOver` 列出當兩者皆已設定時要略過自動啟用的通道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 讓 UI 能顯示更豐富的通道標籤/圖示。

### 通道設定 Hook

建議的設定分工：

- `plugin.setup` 負責帳戶 ID 正規化、驗證和設定寫入。
- `plugin.setupWizard` 讓主機執行通用精靈流程，而通道僅提供狀態、認證、DM 許可清單和通道存取描述元。

`plugin.setupWizard` 最適合符合共用模式的通道：

- 由 `plugin.config.listAccountIds` 驅動的一個帳戶選擇器
- 在提示之前可選的預檢/準備步驟（例如安裝程式/啟動程序工作）
- 用於套組認證集（例如配對的機器人/應用程式權杖）的可選 env-shortcut 提示
- 一或多個認證提示，每個步驟透過 `plugin.setup.applyAccountConfig` 寫入或由通道擁有的部分修補完成
- 可選的非機密文字提示（例如 CLI 路徑、基礎 URL、帳號 ID）
- 由主機解析的可選頻道/群組存取白名單提示
- 可選的 DM 白名單解析（例如 `@username` -> 數字 ID）
- 設定完成後的可選完成說明

### 撰寫新的訊息頻道（逐步指南）

當您需要**新的聊天介面**（「訊息頻道」）而非模型提供者時使用此功能。
模型提供者文件位於 `/providers/*`。

1. 選擇 ID + 配置結構

- 所有頻道配置都位於 `channels.<id>` 之下。
- 對於多帳號設置，建議使用 `channels.<id>.accounts.<accountId>`。

2. 定義頻道元資料

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制清單（CLI/UI）。
- `meta.docsPath` 應指向類似 `/channels/<id>` 的文件頁面。
- `meta.preferOver` 允許外掛取代另一個頻道（自動啟用偏好使用它）。
- `meta.detailLabel` 和 `meta.systemImage` 供 UI 用於顯示詳細文字/圖示。

3. 實作必要的適配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天類型、媒體、執行緒等）
- `outbound.deliveryMode` + `outbound.sendText`（用於基本發送）

4. 視需要加入選用的適配器

- `setup`（驗證 + 配置寫入）、`setupWizard`（主機擁有的精靈）、`security`（DM 政策）、`status`（健康狀態/診斷）
- `gateway`（啟動/停止/登入）、`mentions`、`threading`、`streaming`
- `actions`（訊息動作）、`commands`（原生指令行為）

5. 在您的外掛中註冊頻道

- `api.registerChannel({ plugin })`

最小配置範例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

最小頻道外掛（僅限輸出）：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

加載插件（extensions 目錄或 `plugins.load.paths`），重啟 gateway，然後在您的配置中配置 `channels.<id>`。

### Agent 工具

請參閱專屬指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

### 註冊 gateway RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 註冊 CLI 指令

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### 註冊自動回覆指令

插件可以註冊自訂斜線指令，這些指令**無需調用 AI 代理程式**即可執行。這對於切換指令、狀態檢查或不需要 LLM 處理的快速操作非常有用。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

指令處理程式語境：

- `senderId`：發送者 ID（如果可用）
- `channel`：發送指令的頻道
- `isAuthorizedSender`：發送者是否為授權用戶
- `args`：指令後傳遞的參數（如果 `acceptsArgs: true`）
- `commandBody`：完整的指令文字
- `config`：目前的 OpenClaw 配置

指令選項：

- `name`：指令名稱（不包含前導 `/`）
- `nativeNames`：用於斜線/選單介面的可選原生指令別名。使用 `default` 適用於所有原生提供者，或使用提供者專屬的鍵，如 `discord`
- `description`：在指令列表中顯示的說明文字
- `acceptsArgs`：指令是否接受參數（預設：false）。如果為 false 且提供了參數，則指令不會匹配，訊息將傳遞給其他處理程式
- `requireAuth`：是否要求授權的發送者（預設：true）
- `handler`：返回 `{ text: string }` 的函數（可以是異步的）

包含授權和參數的範例：

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

註記：

- 插件指令在內建指令和 AI 代理程式**之前**被處理
- 指令是全域註冊的，並在所有頻道中有效
- 指令名稱不區分大小寫（`/MyStatus` 符合 `/mystatus`）
- 指令名稱必須以字母開頭，並且僅包含字母、數字、連字號和底線
- 保留的命令名稱（如 `help`、`status`、`reset` 等）無法被外掛覆蓋
- 跨外掛重複註冊命令將會失敗，並回報診斷錯誤

### 註冊背景服務

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## 命名慣例

- 閘道方法：`pluginId.action`（例如：`voicecall.status`）
- 工具：`snake_case`（例如：`voice_call`）
- CLI 命令：kebab 或 camel，但避免與核心命令衝突

## 技能

外掛可以在儲存庫中包含技能（`skills/<name>/SKILL.md`）。
使用 `plugins.entries.<id>.enabled`（或其他配置閘道）啟用它，並確保
它位於您的工作區/受管理技能位置中。

## 發行

建議的打包方式：

- 主要套件：`openclaw`（此儲存庫）
- 外掛：`@openclaw/*` 下的獨立 npm 套件（例如：`@openclaw/voice-call`）

發行合約：

- 外掛 `package.json` 必須包含 `openclaw.extensions`，其中包含一個或多個進入點檔案。
- 選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定進入點，適用於已停用或尚未配置的通道設定。
- 選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以選擇讓通道外掛在預先監聽閘道啟動期間使用 `setupEntry`，但僅限於該設定進入點完全覆蓋外掛啟動關鍵介面的情況。
- 進入點檔案可以是 `.js` 或 `.ts`（jiti 會在執行時載入 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，解壓縮至 `~/.openclaw/extensions/<id>/`，並在設定中啟用它。
- 設定鍵穩定性：範圍套件會被正規化為 `plugins.entries.*` 的**無範圍**（unscoped） ID。

## 範例外掛：語音通話

此儲存庫包含一個語音通話外掛（Twilio 或記錄後援）：

- 原始碼：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`、`voicecall.status`
- Config (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (選用 `statusCallbackUrl`, `twimlUrl`)
- Config (dev): `provider: "log"` (無網路)

請參閱 [Voice Call](/zh-Hant/plugins/voice-call) 和 `extensions/voice-call/README.md` 以了解設定與使用方式。

## 安全性注意事項

外掛程式與 Gateway 在同一進程中執行 (請參閱 [Execution model](#execution-model))：

- 僅安裝您信任的外掛程式。
- 建議使用 `plugins.allow` 允許清單。
- 請記住 `plugins.allow` 是以 ID 為基礎，因此啟用的工作區外掛程式可以刻意覆蓋具有相同 ID 的內建外掛程式。
- 變更後請重新啟動 Gateway。

## 測試外掛程式

外掛程式可以 (且應該) 包含測試：

- 倉庫內的外掛程式可將 Vitest 測試放在 `src/**` 下 (範例：`src/plugins/voice-call.plugin.test.ts`)。
- 獨立發布的外掛程式應執行自己的 CI (lint/build/test)，並驗證 `openclaw.extensions` 指向建構好的進入點 (`dist/index.js`)。

import en from "/components/footer/en.mdx";

<en />

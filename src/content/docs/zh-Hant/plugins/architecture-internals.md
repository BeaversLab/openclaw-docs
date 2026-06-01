---
summary: "外掛架構內部機制：載入管線、註冊表、執行時掛鉤、HTTP 路由和參考表格"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "外掛架構內部機制"
---

關於公開能力模型、外掛程式形狀以及所有權/執行合約，請參閱 [Plugin architecture](/zh-Hant/plugins/architecture)。本頁面是內部機制的參考資料：載入管線、註冊表、執行時期攔截器 (Runtime hooks)、Gateway HTTP 路由、匯入路徑以及綱要表格。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容套件清單和套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛設定 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 決定每個候選項的啟用狀態
6. 載入已啟用的原生模組：建構的捆綁模組使用原生載入器；
   第三方本機原始碼 TypeScript 使用緊急 Jiti 後備方案
7. 呼叫原生 `register(api)` 掛鉤並將註冊收集到外掛註冊表中
8. 將註冊表公開給指令/執行時介面

<Note>`activate` 是 `register` 的舊版別名 — 載入器會解析存在的項目 (`def.register ?? def.activate`) 並在同一點呼叫它。所有套件外掛都使用 `register`；對於新外掛，建議使用 `register`。</Note>

安全檢查門檻發生在執行時執行**之前**。當進入點超出外掛根目錄、路徑可供任何人寫入，或對於非套件外掛路徑所有權看起來可疑時，候選項會被封鎖。

被阻擋的候選項仍會綁定至其插件 ID 以便進行診斷。如果設定
仍參照該 ID，驗證會將插件回報為存在但被阻擋，
並指向路徑安全性警告，而不是將設定條目
視為過時。

### 清單優先行為

清單是控制平面的真實來源。OpenClaw 使用它來：

- 識別插件
- 探索宣告的頻道/技能/設定架構或捆綁功能
- 驗證 `plugins.entries.<id>.config`
- 擴充控制 UI 標籤/佔位符
- 顯示安裝/目錄元資料
- 保留低成本的啟用和設定描述符，而不載入插件執行時

對於原生插件，執行時模組是資料平面部分。它會註冊
實際行為，例如掛鉤、工具、指令或提供者流程。

選用的清單 `activation` 和 `setup` 區塊停留在控制平面上。
它們是僅包含元資料的描述符，用於啟用規劃和設定探索；
它們不會取代執行時註冊、`register(...)` 或 `setupEntry`。
第一批即時啟用消費者現在會使用清單指令、頻道和提供者提示
在更廣泛的註冊表具體化之前縮小插件載入範圍：

- CLI 載入縮小範圍至擁有請求的主要指令的插件
- 頻道設定/插件解析縮小範圍至擁有請求的
  頻道 ID 的插件
- 明確的提供者設定/執行時解析縮小範圍至擁有
  請求的提供者 ID 的插件
- Gateway 啟動規劃使用 `activation.onStartup` 進行明確啟動
  匯入和啟動選出；沒有啟動元資料的插件僅透過
  更狹窄的啟用觸發程式載入

請求時執行時期預載若請求廣泛的 `all` 範圍，仍會從設定、啟動規劃、設定的頻道、插槽和自動啟用規則中推導出明確的有效外掛程式 ID 集合。如果該推導集合為空，OpenClaw 會載入空的執行時期註冊表，而不是擴大為每個可探索的外掛程式。

啟動規劃器為現有呼叫者公開了僅限 ID 的 API，並為新的診斷公開了規劃 API。規劃項目會回報選擇外掛程式的原因，將明確的 `activation.*` 規劃器提示與清單所有權後援（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和掛勾）分開來。這種原因區分是相容性邊界：現有的外掛程式中繼資料保持運作，而新程式碼可以在不改變執行時期載入語意的情況下，偵測廣泛提示或後援行為。

設定探索現在優先使用描述符擁有的 ID（例如 `setup.providers` 和 `setup.cliBackends`），在回退到 `setup-api`（針對仍需要設定時執行時期掛勾的外掛程式）之前縮小候選外掛程式的範圍。提供者設定清單使用清單 `providerAuthChoices`、衍生自描述符的設定選擇和安裝目錄中繼資料，而不載入提供者執行時期。明確的 `setup.requiresRuntime: false` 是僅限描述符的切斷點；省略 `requiresRuntime` 則為了相容性保留傳統的 setup-api 後援。如果發現多個外掛程式宣告同一個標準化的設定提供者或 CLI 後端 ID，設定查詢會拒絕不明確的擁有者，而不是依賴探索順序。當設定執行時期確實執行時，註冊表診斷會回報 `setup.providers` / `setup.cliBackends` 與由 setup-api 註冊的提供者或 CLI 後端之間的差異，而不會封鎖傳統外掛程式。

### 外掛程式快取邊界

OpenClaw 不會根據時鐘視窗快取外掛程式探索結果或直接清單註冊表資料。安裝、清單編輯和載入路徑變更必須在下次明確的元資料讀取或快照重建時變得可見。清單檔案剖析器可能會維護一個有界的檔案簽章快取，該快取以開啟的清單路徑、inode、大小和時間戳記為鍵；該快取僅用於避免重新剖析未變更的位元組，且不得快取探索、註冊表、擁有者或原則答案。

安全的元資料快速路徑是明確的物件擁有權，而非隱藏的快取。Gateway 啟動熱路徑應該在呼叫鏈中傳遞當前的 `PluginMetadataSnapshot`、衍生的 `PluginLookUpTable` 或明確的清單註冊表。設定驗證、啟動自動啟用、外掛程式引導程式和提供者選擇可以在這些物件代表當前設定和外掛程式清單時重複使用它們。除非特定的設置路徑接收到明確的清單註冊表，否則設置查詢仍然會按需重建清單元資料；請將其作為冷路徑後備方案，而不是新增隱藏的查詢快取。當輸入變更時，請重建並替換快照，而不是對其進行變更或保留歷史副本。
對於作用中的外掛程式註冊表和配套的通道引導程式輔助程式的檢視，應該從當前的註冊表/根目錄重新計算。在單次呼叫內部，短暫存在的對映是可以的，用於去重工作或防範重入；但它們不得成為行程元資料快取。

對於外掛程式載入，持續性快取層是執行時期載入。當實際載入程式碼或已安裝的構件時，它可能會重複使用載入器狀態，例如：

- `PluginLoaderCacheState` 和相容的作用中執行時期註冊表
- jiti/module 快取和用於避免重複匯入相同執行時期介面的 public-surface 載入器快取
- 用於已安裝外掛程式構件的檔案系統快取
- 用於路徑正規化或重複解析的短暫性每次呼叫對映

這些快取是資料平面實作細節。除非呼叫者刻意要求執行時期載入，否則它們不得回答控制平面問題，例如「哪個外掛程式擁有此提供者？」。

請勿為以下內容新增持續性或時鐘快取：

- 探索結果
- 直接清單註冊表
- 從已安裝的外掛程式索引重建的清單註冊表
- 提供者擁有者查找、模型抑制、提供者策略或公開構件
  元資料
- 任何其他清單衍生的答案，其中變更的清單、已安裝索引
  或載入路徑應在下次元資料讀取時可見

從持久化的已安裝外掛索引重建清單元資料的呼叫者會按需重建該註冊表。已安裝索引是持久化的
來源平面狀態；它不是隱藏的進程內元資料快取。

## 註冊表模型

已載入的外掛不會直接變更隨機的核心全域變數。它們會註冊到一個
中央外掛註冊表。

註冊表追蹤：

- 外掛記錄（身分、來源、來處、狀態、診斷）
- 工具
- 舊版 Hook 和類型化 Hook
- 通道
- 提供者
- 閘道 RPC 處理程式
- HTTP 路由
- CLI 註冊員
- 背景服務
- 外掛擁有的指令

核心功能然後從該註冊表讀取，而不是直接與外掛模組
對話。這使得載入變成單向：

- 外掛模組 -> 註冊表註冊
- 核心執行時 -> 註冊表使用

那種分離對於可維護性很重要。這意味著大多數核心表面只需要
一個整合點：「讀取註冊表」，而不是「對每個外掛
模組進行特殊處理」。

## 對話綁定回呼

綁定對話的外掛可以在批准解決時做出反應。

使用 `api.onConversationBindingResolved(...)` 在綁定
請求被批准或拒絕後接收回呼：

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

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的已解決綁定
- `request`：原始請求摘要、分離提示、發送者 ID 和
  對話元資料

此回呼僅供通知。它不會改變允許誰綁定
對話，並且在核心批准處理完成後執行。

## 提供者執行時 Hook

提供者外掛有三層：

- **Manifest metadata** 用於低成本的運行前查找：
  `setup.providers[].envVars`、已棄用的兼容性 `providerAuthEnvVars`、
  `providerAuthAliases`、`providerAuthChoices` 和 `channelEnvVars`。
- **Config-time hooks**：`catalog`（舊版 `discovery`）加上
  `applyConfigDefaults`。
- **執行時期攔截器 (Runtime hooks)**：40 多個涵蓋驗證、模型解析、串流包裝、思考層級、重播原則和使用端點的可選攔截器。請參閱 [Hook order and usage](#hook-order-and-usage) 下的完整列表。

OpenClaw 仍然擁有通用代理循環、故障轉移、轉錄處理和
工具策略。這些 hooks 是供應商特定
行為的擴展介面，而無需完整的自訂推論傳輸。

當供應商具有基於環境變數的
憑證，且通用身份驗證/狀態/模型選擇器路徑應在
不加載插件運行時的情況下看到它們時，請使用 manifest `setup.providers[].envVars`。已棄用的 `providerAuthEnvVars` 在棄用過渡期內仍會被
兼容性適配器讀取，使用它的非捆綁插件
會收到 manifest 診斷。當一個供應商 ID 應該重複使用另一個供應商 ID 的環境變數、身份驗證設定檔、
配置支援的身份驗證以及 API 金鑰入門選擇時，請使用 manifest `providerAuthAliases`。
當入門/身份驗證選擇 CLI 介面應在
不加載供應商運行時的情況下知道供應商的選擇 ID、群組標籤和簡單的單標誌身份驗證連線時，請使用 manifest
`providerAuthChoices`。保留供應商運行時
`envVars` 用於操作員面向的提示，例如入門標籤或 OAuth
客戶端 ID/客戶端密鑰設定變數。

當頻道具有由環境驅動的身份驗證或設定，且通用 shell-env 後備、配置/狀態檢查或設定提示應在
不加載頻道運行時的情況下看到它們時，請使用 manifest `channelEnvVars`。

### Hook 順序與用法

對於模型/供應商插件，OpenClaw 大致按此順序調用 hooks。
「使用時機」欄是快速決策指南。
OpenClaw 不再調用的僅兼容性供應商欄位，例如
`ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，故意未
在此列出。

| #   | Hook                              | 作用                                                                                          | 何時使用                                                                                                      |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 產生期間將提供者配置發佈到 `models.providers`                                | 提供者擁有目錄或基礎 URL 預設值                                                                               |
| 2   | `applyConfigDefaults`             | 在配置具體化期間套用提供者擁有的全域配置預設值                                                | 預設值取決於驗證模式、環境或提供者模型系列語意                                                                |
| --  | _(內建模型查找)_                  | OpenClaw 首先嘗試正常的註冊表/目錄路徑                                                        | _(不是外掛程式掛鉤)_                                                                                          |
| 3   | `normalizeModelId`                | 在查找之前正規化舊版或預覽模型 ID 別名                                                        | 提供者在解析規範模型之前擁有別名清理權                                                                        |
| 4   | `normalizeTransport`              | 在通用模型組裝之前正規化提供者系列 `api` / `baseUrl`                                          | Provider 擁有同一傳輸系列中自訂 provider ID 的傳輸清理工作                                                    |
| 5   | `normalizeConfig`                 | 在 runtime/provider 解析前先正規化 `models.providers.<id>`                                    | Provider 需要組態清理，這應該隨附於外掛；內建的 Google 系列輔助函式也會支援支援的 Google 組態項目作為最後防線 |
| 6   | `applyNativeStreamingUsageCompat` | 對組態 provider 套用原生串流使用相容性重寫                                                    | Provider 需要端點驅動的原生串流使用中繼資料修復                                                               |
| 7   | `resolveConfigApiKey`             | 在 runtime auth 載入之前，解析組態 provider 的 env-marker auth                                | 提供者會公開其自身的 env-marker API 金鑰解析攔截器                                                            |
| 8   | `resolveSyntheticAuth`            | 公開本地/自託管或基於組態的 auth，而不儲存純文字                                              | Provider 可以使用合成的/本地的憑證標記運作                                                                    |
| 9   | `resolveExternalAuthProfiles`     | 覆寫提供者擁有的外部驗證設定檔；預設的 `persistence` 是 CLI/應用程式擁有認證的 `runtime-only` | 提供者重複使用外部驗證憑證而不會保存複製的重新整理權杖；請在清單中宣告 `contracts.externalAuthProviders`      |
| 10  | `shouldDeferSyntheticProfileAuth` | 降低環境變數/配置支援的驗證背後所儲存的合成設定檔佔位符優先級                                 | Provider 儲存不應獲得優先權的合成佔位符設定檔                                                                 |
| 11  | `resolveDynamicModel`             | 針對本地註冊表中尚未存在的 Provider 擁有的模型 ID 進行同步回退                                | Provider 接受任意的上游模型 ID                                                                                |
| 12  | `prepareDynamicModel`             | 非同步預熱，然後 `resolveDynamicModel` 再次執行                                               | 提供者在解析未知 ID 之前需要網路中繼資料                                                                      |
| 13  | `normalizeResolvedModel`          | 嵌入式執行器使用解析的模型之前的最終重寫                                                      | 提供者需要傳輸重寫，但仍使用核心傳輸                                                                          |
| 14  | `normalizeToolSchemas`            | 在嵌入式執行器看到工具綱要之前先進行標準化                                                    | 提供者需要傳輸家族 (transport-family) 的綱要清理                                                              |
| 15  | `inspectToolSchemas`              | 在標準化後顯示提供者擁有的綱要診斷資訊                                                        | 提供者想要關鍵字警告，而不需要教導核心提供者特定的規則                                                        |
| 16  | `resolveReasoningOutputMode`      | 選擇原生與標記的推理輸出合約                                                                  | 提供者需要標記的推理/最終輸出，而不是原生欄位                                                                 |
| 17  | `prepareExtraParams`              | 在一般串流選項包裝器之前的請求參數標準化                                                      | 提供者需要預設請求參數或針對每個提供者的參數清理                                                              |
| 18  | `createStreamFn`                  | 完全使用自訂傳輸取代正常的串流路徑                                                            | 提供者需要自訂線路協定，而不僅僅是包裝器                                                                      |
| 20  | `wrapStreamFn`                    | 在套用一般包裝器之後的串流包裝器                                                              | 提供者需要請求標頭/內文/模型相容性包裝器，而不需要自訂傳輸                                                    |
| 21  | `resolveTransportTurnState`       | 附加原生的每輪次傳輸標頭或中繼資料                                                            | 提供者希望通用傳輸能夠發送提供者原生的輪次身份                                                                |
| 22  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 標頭或會話冷卻策略                                                         | 提供者希望通用 WS 傳輸能調整會話標頭或後備策略                                                                |
| 23  | `formatApiKey`                    | Auth-profile 格式化器：儲存的設定檔變成執行時 `apiKey` 字串                                   | 提供者儲存額外的驗證元資料，並需要自訂的執行時令牌形狀                                                        |
| 24  | `refreshOAuth`                    | OAuth 重新整理覆寫，用於自訂重新整理端點或重新整理失敗策略                                    | 提供者不符合共享的 OpenClaw 重新整理器                                                                        |
| 25  | `buildAuthDoctorHint`             | 當 OAuth 重新整理失敗時附加的修復提示                                                         | 提供者在重新整理失敗後需要提供者擁有的驗證修復指引                                                            |
| 26  | `matchesContextOverflowError`     | 提供者擁有的內容視窗溢出匹配器                                                                | 提供者具有通用啟發式演算法會錯過的原始溢出錯誤                                                                |
| 27  | `classifyFailoverReason`          | 提供者擁有的故障移轉原因分類                                                                  | 提供者可以將原始 API/傳輸錯誤對應到速率限制/過載等                                                            |
| 28  | `isCacheTtlEligible`              | 代理/回程提供者的提示快取策略                                                                 | 提供者需要特定於代理的快取 TTL 閘控                                                                           |
| 29  | `buildMissingAuthMessage`         | 通用缺少驗證恢復訊息的替換內容                                                                | 提供者需要特定於提供者的缺少驗證恢復提示                                                                      |
| 30  | `augmentModelCatalog`             | 在探索之後附加的合成/最終目錄列                                                               | 提供者需要在 `models list` 和選擇器中加入合成的向前相容列                                                     |
| 31  | `resolveThinkingProfile`          | 特定模型的 `/think` 層級設定、顯示標籤和預設值                                                | 提供者為選定的模型公開自訂的思考梯階或二元標籤                                                                |
| 32  | `isBinaryThinking`                | 開/關推理切換相容性鉤子                                                                       | 提供者僅公開二元思考開/關                                                                                     |
| 33  | `supportsXHighThinking`           | `xhigh` 推理支援相容性鉤子                                                                    | 提供者僅希望在部分模型上使用 `xhigh`                                                                          |
| 34  | `resolveDefaultThinkingLevel`     | 預設 `/think` 層級相容性鉤子                                                                  | Provider 擁有模型系列的預設 `/think` 政策                                                                     |
| 35  | `isModernModelRef`                | 用於即時設定檔過濾器和選擇的現代模型匹配器                                                    | Provider 擁有即時/選擇的偏好模型匹配                                                                          |
| 36  | `prepareRuntimeAuth`              | 在推論之前將設定的憑證交換為實際的執行時期 token/key                                          | Provider 需要 token 交換或短期請求憑證                                                                        |
| 37  | `resolveUsageAuth`                | 解析 `/usage` 及相關狀態介面的使用/計費憑證                                                   | Provider 需要自訂的使用/配額 token 解析或不同的使用憑證                                                       |
| 38  | `fetchUsageSnapshot`              | 在解析驗證後擷取並正規化 Provider 特定的使用/配額快照                                         | Provider 需要 Provider 特定的使用端點或 payload 解析器                                                        |
| 39  | `createEmbeddingProvider`         | 為記憶體/搜尋建構 Provider 擁有的嵌入適配器                                                   | 記憶體嵌入行為屬於 Provider 外掛                                                                              |
| 40  | `buildReplayPolicy`               | 傳回控制 Provider 轉錄內容處理的重新播放政策                                                  | Provider 需要自訂的轉錄內容政策（例如，思考區塊剝離）                                                         |
| 41  | `sanitizeReplayHistory`           | 在一般轉錄內容清理之後重寫重新播放歷程                                                        | Provider 除了共享的壓縮輔助功能外，還需要 Provider 特定的重新播放重寫                                         |
| 42  | `validateReplayTurns`             | 在嵌入式執行器之前的最終重新播放輪次驗證或重組                                                | 在一般清理之後，Provider 傳輸需要更嚴格的輪次驗證                                                             |
| 43  | `onModelSelected`                 | 執行 Provider 擁有的選擇後副作用                                                              | 當模型變為作用中時，Provider 需要遙測或 Provider 擁有的狀態                                                   |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 首先檢查匹配的提供者外掛程式，然後回退到其他具備鉤子功能的提供者外掛程式，直到其中一個實際變更了模型 ID 或傳輸/設定。這樣可以讓別名/相容性提供者填充層正常運作，而無需呼叫者知道哪個內建外掛程式擁有該重寫邏輯。如果沒有提供者鉤子重寫支援的 Google 系列設定項目，內建的 Google 設定正規化器仍會套用該相容性清理。

如果提供者需要完全自訂的連線協定或自訂請求執行器，那是另一種類別的擴充功能。這些鉤子適用於仍然在 OpenClaw 正常推斷迴圈上執行的提供者行為。

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

內建的提供者外掛程式結合上述鉤子，以滿足各供應商的目錄、驗證、思考、重播和使用需求。權威的鉤子集位於每個外掛程式下的 `extensions/`；本頁面說明了這些結構，而非複製其列表。

<AccordionGroup>
  <Accordion title="傳遞式目錄提供者">OpenRouter、Kilocode、Z.AI、xAI 註冊 `catalog` 加上 `resolveDynamicModel` / `prepareDynamicModel`，以便它們能在 OpenClaw 的靜態目錄之前公開上游模型 ID。</Accordion>
  <Accordion title="OAuth 和使用端點提供者">GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、Xiaomi、z.ai 將 `prepareRuntimeAuth` 或 `formatApiKey` 與 `resolveUsageAuth` + `fetchUsageSnapshot` 配對，以擁有權杖交換和 `/usage` 整合功能。</Accordion>
  <Accordion title="重播和逐字稿清理系列">共用的命名系列 (`google-gemini`、`passthrough-gemini`、 `anthropic-by-model`、`hybrid-anthropic-openai`) 讓提供者能透過 `buildReplayPolicy` 選用逐字稿政策，而不需每個外掛程式重新實作清理邏輯。</Accordion>
  <Accordion title="僅目錄提供者">`byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、 `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 以及 `volcengine` 僅註冊 `catalog` 並使用共享的推理迴圈。</Accordion>
  <Accordion title="Anthropic 專用串流輔助程式">Beta 標頭、`/fast` / `serviceTier` 和 `context1m` 存在於 Anthropic 外掛程式的公開 `api.ts` / `contract-api.ts` 縫隙 (`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、 `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`) 中，而非位於 通用 SDK 內。</Accordion>
</AccordionGroup>

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

- `textToSpeech` 會傳回檔案/語音備忘錄介面的正常核心 TTS 輸出承載。
- 使用核心 `messages.tts` 組態與提供者選取。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須為提供者進行重新取樣/編碼。
- `listVoices` 對各個提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音清單可以包含更豐富的中繼資料，例如地區設定、性別和人格標籤，以供具備提供者感知能力的選擇器使用。
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

- 請將 TTS 原則、後備機制和回覆傳遞保留在核心中。
- 請使用語音提供者來處理廠商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會正規化為 `microsoft` 提供者 ID。
- 首選的所有權模型是以公司為導向的：隨著 OpenClaw 新增這些能力合約，一個廠商外掛可以擁有文字、語音、圖片和未來的媒體提供者。

對於圖片/音訊/影片理解，外掛註冊一個型別化的媒體理解提供者，而不是通用的鍵值對集合：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

註記：

- 將編排、後備、配置和通道連線保留在核心中。
- 將廠商行為保留在提供者外掛中。
- 擴充性增強應保持型別化：新的可選方法、新的可選結果欄位、新的可選能力。
- 影片生成已經遵循相同的模式：
  - 核心擁有能力合約和執行時輔助程式
  - 廠商外掛註冊 `api.registerVideoGenerationProvider(...)`
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

const extraction = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
  provider: "codex",
  model: "gpt-5.5",
  input: [
    {
      type: "image",
      buffer: receiptImageBuffer,
      fileName: "receipt.png",
      mime: "image/png",
    },
    { type: "text", text: "Use the printed fields as the source of truth." },
  ],
  instructions: "Return entities and searchable tags.",
  schemaName: "example.evidence",
  jsonSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
  },
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

註記：

- `api.runtime.mediaUnderstanding.*` 是用於圖片/音訊/影片理解的首選共享介面。
- `extractStructuredWithModel(...)` 是針對有界的提供者擁有的圖片優先提取之外掛導向接縫。請至少包含一個圖片輸入；文字輸入是輔助背景。
  產品外掛擁有其路由和架構，而 OpenClaw 擁有提供者/執行時邊界。
- 使用核心媒體理解音訊配置 (`tools.media.audio`) 和提供者後備順序。
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

註記：

- `provider` 和 `model` 是每次執行的可選覆寫，而不是持續性的會話變更。
- OpenClaw 僅對受信任的呼叫者遵守那些覆寫欄位。
- 對於外掛擁有的後備執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛限制為特定的標準 `provider/model` 目標，或使用 `"*"` 明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是無訊息地回退。
- 外掛程式建立的子代理程式會話會加上建立此外掛程式的 ID 標記。`api.runtime.subagent.deleteSession(...)` 只能刪除那些擁有的會話；任意刪除會話仍然需要具備管理員範圍的 Gateway 請求。

對於網路搜尋，外掛程式可以使用共享的執行時期輔助程式，而不是深入存取代理程式工具連線：

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
- 使用網路搜尋提供者進行廠商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴代理程式工具包裝函式的功能/通道外掛程式首選的共享介面。

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
- `auth`：必要。使用 `"gateway"` 要求正常的 gateway 認證，或使用 `"plugin"` 進行外掛程式管理的認證/webhook 驗證。
- `match`：選用。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：選用。允許同一個外掛程式取代其現有的路由註冊。
- `handler`：當路由處理請求時傳回 `true`。

備註：

- `api.registerHttpHandler(...)` 已移除，會導致外掛程式載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 外掛程式路由必須明確宣告 `auth`。
- 完全相同的 `path + match` 衝突會被拒絕，除非設定了 `replaceExisting: true`，且一個外掛程式無法取代另一個外掛程式的路由。
- 具有不同 `auth` 級別的重疊路由會被拒絕。請將 `exact`/`prefix` 透傳鏈保持在同一個授權級別上。
- `auth: "plugin"` 路由**不會**自動接收操作員運行時範圍。它們是用於外掛程式管理的 webhook/簽名驗證，而非特權 Gateway 輔助呼叫。
- `auth: "gateway"` 路由在 Gateway 請求運行時範圍內運行，但該範圍是有意設計為保守的：
  - 共享金鑰 bearer 驗證（`gateway.auth.mode = "token"` / `"password"`）會將外掛路由運行時範圍固定為 `operator.write`，即使呼叫者發送了 `x-openclaw-scopes`
  - 受信任的攜帶身分的 HTTP 模式（例如私有入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`）僅在標頭明確存在時才接受 `x-openclaw-scopes`
  - 如果這些攜帶身分的外掛路由請求中缺少 `x-openclaw-scopes`，運行時範圍將回退至 `operator.write`
- 實務規則：不要假設 gateway-auth 外掛路由是隱含的管理介面。如果您的路由需要僅限管理員的行為，請要求使用攜帶身分的驗證模式，並記錄明確的 `x-openclaw-scopes` 標頭合約。

## 外掛 SDK 匯入路徑

在撰寫新外掛程式時，請使用較窄的 SDK 子路徑，而不是單體的 `openclaw/plugin-sdk` 根匯入。核心子路徑：

| 子路徑                              | 用途                                              |
| ----------------------------------- | ------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 外掛註冊原語                                      |
| `openclaw/plugin-sdk/channel-core`  | 頻道進入點/建置輔助函式                           |
| `openclaw/plugin-sdk/core`          | 通用共享輔助函式和統攣合約                        |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema（`OpenClawSchema`） |

通道插件從一組狹窄的縫隙中進行選擇 —— `channel-setup`、
`setup-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-outbound`、
`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。審批行為應合併到
一個 `approvalCapability` 契約中，而不是在多個不相關的
插件欄位之間混用。參閱 [通道插件](/zh-Hant/plugins/sdk-channel-plugins)。

執行時和配置輔助程式位於匹配的專注 `*-runtime` 子路徑下
（`approval-runtime`、`agent-runtime`、`lazy-runtime`、`directory-runtime`、
`text-runtime`、`runtime-store`、`system-event-runtime`、`heartbeat-runtime`、
`channel-activity-runtime` 等）。優先使用 `config-contracts`、
`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation`，
而不是廣泛的 `config-runtime` 相容性桶。

<Info>`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/channel-lifecycle`、 小型通道輔助外觀、`openclaw/plugin-sdk/outbound-runtime`、 `openclaw/plugin-sdk/outbound-send-deps`、`openclaw/plugin-sdk/config-runtime` 和 `openclaw/plugin-sdk/infra-runtime` 是為舊版插件提供的已棄用相容性填充層。 新程式碼應改用更狹窄的通用基本型別。</Info>

儲存庫內部進入點（每個捆綁的插件套件根目錄）：

- `index.js` — 捆綁插件進入點
- `api.js` — 輔助/型別桶
- `runtime-api.js` — 僅執行時桶
- `setup-entry.js` — 安裝插件進入點

外部插件應該只匯入 `openclaw/plugin-sdk/*` 子路徑。絕不要從核心或其他插件匯入另一個插件套件的 `src/*`。Facade 載入的進入點偏好使用現有的執行時期設定快照，然後再回退到磁碟上解析的設定檔。

特定功能的子路徑，例如 `image-generation`、`media-understanding` 和 `speech` 之所以存在，是因為打包的外掛目前會使用它們。它們並非自動凍結的長期外部契約 — 當依賴它們時，請查閱相關的 SDK 參考頁面。

## 訊息工具架構

外掛應該擁有針對非訊息基本類型（如反應、已讀和投票）的特定頻道 `describeMessageTool(...)` 架構貢獻。共用的發送呈現應該使用通用的 `MessagePresentation` 契約，而不是供應商原生的按鈕、元件、區塊或卡片欄位。請參閱[訊息呈現](/zh-Hant/plugins/message-presentation)以了解契約、回退規則、供應商對應以及外掛作者檢查清單。

具備發送功能的外掛會透過訊息功能宣告它們可以呈現的內容：

- `presentation` 用於語意呈現區塊（`text`、`context`、`divider`、`buttons`、`select`）
- `delivery-pin` 用於固定交付請求

核心決定是原生呈現該呈現內容還是將其降級為文字。不要從通用訊息工具中暴露供應商原生的 UI 逃生艙。針對舊版原生架構已棄用的 SDK 輔助程式仍會匯出，以供現有的第三方外掛使用，但新的外掛不應使用它們。

## 頻道目標解析

頻道外掛應該擁有特定頻道的目標語意。保持共用的輸出主機通用，並使用訊息介面卡表面來處理供應商規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查詢之前，標準化的目標應被視為 `direct`、`group` 還是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 會告訴核心某個輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- 當核心在正規化或目錄查找失敗後需要最終由提供者擁有的解析結果時，`messaging.targetResolver.resolveTarget(...)` 是插件的後備方案。
- 一旦目標解析完成，`messaging.resolveOutboundSessionRoute(...)` 負責處理特定於提供者的會話路徑構建。

建議的分工：

- 使用 `inferTargetChatType` 來處理應在搜尋同儕/群組之前發生的類別決策。
- 使用 `looksLikeId` 來進行「將此視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 作為特定於提供者的正規化後備方案，而非用於廣泛的目錄搜尋。
- 請將特定於提供者的原生 ID（如聊天 ID、執行緒 ID、JID、代號 和房間 ID）保留在 `target` 值或特定於提供者的參數中，不要放在通用的 SDK 欄位中。

## 基於設定檔的目錄

從設定檔衍生目錄條目的插件應將該邏輯保留在插件內，並重用 `openclaw/plugin-sdk/directory-runtime` 中的共享輔助程式。

當通道需要基於設定檔的同儕/群組時使用此選項，例如：

- 由允許清單驅動的 DM 同儕
- 已設定的通道/群組對應
- 帳戶範圍的靜態目錄後備方案

`directory-runtime` 中的共享輔助程式僅處理通用操作：

- 查詢過濾
- 限制應用
- 去重/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

特定於通道的帳戶檢查和 ID 正規化應保留在插件實作中。

## 提供者目錄

提供者插件可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推論的模型目錄。

`catalog.run(...)` 會傳回與 OpenClaw 寫入 `models.providers` 相同的形狀：

- `{ provider }` 用於單一提供者條目
- `{ providers }` 用於多個提供者條目

當插件擁有特定於提供者的模型 ID、基底 URL 預設值或權限控管的模型元資料時，請使用 `catalog`。

`catalog.order` 控制插件的目錄相對於 OpenClaw 內建隱含提供者的合併時機：

- `simple`：純 API 金鑰或由環境變數驅動的供應商
- `profile`：當存在驗證設定檔時出現的供應商
- `paired`：合成多個相關供應商項目的供應商
- `late`：最後一遍，在其他隱式供應商之後

在金鑰衝突時，後面的供應商會優先，因此外掛程式可以故意使用相同的供應商 ID 覆寫內建的供應商項目。

外掛程式也可以透過 `api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog })` 發布唯讀的模型資料列。這是清單/說明/選擇器介面的路徑，並支援 `text`、`image_generation`、`video_generation` 和 `music_generation` 資料列。供應商外掛程式仍然擁有即時端點呼叫、權杖交換和供應商回應對應的擁有權；核心擁有通用資料列形狀、來源標籤和媒體工具說明格式的擁有權。媒體生成供應商註冊會自動從 `defaultModel`、`models` 和 `capabilities` 合成靜態目錄資料列。

相容性：

- `discovery` 仍可作為舊版別名使用，但會發出棄用警告
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`
- `augmentModelCatalog` 已被棄用；捆綁的供應商應透過 `registerModelCatalogProvider` 發布補充資料列

## 唯讀通道檢查

如果您的外掛程式註冊了一個通道，請優先在 `resolveAccount(...)` 旁實作 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它可以假設憑證已完全具象化，並在缺少所需祕密時快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 和 doctor/config 修復流程等唯讀指令路徑，不應僅為了描述設定就具象化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅返回描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要僅為了報告唯讀可用性而返回原始權杖值。返回 `tokenStatus: "available"`（以及匹配的來源欄位）對於狀態樣式的命令來說就足夠了。
- 當憑證是透過 SecretRef 配置但在當前命令路徑中不可用時，請使用 `configured_unavailable`。

這允許唯讀命令報告「已配置但在當前命令路徑中不可用」，而不是崩潰或錯誤地將帳戶報告為未配置。

## 套件包

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

每個條目都會成為一個外掛程式。如果套件包列出了多個擴充功能，外掛程式 ID 會變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依項，請將它們安裝在該目錄中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 條目必須保留在外掛程式目錄內。逃脫套件目錄的條目將被拒絕。

安全提示：`openclaw plugins install` 會使用專案本地的 `npm install --omit=dev --ignore-scripts` 安裝外掛程式相依項（無生命週期腳本，執行時期無開發相依項），並忽略繼承的全域 npm 安裝設定。請保持外掛程式相依項樹為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個僅用於設定的輕量級模組。
當 OpenClaw 需要針對已停用的通道外掛提供設定介面，或者
當通道外掛已啟用但尚未設定時，它會載入 `setupEntry`
而非完整的外掛進入點。當您的主要外掛進入點同時連接了工具、掛鉤或其他僅限執行時期的
程式碼時，這能讓啟動和設定程序更輕量化。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛在閘道的預聽取啟動階段中，選擇採用相同的 `setupEntry` 路徑，
即使該通道已經設定過也是如此。

僅當 `setupEntry` 完整涵蓋閘道開始聽取前必須存在的啟動介面時，才使用此功能。
實務上，這意味著設定進入點必須註冊所有啟動相依的通道擁有功能，例如：

- 通道註冊本身
- 任何必須在閘道開始聽取前就準備就緒的 HTTP 路由
- 任何必須在該時間視窗內存在的閘道方法、工具或服務

如果您的完整進入點仍然擁有任何啟動所需的功能，請勿啟用
此旗標。請將外掛保持在預設行為，並讓 OpenClaw 在啟動期間載入
完整進入點。

捆綁通道也可以發布僅供設定使用的合約介面輔助程式，讓核心
在載入完整通道執行時期之前進行查詢。目前的設定
升級介面為：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

當核心需要將舊版單一帳戶通道設定升級為 `channels.<id>.accounts.*` 而不載入完整外掛進入點時，會使用該介面。
Matrix 是目前捆綁範例：當具名帳戶已存在時，它只會將驗證/啟動金鑰移至
具名的升級帳戶，並且它可以保留設定的非正式預設帳戶金鑰，而不是總是建立
`accounts.default`。

這些設定修補適配器讓捆綁的合約介面探索保持延遲載入。匯入
時間保持輕量；升級介面僅在首次使用時載入，而不是在模組匯入時重新進入捆綁通道的啟動程序。

當這些啟動介面包含 Gateway RPC 方法時，請將它們保持在外掛特定的前綴上。核心管理命名空間（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）保留給核心，且始終解析為
`operator.admin`，即使外掛請求了更窄的範圍。

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

### Channel 目錄元數據

Channel 外掛可以透過 `openclaw.channel` 公佈設定/探索元數據，並透過 `openclaw.install` 公佈安裝提示。這使核心目錄保持無資料狀態。

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
- `docsLabel`：覆寫文件連結的連結文字
- `preferOver`：此目錄條目應排名高於的較低優先級外掛/channel ID
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：選擇介面的複製控制項
- `markdownCapable`：將 channel 標記為支援 markdown，用於出站格式決策
- `exposure.configured`：設為 `false` 時，在已設定 channel 列表介面中隱藏該 channel
- `exposure.setup`：設為 `false` 時，在互動式設定/設定選擇器中隱藏該 channel
- `exposure.docs`：將 channel 標記為內部/私有，用於文件導覽介面
- `showConfigured` / `showInSetup`：為相容性而接受的舊版別名；建議優先使用 `exposure`
- `quickstartAllowFrom`：讓 channel 加入標準快速入門 `allowFrom` 流程
- `forceAccountBinding`：即使僅存在一個帳戶，也要求明確的帳戶綁定
- `preferSessionLookupForAnnounceTarget`：在解析發佈目標時，優先使用工作階段查詢

OpenClaw 也可以合併**外部 channel 目錄**（例如 MPM registry 匯出）。將 JSON 檔案放置於以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

產生的頻道目錄項目和提供者安裝目錄項目會在原始 `openclaw.install` 區塊旁公開標準化的安裝來源事實。這些標準化事實會識別 npm 規格是確切版本還是浮動選擇器、是否存在預期的完整性元數據，以及是否有本機來源路徑可用。當目錄/套件身分已知時，如果解析出的 npm 套件名稱與該身分不一致，標準化事實會發出警告。當 `defaultChoice` 無效或指向不可用的來源時，以及當存在 npm 完整性元數據卻沒有有效的 npm 來源時，它們也會發出警告。消費者應將 `installSource` 視為一個可選的附加欄位，因此手動建立的項目和目錄填充層（shims）不需要合成它。這使得加入和診斷可以在不匯入外掛程式執行時間的情況下解釋來源平面狀態。

官方的外部 npm 項目應優先使用確切的 `npmSpec` 加上
`expectedIntegrity`。裸套件名稱和 dist-tags 為了相容性仍然有效，
但它們會顯示 source-plane 警告，以便目錄可以在不破壞現有插件的情況下
轉向固定、完整性檢查的安裝。
當從本地目錄路徑加入安裝時，它會記錄一個受管理的插件
插件索引條目，其中包含 `source: "path"` 以及盡可能使用的工作區相對
`sourcePath`。絕對操作加載路徑保留在
`plugins.load.paths` 中；安裝記錄避免了將本地工作站
路徑重複到長期配置中。這使得本地開發安裝對
source-plane 診斷可見，而不會增加第二個原始檔案系統路徑洩露
表面。持久化的 `plugins/installs.json` 插件索引是安裝
的單一事實來源，並且可以在不加載插件運行時模塊的情況下刷新。
其 `installRecords` 映射即使插件清單缺失或
無效也是持久的；其 `plugins` 數組是可重建的清單視圖。

## Context engine 插件

Context engine 插件擁有用於攝取、組裝
和壓縮的會話上下文編排。從您的插件中使用
`api.registerContextEngine(id, factory)` 註冊它們，然後使用
`plugins.slots.contextEngine` 選擇活動引擎。

當您的插件需要替換或擴展默認上下文
管道而不僅僅是添加記憶體搜索或掛鉤時，請使用此功能。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
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

工廠 `ctx` 公開了可選的 `config`、`agentDir` 和 `workspaceDir`
值，用於構造時初始化。

當 active harness 具有持久化後端執行緒時，`assemble()` 可能會傳回 `contextProjection`。若是傳統的逐輪（per-turn）投影，請省略它。當組裝好的內容應該注入一次至後端執行緒並重複使用直到 epoch 改變時，請傳回 `{ mode: "thread_bootstrap", epoch }`。在引擎的語意內容改變之後（例如在引擎擁有的壓縮過程之後），請變更 epoch。Host 可以在 thread-bootstrap 投影中保留工具呼叫元資料、輸入形狀以及編輯過的工具結果，以便新的後端執行緒能夠保持工具連續性，而無需複製包含原始機密的資料載荷。

如果您的引擎並未擁有壓縮演算法，請保留 `compact()` 的實作並明確地委派它：

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
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

當外掛需要不符合目前 API 的行為時，請不要透過私有的 reach-in 繞過外掛系統。請新增缺失的功能。

建議的步驟順序：

1. 定義核心合約
   決定核心應該擁有哪些共享行為：原則、後備機制、設定合併、生命週期、面向通道的語意，以及執行時期輔助工具的形狀。
2. 新增型別化外掛註冊 / 執行時期介面
   以最小的有用型別化功能介面來擴充 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心與通道 / 功能消費者
   通道和功能外掛應該透過核心來使用新功能，而不是直接匯入供應商的實作。
4. 註冊供應商實作
   然後供應商外掛會針對該功能註冊它們的後端。
5. 新增合約覆蓋率
   新增測試，以便擁有權和註冊形狀隨著時間保持明確。

這就是 OpenClaw 在不硬編碼單一供應商世界觀的情況下保持主觀觀點的方式。如需具體的檔案檢查清單和實作範例，請參閱 [Capability Cookbook](/zh-Hant/tools/capability-cookbook)。

### 功能檢查清單

當您新增新功能時，實作通常應該同時涉及這些介面：

- `src/<capability>/types.ts` 中的核心合約型別
- `src/<capability>/runtime.ts` 中的核心執行器 / 執行時期輔助工具
- `src/plugins/types.ts` 中的外掛 API 註冊介面
- `src/plugins/registry.ts` 中的外掛註冊表連線
- 在 `src/plugins/runtime/*` 中的外掛程式執行時公開，當功能/通道外掛程式需要使用它時
- 在 `src/test-utils/plugin-registration.ts` 中的捕獲/測試輔助工具
- 在 `src/plugins/contracts/registry.ts` 中的所有權/合約斷言
- 在 `docs/` 中的操作員/外掛程式文件

如果缺少其中一個介面，這通常是該功能尚未完全整合的跡象。

### 功能模板

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

這使規則保持簡單：

- 核心擁有功能合約 + 編排
- 供應商外掛程式擁有供應商實作
- 功能/通道外掛程式使用執行時輔助工具
- 合約測試使所有權明確

## 相關

- [外掛程式架構](/zh-Hant/plugins/architecture) — 公共功能模型和形狀
- [外掛程式 SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)
- [外掛程式 SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)

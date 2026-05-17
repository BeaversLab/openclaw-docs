---
summary: "外掛架構內部機制：載入管線、註冊表、執行時掛鉤、HTTP 路由和參考表格"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "外掛架構內部機制"
---

關於公開功能模型、插件形狀以及所有權/執行契約，請參閱 [插件架構](/zh-Hant/plugins/architecture)。本頁面是內部機制的參考文件：載入管線、註冊表、執行時掛鉤、Gateway HTTP 路由、匯入路徑和架構表。

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
- **Runtime hooks**：40 多個可選的 hooks，涵蓋身份驗證、模型解析、
  串流包裝、思考級別、重播策略和使用端點。請參閱
  [Hook order and usage](#hook-order-and-usage) 下的完整列表。

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

| #   | Hook                              | 作用                                                                                                  | 何時使用                                                                                                       |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 產生期間將提供者配置發佈到 `models.providers`                                        | 提供者擁有目錄或基礎 URL 預設值                                                                                |
| 2   | `applyConfigDefaults`             | 在配置具體化期間套用提供者擁有的全域配置預設值                                                        | 預設值取決於驗證模式、環境或提供者模型系列語意                                                                 |
| --  | _(內建模型查找)_                  | OpenClaw 首先嘗試正常的註冊表/目錄路徑                                                                | _(不是外掛程式掛鉤)_                                                                                           |
| 3   | `normalizeModelId`                | 在查找之前正規化舊版或預覽模型 ID 別名                                                                | 提供者在解析規範模型之前擁有別名清理權                                                                         |
| 4   | `normalizeTransport`              | 在通用模型組裝之前正規化提供者系列 `api` / `baseUrl`                                                  | Provider 擁有同一傳輸系列中自訂 provider ID 的傳輸清理工作                                                     |
| 5   | `normalizeConfig`                 | 在 runtime/provider 解析前先正規化 `models.providers.<id>`                                            | Provider 需要組態清理，這應該隨附於外掛；內建的 Google 系列輔助函式也會支援支援的 Google 組態項目作為最後防線  |
| 6   | `applyNativeStreamingUsageCompat` | 對組態 provider 套用原生串流使用相容性重寫                                                            | Provider 需要端點驅動的原生串流使用中繼資料修復                                                                |
| 7   | `resolveConfigApiKey`             | 在 runtime auth 載入之前，解析組態 provider 的 env-marker auth                                        | Provider 具有 provider 擁有的 env-marker API 金鑰解析；`amazon-bedrock` 在此也具有內建的 AWS env-marker 解析器 |
| 8   | `resolveSyntheticAuth`            | 公開本地/自託管或基於組態的 auth，而不儲存純文字                                                      | Provider 可以使用合成的/本地的憑證標記運作                                                                     |
| 9   | `resolveExternalAuthProfiles`     | 疊加 Provider 擁有的外部驗證設定檔；對於 CLI/應用程式擁有的憑證，預設 `persistence` 為 `runtime-only` | Provider 重複使用外部驗證憑證而不保存複製的刷新 Token；在清單中宣告 `contracts.externalAuthProviders`          |
| 10  | `shouldDeferSyntheticProfileAuth` | 降低環境變數/配置支援的驗證背後所儲存的合成設定檔佔位符優先級                                         | Provider 儲存不應獲得優先權的合成佔位符設定檔                                                                  |
| 11  | `resolveDynamicModel`             | 針對本地註冊表中尚未存在的 Provider 擁有的模型 ID 進行同步回退                                        | Provider 接受任意的上游模型 ID                                                                                 |
| 12  | `prepareDynamicModel`             | 非同步預熱，然後 `resolveDynamicModel` 再次執行                                                       | 提供者在解析未知 ID 之前需要網路中繼資料                                                                       |
| 13  | `normalizeResolvedModel`          | 嵌入式執行器使用解析的模型之前的最終重寫                                                              | 提供者需要傳輸重寫，但仍使用核心傳輸                                                                           |
| 14  | `contributeResolvedModelCompat`   | 為另一個相容傳輸後的廠商模型提供相容性標誌                                                            | 提供者識別代理傳輸上自己的模型，而不接管提供者                                                                 |
| 15  | `normalizeToolSchemas`            | 在嵌入式執行器看到工具架構之前將其正規化                                                              | 提供者需要傳輸家族架構清理                                                                                     |
| 16  | `inspectToolSchemas`              | 在正規化後顯示提供者擁有的架構診斷                                                                    | 提供者需要關鍵字警告，而不教導核心特定於提供者的規則                                                           |
| 17  | `resolveReasoningOutputMode`      | 選擇原生與標籤式推理輸出合約                                                                          | 提供者需要標記化的推理/最終輸出，而不是原生欄位                                                                |
| 18  | `prepareExtraParams`              | 通用串流選項包裝器之前的請求參數正規化                                                                | 提供者需要預設請求參數或每個提供者的參數清理                                                                   |
| 19  | `createStreamFn`                  | 使用自訂傳輸完全替換正常的串流路徑                                                                    | 提供者需要自訂的線路協定，而不僅僅是包裝器                                                                     |
| 20  | `wrapStreamFn`                    | 應用通用包裝器之後的串流包裝器                                                                        | 提供者需要請求標頭/主體/模型相容性包裝器，而不需要自訂傳輸                                                     |
| 21  | `resolveTransportTurnState`       | 附加原生每回合傳輸標頭或元資料                                                                        | 提供者希望通用傳輸發送提供者原生的回合身份                                                                     |
| 22  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 標頭或會話冷卻策略                                                                 | Provider 想要透過通用 WS 傳輸調整 session 標頭或後備策略                                                       |
| 23  | `formatApiKey`                    | Auth-profile formatter：儲存的 profile 成為執行時期 `apiKey` 字串                                     | Provider 儲存額外的 auth 中介資料，並需要自訂的執行時期 token 形狀                                             |
| 24  | `refreshOAuth`                    | OAuth 重新整理覆寫，用於自訂重新整理端點或重新整理失敗策略                                            | Provider 不適用於共用的 `pi-ai` 重新整理器                                                                     |
| 25  | `buildAuthDoctorHint`             | 當 OAuth 重新整理失敗時附加的修復提示                                                                 | Provider 在重新整理失敗後需要 Provider 擁有的 auth 修復指引                                                    |
| 26  | `matchesContextOverflowError`     | Provider 擁有的 context-window 溢位比對器                                                             | Provider 有通用啟發法會錯過的原始溢位錯誤                                                                      |
| 27  | `classifyFailoverReason`          | Provider 擁有的故障移轉原因分類                                                                       | Provider 可以將原始 API/傳輸錯誤映射至速率限制/過載/等                                                         |
| 28  | `isCacheTtlEligible`              | 代理/回傳 Provider 的 Prompt 快取策略                                                                 | Provider 需要特定於代理的快取 TTL 閘控                                                                         |
| 29  | `buildMissingAuthMessage`         | 取代通用的缺少認證恢復訊息                                                                            | Provider 需要特定於 Provider 的缺少認證恢復提示                                                                |
| 30  | `augmentModelCatalog`             | 在探索後附加的合成/最終目錄列                                                                         | Provider 需要在 `models list` 和選擇器中提供合成的向前相容性資料列                                             |
| 31  | `resolveThinkingProfile`          | 特定於模型的 `/think` 層級設定、顯示標籤和預設值                                                      | Provider 為選定的模型公開自訂的思維層級或二元標籤                                                              |
| 32  | `isBinaryThinking`                | On/off 推理切換相容性掛鉤                                                                             | Provider 僅公開二元思維 on/off                                                                                 |
| 33  | `supportsXHighThinking`           | `xhigh` 推理支援相容性 Hook                                                                           | Provider 僅希望在部分模型上啟用 `xhigh`                                                                        |
| 34  | `resolveDefaultThinkingLevel`     | 預設 `/think` 層級相容性掛鉤                                                                          | 提供者擁有模型家族的預設 `/think` 策略                                                                         |
| 35  | `isModernModelRef`                | 用於即時設定檔篩選器和 smoke 選擇的現代模型比對器                                                     | Provider 擁有 live/smoke 首選模型比對                                                                          |
| 36  | `prepareRuntimeAuth`              | 在推論之前將設定的認證交換為實際的執行時期 token/金鑰                                                 | Provider 需要 token 交換或短期請求認證                                                                         |
| 37  | `resolveUsageAuth`                | 解析 `/usage` 的使用/計費憑證及相關狀態介面                                                           | Provider 需要自訂的使用量/配額 token 解析或不同的使用量認證                                                    |
| 38  | `fetchUsageSnapshot`              | 在解析身份驗證後，獲取並標準化供應商特定的使用量/配額快照                                             | 供應商需要一個供應商特定的使用量端點或負載解析器                                                               |
| 39  | `createEmbeddingProvider`         | 為記憶體/搜尋建構一個供應商擁有的嵌入適配器                                                           | 記憶體嵌入行為屬於供應商外掛                                                                                   |
| 40  | `buildReplayPolicy`               | 返回一個控制供應商轉錄處理的重播策略                                                                  | 供應商需要自訂轉錄策略（例如，思考區塊剝離）                                                                   |
| 41  | `sanitizeReplayHistory`           | 在通用轉錄清理後重寫重播歷史                                                                          | 供應商需要超出共享壓縮輔助函式的供應商特定重播重寫                                                             |
| 42  | `validateReplayTurns`             | 在內嵌執行器之前的最終重播輪次驗證或重構                                                              | 供應商傳輸在通用清理後需要更嚴格的輪次驗證                                                                     |
| 43  | `onModelSelected`                 | 執行供應商擁有的選取後副作用                                                                          | 當模型變為活動狀態時，供應商需要遙測或供應商擁有的狀態                                                         |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 會先檢查匹配的供應商插件，然後回退到其他具備 Hook 能力的供應商插件，直到其中一個實際更改了模型 ID 或 transport/config。這使得 alias/compat 供應商填充層（shims）能夠正常運作，而無需呼叫者知道哪個內建插件擁有該重寫權限。如果沒有供應商 Hook 重寫支援的 Google 系列 config 項目，內建的 Google config normalizer 仍會套用該相容性清理。

如果供應商需要完全自訂的線路協定或自訂請求執行器，那則是不同類別的擴充功能。這些掛鉤是用於仍然在 OpenClaw 正常推斷迴路上運行的供應商行為。

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

內建供應商插件結合上述 Hook 以適應每個供應商的目錄、驗證、思考、重播和使用需求。權威的 Hook 集合位於每個插件的 `extensions/` 下；本頁面僅說明其形狀而非鏡像該列表。

<AccordionGroup>
  <Accordion title="傳遞目錄供應商">OpenRouter、Kilocode、Z.AI、xAI 註冊 `catalog` 加上 `resolveDynamicModel` / `prepareDynamicModel`，以便它們能在 OpenClaw 的靜態目錄之前顯示上游模型 ID。</Accordion>
  <Accordion title="OAuth 和使用端點供應商">GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、Xiaomi、z.ai 將 `prepareRuntimeAuth` 或 `formatApiKey` 與 `resolveUsageAuth` + `fetchUsageSnapshot` 配對，以擁有權杖交換和 `/usage` 整合。</Accordion>
  <Accordion title="重播和文字記錄清理系列">共用的命名系列（`google-gemini`、`passthrough-gemini`、 `anthropic-by-model`、`hybrid-anthropic-openai`）讓供應商能透過 `buildReplayPolicy` 選用文字記錄策略，而不需每個插件重新實作清理邏輯。</Accordion>
  <Accordion title="僅目錄提供者">`byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、 `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 以及 `volcengine` 僅註冊 `catalog` 並使用共享的推論迴圈。</Accordion>
  <Accordion title="Anthropic 專用串流輔助程式">Beta 標頭、`/fast` / `serviceTier` 以及 `context1m` 存在於 Anthropic 外掛程式的公開 `api.ts` / `contract-api.ts` 縫隙 (`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、 `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`) 中，而非位於 通用 SDK 中。</Accordion>
</AccordionGroup>

## 執行時期輔助程式

外掛程式可以透過 `api.runtime` 存取選定的核心輔助程式。針對 TTS：

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
- 使用核心 `messages.tts` 組態與提供者選擇。
- 傳回 PCM 音訊緩衝區 + 採樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對每個提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
- 語音清單可以包含更豐富的中繼資料，例如地區設定、性別和個性標籤，以供具備提供者感知能力的選擇器使用。
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

- 將 TTS 原則、容錯移轉與回覆傳遞保留在核心中。
- 使用語音提供者進行廠商擁有的合成行為。
- 舊版 Microsoft `edge` 輸入會正規化為 `microsoft` 提供者 ID。
- 偏好的擁有權模型是以公司為導向：當 OpenClaw 新增這些功能合約時，
  一個廠商外掛程式可以擁有文字、語音、影像和未來的媒體提供者。

對於影像/音訊/影片理解，外掛程式註冊一個類型化的
媒體理解提供者，而非通用的鍵/值組合包：

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

- 將協調、容錯移轉、組態和通道連線保留在核心中。
- 將廠商行為保留在提供者外掛程式中。
- 新增的擴充應保持類型化：新的選用方法、新的選用
  結果欄位、新的選用功能。
- 影片產生已經遵循相同的模式：
  - 核心擁有功能合約與執行時期輔助程式
  - 廠商外掛程式註冊 `api.registerVideoGenerationProvider(...)`
  - 功能/通道外掛程式使用 `api.runtime.videoGeneration.*`

對於媒體理解執行時期輔助函式，外掛程式可以呼叫：

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

對於音訊轉錄，外掛程式可以使用媒體理解執行時期或較舊的 STT 別名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意事項：

- `api.runtime.mediaUnderstanding.*` 是用於
  影像/音訊/影片理解的首選共享介面。
- `extractStructuredWithModel(...)` 是插件接縫，用於有界的提供者擁有的圖像優先提取。請至少包含一個圖像輸入；文字輸入是補充上下文。產品外掛擁有自己的路由和結構描述，而 OpenClaw 則擁有提供者/執行時邊界。
- 使用核心媒體理解音訊配置 (`tools.media.audio`) 和提供者後援順序。
- 當未產生輸出輸出時（例如跳過/不支援的輸入），傳回 `{ text: undefined }`。
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

- `provider` 和 `model` 是每次執行的選用覆寫，而非持續性的工作階段變更。
- OpenClaw 僅對受信任的呼叫者遵守那些覆寫欄位。
- 對於外掛擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 來選擇加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛限制為特定的規範 `provider/model` 目標，或使用 `"*"` 來明確允許任何目標。
- 不受信任的外掛子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後援。
- 外掛建立的子代理程式工作階段會標記建立外掛 ID。後援 `api.runtime.subagent.deleteSession(...)` 只能刪除那些擁有的工作階段；任意工作階段刪除仍需要管理員範圍的 Gateway 請求。

對於網路搜尋，外掛可以使用共享執行時輔助程式，而不需要深入代理程式工具連線：

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

- 將提供者選擇、憑證解析和共用請求語意保留在核心中。
- 使用網路搜尋提供者進行廠商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為而不依賴代理程式工具包裝函式的功能/通道外掛的首選共享介面。

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

- `generate(...)`：使用設定的圖像生成提供者鏈產生圖像。
- `listProviders(...)`：列出可用的圖像生成提供者及其功能。

## Gateway HTTP 路由

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

- `path`：Gateway HTTP 伺服器下的路由路徑。
- `auth`：必填。使用 `"gateway"` 要求標準 Gateway 驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/Webhook 驗證。
- `match`：選填。`"exact"` (預設) 或 `"prefix"`。
- `replaceExisting`：選填。允許同一個外掛程式取代其既有的路由註冊。
- `handler`：當路由處理了請求時，回傳 `true`。

備註：

- `api.registerHttpHandler(...)` 已移除，將會導致外掛程式載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 外掛程式路由必須明確宣告 `auth`。
- 除非設定 `replaceExisting: true`，否則會拒絕精確的 `path + match` 衝突，且一個外掛程式不能取代另一個外掛程式的路由。
- 具有不同 `auth` 層級的重疊路由將會被拒絕。請將 `exact`/`prefix` 透傳鏈保持僅在同一個驗證層級。
- `auth: "plugin"` 路由**不會**自動接收操作員執行時範圍。它們是用於外掛程式管理的 Webhook/簽章驗證，而非特權 Gateway 協助程式呼叫。
- `auth: "gateway"` 路由在 Gateway 請求執行時範圍內運作，但該範圍是有意設為保守的：
  - 共享金鑰 bearer 驗證 (`gateway.auth.mode = "token"` / `"password"`) 會將外掛程式路由執行時範圍鎖定為 `operator.write`，即使呼叫者發送了 `x-openclaw-scopes`
  - 攜帶受信任識別的 HTTP 模式 (例如私人入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`) 僅在標頭明確存在時才會遵守 `x-openclaw-scopes`
  - 如果這些帶有身分的 plugin-route 請求中缺少 `x-openclaw-scopes`，執行時範圍會回退至 `operator.write`
- 實用規則：不要假設 gateway-auth plugin route 是一個隱含的管理介面。如果您的路由需要僅限管理員的行為，請要求採用帶有身分的驗證模式，並記錄明確的 `x-openclaw-scopes` 標頭合約。

## Plugin SDK 匯入路徑

在撰寫新插件時，請使用狹窄的 SDK 子路徑，而非單一的 `openclaw/plugin-sdk` 根桶。核心子路徑：

| 子路徑                              | 用途                                           |
| ----------------------------------- | ---------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 插件註冊基元                                   |
| `openclaw/plugin-sdk/channel-core`  | 通道入口/建置輔助程式                          |
| `openclaw/plugin-sdk/core`          | 通用共享輔助程式與傘式合約                     |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod 綱要 (`OpenClawSchema`) |

通道插件從一組狹窄的縫隙中選擇 —— `channel-setup`、
`setup-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-lifecycle`、
`channel-reply-pipeline`、`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。核准行為應整合於單一 `approvalCapability` 合約，而非混雜於不相關的插件欄位之間。請參閱 [通道插件](/zh-Hant/plugins/sdk-channel-plugins)。

Runtime and config helpers live under matching focused `*-runtime` subpaths
(`approval-runtime`, `agent-runtime`, `lazy-runtime`, `directory-runtime`,
`text-runtime`, `runtime-store`, `system-event-runtime`, `heartbeat-runtime`,
`channel-activity-runtime`, etc.). Prefer `config-contracts`,
`plugin-config-runtime`, `runtime-config-snapshot`, and `config-mutation`
instead of the broad `config-runtime` compatibility barrel.

<Info>`openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/config-runtime`, and `openclaw/plugin-sdk/infra-runtime` are deprecated compatibility shims for older plugins. New code should import narrower generic primitives instead.</Info>

Repo-internal entry points (per bundled plugin package root):

- `index.js` — bundled plugin entry
- `api.js` — helper/types barrel
- `runtime-api.js` — runtime-only barrel
- `setup-entry.js` — setup plugin entry

External plugins should only import `openclaw/plugin-sdk/*` subpaths. Never
import another plugin package's `src/*` from core or from another plugin.
Facade-loaded entry points prefer the active runtime config snapshot when one
exists, then fall back to the resolved config file on disk.

Capability-specific subpaths such as `image-generation`, `media-understanding`,
and `speech` exist because bundled plugins use them today. They are not
automatically long-term frozen external contracts — check the relevant SDK
reference page when relying on them.

## Message tool schemas

外掛程式應擁有針對非訊息基本類型（例如反應、已讀和投票）的特定頻道 `describeMessageTool(...)` 結構描述貢獻。共享傳送展示應使用通用的 `MessagePresentation` 合約，而不是提供者原生的按鈕、元件、區塊或卡片欄位。請參閱 [訊息展示](/zh-Hant/plugins/message-presentation) 以了解合約、後援規則、提供者對應以及外掛程式作者檢查清單。

具備傳送功能的外掛程式透過訊息能力宣告它們可以呈現的內容：

- `presentation` 用於語意展示區塊 (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` 用於固定傳送請求

核心決定是原生呈現展示還是將其降級為文字。請勿從通用訊息工具中公開提供者原生的 UI 逃生艙。針對舊版原生結構描述的已棄用 SDK 輔助程式仍會為現有的第三方外掛程式匯出，但新外掛程式不應使用它們。

## 頻道目標解析

頻道外掛程式應擁有特定頻道的目標語意。保持共享輸出主機通用，並使用訊息介面卡層來處理提供者規則：

- `messaging.inferTargetChatType({ to })` 決定在目錄查閱之前，是否應將標準化目標視為 `direct`、`group` 或 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入是否應跳過目錄搜尋，直接進行類似 ID 的解析。
- `messaging.targetResolver.resolveTarget(...)` 是當核心在標準化或目錄未命中後需要最終的提供者擁有解析時的外掛程式後援方案。
- `messaging.resolveOutboundSessionRoute(...)` 在目標解析後，擁有特定提供者的會話路由建構。

建議的分工：

- 使用 `inferTargetChatType` 來進行在搜尋對等/群組之前應發生的類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 將 `resolveTarget` 用於供應商特定的正規化後備機制，而不是用於
  廣泛的目錄搜尋。
- 將供應商原生 ID（例如聊天 ID、執行緒 ID、JID、代號和房間
  ID）保留在 `target` 值或供應商特定的參數中，而不是放在通用的 SDK
  欄位中。

## 設定支援的目錄

從設定衍生目錄條目的外掛程式應將該邏輯保留在外掛程式中，並重複使用來自
`openclaw/plugin-sdk/directory-runtime` 的共用輔助程式。

當通道需要設定支援的對等/群組時使用此功能，例如：

- 由允許清單驅動的 DM 對等
- 已設定的通道/群組對應
- 帳戶範圍的靜態目錄後備機制

`directory-runtime` 中的共用輔助程式僅處理通用操作：

- 查詢篩選
- 限制套用
- 重複資料刪除/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

通道特定的帳戶檢查和 ID 正規化應保留在外掛程式實作中。

## 供應商型錄

供應商外掛程式可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義用於推斷的模型型錄。

`catalog.run(...)` 會傳回與 OpenClaw 寫入 `models.providers` 相同的形狀：

- 用於一個供應商條目的 `{ provider }`
- 用於多個供應商條目的 `{ providers }`

當外掛程式擁有供應商特定的模型 ID、基礎 URL
預設值或授權閘道的模型中繼資料時，請使用 `catalog`。

`catalog.order` 控制外掛程式的型錄相對於 OpenClaw
內建隱含供應商的合併時機：

- `simple`：單純的 API 金鑰或環境變數驅動的供應商
- `profile`：當授權設定檔存在時出現的供應商
- `paired`：合成多個相關供應商條目的供應商
- `late`：最後一輪，在其他隱含供應商之後

後續的供應商在金鑰衝突時獲勝，因此外掛程式可以故意使用相同的供應商 ID 覆蓋
內建的供應商條目。

外掛程式也可以透過 `api.registerModelCatalogProvider({ provider, kinds, staticCatalog, liveCatalog
})` 發布唯讀模型資料列。這是清單/說明/選擇器介面的正向路徑，並支援 `text`、`image_generation`、`video_generation` 和 `music_generation` 資料列。
提供者外掛程式仍然擁有即時端點呼叫、權杖交換和供應商回應映射；核心擁有通用資料列形狀、來源標籤和媒體工具說明格式。媒體生成提供者註冊會自動從 `defaultModel`、`models` 和 `capabilities` 合成靜態目錄資料列。

相容性：

- `discovery` 仍作為傳統別名使用，但會發出棄用警告
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 會使用 `catalog`
- `augmentModelCatalog` 已棄用；捆綁的提供者應透過 `registerModelCatalogProvider` 發布補充資料列

## 唯讀通道檢查

如果您的外掛程式註冊了通道，建議與 `resolveAccount(...)` 一起實作 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它可以假設憑證已完全具體化，並在缺少所需秘密時快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 和 doctor/config
  修復流程等唯讀指令路徑，不應僅為了描述設定而具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅傳回描述性帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要僅為了報告唯讀可用性而返回原始權杖值。返回 `tokenStatus: "available"`（以及相符的來源欄位）對於狀態式指令已足夠。
- 當憑證是透過 SecretRef 設定但在目前的指令路徑中無法使用時，請使用 `configured_unavailable`。

這讓唯讀指令能回報「已設定但在本指令路徑中無法使用」，而不是當機或將帳戶誤報為未設定。

## 套件包

外掛程式目錄可能包含一個含有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會成為一個外掛程式。如果套件包列出多個擴充功能，外掛程式 ID 會變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依性，請將其安裝在該目錄中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 條目都必須保留在外掛程式目錄內。超出套件目錄的條目將會被拒絕。

安全說明：`openclaw plugins install` 會使用專本地的 `npm install --omit=dev --ignore-scripts`（無生命週期腳本、執行時期無 dev 相依性）來安裝外掛程式相依性，忽略繼承的全域 npm 安裝設定。請保持外掛程式相依性樹為「純 JS/TS」，並避免需要 `postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量的僅設定模組。當 OpenClaw 需要已停用通道外掛程式的設定介面，或者當通道外掛程式已啟用但尚未設定時，它會載入 `setupEntry` 而非完整的外掛程式進入點。這能在您的主要外掛程式進入點同時連接工具、掛鉤或其他僅執行時期程式碼時，保持啟動和設定的輕量化。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以讓通道外掛程式在閘道的預先監聽啟動階段，選擇加入相同的 `setupEntry` 路徑，即使通道已經設定過。

僅當 `setupEntry` 完全涵蓋了 Gateway 開始監聽之前必須存在的啟動表面時，才使用此功能。實際上，這意味著 setup entry 必須註冊啟動所依賴的每一個 channel 所有的 capability，例如：

- channel 註冊本身
- 任何在 Gateway 開始監聽之前必須可用的 HTTP 路由
- 任何在同一時間視窗內必須存在的 gateway 方法、工具或服務

如果您的完整 entry 仍然擁有任何啟動所需的 capability，請不要啟用此標誌。請保持插件的預設行為，並讓 OpenClaw 在啟動期間加載完整的 entry。

捆綁的 channel 也可以發布僅用於設定的契約表面輔助工具，core 可以在加載完整的 channel 運行時之前查詢這些工具。目前的設定升級表面包括：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

當 Core 需要將舊版單一帳戶 channel 配置升級為 `channels.<id>.accounts.*` 而不加載完整的 plugin entry 時，會使用該表面。Matrix 是目前捆綁的範例：當已存在命名帳戶時，它僅將 auth/bootstrap 金鑰移動到命名的升級帳戶中，並且它可以保留配置的非規範 default-account 金鑰，而不是總是建立 `accounts.default`。

那些設定修補適配器保持捆綁契約表面發現的延遲加載。導入時間保持輕量；升級表面僅在首次使用時加載，而不是在模組導入時重新進入捆綁 channel 啟動。

當這些啟動表面包含 gateway RPC 方法時，請將它們保留在特定於插件的前綴上。Core 管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍然被保留，並且始終解析為 `operator.admin`，即使插件請求了更窄的範圍。

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

Channel 插件可以透過 `openclaw.channel` 宣傳設定/發現元數據，並透過 `openclaw.install` 提供安裝提示。這使核心目錄保持無數據狀態。

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

除了最小範例外，還有有用的 `openclaw.channel` 欄位：

- `detailLabel`：用於更豐富的目錄/狀態介面的次要標籤
- `docsLabel`：覆寫文件連結的連結文字
- `preferOver`：此目錄項目應排名較高的優先級較低的插件/頻道 ID
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：選取介面的複製控制
- `markdownCapable`：將頻道標記為支援 Markdown，以便進行輸出格式化決策
- `exposure.configured`：當設為 `false` 時，在已設定頻道的列舉介面中隱藏該頻道
- `exposure.setup`：當設為 `false` 時，在互動式設定/配置選擇器中隱藏該頻道
- `exposure.docs`：將頻道標記為內部/私人，僅用於文件導覽介面
- `showConfigured` / `showInSetup`：為相容性仍接受的舊版別名；建議使用 `exposure`
- `quickstartAllowFrom`：讓頻道加入標準快速入門 `allowFrom` 流程
- `forceAccountBinding`：即使僅存在一個帳戶，也要求明確的帳戶綁定
- `preferSessionLookupForAnnounceTarget`：在解析公告目標時，優先使用工作階段查詢

OpenClaw 也可以合併 **外部頻道目錄**（例如 MPM 登錄檔匯出）。請將 JSON 檔案置於以下任一路徑：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

生成的通道目錄條目和提供者安裝目錄條目會在原始 `openclaw.install` 區塊旁邊公開標準化的安裝來源事實。標準化事務會識別 npm 規範是精確版本還是浮動選擇器、是否存在預期的完整性元數據，以及是否也有本機來源路徑可用。當目錄/套件身分已知時，如果解析出的 npm 套件名稱偏離了該身分，標準化事務會發出警告。當 `defaultChoice` 無效或指向不可用的來源時，以及當存在 npm 完整性元數據卻沒有有效的 npm 來源時，它們也會發出警告。消費者應將 `installSource` 視為一個額外的可選欄位，因此手動建構的條目和目錄填充層不必合成它。這使得上架和診斷能夠說明來源層面的狀態，而無需匯入外掛程式執行時。

官方的外部 npm 條目應偏好使用精確的 `npmSpec` 加上 `expectedIntegrity`。雖然純套件名稱和發行版本標籤為了相容性仍然有效，但會顯示來源層面的警告，以便目錄能夠在不破壞現有外掛程式的情況下，朝向釘選且經過完整性檢查的安裝邁進。當從本機目錄路徑上架安裝時，它會記錄一個受管理的外掛程式外掛程式索引條目，其中包含 `source: "path"` 以及盡可能包含工作區相對的 `sourcePath`。絕對的作業負載路徑保留在 `plugins.load.paths` 中；安裝記錄可避免將本機工作站路徑重複複製到長期儲存的設定中。這讓本機開發安裝對來源層面診斷可見，而不會新增第二個原始檔案系統路徑的洩露表面。持久化的 `plugins/installs.json` 外掛程式索引是安裝的來源事實，並且可以在不載入外掛程式執行時模組的情況下重新整理。其 `installRecords` 對映即使在缺少或無效的外掛程式清單時也是持久的；其 `plugins` 陣列則是一個可重建的清單檢視。

## Context engine plugins

Context engine plugins 擁有用於攝取、組裝和壓縮的 session context 編排功能。從您的 plugin 使用 `api.registerContextEngine(id, factory)` 註冊它們，然後使用 `plugins.slots.contextEngine` 選擇啟用的引擎。

當您的 plugin 需要取代或擴充預設的 context pipeline，而不僅僅是新增記憶體搜尋或 hooks 時，請使用此功能。

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

工廠 `ctx` 公開了可選的 `config`、`agentDir` 和 `workspaceDir` 值，用於建構時初始化。

如果您的引擎**不**擁有壓縮演算法，請保持 `compact()` 的實作並明確地委派它：

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

當 plugin 需要不符合目前 API 的行為時，不要使用私有的 reach-in 繞過 plugin 系統。請新增缺失的功能。

建議順序：

1. 定義核心契約
   決定 core 應該擁有哪些共享行為：原則、後援、設定合併、生命週期、面向通道的語意，以及 runtime helper 形狀。
2. 新增型別化的 plugin 註冊 / runtime 介面
   使用最小且有用的型別化功能介面來擴充 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接 core + 通道/功能消費者
   通道和功能 plugin 應該透過 core 來使用新功能，而不是直接匯入供應商的實作。
4. 註冊供應商實作
   然後，供應商 plugin 會針對該功能註冊其後端。
5. 新增契約覆蓋範圍
   新增測試，以便擁有權和註冊形狀隨著時間保持明確。

這就是 OpenClaw 如何在不變成硬編碼至單一供應商世界觀的情況下保持主見的方法。請參閱 [Capability Cookbook](/zh-Hant/tools/capability-cookbook) 以取得具體的檔案檢查清單和實作範例。

### 功能檢查清單

當您新增新功能時，實作通常應該同時接觸這些介面：

- `src/<capability>/types.ts` 中的核心契約型別
- `src/<capability>/runtime.ts` 中的核心執行器/runtime helper
- `src/plugins/types.ts` 中的 plugin API 註冊介面
- `src/plugins/registry.ts` 中的 plugin registry 連接
- 當功能/通道插件需要使用時，在 `src/plugins/runtime/*` 中暴露插件執行時
- `src/test-utils/plugin-registration.ts` 中的捕獲/測試輔助程式
- `src/plugins/contracts/registry.ts` 中的擁有權/契約斷言
- `docs/` 中的操作員/插件文件

如果缺少其中任何一個介面，這通常表示該功能尚未完全整合。

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
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

契約測試模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

這樣可以保持規則簡單：

- 核心擁有功能契約和編排
- 供應商插件擁有供應商實作
- 功能/通道插件使用執行時輔助程式
- 契約測試使擁有權明確化

## 相關

- [Plugin architecture](/zh-Hant/plugins/architecture) — 公開功能模型和形狀
- [Plugin SDK subpaths](/zh-Hant/plugins/sdk-subpaths)
- [Plugin SDK setup](/zh-Hant/plugins/sdk-setup)
- [Building plugins](/zh-Hant/plugins/building-plugins)

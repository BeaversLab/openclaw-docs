---
summary: "外掛架構內部機制：載入管線、註冊表、執行時掛鉤、HTTP 路由和參考表格"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "外掛架構內部機制"
---

關於公開功能模型、外掛形狀以及所有權/執行約定，請參閱 [外掛架構](/zh-Hant/plugins/architecture)。本頁面是內部機制的參考：載入管線、註冊表、執行時掛鉤、Gateway HTTP 路由、匯入路徑和架構表格。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容套件清單和套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛設定 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 決定每個候選項的啟用狀態
6. 載入已啟用的原生模組：建置的套件模組使用原生載入器；未建置的原生外掛使用 jiti
7. 呼叫原生 `register(api)` 掛鉤並將註冊收集到外掛註冊表中
8. 將註冊表公開給指令/執行時介面

<Note>`activate` 是 `register` 的舊版別名 — 載入器會解析存在的項目 (`def.register ?? def.activate`) 並在同一點呼叫它。所有套件外掛都使用 `register`；對於新外掛，建議使用 `register`。</Note>

安全檢查門檻發生在執行時執行**之前**。當進入點超出外掛根目錄、路徑可供任何人寫入，或對於非套件外掛路徑所有權看起來可疑時，候選項會被封鎖。

### 以清單為主的行為

清單是控制層的事實來源。OpenClaw 使用它來：

- 識別外掛
- 探索已宣告的通道/技能/設定架構或套件功能
- 驗證 `plugins.entries.<id>.config`
- 增強控制 UI 標籤/預留位置
- 顯示安裝/目錄元資料
- 保留低成本的啟動和設定描述符，而無需載入外掛執行時

對於原生外掛，執行時模組是資料平面的一部分。它會註冊實際的行為，例如 hooks、tools、commands 或 provider flows。

選用的 manifest `activation` 和 `setup` 區塊保留在控制平面上。它們僅包含用於啟動規劃和設定探索的中繼資料描述符；它們不會取代執行時註冊、`register(...)` 或 `setupEntry`。首批即時啟動消費者現在會使用 manifest command、channel 和 provider 提示，在更廣泛的 registry 具體化之前縮小外掛載入範圍：

- CLI 載入縮小範圍至擁有所請求主要指令的外掛
- channel 設定/外掛解析縮小範圍至擁有所請求 channel id 的外掛
- 明確的 provider 設定/執行時解析縮小範圍至擁有所請求 provider id 的外掛

啟動規劃器同時為現有呼叫者公開僅包含 ID 的 API，以及為新診斷功能公開計劃 API。計劃條目會報告選擇外掛的原因，將明確的 `activation.*` 規劃器提示與 manifest 所有权後援（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks）分開。該原因區分是相容性邊界：現有的外掛中繼資料繼續運作，而新程式碼可以在不改變執行時載入語意的情況下，偵測廣泛提示或後援行為。

設定探索現在優先使用描述符擁有的 ID，例如 `setup.providers` 和
`setup.cliBackends`，以便在回退到 `setup-api` 為仍需要設定時期執行時鉤子的
外掛程式之前縮小候選外掛程式的範圍。提供者設定清單使用清單 `providerAuthChoices`、衍生自描述符的設定選擇和安裝目錄元數據，而不載入提供者執行時。明確的
`setup.requiresRuntime: false` 是僅限描述符的切斷點；省略
`requiresRuntime` 則為了相容性保留傳統的 setup-api 回退。如果多個
發現的外掛程式聲稱擁有相同的正規化設定提供者或 CLI 後端 ID，設定查詢會拒絕
模稜兩可的擁有者，而不是依賴探索順序。當設定執行時執行時，登錄診斷會
回報 `setup.providers` / `setup.cliBackends` 與由 setup-api 註冊的提供者或 CLI
後端之間的差異，而不會封鎖傳統外掛程式。

### 載入器快取的內容

OpenClaw 會保留簡短的進程內快取，用於：

- 探索結果
- 清單登錄資料
- 已載入的外掛程式登錄

這些快取減少了突發的啟動和重複命令的負擔。將它們視為短期效能快取而非持久化
儲存是安全的。

Gateway 啟動熱路徑應優先使用目前的 `PluginMetadataSnapshot`、
衍生的 `PluginLookUpTable`，或透過呼叫鏈傳遞的明確清單登錄。組態驗證、啟動時自動啟用
和外掛程式啟動程序會在可用時使用相同的快照。對於仍從持久化的已安裝外掛程式索引重建
清單元數據的呼叫者，OpenClaw 還保留一個小的有界回退快取，以已安裝索引、請求形狀、
組態原則、執行時根目錄以及清單/套件檔案簽章為鍵值。該快取僅針對
重複的已安裝索引重建提供回退；它不是可變的執行時
外掛程式登錄。

效能備註：

- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 設定 `OPENCLAW_DISABLE_INSTALLED_PLUGIN_MANIFEST_REGISTRY_CACHE=1` 以僅停用
  已安裝索引清單登錄的回退快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 調整快取視窗。

## Registry model

已載入的外掛不會直接變更隨機的核心全域變數。它們會註冊到一個
中央外掛註冊表。

註冊表追蹤：

- 外掛記錄 (身分、來源、來處、狀態、診斷資訊)
- 工具
- 舊版鉤子 和型別化鉤子
- 通道
- 提供者
- 閘道 RPC 處理程式
- HTTP 路由
- CLI 註冊程式
- 背景服務
- 外掛擁有的指令

核心功能接著會從該註冊表讀取，而不是直接與外掛模組
交談。這保持了載入的單向性：

- 外掛模組 -> 註冊表註冊
- 核心執行時 -> 註冊表消耗

這種區分對於可維護性很重要。這意味著大多數核心介面只需要
一個整合點：「讀取註冊表」，而不是「對每個外掛模組
進行特殊處理」。

## 對話綁定回呼

綁定了對話的外掛可以在批准解決時做出反應。

使用 `api.onConversationBindingResolved(...)` 在綁定請求被批准或拒絕後
接收回呼：

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

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准請求的解析綁定
- `request`：原始請求摘要、分離提示、發送者 ID 和
  對話中繼資料

此回呼僅供通知。它不會改變允許誰綁定
對話，並且在核心批准處理完成後執行。

## Provider runtime hooks

提供者外掛有三個層級：

- **Manifest metadata** 用於廉價的執行前查詢：
  `setup.providers[].envVars`、已棄用的相容性 `providerAuthEnvVars`、
  `providerAuthAliases`、`providerAuthChoices` 和 `channelEnvVars`。
- **Config-time hooks**：`catalog` (舊版 `discovery`) 加上
  `applyConfigDefaults`。
- **Runtime hooks**：40 多個可選鉤子，涵蓋驗證、模型解析、
  串流包裝、思考層級、重播策略和使用端點。請參閱
  [Hook order and usage](#hook-order-and-usage) 下的完整列表。

OpenClaw 仍然擁有通用代理循環、故障轉移、轉錄處理和工具策略。這些掛鉤是供應商特定行為的擴展介面，而無需完整的自訂推斷傳輸。

當供應商具有通用驗證/狀態/模型選擇器路徑應該看到的基於環境變數的憑證，而無需加載插件運行時時，請使用清單 `setup.providers[].envVars`。已棄用的 `providerAuthEnvVars` 在棄用期內仍會被相容性適配器讀取，並且使用它的非捆綁插件會收到清單診斷。當一個供應商 ID 應該重用另一個供應商 ID 的環境變數、驗證配置檔案、支援配置的驗證和 API 金鑰入門選擇時，請使用清單 `providerAuthAliases`。當入門/驗證選擇 CLI 介面應該知道供應商的選擇 ID、群組標籤和簡單的單標誌驗證接線，而無需加載供應商運行時時，請使用清單 `providerAuthChoices`。保留供應商運行時 `envVars` 用於操作員相關的提示，例如入門標籤或 OAuth 客戶端 ID/客戶端密鑰設定變數。

當通道具有通用 shell-env 後備、配置/狀態檢查或設定提示應該看到的基於環境驅動的驗證或設定，而無需加載通道運行時時，請使用清單 `channelEnvVars`。

### 掛鉤順序和使用

對於模型/供應商插件，OpenClaw 大致按此順序調用掛鉤。「使用時機」欄是快速決策指南。

| #   | 掛鉤                              | 作用                                                                                              | 使用時機                                                                                                     |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `catalog`                         | 在 `models.json` 生成期間將供應商配置發布到 `models.providers`                                    | 供應商擁有目錄或基本 URL 預設值                                                                              |
| 2   | `applyConfigDefaults`             | 在配置具體化期間應用供應商擁有的全域配置預設值                                                    | 預設值取決於驗證模式、環境或供應商模型家族語義                                                               |
| --  | _(內建模型查找)_                  | OpenClaw 首先嘗試正常的註冊表/目錄路徑                                                            | _(非插件掛鉤)_                                                                                               |
| 3   | `normalizeModelId`                | 在查找之前正規化舊版或預覽模型 ID 別名                                                            | 供應商在規範模型解析之前擁有別名清理                                                                         |
| 4   | `normalizeTransport`              | 在通用模型組裝之前正規化 provider-family `api` / `baseUrl`                                        | Provider 擁有同一傳輸系列中自訂 provider ID 的傳輸清理權                                                     |
| 5   | `normalizeConfig`                 | 在執行時期/provider 解析之前正規化 `models.providers.<id>`                                        | Provider 需要應與插件共存的設定清理；隨附的 Google 系列輔助程式也支援支援的 Google 設定項目                  |
| 6   | `applyNativeStreamingUsageCompat` | 對設定提供者套用原生串流使用相容性重寫                                                            | Provider 需要端點驅動的原生串流使用中繼資料修復                                                              |
| 7   | `resolveConfigApiKey`             | 在執行時期認證載入之前，解析設定提供者的 env-marker 認證                                          | Provider 具有 provider 擁有的 env-marker API 金鑰解析；`amazon-bedrock` 在此也有內建的 AWS env-marker 解析器 |
| 8   | `resolveSyntheticAuth`            | 公開本機/自託管或設定支援的認證，而不儲存純文字                                                   | Provider 可以使用合成/本機憑證標記運作                                                                       |
| 9   | `resolveExternalAuthProfiles`     | 覆蓋 provider 擁有的外部認證設定檔；針對 CLI/app 擁有的憑證，預設 `persistence` 為 `runtime-only` | Provider 重複使用外部認證憑證，而不儲存複製的更新權杖；在清單中宣告 `contracts.externalAuthProviders`        |
| 10  | `shouldDeferSyntheticProfileAuth` | 將儲存的合成設定檔佔位符置於 env/config 支援的認證之後                                            | Provider 儲存不應取得優先權的合成佔位符設定檔                                                                |
| 11  | `resolveDynamicModel`             | 針對尚未在本機註冊表中的 provider 擁有模型 ID，進行同步回退                                       | Provider 接受任意上游模型 ID                                                                                 |
| 12  | `prepareDynamicModel`             | 非同步預熱，然後 `resolveDynamicModel` 再次執行                                                   | Provider 需要解析未知 ID 之前的網路中繼資料                                                                  |
| 13  | `normalizeResolvedModel`          | 在嵌入式執行器使用解析的模型之前進行最終重寫                                                      | Provider 需要傳輸重寫，但仍使用核心傳輸                                                                      |
| 14  | `contributeResolvedModelCompat`   | 為位於另一個相容傳輸後面的供應商模型提供相容性旗標                                                | 供應商在代理傳輸上識別自己的模型，而不接管供應商                                                             |
| 15  | `capabilities`                    | 由共享核心邏輯使用的供應商擁有的對話/工具元數據                                                   | 供應商需要對話/供應商系列的怪癖處理                                                                          |
| 16  | `normalizeToolSchemas`            | 在嵌入式運行器看到工具架構之前對其進行標準化                                                      | 供應商需要傳輸系列的架構清理                                                                                 |
| 17  | `inspectToolSchemas`              | 在標準化後顯示供應商擁有的架構診斷                                                                | 供應商需要關鍵字警告，而不必教導核心特定於供應商的規則                                                       |
| 18  | `resolveReasoningOutputMode`      | 選擇原生與標記的推理輸出契約                                                                      | 供應商需要標記的推理/最終輸出，而不是原生欄位                                                                |
| 19  | `prepareExtraParams`              | 在通用流選項包裝器之前的請求參數標準化                                                            | 供應商需要預設請求參數或每個供應商的參數清理                                                                 |
| 20  | `createStreamFn`                  | 用自定義傳輸完全替換正常的流路徑                                                                  | 供應商需要自定義線路協議，而不僅僅是一個包裝器                                                               |
| 21  | `wrapStreamFn`                    | 在應用通用包裝器之後的流包裝器                                                                    | 供應商需要請求標頭/正文/模型相容性包裝器，而不需要自定義傳輸                                                 |
| 22  | `resolveTransportTurnState`       | 附加原生每輪次傳輸標頭或元數據                                                                    | 供應商希望通用傳輸發送供應商原生的輪次身分識別                                                               |
| 23  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 標頭或會話冷卻策略                                                             | 供應商希望通用 WS 傳輸調整會話標頭或後備策略                                                                 |
| 24  | `formatApiKey`                    | Auth-profile 格式化器：存儲的 profile 成為運行時 `apiKey` 字串                                    | 供應商存儲額外的認證元數據，並需要自定義運行時令牌形狀                                                       |
| 25  | `refreshOAuth`                    | OAuth 刷新覆蓋，用於自定義刷新端點或刷新失敗策略                                                  | 供應商不適合共享的 `pi-ai` 刷新器                                                                            |
| 26  | `buildAuthDoctorHint`             | OAuth 刷新失敗時附加的修復提示                                                                    | 供應商在刷新失敗後需要供應商擁有的認證修復指導                                                               |
| 27  | `matchesContextOverflowError`     | 供應商擁有的上下文視窗溢出匹配器                                                                  | Provider 具有通用啟發式方法會錯過的原始溢位錯誤                                                              |
| 28  | `classifyFailoverReason`          | Provider 擁有的故障轉移原因分類                                                                   | Provider 可以將原始 API/傳輸錯誤對應到 rate-limit/overload/etc                                               |
| 29  | `isCacheTtlEligible`              | Proxy/backhaul provider 的 Prompt 快取政策                                                        | Provider 需要 proxy 特定的快取 TTL 閘控                                                                      |
| 30  | `buildMissingAuthMessage`         | 通用遺失認證恢復訊息的替換方案                                                                    | Provider 需要 provider 特定的遺失認證恢復提示                                                                |
| 31  | `suppressBuiltInModel`            | 過時的上游模型抑制以及可選的使用者錯誤提示                                                        | Provider 需要隱藏過時的上游列或將其替換為廠商提示                                                            |
| 32  | `augmentModelCatalog`             | 在探索後附加的合成/最終目錄列                                                                     | Provider 需要在 `models list` 和選擇器中包含合成向前相容列                                                   |
| 33  | `resolveThinkingProfile`          | 模型特定的 `/think` 層級設定、顯示標籤和預設值                                                    | Provider 為選定的模型公開自訂的思維層級或二元標籤                                                            |
| 34  | `isBinaryThinking`                | On/off 推理切換相容性掛鉤                                                                         | Provider 僅公開二元思維 on/off                                                                               |
| 35  | `supportsXHighThinking`           | `xhigh` 推理支援相容性掛鉤                                                                        | Provider 只希望在部分模型上啟用 `xhigh`                                                                      |
| 36  | `resolveDefaultThinkingLevel`     | 預設 `/think` 層級相容性掛鉤                                                                      | Provider 擁有模型系列的預設 `/think` 政策                                                                    |
| 37  | `isModernModelRef`                | 用於即時設定檔篩選器和 smoke 選擇的現代模型比對器                                                 | Provider 擁有 live/smoke 首選模型比對                                                                        |
| 38  | `prepareRuntimeAuth`              | 在推論之前將設定的認證交換為實際的執行時期 token/金鑰                                             | Provider 需要 token 交換或短期請求認證                                                                       |
| 39  | `resolveUsageAuth`                | 解析 `/usage` 和相關狀態介面的使用量/計費認證                                                     | Provider 需要自訂的使用量/配額 token 解析或不同的使用量認證                                                  |
| 40  | `fetchUsageSnapshot`              | 在解析身份驗證後，獲取並標準化供應商特定的使用量/配額快照                                         | 供應商需要一個供應商特定的使用量端點或負載解析器                                                             |
| 41  | `createEmbeddingProvider`         | 為記憶體/搜尋建構一個供應商擁有的嵌入適配器                                                       | 記憶體嵌入行為屬於供應商外掛                                                                                 |
| 42  | `buildReplayPolicy`               | 返回一個控制供應商轉錄處理的重播策略                                                              | 供應商需要自訂轉錄策略（例如，思考區塊剝離）                                                                 |
| 43  | `sanitizeReplayHistory`           | 在通用轉錄清理後重寫重播歷史                                                                      | 供應商需要超出共享壓縮輔助函式的供應商特定重播重寫                                                           |
| 44  | `validateReplayTurns`             | 在內嵌執行器之前的最終重播輪次驗證或重構                                                          | 供應商傳輸在通用清理後需要更嚴格的輪次驗證                                                                   |
| 45  | `onModelSelected`                 | 執行供應商擁有的選取後副作用                                                                      | 當模型變為活動狀態時，供應商需要遙測或供應商擁有的狀態                                                       |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 首先檢查匹配的供應商外掛，然後回退到其他具有掛鉤功能的供應商外掛，直到其中一個實際更改了模型 ID 或傳輸/配置。這使得別名/相容性供應商填充層能夠正常運作，而無需呼叫者知道哪個內綑外掛擁有該重寫。如果沒有供應商掛鉤重寫支援的 Google 系列配置項目，內綑的 Google 配置標準化器仍然會應用該相容性清理。

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

內綑的供應商外掛結合了上述掛鉤，以滿足每個供應商的目錄、身份驗證、思考、重播和使用量需求。權威的掛鉤集合位於每個外掛下的 `extensions/`；本頁面說明了形狀，而非鏡像該列表。

<AccordionGroup>
  <Accordion title="直通目錄提供者">OpenRouter、Kilocode、Z.AI 和 xAI 註冊 `catalog` 加上 `resolveDynamicModel` / `prepareDynamicModel`，以便它們能在 OpenClaw 的靜態目錄之前顯示上游模型 ID。</Accordion>
  <Accordion title="OAuth 和使用端點提供者">GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、Xiaomi 和 z.ai 將 `prepareRuntimeAuth` 或 `formatApiKey` 與 `resolveUsageAuth` + `fetchUsageSnapshot` 配對，以擁有權杖交換和 `/usage` 整合功能。</Accordion>
  <Accordion title="重播和文字記錄清理系列">共用的命名系列 (`google-gemini`、`passthrough-gemini`、 `anthropic-by-model`、`hybrid-anthropic-openai`) 讓提供者可以透過 `buildReplayPolicy` 選用文字記錄策略，而無需每個外掛程式各自重新實作清理功能。</Accordion>
  <Accordion title="僅目錄提供者">`byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、 `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine` 僅註冊 `catalog` 並使用共享的推論迴圈。</Accordion>
  <Accordion title="Anthropic-specific stream helpers">Beta 標頭、`/fast` / `serviceTier` 以及 `context1m` 位於 Anthropic 外掛程式的公用 `api.ts` / `contract-api.ts` 縫隙 (`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、 `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`) 內，而非位於 通用 SDK 中。</Accordion>
</AccordionGroup>

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

- `textToSpeech` 會傳回檔案/語音備忘錄介面的標準核心 TTS 輸出酬載。
- 使用核心 `messages.tts` 組態與提供者選取。
- 傳回 PCM 音訊緩衝區 + 採樣率。外掛程式必須為提供者重新取樣/編碼。
- `listVoices` 對於每個提供者而言是選用的。將其用於廠商擁有的語音選擇器或設定流程。
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
  - feature/channel 外掛程式使用 `api.runtime.videoGeneration.*`

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

- `api.runtime.mediaUnderstanding.*` 是圖片/音訊/影片理解的首選共享介面。
- 使用核心媒體理解音訊組態 (`tools.media.audio`) 和提供者後援順序。
- 當未產生轉錄輸出時 (例如跳過/不支援的輸入)，會傳回 `{ text: undefined }`。
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

注意事項：

- `provider` 和 `model` 是每次執行的選用覆寫，而非持續性的工作階段變更。
- OpenClaw 僅針對受信任的呼叫者遵守那些覆寫欄位。
- 對於外掛程式擁有的後援執行，操作員必須使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 將受信任的外掛程式限制為特定的標準 `provider/model` 目標，或使用 `"*"` 明確允許任何目標。
- 不受信任的外掛程式子代理程式執行仍然有效，但覆寫請求會被拒絕，而不是靜默後援。
- 外掛程式建立的子代理程式工作階段會標記建立的外掛程式 ID。後援 `api.runtime.subagent.deleteSession(...)` 只能刪除那些擁有的工作階段；任意刪除工作階段仍需要具有管理員範圍的 Gateway 要求。

對於網路搜尋，外掛程式可以使用共享執行時期輔助函式，而不是深入探討代理程式工具接線：

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

注意事項：

- 將提供者選擇、認證解析和共享請求語意保留在核心中。
- 使用網路搜尋提供者進行供應商特定的搜尋傳輸。
- `api.runtime.webSearch.*` 是需要搜尋行為但不依賴代理程式工具包裝函式的 feature/channel 外掛程式的首選共享介面。

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

- `generate(...)`：使用設定的圖片生成提供者鏈結產生圖片。
- `listProviders(...)`: 列出可用的圖像生成提供者及其功能。

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

- `path`: Gateway HTTP 伺服器下的路由路徑。
- `auth`: 必填。使用 `"gateway"` 要求正常的 Gateway 驗證，或使用 `"plugin"` 進行外掛管理的驗證/webhook 驗證。
- `match`: 選填。`"exact"` (預設) 或 `"prefix"`。
- `replaceExisting`: 選填。允許同一個插件替換其現有的路由註冊。
- `handler`: 當路由處理請求時傳回 `true`。

備註：

- `api.registerHttpHandler(...)` 已被移除，將會導致插件載入錯誤。請改用 `api.registerHttpRoute(...)`。
- 插件路由必須明確宣告 `auth`。
- 完全相同的 `path + match` 衝突會被拒絕，除非設定了 `replaceExisting: true`，且一個插件無法替換另一個插件的路由。
- 具有不同 `auth` 層級的重疊路由會被拒絕。請將 `exact`/`prefix` 貫穿鏈保持在相同的驗證層級上。
- `auth: "plugin"` 路由**不會**自動接收操作員運行時作用域。它們用於插件管理的 webhook/簽名驗證，而非具有特權的 Gateway 輔助呼叫。
- `auth: "gateway"` 路由在 Gateway 請求運行時作用域內運行，但該作用域是有意保守的：
  - 共享密碼 bearer 驗證 (`gateway.auth.mode = "token"` / `"password"`) 會將插件路由運行時作用域固定為 `operator.write`，即使呼叫者發送了 `x-openclaw-scopes`
  - 受信任的承載身分的 HTTP 模式 (例如私有入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`) 僅在標頭明確存在時才會遵守 `x-openclaw-scopes`
  - 如果這些帶有身分識別的外掛程式路由請求中缺少 `x-openclaw-scopes`，執行時範圍會回退到 `operator.write`
- 實用規則：不要假設 gateway-auth 外掛程式路由是隱含的管理介面。如果您的路由需要僅限管理的行為，請要求帶有身分識別的驗證模式，並記錄明確的 `x-openclaw-scopes` 標頭合約。

## Plugin SDK 匯入路徑

在撰寫新外掛程式時，請使用狹窄的 SDK 子路徑，而不是整體的 `openclaw/plugin-sdk` 根目錄桶檔案。核心子路徑：

| 子路徑                              | 用途                                               |
| ----------------------------------- | -------------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 外掛程式註冊原語                                   |
| `openclaw/plugin-sdk/channel-core`  | 通道進入點/建置輔助程式                            |
| `openclaw/plugin-sdk/core`          | 通用共享輔助程式和整合合約                         |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod 結構描述 (`OpenClawSchema`) |

通道外掛程式從一系列狹窄的接縫中進行選擇 — `channel-setup`、
`setup-runtime`、`setup-adapter-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-lifecycle`、
`channel-reply-pipeline`、`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。核准行為應合併到單一 `approvalCapability` 合約上，而不是在不相關的外掛程式欄位之間混合。請參閱[通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)。

執行時和設定輔助程式位於匹配的 `*-runtime` 子路徑下
(`approval-runtime`、`config-runtime`、`infra-runtime`、`agent-runtime`、
`lazy-runtime`、`directory-runtime`、`text-runtime`、`runtime-store` 等)。

<Info>`openclaw/plugin-sdk/channel-runtime` 已棄用 —— 這是為了相容舊版外掛而存在的 shim 層。新程式碼應改用範圍更狹窄的通用基礎元件。</Info>

Repo 內部進入點（針對每個打包的外掛套件根目錄）：

- `index.js` —— 打包外掛進入點
- `api.js` —— 輔助程式/類型統匯 (barrel)
- `runtime-api.js` —— 僅執行期統匯
- `setup-entry.js` —— 設定外掛進入點

外部外掛應僅匯入 `openclaw/plugin-sdk/*` 的子路徑。切勿從核心或另一個外掛匯入其他外掛套件的 `src/*`。外掛層載入的進入點優先使用現有的執行期設定快照，然後再回退到磁碟上解析出的設定檔。

特定功能的子路徑，例如 `image-generation`、`media-understanding` 和 `speech`，是因為目前的打包外掛使用它們而存在的。它們並非自動凍結的長期外部合約 —— 依賴它們時請查閱相關的 SDK 參考頁面。

## 訊息工具架構

外掛應擁有針對特定管道的 `describeMessageTool(...)` 架構貢獻，適用於非訊息原語，例如反應、已讀和投票。共用傳送呈現應使用通用 `MessagePresentation` 合約，而非供應商原生按鈕、元件、區塊或卡片欄位。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation) 以了解合約、回退規則、供應商對應以及外掛作者檢查清單。

具備傳送功能的外掛會透過訊息功能宣告其可呈現的內容：

- `presentation` 用於語意呈現區塊 (`text`、`context`、`divider`、`buttons`、`select`)
- `delivery-pin` 用於固定傳送請求

核心會決定是以原生方式呈現呈現內容還是將其降級為文字。請勿從通用訊息工具暴露供應商原生 UI 逃逸方法。針對舊版原生架構的已棄用 SDK 輔助程式仍會匯出，以供現有的第三方外掛使用，但新外掛不應使用它們。

## 頻道目標解析

頻道外掛應擁有特定於頻道的目標語意。保持共享的
輸出主機通用，並使用訊息配接器介面作為提供者規則：

- `messaging.inferTargetChatType({ to })` 決定正規化後的目標
  在目錄查詢前應被視為 `direct`、`group` 還是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告訴核心輸入
  是否應跳過直接進行類似 ID 的解析，而不是目錄搜尋。
- `messaging.targetResolver.resolveTarget(...)` 是外掛的後備方案，當
  核心在正規化後或目錄未命中後需要最終的提供者擁有之解析時。
- `messaging.resolveOutboundSessionRoute(...)` 擁有提供者特定的工作階段
  路由建構，一旦目標被解析。

建議的分割方式：

- 使用 `inferTargetChatType` 進行在搜尋對等/群組之前
  應發生的類別決策。
- 使用 `looksLikeId` 進行「將此視為明確/原生目標 ID」的檢查。
- 使用 `resolveTarget` 進行提供者特定的正規化後備，而不是用於
  廣泛的目錄搜尋。
- 將提供者原生 ID（如聊天 ID、執行緒 ID、JID、代碼和房間
  ID）保留在 `target` 值或提供者特定參數中，而不是在通用 SDK
  欄位中。

## 設定支援的目錄

從設定衍生目錄條目的外掛應將該邏輯保留在外掛內，並重用來自
`openclaw/plugin-sdk/directory-runtime` 的共享輔助程式。

當頻道需要設定支援的對等/群組時使用此功能，例如：

- 允許清單驅動的 DM 對等
- 已設定的頻道/群組對應
- 帳號範圍的靜態目錄後備

`directory-runtime` 中的共享輔助程式僅處理通用操作：

- 查詢篩選
- 限制套用
- 重複資料刪除/正規化輔助程式
- 建構 `ChannelDirectoryEntry[]`

特定於頻道的帳號檢查和 ID 正規化應保留在外掛實作中。

## 提供者目錄

提供者外掛可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定義推斷的模型目錄。

`catalog.run(...)` 返回與 OpenClaw 寫入
`models.providers` 相同的形狀：

- `{ provider }` 用於單一提供者條目
- `{ providers }` 用於多個提供者條目

當外掛擁有提供者特定的模型 ID、預設基礎 URL 或需要認證的模型元數據時，請使用 `catalog`。

`catalog.order` 控制外掛的目錄相對於 OpenClaw 內建隱式提供者的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當認證設定檔存在時出現的提供者
- `paired`：綜合多個相關提供者條目的提供者
- `late`：最後一輪，在其他隱式提供者之後

後續的提供者在鍵值衝突中勝出，因此外掛可以故意用相同的提供者 ID 覆蓋內建的提供者條目。

相容性：

- `discovery` 仍可作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

## 唯讀通道檢查

如果您的外掛註冊了通道，建議同時實作 `plugin.config.inspectAccount(cfg, accountId)` 和 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它可以假設憑證已完全具體化，並且在缺少必要的機密時能快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修復流程等唯讀指令路徑，不應僅為了描述設定就需要具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅回傳描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要僅為了報告唯讀可用性而返回原始令牌值。返回 `tokenStatus: "available"`（以及匹配的 source
  欄位）對於狀態類型的命令來說就足夠了。
- 當憑證是透過 SecretRef 配置但在當前指令路徑中不可用時，請使用 `configured_unavailable`。

這允許唯讀指令報告「已配置但在當前指令路徑中不可用」，而不是崩潰或錯誤地將帳戶報告為未配置。

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

每個條目都會成為一個外掛程式。如果套件包列出了多個擴充功能，外掛程式 ID
會變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依項，請將其安裝在該目錄中，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防護：解析符號連結後，每個 `openclaw.extensions` 條目必須保留在外掛程式
目錄內。逃離套件目錄的條目
將被拒絕。

安全注意事項：`openclaw plugins install` 使用專案本地的 `npm install --omit=dev --ignore-scripts` 安裝外掛程式相依項
（無生命週期腳本，執行時期無 dev 相依項），忽略繼承的全域 npm 安裝設定。
請保持外掛程式相依項樹為「純 JS/TS」，並避免需要
`postinstall` 建置的套件。

選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。
當 OpenClaw 需要已停用通道外掛程式的設定介面，或
當通道外掛程式已啟用但尚未配置時，它會載入 `setupEntry`
而不是完整的外掛程式入口。當您的主要外掛程式入口也連接了工具、掛鉤或其他僅執行時期的
程式碼時，這可以使啟動和設定更輕量。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以讓通道外掛程式在閘道的預先監聽啟動階段
選擇加入相同的 `setupEntry` 路徑，即使該通道已經配置。

僅當 `setupEntry` 完全涵蓋了在 Gateway 開始監聽之前必須存在的啟動表面時，才使用此選項。實際上，這意味著設定條目必須註冊啟動所依賴的每個通道擁有的功能，例如：

- 通道註冊本身
- 任何必須在 Gateway 開始監聽之前可用的 HTTP 路由
- 任何必須在同一視窗期間存在的 Gateway 方法、工具或服務

如果您的完整條目仍然擁有任何必需的啟動功能，請勿啟用此標誌。保持插件處於預設行為，並讓 OpenClaw 在啟動期間加載完整條目。

捆綁的通道還可以發布僅設定的合約表面輔助程序，核心可以在加載完整通道運行時之前查詢這些輔助程序。當前的設定提升表面包括：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

當核心需要將舊版單一帳戶通道配置提升為 `channels.<id>.accounts.*` 而不加載完整插件條目時，會使用該表面。Matrix 是當前的捆綁範例：當已存在命名帳戶時，它僅將身份驗證/引導鍵移動到命名的提升帳戶中，並且它可以保留配置的非正規預設帳戶鍵，而不是總是建立 `accounts.default`。

這些設定修補適配器使捆綁的合約表面發現保持延遲。匯入時間保持輕量；提升表面僅在首次使用時加載，而不是在模組匯入時重新進入捆綁通道啟動。

當這些啟動表面包含 Gateway RPC 方法時，請將它們保留在插件特定的前綴上。核心管理命名空間 (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) 保留給核心，並且即使插件請求較窄的範圍，也始終解析為 `operator.admin`。

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

通道插件可以透過 `openclaw.channel` 宣傳設定/發現元資料，並透過 `openclaw.install` 提供安裝提示。這使核心目錄保持無數據狀態。

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

除了最小範例外，有用的 `openclaw.channel` 欄位包括：

- `detailLabel`：更豐富的目錄/狀態表面的次要標籤
- `docsLabel`：覆蓋文件連結的連結文字
- `preferOver`：此目錄條目應排名較低的優先級外掛程式/通道 ID
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：選擇表面複製控制項
- `markdownCapable`：將通道標記為支援 Markdown，以便進行輸出格式決策
- `exposure.configured`：當設定為 `false` 時，在已設定通道列表表面中隱藏該通道
- `exposure.setup`：當設定為 `false` 時，在互動式設定/設定選擇器中隱藏該通道
- `exposure.docs`：將通道標記為內部/私有，用於文件導航表面
- `showConfigured` / `showInSetup`：為相容性仍接受的舊版別名；建議使用 `exposure`
- `quickstartAllowFrom`：選擇加入標準快速入門 `allowFrom` 流程
- `forceAccountBinding`：即使僅存在一個帳戶，也要求明確的帳戶綁定
- `preferSessionLookupForAnnounceTarget`：在解析公告目標時優先使用會話查詢

OpenClaw 也可以合併**外部通道目錄**（例如，MPM 註冊表匯出）。將 JSON 檔案放置於以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一個或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作為 `"entries"` 鍵的舊版別名。

產生的通道目錄項目和提供者安裝目錄項目會在原始 `openclaw.install` 區塊旁公開標準化的安裝來源事實。標準化事實會識別 npm 規格是精確版本還是浮動選擇器、是否存在預期的完整性中繼資料，以及是否有本機來源路徑可用。當目錄/套件身分識別已知時，如果解析出的 npm 套件名稱偏離該身分識別，標準化事實會發出警告。當 `defaultChoice` 無效或指向不可用的來源，以及存在 npm 完整性中繼資料卻沒有有效的 npm 來源時，它們也會發出警告。消費者應將 `installSource` 視為一個附加的可選欄位，以便手動建置的項目和目錄填充層不必合成它。這使得上架和診斷可以在不匯入外掛執行時期的情況下解釋來源平面狀態。

官方的外部 npm 項目應優先使用精確的 `npmSpec` 加上 `expectedIntegrity`。為了相容性，裸露的套件名稱和發行版本標籤仍然有效，但它們會顯示來源平面警告，以便目錄可以在不破壞現有外掛的情況下轉向釘選且經過完整性檢查的安裝。當從本機目錄路徑上架安裝時，它會記錄一個包含 `source: "path"` 的受管理外掛索引項目，並在可能的情況下記錄工作區相對 `sourcePath`。絕對的作業負載路徑保留在 `plugins.load.paths` 中；安裝記錄可避免將本機工作站路徑複製到長期存留的設定中。這使得本機開發安裝對來源平面診斷可見，而無需增加第二個原始檔案系統路徑暴露面。持久的 `plugins/installs.json` 外掛索引是安裝的來源事實，可以在不載入外掛執行時期模組的情況下重新整理。即使外掛資訊清單遺失或無效，其 `installRecords` 對照仍然是持久的；其 `plugins` 陣列則是可重建的資訊清單/快取檢視。

## Context engine plugins

Context engine plugins 負責管理 session context 的協調，包括攝取、組裝和壓縮。請使用 `api.registerContextEngine(id, factory)` 從您的外掛註冊它們，然後使用 `plugins.slots.contextEngine` 選擇啟用的引擎。

當您的外掛需要取代或擴充預設的 context pipeline，而不僅僅是新增記憶體搜尋或 hooks 時，請使用此方法。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
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

如果您的引擎**不**擁有壓縮演算法，請保持 `compact()` 已實作並明確地委派它：

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

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

當外掛需要不符合目前 API 的行為時，不要使用私有的 reach-in 繞過外掛系統。請新增缺失的功能。

建議順序：

1. 定義核心合約
   決定核心應該擁有哪些共享行為：政策、後備、配置合併、生命週期、面向通道的語意，以及執行時期輔助工具的形狀。
2. 新增型別化外掛註冊/執行時期介面
   以最小的實用型別功能介面擴充 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 連接核心 + 通道/功能消費者
   通道和功能外掛應該透過核心來使用新功能，而不是直接匯入供應商實作。
4. 註冊供應商實作
   供應商外接著將其後端針對該功能進行註冊。
5. 新增合約覆蓋率
   新增測試，以便擁有權和註冊形狀隨著時間保持明確。

這就是 OpenClaw 在不變成針對單一供應商觀點硬編碼的情況下保持主觀的方式。請參閱 [Capability Cookbook](/zh-Hant/tools/capability-cookbook) 以取得具體的檔案檢查清單和實作範例。

### 功能檢查清單

當您新增新功能時，實作通常應該同時接觸這些介面：

- `src/<capability>/types.ts` 中的核心合約類型
- `src/<capability>/runtime.ts` 中的核心執行器/執行時期輔助工具
- `src/plugins/types.ts` 中的外掛 API 註冊介面
- `src/plugins/registry.ts` 中的外掛 registry 接線
- 當功能/通道外掛需要使用它時，在 `src/plugins/runtime/*` 中暴露外掛執行時期
- `src/test-utils/plugin-registration.ts` 中的擷取/測試輔助工具
- `src/plugins/contracts/registry.ts` 中的擁有權/合約斷言
- `docs/` 中的操作員/外掛文件

如果缺少其中任何一個介面，這通常表示該功能尚未完全整合。

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

這讓規則保持簡單：

- core 擁有功能合約 + 編排
- vendor 插件擁有供應商實作
- feature/channel 插件使用執行時期輔助程式
- 合約測試保持所有權明確

## 相關

- [Plugin architecture](/zh-Hant/plugins/architecture) — 公用功能模型和形狀
- [Plugin SDK subpaths](/zh-Hant/plugins/sdk-subpaths)
- [Plugin SDK setup](/zh-Hant/plugins/sdk-setup)
- [Building plugins](/zh-Hant/plugins/building-plugins)

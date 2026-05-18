---
summary: "Plugin compatibility contracts, deprecation metadata, and migration expectations"
title: "外掛程式相容性"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw 會在移除舊的外掛程式合約之前，透過具名的相容性轉接器保留這些連線。這保護了現有的內建和外部外掛程式，同時讓 SDK、manifest、設定檔、配置和代理程式執行階段合約得以演進。

## 相容性註冊表

外掛程式相容性合約追蹤於核心註冊表中的
`src/plugins/compat/registry.ts`。

每個紀錄包含：

- 一個穩定的相容性代碼
- status: `active`, `deprecated`, `removal-pending`, 或 `removed`
- 擁有者：SDK、config、setup、channel、provider、plugin execution、agent runtime
  或 core
- 適用時的引入和棄用日期
- 取代指引
- 涵蓋舊版和新版行為的文件、診斷和測試

註冊表是維護者規劃和未來外掛程式檢查器
檢查的來源。如果外掛程式面向的行為發生變更，請在新增轉接器的同一變更中新增或更新相容性
紀錄。

Doctor 修復與遷移相容性分別追蹤於
`src/commands/doctor/shared/deprecation-compat.ts`。這些記錄涵蓋了舊的
配置結構、安裝分佈局以及修復填充，這些可能需要在執行時相容性路徑移除後
保持可用。

發布掃描應檢查這兩個註冊表。不要僅因為相符的執行階段或配置相容性紀錄過期就刪除 doctor 遷移；
首先確認沒有仍需該修復的支援升級路徑。此外，在發布規劃期間重新驗證每個取代註釋，因為當提供者和通道移出
核心時，外掛程式擁有權和配置佔用情況可能會變更。

## 外掛程式檢查器套件

外掛程式檢查器應位於核心 OpenClaw repo 之外，作為一個獨立的
套件/存放庫，並以版本化的相容性和 manifest
合約為基礎。

第一天 CLI 應該是：

```sh
openclaw-plugin-inspector ./my-plugin
```

它應該輸出：

- manifest/schema 驗證
- 正在檢查的合約相容性版本
- 安裝/來源元資料檢查
- 冷路徑匯入檢查
- 棄用和相容性警告

在 CI 註解中，使用 `--json` 以取得穩定的機器可讀輸出。OpenClaw 核心
應公開檢查器可使用的合約與 fixture，但不應
從主要的 `openclaw` 套件發佈檢查器二進位檔。

### 維護者驗收通道

在針對 OpenClaw 外掛程式套件驗證外部檢查器時，請使用 Crabbox 支援的 Blacksmith Testbox 進行可安裝套件驗收通道。在套件建置完成後，請從乾淨的 OpenClaw 檢出版本執行：

```sh
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
```

將此通道設為維護者自願選用，因為它會安裝一個外部 npm
套件，並可能檢查在儲存庫外部複製的外掛程式套件。本機儲存庫
防護涵蓋了 SDK 導出對應、相容性註冊表元資料、已棄用
SDK 導出的遞減，以及捆綁擴充功能的導入邊界；Testbox 檢查器
驗證則涵蓋外部外掛程式作者所使用的套件。

## 棄用政策

OpenClaw 不應在引入取代方案的同一個版本中
移除已記載的外掛程式合約。

遷移順序如下：

1. 新增新合約。
2. 透過具名相容性轉接器保持舊行為的連線。
3. 當外掛程式作者可以採取行動時，發出診斷或警告。
4. 記載取代方案與時間表。
5. 測試舊路徑與新路徑。
6. 等待公告的遷移期結束。
7. 僅在獲得明確的重大版本發布批准後移除。

已棄用的記錄必須包含警告開始日期、替換方案、文件連結，以及在警告開始後不超過三個月的最終移除日期。除非維護者明確決定這是永久相容性並將其標記為 `active`，否則請不要新增具有無限期移除視窗的已棄用相容性路徑。

## 目前的相容性領域

目前的相容性記錄包括：

- 舊版廣泛的 SDK 匯入，例如 `openclaw/plugin-sdk/compat`
- 舊版僅包含掛鉤的插件形狀以及 `before_agent_start`
- 傳統 `api.on("deactivate", ...)` 清理掛鉤名稱，同時外掛程式遷移至
  `gateway_stop`
- 傳統 `activate(api)` 外掛程式進入點，同時外掛程式遷移至
  `register(api)`
- 傳統 SDK 別名，例如 `openclaw/extension-api`、
  `openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth`
  狀態建構器、`openclaw/plugin-sdk/test-utils`（已被專注的
  `openclaw/plugin-sdk/*` 測試子路徑取代），以及 `ClawdbotConfig` /
  `OpenClawSchemaType` 型別別名
- 隨附外掛程式允許清單與啟用行為
- 傳統提供者/通道環境變數清單元資料
- 傳統提供者外掛程式掛鉤與型別別名，同時提供者轉移至
  明確的目錄、驗證、思考、重放與傳輸掛鉤
- 傳統執行時別名，例如 `api.runtime.taskFlow`、
  `api.runtime.subagent.getSession`、`api.runtime.stt`，以及已棄用的
  `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- 傳統記憶體外掛程式分冊註冊，同時記憶體外掛程式轉移至
  `registerMemoryCapability`
- 傳統通道 SDK 輔助程式，用於原生訊息架構、提及閘道、
  進行信封格式設定與核准功能巢狀結構
- 傳統通道路由金鑰與可比較目標輔助程式別名，同時外掛程式
  轉移至 `openclaw/plugin-sdk/channel-route`
- 即將被清單貢獻擁有權取代的啟用提示
- `setup-api` 執行時後備機制，同時設定描述子轉移至冷
  `setup.requiresRuntime: false` 元資料
- 提供者 `discovery` 掛鉤，同時提供者目錄掛鉤轉移至
  `catalog.run(...)`
- 通道 `showConfigured` / `showInSetup` 元資料，同時通道套件轉移
  至 `openclaw.channel.exposure`
- 傳統執行時原則設定金鑰，同時 doctor 將操作員遷移至
  `agentRuntime`
- 產生的隨附通道設定元資料後備機制，同時以登錄優先的
  `channelConfigs` 元資料落地
- 持續性外掛程式登錄停用與安裝遷移環境旗標，同時
  修復流程將操作員遷移至 `openclaw plugins registry --refresh` 與
  `openclaw doctor --fix`
- 舊版外掛擁有的 web 搜尋、web 擷取和 x_search 設定路徑，
  同時 doctor 會將它們遷移至 `plugins.entries.<plugin>.config`
- 舊版 `plugins.installs` 撰寫的設定和套件外掛載入路徑
  別名，同時安裝中繼資料會移至狀態管理的外掛總帳

新外掛程式碼應優先採用註冊表中列出及特定遷移指南中提及的取代項目。現有外掛可繼續使用相容性路徑，直到文件、診斷和發行說明公告移除期限為止。

## 發行說明

發行說明應包含即將進行的外掛棄用事項，並註明目標日期和遷移文件連結。該警告必須在相容性路徑移至 `removal-pending` 或 `removed` 之前發出。

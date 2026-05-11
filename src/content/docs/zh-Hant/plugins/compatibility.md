---
summary: "外掛程式相容性合約、棄用元資料以及遷移預期"
title: "外掛程式相容性"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw 會在移除舊的外掛程式合約之前，透過具名的相容性轉接器保留這些連線。這保護了現有的內建和外部外掛程式，同時讓 SDK、manifest、設定檔、配置和代理程式執行階段合約得以演進。

## 相容性註冊表

外掛程式相容性合約追蹤於核心註冊表的
`src/plugins/compat/registry.ts`。

每個紀錄包含：

- 一個穩定的相容性代碼
- 狀態：`active`、`deprecated`、`removal-pending` 或 `removed`
- 擁有者：SDK、config、setup、channel、provider、plugin execution、agent runtime
  或 core
- 適用時的引入和棄用日期
- 取代指引
- 涵蓋舊版和新版行為的文件、診斷和測試

註冊表是維護者規劃和未來外掛程式檢查器
檢查的來源。如果外掛程式面向的行為發生變更，請在新增轉接器的同一變更中新增或更新相容性
紀錄。

Doctor 修復和遷移相容性是分別在
`src/commands/doctor/shared/deprecation-compat.ts` 追蹤的。這些紀錄涵蓋了舊的
配置形狀、安裝帳本佈局，以及可能需要在執行階段相容性路徑移除後
繼續可用的修復填充層。

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

使用 `--json` 以在 CI 註解中獲得穩定的機器可讀輸出。OpenClaw 核心應公開檢查器可使用的合約和裝置，但不應從主要的 `openclaw` 套件發布檢查器二進位檔。

## 棄用政策

OpenClaw 不應在引入替代方案的同一版本中移除已記載的外掛程式合約。

遷移順序如下：

1. 新增新合約。
2. 透過命名的相容性介面卡保留舊行為。
3. 當外掛程式作者可以採取行動時，發出診斷或警告。
4. 記錄替代方案和時間表。
5. 測試舊途徑和新途徑。
6. 等待公佈的遷移期結束。
7. 僅在經過明確的重大版本發布核准後才移除。

已棄用的記錄必須包含警告開始日期、替代方案、文件連結，以及在警告開始後不超過三個月的最終移除日期。除非維護者明確決定這是永久性相容性並將其標記為 `active`，否則不要新增具有開放式移除視窗的已棄用相容性路徑。

## 目前相容性領域

目前的相容性記錄包括：

- 傳統的廣泛 SDK 匯入，例如 `openclaw/plugin-sdk/compat`
- 傳統的僅掛鉤外掛程式形狀和 `before_agent_start`
- 在外掛程式遷移至 `register(api)` 時的傳統 `activate(api)` 外掛程式進入點
- 傳統 SDK 別名，例如 `openclaw/extension-api`、`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth` 狀態建構器、`openclaw/plugin-sdk/test-utils`，以及 `ClawdbotConfig` / `OpenClawSchemaType` 類型別名
- 隨附外掛程式允許清單和啟用行為
- 傳統的提供者/通道環境變數清單元資料
- 當提供者移至明確的目錄、驗證、思考、重播和傳輸掛鉤時，傳統的提供者外掛程式掛鉤和類型別名
- 傳統的執行時期別名，例如 `api.runtime.taskFlow`、`api.runtime.subagent.getSession`、`api.runtime.stt`，以及已棄用的 `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- 當記憶體外掛程式移至 `registerMemoryCapability` 時，傳統的記憶體外掛程式分割註冊
- 針對原生訊息架構的舊版通道 SDK 輔助程式、提及閘控、
  入站信封格式設定，以及核准功能巢狀結構
- 即將由清單貢獻所有權取代的啟用提示
- `setup-api` 執行時期回退，同時安裝描述符移至冷
  `setup.requiresRuntime: false` 中繼資料
- 提供者 `discovery` 掛鉤，同時提供者目錄掛鉤移至
  `catalog.run(...)`
- 通道 `showConfigured` / `showInSetup` 中繼資料，同時通道套件移至
  `openclaw.channel.exposure`
- 舊版 runtime-policy 組態金鑰，同時 doctor 將操作員遷移至
  `agentRuntime`
- 產生的配套通道組態中繼資料回退，同時以登錄為首的
  `channelConfigs` 中繼資料落地
- 保存的外掛程式登錄停用和安裝遷移環境旗標，同時
  修復流程將操作員遷移至 `openclaw plugins registry --refresh` 和
  `openclaw doctor --fix`
- 舊版外掛程式擁有的網頁搜尋、網頁擷取和 x_search 組態路徑，同時
  doctor 將其遷移至 `plugins.entries.<plugin>.config`
- 舊版 `plugins.installs` 撰寫的組態和配套外掛程式載入路徑
  別名，同時安裝中繼資料移至狀態管理的外掛程式帳本

新的外掛程式碼應優先採用登錄和特定遷移指南中列出的取代項目。現有的外掛程式可以繼續使用相容性路徑，
直到文件、診斷和發行說明公告移除時間窗為止。

## 發行說明

發行說明應包含目標日期和遷移文件連結的即將到來的外掛程式棄用項目。該警告需要
在相容性路徑移至 `removal-pending` 或 `removed` 之前發出。

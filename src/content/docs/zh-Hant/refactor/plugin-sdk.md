---
summary: "Plan: one clean plugin SDK + runtime for all messaging connectors"
read_when:
  - Defining or refactoring the plugin architecture
  - Migrating channel connectors to the plugin SDK/runtime
title: "Plugin SDK Refactor"
---

# Plugin SDK + Runtime 重構計劃

目標：每個訊息連接器都是使用一個穩定 API 的外掛（內建或外部）。
沒有外掛直接從 `src/**` 匯入。所有相依性都通過 SDK 或 runtime。

## 為什麼是現在

- 目前的連接器混合了多種模式：直接的核心匯入、僅 dist 的橋接器和自訂輔助函式。
- 這使得升級變得脆弱，並阻礙了乾淨的外部外掛介面。

## 目標架構（兩層）

### 1) Plugin SDK（編譯時期、穩定、可發佈）

範圍：型別、輔助函式和設定工具。無執行時期狀態，無副作用。

內容（範例）：

- 型別：`ChannelPlugin`、配接器、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 設定輔助函式：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配對輔助函式：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 設定入口點：主機擁有的 `setup` + `setupWizard`；避免廣泛的公開入門輔助函式。
- 工具參數輔助函式：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文件連結輔助函式：`formatDocsLink`。

交付：

- 發佈為 `openclaw/plugin-sdk`（或從 core 匯出於 `openclaw/plugin-sdk` 之下）。
- Semver 並伴隨明確的穩定性保證。

### 2) Plugin Runtime（執行介面、注入）

範圍：所有接觸核心執行行為的事物。
通過 `OpenClawPluginApi.runtime` 存取，以便外掛永不匯入 `src/**`。

提議的介面（最小但完整）：

```ts
export type PluginRuntime = {
  channel: {
    text: {
      chunkMarkdownText(text: string, limit: number): string[];
      resolveTextChunkLimit(cfg: OpenClawConfig, channel: string, accountId?: string): number;
      hasControlCommand(text: string, cfg: OpenClawConfig): boolean;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher(params: {
        ctx: unknown;
        cfg: unknown;
        dispatcherOptions: {
          deliver: (payload: { text?: string; mediaUrls?: string[]; mediaUrl?: string }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: { cfg: unknown; channel: string; accountId: string; peer: { kind: RoutePeerKind; id: string } }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: { channel: string; id: string; meta?: { name?: string } }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(buffer: Uint8Array, contentType: string | undefined, direction: "inbound" | "outbound", maxBytes: number): Promise<{ path: string; contentType?: string }>;
    };
    mentions: {
      buildMentionRegexes(cfg: OpenClawConfig, agentId?: string): RegExp[];
      matchesMentionPatterns(text: string, regexes: RegExp[]): boolean;
    };
    groups: {
      resolveGroupPolicy(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
      ): {
        allowlistEnabled: boolean;
        allowed: boolean;
        groupConfig?: unknown;
        defaultConfig?: unknown;
      };
      resolveRequireMention(cfg: OpenClawConfig, channel: string, accountId: string, groupId: string, override?: boolean): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: { debounceMs: number; buildKey: (v: T) => string | null; shouldDebounce: (v: T) => boolean; onFlush: (entries: T[]) => Promise<void>; onError?: (err: unknown) => void }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: { useAccessGroups: boolean; authorizers: Array<{ configured: boolean; allowed: boolean }> }): boolean;
    };
  };
  logging: {
    shouldLogVerbose(): boolean;
    getChildLogger(name: string): PluginLogger;
  };
  state: {
    resolveStateDir(cfg: OpenClawConfig): string;
  };
};
```

備註：

- Runtime 是存取核心行為的唯一途徑。
- SDK 被故意設計得很小且穩定。
- 每個 runtime 方法都映射到現有的核心實作（無重複）。

## 遷移計劃（分階段、安全）

### 階段 0：搭建

- 引入 `openclaw/plugin-sdk`。
- 將 `api.runtime` 加入到 `OpenClawPluginApi` 中，並包含上述表面（surface）。
- 在過渡窗口期維護現有的匯入（棄用警告）。

### 階段 1：橋接清理（低風險）

- 用 `api.runtime` 取代每個擴充功能的 `core-bridge.ts`。
- 優先遷移 BlueBubbles、Zalo、Zalo Personal（已接近完成）。
- 移除重複的橋接程式碼。

### 階段 2：輕量級直接匯入外掛程式

- 將 Matrix 遷移至 SDK + runtime。
- 驗證上架流程、目錄和群組提及邏輯。

### 階段 3：重量級直接匯入外掛程式

- 遷移 MS Teams（最大組的 runtime 輔助程式）。
- 確保回覆/輸入語意符合目前的行為。

### 階段 4：iMessage 外掛程式化

- 將 iMessage 移至 `extensions/imessage`。
- 用 `api.runtime` 取代直接的 core 呼叫。
- 保持設定金鑰、CLI 行為和文件不變。

### 階段 5：強制執行

- 新增 lint 規則 / CI 檢查：不得從 `src/**` 匯入 `extensions/**`。
- 新增外掛程式 SDK/版本相容性檢查（runtime + SDK semver）。

## 相容性和版本控制

- SDK：semver，已發布，記錄變更。
- Runtime：隨核心版本釋出。新增 `api.runtime.version`。
- 外掛程式宣告所需的 runtime 版本範圍（例如 `openclawRuntime: ">=2026.2.0"`）。

## 測試策略

- 轉接器層級的單元測試（使用真實的 core 實作來執行 runtime 函數）。
- 每個外掛程式的 Golden 測試：確保沒有行為偏離（路由、配對、允許清單、提及閘道）。
- 在 CI 中使用單一端對端外掛程式範例（安裝 + 執行 + 冒煙測試）。

## 未解決的問題

- 在哪裡託管 SDK 型別：獨立套件或 core 匯出？
- Runtime 型別分發：在 SDK 中（僅型別）還是在 core 中？
- 如何為內建與外部外掛程式公開文件連結？
- 我們是否允許在過渡期間對儲存庫內的外掛程式進行有限的直接 core 匯入？

## 成功標準

- 所有頻道連接器都是使用 SDK + runtime 的外掛程式。
- 沒有從 `src/**` 匯入的 `extensions/**`。
- 新的連接器範本僅依賴 SDK + runtime。
- 外部外掛程式可以在無需存取核心原始碼的情況下進行開發和更新。

相關文件：[Plugins](/zh-Hant/tools/plugin)、[Channels](/zh-Hant/channels/index)、[Configuration](/zh-Hant/gateway/configuration)。

## 已實作通道擁有的接縫

最近的重構工作擴展了通道插件合約，讓核心可以停止擁有
通道特定的 UX 和路由行為：

- `messaging.buildCrossContextComponents`：通道擁有的跨情境 UI 標記
  （例如 Discord 元件 v2 容器）
- `messaging.enableInteractiveReplies`：通道擁有的回覆正規化切換
  （例如 Slack 互動式回覆）
- `messaging.resolveOutboundSessionRoute`：通道擁有的 outbound 會話路由
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`：通道擁有的
  `/channels capabilities` 探測顯示和額外的稽核/範圍
- `threading.resolveAutoThreadId`：通道擁有的相同對話自動串接
- `threading.resolveReplyTransport`：通道擁有的回覆與串接遞送對應
- `actions.requiresTrustedRequesterSender`：通道擁有的特權動作信任閘門
- `execApprovals.*`：通道擁有的執行核准介面狀態、轉發抑制、
  待處理酬載 UX 以及遞送前掛鉤
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`：通道擁有的
  配置變更/移除時的清理
- `allowlist.supportsScope`：通道擁有的允許清單範圍公告

應優先使用這些掛鉤，而非在共用的核心流程中新增 `channel === "discord"` / `telegram`
分支。

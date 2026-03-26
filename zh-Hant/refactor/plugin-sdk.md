---
summary: "計畫：為所有訊息連接器提供一個乾淨的 Plugin SDK + runtime"
read_when:
  - Defining or refactoring the plugin architecture
  - Migrating channel connectors to the plugin SDK/runtime
title: "Plugin SDK 重構"
---

# Plugin SDK + Runtime 重構計畫

目標：每個訊息連接器都是使用一個穩定 API 的插件（內建或外掛）。
沒有任何插件直接從 `src/**` 匯入。所有依賴關係都通過 SDK 或 runtime。

## 為什麼是現在

- 目前的連接器混合了多種模式：直接匯入核心、僅 dist 的橋接器以及自訂輔助程式。
- 這使得升級過程變得脆弱，並阻礙了乾淨的外部插件介面。

## 目標架構（兩層）

### 1) Plugin SDK（編譯時期、穩定、可發佈）

範圍：型別、輔助程式和配置公用程式。無 runtime 狀態，無副作用。

內容（範例）：

- 類型：`ChannelPlugin`、適配器、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 配置輔助函數：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配對輔助函數：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 設定入口點：主機擁有的 `setup` + `setupWizard`；避免廣泛的公開入門輔助函數。
- 工具參數輔助函數：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文件連結輔助函數：`formatDocsLink`。

交付：

- 作為 `openclaw/plugin-sdk` 發布（或從核心中在 `openclaw/plugin-sdk` 下匯出）。
- 具有明確穩定性保證的語意化版本。

### 2) Plugin Runtime（執行層，注入式）

範圍：所有涉及核心執行階段行為的內容。
透過 `OpenClawPluginApi.runtime` 存取，因此外掛程式永遠不會匯入 `src/**`。

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
          deliver: (payload: {
            text?: string;
            mediaUrls?: string[];
            mediaUrl?: string;
          }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: {
        cfg: unknown;
        channel: string;
        accountId: string;
        peer: { kind: RoutePeerKind; id: string };
      }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: {
        channel: string;
        id: string;
        meta?: { name?: string };
      }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(
        buffer: Uint8Array,
        contentType: string | undefined,
        direction: "inbound" | "outbound",
        maxBytes: number,
      ): Promise<{ path: string; contentType?: string }>;
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
      resolveRequireMention(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
        override?: boolean,
      ): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: {
        debounceMs: number;
        buildKey: (v: T) => string | null;
        shouldDebounce: (v: T) => boolean;
        onFlush: (entries: T[]) => Promise<void>;
        onError?: (err: unknown) => void;
      }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: {
        useAccessGroups: boolean;
        authorizers: Array<{ configured: boolean; allowed: boolean }>;
      }): boolean;
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
- SDK 刻意保持小型且穩定。
- 每個 runtime 方法都對應到現有的核心實作（無重複）。

## 遷移計畫（分階段，安全）

### 階段 0：搭建基礎架構

- 引進 `openclaw/plugin-sdk`。
- 使用上述介面將 `api.runtime` 新增到 `OpenClawPluginApi`。
- 在過渡期間維持現有的匯入（棄用警告）。

### 階段 1：橋接清理（低風險）

- 將每個擴充功能的 `core-bridge.ts` 替換為 `api.runtime`。
- 優先遷移 BlueBubbles、Zalo、Zalo Personal（已接近完成）。
- 移除重複的橋接程式碼。

### 階段 2：輕量級直接匯入的外掛

- 將 Matrix 遷移至 SDK + 執行時期。
- 驗證入職、目錄、群組提及邏輯。

### 階段 3：重量級直接匯入的外掛

- 遷移 MS Teams（最大的執行時期輔助程式集）。
- 確保回覆/輸入語意符合目前的行為。

### 階段 4：iMessage 外掛化

- 將 iMessage 移至 `extensions/imessage`。
- 將直接的 core 呼叫替換為 `api.runtime`。
- 保持設定金鑰、CLI 行為和文件不變。

### 階段 5：強制執行

- 加入 lint 規則 / CI 檢查：禁止從 `src/**` 匯入 `extensions/**`。
- 加入外掛 SDK/版本相容性檢查（執行時期 + SDK semver）。

## 相容性與版本控制

- SDK：semver，已發布，文件化的變更。
- Runtime：隨核心版本發布。新增 `api.runtime.version`。
- 外掛宣告所需的 Runtime 版本範圍（例如 `openclawRuntime: ">=2026.2.0"`）。

## 測試策略

- Adapter 層級的單元測試（使用真實的核心實作來執行 Runtime 函式）。
- 每個外掛的 Golden 測試：確保沒有行為偏差（路由、配對、允許清單、提及閘道）。
- 在 CI 中使用的單一端對端外掛範例（安裝 + 執行 + 冒煙測試）。

## 待解問題

- 在何處託管 SDK 型別：獨立套件或是核心匯出？
- Runtime 型別發佈：在 SDK 中（僅型別）還是在核心中？
- 如何為內建與外部外掛公開文件連結？
- 我們是否在轉換期間允許倉庫內的外掛有限度地直接匯入核心？

## 成功標準

- 所有頻道連接器都是使用 SDK + Runtime 的外掛。
- 沒有從 `src/**` 的 `extensions/**` 匯入。
- 新的連接器範本僅依賴於 SDK 與 runtime。
- 外部外掛程式可以在無需存取核心原始碼的情況下進行開發與更新。

相關文件：[外掛程式](/zh-Hant/tools/plugin)、[頻道](/zh-Hant/channels/index)、[設定](/zh-Hant/gateway/configuration)。

## 已實作頻道擁有的縫合機制 (channel-owned seams)

近期的重構工作擴展了頻道外掛程式合約，因此核心可以停止擁有
特定頻道的 UX 與路由行為：

- `messaging.buildCrossContextComponents`：頻道擁有的跨情境 UI 標記
  (例如 Discord 元件 v2 容器)
- `messaging.enableInteractiveReplies`：頻道擁有的回覆正規化切換開關
  (例如 Slack 互動式回覆)
- `messaging.resolveOutboundSessionRoute`：頻道擁有的出站會話路由
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`: channel-owned
  `/channels capabilities` 探測顯示與額外的稽核/範圍
- `threading.resolveAutoThreadId`: channel-owned 同一對話自動串接
- `threading.resolveReplyTransport`: channel-owned 回覆 vs. 串接傳遞對應
- `actions.requiresTrustedRequesterSender`: channel-owned 特權動作信任閘道
- `execApprovals.*`: channel-owned 執行核准介面狀態、轉發抑制、
  待處理 Payload UX 以及傳遞前掛鉤
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`: channel-owned 當
  設定變更/移除時的清理
- `allowlist.supportsScope`: channel-owned 允許清單範圍公告

在共享核心流程中，應優先使用這些掛鉤，而非新增新的 `channel === "discord"` / `telegram`
分支。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

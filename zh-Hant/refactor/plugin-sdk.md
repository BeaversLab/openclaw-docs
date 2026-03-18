---
summary: "計劃：為所有訊息連接器提供一個乾淨的插件 SDK + 運行時"
read_when:
  - Defining or refactoring the plugin architecture
  - Migrating channel connectors to the plugin SDK/runtime
title: "Plugin SDK 重構"
---

# Plugin SDK + 運行時重構計劃

目標：每個訊息連接器都是一個使用穩定 API 的插件（內建或外部）。
沒有任何插件直接從 `src/**` 匯入。所有相依性都通過 SDK 或運行時。

## 為什麼是現在

- 目前的連接器混合了多種模式：直接從核心匯入、僅用於發佈的橋接和自訂輔助程式。
- 這使得升級變得脆弱，並阻礙了乾淨的外部插件表面。

## 目標架構（兩層）

### 1) Plugin SDK（編譯時期、穩定、可發佈）

範圍：型別、輔助程式和配置工具。無運行時狀態，無副作用。

內容（範例）：

- 型別：`ChannelPlugin`、轉接器、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 配置輔助程式：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配對輔助程式：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 設定進入點：主機擁有的 `setup` + `setupWizard`；避免廣泛的公開上線輔助程式。
- 工具參數輔助程式：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文件連結輔助程式：`formatDocsLink`。

交付：

- 作為 `openclaw/plugin-sdk` 發佈（或從核心在 `openclaw/plugin-sdk` 下匯出）。
- 使用具有明確穩定性保證的 Semver。

### 2) Plugin Runtime（執行表面、注入）

範圍：所有接觸核心運行時行為的內容。
通過 `OpenClawPluginApi.runtime` 存取，因此插件從不匯入 `src/**`。

建議的表面（最小但完整）：

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

- 運行時是存取核心行為的唯一方式。
- SDK 刻意保持小巧且穩定。
- 每個運行時方法都對應到一個現有的核心實作（無重複）。

## 遷移計劃（分階段、安全）

### 階段 0：基架

- 引入 `openclaw/plugin-sdk`。
- 將 `api.runtime` 加入到 `OpenClawPluginApi` 中，包含上述介面。
- 在過渡期間保留現有的導入（棄用警告）。

### 階段 1：橋接清理（低風險）

- 使用 `api.runtime` 取代各個擴充功能的 `core-bridge.ts`。
- 首先遷移 BlueBubbles、Zalo、Zalo Personal（已接近完成）。
- 移除重複的橋接程式碼。

### 階段 2：輕量級直接導入插件

- 將 Matrix 遷移至 SDK + 執行時。
- 驗證入職、目錄、群組提及邏輯。

### 階段 3：重量級直接導入插件

- 遷移 MS Teams（最大的一組執行時輔助程式）。
- 確保回覆/正在輸入語義符合目前的行為。

### 階段 4：iMessage 插件化

- 將 iMessage 移至 `extensions/imessage`。
- 使用 `api.runtime` 取代直接的核心呼叫。
- 保持配置金鑰、CLI 行為和文件不變。

### 階段 5：強制執行

- 加入 lint 規則 / CI 檢查：不得從 `src/**` 導入 `extensions/**`。
- 加入插件 SDK/版本相容性檢查（runtime + SDK semver）。

## 相容性與版本控制

- SDK：semver，已發布，記錄變更。
- Runtime：隨核心發布版本進行版本控制。加入 `api.runtime.version`。
- 插件宣告所需的 runtime 版本範圍（例如 `openclawRuntime: ">=2026.2.0"`）。

## 測試策略

- 配接器層級的單元測試（使用真實的核心實作來執行 runtime 函數）。
- 每個插件的 Golden 測試：確保沒有行為偏差（路由、配對、允許列表、提及閘道）。
- 在 CI 中使用單一端對端插件範例（安裝 + 執行 + 冒煙測試）。

## 未解決問題

- 在哪裡託管 SDK 類型：獨立套件還是核心導出？
- Runtime 類型分發：在 SDK 中（僅類型）還是在核心中？
- 如何公開內建與外部插件的文件連結？
- 我們是否允許在過渡期間對倉庫內插件進行有限的直接核心導入？

## 成功標準

- 所有通道連接器都是使用 SDK + runtime 的插件。
- 無 `extensions/**` 從 `src/**` 導入。
- 新的連接器範本僅依賴 SDK + runtime。
- 外部插件可以在沒有核心原始碼存取權的情況下進行開發和更新。

相關文件：[Plugins](/zh-Hant/tools/plugin)、[Channels](/zh-Hant/channels/index)、[Configuration](/zh-Hant/gateway/configuration)。

## 已實作頻道擁有的接縫

近期的重構工作擴展了頻道外掛程式合約，使核心能夠停止擁有
頻道特定的 UX 和路由行為：

- `messaging.buildCrossContextComponents`：頻道擁有的跨上下文 UI 標記
  (例如 Discord components v2 containers)
- `messaging.enableInteractiveReplies`：頻道擁有的回覆正規化切換開關
  (例如 Slack 互動式回覆)
- `messaging.resolveOutboundSessionRoute`：頻道擁有的輸出會話路由
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`：頻道擁有的
  `/channels capabilities` 探測顯示與額外的稽核/範圍
- `threading.resolveAutoThreadId`：頻道擁有的同對話自動串接
- `threading.resolveReplyTransport`：頻道擁有的回覆與執行緒傳遞對應
- `actions.requiresTrustedRequesterSender`：頻道擁有的特權動作信任閘門
- `execApprovals.*`：頻道擁有的執行核准介面狀態、轉發抑制、
  待處理承載 UX，以及傳遞前掛鉤
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`：頻道擁有的
  設定變更/移除時清理
- `allowlist.supportsScope`：頻道擁有的允許清單範圍公告

在共享核心流程中，應優先使用這些掛鉤，而非新增 `channel === "discord"` / `telegram`
分支。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

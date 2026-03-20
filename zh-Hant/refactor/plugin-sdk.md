---
summary: "計畫：為所有訊息連接器提供一個乾淨的插件 SDK 與運行時"
read_when:
  - 定義或重構插件架構
  - 將頻道連接器遷移至插件 SDK/運行時
title: "Plugin SDK 重構"
---

# Plugin SDK + Runtime 重構計畫

目標：每個訊息連接器都是使用單一穩定 API 的插件（捆綁或外部）。
插件不得直接從 `src/**` 匯入。所有依賴項都須透過 SDK 或運行時。

## 為何現在

- 目前的連接器混雜了多種模式：直接匯入核心、僅 dist 的橋接器以及自訂輔助程式。
- 這使得升級變得脆弱，並阻礙了乾淨的外部插件介面。

## 目標架構（兩層）

### 1) Plugin SDK（編譯時期、穩定、可發布）

範圍：型別、輔助程式和設定公用程式。無運行時狀態，無副作用。

內容（範例）：

- 型別：`ChannelPlugin`、配接器、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 設定輔助程式：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配對輔助程式：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 設定進入點：主機擁有的 `setup` + `setupWizard`；避免廣泛的公開上線輔助程式。
- 工具參數輔助程式：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文件連結輔助程式：`formatDocsLink`。

交付方式：

- 發布為 `openclaw/plugin-sdk`（或從核心匯出，位於 `openclaw/plugin-sdk` 下）。
- 具有明確穩定性保證的 Semver。

### 2) Plugin Runtime（執行介面、注入）

範圍：所有涉及核心運行時行為的內容。
透過 `OpenClawPluginApi.runtime` 存取，因此插件永不匯入 `src/**`。

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
- 每個 runtime 方法都對應到一個現有的核心實作（無重複）。

## 遷移計畫（分階段、安全）

### 第 0 階段：建構基礎

- 引進 `openclaw/plugin-sdk`。
- 將 `api.runtime` 加入 `OpenClawPluginApi`，並使用上述介面。
- 在過渡期間保留現有的匯入（棄用警告）。

### Phase 1: bridge cleanup (low risk)

- 將每個擴充功能的 `core-bridge.ts` 替換為 `api.runtime`。
- 優先遷移 BlueBubbles、Zalo、Zalo Personal（已接近完成）。
- 移除重複的 bridge 程式碼。

### Phase 2: light direct-import plugins

- 將 Matrix 遷移至 SDK + runtime。
- 驗證 onboarding、directory、group mention 邏輯。

### Phase 3: heavy direct-import plugins

- 遷移 MS Teams（最大的 runtime helpers 集合）。
- 確保 reply/typing 語義符合目前的行為。

### Phase 4: iMessage pluginization

- 將 iMessage 移至 `extensions/imessage`。
- 將直接的 core 呼叫替換為 `api.runtime`。
- 保持 config keys、CLI 行為和文件完整不變。

### Phase 5: enforcement

- 新增 lint rule / CI 檢查：禁止從 `src/**` 匯入 `extensions/**`。
- 新增 plugin SDK/version 相容性檢查（runtime + SDK semver）。

## Compatibility and versioning

- SDK：semver、已發佈、文件化的變更。
- Runtime：隨每個 core 發行版本進行版本控制。新增 `api.runtime.version`。
- Plugins 宣告所需的 runtime 範圍（例如 `openclawRuntime: ">=2026.2.0"`）。

## Testing strategy

- Adapter 層級的單元測試（使用真實的 core 實作來執行 runtime 函式）。
- 每個 plugin 的 Golden 測試：確保沒有行為差異（routing、pairing、allowlist、mention gating）。
- 在 CI 中使用單一的端到端 plugin 範例（安裝 + 執行 + 冒煙測試）。

## Open questions

- SDK types 的託管位置：獨立套件或 core 匯出？
- Runtime 類型發布：在 SDK（僅類型）中還是在 core 中？
- 如何為 bundled 與 external plugins 公開文件連結？
- 我們是否允許在過渡期間對 in-repo plugins 進行有限制的直接 core 匯入？

## Success criteria

- 所有 channel connectors 都是使用 SDK + runtime 的 plugins。
- 禁止從 `src/**` 匯入 `extensions/**`。
- 新的 connector 模板僅依賴 SDK + runtime。
- External plugins 可以在無需存取核心原始碼的情況下進行開發和更新。

相關文件：[Plugins](/zh-Hant/tools/plugin)、[Channels](/zh-Hant/channels/index)、[Configuration](/zh-Hant/gateway/configuration)。

## 實作了 channel-owned seams

最近的重構工作擴展了 channel plugin contract，讓 core 可以停止擁有特定於 channel 的 UX 和路由行為：

- `messaging.buildCrossContextComponents`：channel-owned 的跨語境 UI 標記
  (例如 Discord components v2 containers)
- `messaging.enableInteractiveReplies`：channel-owned 的回覆標準化切換開關
  (例如 Slack interactive replies)
- `messaging.resolveOutboundSessionRoute`：channel-owned 的出站 session 路由
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`：channel-owned 的
  `/channels capabilities` probe 顯示與額外的稽核/範圍
- `threading.resolveAutoThreadId`：channel-owned 的同一對話自動串接功能
- `threading.resolveReplyTransport`：channel-owned 的回覆與串接傳遞對應
- `actions.requiresTrustedRequesterSender`：channel-owned 的特權動作信任閘道
- `execApprovals.*`：channel-owned 的執行核准介面狀態、轉發抑制、
  待處理 payload UX，以及傳遞前掛鉤
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`：channel-owned 在
  設定變更/移除時的清理作業
- `allowlist.supportsScope`：channel-owned 的允許清單範圍公告

應優先使用這些掛鉤，而不是在共享的 core flows 中新增 `channel === "discord"` / `telegram`
分支。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />

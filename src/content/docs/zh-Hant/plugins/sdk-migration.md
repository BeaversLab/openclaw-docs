---
summary: "從舊版向後相容層遷移至現代化 Plugin SDK"
title: "Plugin SDK 遷移"
sidebarTitle: "遷移至 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

OpenClaw 已從廣泛的向後相容層轉移到具有明確、有文件記錄之匯入項的現代化 Plugin 架構。如果您的 Plugin 是在新架構之前建構的，本指南將協助您進行遷移。

## 什麼改變了

舊的 Plugin 系統提供了兩個廣開的介面，讓 Plugin 可以從單一進入點匯入它們需要的任何東西：

- **`openclaw/plugin-sdk/compat`** - 單一匯入，重新匯出了數十個
  輔助函式。其引進是為了在構建新 plugin 架構時，讓較舊的基於 hook 的 plugin 繼續運作。
- **`openclaw/plugin-sdk/infra-runtime`** - 廣泛的 runtime 輔助集合，
  混合了系統事件、heartbeat 狀態、傳遞佇列、fetch/proxy 輔助函式、
  檔案輔助函式、核准類型以及不相關的公用程式。
- **`openclaw/plugin-sdk/config-runtime`** - 廣泛的 config 相容集合，
  在遷移期間仍包含已棄用的直接載入/寫入輔助函式。
- **`openclaw/extension-api`** - 一個提供外掛程式直接存取主機端協助程式（如內嵌 Agent 執行器）的橋樑。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一個已移除且僅限 Pi 版本的內建擴充功能 Hook，可用於觀察內嵌執行器事件，例如 `tool_result`。

這些廣泛的匯入介面現已**棄用**。它們在執行時期仍然可以運作，但新的外掛程式不應再使用它們，且現有的外掛程式應在下一次主要發行版本移除這些介面之前完成遷移。僅限 Pi 版本的內建擴充功能工廠註冊 API 已被移除；請改用工具結果中介軟體。

OpenClaw 不會在引入替代方案的同一變更中移除或重新解讀已記載的插件行為。破壞性契約變更必須先經過相容性配接器、診斷、文件和棄用期。這適用於 SDK 匯入、清單欄位、設定 API、Hook 和執行時期註冊行為。

<Warning>向後相容層將在未來的主要版本中移除。 屆時，仍從這些介面匯入的插件將會中斷運作。 僅限 Pi 的嵌入式擴充功能工廠註冊已無法載入。</Warning>

## 為何變更

舊方法導致了以下問題：

- **啟動緩慢** - 匯入一個輔助函式會載入數十個不相關的模組
- **循環相依** - 廣泛的重新匯出使得建立匯入循環變得容易
- **API 介面不明確** - 無法區分哪些匯出是穩定的，哪些是內部使用的

現代化外掛 SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`) 都是一個小型、獨立的模組，具有明確的用途和記錄完備的契約。

針對內建管道的舊版提供者便捷縫隙也已移除。品牌管道的輔助縫隙是私有 monorepo 的捷徑，而非穩定的外掛契約。請改用狹窄的通用 SDK 子路徑。在內建的外掛工作區內，將提供者擁有的輔助程式保留在該外掛自己的 `api.ts` 或 `runtime-api.ts` 中。

目前的內建提供者範例：

- Anthropic 將 Claude 特定的串流輔助程式保留在其自己的 `api.ts` /
  `contract-api.ts` 縫隙中
- OpenAI 將提供者建構器、預設模型輔助程式和即時提供者
  建構器保留在其自己的 `api.ts` 中
- OpenRouter 將提供者建構器 (provider builder) 以及上架/設定輔助函式保留在其自己的
  `api.ts` 中

## Talk 與即時語音遷移計畫

即時語音、電話、會議以及瀏覽器 Talk 程式碼，正從介面區域本地的輪次 (turn) 簿記，移轉至由
`openclaw/plugin-sdk/realtime-voice` 匯出的共享 Talk 會話控制器。新的控制器擁有通用的 Talk
事件封包、使用中輪次狀態、擷取狀態、輸出音訊狀態、近期事件歷程記錄，以及過期輪次拒絕機制。提供者外掛程式應繼續擁有廠商特定的即時會話；介面外掛程式應繼續擁有擷取、
播放、電話與會議的特殊行為。

這次 Talk 遷移是有意進行徹底的中斷性變更：

1. 請將共享控制器/執行時期基本元件保留在
   `plugin-sdk/realtime-voice` 中。
2. 將捆綁的介面移至共享控制器：瀏覽器中繼、受控會議室移交、語音通話即時、語音通話串流 STT、Google Meet 即時，以及原生按鍵通話。
3. 將舊的 Talk RPC 系列替換為最終的 `talk.session.*` 和
   `talk.client.*` API。
4. 在 Gateway
   `hello-ok.features.events` 中通告一個即時 Talk 事件頻道：`talk.event`。
5. 刪除舊的即時 HTTP 端點以及任何請求時指令覆寫路徑。

除非正在實作低階轉接器或測試裝置，否則新程式碼不應直接呼叫 `createTalkEventSequencer(...)`。建議優先使用共用控制器，以便在沒有回合 ID 的情況下無法發出回合範圍的事件，過時的 `turnEnd` / `turnCancel` 呼叫無法清除較新的活動回合，並且輸出音訊生命週期事件在電話、會議、瀏覽器中繼、受控房間移交和原生 Talk 用戶端之間保持一致。

目標公開 API 形狀為：

```typescript
// Gateway-owned Talk session API.
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
await gateway.request("talk.session.cancelOutput", { sessionId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// Client-owned provider session API.
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
```

瀏覽器擁有的 WebRTC/提供商 websocket 會話使用 `talk.client.create`，因為瀏覽器擁有提供商協商和媒體傳輸，而 Gateway 擁有憑證、指示和工具政策。`talk.session.*` 是閘道中繼即時、閘道中繼轉錄和受控房間原生 STT/TTS 會話的常見 Gateway 管理介面。

將即時選擇器放置在 `talk.provider` /
`talk.providers` 旁邊的舊版組態應使用 `openclaw doctor --fix` 進行修復；執行時期的 Talk 不會將語音/TTS 提供者組態重新解釋為即時提供者組態。

支援的 `talk.session.create` 組合特意保持在少量：

| 模式            | 傳輸            | 大腦            | 擁有者          | 備註                                                                          |
| --------------- | --------------- | --------------- | --------------- | ----------------------------------------------------------------------------- |
| `realtime`      | `gateway-relay` | `agent-consult` | 閘道            | 全雙工提供者音訊透過閘道橋接；工具呼叫透過 agent-consult 工具路由。           |
| `transcription` | `gateway-relay` | `none`          | 閘道            | 僅串流 STT；呼叫者發送輸入音訊並接收文字記錄事件。                            |
| `stt-tts`       | `managed-room`  | `agent-consult` | 原生/客戶端房間 | 按鍵通話和對講機風格的房間，其中客戶端擁有擷取/播放權限，而閘道擁有輪次狀態。 |
| `stt-tts`       | `managed-room`  | `direct-tools`  | 原生/客戶端房間 | 專屬管理員的房間模式，適用於直接執行閘道工具動作的受信任第一方介面。          |

已移除的方法對應：

| 舊版                             | 新版                                                     |
| -------------------------------- | -------------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                     |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                                   |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                               |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput` 或 `talk.session.cancelTurn` |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                          |
| `talk.realtime.relayStop`        | `talk.session.close`                                     |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`         |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                               |
| `talk.transcription.relayCancel` | `talk.session.cancelTurn`                                |
| `talk.transcription.relayStop`   | `talk.session.close`                                     |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })`     |
| `talk.handoff.join`              | `talk.session.join`                                      |
| `talk.handoff.revoke`            | `talk.session.close`                                     |

統一的控制詞彙也是刻意狹窄的：

| 方法                            | 適用於                                                  | 合約                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`、`transcription/gateway-relay` | 將 base64 PCM 音訊區塊附加到屬於同一個 Gateway 連線的提供者會話。                                                                                        |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 開始一個受管理房間的使用者輪次。                                                                                                                         |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在過時輪次驗證後結束活躍輪次。                                                                                                                           |
| `talk.session.cancelTurn`       | 所有 Gateway 擁有的會話                                 | 取消某個輪次的活躍擷取/提供者/代理/TTS 工作。                                                                                                            |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助理音訊輸出，而不一定結束使用者輪次。                                                                                                               |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成中繼器發出的提供者工具呼叫；傳遞 `options.willContinue` 以取得暫時性輸出，或傳遞 `options.suppressResponse` 以在無需其他助理回應的情況下滿足該呼叫。 |
| `talk.session.close`            | 所有統一會話                                            | 停止中繼器會話或撤銷受管理房間狀態，然後忘記統一會話 ID。                                                                                                |

不要為了讓這項工作運作而在核心中引入供應商或平台的特殊情況處理。核心擁有 Talk 語意的語義。供應商外掛程式擁有供應商會話設定。Voice-call 和 Google Meet 擁有電話會議/會議配接器。瀏覽器和原生應用程式擁有裝置擷取/播放的使用者體驗。

## 相容性政策

對於外部外掛程式，相容性工作遵循以下順序：

1. 加入新的合約
2. 透過相容性配接器保持舊行為的連線
3. 發出指出舊路徑和替代方案的診斷或警告
4. 在測試中涵蓋這兩條路徑
5. 記錄棄用和遷移路徑
6. 僅在公佈的遷移期限之後移除，通常是在主要版本中

維護者可以使用 `pnpm plugins:boundary-report` 審核目前的遷移佇列。使用 `pnpm plugins:boundary-report:summary` 取得簡潔計數、`--owner <id>` 用於單一外掛程式或相容性負責人，以及在 CI 閘道應因過期的相容性記錄、跨負責人保留的 SDK 匯入，或未使用的保留 SDK 子路徑而失敗時使用 `pnpm plugins:boundary-report:ci`。此報告會依移除日期分組已棄用的相容性記錄、計算本機程式碼/文件參考、呈現跨負責人保留的 SDK 匯入，並摘要私有的 memory-host SDK 橋接，讓相容性清理保持明確，而不依賴臨時搜尋。保留的 SDK 子路徑必須有追蹤的負責人使用情況；未使用的保留輔助匯出應從公用 SDK 中移除。

如果清單欄位仍被接受，外掛作者可以繼續使用它，直到文件和診斷另有說明為止。新程式碼應優先使用記載的替代方案，但現有的外掛在一般次要版本發布期間不應中斷。

## 如何遷移

<Steps>
  <Step title="遷移執行時配置載入/寫入輔助函式">
    捆綁外掛應停止直接呼叫
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。優先使用已傳入當前呼叫路徑的配置。需要當前進程快照的長效處理程序可以使用 `api.runtime.config.current()`。長效 Agent 工具應在 `execute` 內使用工具上下文的 `ctx.getRuntimeConfig()`，以便在寫入配置之前建立的工具仍能看到重新整理後的執行時配置。

    配置寫入必須通過事務性輔助函式進行，並選擇寫入後策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    當呼叫者知道變更需要乾淨的 Gateway 重啟時，請使用 `afterWrite: { mode: "restart", reason: "..." }`，僅當呼叫者擁有後續處理並故意想要抑制重新載入規劃程式時才使用 `afterWrite: { mode: "none", reason: "..." }`。變異結果包含類型化的 `followUp` 摘要，用於測試和記錄；Gateway 仍負責應用或排程重啟。`loadConfig` 和 `writeConfigFile` 在遷移期間仍作為已棄用的相容性輔助函式供外部外掛使用，並會使用 `runtime-config-load-write` 相容性代碼發出一次警告。捆綁外掛和 Repo 執行時代碼受 `pnpm check:deprecated-api-usage` 和
    `pnpm check:no-runtime-action-load-config` 中的掃描器防護機制保護：新的生產外掛使用會完全失敗，直接配置寫入會失敗，Gateway 伺服器方法必須使用請求執行時快照，執行時通道 send/action/client 輔助函式必須從其邊界接收配置，且長效執行時模組不允許有任何環境 `loadConfig()` 呼叫。

    新的外掛程式碼還應避免導入廣泛的
    `openclaw/plugin-sdk/config-runtime` 相容性匯入桶。請使用符合任務的狹窄 SDK 子路徑：

    | 需求 | 匯入 |
    | --- | --- |
    | 配置類型，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | 已載入配置的斷言和外掛入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 當前執行時快照讀取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置寫入 | `openclaw/plugin-sdk/config-mutation` |
    | Session 存儲輔助函式 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 群組策略執行時輔助函式 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密鑰輸入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/Session 覆寫 | `openclaw/plugin-sdk/model-session-runtime` |

    捆綁外掛及其測試受到針對廣泛匯入桶的掃描器防護，因此匯入和模擬物件保持在其所需的行為範圍內。廣泛匯入桶為了外部相容性仍然存在，但新程式碼不應依賴它。

  </Step>

  <Step title="將 Pi tool-result 擴充功能遷移至中介軟體">
    內掛插件必須將僅限 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` tool-result 處理常式替換為
    執行階段中性的中介軟體。

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同時更新插件資訊清單：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外掛插件無法註冊 tool-result 中介軟體，因為它可以在模型看到之前
    重寫高信任度的工具輸出。

  </Step>

  <Step title="將審核原生處理程式遷移至功能事實">
    具備審核功能的頻道外掛現在透過 `approvalCapability.nativeRuntime` 加上共用的執行時期環境登錄檔，來公開原生審核行為。

    主要變更：

    - 將 `approvalCapability.handler.loadRuntime(...)` 取換為
      `approvalCapability.nativeRuntime`
    - 將審核特定的驗證/傳遞從舊版 `plugin.auth` /
      `plugin.approvals` 連線移至 `approvalCapability`
    - `ChannelPlugin.approvals` 已從公開頻道外掛合約中移除；將傳遞/原生/渲染欄位移至 `approvalCapability`
    - `plugin.auth` 僅保留用於頻道登入/登出流程；核心不再讀取該處的審核驗證掛鉤
    - 透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊頻道擁有的執行時期物件，例如客戶端、權杖或 Bolt 應用程式
    - 請勿從原生審核處理程式傳送外掛擁有的重新導向通知；來自實際傳遞結果的路由至他處通知現由核心擁有
    - 將 `channelRuntime` 傳入 `createChannelManager(...)` 時，請提供
      真實的 `createPluginRuntime().channel` 介面。部分存根將被拒絕。

    請參閱 `/plugins/sdk-channel-plugins` 以了解目前的審核功能配置。

  </Step>

  <Step title="稽核 Windows 包裝器後援行為">
    如果您的外掛使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包裝器現在會以封閉式失敗，除非您明確傳遞
    `allowShellFallback: true`。

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    如果您的呼叫端並非刻意依賴 shell 後援，請勿設定
    `allowShellFallback`，而是改為處理擲回的錯誤。

  </Step>

  <Step title="尋找已淘汰的匯入">
    在您的外掛中搜尋來自任一已淘汰介面的匯入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替換為專注的匯入">
    舊介面匯出的每個項目都對應到一個特定的現代匯入路徑：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    對於主機端輔助函數，請使用注入的外掛程式執行時，而不是直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    相同的模式也適用於其他舊版橋接輔助函數：

    | 舊版匯入 | 現代等價項目 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | session store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="替換廣泛的 infra-runtime 匯入">
    為了外部相容性，`openclaw/plugin-sdk/infra-runtime` 仍然存在，但新程式碼應匯入其實際需要的專用輔助介面：

    | 需求 | 匯入 |
    | --- | --- |
    | 系統事件佇列輔助函式 | `openclaw/plugin-sdk/system-event-runtime` |
    | Heartbeat 喚醒、事件及可見性輔助函式 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待傳遞佇列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 頻道活動遙測 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 記憶體內去重快取 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本機檔案/媒體路徑輔助函式 | `openclaw/plugin-sdk/file-access-runtime` |
    | 具感知 Dispatcher 的 fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | Proxy 和受防護的 fetch 輔助函式 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF dispatcher 原則類型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 核准請求/解決類型 | `openclaw/plugin-sdk/approval-runtime` |
    | 核准回應 payload 及指令輔助函式 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 錯誤格式化輔助函式 | `openclaw/plugin-sdk/error-runtime` |
    | 傳輸就緒等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全權杖輔助函式 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界的非同步任務並行 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 數值強制 | `openclaw/plugin-sdk/number-runtime` |
    | 程序區域非同步鎖 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 檔案鎖 | `openclaw/plugin-sdk/file-lock` |

    打包的外掛程式已掃描防護以避免 `infra-runtime`，因此儲存庫程式碼
    無法回退到廣泛的 barrel 匯入。

  </Step>

  <Step title="遷移通道路由輔助函式">
    新的通道路由程式碼應使用 `openclaw/plugin-sdk/channel-route`。
    舊的 route-key 和 comparable-target 名稱在遷移期間會保留作為相容性別名，但新外掛程式應使用直接描述行為的路由名稱：

    | 舊輔助函式 | 現代輔助函式 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    現代路由輔助函式會在原生審核、回覆抑制、入站去重、cron 傳遞和會話路由之間一致地正規化 `{ channel, to, accountId, threadId }`。如果您的外掛程式擁有自訂目標語法，請使用 `resolveChannelRouteTargetWithParser(...)` 將該解析器調整為相同的路由目標合約。

  </Step>

  <Step title="建置並測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="通用匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛程式進入輔助函式 | `definePluginEntry` | | `plugin-sdk/core` | 舊版通道進入定義/建構器的統一重新匯出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者進入輔助函式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的通道進入定義和建構器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共用設置精靈輔助函式 | 允許清單提示、設置狀態建構器 | | `plugin-sdk/setup-runtime` | 設置時執行時輔助函式 |
  匯入安全的設置修補介面卡、查找備註輔助函式、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設置代理 | | `plugin-sdk/setup-adapter-runtime` | 設置介面卡輔助函式 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 設置工具輔助函式 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` |
  多帳戶輔助函式 | 帳戶清單/配置/操作閘道輔助函式 | | `plugin-sdk/account-id` | 帳戶 ID 輔助函式 | `DEFAULT_ACCOUNT_ID`, 帳戶 ID 正規化 | | `plugin-sdk/account-resolution` | 帳戶查找輔助函式 | 帳戶查找 + 預設後備輔助函式 | | `plugin-sdk/account-helpers` | 狹窄帳戶輔助函式 | 帳戶清單/帳戶操作輔助函式 | | `plugin-sdk/channel-setup` | 設置精靈介面卡 | `createOptionalChannelSetupSurface`,
  `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對基本元件 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前綴、輸入和來源傳遞佈線 | `createChannelReplyPipeline`,
  `resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | 配置介面卡工廠和 DM 存取輔助函式 | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | 配置架構建構器 | 僅限共用通道配置架構基本元件和通用建構器 | |
  `plugin-sdk/bundled-channel-config-schema` | 捆綁配置架構 | 僅限 OpenClaw 維護的捆綁外掛程式；新外掛程式必須定義外掛程式本機架構 | | `plugin-sdk/channel-config-schema-legacy` | 已棄用的捆綁配置架構 | 僅限相容性別名；對於維護的捆綁外掛程式，請使用 `plugin-sdk/bundled-channel-config-schema` | | `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助函式 |
  指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 帳戶狀態和草稿串流生命週期輔助函式 | `createAccountStatusSink`, 草稿預覽最終化輔助函式 | | `plugin-sdk/inbound-envelope` | 傳入信封輔助函式 | 共用路由 + 信封建構器輔助函式 | | `plugin-sdk/inbound-reply-dispatch` | 傳入回覆輔助函式 |
  共用記錄和分派輔助函式 | | `plugin-sdk/messaging-targets` | 訊息目標解析 | 目標解析/匹配輔助函式 | | `plugin-sdk/outbound-media` | 傳出媒體輔助函式 | 共用傳出媒體載入 | | `plugin-sdk/outbound-send-deps` | 傳出傳送相依性輔助函式 | 輕量級 `resolveOutboundSendDep` 查找，無需匯入完整的傳出執行時 | | `plugin-sdk/outbound-runtime` | 傳出執行時輔助函式 |
  傳出傳遞、身分/傳送委派、工作階段、格式化和承載規劃輔助函式 | | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結輔助函式 | 執行緒繫結生命週期和介面卡輔助函式 | | `plugin-sdk/agent-media-payload` | 舊版媒體承載輔助函式 | 舊版欄位版面配置的代理程式媒體承載建構器 | | `plugin-sdk/channel-runtime` | 已棄用的相容性 shim | 僅限舊版通道執行時公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型
  | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久性外掛程式儲存空間 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛執行時輔助函式 | 執行時/記錄/備份/外掛程式安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹窄執行時環境輔助函式 | 記錄器/執行時環境、逾時、重試和退避輔助函式 | | `plugin-sdk/plugin-runtime` | 共用外掛程式執行時輔助函式 | 外掛程式指令/勾點/http/互動輔助函式 | |
  `plugin-sdk/hook-runtime` | 勾點管線輔助函式 | 共用 webhook/內部勾點管線輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲執行時輔助函式 | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序輔助函式 | 共用 exec 輔助函式 | | `plugin-sdk/cli-runtime` | CLI 執行時輔助函式
  | 指令格式化、等候、版本輔助函式 | | `plugin-sdk/gateway-runtime` | 閘道輔助函式 | 閘道用戶端、事件迴圈就緒啟動輔助函式，以及通道狀態修補輔助函式 | | `plugin-sdk/config-runtime` | 已棄用的配置相容性 shim | 偏好 `config-types`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助函式 | 當捆綁的 Telegram
  合約介面無法使用時，提供後備穩定的 Telegram 指令驗證輔助函式 | | `plugin-sdk/approval-runtime` | 核准提示輔助函式 | Exec/外掛程式核准承載、核准功能/設定檔輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示路徑格式化 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助函式 | 核准者解析、相同聊天操作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助函式 | 原生
  exec核准設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 核准傳遞輔助函式 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助函式 | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助函式 | 針對熱通道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 核准處理程序輔助函式 |
  更廣泛的核准處理程序執行時輔助函式；當足夠時，請偏重使用狹窄的介面卡/閘道縫隙 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助函式 | 原生核准目標/帳戶繫結輔助函式 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助函式 | Exec/外掛程式核准回覆承載輔助函式 | | `plugin-sdk/channel-runtime-context` | 通道執行時上下文輔助函式 | 通用通道執行時上下文註冊/取得/監看輔助函式 | |
  `plugin-sdk/security-runtime` | 安全性輔助函式 | 共用信任、DM 閘道、根界限檔案/路徑輔助函式、外部內容和秘密收集輔助函式 | | `plugin-sdk/ssrf-policy` | SSRF 原則輔助函式 | 主機允許清單和私人網路原則輔助函式 | | `plugin-sdk/ssrf-runtime` | SSRF 執行時輔助函式 | 固定分派器、受防護擷取、SSRF 原則輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件輔助函式 | `enqueueSystemEvent`,
  `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | 心跳輔助函式 | 心跳喚醒、事件和可見性輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 傳遞佇列輔助函式 | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | 通道活動輔助函式 | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | 去重輔助函式 | 記憶體內去重快取 | | `plugin-sdk/file-access-runtime` |
  檔案存取輔助函式 | 安全的本機檔案/媒體路徑輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒輔助函式 | `waitForTransportReady` | | `plugin-sdk/collection-runtime` | 有界快取輔助函式 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘道輔助函式 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式化輔助函式 | `formatUncaughtError`,
  `isApprovalNotFoundError`, 錯誤圖表輔助函式 | | `plugin-sdk/fetch-runtime` | 包裝的擷取/代理輔助函式 | `resolveFetch`, 代理輔助函式, EnvHttpProxyAgent 選項輔助函式 | | `plugin-sdk/host-runtime` | 主機正規化輔助函式 | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助函式 | `RetryConfig`, `retryAsync`, 原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式化 |
  `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道和指令介面輔助函式 | `resolveControlCommandGate`, 寄件者驗證輔助函式, 指令登錄輔助函式，包括動態引數選單格式化 | | `plugin-sdk/command-status` | 指令狀態/說明轉譯器 | `buildCommandsMessage`, `buildCommandsMessagePaginated`,
  `buildHelpMessage` | | `plugin-sdk/secret-input` | 秘密輸入解析 | 秘密輸入輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助函式 | Webhook 目標公用程式 | | `plugin-sdk/webhook-request-guards` | Webhook 內文防護輔助函式 | 要求內文讀取/限制輔助函式 | | `plugin-sdk/reply-runtime` | 共用回覆執行時 | 傳入分派、心跳、回覆規劃器、分塊 | | `plugin-sdk/reply-dispatch-runtime` |
  狹窄回覆分派輔助函式 | 最終化、提供者分派和交談標籤輔助函式 | | `plugin-sdk/reply-history` | 回覆歷史輔助函式 | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參考規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回覆區塊輔助函式 | 文字/Markdown 分塊輔助函式 | |
  `plugin-sdk/session-store-runtime` | 工作階段儲存輔助函式 | 儲存路徑 + 更新時間輔助函式 | | `plugin-sdk/state-paths` | 狀態路徑輔助函式 | 狀態和 OAuth 目錄輔助函式 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助函式 | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, 工作階段金鑰正規化輔助函式 | | `plugin-sdk/status-helpers` | 通道狀態輔助函式 |
  通道/帳戶狀態摘要建構器、執行時狀態預設值、問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 目標解析器輔助函式 | 共用目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助函式 | Slug/字串正規化輔助函式 | | `plugin-sdk/request-url` | 要求 URL 輔助函式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助函式 | 具有正規化
  stdout/stderr 的計時指令執行器 | | `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 工具承載擷取 | 從工具結果物件中擷取正規化的承載 | | `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助函式 | 共用暫存下載路徑輔助函式 | | `plugin-sdk/logging-core` | 記錄輔助函式 |
  子系統記錄器和編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助函式 | Markdown 表格模式輔助函式 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆承載類型 | | `plugin-sdk/provider-setup` | 策劃的本機/託管提供者設置輔助函式 | 自託管提供者探索/配置輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管提供者設置輔助函式 |
  相同的自託管提供者探索/配置輔助函式 | | `plugin-sdk/provider-auth-runtime` | 提供者執行時驗證輔助函式 | 執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設置輔助函式 | API 金鑰上架/設定檔寫入輔助函式 | | `plugin-sdk/provider-auth-result` | 提供者驗證結果輔助函式 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-auth-login` | 提供者互動式登入輔助函式 |
  共用互動式登入輔助函式 | | `plugin-sdk/provider-selection-runtime` | 提供者選擇輔助函式 | 已配置或自動提供者選擇以及原始提供者配置合併 | | `plugin-sdk/provider-env-vars` | 提供者環境變數輔助函式 | 提供者驗證環境變數查找輔助函式 | | `plugin-sdk/provider-model-shared` | 共用提供者模型/重播輔助函式 | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`,
  共用重播原則建構器、提供者端點輔助函式和模型 ID 正規化輔助函式 | | `plugin-sdk/provider-catalog-shared` | 共用提供者目錄輔助函式 | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供者上架修補程式 | 上架配置輔助函式 | |
  `plugin-sdk/provider-http` | 提供者 HTTP 輔助函式 | 通用提供者 HTTP/端點功能輔助函式，包括音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch` | 提供者 Web 擷取輔助函式 | Web 擷取提供者註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 提供者 Web 搜尋配置輔助函式 | 針對不需要外掛程式啟用佈線的提供者，提供狹窄的 Web 搜尋配置/認證輔助函式 | |
  `plugin-sdk/provider-web-search-contract` | 提供者 Web 搜尋合約輔助函式 | 狹窄的 Web 搜尋配置/認證合約輔助函式，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍認證設定器/取得器 | | `plugin-sdk/provider-web-search` | 提供者 Web 搜尋輔助函式 | Web 搜尋提供者註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` |
  提供者工具/架構相容性輔助函式 | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini 架構清理 + 診斷，以及 xAI 相容性輔助函式，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供者使用量輔助函式 | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` 和其他提供者使用量輔助函式 | | `plugin-sdk/provider-stream` |
  提供者串流包裝函式輔助函式 | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 串流包裝函式類型，以及共用 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助函式 | | `plugin-sdk/provider-transport-runtime` | 提供者傳輸輔助函式 | 原生提供者傳輸輔助函式，例如受防護擷取、傳輸訊息轉換和可寫入傳輸事件串流
  | | `plugin-sdk/keyed-async-queue` | 排序的非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助函式 | 媒體擷取/轉換/儲存輔助函式、ffprobe 支援的視訊維度探測和媒體承載建構器 | | `plugin-sdk/media-generation-runtime` | 共用媒體產生輔助函式 | 共用故障移轉輔助函式、候選選擇，以及圖片/視訊/音樂產生的遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解輔助函式 |
  媒體理解提供者類型以及提供者面向的圖片/音訊輔助函式匯出 | | `plugin-sdk/text-runtime` | 共用文字輔助函式 | 助理可見文字剝離、Markdown 轉譯/分塊/表格輔助函式、編修輔助函式、指令標籤輔助函式、安全文字公用程式，以及相關的文字/記錄輔助函式 | | `plugin-sdk/text-chunking` | 文字分塊輔助函式 | 傳出文字分塊輔助函式 | | `plugin-sdk/speech` | 語音輔助函式 |
  語音提供者類型以及提供者面向的指令、登錄、驗證輔助函式，以及 OpenAI 相容的 TTS 建構器 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音提供者類型、登錄、指令、正規化 | | `plugin-sdk/realtime-transcription` | 即時轉錄輔助函式 | 提供者類型、登錄輔助函式和共用 WebSocket 工作階段輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音輔助函式 |
  提供者類型、登錄/解析輔助函式、橋接器工作階段輔助函式、共用代理程式對話佇列、逐字稿/事件健康狀況、回音抑制和快速上下文諮詢輔助函式 | | `plugin-sdk/image-generation` | 圖片產生輔助函式 | 圖片產生提供者類型以及圖片資產/資料 URL 輔助函式和 OpenAI 相容的圖片提供者建構器 | | `plugin-sdk/image-generation-core` | 共用圖片產生核心 | 圖片產生類型、故障移轉、驗證和登錄輔助函式 | |
  `plugin-sdk/music-generation` | 音樂產生輔助函式 | 音樂產生提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂產生核心 | 音樂產生類型、故障移轉輔助函式、提供者查找和模型參考解析 | | `plugin-sdk/video-generation` | 視訊產生輔助函式 | 視訊產生提供者/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用視訊產生核心 | 視訊產生類型、故障移轉輔助函式、提供者查找和模型參考解析
  | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助函式 | 互動式回覆承載正規化/縮減 | | `plugin-sdk/channel-config-primitives` | 通道配置基本元件 | 狹窄通道配置架構基本元件 | | `plugin-sdk/channel-config-writes` | 通道配置寫入輔助函式 | 通道配置寫入授權輔助函式 | | `plugin-sdk/channel-plugin-common` | 共用通道前奏 | 共用通道外掛程式前奏匯出 | | `plugin-sdk/channel-status` | 通道狀態輔助函式 |
  共用通道狀態快照/摘要輔助函式 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助函式 | 允許清單配置編輯/讀取輔助函式 | | `plugin-sdk/group-access` | 群組存取輔助函式 | 共用群組存取決策輔助函式 | | `plugin-sdk/direct-dm` | 直接 DM 輔助函式 | 共用直接 DM 驗證/防護輔助函式 | | `plugin-sdk/extension-shared` | 共用擴充功能輔助函式 | 被動通道/狀態和環境代理輔助基本元件 | |
  `plugin-sdk/webhook-targets` | Webhook 目標輔助函式 | Webhook 目標登錄和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | Webhook 路徑輔助函式 | Webhook 路徑正規化輔助函式 | | `plugin-sdk/web-media` | 共用 Web 媒體輔助函式 | 遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | Zod 重新匯出 | 為外掛程式 SDK 消費者重新匯出的 `zod` | | `plugin-sdk/memory-core` | 捆綁記憶體核心輔助函式 |
  記憶體管理員/配置/檔案/CLI 輔助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行時外觀 | 記憶體索引/搜尋執行時外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入引擎 |
  記憶體嵌入合約、登錄存取、本機提供者和通用批次/遠端輔助函式；具體的遠端提供者位於其擁有的外掛程式中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態輔助函式 | 記憶體主機多模態輔助函式 | |
  `plugin-sdk/memory-core-host-query` | 記憶體主機查詢輔助函式 | 記憶體主機查詢輔助函式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機秘密輔助函式 | 記憶體主機秘密輔助函式 | | `plugin-sdk/memory-core-host-events` | 記憶體主機事件日誌輔助函式 | 記憶體主機事件日誌輔助函式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態輔助函式 | 記憶體主機狀態輔助函式 | |
  `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時 | 記憶體主機 CLI 執行時輔助函式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時 | 記憶體主機核心執行時輔助函式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時輔助函式 | 記憶體主機檔案/執行時輔助函式 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時別名 |
  記憶體主機核心執行時輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌別名 | 記憶體主機事件日誌輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時別名 | 記憶體主機檔案/執行時輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-markdown` | 受管理的 Markdown 輔助函式 | 針對記憶體相鄰外掛程式的共用受管理 Markdown 輔助函式 | |
  `plugin-sdk/memory-host-search` | 主動記憶體搜尋外觀 | 延遲主動記憶體搜尋管理員執行時外觀 | | `plugin-sdk/memory-host-status` | 記憶體主機狀態別名 | 記憶體主機狀態輔助函式的廠商中立別名 | | `plugin-sdk/testing` | 測試公用程式 | 舊版廣泛相容性統一入口；請偏重使用專注的測試子路徑，例如
  `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表特意列出了常見的遷移子集，而非完整的 SDK
表面。包含 200 多個入口點的完整清單位於
`scripts/lib/plugin-sdk-entrypoints.json`。

保留的捆綁外掛程式輔助縫隙已從公用 SDK
匯出對應中移除，明確記載的相容性外觀除外，例如為已發布的
`@openclaw/discord@2026.3.13` 套件保留的已棄用 `plugin-sdk/discord` shim。
特定擁有者的輔助程式位於擁有者的外掛程式套件內；共用的主機行為應透過通用 SDK
合約（如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`
和 `plugin-sdk/plugin-config-runtime`）進行移轉。

使用符合工作的最狹窄匯入。如果您找不到匯出，
請檢查 `src/plugin-sdk/` 處的原始碼，或詢問維護者哪個通用合約
應該擁有它。

## 主動棄用項目

適用於外掛程式 SDK、提供者合約、
執行時期表面和資訊清單的較狹窄棄用項目。每個項目目前仍然有效，但將在未來的主要版本中
移除。每個項目下方的條目會將舊 API 對應至其
正式取代項目。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **舊版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的簽章，相同的
    匯出 — 只是從較狹窄的子路徑匯入。`command-auth`
    將其重新匯出為相容性存根。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **舊版**：來自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的
    `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新版**：`resolveInboundMentionDecision({ facts, policy })` — 傳回
    單一決策物件，而不是兩個分開的呼叫。

    下游頻道外掛程式（Slack、Discord、Matrix、MS Teams）已經
    切換。

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是較舊
    頻道外掛程式的相容性填充層 (shim)。請勿在新程式碼中匯入它；請使用
    `openclaw/plugin-sdk/channel-runtime-context` 來註冊執行階段
    物件。

    `channelActions*` 中的 `openclaw/plugin-sdk/channel-actions` 協助程式已
    與原始的「actions」頻道匯出一同被棄用。請改為透過語意化的 `presentation` 介面公開功能——頻道
    外掛程式應宣告它們呈現的內容 (cards、buttons、selects)，而不是接受哪些原始的
    action 名稱。

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **舊版**：來自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` factory。

    **新版**：直接在提供者外掛程式上實作 `createTool(...)`。
    OpenClaw 不再需要 SDK 協助程式來註冊工具包裝函式。

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **舊版**：使用 `formatInboundEnvelope(...)` (以及
    `ChannelMessageForAgent.channelEnvelope`) 從傳入的頻道訊息建立扁平的純文字提示
    信封。

    **新版**：`BodyForAgent` 加上結構化的使用者情境區塊。頻道
    外掛程式會將路由中繼資料 (thread、topic、reply-to、reactions) 作為
    類型欄位附加，而不是將其串連到提示字串中。`formatAgentEnvelope(...)` 協助程式仍支援用於合成的
    面向助理的信封，但傳入的純文字信封即將被淘汰。

    受影響的區域：`inbound_claim`、`message_received`，以及任何對
    `channelEnvelope` 文字進行後處理的自訂
    頻道外掛程式。

  </Accordion>

  <Accordion title="提供者探索類型 → 提供者目錄類型">
    四個探索類型別名現在是目錄時代類型的輕量封裝：

    | 舊別名                 | 新類型                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外，還有傳統的 `ProviderCapabilities` 靜態包——提供者外掛應該使用明確的提供者 hooks，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是使用靜態物件。

  </Accordion>

  <Accordion title="思考策略 hooks → resolveThinkingProfile">
    **舊** (`ProviderThinkingPolicy` 上的三個獨立 hooks)：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新**：單一個 `resolveThinkingProfile(ctx)`，它回傳一個
    `ProviderThinkingProfile`，其中包含標準的 `id`、可選的 `label` 和
    排序的層級列表。OpenClaw 會依據設定檔排名自動降級過時的儲存值。

    實作一個 hook 而非三個。傳統的 hooks 在棄用期間仍可運作，但不會與設定檔結果組合。

  </Accordion>

  <Accordion title="外部 OAuth 提供者回退 → contracts.externalAuthProviders">
    **舊**：實作 `resolveExternalOAuthProfiles(...)` 而未
    在外掛清單中宣告提供者。

    **新**：在外掛清單中宣告 `contracts.externalAuthProviders`
    **並** 實作 `resolveExternalAuthProfiles(...)`。舊的「auth
    fallback」路徑會在執行時發出警告，並將被移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="提供者環境變數查詢 → setup.providers[].envVars">
    **舊版** manifest 欄位：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新版**：將相同的環境變數查詢對應到 manifest 上的 `setup.providers[].envVars`。
    這將設定/狀態環境變數的元資料整合在同一個地方，並避免僅為了回應環境變數查詢而啟動外掛執行時。

    `providerAuthEnvVars` 在棄用期結束前透過相容性配接器繼續受到支援。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **舊版**：三個分開的呼叫 -
    `api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、
    `api.registerMemoryRuntime(...)`。

    **新版**：在 memory-state API 上的一次呼叫 -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的插槽，單一註冊呼叫。附加的記憶體輔助程式
    （`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`、
    `registerMemoryEmbeddingProvider`）不受影響。

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    從 `src/plugins/runtime/types.ts` 仍然匯出的兩個舊版型別別名：

    | 舊                             | 新                               |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    執行時期方法 `readSession` 已棄用，請改用
    `getSessionMessages`。簽名相同；舊方法會呼叫新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **舊版**：`runtime.tasks.flow` (單數) 返回即時任務流程存取器。

    **新版**：`runtime.tasks.managedFlows` 保留受管 TaskFlow 變更
    運行時，供從流程建立、更新、取消或執行子任務的外掛使用。當外掛只需要
    基於 DTO 的讀取時，請使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">已涵蓋於上方的「如何遷移 → 將 Pi 工具結果擴充功能遷移至中介軟體」。為求完整性在此列出：已移除的 Pi 專用 `api.registerEmbeddedExtensionFactory(...)` 路徑已由 `api.registerAgentToolResultMiddleware(...)` 取代，並在 `contracts.agentToolResultMiddleware` 中提供明確的執行時期清單。</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    從 `openclaw/plugin-sdk` 重新匯出的 `OpenClawSchemaType` 現在是 `OpenClawConfig` 的單行別名。請優先使用標準名稱。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>擴充功能層級的棄用項目（在 `extensions/` 下的捆綁頻道/提供者外掛程式內部）會在其各自的 `api.ts` 和 `runtime-api.ts` barrels 中追蹤。它們不會影響第三方外掛程式合約，且未在此列出。如果您直接使用捆綁外掛程式的本地 barrel，請在升級前閱讀該 barrel 中的棄用註解。</Note>

## 移除時間表

| 時間               | 發生什麼事                                         |
| ------------------ | -------------------------------------------------- |
| **現在**           | 已棄用的介面會發出執行階段警告                     |
| **下一個主要版本** | 已棄用的介面將被移除；仍使用它們的外掛程式將會失敗 |

所有核心外掛程式皆已遷移。外部外掛程式應在下一個主要版本發布前完成遷移。

## 暫時抑制警告

在您進行遷移時，請設定這些環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這是一個暫時的權宜之計，並非永久解決方案。

## 相關

- [開始使用](/zh-Hant/plugins/building-plugins) - 建構您的第一個外掛
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 完整子路徑匯入參考
- [頻道外掛](/zh-Hant/plugins/sdk-channel-plugins) - 建構頻道外掛
- [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins) - 建構提供者外掛
- [外掛內部](/zh-Hant/plugins/architecture) - 架構深度剖析
- [外掛清單](/zh-Hant/plugins/manifest) - 清單架構參考

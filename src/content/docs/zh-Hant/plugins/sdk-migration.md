---
summary: "從舊版向後相容層遷移至現代化外掛 SDK"
title: "外掛 SDK 遷移"
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

- **`openclaw/plugin-sdk/compat`** - 一個重新匯出數十個
  協助函式的單一匯入。它的引入是為了讓較舊的基於 hook 的外掛在
  建構新外掛架構時仍能正常運作。
- **`openclaw/plugin-sdk/infra-runtime`** - 一個廣泛的執行時協助工具桶（barrel），
  混合了系統事件、心跳狀態、傳遞佇列、fetch/proxy 協助工具、
  檔案協助工具、核准類型以及不相關的公用程式。
- **`openclaw/plugin-sdk/config-runtime`** - 一個廣泛的設定相容性桶（barrel），
  在遷移期間仍包含已棄用的直接載入/寫入協助工具。
- **`openclaw/extension-api`** - 一座橋樑，讓外掛能直接存取
  主機端協助工具，例如嵌入式代理執行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一個已移除的僅限嵌入式執行器（embedded-runner-only）的捆綁
  擴充 hook，可用來觀察嵌入式執行器事件，例如
  `tool_result`。

這些廣泛的匯入介面現已**棄用**。它們在執行時仍然有效，
但新外掛不得使用它們，且現有外掛應在下一次主要發行版移除它們之前進行遷移。
僅限嵌入式執行器的擴充工廠
註冊 API 已被移除；請改用工具結果中介軟體。

OpenClaw 不會在引入替代方案的同一變更中移除或重新解讀已記載的插件行為。破壞性契約變更必須先經過相容性配接器、診斷、文件和棄用期。這適用於 SDK 匯入、清單欄位、設定 API、Hook 和執行時期註冊行為。

<Warning>向後相容層將在未來的主要發行版中移除。 屆時仍從這些介面匯入的外掛將會中斷運作。 舊版嵌入式擴充工廠註冊已無法載入。</Warning>

## 為何變更

舊方法導致了以下問題：

- **啟動緩慢** - 匯入一個輔助函式會載入數十個不相關的模組
- **循環相依** - 廣泛的重新匯出使得建立匯入循環變得容易
- **API 介面不明確** - 無法區分哪些匯出是穩定的，哪些是內部使用的

現代化的外掛 SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`)
都是一個具有明確目的和已記錄契約的小型、獨立模組。

用於捆綁頻道的舊版提供者便利縫隙（convenience seams）也已消失。
品牌化的頻道協助縫隙是私有的單一儲存庫（mono-repo）捷徑，而非穩定的
外掛契約。請改用狹窄的通用 SDK 子路徑。在捆綁的
外掛工作區內，將提供者擁有的協助工具保留在該外掛自己的 `api.ts` 或
`runtime-api.ts` 中。

目前的內建提供者範例：

- Anthropic 將 Claude 專用的串流協助工具保留在其自己的 `api.ts` /
  `contract-api.ts` 縫隙中
- OpenAI 將提供者建構器、預設模型協助工具和即時提供者
  建構器保留在其自己的 `api.ts` 中
- OpenRouter 將 provider builder 和 onboarding/config helper 保留在其自己的
  `api.ts` 中

## Talk 與即時語音遷移計畫

即時語音、電話、會議和瀏覽器 Talk 程式碼正在從 surface-local turn bookkeeping 遷移到由 `openclaw/plugin-sdk/realtime-voice` 匯出的共享 Talk session controller。新的 controller 接管了通用 Talk 事件封包、active turn 狀態、擷取狀態、輸出音訊狀態、近期事件歷史記錄以及過期 turn 拒絕。Provider 外掛應繼續擁有特定供應商的即時會話；surface 外掛應繼續擁有擷取、播放、電話和會議的特殊行為。

這次 Talk 遷移是有意進行徹底的中斷性變更：

1. 將共享 controller/runtime primitives 保留在
   `plugin-sdk/realtime-voice` 中。
2. 將捆綁的介面移至共享控制器：瀏覽器中繼、受控會議室移交、語音通話即時、語音通話串流 STT、Google Meet 即時，以及原生按鍵通話。
3. 使用最終的 `talk.session.*` 和
   `talk.client.*` API 取代舊的 Talk RPC 系列。
4. 在 Gateway `hello-ok.features.events` 中宣佈一個即時 Talk 事件頻道： `talk.event`。
5. 刪除舊的即時 HTTP 端點以及任何請求時指令覆寫路徑。

新程式碼不應直接呼叫 `createTalkEventSequencer(...)`，除非它是實作低階介面卡或測試裝置。建議優先使用共享 controller，這樣沒有 turn id 就無法發送 turn-scoped 事件，過期的 `turnEnd` /
`turnCancel` 呼叫無法清除較新的 active turn，且輸出音訊生命週期事件在電話、會議、瀏覽器轉送、受控房間移交和原生 Talk 用戶端之間保持一致。

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
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
```

瀏覽器擁有的 WebRTC/provider-websocket 會話使用 `talk.client.create`，因為瀏覽器擁有 provider 協商和媒體傳輸，而 Gateway 擁有憑證、指令和工具策略。`talk.session.*` 是 gateway-relay realtime、gateway-relay 轉錄和受控房間原生 STT/TTS 會話的通用 Gateway 管理介面。

將即時選擇器放置在 `talk.provider` /
`talk.providers` 旁邊的舊版配置應使用 `openclaw doctor --fix` 進行修復；runtime Talk 不會將 speech/TTS provider 配置重新解釋為即時 provider 配置。

支援的 `talk.session.create` 組合數量刻意保持很少：

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

| 方法                            | 適用於                                                  | 合約                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | 將 base64 PCM 音訊區塊附加到屬於同一個 Gateway 連線的提供者會話。                                                                                |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 開始一個受管理房間的使用者輪次。                                                                                                                 |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在過時輪次驗證後結束活躍輪次。                                                                                                                   |
| `talk.session.cancelTurn`       | 所有 Gateway 擁有的會話                                 | 取消某個輪次的活躍擷取/提供者/代理/TTS 工作。                                                                                                    |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助理音訊輸出，而不一定結束使用者輪次。                                                                                                       |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成中繼器發出的提供者工具呼叫；傳遞 `options.willContinue` 以取得暫時性輸出，或傳遞 `options.suppressResponse` 以滿足呼叫而無需另一個助理回應。 |
| `talk.session.steer`            | 由 Agent 支援的 Talk 會話                               | 將口語 `status`、`steer`、`cancel` 或 `followup` 控制傳送至從 Talk 會話解析出的現用嵌入式執行。                                                  |
| `talk.session.close`            | 所有統一會話                                            | 停止中繼會話或撤銷受管理房間狀態，然後忘記統一會話 ID。                                                                                          |

請勿在核心中引入供應商或平台特殊情況來實現此功能。
核心擁有 Talk 會話語義。供應商外掛擁有供應商會話設定。
通話 和 Google Meet 擁有電話會議/會議配接器。瀏覽器和原生應用程式擁有裝置擷取/播放 UX。

## 相容性政策

對於外部外掛，相容性工作遵循以下順序：

1. 加入新的合約
2. 透過相容性配接器保持舊行為的連線
3. 發出診斷或警告，指出舊路徑和替代方案
4. 在測試中涵蓋兩條路徑
5. 記錄棄用和遷移路徑
6. 僅在宣佈的遷移期結束後移除，通常是在主要版本中

維護者可以使用 `pnpm plugins:boundary-report` 來稽核目前的遷移佇列。使用 `pnpm plugins:boundary-report:summary` 取得簡潔的計數、`--owner <id>` 針對單一外掛或相容性負責人，以及當 CI 閘道因過期的相容性記錄、跨負責人的保留 SDK 匯入，或未使用的保留 SDK 子路徑而應失敗時使用 `pnpm plugins:boundary-report:ci`。報告會依移除日期將已棄用的相容性記錄分組、計算本機程式碼/文件參考數量、列出跨負責人的保留 SDK 匯入，並總結私有的 memory-host SDK 橋接，讓相容性清理工作保持明確，而不依賴臨時搜尋。保留的 SDK 子路徑必須具有追蹤的負責人使用狀況；未使用的保留輔助匯出應從公開 SDK 中移除。

如果仍然接受清單欄位，外掛作者可以繼續使用它，直到文件和診斷另有指示為止。新程式碼應優先使用記錄的替代方案，但現有外掛在普通的次要版本期間不應中斷。

## 如何遷移

<Steps>
  <Step title="遷移執行時配置載入/寫入輔助函式">
    附屬插件應停止直接呼叫
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。應優先使用已傳入至目前呼叫路徑的配置。需要目前進程快照的長期處理程序可以使用 `api.runtime.config.current()`。長期運作的代理程式工具應在 `execute` 內使用工具情境的 `ctx.getRuntimeConfig()`，以便在寫入配置前建立的工具仍能看見重新整理後的執行時配置。

    寫入配置必須透過事務性輔助函式並選擇寫入後原則：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    當呼叫端知道變更需要乾淨地重新啟動閘道時，請使用 `afterWrite: { mode: "restart", reason: "..." }`；並且僅當呼叫端擁有後續處理權並刻意想要抑制重新載入規劃程式時，才使用 `afterWrite: { mode: "none", reason: "..." }`。變動結果包含用於測試和記錄的型別化 `followUp` 摘要；閘道仍負責套用或排程重新啟動。`loadConfig` 和 `writeConfigFile` 在遷移期間仍作為已棄用的相容性輔助函式供外部插件使用，並會帶有 `runtime-config-load-write` 相容性代碼發出一次警告。附屬插件和存放庫執行時程式碼受到 `pnpm check:deprecated-api-usage` 和
    `pnpm check:no-runtime-action-load-config` 中掃描器防護措施的保護：新的生產環境插件用法會直接失敗，直接寫入配置會失敗，閘道伺服器方法必須使用請求執行時快照，執行時通道 send/action/client 輔助函式必須從其邊界接收配置，且長期運作的執行時模組不允許任何周邊 `loadConfig()` 呼叫。

    新的插件程式碼也應避免匯入廣泛的
    `openclaw/plugin-sdk/config-runtime` 相容性桶檔。請使用符合工作需求的狹隘 SDK 子路徑：

    | 需求 | 匯入 |
    | --- | --- |
    | 諸如 `OpenClawConfig` 的配置型別 | `openclaw/plugin-sdk/config-contracts` |
    | 已載入的配置斷言和插件項目配置查詢 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 目前執行時快照讀取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 寫入配置 | `openclaw/plugin-sdk/config-mutation` |
    | 工作階段儲存輔助函式 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 群組原則執行時輔助函式 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密碼輸入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/工作階段覆寫 | `openclaw/plugin-sdk/model-session-runtime` |

    附屬插件及其測試對廣泛桶檔具有掃描器防護，因此匯入和模擬會限制在其所需的行為範圍內。廣泛桶檔為了外部相容性仍然存在，但新程式碼不應依賴它。

  </Step>

  <Step title="將內嵌工具結果擴充功能遷移至中介軟體">
    隨附的外掛必須將僅限 embedded-runner 的
    `api.registerEmbeddedExtensionFactory(...)` tool-result 處理程式替換為
    執行時期中立的中介軟體。

    ```typescript
    // OpenClaw and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["openclaw", "codex"],
    });
    ```

    同時更新外掛清單：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["openclaw", "codex"]
      }
    }
    ```

    外部外掛無法註冊 tool-result 中介軟體，因為它可以在模型看到之前重寫高信任度的工具輸出。

  </Step>

  <Step title="將原生核取處理程式遷移至功能事實">
    具備核取功能的頻道外掛現在透過
    `approvalCapability.nativeRuntime` 以及共用的執行時期環境登錄檔來公開原生核取行為。

    主要變更：

    - 以 `approvalCapability.nativeRuntime` 取代
      `approvalCapability.handler.loadRuntime(...)`
    - 將核取專用的認證/傳遞作業從舊版 `plugin.auth` /
      `plugin.approvals` 連線移至 `approvalCapability`
    - `ChannelPlugin.approvals` 已從公開的頻道外掛
      合約中移除；將傳遞/原生/呈現欄位移至 `approvalCapability`
    - `plugin.auth` 僅保留給頻道登入/登出流程；核心不再讀取該處的核取認證掛鉤
    - 透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊頻道擁有的執行時期物件，例如用戶端、權杖或 Bolt
      應用程式
    - 請勿從原生核取處理程式傳送外掛擁有的重新路由通知；
      核心現在擁有來自實際傳遞結果的 routed-elsewhere 通知
    - 將 `channelRuntime` 傳入 `createChannelManager(...)` 時，請提供
      真實的 `createPluginRuntime().channel` 介面。部分存根會被拒絕。

    請參閱 `/plugins/sdk-channel-plugins` 以了解目前的核取功能
    佈局。

  </Step>

  <Step title="稽核 Windows 包裝函式後備行為">
    如果您的外掛程式使用 `openclaw/plugin-sdk/windows-spawn`，除非您明確傳遞
    `allowShellFallback: true`，否則未解析的 Windows
    `.cmd`/`.bat` 包裝函式現在將會失敗並封閉。

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

    如果您的呼叫端並非刻意依賴 shell 後備機制，請不要設定
    `allowShellFallback`，改為處理擲回的錯誤。

  </Step>

  <Step title="尋找已淘汰的匯入">
    在您的外掛程式中搜尋來自任一已淘汰介面的匯入：

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

    對於主機端協助程式，請使用注入的外掛程式執行時，而不是直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
    ```

    相同的模式也適用於其他舊版橋接協助程式：

    | 舊匯入 | 現代對等項目 |
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
    `openclaw/plugin-sdk/infra-runtime` 仍然存在以保持外部
    相容性，但新程式碼應匯入其實際需要的專用輔助介面：

    | 需求 | 匯入 |
    | --- | --- |
    | 系統事件佇列輔助函式 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳喚醒、事件和可見性輔助函式 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待處理傳送佇列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 頻道活動遙測 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 記憶體內去重快取 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本機檔案/媒體路徑輔助函式 | `openclaw/plugin-sdk/file-access-runtime` |
    | 分派器感知的擷取 | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和防護擷取輔助函式 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 分派器原則類型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 核准請求/解決類型 | `openclaw/plugin-sdk/approval-runtime` |
    | 核准回應承載和指令輔助函式 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 錯誤格式化輔助函式 | `openclaw/plugin-sdk/error-runtime` |
    | 傳輸就緒等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全權杖輔助函式 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界非同步工作並行 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 數值強制轉換 | `openclaw/plugin-sdk/number-runtime` |
    | 程序本機非同步鎖 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 檔案鎖 | `openclaw/plugin-sdk/file-lock` |

    捆綁的外掛程式會掃描並防護 `infra-runtime`，因此程式庫程式碼
    無法回退到廣泛的桶裡匯入。

  </Step>

  <Step title="遷移通道路由輔助函數">
    新的通道路由程式碼應使用 `openclaw/plugin-sdk/channel-route`。
    較舊的 route-key 和 comparable-target 名稱在遷移期間將作為相容性別名保留，但新外掛程式應使用直接描述行為的路由名稱：

    | 舊輔助函數 | 現代輔助函數 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    現代路由輔助函數在原生審核、回覆隱藏、入站去重、Cron 傳遞和會話路由中，一致地對 `{ channel, to, accountId, threadId }` 進行正規化。

    請勿新增 `ChannelMessagingAdapter.parseExplicitTarget` 的用法
    或基於解析器的 loaded-route 輔助函數（`parseExplicitTargetForLoadedChannel`
    或 `resolveRouteTargetForLoadedChannel`）
    或來自 `plugin-sdk/channel-route` 的 `resolveChannelRouteTargetWithParser(...)`。
    這些 Hook 已被棄用，僅在遷移期間為較舊的外掛程式保留。新的通道外掛程式應使用
    `messaging.targetResolver.resolveTarget(...)` 進行目標 ID 正規化
    和目錄未命中回退，當核心需要早期的節點類型時使用 `messaging.inferTargetChatType(...)`，並使用 `messaging.resolveOutboundSessionRoute(...)`
    來處理提供者原生的會話和執行緒身分識別。

  </Step>

  <Step title="建置與測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="通用匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準插件入口輔助函式 | `definePluginEntry` | | `plugin-sdk/core` | 適用於頻道入口定義/建構器的舊版傘形重新匯出 | `defineChannelPluginEntry`、`createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者入口輔助函式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的頻道入口定義與建構器 | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` | | `plugin-sdk/setup` | 共用的設定精靈輔助函式 | Setup translator、allowlist prompts、setup status builders | | `plugin-sdk/setup-runtime` | 設定期間的執行時輔助函式 |
  `createSetupTranslator`、匯入安全的設定修補程式介面卡、lookup-note 輔助函式、`promptResolvedAllowFrom`、`splitSetupEntries`、委派的設定代理程式 | | `plugin-sdk/setup-adapter-runtime` | 已棄用的設定介面卡別名 | 使用 `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | 設定工具輔助函式 |
  `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` | | `plugin-sdk/account-core` | 多帳號輔助函式 | 帳號清單/配置/動作閘道輔助函式 | | `plugin-sdk/account-id` | 帳號 ID 輔助函式 | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化 | | `plugin-sdk/account-resolution` | 帳號查詢輔助函式 | 帳號查詢 + 預設後援輔助函式 | | `plugin-sdk/account-helpers` |
  狹窄帳號輔助函式 | 帳號清單/帳號動作輔助函式 | | `plugin-sdk/channel-setup` | 設定精靈介面卡 | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對原語 | `createChannelPairingController` | |
  `plugin-sdk/channel-reply-pipeline` | 回覆前綴、輸入中和來源傳遞佈線 | `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | 配置介面卡工廠與 DM 存取輔助函式 | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` | |
  `plugin-sdk/channel-config-schema` | 配置架構建構器 | 僅限共用的頻道配置架構原語和通用建構器 | | `plugin-sdk/bundled-channel-config-schema` | 捆綁的配置架構 | 僅限 OpenClaw 維護的捆綁插件；新插件必須定義外掛本地架構 | | `plugin-sdk/channel-config-schema-legacy` | 已棄用的捆綁配置架構 | 僅限相容性別名；針對已維護的捆綁插件請使用 `plugin-sdk/bundled-channel-config-schema` | |
  `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助函式 | 指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/inbound-envelope` | 內部信封輔助函式 | 共用的路由 + 信封建構器輔助函式 | |
  `plugin-sdk/channel-inbound` | 內部接收輔助函式 | 上下文建構、格式設定、根、執行器、準備好的回覆分派，以及分派述詞 | | `plugin-sdk/messaging-targets` | 已棄用的目標解析匯入路徑 | 使用 `plugin-sdk/channel-targets` 以取得通用目標解析輔助函式、`plugin-sdk/channel-route` 以取得路由比較，以及外掛擁有的 `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` 以取得提供者特定的目標解析 | |
  `plugin-sdk/outbound-media` | 外部媒體輔助函式 | 共用的外部媒體載入 | | `plugin-sdk/outbound-send-deps` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/channel-outbound` | 外部訊息生命週期輔助函式 | 訊息介面卡、收據、持久傳送輔助函式、即時預覽/串流輔助函式、回覆選項、生命週期輔助函式、外部身分識別，以及承載計劃 | | `plugin-sdk/channel-streaming` | 已棄用的相容性外觀 |
  使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/outbound-runtime` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結輔助函式 | 執行緒繫結生命週期與介面卡輔助函式 | | `plugin-sdk/agent-media-payload` | 舊版媒體承載輔助函式 | 適用於舊版欄位配置的 Agent 媒體承載建構器 | | `plugin-sdk/channel-runtime` | 已棄用的相容性修補層 |
  僅限舊版頻道執行時期公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久性外掛儲存體 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛的執行時輔助函式 | 執行時期/記錄/備份/外掛安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹窄的執行時期環境輔助函式 | 記錄器/執行時期環境、逾時、重試，以及退避輔助函式 | |
  `plugin-sdk/plugin-runtime` | 共用的外掛執行時輔助函式 | 外掛指令/Hooks/HTTP/互動輔助函式 | | `plugin-sdk/hook-runtime` | Hook 管線輔助函式 | 共用的 webhook/內部 hook 管線輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲執行時輔助函式 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | |
  `plugin-sdk/process-runtime` | 處理程序輔助函式 | 共用的 exec 輔助函式 | | `plugin-sdk/cli-runtime` | CLI 執行時輔助函式 | 指令格式設定、等候、版本輔助函式 | | `plugin-sdk/gateway-runtime` | 閘道輔助函式 | 閘道用戶端、事件循環就緒的啟動輔助函式，以及頻道狀態修補輔助函式 | | `plugin-sdk/config-runtime` | 已棄用的配置相容性修補層 | 偏好使用
  `config-contracts`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助函式 | 當捆綁的 Telegram 合約介面無法使用時，提供後援穩定的 Telegram 指令驗證輔助函式 | | `plugin-sdk/approval-runtime` | 核准提示輔助函式 | Exec/外掛核准承載、核准功能/設定檔輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示路徑格式設定 |
  | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助函式 | 核准者解析、相同聊天動作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助函式 | 原生 exec 核准設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 核准傳遞輔助函式 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助函式 | 共用的核准閘道解析輔助函式 | |
  `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助函式 | 適用於熱頻道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 核准處理常式輔助函式 | 更廣泛的核准處理常式執行時輔助函式；若足夠，請優先使用較狹窄的介面卡/閘道邊界 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助函式 | 原生核准目標/帳號繫結輔助函式 | | `plugin-sdk/approval-reply-runtime`
  | 核准回覆輔助函式 | Exec/外掛核准回覆承載輔助函式 | | `plugin-sdk/channel-runtime-context` | 頻道執行時期內容輔助函式 | 通用頻道執行時期內容暫存器/取得/監看輔助函式 | | `plugin-sdk/security-runtime` | 安全性輔助函式 | 共用的信任、DM 閘道、以根為界界的檔案/路徑輔助函式、外部內容，以及秘密蒐集輔助函式 | | `plugin-sdk/ssrf-policy` | SSRF 原則輔助函式 | 主機允許清單和私用網路原則輔助函式 | |
  `plugin-sdk/ssrf-runtime` | SSRF 執行時輔助函式 | 固定分派器、防護式擷取、SSRF 原則輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件輔助函式 | `enqueueSystemEvent`、`peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | 心跳輔助函式 | 心跳喚醒、事件和可見性輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 傳遞佇列輔助函式 | `drainPendingDeliveries` | |
  `plugin-sdk/channel-activity-runtime` | 頻道活動輔助函式 | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | 重複資料刪除輔助函式 | 記憶體內重複資料刪除快取 | | `plugin-sdk/file-access-runtime` | 檔案存取輔助函式 | 安全的本機檔案/媒體路徑輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒輔助函式 | `waitForTransportReady` | | `plugin-sdk/exec-approvals-runtime` | Exec
  核准原則輔助函式 | `loadExecApprovals`、`resolveExecApprovalsFromFile`、`ExecApprovalsFile` | | `plugin-sdk/collection-runtime` | 有界快取輔助函式 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘道輔助函式 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式設定輔助函式 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖形輔助函式
  | | `plugin-sdk/fetch-runtime` | 包裝的擷取/ Proxy 輔助函式 | `resolveFetch`、Proxy 輔助函式、EnvHttpProxyAgent 選項輔助函式 | | `plugin-sdk/host-runtime` | 主機正規化輔助函式 | `normalizeHostname`、`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助函式 | `RetryConfig`、`retryAsync`、原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式設定與輸入對應 |
  `formatAllowFromLowercase`、`mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道與指令介面輔助函式 | `resolveControlCommandGate`、寄件者授權輔助函式、指令登錄輔助函式，包括動態引數選單格式設定 | | `plugin-sdk/command-status` | 指令狀態/說明轉譯器 | `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 秘密輸入解析 |
  秘密輸入輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助函式 | Webhook 目標公用程式 | | `plugin-sdk/webhook-request-guards` | Webhook 內文防護輔助函式 | 要求內文讀取/限制輔助函式 | | `plugin-sdk/reply-runtime` | 共用的回覆執行時期 | 內部分派、心跳、回覆規劃器、分塊 | | `plugin-sdk/reply-dispatch-runtime` | 狹窄的回覆分派輔助函式 | 完成、提供者分派和交談標籤輔助函式 | |
  `plugin-sdk/reply-history` | 回覆記錄輔助函式 | `createChannelHistoryWindow`；已棄用的地圖輔助函式相容性匯出，例如 `buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參照規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回覆區塊輔助函式 | 文字/Markdown 分塊輔助函式 | |
  `plugin-sdk/session-store-runtime` | 工作階段存放區輔助函式 | 存放區路徑 + updated-at 輔助函式 | | `plugin-sdk/state-paths` | 狀態路徑輔助函式 | 狀態和 OAuth 目錄輔助函式 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助函式 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助函式 | | `plugin-sdk/status-helpers` | 頻道狀態輔助函式 |
  頻道/帳號狀態摘要建構器、執行時期狀態預設值、問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 目標解析器輔助函式 | 共用的目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助函式 | Slug/字串正規化輔助函式 | | `plugin-sdk/request-url` | 要求 URL 輔助函式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助函式 | 具有已正規化
  stdout/stderr 的計時指令執行器 | | `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 工具承載擷取 | 從工具結果物件中擷取已正規化的承載 | | `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助函式 | 共用的暫存下載路徑輔助函式 | | `plugin-sdk/logging-core` | 記錄輔助函式 |
  子系統記錄器和編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助函式 | Markdown 表格模式輔助函式 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆承載類型 | | `plugin-sdk/provider-setup` | 針對本地/自託管提供者的設定輔助函式 | 自託管提供者探索/配置輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 針對相容 OpenAI 的自託管提供者的專注設定輔助函式 |
  相同的自託管提供者探索/配置輔助函式 | | `plugin-sdk/provider-auth-runtime` | 提供者執行時驗證輔助函式 | 執行時期 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設定輔助函式 | API 金鑰上架/設定檔寫入輔助函式 | | `plugin-sdk/provider-auth-result` | 提供者驗證結果輔助函式 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-selection-runtime` | 提供者選取輔助函式 |
  已設定或自動的提供者選取以及原始提供者配置合併 | | `plugin-sdk/provider-env-vars` | 提供者環境變數輔助函式 | 提供者驗證環境變數查閱輔助函式 | | `plugin-sdk/provider-model-shared` | 共用的提供者模型/重播輔助函式 | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用的重播原則建構器、提供者端點輔助函式，以及模型 ID 正規化輔助函式 | |
  `plugin-sdk/provider-catalog-shared` | 共用的提供者類別輔助函式 | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供者上架修補程式 | 上架配置輔助函式 | | `plugin-sdk/provider-http` | 提供者 HTTP 輔助函式 | 通用的提供者
  HTTP/端點功能輔助函式，包括音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch` | 提供者 Web 擷取輔助函式 | Web 擷取提供者註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 提供者 Web 搜尋配置輔助函式 | 針對不需要外掛啟用佈線的提供者，提供狹窄的 Web 搜尋配置/憑證輔助函式 | | `plugin-sdk/provider-web-search-contract` | 提供者 Web 搜尋合約輔助函式 | 狹窄的 Web
  搜尋配置/憑證合約輔助函式，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 提供者 Web 搜尋輔助函式 | Web 搜尋提供者註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | 提供者工具/架構相容輔助函式 |
  `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek/Gemini/OpenAI 架構清理 + 診斷 | | `plugin-sdk/provider-usage` | 提供者使用量輔助函式 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage`，以及其他提供者使用量輔助函式 | | `plugin-sdk/provider-stream` | 提供者串流包裝函式輔助函式 |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝函式類型，以及共用的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助函式 | | `plugin-sdk/provider-transport-runtime` | 提供者傳輸輔助函式 | 原生提供者傳輸輔助函式，例如防護式擷取、傳輸訊息轉換，以及可寫入的傳輸事件串流 | |
  `plugin-sdk/keyed-async-queue` | 排序的非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用的媒體輔助函式 | 媒體擷取/轉換/儲存輔助函式、ffprobe 支援的影片維度探查，以及媒體承載建構器 | | `plugin-sdk/media-generation-runtime` | 共用的媒體產生輔助函式 | 針對影像/影片/音樂產生的共用故障移轉輔助函式、候選項選取，以及遺失模型傳訊 | | `plugin-sdk/media-understanding` | 媒體理解輔助函式
  | 媒體理解提供者類型加上提供者端影像/音訊輔助函式匯出 | | `plugin-sdk/text-runtime` | 已棄用的廣泛文字相容性匯出 | 使用 `string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core` | | `plugin-sdk/text-chunking` | 文字分塊輔助函式 | 外部文字分塊輔助函式 | | `plugin-sdk/speech` | 語音輔助函式 | 語音提供者類型加上提供者端指令、登錄、驗證輔助函式，以及相容 OpenAI 的 TTS 建構器
  | | `plugin-sdk/speech-core` | 共用的語音核心 | 語音提供者類型、登錄、指令、正規化 | | `plugin-sdk/realtime-transcription` | 即時轉錄輔助函式 | 提供者類型、登錄輔助函式，以及共用的 WebSocket 工作階段輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音輔助函式 | 提供者類型、登錄/解析輔助函式、橋接器工作階段輔助函式、共用的 Agent
  說話回傳佇列、主動執行語音控制、轉錄/事件健全狀況、迴音抑制、諮詢問題比對、強制諮詢協調、回合內容追蹤、輸出活動追蹤，以及快速內容諮詢輔助函式 | | `plugin-sdk/image-generation` | 影像產生輔助函式 | 影像產生提供者類型加上影像資產/資料 URL 輔助函式，以及相容 OpenAI 的影像提供者建構器 | | `plugin-sdk/image-generation-core` | 共用的影像產生核心 | 影像產生類型、故障移轉、驗證和登錄輔助函式 | |
  `plugin-sdk/music-generation` | 音樂產生輔助函式 | 音樂產生提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用的音樂產生核心 | 音樂產生類型、故障移轉輔助函式、提供者查閱，以及模型參照解析 | | `plugin-sdk/video-generation` | 影片產生輔助函式 | 影片產生提供者/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用的影片產生核心 |
  影片產生類型、故障移轉輔助函式、提供者查閱，以及模型參照解析 | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助函式 | 互動式回覆承載正規化/縮減 | | `plugin-sdk/channel-config-primitives` | 頻道配置原語 | 狹窄的頻道配置架構原語 | | `plugin-sdk/channel-config-writes` | 頻道配置寫入輔助函式 | 頻道配置寫入授權輔助函式 | | `plugin-sdk/channel-plugin-common` | 共用的頻道前奏 |
  共用的頻道外掛前奏匯出 | | `plugin-sdk/channel-status` | 頻道狀態輔助函式 | 共用的頻道狀態快照/摘要輔助函式 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助函式 | 允許清單配置編輯/讀取輔助函式 | | `plugin-sdk/group-access` | 群組存取輔助函式 | 共用的群組存取決策輔助函式 | | `plugin-sdk/direct-dm`、`plugin-sdk/direct-dm-access` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-inbound` | |
  `plugin-sdk/direct-dm-guard-policy` | 直接 DM 防護輔助函式 | 狹窄的加密前防護原則輔助函式 | | `plugin-sdk/extension-shared` | 共用的擴充功能輔助函式 | 被動頻道/狀態和環境 Proxy 輔助函式原語 | | `plugin-sdk/webhook-targets` | Webhook 目標輔助函式 | Webhook 目標登錄和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | 已棄用的 Webhook 路徑別名 | 使用 `plugin-sdk/webhook-ingress` | |
  `plugin-sdk/web-media` | 共用的 Web 媒體輔助函式 | 遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 已棄用的 Zod 相容性重新匯出 | 直接從 `zod` 匯入 `zod` | | `plugin-sdk/memory-core` | 捆綁的記憶體核心輔助函式 | 記憶體管理員/配置/檔案/CLI 輔助函式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行時外觀 | 記憶體索引/搜尋執行時外觀 | | `plugin-sdk/memory-core-host-engine-foundation`
  | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機內嵌引擎 | 記憶體內嵌合約、登錄存取、本機提供者，以及通用批次/遠端輔助函式；具體的遠端提供者位於其所擁有的外掛中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 |
  記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態輔助函式 | 記憶體主機多模態輔助函式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢輔助函式 | 記憶體主機查詢輔助函式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機秘密輔助函式 | 記憶體主機秘密輔助函式 | | `plugin-sdk/memory-core-host-events` | 已棄用的記憶體事件別名 | 使用
  `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態輔助函式 | 記憶體主機狀態輔助函式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期 | 記憶體主機 CLI 執行時輔助函式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期 | 記憶體主機核心執行時輔助函式 | | `plugin-sdk/memory-core-host-runtime-files` |
  記憶體主機檔案/執行時輔助函式 | 記憶體主機檔案/執行時輔助函式 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時別名 | 記憶體主機核心執行時輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌別名 | 記憶體主機事件日誌輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的記憶體檔案/執行時別名 | 使用 `plugin-sdk/memory-core-host-runtime-files` | |
  `plugin-sdk/memory-host-markdown` | 受控 Markdown 輔助函式 | 針對記憶體相鄰外掛的共用受控 Markdown 輔助函式 | | `plugin-sdk/memory-host-search` | 主動記憶體搜尋外觀 | 延遲主動記憶體搜尋管理員執行時外觀 | | `plugin-sdk/memory-host-status` | 已棄用的記憶體主機狀態別名 | 使用 `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | 測試公用程式 |
  存放區本機已棄用的相容性桶；使用專注的存放區本機測試子路徑，例如 `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表格特意列出了常見的遷移子集，而非完整的 SDK
介面。編譯器入口點清單位於
`scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從
公開子集生成的。

預留的捆綁外掛程式輔助接縫已從公開 SDK
匯出對應表中移除，但明確記載的相容性外觀除外，例如為已發布的
`@openclaw/discord@2026.3.13` 套件保留的已棄用 `plugin-sdk/discord` shim。特定擁有者的輔助程式位於
擁有者外掛程式套件內；共用主機行為應透過通用 SDK
合約（例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`
和 `plugin-sdk/plugin-config-runtime`）來移轉。

請使用符合工作需求的最狹窄匯入。如果您找不到匯出項目，
請檢查 `src/plugin-sdk/` 處的原始碼，或詢問維護者應由哪個通用合約
來擁有它。

## 目前的棄用項目

適用於整個外掛程式 SDK、提供者合約、執行時表面與資訊清單的更精確棄用項目。每個項目目前仍可運作，但會在未來的主要版本中移除。每個項目下方的條目會將舊 API 對應至其標準取代項目。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **舊版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的簽章，相同的
    匯出項目 — 僅從更狹窄的子路徑匯入。`command-auth`
    將其作為相容性存根重新匯出。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **舊版**：`resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)` 來自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating`。

    **新版**：`resolveInboundMentionDecision({ facts, policy })` — 傳回單一
    決策物件，而非兩個分開的呼叫。

    下游通道外掛程式（Slack、Discord、Matrix、MS Teams）已經
    完成切換。

  </Accordion>

  <Accordion title="通道運行時填充層與通道操作輔助程式">
    `openclaw/plugin-sdk/channel-runtime` 是舊版
    通道外掛程式的相容性填充層。請勿在新程式碼中匯入它；請使用
    `openclaw/plugin-sdk/channel-runtime-context` 來註冊執行階段
    物件。

    `channelActions*` 中的 `openclaw/plugin-sdk/channel-actions` 輔助程式
    已隨著原始「操作」通道匯出一同被棄用。請透過語意化的 `presentation` 介面來公開功能
    — 通道外掛程式宣告它們渲染的內容（卡片、按鈕、選取器），而不是它們接受的原始
    操作名稱。

  </Accordion>

  <Accordion title="網頁搜尋提供者 tool() 輔助程式 → 外掛程式上的 createTool()">
    **舊版**：來自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` factory。

    **新版**：直接在提供者外掛程式上實作 `createTool(...)`。
    OpenClaw 不再需要 SDK 輔助程式來註冊工具包裝函式。

  </Accordion>

  <Accordion title="純文字通道信封 → BodyForAgent">
    **舊版**：使用 `formatInboundEnvelope(...)`（和
    `ChannelMessageForAgent.channelEnvelope`） 從傳入通道訊息建立扁平的純文字提示
    信封。

    **新版**：使用 `BodyForAgent` 加上結構化的使用者情境區塊。通道
    外掛程式將路由元資料（主題串、話題、回覆對象、反應）作為
    具型別欄位附加，而不是將其串接成提示字串。
    `formatAgentEnvelope(...)` 輔助程式仍支援用於合成
    助理面向的信封，但傳入純文字信封即將被淘汰。

    受影響的區域：`inbound_claim`、`message_received`，以及任何
    對 `channelEnvelope` 文字進行後續處理的自訂
    通道外掛程式。

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **舊版**: `api.on("deactivate", handler)`。

    **新版**: `api.on("gateway_stop", handler)`。事件和上下文是
    相同的關機清理約定；僅鉤子名稱變更。

    ```typescript
    // Before
    api.on("deactivate", async (event, ctx) => {
      await stopPluginService(ctx);
    });

    // After
    api.on("gateway_stop", async (event, ctx) => {
      await stopPluginService(ctx);
    });
    ```

    `deactivate` 在 2026-08-16
    之前仍保持為已棄用的相容性別名。

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    四個探索型別別名現在是目錄時代型別的
    薄層包裝器：

    | 舊別名                 | 新型別                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外，舊版 `ProviderCapabilities` 靜態物件 — 提供者外掛
    應使用明確的提供者鉤子，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而非靜態物件。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **舊版** (`ProviderThinkingPolicy` 上的三個獨立 hooks)：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：單一 `resolveThinkingProfile(ctx)`，其回傳包含
    標準 `id`、可選 `label` 和
    排序層級清單的 `ProviderThinkingProfile`。OpenClaw 會根據設定檔
    排序自動降級過時的儲存值。

    Context 包含 `provider`、`modelId`、可選合併的 `reasoning`
    以及可選合併的模型 `compat` facts。提供者外掛只有在設定的
    請求合約支援時，才能使用這些目錄 facts 來公開特定模型的設定檔。

    實作一個 hook 而非三個。舊版 hooks 在淘汰期間仍能運作，
    但不會與設定檔結果組合。

  </Accordion>

  <Accordion title="External auth providers → contracts.externalAuthProviders">
    **舊版**：實作外部認證 hooks 而未在外掛清單中宣告提供者。

    **新版**：在外掛清單中宣告 `contracts.externalAuthProviders`
    **並** 實作 `resolveExternalAuthProfiles(...)`。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **舊版** 清單欄位：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新版**：將相同的環境變數查詢映射到清單上的
    `setup.providers[].envVars`。這會將設定/狀態環境元資料整合在同一個
    地點，並避免僅為了回應環境變數
    查詢而啟動外掛執行時。

    `providerAuthEnvVars` 在淘汰期間結束前仍透過相容性配接器
    獲得支援。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **舊版**：三個獨立的呼叫 -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`。

    **新版**：在 memory-state API 上的單一呼叫 -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的插槽，單一註冊呼叫。附加的 prompt 和 corpus 輔助工具
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) 不
    受影響。

  </Accordion>

  <Accordion title="Memory embedding provider API">
    **舊版**：`api.registerMemoryEmbeddingProvider(...)` 加上
    `contracts.memoryEmbeddingProviders`。

    **新版**：`api.registerEmbeddingProvider(...)` 加上
    `contracts.embeddingProviders`。

    通用嵌入提供者合約可在記憶體之外重複使用，並且是新提供者的支援路徑。記憶體特定的註冊 API 在現有提供者遷移時仍作為已棄用的相容性連線。外掛程式檢查會將非打包的使用報告為相容性債務。

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    從 `src/plugins/runtime/types.ts` 匯出的兩個舊版類型別名：

    | 舊版                           | 新版                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    執行時期方法 `readSession` 已棄用，建議改用
    `getSessionMessages`。簽章相同；舊方法會呼叫新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **舊版**：`runtime.tasks.flow` (單數) 傳回即時 task-flow 存取器。

    **新版**：`runtime.tasks.managedFlows` 為從流程建立、更新、取消或執行子任務的外掛程式保留受管理的 TaskFlow 變更
    執行時期。當外掛程式只需要基於 DTO 的讀取時，請使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="嵌入式擴充工廠 → Agent 工具結果中介軟體">已在上方「如何遷移 → 將嵌入式工具結果擴充遷移至中介軟體」中涵蓋。為求完整在此說明：僅限嵌入式執行器的 `api.registerEmbeddedExtensionFactory(...)` 路徑已被取代為 `api.registerAgentToolResultMiddleware(...)`，並在 `contracts.agentToolResultMiddleware` 中提供明確的執行時期列表。</Accordion>

  <Accordion title="OpenClawSchemaType 別名 → OpenClawConfig">
    從 `openclaw/plugin-sdk` 重新匯出的 `OpenClawSchemaType` 現在是
    `OpenClawConfig` 的單行別名。建議使用正式名稱。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>擴充層級的淘汰項目（在 `extensions/` 下的捆綁通道/供應商外掛內部）是在其各自的 `api.ts` 和 `runtime-api.ts` 桶子中追蹤的。它們不影響第三方外掛合約，因此未在此列出。如果您直接取用捆綁外掛的本地桶子，請在升級前閱讀該桶子中的淘汰說明註解。</Note>

## 移除時間表

| 時間               | 發生的事項                                       |
| ------------------ | ------------------------------------------------ |
| **現在**           | 已淘汰的介面會發出執行時期警告                   |
| **下一個主要版本** | 已淘汰的介面將被移除；仍在使用它們的外掛將會失效 |

所有核心外掛皆已遷移完成。外部外掛應在下一個主要版本發布前進行遷移。

## 暫時抑制警告

在進行遷移作業時設定以下環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這是一個暫時的緊急應變手段，並非永久解決方案。

## 相關連結

- [開始使用](/zh-Hant/plugins/building-plugins) - 建構您的第一個外掛
- [SDK 概觀](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [通道外掛](/zh-Hant/plugins/sdk-channel-plugins) - 建構通道外掛
- [供應商外掛](/zh-Hant/plugins/sdk-provider-plugins) - 建構供應商外掛
- [外掛內部運作](/zh-Hant/plugins/architecture) - 架構深度解析
- [外掛資訊清單](/zh-Hant/plugins/manifest) - 資訊清單綱要參考

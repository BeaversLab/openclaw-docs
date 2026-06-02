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

- **`openclaw/plugin-sdk/compat`** - 單一匯入，重新匯出了數十個輔助函式。它的引入是為了在建構新外掛架構的同時，保持基於舊版 hook 的外掛能夠正常運作。
- **`openclaw/plugin-sdk/infra-runtime`** - 一個廣泛的執行時輔助函式匯總，混合了系統事件、心跳狀態、傳遞佇列、fetch/proxy 輔助函式、檔案輔助函式、核准型別以及不相關的工具程式。
- **`openclaw/plugin-sdk/config-runtime`** - 一個廣泛的設定相容性匯總，在遷移期間仍包含已棄用的直接載入/寫入輔助函式。
- **`openclaw/extension-api`** - 一座橋樑，賦予外掛直接存取主機端輔助函式的權限，例如嵌入式代理執行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一個已移除的僅限嵌入式執行器的擴充功能 hook，可用於觀察嵌入式執行器事件，例如 `tool_result`。

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

現代化外掛 SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`) 都是一個小型的獨立模組，具有明確的目的和記錄完善的契約。

針對打包通道的舊版提供者便利縫線也已移除。通道品牌的輔助函式縫線是私有的單一存放區捷徑，而非穩定的外掛契約。請改用狹窄的通用 SDK 子路徑。在打包外掛工作區內，請將提供者擁有的輔助函式保留在該外掛自己的 `api.ts` 或 `runtime-api.ts` 中。

目前的內建提供者範例：

- Anthropic 將 Claude 專用的串流輔助函式保留在其自己的 `api.ts` / `contract-api.ts` 縫線中
- OpenAI 將提供者建構器、預設模型輔助函式和即時提供者建構器保留在其自己的 `api.ts` 中
- OpenRouter 將提供者建構器和上手/設定輔助函式保留在其自己的 `api.ts` 中

## Talk 與即時語音遷移計畫

即時語音、電話、會議和瀏覽器 Talk 程式碼正在從表面本機輪次簿記轉移至由 `openclaw/plugin-sdk/realtime-voice` 匯出的共用 Talk 會話控制器。新的控制器擁有通用的 Talk 事件封套、作用中輪次狀態、擷取狀態、輸出音訊狀態、近期事件歷史記錄以及過時輪次拒絕機制。提供者外掛程式應繼續擁有廠商特定的即時會話；表面外掛程式應繼續擁有擷取、播放、電話和會議的特異行為。

這次 Talk 遷移是有意進行徹底的中斷性變更：

1. 將共用控制器/執行時期基本元素保留在 `plugin-sdk/realtime-voice` 中。
2. 將捆綁的介面移至共享控制器：瀏覽器中繼、受控會議室移交、語音通話即時、語音通話串流 STT、Google Meet 即時，以及原生按鍵通話。
3. 以最終的 `talk.session.*` 和 `talk.client.*` API 取代舊的 Talk RPC 系列。
4. 在 Gateway `hello-ok.features.events` 中公告一個即時 Talk 事件通道：`talk.event`。
5. 刪除舊的即時 HTTP 端點以及任何請求時指令覆寫路徑。

新程式碼不應直接呼叫 `createTalkEventSequencer(...)`，除非正在實作低階介面卡或測試夾具。優先使用共用控制器，以便在沒有輪次 ID 時無法發出輪次範圍的事件，過時的 `turnEnd` / `turnCancel` 呼叫無法清除較新的作用中輪次，且輸出音訊生命週期事件在電話、會議、瀏覽器中繼、受管理房間移交和原生 Talk 用戶端之間保持一致。

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

瀏覽器擁有的 WebRTC/提供者 websocket 會話使用 `talk.client.create`，因為瀏覽器擁有提供者協商和媒體傳輸，而 Gateway 擁有憑證、指示和工具政策。`talk.session.*` 是 Gateway 管理的通用表面，用於閘道中繼即時、閘道中繼轉錄和受管理房間原生 STT/TTS 會話。

將即時選取器放在 `talk.provider` / `talk.providers` 旁邊的舊版組態應使用 `openclaw doctor --fix` 進行修復；執行時期 Talk 不會將語音/TTS 提供者組態重新解譯為即時提供者組態。

支援的 `talk.session.create` 組合刻意保持很少：

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

| 方法                            | 適用於                                                  | 合約                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | 將 base64 PCM 音訊區塊附加到屬於同一個 Gateway 連線的提供者會話。                                                                                          |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 開始一個受管理房間的使用者輪次。                                                                                                                           |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在過時輪次驗證後結束活躍輪次。                                                                                                                             |
| `talk.session.cancelTurn`       | 所有 Gateway 擁有的會話                                 | 取消某個輪次的活躍擷取/提供者/代理/TTS 工作。                                                                                                              |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助理音訊輸出，而不一定結束使用者輪次。                                                                                                                 |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成轉發器發出的提供者工具呼叫；傳遞 `options.willContinue` 以輸出中間結果，或傳遞 `options.suppressResponse` 以在不產生另一個助手回應的情況下完成該呼叫。 |
| `talk.session.steer`            | 由 Agent 支援的 Talk 會話                               | 將口語化的 `status`、`steer`、`cancel` 或 `followup` 控制項傳送到從 Talk 會話解析出的作用中嵌入式執行。                                                    |
| `talk.session.close`            | 所有統一會話                                            | 停止中繼會話或撤銷受管理房間狀態，然後忘記統一會話 ID。                                                                                                    |

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

維護者可以使用 `pnpm plugins:boundary-report` 審核目前的遷移佇列。使用 `pnpm plugins:boundary-report:summary` 取得簡潔計數，使用 `--owner <id>` 查詢單一外掛程式或相容性負責人，以及當 CI 閘道因過期的相容性記錄、跨負責人保留的 SDK 匯入或未使用的保留 SDK 子路徑而應失敗時使用 `pnpm plugins:boundary-report:ci`。此報告會依照移除日期分組已棄用的相容性記錄、計算本機程式碼/文件參考、顯示跨負責人保留的 SDK 匯入，並摘要私有的記憶體主機 SDK 橋接器，讓相容性清理保持明確，而不依賴臨時搜尋。保留的 SDK 子路徑必須具有追蹤的負責人使用情況；未使用的保留輔助匯出應從公用 SDK 中移除。

如果仍然接受清單欄位，外掛作者可以繼續使用它，直到文件和診斷另有指示為止。新程式碼應優先使用記錄的替代方案，但現有外掛在普通的次要版本期間不應中斷。

## 如何遷移

<Steps>
  <Step title="遷移運行時配置讀取/寫入輔助函數">
    捆綁插件應停止直接呼叫
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。請優先使用已傳入至目前呼叫路徑的設定。需要目前程序快照的長效處理程序可以使用 `api.runtime.config.current()`。長效
    代理工具應該在 `execute` 內使用工具上下文的 `ctx.getRuntimeConfig()`，這樣在設定寫入之前建立的工具仍能看到已重新整理的
    運行時設定。

    設定寫入必須通過事務輔助函數並選擇寫入後策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    當呼叫者知道變更需要乾淨的閘道重新啟動時，請使用 `afterWrite: { mode: "restart", reason: "..." }`；
    只有當呼叫者擁有後續處理並故意想要抑制重新載入規劃器時，才使用
    `afterWrite: { mode: "none", reason: "..." }`。
    變異結果包含一個具有型別的 `followUp` 摘要，用於測試和日誌記錄；
    閘道仍然負責應用或排程重新啟動。
    `loadConfig` 和 `writeConfigFile` 在遷移期間作為已棄用的相容性
    輔助函數保留給外部插件，並使用 `runtime-config-load-write` 相容性代碼警告一次。
    捆綁插件和存放庫運行時程式碼受到 `pnpm check:deprecated-api-usage` 和
    `pnpm check:no-runtime-action-load-config` 中掃描器防護機制的保護：
    新的正式環境插件使用會完全失敗，直接設定寫入會失敗，閘道伺服器方法必須使用
    請求運行時快照，運行時通道 send/action/client 輔助函數
    必須從其邊界接收設定，而長效運行時模組
    零允許環境 `loadConfig()` 呼叫。

    新的插件程式碼還應避免導入廣泛的
    `openclaw/plugin-sdk/config-runtime` 相容性桶。請使用符合工作的狹窄
    SDK 子路徑：

    | 需求 | 導入 |
    | --- | --- |
    | 配置型別，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | 已載入的配置斷言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 目前運行時快照讀取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置寫入 | `openclaw/plugin-sdk/config-mutation` |
    | 會話存儲輔助函數 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 群組原則運行時輔助函數 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 秘密輸入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/會話覆蓋 | `openclaw/plugin-sdk/model-session-runtime` |

    捆綁插件及其測試受到針對廣泛桶的掃描器保護，
    因此匯入和模擬保持在它們所需的行為本地。廣泛
    桶仍然存在以供外部相容性使用，但新程式碼不應
    依賴它。

  </Step>

  <Step title="將內嵌工具結果擴充功能遷移至中介軟體">
    捆綁式外掛必須將僅限內嵌執行器的
    `api.registerEmbeddedExtensionFactory(...)` 工具結果處理程式替換為
    與執行時期無關的中介軟體。

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

    外部外掛無法註冊工具結果中介軟體，因為它可以在模型看到之前
    重寫高信任度的工具輸出。

  </Step>

  <Step title="將原生審核處理程式遷移至功能事實">
    具備審核功能的頻道外掛現在透過
    `approvalCapability.nativeRuntime` 加上共用的執行時期環境註冊表來公開
    原生審核行為。

    主要變更：

    - 將 `approvalCapability.handler.loadRuntime(...)` 取換為
      `approvalCapability.nativeRuntime`
    - 將審核專用的身份驗證/傳遞機制從舊有的 `plugin.auth` /
      `plugin.approvals` 接線移至 `approvalCapability`
    - `ChannelPlugin.approvals` 已從公開頻道外掛
      合約中移除；將傳遞/原生/呈現欄位移至 `approvalCapability`
    - `plugin.auth` 僅保留給頻道登入/登出流程；核心
      不再讀取該處的審核身份驗證勾點
    - 透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊頻道擁有的執行時期物件，例如客戶端、
      權杖或 Bolt 應用程式
    - 請勿從原生審核處理程式傳送外掛擁有的重新路由通知；
      現在核心擁有來自實際傳遞結果的已路由至他處通知
    - 當將 `channelRuntime` 傳入 `createChannelManager(...)` 時，請提供
      真實的 `createPluginRuntime().channel` 介面。部分存根會被拒絕。

    請參閱 `/plugins/sdk-channel-plugins` 以了解目前的審核功能
    配置。

  </Step>

  <Step title="稽核 Windows 包裝函式後援行為">
    如果您的外掛程式使用 `openclaw/plugin-sdk/windows-spawn`，除非您明確傳遞
    `allowShellFallback: true`，否則未解析的 Windows
    `.cmd`/`.bat` 包裝函式現在將會以封閉式失敗（fail closed）處理。

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

    如果您的呼叫端並非有意依賴 shell 後援，請不要設定
    `allowShellFallback`，改為處理擲回的錯誤。

  </Step>

  <Step title="尋找已棄用的匯入">
    在您的外掛程式中搜尋來自任一已棄用介面的匯入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替換為專注式匯入">
    舊介面匯出的每個項目都對應到特定的現代匯入路徑：

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

    對於主機端輔助函式，請使用注入的外掛程式執行時期（runtime），而不是直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
    ```

    相同的模式也適用於其他舊版橋接輔助函式：

    | 舊版匯入 | 現代對等項目 |
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
    | 系統事件佇列輔助程式 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳喚醒、事件與可見性輔助程式 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待處理傳遞佇列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 頻道活動遙測 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 記憶體內去重快取 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本機檔案/媒體路徑輔助程式 | `openclaw/plugin-sdk/file-access-runtime` |
    | 具感知能力的 Dispatcher fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理與防護 fetch 輔助程式 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF dispatcher 政策類型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 核准請求/解決類型 | `openclaw/plugin-sdk/approval-runtime` |
    | 核准回應載荷與指令輔助程式 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 錯誤格式化輔助程式 | `openclaw/plugin-sdk/error-runtime` |
    | 傳輸就緒等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全權杖輔助程式 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界非同步任務並行 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 數值強制轉換 | `openclaw/plugin-sdk/number-runtime` |
    | 程序本機非同步鎖 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 檔案鎖 | `openclaw/plugin-sdk/file-lock` |

    打包的外掛程式會受到掃描器防護以避免 `infra-runtime`，因此儲存庫程式碼無法回退到廣泛的 barrel 匯入。

  </Step>

  <Step title="遷移通道路由輔助函數">
    新的通道路由代碼應該使用 `openclaw/plugin-sdk/channel-route`。
    較舊的 route-key 和 comparable-target 名稱在遷移期間將保留為相容性
    別名，但新外掛應使用直接描述行為的路由
    名稱：

    | 舊版輔助函數 | 現代輔助函數 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    現代路由輔助函數在原生核准、回覆抑制、入站去重、
    cron 傳遞和會話路由中
    一致地正規化 `{ channel, to, accountId, threadId }`。

    請勿新增 `ChannelMessagingAdapter.parseExplicitTarget` 的用途，
    或使用基於解析器的已載入路由輔助函數（`parseExplicitTargetForLoadedChannel`
    或 `resolveRouteTargetForLoadedChannel`）
    或 `resolveChannelRouteTargetWithParser(...)` 來自 `plugin-sdk/channel-route`。
    這些 hooks 已被棄用，僅在遷移期間保留給舊版
    外掛使用。新的通道外掛應使用
    `messaging.targetResolver.resolveTarget(...)` 進行目標 ID 正規化
    和目錄未命中後備，當核心
    需要早期的同儕類型時使用 `messaging.inferTargetChatType(...)`，並使用 `messaging.resolveOutboundSessionRoute(...)`
    處理提供者原生的會話和執行緒身份。

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
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛入口協助程式 | `definePluginEntry` | | `plugin-sdk/core` | 用於頻道入口定義/建構器的舊版通用重新匯出 | `defineChannelPluginEntry`、`createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根設定匯出結構描述 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者入口協助程式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的頻道入口定義和建構器 | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` | | `plugin-sdk/setup` | 共用設定精靈協助程式 | Setup translator、allowlist prompts、setup status builders | | `plugin-sdk/setup-runtime` | 設定期間的執行階段協助程式 |
  `createSetupTranslator`、import-safe setup patch adapters、lookup-note helpers、`promptResolvedAllowFrom`、`splitSetupEntries`、delegated setup proxies | | `plugin-sdk/setup-adapter-runtime` | 已淘汰的設定配接器別名 | 請使用 `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | 設定工具協助程式 |
  `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` | | `plugin-sdk/account-core` | 多帳戶協助程式 | 帳戶清單/設定/動作閘道協助程式 | | `plugin-sdk/account-id` | 帳戶 ID 協助程式 | `DEFAULT_ACCOUNT_ID`、帳戶 ID 正規化 | | `plugin-sdk/account-resolution` | 帳戶查閱協助程式 | 帳戶查閱 + 預設後援協助程式 | | `plugin-sdk/account-helpers` |
  狹窄帳戶協助程式 | 帳戶清單/帳戶動作協助程式 | | `plugin-sdk/channel-setup` | 設定精靈配接器 | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對基本元件 | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | 回覆前綴、輸入中和來源傳遞佈線 | `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | 設定配接器 factory 和 DM 存取協助程式 | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` |
  | `plugin-sdk/channel-config-schema` | 設定結構描述建構器 | 僅限共用頻道設定結構描述基本元件和通用建構器 | | `plugin-sdk/bundled-channel-config-schema` | 捆綁設定結構描述 | 僅限 OpenClaw 維護的捆綁外掛；新外掛必須定義外掛本機結構描述 | | `plugin-sdk/channel-config-schema-legacy` | 已淘汰的捆綁設定結構描述 | 僅限相容性別名；針對維護的捆綁外掛請使用 `plugin-sdk/bundled-channel-config-schema` | |
  `plugin-sdk/telegram-command-config` | Telegram 指令設定協助程式 | 指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 已淘汰的相容性外觀 | 請使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/inbound-envelope` | 進入訊息信封協助程式 | 共用路由 + 信封建構器協助程式 | |
  `plugin-sdk/channel-inbound` | 進入接收協助程式 | 內容建置、格式化、roots、runners、準備好的回覆分派和分派述詞 | | `plugin-sdk/messaging-targets` | 已淘汰的目標解析匯入路徑 | 請使用 `plugin-sdk/channel-targets` 進行通用目標解析協助、使用 `plugin-sdk/channel-route` 進行路由比較，並使用外掛擁有的 `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` 進行特定提供者的目標解析 | |
  `plugin-sdk/outbound-media` | 傳出媒體協助程式 | 共用傳出媒體載入 | | `plugin-sdk/outbound-send-deps` | 已淘汰的相容性外觀 | 請使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/channel-outbound` | 傳出訊息生命週期協助程式 | 訊息配接器、收據、永續傳送協助程式、即時預覽/串流協助程式、回覆選項、生命週期協助程式、傳出身分識別和承載規劃 | | `plugin-sdk/channel-streaming` | 已淘汰的相容性外觀 |
  請使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/outbound-runtime` | 已淘汰的相容性外觀 | 請使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結協助程式 | 執行緒繫結生命週期和配接器協助程式 | | `plugin-sdk/agent-media-payload` | 舊版媒體承載協助程式 | 用於舊版欄位配置的 Agent 媒體承載建構器 | | `plugin-sdk/channel-runtime` | 已淘汰的相容性 shim |
  僅限舊版頻道執行階段公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 永續外掛儲存體 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛執行階段協助程式 | 執行階段/記錄/備份/外掛安裝協助程式 | | `plugin-sdk/runtime-env` | 狹窄執行階段環境協助程式 | 記錄器/執行階段環境、逾時、重試和退避協助程式 | | `plugin-sdk/plugin-runtime` |
  共用外掛執行階段協助程式 | 外掛指令/hooks/http/互動式協助程式 | | `plugin-sdk/hook-runtime` | Hook 管線協助程式 | 共用 webhook/內部 hook 管線協助程式 | | `plugin-sdk/lazy-runtime` | 延遲載入執行階段協助程式 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` |
  處理序協助程式 | 共用 exec 協助程式 | | `plugin-sdk/cli-runtime` | CLI 執行階段協助程式 | 指令格式化、等候、版本協助程式 | | `plugin-sdk/gateway-runtime` | 閘道協助程式 | 閘道用戶端、事件迴圈就緒啟動協助程式和頻道狀態修補協助程式 | | `plugin-sdk/config-runtime` | 已淘汰的設定相容性 shim | 偏好使用 `config-contracts`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` | |
  `plugin-sdk/telegram-command-config` | Telegram 指令協助程式 | 當無法使用捆綁的 Telegram 合約介面時，提供穩定後援的 Telegram 指令驗證協助程式 | | `plugin-sdk/approval-runtime` | 核准提示協助程式 | Exec/外掛核准承載、核准功能/設定檔協助程式、原生核准路由/執行階段協助程式和結構化核准顯示路徑格式化 | | `plugin-sdk/approval-auth-runtime` | 核准驗證協助程式 | 核准者解析、相同聊天動作驗證 | |
  `plugin-sdk/approval-client-runtime` | 核准用戶端協助程式 | 原生 exec核准設定檔/篩選協助程式 | | `plugin-sdk/approval-delivery-runtime` | 核准傳遞協助程式 | 原生核准功能/傳遞配接器 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道協助程式 | 共用核准閘道解析協助程式 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准配接器協助程式 | 用於熱頻道進入點的輕量級原生核准配接器載入協助程式 | |
  `plugin-sdk/approval-handler-runtime` | 核准處理常式協助程式 | 更廣泛的核准處理常式執行階段協助程式；當它們足夠時，偏好使用較狹窄的配接器/閘道縫隙 | | `plugin-sdk/approval-native-runtime` | 核准目標協助程式 | 原生核准目標/帳戶繫結協助程式 | | `plugin-sdk/approval-reply-runtime` | 核准回覆協助程式 | Exec/外掛核准回覆承載協助程式 | | `plugin-sdk/channel-runtime-context` | 頻道執行階段內容協助程式
  | 通用頻道執行階段內容註冊/取得/監看協助程式 | | `plugin-sdk/security-runtime` | 安全性協助程式 | 共用信任、DM 閘道、以根為界檔案/路徑協助程式、外部內容和秘密收集協助程式 | | `plugin-sdk/ssrf-policy` | SSRF 原則協助程式 | 主機允許清單和私人網路原則協助程式 | | `plugin-sdk/ssrf-runtime` | SSRF 執行階段協助程式 | 釘選的分派器、受保護的擷取、SSRF 原則協助程式 | | `plugin-sdk/system-event-runtime` |
  系統事件協助程式 | `enqueueSystemEvent`、`peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | 心跳協助程式 | 心跳喚醒、事件和可見性協助程式 | | `plugin-sdk/delivery-queue-runtime` | 傳遞佇列協助程式 | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | 頻道活動協助程式 | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | 重複資料刪除協助程式 |
  記憶體內重複資料刪除快取 | | `plugin-sdk/file-access-runtime` | 檔案存取協助程式 | 安全的本機檔案/媒體路徑協助程式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒協助程式 | `waitForTransportReady` | | `plugin-sdk/exec-approvals-runtime` | Exec核准原則協助程式 | `loadExecApprovals`、`resolveExecApprovalsFromFile`、`ExecApprovalsFile` | | `plugin-sdk/collection-runtime` | 有界快取協助程式 |
  `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘道協助程式 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式化協助程式 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖形協助程式 | | `plugin-sdk/fetch-runtime` | 包裝的擷取/ Proxy 協助程式 | `resolveFetch`、proxy helpers、EnvHttpProxyAgent 選項協助程式 | |
  `plugin-sdk/host-runtime` | 主機正規化協助程式 | `normalizeHostname`、`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試協助程式 | `RetryConfig`、`retryAsync`、原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式化和輸入對應 | `formatAllowFromLowercase`、`mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道和指令介面協助程式 |
  `resolveControlCommandGate`、寄件者授權協助程式、指令註冊表協助程式，包括動態引數選單格式化 | | `plugin-sdk/command-status` | 指令狀態/說明轉譯器 | `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 秘密輸入解析 | 秘密輸入協助程式 | | `plugin-sdk/webhook-ingress` | Webhook 要求協助程式 | Webhook 目標公用程式 | |
  `plugin-sdk/webhook-request-guards` | Webhook 主體防護協助程式 | 要求主體讀取/限制協助程式 | | `plugin-sdk/reply-runtime` | 共用回覆執行階段 | 進入分派、心跳、回覆規劃器、分塊 | | `plugin-sdk/reply-dispatch-runtime` | 狹窄回覆分派協助程式 | 完成、提供者分派和交談標籤協助程式 | | `plugin-sdk/reply-history` | 回覆歷程協助程式 | `createChannelHistoryWindow`；已淘汰的 map-helper 相容性匯出，例如
  `buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參考規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回覆區塊協助程式 | 文字/Markdown 區塊協助程式 | | `plugin-sdk/session-store-runtime` | 工作階段存放區協助程式 | 存放區路徑 + updated-at 協助程式 | | `plugin-sdk/state-paths` |
  狀態路徑協助程式 | 狀態和 OAuth 目錄協助程式 | | `plugin-sdk/routing` | 路由/工作階段金鑰協助程式 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化協助程式 | | `plugin-sdk/status-helpers` | 頻道狀態協助程式 | 頻道/帳戶狀態摘要建構器、執行階段狀態預設值、問題中繼資料協助程式 | | `plugin-sdk/target-resolver-runtime` | 目標解析器協助程式 |
  共用目標解析器協助程式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化協助程式 | Slug/字串正規化協助程式 | | `plugin-sdk/request-url` | 要求 URL 協助程式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令協助程式 | 具有正規化 stdout/stderr 的計時指令執行器 | | `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` |
  工具承載擷取 | 從工具結果物件中擷取正規化的承載 | | `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑協助程式 | 共用暫存下載路徑協助程式 | | `plugin-sdk/logging-core` | 記錄協助程式 | 子系統記錄器和編修協助程式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格協助程式 | Markdown 表格模式協助程式 | | `plugin-sdk/reply-payload` |
  訊息回覆類型 | 回覆承載類型 | | `plugin-sdk/provider-setup` | 精選的本機/託管提供者設定協助程式 | 自我託管提供者探索/設定協助程式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自我託管提供者設定協助程式 | 相同的自我託管提供者探索/設定協助程式 | | `plugin-sdk/provider-auth-runtime` | 提供者執行階段驗證協助程式 | 執行階段 API 金鑰解析協助程式 | |
  `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設定協助程式 | API 金鑰上架/設定檔寫入協助程式 | | `plugin-sdk/provider-auth-result` | 提供者驗證結果協助程式 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-selection-runtime` | 提供者選取協助程式 | 已設定或自動提供者選取和原始提供者設定合併 | | `plugin-sdk/provider-env-vars` | 提供者環境變數協助程式 | 提供者驗證環境變數查閱協助程式 | |
  `plugin-sdk/provider-model-shared` | 共用提供者模型/重播協助程式 | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播原則建構器、提供者端點協助程式和模型 ID 正規化協助程式 | | `plugin-sdk/provider-catalog-shared` | 共用提供者目錄協助程式 |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供者上架修補程式 | 上架設定協助程式 | | `plugin-sdk/provider-http` | 提供者 HTTP 協助程式 | 通用提供者 HTTP/端點功能協助程式，包括音訊轉錄多部分表單協助程式 | |
  `plugin-sdk/provider-web-fetch` | 提供者 Web 擷取協助程式 | Web 擷取提供者註冊/快取協助程式 | | `plugin-sdk/provider-web-search-config-contract` | 提供者 Web 搜尋設定協助程式 | 用於不需要外掛啟用佈線之提供者的狹隘 Web 搜尋設定/認證協助程式 | | `plugin-sdk/provider-web-search-contract` | 提供者 Web 搜尋合約協助程式 | 狹隘的 Web 搜尋設定/認證合約協助程式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍認證設定器/取得器 | | `plugin-sdk/provider-web-search` | 提供者 Web 搜尋協助程式 | Web 搜尋提供者註冊/快取/執行階段協助程式 | | `plugin-sdk/provider-tools` | 提供者工具/結構描述相容性協助程式 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 和 DeepSeek/Gemini/OpenAI
  結構描述清理 + 診斷 | | `plugin-sdk/provider-usage` | 提供者使用量協助程式 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage` 和其他提供者使用量協助程式 | | `plugin-sdk/provider-stream` | 提供者串流包裝函式協助程式 | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝函式類型和共用 Anthropic/Bedrock/DeepSeek
  V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式協助程式 | | `plugin-sdk/provider-transport-runtime` | 提供者傳輸協助程式 | 原生提供者傳輸協助程式，例如受保護的擷取、傳輸訊息轉換和可寫入傳輸事件串流 | | `plugin-sdk/keyed-async-queue` | 排序非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體協助程式 | 媒體擷取/轉換/存放協助程式、ffprobe
  支援的視訊維度探測和媒體承載建構器 | | `plugin-sdk/media-generation-runtime` | 共用媒體產生協助程式 | 共用容錯移轉協助程式、候選選取和圖片/視訊/音樂產生的遺失模型傳訊 | | `plugin-sdk/media-understanding` | 媒體理解協助程式 | 媒體理解提供者類型加上提供者導向的圖片/音訊協助程式匯出 | | `plugin-sdk/text-runtime` | 已淘汰的廣泛文字相容性匯出 | 請使用
  `string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core` | | `plugin-sdk/text-chunking` | 文字分塊協助程式 | 傳出文字分塊協助程式 | | `plugin-sdk/speech` | 語音協助程式 | 語音提供者類型加上提供者導向的指示詞、註冊表、驗證協助程式和 OpenAI 相容的 TTS 建構器 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音提供者類型、註冊表、指示詞、正規化 | |
  `plugin-sdk/realtime-transcription` | 即時轉錄協助程式 | 提供者類型、註冊表協助程式和共用 WebSocket 工作階段協助程式 | | `plugin-sdk/realtime-voice` | 即時語音協助程式 | 提供者類型、註冊表/解析協助程式、橋接器工作階段協助程式、共用 agent 對話佇列、主動執行語音控制、逐字稿/事件健康狀態、回聲抑制、諮詢問題比對、強制諮詢協調、輪次內容追蹤、輸出活動追蹤和快速內容諮詢協助程式 | |
  `plugin-sdk/image-generation` | 圖片產生協助程式 | 圖片產生提供者類型加上圖片資產/資料 URL 協助程式和 OpenAI 相容的圖片提供者建構器 | | `plugin-sdk/image-generation-core` | 共用圖片產生核心 | 圖片產生類型、容錯移轉、驗證和註冊表協助程式 | | `plugin-sdk/music-generation` | 音樂產生協助程式 | 音樂產生提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂產生核心 |
  音樂產生類型、容錯移轉協助程式、提供者查閱和模型參考解析 | | `plugin-sdk/video-generation` | 視訊產生協助程式 | 視訊產生提供者/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用視訊產生核心 | 視訊產生類型、容錯移轉協助程式、提供者查閱和模型參考解析 | | `plugin-sdk/interactive-runtime` | 互動式回覆協助程式 | 互動式回覆承載正規化/縮減 | | `plugin-sdk/channel-config-primitives` |
  頻道設定基本元件 | 狹隘頻道設定結構描述基本元件 | | `plugin-sdk/channel-config-writes` | 頻道設定寫入協助程式 | 頻道設定寫入授權協助程式 | | `plugin-sdk/channel-plugin-common` | 共用頻道前奏 | 共用頻道外掛前奏匯出 | | `plugin-sdk/channel-status` | 頻道狀態協助程式 | 共用頻道狀態快照/摘要協助程式 | | `plugin-sdk/allowlist-config-edit` | 允許清單設定協助程式 | 允許清單設定編輯/讀取協助程式 | |
  `plugin-sdk/group-access` | 群組存取協助程式 | 共用群組存取決策協助程式 | | `plugin-sdk/direct-dm`、`plugin-sdk/direct-dm-access` | 已淘汰的相容性外觀 | 請使用 `plugin-sdk/channel-inbound` | | `plugin-sdk/direct-dm-guard-policy` | 直接 DM 防護協助程式 | 狹隘的預先加密防護原則協助程式 | | `plugin-sdk/extension-shared` | 共用擴充協助程式 | 被動頻道/狀態和環境 Proxy 協助程式基本元件 | |
  `plugin-sdk/webhook-targets` | Webhook 目標協助程式 | Webhook 目標註冊表和路由安裝協助程式 | | `plugin-sdk/webhook-path` | 已淘汰的 Webhook 路徑別名 | 請使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共用 Web 媒體協助程式 | 遠端/本機媒體載入協助程式 | | `plugin-sdk/zod` | 已淘汰的 Zod 相容性重新匯出 | 直接從 `zod` 匯入 `zod` | | `plugin-sdk/memory-core` | 捆綁記憶體核心協助程式 |
  記憶體管理員/設定/檔案/CLI 協助程式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行階段外觀 | 記憶體索引/搜尋執行階段外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入引擎 |
  記憶體嵌入合約、註冊表存取、本機提供者和通用批次/遠端協助程式；具體的遠端提供者位於其擁有的外掛中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | 記憶體主機多模態協助程式 | |
  `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機秘密協助程式 | 記憶體主機秘密協助程式 | | `plugin-sdk/memory-core-host-events` | 已淘汰的記憶體事件別名 | 請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | 記憶體主機狀態協助程式 | |
  `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行階段 | 記憶體主機 CLI 執行階段協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行階段 | 記憶體主機核心執行階段協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行階段協助程式 | 記憶體主機檔案/執行階段協助程式 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行階段別名 |
  記憶體主機核心執行階段協助程式的廠商中性別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌別名 | 記憶體主機事件日誌協助程式的廠商中性別名 | | `plugin-sdk/memory-host-files` | 已淘汰的記憶體檔案/執行階段別名 | 請使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 受控 Markdown 協助程式 | 用於記憶體相鄰外掛的共用受控 Markdown 協助程式 | |
  `plugin-sdk/memory-host-search` | 主動記憶體搜尋外觀 | 延遲載入主動記憶體搜尋管理員執行階段外觀 | | `plugin-sdk/memory-host-status` | 已淘汰的記憶體主機狀態別名 | 請使用 `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | 測試公用程式 | 存放區本機已淘汰相容性 barrel；請使用專注的存放區本機測試子路徑，例如
  `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表格刻意僅包含常見的遷移子集，而非完整的 SDK
表面。編譯器入口點清單位於
`scripts/lib/plugin-sdk-entrypoints.json`；套件匯出項是從
公開子集產生的。

預留的綑綁外掛程式輔助接縫已從公開 SDK
匯出對應表中移除，但明確記載的相容性外觀除外，例如為已發布的
`@openclaw/discord@2026.3.13` 套件保留的已棄用 `plugin-sdk/discord` shim。特定擁有者的輔助工具位於
擁有者外掛程式套件內；共用主機行為應透過通用 SDK
合約（例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`
和 `plugin-sdk/plugin-config-runtime`）遷移。

使用符合該工作的最窄匯入路徑。如果您找不到匯出項，
請檢查 `src/plugin-sdk/` 的原始碼或詢問維護者應由哪個通用合約
擁有它。

## 目前的棄用項目

適用於整個外掛程式 SDK、提供者合約、執行時表面與資訊清單的更精確棄用項目。每個項目目前仍可運作，但會在未來的主要版本中移除。每個項目下方的條目會將舊 API 對應至其標準取代項目。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **舊版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的簽名、相同的
    匯出項——只是從更窄的子路徑匯入。`command-auth`
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
    `openclaw/plugin-sdk/channel-mention-gating` 的 `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新版**：`resolveInboundMentionDecision({ facts, policy })` —— 傳回
    單一決策物件，而非兩個分開的呼叫。

    下游通道外掛程式（Slack、Discord、Matrix、MS Teams）已經
    切換。

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是舊版 channel 外掛的
    相容性填充層 (shim)。請勿在新程式碼中匯入它；請使用
    `openclaw/plugin-sdk/channel-runtime-context` 來註冊執行時期
    物件。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 輔助函式
    已與原始的「actions」channel 匯出一同被棄用。請改透過語意化的
    `presentation` 介面來公開功能 - channel 外掛
    應宣告它們呈現的內容 (cards、buttons、selects)，而非它們接受的原始
    action 名稱。

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **舊版**：來自 `openclaw/plugin-sdk/provider-web-search` 的
    `tool()` 工廠。

    **新版**：直接在 provider 外掛上實作
    `createTool(...)`。
    OpenClaw 不再需要 SDK 輔助函式來註冊工具包裝器。

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **舊版**：`formatInboundEnvelope(...)` (以及
    `ChannelMessageForAgent.channelEnvelope`) 用來從傳入的 channel 訊息
    建構一個扁平的純文字提示封套。

    **新版**：`BodyForAgent` 加上結構化的使用者內容區塊。Channel
    外掛將路由元資料 (thread、topic、reply-to、reactions) 以
    類型欄位附加，而非將其串連至提示字串中。
    `formatAgentEnvelope(...)` 輔助函式仍支援用於合成的
    面向助理的封套，但傳入的純文字封套即將被淘汰。

    受影響的區域：`inbound_claim`、`message_received`，以及任何
    後處理 `channelEnvelope` 文字的自訂
    channel 外掛。

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **舊版**：`api.on("deactivate", handler)`。

    **新版**：`api.on("gateway_stop", handler)`。事件和內容是
    相同的關機清理契約；僅變更了 hook 名稱。

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

    `deactivate` 在
    2026-08-16 之前仍作為已棄用的相容性別名保留。

  </Accordion>

  <Accordion title="subagent_spawning hook → core thread binding">
    **舊版**：`api.on("subagent_spawning", handler)` 回傳
    `threadBindingReady` 或 `deliveryOrigin`。

    **新版**：讓核心透過通道
    會話綁定配接器準備 `thread: true` 子代理綁定。僅將 `api.on("subagent_spawned", handler)`
    用於啟動後的觀察。

    ```typescript
    // Before
    api.on("subagent_spawning", async () => ({
      status: "ok",
      threadBindingReady: true,
      deliveryOrigin: { channel: "discord", to: "channel:123", threadId: "456" },
    }));

    // After
    api.on("subagent_spawned", async (event) => {
      await observeSubagentLaunch(event);
    });
    ```

    當外部外掛遷移時，`subagent_spawning`、`PluginHookSubagentSpawningEvent`、
    `PluginHookSubagentSpawningResult` 和
    `SubagentLifecycleHookRunner.runSubagentSpawning(...)` 僅作為
    已棄用的相容性介面保留。

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    四個探索型別別名現在是目錄時代型別的
    輕量包裝器：

    | Old alias                 | New type                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外還有舊版 `ProviderCapabilities` 靜態包 - 提供者外掛
    應使用明確的提供者 hooks，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是靜態物件。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **舊版**（在 `ProviderThinkingPolicy` 上的三個獨立鉤子）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：單一 `resolveThinkingProfile(ctx)`，它返回一個
    `ProviderThinkingProfile`，其中包含標準的 `id`、可選的 `label` 和
    排序的等級列表。OpenClaw 會根據設定檔等級自動降級過時的儲存值。

    語境包含 `provider`、`modelId`、可選合併的 `reasoning`
    和可選合併的模型 `compat` 事實。提供者外掛只有在設定的請求合約支援時，才能使用這些目錄事實來公開特定模型的設定檔。

    請實作一個鉤子，而不是三個。舊版鉤子在淘汰期間仍可運作，但未與設定檔結果組合。

  </Accordion>

  <Accordion title="External auth providers → contracts.externalAuthProviders">
    **舊版**：實作外部驗證鉤子，而不在外掛清單中宣告提供者。

    **新版**：在外掛清單中宣告 `contracts.externalAuthProviders`
    **並**實作 `resolveExternalAuthProfiles(...)`。

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
    `setup.providers[].envVars`。這將設定/狀態環境元資料合併在同一位置，並避免僅為了回應環境變數查詢而啟動外掛執行時。

    `providerAuthEnvVars` 在淘汰期間透過相容性轉接器維持支援。

  </Accordion>

  <Accordion title="記憶體插件註冊 → registerMemoryCapability">
    **舊版**：三個獨立的呼叫 -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`。

    **新版**：在記憶體狀態 API 上進行一次呼叫 -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的插槽，單一註冊呼叫。附加的提示和語料庫輔助函數
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) 不
    受影響。

  </Accordion>

  <Accordion title="記憶體嵌入提供者 API">
    **舊版**：`api.registerMemoryEmbeddingProvider(...)` 加上
    `contracts.memoryEmbeddingProviders`。

    **新版**：`api.registerEmbeddingProvider(...)` 加上
    `contracts.embeddingProviders`。

    通用嵌入提供者契約可在記憶體之外重複使用，並且是新提供者的支援途徑。記憶體特定的註冊 API 在現有提供者遷移期間仍作為已棄用的相容性連線保留。插件檢查會將非套件內的使用報告為相容性技術債。

  </Accordion>

  <Accordion title="子代理階段訊息類型已重新命名">
    從 `src/plugins/runtime/types.ts` 匯出的兩個舊版類型別名：

    | 舊版                           | 新版                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    執行時方法 `readSession` 已棄用，改用
    `getSessionMessages`。簽名相同；舊方法會呼叫新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **舊版**：`runtime.tasks.flow` (單數) 返回即時任務流程存取器。

    **新版**：`runtime.tasks.managedFlows` 針對從流程建立、更新、取消或執行子任務的插件，保留受管理的 TaskFlow 變更執行時。當插件僅需要基於 DTO 的讀取時，請使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">已在上文「如何遷移 → 將嵌入式 tool-result 擴充功能遷移至中介軟體」中涵蓋。為了完整性在此列出：已移除的 embedded-runner-only `api.registerEmbeddedExtensionFactory(...)` 路徑已被 `api.registerAgentToolResultMiddleware(...)` 取代，並在 `contracts.agentToolResultMiddleware` 中包含明確的執行時期清單。</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    從 `openclaw/plugin-sdk` 重新導出的 `OpenClawSchemaType` 現在是
    `OpenClawConfig` 的單行別名。建議使用標準名稱。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>擴充功能層級的棄用項目（位於 `extensions/` 下的套件 channel/provider 外掛程式中）是在其各自的 `api.ts` 和 `runtime-api.ts` barrels 中追蹤的。這些項目不會影響第三方外掛程式契約，因此未在此列出。如果您直接使用套件外掛程式的本地 barrel，請在升級前閱讀該 barrel 中的棄用註解。</Note>

## 移除時間表

| 時間               | 發生變化                                               |
| ------------------ | ------------------------------------------------------ |
| **現在**           | 已棄用的介面會發出執行時期警告                         |
| **下一個主要版本** | 已棄用的介面將被移除；仍使用它們的外掛程式將會無法運作 |

所有核心外掛程式皆已遷移。外部外掛程式應在下一個主要版本發布前完成遷移。

## 暫時隱藏警告

在進行遷移時設定以下環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這是一個暫時的應變措施，並非永久解決方案。

## 相關資訊

- [入門指南](/zh-Hant/plugins/building-plugins) - 建構您的第一個外掛程式
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [Channel 外掛程式](/zh-Hant/plugins/sdk-channel-plugins) - 建構 channel 外掛程式
- [Provider 外掛程式](/zh-Hant/plugins/sdk-provider-plugins) - 建構 provider 外掛程式
- [外掛程式內部運作](/zh-Hant/plugins/architecture) - 架構深度剖析
- [外掛程式清單](/zh-Hant/plugins/manifest) - 清單架構參考

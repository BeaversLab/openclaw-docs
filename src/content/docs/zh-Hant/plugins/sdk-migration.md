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

<Accordion title="常見匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準插件入口輔助函式 | `definePluginEntry` | | `plugin-sdk/core` | 舊版通道入口定義/建構器的統一重新匯出 | `defineChannelPluginEntry`、`createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一供應商入口輔助函式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的通道入口定義和建構器 | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` | | `plugin-sdk/setup` | 共用設置精靈輔助函式 | Setup translator、allowlist prompts、setup status builders | | `plugin-sdk/setup-runtime` | 設置階段執行時輔助函式 |
  `createSetupTranslator`、匯入安全的設置修補程式介面卡、lookup-note 輔助函式、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設置代理程式 | | `plugin-sdk/setup-adapter-runtime` | 已棄用的設置介面卡別名 | 使用 `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | 設置工具輔助函式 |
  `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` | | `plugin-sdk/account-core` | 多帳號輔助函式 | 帳號列表/配置/操作閘道輔助函式 | | `plugin-sdk/account-id` | 帳號 ID 輔助函式 | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化 | | `plugin-sdk/account-resolution` | 帳號查找輔助函式 | 帳號查找和預設後備輔助函式 | | `plugin-sdk/account-helpers` |
  狹義帳號輔助函式 | 帳號列表/帳號操作輔助函式 | | `plugin-sdk/channel-setup` | 設置精靈介面卡 | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對基本功能 | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | 回覆前綴、輸入中狀態和來源傳遞連線 | `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | 配置介面卡工廠和 DM 存取輔助函式 | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` |
  | `plugin-sdk/channel-config-schema` | 配置架構建構器 | 僅限共用通道配置架構基本功能和通用建構器 | | `plugin-sdk/bundled-channel-config-schema` | 內建配置架構 | 僅限 OpenClaw 維護的內建插件；新插件必須定義插件本機架構 | | `plugin-sdk/channel-config-schema-legacy` | 已棄用的內建配置架構 | 僅為相容性別名；維護的內建插件請使用 `plugin-sdk/bundled-channel-config-schema` | |
  `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助函式 | 指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/inbound-envelope` | 傳入信封輔助函式 | 共用路由和信封建構器輔助函式 | |
  `plugin-sdk/channel-inbound` | 傳入接收輔助函式 | 上下文建構、格式化、根節點、執行器、準備好的回覆分派以及分派述詞 | | `plugin-sdk/messaging-targets` | 已棄用的目標解析匯入路徑 | 通用目標解析輔助函式請使用 `plugin-sdk/channel-targets`，路由比較請使用 `plugin-sdk/channel-route`，供應商特定的目標解析請使用插件擁有的 `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` | |
  `plugin-sdk/outbound-media` | 傳出媒體輔助函式 | 共用傳出媒體載入 | | `plugin-sdk/outbound-send-deps` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/channel-outbound` | 傳出訊息生命週期輔助函式 | 訊息介面卡、回條、持久傳送輔助函式、即時預覽/串流輔助函式、回覆選項、生命週期輔助函式、傳出身分識別和負載規劃 | | `plugin-sdk/channel-streaming` | 已棄用的相容性外觀 | 使用
  `plugin-sdk/channel-outbound` | | `plugin-sdk/outbound-runtime` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結輔助函式 | 執行緒繫結生命週期和介面卡輔助函式 | | `plugin-sdk/agent-media-payload` | 舊版媒體負載輔助函式 | 用於舊版欄位配置的代理程式媒體負載建構器 | | `plugin-sdk/channel-runtime` | 已棄用的相容性填充 |
  僅限舊版通道執行時公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久化插件儲存 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣義執行時輔助函式 | 執行時/日誌/備份/插件安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹義執行時環境輔助函式 | 紀錄器/執行時環境、逾時、重試和退避輔助函式 | | `plugin-sdk/plugin-runtime` |
  共用插件執行時輔助函式 | 插件指令/Hooks/HTTP/互動輔助函式 | | `plugin-sdk/hook-runtime` | Hook 管線輔助函式 | 共用 Webhook/內部 Hook 管線輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲載入執行時輔助函式 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` |
  處理程序輔助函式 | 共用執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI 執行時輔助函式 | 指令格式化、等待、版本輔助函式 | | `plugin-sdk/gateway-runtime` | 閘道輔助函式 | 閘道用戶端、事件循環就緒啟動輔助函式和通道狀態修補輔助函式 | | `plugin-sdk/config-runtime` | 已棄用的配置相容性填充 | 優先使用 `config-contracts`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` | |
  `plugin-sdk/telegram-command-config` | Telegram 指令輔助函式 | 當內建的 Telegram 合約介面無法使用時，提供後備穩定的 Telegram 指令驗證輔助函式 | | `plugin-sdk/approval-runtime` | 核准提示輔助函式 | 執行/插件核准負載、核准功能/設定檔輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示路徑格式化 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助函式 | 核准者解析、相同聊天操作驗證 | |
  `plugin-sdk/approval-client-runtime` | 核准用戶端輔助函式 | 原生執行核准設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 核准傳遞輔助函式 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助函式 | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助函式 | 用於熱通道入口點的輕量級原生核准介面卡載入輔助函式 | |
  `plugin-sdk/approval-handler-runtime` | 核准處理器輔助函式 | 更廣泛的核准處理器執行時輔助函式；當足夠時，優先使用較狹隘的介面卡/閘道縫隙 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助函式 | 原生核准目標/帳號繫結輔助函式 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助函式 | 執行/插件核准回覆負載輔助函式 | | `plugin-sdk/channel-runtime-context` | 通道執行時上下文輔助函式 |
  通用通道執行時上下文註冊/取得/監看輔助函式 | | `plugin-sdk/security-runtime` | 安全性輔助函式 | 共用信任、DM 閘道、根邊界檔案/路徑輔助函式、外部內容和祕密收集輔助函式 | | `plugin-sdk/ssrf-policy` | SSRF 原則輔助函式 | 主機允許清單和私人網路原則輔助函式 | | `plugin-sdk/ssrf-runtime` | SSRF 執行時輔助函式 | 釘選分派器、防護擷取、SSRF 原則輔助函式 | | `plugin-sdk/system-event-runtime` |
  系統事件輔助函式 | `enqueueSystemEvent`、`peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | 心跳輔助函式 | 心跳喚醒、事件和可見性輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 傳遞佇列輔助函式 | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | 通道活動輔助函式 | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | 去重輔助函式 | 記憶體內去重快取 | |
  `plugin-sdk/file-access-runtime` | 檔案存取輔助函式 | 安全的本機檔案/媒體路徑輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒輔助函式 | `waitForTransportReady` | | `plugin-sdk/exec-approvals-runtime` | 執行核准原則輔助函式 | `loadExecApprovals`、`resolveExecApprovalsFromFile`、`ExecApprovalsFile` | | `plugin-sdk/collection-runtime` | 有界快取輔助函式 | `pruneMapToMaxSize` | |
  `plugin-sdk/diagnostic-runtime` | 診斷閘道輔助函式 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式化輔助函式 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖形輔助函式 | | `plugin-sdk/fetch-runtime` | 包裝擷取/代理輔助函式 | `resolveFetch`、代理輔助函式、EnvHttpProxyAgent 選項輔助函式 | | `plugin-sdk/host-runtime` | 主機正規化輔助函式 |
  `normalizeHostname`、`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助函式 | `RetryConfig`、`retryAsync`、原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式化和輸入對應 | `formatAllowFromLowercase`、`mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道和指令介面輔助函式 |
  `resolveControlCommandGate`、傳送者驗證輔助函式、指令註冊表輔助函式，包括動態引數選單格式化 | | `plugin-sdk/command-status` | 指令狀態/說明呈現器 | `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 祕密輸入解析 | 祕密輸入輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助函式 | Webhook 目標公用程式 | |
  `plugin-sdk/webhook-request-guards` | Webhook 主體防護輔助函式 | 要求主體讀取/限制輔助函式 | | `plugin-sdk/reply-runtime` | 共用回覆執行時 | 傳入分派、心跳、回覆規劃器、分塊 | | `plugin-sdk/reply-dispatch-runtime` | 狹義回覆分派輔助函式 | 完成、供應商分派和對話標籤輔助函式 | | `plugin-sdk/reply-history` | 回覆歷程輔助函式 | `createChannelHistoryWindow`；已棄用的對應輔助函式相容性匯出，例如
  `buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參照規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回援分塊輔助函式 | 文字/Markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | 工作階段儲存輔助函式 | 儲存路徑和 updated-at 輔助函式 | | `plugin-sdk/state-paths` |
  狀態路徑輔助函式 | 狀態和 OAuth 目錄輔助函式 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助函式 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助函式 | | `plugin-sdk/status-helpers` | 通道狀態輔助函式 | 通道/帳號狀態摘要建構器、執行時狀態預設值和問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 目標解析器輔助函式 |
  共用目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助函式 | Slug/字串正規化輔助函式 | | `plugin-sdk/request-url` | 要求 URL 輔助函式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助函式 | 具有正規化 stdout/stderr 的計時指令執行器 | | `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` |
  工具負載擷取 | 從工具結果物件中擷取正規化的負載 | | `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助函式 | 共用暫存下載路徑輔助函式 | | `plugin-sdk/logging-core` | 紀錄輔助函式 | 子系統紀錄器和編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助函式 | Markdown 表格模式輔助函式 | | `plugin-sdk/reply-payload` |
  訊息回覆類型 | 回覆負載類型 | | `plugin-sdk/provider-setup` | 策展的本機/自託管供應商設置輔助函式 | 自託管供應商探索/配置輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管供應商設置輔助函式 | 相同的自託管供應商探索/配置輔助函式 | | `plugin-sdk/provider-auth-runtime` | 供應商執行時驗證輔助函式 | 執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` |
  供應商 API 金鑰設置輔助函式 | API 金鑰入門/設定檔寫入輔助函式 | | `plugin-sdk/provider-auth-result` | 供應商驗證結果輔助函式 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-selection-runtime` | 供應商選擇輔助函式 | 已設定或自動供應商選擇和原始供應商配置合併 | | `plugin-sdk/provider-env-vars` | 供應商環境變數輔助函式 | 供應商驗證環境變數查找輔助函式 | | `plugin-sdk/provider-model-shared` |
  共用供應商模型/重播輔助函式 | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播原則建構器、供應商端點輔助函式和模型 ID 正規化輔助函式 | | `plugin-sdk/provider-catalog-shared` | 共用供應商目錄輔助函式 |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 供應商入門修補程式 | 入門配置輔助函式 | | `plugin-sdk/provider-http` | 供應商 HTTP 輔助函式 | 通用供應商 HTTP/端點功能輔助函式，包括音訊轉錄多部分表單輔助函式 | |
  `plugin-sdk/provider-web-fetch` | 供應商 Web 擷取輔助函式 | Web 擷取供應商註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 供應商 Web 搜尋配置輔助函式 | 針對不需要插件啟用接線的供應商之狹義 Web 搜尋配置/認證輔助函式 | | `plugin-sdk/provider-web-search-contract` | 供應商 Web 搜尋合約輔助函式 | 狹義 Web 搜尋配置/認證合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍認證設定器/取得器 | | `plugin-sdk/provider-web-search` | 供應商 Web 搜尋輔助函式 | Web 搜尋供應商註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | 供應商工具/架構相容性輔助函式 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek/Gemini/OpenAI
  架構清理和診斷 | | `plugin-sdk/provider-usage` | 供應商使用量輔助函式 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage`，以及其他供應商使用量輔助函式 | | `plugin-sdk/provider-stream` | 供應商串流包裝器輔助函式 | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共用 Anthropic/Bedrock/DeepSeek
  V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | | `plugin-sdk/provider-transport-runtime` | 供應商傳輸輔助函式 | 原生供應商傳輸輔助函式，例如防護擷取、傳輸訊息轉換和可寫入傳輸事件串流 | | `plugin-sdk/keyed-async-queue` | 排序的非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助函式 | 媒體擷取/轉換/儲存輔助函式、ffprobe
  支援的影片維度探測和媒體負載建構器 | | `plugin-sdk/media-generation-runtime` | 共用媒體生成輔助函式 | 共用故障轉移輔助函式、候選選擇，以及圖片/影片/音樂生成的遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解輔助函式 | 媒體理解供應商類型以及供應商導向的圖片/音訊輔助函式匯出 | | `plugin-sdk/text-runtime` | 已棄用的廣義文字相容性匯出 | 使用
  `string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core` | | `plugin-sdk/text-chunking` | 文字分塊輔助函式 | 傳出文字分塊輔助函式 | | `plugin-sdk/speech` | 語音輔助函式 | 語音供應商類型以及供應商導向的指令、註冊表、驗證輔助函式和 OpenAI 相容 TTS 建構器 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音供應商類型、註冊表、指令、正規化 | |
  `plugin-sdk/realtime-transcription` | 即時轉錄輔助函式 | 供應商類型、註冊表輔助函式和共用 WebSocket 工作階段輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音輔助函式 | 供應商類型、註冊表/解析輔助函式、橋接器工作階段輔助函式、共用代理程式傳回佇列、主動執行語音控制、轉錄/事件健全狀況、迴聲抑制、諮詢問題比對、強制諮詢協調、輪次上下文追蹤、輸出活動追蹤和快速上下文諮詢輔助函式 | |
  `plugin-sdk/image-generation` | 圖片生成輔助函式 | 圖片生成供應商類型，加上圖片資產/資料 URL 輔助函式和 OpenAI 相容圖片供應商建構器 | | `plugin-sdk/image-generation-core` | 共用圖片生成核心 | 圖片生成類型、故障轉移、驗證和註冊表輔助函式 | | `plugin-sdk/music-generation` | 音樂生成輔助函式 | 音樂生成供應商/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂生成核心 |
  音樂生成類型、故障轉移輔助函式、供應商查找和模型參照解析 | | `plugin-sdk/video-generation` | 影片生成輔助函式 | 影片生成供應商/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成核心 | 影片生成類型、故障轉移輔助函式、供應商查找和模型參照解析 | | `plugin-sdk/interactive-runtime` | 互動回覆輔助函式 | 互動回覆負載正規化/精簡 | | `plugin-sdk/channel-config-primitives` |
  通道配置基本功能 | 狹義通道配置架構基本功能 | | `plugin-sdk/channel-config-writes` | 通道配置寫入輔助函式 | 通道配置寫入授權輔助函式 | | `plugin-sdk/channel-plugin-common` | 共用通道前奏 | 共用通道插件前奏匯出 | | `plugin-sdk/channel-status` | 通道狀態輔助函式 | 共用通道狀態快照/摘要輔助函式 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助函式 | 允許清單配置編輯/讀取輔助函式 | |
  `plugin-sdk/group-access` | 群組存取輔助函式 | 共用群組存取決策輔助函式 | | `plugin-sdk/direct-dm`、`plugin-sdk/direct-dm-access` | 已棄用的相容性外觀 | 使用 `plugin-sdk/channel-inbound` | | `plugin-sdk/direct-dm-guard-policy` | 直接 DM 防護輔助函式 | 狹義預加密防護原則輔助函式 | | `plugin-sdk/extension-shared` | 共用擴充功能輔助函式 | 被動通道/狀態和環境代理輔助基本功能 | |
  `plugin-sdk/webhook-targets` | Webhook 目標輔助函式 | Webhook 目標註冊表和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | 已棄用的 Webhook 路徑別名 | 使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共用 Web 媒體輔助函式 | 遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 已棄用的 Zod 相容性重新匯出 | 直接從 `zod` 匯入 `zod` | | `plugin-sdk/memory-core` | 內建記憶核心輔助函式 |
  記憶管理員/配置/檔案/CLI 輔助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶引擎執行時外觀 | 記憶索引/搜尋執行時外觀 | | `plugin-sdk/memory-core-host-embedding-registry` | 記憶內嵌註冊表 | 輕量級記憶內嵌供應商註冊表輔助函式 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶主機基礎引擎 | 記憶主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶主機內嵌引擎 |
  記憶內嵌合約、註冊表存取、本機供應商和通用批次/遠端輔助函式；具體的遠端供應商位於其擁有的插件中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶主機 QMD 引擎 | 記憶主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶主機儲存引擎 | 記憶主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶主機多模態輔助函式 | 記憶主機多模態輔助函式 | |
  `plugin-sdk/memory-core-host-query` | 記憶主機查詢輔助函式 | 記憶主機查詢輔助函式 | | `plugin-sdk/memory-core-host-secret` | 記憶主機祕密輔助函式 | 記憶主機祕密輔助函式 | | `plugin-sdk/memory-core-host-events` | 已棄用的記憶事件別名 | 使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶主機狀態輔助函式 | 記憶主機狀態輔助函式 | |
  `plugin-sdk/memory-core-host-runtime-cli` | 記憶主機 CLI 執行時 | 記憶主機 CLI 執行時輔助函式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶主機核心執行時 | 記憶主機核心執行時輔助函式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶主機檔案/執行時輔助函式 | 記憶主機檔案/執行時輔助函式 | | `plugin-sdk/memory-host-core` | 記憶主機核心執行時別名 |
  記憶主機核心執行時輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶主機事件日誌別名 | 記憶主機事件日誌輔助函式的廠商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的記憶檔案/執行時別名 | 使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 受控 Markdown 輔助函式 | 用於記憶相鄰插件的共用受控 Markdown 輔助函式 | |
  `plugin-sdk/memory-host-search` | 主動記憶搜尋外觀 | 延遲載入主動記憶搜尋管理員執行時外觀 | | `plugin-sdk/memory-host-status` | 已棄用的記憶主機狀態別名 | 使用 `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | 測試公用程式 | 存放庫本機已棄用的相容性匯總；使用專注的存放庫本機測試子路徑，例如
  `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表格刻意列出了常見的遷移子集，而非完整的 SDK 表面。編譯器入口點清單位於
`scripts/lib/plugin-sdk-entrypoints.json`；套件匯出項是根據公開子集產生的。

預留的打包外掛程式輔助接縫已從公開 SDK 匯出對應表中淘汰，明確記載的相容性外觀除外，例如為已發布的
`@openclaw/discord@2026.3.13` 套件保留的已棄用 `plugin-sdk/discord` 填充層。特定擁有者的輔助程式位於擁有者外掛程式套件內；共用主機行為應透過通用 SDK 契約（例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`
和 `plugin-sdk/plugin-config-runtime`）進行轉移。

使用符合該工作範圍最窄的匯入。如果您找不到匯出項，請檢查 `src/plugin-sdk/` 的原始碼，或詢問維護者應由哪個通用契約擁有它。

## 目前的棄用項目

適用於整個外掛程式 SDK、提供者合約、執行時表面與資訊清單的更精確棄用項目。每個項目目前仍可運作，但會在未來的主要版本中移除。每個項目下方的條目會將舊 API 對應至其標準取代項目。

<AccordionGroup>
  <Accordion title="指令驗證輔助工具 → 指令狀態">
    **舊版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的簽章，相同的
    匯出項——只是從較窄的子路徑匯入。`command-auth`
    會將它們作為相容性存根重新匯出。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="提及閘道輔助工具 → resolveInboundMentionDecision">
    **舊版**：`resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)` 來自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating`。

    **新版**：`resolveInboundMentionDecision({ facts, policy })` - 傳回單一
    決策物件，而非兩個分開的呼叫。

    下游通道外掛程式（Slack、Discord、Matrix、MS Teams）已經
    切換。

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是較舊頻道外掛的
    相容性 shim。請勿在新程式碼中匯入它；請使用
    `openclaw/plugin-sdk/channel-runtime-context` 來註冊執行時期
    物件。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` helper
    已與原始的 "actions" 頻道匯出一同被棄用。請透過語意化的
    `presentation` 介面來公開功能 - 頻道外掛
    宣告它們呈現的內容 (cards、buttons、selects)，而不是它們接受的原始
    action 名稱。

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **舊版**：來自 `openclaw/plugin-sdk/provider-web-search` 的
    `tool()` factory。

    **新版**：直接在提供者外掛上實作
    `createTool(...)`。OpenClaw 不再需要 SDK helper
    來註冊工具包裝器。

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **舊版**：使用 `formatInboundEnvelope(...)` (以及
    `ChannelMessageForAgent.channelEnvelope`) 從傳入的頻道訊息
    建構扁平純文字提示封套。

    **新版**：使用 `BodyForAgent` 加上結構化的使用者
    上下文區塊。頻道外掛將路由元資料 (thread、topic、reply-to、reactions)
    作為型別欄位附加，而不是將其串連成提示字串。`formatAgentEnvelope(...)` helper
    仍然支援合成助理導向的封套，但傳入的純文字封套即將被淘汰。

    受影響的區域：`inbound_claim`、
    `message_received`，以及任何後處理
    `channelEnvelope` 文字的自訂
    頻道外掛。

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **舊版**：`api.on("deactivate", handler)`。

    **新版**：`api.on("gateway_stop", handler)`。事件和內容是相同的關機清理合約；僅變更了 hook 名稱。

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

    `deactivate` 在 2026-08-16 之前仍作為已棄用的相容性別名保留。

  </Accordion>

  <Accordion title="subagent_spawning hook → core thread binding">
    **舊版**：`api.on("subagent_spawning", handler)` 傳回
    `threadBindingReady` 或 `deliveryOrigin`。

    **新版**：讓核心透過通道 session-binding 介面卡準備 `thread: true` 子代理程式繫結。僅將 `api.on("subagent_spawned", handler)`
    用於啟動後觀察。

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

    當外部外掛程式進行遷移時，`subagent_spawning`、`PluginHookSubagentSpawningEvent`、
    `PluginHookSubagentSpawningResult` 和
    `SubagentLifecycleHookRunner.runSubagentSpawning(...)` 僅作為已棄用的相容性介面保留。

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    四個探索型別別名現在是目錄時期型別的簡單包裝函式：

    | 舊版別名                 | 新型別                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外還有舊版 `ProviderCapabilities` 靜態包 - 提供者外掛程式應使用明確的提供者 hook，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是靜態物件。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **舊版**（`ProviderThinkingPolicy` 上的三個獨立 hooks）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：單一 `resolveThinkingProfile(ctx)`，其回傳包含標準 `id`、選用 `label` 和排名等級清單的 `ProviderThinkingProfile`。OpenClaw 會自動依據設定檔排名降級過期的儲存值。

    Context 包含 `provider`、`modelId`、選用的合併 `reasoning` 和選用的合併模型 `compat` 事實。供應商外掛可以在設定的請求合約支援時，使用那些目錄事務來公開模型專用的設定檔。

    實作一個 hook 而非三個。舊版 hooks 在棄用期間持續運作，但不會與設定檔結果組合。

  </Accordion>

  <Accordion title="External auth providers → contracts.externalAuthProviders">
    **舊版**：實作外部認證 hooks 而未在外掛 manifest 中宣告供應商。

    **新版**：在外掛 manifest 中宣告 `contracts.externalAuthProviders`
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
    **舊版** manifest 欄位：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新版**：將相同的環境變數查詢映射到 manifest 上的 `setup.providers[].envVars`。這會將設定/狀態環境中繼資料整合在同一個地方，並避免僅為了回應環境變數查詢而啟動外掛執行時期。

    `providerAuthEnvVars` 在棄用視窗結束前透過相容性轉接器持續獲得支援。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **舊版**：三個分開的呼叫 -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **新版**：在 memory-state API 上的單一呼叫 -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    相同的插槽，單一的註冊呼叫。累加式提示和語料庫輔助函式
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) 不受影響。

  </Accordion>

  <Accordion title="Memory embedding provider API">
    **舊版**：`api.registerMemoryEmbeddingProvider(...)` 加上
    `contracts.memoryEmbeddingProviders`.

    **新版**：`api.registerEmbeddingProvider(...)` 加上
    `contracts.embeddingProviders`.

    通用嵌入提供者契約可在記憶體之外重複使用，並且是新提供者的支援途徑。記憶體特定的註冊 API 在現有提供者遷移期間仍作為已棄用的相容性連線。外掛程式檢查會將非內綁定的使用報告為相容性債務。

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    從 `src/plugins/runtime/types.ts` 仍然匯出了兩個舊版類型別名：

    | Old                           | New                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    執行時期方法 `readSession` 已棄用，建議改用
    `getSessionMessages`。簽章相同；舊方法會呼叫新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **舊版**：`runtime.tasks.flow` (單數) 傳回即時任務流程存取器。

    **新版**：`runtime.tasks.managedFlows` 為從流程建立、更新、取消或執行子任務的外掛程式保留受管理的 TaskFlow 變更
    執行時期。當外掛程式只需要基於 DTO 的讀取時，請使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">上文「如何遷移 → 將嵌入式 tool-result 擴充功能遷移至中介軟體」已涵蓋此內容。為求完整性在此列出：已移除的 embedded-runner-only `api.registerEmbeddedExtensionFactory(...)` 路徑已由 `api.registerAgentToolResultMiddleware(...)` 取代，並在 `contracts.agentToolResultMiddleware` 中提供明確的執行時期清單。</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    從 `openclaw/plugin-sdk` 重新匯出的 `OpenClawSchemaType` 現在是
    `OpenClawConfig` 的單行別名。建議優先使用正式名稱。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>擴充功能層級的棄用（位於 `extensions/` 下的打包 channel/provider 外掛內部）會在其自己的 `api.ts` 和 `runtime-api.ts` barrels 中追蹤。這些棄用不會影響第三方外掛合約，因此未在此處列出。如果您直接使用打包外掛的本機 barrel，請在升級前閱讀該 barrel 中的棄用註解。</Note>

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

- [Getting Started](/zh-Hant/plugins/building-plugins) - 建構您的第一個外掛
- [SDK Overview](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) - 建構頻道外掛
- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) - 建構提供者外掛
- [Plugin Internals](/zh-Hant/plugins/architecture) - 架構深度剖析
- [Plugin Manifest](/zh-Hant/plugins/manifest) - Manifest 綱要參考

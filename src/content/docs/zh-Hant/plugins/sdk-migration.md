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

- **`openclaw/plugin-sdk/compat`** - 單一匯入，重新匯出了數十個
  輔助函式。它的引進是為了在建構新外掛架構的同時，讓較舊的 hook 型外掛能繼續運作。
- **`openclaw/plugin-sdk/infra-runtime`** - 廣泛的執行時輔助函式集合，
  混合了系統事件、heartbeat 狀態、傳遞佇列、fetch/proxy 輔助函式、
  檔案輔助函式、審核類型以及其他不相關的公用程式。
- **`openclaw/plugin-sdk/config-runtime`** - 廣泛的設定相容集合，
  在遷移期間仍然包含已棄用的直接載入/寫入輔助函式。
- **`openclaw/extension-api`** - 橋樑，讓外掛可以直接存取
  主機端輔助函式，例如嵌入式 agent 執行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 已移除的僅限 Pi 的捆綁
  擴充 hook，可以觀察嵌入式執行器事件，例如
  `tool_result`。

這些廣泛的匯入介面現已**棄用**。它們在執行時期仍然可以運作，但新的外掛程式不應再使用它們，且現有的外掛程式應在下一次主要發行版本移除這些介面之前完成遷移。僅限 Pi 版本的內建擴充功能工廠註冊 API 已被移除；請改用工具結果中介軟體。

OpenClaw 不會在引入替代方案的同一變更中移除或重新解讀已記載的插件行為。破壞性契約變更必須先經過相容性配接器、診斷、文件和棄用期。這適用於 SDK 匯入、清單欄位、設定 API、Hook 和執行時期註冊行為。

<Warning>向後相容層將在未來的主要版本中移除。 屆時，仍從這些介面匯入的插件將會中斷運作。 僅限 Pi 的嵌入式擴充功能工廠註冊已無法載入。</Warning>

## 為何變更

舊方法導致了以下問題：

- **啟動緩慢** - 匯入一個輔助函式會載入數十個不相關的模組
- **循環相依** - 廣泛的重新匯出使得建立匯入循環變得容易
- **API 介面不明確** - 無法區分哪些匯出是穩定的，哪些是內部使用的

現代化外掛 SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`)
都是一個小型、獨立的模組，具有明確的目的和記錄在案的合約。

針對捆綁頻道的舊版提供者便捷縫隙也已移除。
品牌頻道的輔助函式縫隙是私有的 mono-repo 捷徑，而非穩定的
外掛合約。請改用狹窄的通用 SDK 子路徑。在捆綁
外掛工作區內，將提供者擁有的輔助函式保留在該外掛自己的 `api.ts` 或
`runtime-api.ts` 中。

目前的內建提供者範例：

- Anthropic 將 Claude 特定的串流輔助函式保留在自己的 `api.ts` /
  `contract-api.ts` 縫隙中
- OpenAI 將提供者建構器、預設模型輔助函式和即時提供者
  建構器保留在自己的 `api.ts` 中
- OpenRouter 將提供者建構器和上手/設定輔助函式保留在自己的
  `api.ts` 中

## Talk 與即時語音遷移計畫

即時語音、電話、會議和瀏覽器 Talk 程式碼正在從 surface-local 的回合記帳轉移到由 `openclaw/plugin-sdk/realtime-voice` 匯出的共享 Talk 會話控制器。新的控制器擁有常見的 Talk 事件包络、活躍回合狀態、擷取狀態、輸出音訊狀態、最近事件歷史記錄以及過時回合拒絕。提供商插件應繼續擁有廠商特定的即時會話；surface 插件應繼續擁有擷取、播放、電話和會議的怪異行為。

這次 Talk 遷移是有意進行徹底的中斷性變更：

1. 將共享控制器/執行時期基本元素保留在 `plugin-sdk/realtime-voice` 中。
2. 將捆綁的介面移至共享控制器：瀏覽器中繼、受控會議室移交、語音通話即時、語音通話串流 STT、Google Meet 即時，以及原生按鍵通話。
3. 將舊的 Talk RPC 系列替換為最終的 `talk.session.*` 和 `talk.client.*` API。
4. 在 Gateway `hello-ok.features.events` 中通告一個即時 Talk 事件通道：`talk.event`。
5. 刪除舊的即時 HTTP 端點以及任何請求時指令覆寫路徑。

新程式碼不應直接呼叫 `createTalkEventSequencer(...)`，除非它是實作低階配接器或測試裝置。優先使用共享控制器，這樣回合範圍事件就無法在沒有回合 ID 的情況下發出，過時的 `turnEnd` / `turnCancel` 呼叫無法清除較新的活躍回合，且輸出音訊生命週期事件在電話、會議、瀏覽器中繼、受控會室移交和原生 Talk 用戶端之間保持一致。

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

瀏覽器擁有的 WebRTC/提供商 websocket 會話使用 `talk.client.create`，因為瀏覽器擁有提供商協商和媒體傳輸，而 Gateway 擁有憑證、指令和工具策略。`talk.session.*` 是 gateway-relay 即時、gateway-relay 轉錄和受控會室原生 STT/TTS 會話的常見 Gateway 管理表面。

將即時選擇器放置在 `talk.provider` / `talk.providers` 旁邊的舊版設定應使用 `openclaw doctor --fix` 修復；執行時期 Talk 不會將語音/TTS 提供商設定重新解釋為即時提供商設定。

支援的 `talk.session.create` 組合是有意保持較少的：

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

| 方法                            | 適用於                                                  | 合約                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`，`transcription/gateway-relay` | 將 base64 PCM 音訊區塊附加到屬於同一個 Gateway 連線的提供者會話。                                                                                  |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 開始一個受管理房間的使用者輪次。                                                                                                                   |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在過時輪次驗證後結束活躍輪次。                                                                                                                     |
| `talk.session.cancelTurn`       | 所有 Gateway 擁有的會話                                 | 取消某個輪次的活躍擷取/提供者/代理/TTS 工作。                                                                                                      |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助理音訊輸出，而不一定結束使用者輪次。                                                                                                         |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成中繼器發出的提供者工具呼叫；傳遞 `options.willContinue` 以進行中間輸出，或傳遞 `options.suppressResponse` 以滿足該呼叫而不需要另一個助理回應。 |
| `talk.session.close`            | 所有統一會話                                            | 停止中繼器會話或撤銷受管理房間狀態，然後忘記統一會話 ID。                                                                                          |

不要為了讓這項工作運作而在核心中引入供應商或平台的特殊情況處理。核心擁有 Talk 語意的語義。供應商外掛程式擁有供應商會話設定。Voice-call 和 Google Meet 擁有電話會議/會議配接器。瀏覽器和原生應用程式擁有裝置擷取/播放的使用者體驗。

## 相容性政策

對於外部外掛程式，相容性工作遵循以下順序：

1. 加入新的合約
2. 透過相容性配接器保持舊行為的連線
3. 發出指出舊路徑和替代方案的診斷或警告
4. 在測試中涵蓋這兩條路徑
5. 記錄棄用和遷移路徑
6. 僅在公佈的遷移期限之後移除，通常是在主要版本中

維護者可以使用 `pnpm plugins:boundary-report` 審核目前的遷移佇列。使用 `pnpm plugins:boundary-report:summary` 取得簡潔計數，`--owner <id>` 用於單一外掛或相容性負責人，以及 `pnpm plugins:boundary-report:ci` 當 CI 閘道應因過期的相容性記錄、跨負責人保留的 SDK 匯入，或未使用的保留 SDK 子路徑而失敗時。此報告會依移除日期分組已棄用的相容性記錄，計算本機程式碼/文件參照，顯示跨負責人保留的 SDK 匯入，並總結私有的記憶體主機 SDK 橋樑，讓相容性清理保持明確，而非依賴臨時搜尋。保留的 SDK 子路徑必須有記錄的負責人使用情況；未使用的保留輔助匯出應從公開 SDK 中移除。

如果清單欄位仍被接受，外掛作者可以繼續使用它，直到文件和診斷另有說明為止。新程式碼應優先使用記載的替代方案，但現有的外掛在一般次要版本發布期間不應中斷。

## 如何遷移

<Steps>
  <Step title="遷移執行時配置讀取/寫入輔助函式">
    隨附插件應停止直接呼叫
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。應優先使用已傳入目前呼叫路徑的配置。需要目前程序快照的長效處理程式可以使用 `api.runtime.config.current()`。長效代理程式工具應該在 `execute` 中使用工具情境的 `ctx.getRuntimeConfig()`，以便在寫入配置之前建立的工具仍能看到重新整理後的執行時配置。

    配置寫入必須透過交易式輔助函式並選擇寫入後原則：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    當呼叫端知道變更需要乾淨的閘道重新啟動時，請使用 `afterWrite: { mode: "restart", reason: "..." }`；僅當呼叫端擁有後續處理權並刻意想要抑制重新載入規劃程式時，才使用
    `afterWrite: { mode: "none", reason: "..." }`。變異結果包含用於測試和記錄的型別化 `followUp` 摘要；閘道仍負責套用或排程重新啟動。
    `loadConfig` 和 `writeConfigFile` 在遷移期間仍作為外部插件的已棄用相容性輔助函式，並會以 `runtime-config-load-write` 相容性程式碼警告一次。隨附插件和存放庫執行時程式碼受到 `pnpm check:deprecated-api-usage` 和
    `pnpm check:no-runtime-action-load-config` 中掃描器防護機制的保護：新的生產環境插件使用會直接失敗，直接配置寫入會失敗，閘道伺服器方法必須使用要求執行時快照，執行時通道傳送/動作/用戶端輔助函式必須從其邊界接收配置，而長效執行時模組完全不允許周邊 `loadConfig()` 呼叫。

    新的插件程式碼也應避免匯入廣泛的
    `openclaw/plugin-sdk/config-runtime` 相容性彙整桶。請使用符合工作需求的狹窄 SDK 子路徑：

    | 需求 | 匯入 |
    | --- | --- |
    | 配置型別，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | 已載入的配置斷言和插件入口配置查詢 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 目前執行時快照讀取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置寫入 | `openclaw/plugin-sdk/config-mutation` |
    | 工作階段存放區輔助函式 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 群組原則執行時輔助函式 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 祕密輸入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/工作階段覆寫 | `openclaw/plugin-sdk/model-session-runtime` |

    隨附插件及其測試受到針對廣泛彙整桶的掃描器防護，因此匯入和模擬會保持在所需的行為範圍內。廣泛彙整桶為了外部相容性仍然存在，但新程式碼不應依賴它。

  </Step>

  <Step title="將 Pi 工具結果擴充功能遷移至中介軟體">
    捆綁外掛程式必須將僅限 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 工具結果處理常式替換為
    與執行時期無關的中介軟體。

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同時更新外掛程式資訊清單：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部外掛程式無法註冊工具結果中介軟體，因為它可以在模型看到之前重寫高信任度的工具輸出。

  </Step>

  <Step title="將 approval-native 處理常式遷移至 capability facts">
    具備審核功能的頻道外掛程式現在透過
    `approvalCapability.nativeRuntime` 加上共用的執行時期環境內容登錄檔來公開原生審核行為。

    主要變更：

    - 將 `approvalCapability.handler.loadRuntime(...)` 取代為
      `approvalCapability.nativeRuntime`
    - 將專屬於審核的驗證/傳遞從舊版 `plugin.auth` /
      `plugin.approvals` 接線移至 `approvalCapability`
    - `ChannelPlugin.approvals` 已從公開頻道外掛程式合約中移除；將傳遞/原生/轉譯欄位移至 `approvalCapability`
    - `plugin.auth` 僅保留給頻道登入/登出流程；核心不再讀取該處的審核驗證攔截器
    - 透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊頻道擁有的執行時期物件，例如客戶端、權杖或 Bolt 應用程式
    - 請勿從原生審核處理常式傳送外掛程式擁有的重新路由通知；核心現在擁有來自實際傳遞結果的已路由至其他位置通知
    - 將 `channelRuntime` 傳入 `createChannelManager(...)` 時，請提供
      真實的 `createPluginRuntime().channel` 介面。將會拒絕部分存根。

    請參閱 `/plugins/sdk-channel-plugins` 以取得目前的審核能力配置。

  </Step>

  <Step title="稽核 Windows 包裝函式後援行為">
    如果您的外掛程式使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包裝函式現在會以封閉模式失敗，除非您明確傳遞
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

    如果您的呼叫端並非故意依賴 shell 後援，請勿設定
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

  <Step title="替換為專注的匯入">
    舊介面的每個匯出項目都對應到特定的現代匯入路徑：

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

    對於主機端輔助函式，請使用注入的外掛程式執行環境，而非直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
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

  <Step title="Replace broad infra-runtime imports">
    `openclaw/plugin-sdk/infra-runtime` 仍然存在以保持外部相容性，但新程式碼應匯入其實際需要的專屬輔助介面：

    | 需求 | 匯入 |
    | --- | --- |
    | 系統事件佇列輔助函式 | `openclaw/plugin-sdk/system-event-runtime` |
    | Heartbeat 喚醒、事件及可見性輔助函式 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待傳遞佇列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 頻道活動遙測 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 記憶體內去重快取 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全本機檔案/媒體路徑輔助函式 | `openclaw/plugin-sdk/file-access-runtime` |
    | Dispatcher-aware fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | Proxy 與守衛式 fetch 輔助函式 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF dispatcher 政策類型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 核准請求/解決類型 | `openclaw/plugin-sdk/approval-runtime` |
    | 核准回應承載與指令輔助函式 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 錯誤格式化輔助函式 | `openclaw/plugin-sdk/error-runtime` |
    | 傳輸就緒等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全權杖輔助函式 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界非同步工作並行 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 數值強制轉換 | `openclaw/plugin-sdk/number-runtime` |
    | 行程本機非同步鎖 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 檔案鎖 | `openclaw/plugin-sdk/file-lock` |

    隨附外掛程式受掃描器防護，防止使用 `infra-runtime`，因此儲存庫程式碼無法回退到寬廣的桶裡匯入。

  </Step>

  <Step title="Migrate channel route helpers">
    新的通道路由程式碼應該使用 `openclaw/plugin-sdk/channel-route`。
    較舊的 route-key 和 comparable-target 名稱在遷移視窗期間將作為相容性別名保留，但新外掛應使用直接描述行為的路由名稱：

    | 舊的輔助函式 | 現代輔助函式 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    現代路由輔助函式在原生審批、回覆抑制、入站去重、cron 傳遞和工作階段路由之間一致地規範 `{ channel, to, accountId, threadId }`

。如果您的外掛擁有自訂目標語法，請使用 `resolveChannelRouteTargetWithParser(...)` 將該解析器調整為相同的路由目標合約。

  </Step>

  <Step title="Build and test">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="常見匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛程式輔助函式 | `definePluginEntry` | | `plugin-sdk/core` | 舊版通用重新匯出，用於頻道進入點定義/建構器 | `defineChannelPluginEntry`、`createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根組態架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者進入點輔助函式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 針對性頻道進入點定義與建構器 | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` | | `plugin-sdk/setup` | 共用設置精靈輔助函式 | 設置翻譯器、允許清單提示、設置狀態建構器 | | `plugin-sdk/setup-runtime` | 設置時執行階段輔助函式 |
  `createSetupTranslator`、匯入安全的設置修補程式介面卡、查找備忘錄輔助函式、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設置代理 | | `plugin-sdk/setup-adapter-runtime` | 已棄用的設置介面卡別名 | 請使用 `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | 設置工具輔助函式 | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
  | `plugin-sdk/account-core` | 多帳戶輔助函式 | 帳戶清單/組態/動作閘道輔助函式 | | `plugin-sdk/account-id` | 帳戶 ID 輔助函式 | `DEFAULT_ACCOUNT_ID`、帳戶 ID 正規化 | | `plugin-sdk/account-resolution` | 帳戶查找輔助函式 | 帳戶查找 + 預設後援輔助函式 | | `plugin-sdk/account-helpers` | 狹窄帳戶輔助函式 | 帳戶清單/帳戶動作輔助函式 | | `plugin-sdk/channel-setup` | 設置精靈介面卡 |
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，外加 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對原語 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前綴、輸入與來源傳遞佈線 |
  `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | 組態介面卡工廠與 DM 存取輔助函式 | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | 組態架構建構器 |
  僅限共用頻道組態架構原語與泛型建構器 | | `plugin-sdk/bundled-channel-config-schema` | 捆綁組態架構 | 僅限 OpenClaw 維護的捆綁外掛程式；新外掛程式必須定義外掛程式本機架構 | | `plugin-sdk/channel-config-schema-legacy` | 已棄用的捆綁組態架構 | 僅限相容性別名；維護中的捆綁外掛程式請使用 `plugin-sdk/bundled-channel-config-schema` | | `plugin-sdk/telegram-command-config` | Telegram 指令組態輔助函式 |
  指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 帳戶狀態與草稿串流生命週期輔助函式 | `createAccountStatusSink`、草稿預覽最終確定輔助函式 | | `plugin-sdk/inbound-envelope` | 進入信封輔助函式 | 共用路由 + 信封建構器輔助函式 | | `plugin-sdk/inbound-reply-dispatch` | 進入回覆輔助函式
  | 共用記錄與分發輔助函式 | | `plugin-sdk/messaging-targets` | 訊息傳送目標剖析 | 目標剖析/比對輔助函式 | | `plugin-sdk/outbound-media` | 傳出媒體輔助函式 | 共用傳出媒體載入 | | `plugin-sdk/outbound-send-deps` | 傳出傳送相依性輔助函式 | 輕量級 `resolveOutboundSendDep` 查找，無需匯入完整傳出執行階段 | | `plugin-sdk/outbound-runtime` | 傳出執行階段輔助函式 |
  傳出傳遞、身分/傳送委派、工作階段、格式化與酬載規劃輔助函式 | | `plugin-sdk/thread-bindings-runtime` | 執行緒綁定輔助函式 | 執行緒綁定生命週期與介面卡輔助函式 | | `plugin-sdk/agent-media-payload` | 舊版媒體酬載輔助函式 | 適用於舊版欄位配置的代理媒體酬載建構器 | | `plugin-sdk/channel-runtime` | 已棄用的相容性填充層 | 僅限舊版頻道執行階段公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型
  | 回覆結果類型 | | `plugin-sdk/runtime-store` | 永久性外掛程式儲存空間 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛執行階段輔助函式 | 執行階段/記錄/備份/外掛程式安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹窄執行階段環境輔助函式 | 記錄器/執行階段環境、逾時、重試與退避輔助函式 | | `plugin-sdk/plugin-runtime` | 共用外掛程式執行階段輔助函式 | 外掛程式指令/攔截器/HTTP/互動式輔助函式
  | | `plugin-sdk/hook-runtime` | 攔截器管線輔助函式 | 共用 Webhook/內部攔截器管線輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲載入執行階段輔助函式 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序輔助函式 | 共用執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI
  執行階段輔助函式 | 指令格式化、等待、版本輔助函式 | | `plugin-sdk/gateway-runtime` | 閘道輔助函式 | 閘道用戶端、事件循緒就緒啟動輔助函式與頻道狀態修補輔助函式 | | `plugin-sdk/config-runtime` | 已棄用的組態相容性填充層 | 建議優先使用 `config-contracts`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助函式 |
  當捆綁的 Telegram 合約介面無法使用時，提供後援穩定的 Telegram 指令驗證輔助函式 | | `plugin-sdk/approval-runtime` | 核准提示輔助函式 | 執行/外掛程式核准酬載、核准功能/設定檔輔助函式、原生核准路由/執行階段輔助函式，以及結構化核准顯示路徑格式化 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助函式 | 核准者解析、相同聊天動作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助函式 |
  原生執行核准設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 核准傳遞輔助函式 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助函式 | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助函式 | 適用於熱頻道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 核准處理器輔助函式 |
  更廣泛的核准處理器執行階段輔助函式；當介面卡/閘道足夠時，建議優先使用狹窄的介面卡/閘道 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助函式 | 原生核准目標/帳戶綁定輔助函式 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助函式 | 執行/外掛程式核准回覆酬載輔助函式 | | `plugin-sdk/channel-runtime-context` | 頻道執行階段內容輔助函式 | 泛型頻道執行階段內容暫存器/取得/監看輔助函式 | |
  `plugin-sdk/security-runtime` | 安全性輔助函式 | 共用信任、DM 閘道、根邊界檔案/路徑輔助函式、外部內容與祕密收集輔助函式 | | `plugin-sdk/ssrf-policy` | SSRF 原則輔助函式 | 主機允許清單與私人網路原則輔助函式 | | `plugin-sdk/ssrf-runtime` | SSRF 執行階段輔助函式 | 釘選分派器、防護擷取、SSRF 原則輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件輔助函式 |
  `enqueueSystemEvent`、`peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | 心跳輔助函式 | 心跳喚醒、事件與可見性輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 傳遞佇列輔助函式 | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | 頻道活動輔助函式 | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | 去重輔助函式 | 記憶體內去重快取 | |
  `plugin-sdk/file-access-runtime` | 檔案存取輔助函式 | 安全的本機檔案/媒體路徑輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒輔助函式 | `waitForTransportReady` | | `plugin-sdk/collection-runtime` | 有界快取輔助函式 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘道輔助函式 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` |
  錯誤格式化輔助函式 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖表輔助函式 | | `plugin-sdk/fetch-runtime` | 包裝擷取/代理輔助函式 | `resolveFetch`、代理輔助函式、EnvHttpProxyAgent 選項輔助函式 | | `plugin-sdk/host-runtime` | 主機正規化輔助函式 | `normalizeHostname`、`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助函式 | `RetryConfig`、`retryAsync`、原則執行器 | |
  `plugin-sdk/allow-from` | 允許清單格式化 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道與指令介面輔助函式 | `resolveControlCommandGate`、發送者授權輔助函式、指令登錄輔助函式（包括動態引數選單格式化） | | `plugin-sdk/command-status` | 指令狀態/說明轉譯器 |
  `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 祕密輸入剖析 | 祕密輸入輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助函式 | Webhook 目標公用程式 | | `plugin-sdk/webhook-request-guards` | Webhook 內文防護輔助函式 | 要求內文讀取/限制輔助函式 | | `plugin-sdk/reply-runtime` | 共用回覆執行階段 | 進入分發、心跳、回覆規劃器、分塊
  | | `plugin-sdk/reply-dispatch-runtime` | 狹窄回覆分發輔助函式 | 最終確定、提供者分發與對話標籤輔助函式 | | `plugin-sdk/reply-history` | 回覆記錄輔助函式 | `createChannelHistoryWindow`；已棄用的對應輔助相容性匯出，例如 `buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參考規劃 | `createReplyReferencePlanner`
  | | `plugin-sdk/reply-chunking` | 回覆分塊輔助函式 | 文字/Markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | 工作階段存放區輔助函式 | 存放區路徑 + 更新時間輔助函式 | | `plugin-sdk/state-paths` | 狀態路徑輔助函式 | 狀態與 OAuth 目錄輔助函式 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助函式 |
  `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助函式 | | `plugin-sdk/status-helpers` | 頻道狀態輔助函式 | 頻道/帳戶狀態摘要建構器、執行階段狀態預設值、問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 目標解析器輔助函式 | 共用目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助函式 |
  Slug/字串正規化輔助函式 | | `plugin-sdk/request-url` | 要求 URL 輔助函式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助函式 | 計時指令執行器，具備正規化的 stdout/stderr | | `plugin-sdk/param-readers` | 參數讀取器 | 常用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 工具酬載擷取 | 從工具結果物件中擷取正規化酬載 | | `plugin-sdk/tool-send` | 工具傳送擷取 |
  從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助函式 | 共用暫存下載路徑輔助函式 | | `plugin-sdk/logging-core` | 記錄輔助函式 | 子系統記錄器與編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助函式 | Markdown 表格模式輔助函式 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆酬載類型 | | `plugin-sdk/provider-setup` |
  精選的本機/自託管提供者設置輔助函式 | 自託管提供者探索/組態輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 針對性 OpenAI 相容自託管提供者設置輔助函式 | 相同的自託管提供者探索/組態輔助函式 | | `plugin-sdk/provider-auth-runtime` | 提供者執行階段驗證輔助函式 | 執行階段 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設置輔助函式 | API 金鑰上架/設定檔寫入輔助函式
  | | `plugin-sdk/provider-auth-result` | 提供者驗證結果輔助函式 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-selection-runtime` | 提供者選取輔助函式 | 已設定或自動提供者選取與原始提供者組態合併 | | `plugin-sdk/provider-env-vars` | 提供者環境變數輔助函式 | 提供者驗證環境變數查找輔助函式 | | `plugin-sdk/provider-model-shared` | 共用提供者模型/重播輔助函式 |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播原則建構器、提供者端點輔助函式與模型 ID 正規化輔助函式 | | `plugin-sdk/provider-catalog-shared` | 共用提供者型錄輔助函式 | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | |
  `plugin-sdk/provider-onboard` | 提供者上架修補 | 上架組態輔助函式 | | `plugin-sdk/provider-http` | 提供者 HTTP 輔助函式 | 泛型提供者 HTTP/端點功能輔助函式，包括音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch` | 提供者網頁擷取輔助函式 | 網頁擷取提供者註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 提供者網頁搜尋組態輔助函式 |
  狹窄網頁搜尋組態/憑證輔助函式，適用於不需要外掛程式啟用佈線的提供者 | | `plugin-sdk/provider-web-search-contract` | 提供者網頁搜尋合約輔助函式 | 狹窄網頁搜尋組態/憑證合約輔助函式，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 提供者網頁搜尋輔助函式 |
  網頁搜尋提供者註冊/快取/執行階段輔助函式 | | `plugin-sdk/provider-tools` | 提供者工具/架構相容輔助函式 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 以及 Gemini 架構清理 + 診斷 | | `plugin-sdk/provider-usage` | 提供者使用量輔助函式 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage` 以及其他提供者使用量輔助函式 | | `plugin-sdk/provider-stream` |
  提供者串流包裝函式輔助函式 | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝函式類型，以及共用 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助函式 | | `plugin-sdk/provider-transport-runtime` | 提供者傳輸輔助函式 | 原生提供者傳輸輔助函式，例如防護擷取、傳輸訊息轉換與可寫入傳輸事件串流 |
  | `plugin-sdk/keyed-async-queue` | 排序非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助函式 | 媒體擷取/轉換/存放輔助函式、ffprobe 支援的影片尺寸探測與媒體酬載建構器 | | `plugin-sdk/media-generation-runtime` | 共用媒體生成輔助函式 | 共用故障轉移輔助函式、候選選取，以及圖片/影片/音樂生成遺失模型訊息 | | `plugin-sdk/media-understanding` | 媒體理解輔助函式 |
  媒體理解提供者類型加上提供者端圖片/音訊輔助匯出 | | `plugin-sdk/text-runtime` | 已棄用的廣泛文字相容性匯出 | 請使用 `string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core` | | `plugin-sdk/text-chunking` | 文字分塊輔助函式 | 傳出文字分塊輔助函式 | | `plugin-sdk/speech` | 語音輔助函式 | 語音提供者類型加上提供者端指示詞、登錄、驗證輔助函式，以及 OpenAI 相容 TTS 建構器 | |
  `plugin-sdk/speech-core` | 共用語音核心 | 語音提供者類型、登錄、指示詞、正規化 | | `plugin-sdk/realtime-transcription` | 即時轉錄輔助函式 | 提供者類型、登錄輔助函式與共用 WebSocket 工作階段輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音輔助函式 | 提供者類型、登錄/解析輔助函式、橋接器工作階段輔助函式、共用代理傳回佇列、逐字稿/事件健康狀態、回音抑制與快速內容諮詢輔助函式 | |
  `plugin-sdk/image-generation` | 圖片生成輔助函式 | 圖片生成提供者類型加上圖片資產/資料 URL 輔助函式與 OpenAI 相容圖片提供者建構器 | | `plugin-sdk/image-generation-core` | 共用圖片生成核心 | 圖片生成類型、故障轉移、驗證與登錄輔助函式 | | `plugin-sdk/music-generation` | 音樂生成輔助函式 | 音樂生成提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂生成核心 |
  音樂生成類型、故障轉移輔助函式、提供者查找與模型參照剖析 | | `plugin-sdk/video-generation` | 影片生成輔助函式 | 影片生成提供者/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成核心 | 影片生成類型、故障轉移輔助函式、提供者查找與模型參照剖析 | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助函式 | 互動式回覆酬載正規化/精簡 | | `plugin-sdk/channel-config-primitives` |
  頻道組態原語 | 狹窄頻道組態架構原語 | | `plugin-sdk/channel-config-writes` | 頻道組態寫入輔助函式 | 頻道組態寫入授權輔助函式 | | `plugin-sdk/channel-plugin-common` | 共用頻道前奏 | 共用頻道外掛程式前奏匯出 | | `plugin-sdk/channel-status` | 頻道狀態輔助函式 | 共用頻道狀態快照/摘要輔助函式 | | `plugin-sdk/allowlist-config-edit` | 允許清單組態輔助函式 | 允許清單組態編輯/讀取輔助函式 | |
  `plugin-sdk/group-access` | 群組存取輔助函式 | 共用群組存取決策輔助函式 | | `plugin-sdk/direct-dm` | 直接 DM 輔助函式 | 共用直接 DM 驗證/防護輔助函式 | | `plugin-sdk/extension-shared` | 共用擴充功能輔助函式 | 被動頻道/狀態與環境代理輔助原語 | | `plugin-sdk/webhook-targets` | Webhook 目標輔助函式 | Webhook 目標登錄與路由安裝輔助函式 | | `plugin-sdk/webhook-path` | 已棄用的 Webhook 路徑別名 |
  請使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共用網頁媒體輔助函式 | 遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 已棄用的 Zod 相容性重新匯出 | 直接從 `zod` 匯入 `zod` | | `plugin-sdk/memory-core` | 捆綁記憶核心輔助函式 | 記憶管理員/組態/檔案/CLI 輔助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶引擎執行階段外觀 | 記憶索引/搜尋執行階段外觀 | |
  `plugin-sdk/memory-core-host-engine-foundation` | 記憶主機基礎引擎 | 記憶主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶主機內嵌引擎 | 記憶內嵌合約、登錄存取、本機提供者與泛型批次/遠端輔助函式；具體遠端提供者位於其擁有的外掛程式中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶主機 QMD 引擎 | 記憶主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` |
  記憶主機儲存引擎 | 記憶主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶主機多模態輔助函式 | 記憶主機多模態輔助函式 | | `plugin-sdk/memory-core-host-query` | 記憶主機查詢輔助函式 | 記憶主機查詢輔助函式 | | `plugin-sdk/memory-core-host-secret` | 記憶主機祕密輔助函式 | 記憶主機祕密輔助函式 | | `plugin-sdk/memory-core-host-events` | 已棄用的記憶事件別名 | 請使用
  `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶主機狀態輔助函式 | 記憶主機狀態輔助函式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶主機 CLI 執行階段 | 記憶主機 CLI 執行階段輔助函式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶主機核心執行階段 | 記憶主機核心執行階段輔助函式 | | `plugin-sdk/memory-core-host-runtime-files` |
  記憶主機檔案/執行階段輔助函式 | 記憶主機檔案/執行階段輔助函式 | | `plugin-sdk/memory-host-core` | 記憶主機核心執行階段別名 | 記憶主機核心執行階段輔助函式的廠商中性別名 | | `plugin-sdk/memory-host-events` | 記憶主機事件日誌別名 | 記憶主機事件日誌輔助函式的廠商中性別名 | | `plugin-sdk/memory-host-files` | 已棄用的記憶檔案/執行階段別名 | 請使用 `plugin-sdk/memory-core-host-runtime-files` | |
  `plugin-sdk/memory-host-markdown` | 受控 Markdown 輔助函式 | 適用於記憶相鄰外掛程式的共用受控 Markdown 輔助函式 | | `plugin-sdk/memory-host-search` | 作用中記憶搜尋外觀 | 延遲載入作用中記憶搜尋管理員執行階段外觀 | | `plugin-sdk/memory-host-status` | 已棄用的記憶主機狀態別名 | 請使用 `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | 測試公用程式 |
  存放庫本機已棄用相容性匯出桶；請使用針對性存放庫本機測試子路徑，例如 `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表格有意僅列出常見的遷移子集，而非完整的 SDK 表面。編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出項是從公開子集生成的。

保留的捆绑插件輔助接縫已從公開 SDK 匯出對映中移除，除了明確記載的相容性外觀，例如為已發布的 `@openclaw/discord@2026.3.13` 套件保留的已棄用 `plugin-sdk/discord` 填充層。所有者專用的輔助函式位於所屬的插件套件內；共享的主機行為應透過通用的 SDK 合約（例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`）進行遷移。

使用符合作業需求的最窄匯入路徑。如果您找不到匯出項，請檢查 `src/plugin-sdk/` 的原始碼，或詢問維護者該由哪個通用合約來擁有它。

## 主動棄用項目

適用於外掛程式 SDK、提供者合約、
執行時期表面和資訊清單的較狹窄棄用項目。每個項目目前仍然有效，但將在未來的主要版本中
移除。每個項目下方的條目會將舊 API 對應至其
正式取代項目。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **舊版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的簽章，相同的匯出項——僅是從更窄的子路徑匯入。`command-auth`
    將它們作為相容性存根重新匯出。

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

    **新版**：`resolveInboundMentionDecision({ facts, policy })`——傳回單一決策物件，而非兩個分開的呼叫。

    下游頻道插件（Slack、Discord、Matrix、MS Teams）已經完成切換。

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是用於較舊
    channel 外掛的相容性 shim。請勿在新程式碼中匯入它；請使用
    `openclaw/plugin-sdk/channel-runtime-context` 來註冊執行階段
    物件。

    `channelActions*` 助手 in `openclaw/plugin-sdk/channel-actions` 已
    與原始的「actions」channel 匯出一起棄用。請改透過語意化的 `presentation` 介面公開功能 - channel
    外掛應宣告它們呈現的內容（卡片、按鈕、選擇器），而非宣告它們接受的原始
    action 名稱。

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **舊版**：`tool()` factory from `openclaw/plugin-sdk/provider-web-search`。

    **新版**：直接在 provider 外掛上實作 `createTool(...)`。
    OpenClaw 不再需要 SDK 助手來註冊 tool 包裝器。

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **舊版**：`formatInboundEnvelope(...)` (and
    `ChannelMessageForAgent.channelEnvelope`) 用來從輸入的 channel 訊息建構扁平的純文字提示
    信封。

    **新版**：`BodyForAgent` 加上結構化的使用者情境區塊。Channel
    外掛會將路由元資料（thread、topic、reply-to、reactions）作為
    具型別欄位附加，而非將其串連成提示字串。`formatAgentEnvelope(...)` 助手仍支援用於合成
    助理視角的信封，但輸入的純文字信封即將淘汰。

    受影響的區域：`inbound_claim`、`message_received`，以及任何對
    `channelEnvelope` 文字進行後處理的自訂
    channel 外掛。

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **舊版**：`api.on("deactivate", handler)`。

    **新版**：`api.on("gateway_stop", handler)`。事件與上下文相同，皆為關機清理契約 (shutdown cleanup contract)；僅變更了 Hook 名稱。

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

    `deactivate` 在 2026-08-16 之後仍作為已棄用的相容性別名保留連線。

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    四個發現類型 (discovery type) 別名現在是目錄時代 (catalog-era) 類型的薄層封裝 (thin wrappers)：

    | 舊版別名                 | 新類型                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    加上傳統的 `ProviderCapabilities` 靜態包 (static bag) —— Provider 插件應使用明確的 Provider Hooks，例如 `buildReplayPolicy`、`normalizeToolSchemas` 和 `wrapStreamFn`，而非使用靜態物件。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **舊版** (`ProviderThinkingPolicy` 上的三個分離 Hooks)：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：單一 `resolveThinkingProfile(ctx)`，會傳回包含規範 `id`、選用 `label` 和排序層級列表的 `ProviderThinkingProfile`。OpenClaw 會依設定檔等級自動降級過時的已儲存值。

    請實作一個 Hook 而非三個。傳統 Hooks 在棄用期間仍可運作，但不會與設定檔結果組合。

  </Accordion>

  <Accordion title="External OAuth provider fallback → contracts.externalAuthProviders">
    **舊版**：在未於外掛清單中宣告提供者的情況下實作 `resolveExternalOAuthProfiles(...)`。

    **新版**：在外掛清單中宣告 `contracts.externalAuthProviders`
    **並且** 實作 `resolveExternalAuthProfiles(...)`。舊的「auth
    fallback」路徑會在執行時發出警告，並將會被移除。

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

    **新版**：將相同的環境變數查找映射到清單上的 `setup.providers[].envVars`。
    這會將設定/狀態的環境元資料整合在一個地方，並避免僅為了回應環境變數查找而啟動外掛執行時。

    `providerAuthEnvVars` 在棄用窗口關閉前仍透過相容性配接器獲得支援。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **舊版**：三個分開的呼叫 -
    `api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、
    `api.registerMemoryRuntime(...)`。

    **新版**：在記憶狀態 API 上進行一次呼叫 -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的插槽，單一註冊呼叫。附加的記憶輔助程式
    (`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`、
    `registerMemoryEmbeddingProvider`) 不受影響。

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    從 `src/plugins/runtime/types.ts` 匯出的兩個舊版類型別名：

    | 舊版                           | 新版                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    執行時方法 `readSession` 已棄用，請改用
    `getSessionMessages`。簽章相同；舊方法會呼叫新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **舊版**：`runtime.tasks.flow` (單數) 返回即時任務流存取器。

    **新版**：`runtime.tasks.managedFlows` 保留受管理的 TaskFlow 變更
    運行時，適用於從流程中建立、更新、取消或執行子任務的
    外掛程式。當外掛程式僅需要基於 DTO 的讀取時，請使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">已在上方的「如何遷移 → 將 Pi tool-result 擴充功能遷移至中介軟體」中涵蓋。為求完整而在此列出：僅限 Pi 的已移除 `api.registerEmbeddedExtensionFactory(...)` 路徑已被 `api.registerAgentToolResultMiddleware(...)` 取代，並在 `contracts.agentToolResultMiddleware` 中包含明確的運行時清單。</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    從 `openclaw/plugin-sdk` 重新匯出的 `OpenClawSchemaType` 現在是
    `OpenClawConfig` 的單行別名。建議使用標準名稱。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>擴充功能層級的淘汰項目（在 `extensions/` 下的捆綁頻道/提供者外掛程式內） 會在其各自的 `api.ts` 和 `runtime-api.ts` barrels 中追蹤。它們不會影響第三方外掛程式合約，且未在此列出。如果您直接使用捆綁外掛程式的本地 barrel，請在升級前閱讀該 barrel 中的淘汰註解。</Note>

## 移除時程

| 時間               | 發生變化                                             |
| ------------------ | ---------------------------------------------------- |
| **現在**           | 已淘汰的介面會發出運行時警告                         |
| **下一個主要版本** | 已淘汰的介面將被移除；仍在使用它們的外掛程式將會失敗 |

所有核心外掛程式皆已遷移。外部外掛程式應在下一個主要版本發布前完成遷移。

## 暫時抑制警告

在您進行遷移時，請設定這些環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這只是一個暫時的應急措施，並非永久解決方案。

## 相關

- [入門指南](/zh-Hant/plugins/building-plugins) - 建立您的第一個外掛程式
- [SDK 概述](/zh-Hant/plugins/sdk-overview) - 完整子路徑導入參考
- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) - 建構頻道外掛程式
- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins) - 建構提供者外掛程式
- [外掛程式內部機制](/zh-Hant/plugins/architecture) - 架構深度解析
- [外掛程式清單](/zh-Hant/plugins/manifest) - 清單架構參考

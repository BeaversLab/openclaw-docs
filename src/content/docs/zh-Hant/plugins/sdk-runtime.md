---
summary: "api.runtime -- 可供插件使用的注入執行時輔助函數"
title: "Plugin runtime helpers"
sidebarTitle: "Runtime helpers"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

註冊期間注入每個外掛程式的 `api.runtime` 物件參考。請使用這些輔助函數，而不是直接匯入主機內部細節。

<CardGroup cols={2}>
  <Card title="Channel plugins" href="/zh-Hant/plugins/sdk-channel-plugins">
    針對頻道外掛程式在情境中使用這些輔助函數的逐步指南。
  </Card>
  <Card title="Provider plugins" href="/zh-Hant/plugins/sdk-provider-plugins">
    針對提供者外掛程式在情境中使用這些輔助函數的逐步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## 設定載入與寫入

偏好使用已傳入至目前呼叫路徑的設定，例如註冊期間的 `api.config` 或頻道/提供者回呼上的 `cfg` 引數。這能讓單一處理程序快照流經工作流程，而不是在熱路徑上重新解析設定。

僅當長期存活的處理常式需要目前的處理程序快照且未將設定傳遞給該函數時，才使用 `api.runtime.config.current()`。傳回值是唯讀的；編輯前請先複製或使用變異輔助函數。

工具工廠會接收 `ctx.runtimeConfig` 加上 `ctx.getRuntimeConfig()`。當建立工具定義後設定可能變更時，請在長期存活工具的 `execute` 回呼內使用 getter。

使用 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 保存變更。每次寫入都必須選擇明確的 `afterWrite` 政策：

- `afterWrite: { mode: "auto" }` 讓閘道重新載入規劃程式決定。
- `afterWrite: { mode: "restart", reason: "..." }` 當寫入者知道熱重新載入不安全時，強制進行乾淨的重新啟動。
- `afterWrite: { mode: "none", reason: "..." }` 僅當呼叫者擁有後續處理權時，才抑制自動重新載入/重新啟動。

變更輔助函式會傳回 `afterWrite` 加上類型的 `followUp` 摘要，以便呼叫端可以記錄或測試他們是否請求了重新啟動。閘道仍然擁有該重新啟動實際發生的時機控制權。

`api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)` 是 `runtime-config-load-write` 下已棄用的相容性輔助函式。它們在執行時會警告一次，並在遷移期間保留供舊的外部外掛使用。打包的外掛不得使用它們；如果外掛程式碼呼叫它們或從外掛 SDK 子路徑匯入這些輔助函式，設定邊界防護將會失敗。

對於直接的 SDK 匯入，請使用專注的設定子路徑，而不是廣泛的
`openclaw/plugin-sdk/config-runtime` 相容性集合桶：`config-contracts` 用於類型，
`plugin-config-runtime` 用於已載入的設定斷言和外掛條目查找，
`runtime-config-snapshot` 用於當前進程快照，以及
`config-mutation` 用於寫入。打包的外掛測試應直接模擬這些專注的
子路徑，而不是模擬廣泛的相容性集合桶。

內部 OpenClaw 執行時代碼具有相同的方向：在 CLI、閘道或進程邊界處載入設定一次，然後傳遞該值。成功的變更寫入會重新整理進程執行時快照並推進其內部修訂；長期快取應該以執行時擁有的快取鍵為鍵，而不是在本地序列化設定。長期執行時模組對環境 `loadConfig()` 呼叫具有零容忍掃描器；請在明確的進程邊界使用傳遞的 `cfg`、請求 `context.getRuntimeConfig()` 或 `getRuntimeConfig()`。

提供者和通道執行路徑必須使用作用中的執行時設定快照，而不是為設定回讀或編輯而傳回的檔案快照。檔案快照會保留來源值（例如用於 UI 和寫入的 SecretRef 標記）；提供者回呼需要解析的執行時檢視。當輔助函式可能使用作用中來源快照或作用中執行時快照呼叫時，請在讀取憑證之前透過 `selectApplicableRuntimeConfig()` 路由。

## 可重複使用的執行時工具

對於機器人撰寫的入站訊息，請使用頻道輪次 `botLoopProtection` 事實。Core 在記錄會話和分派之前會套用共用的記憶體內滑動視窗守衛，而不將策略綁定到單一頻道。此守衛會追蹤 `(scopeId, conversationId, participant pair)` 金鑰，將成對的雙向計數合併計算，當視窗預算超出時套用冷卻時間，並 Opportunistically 修剪不作用的項目。

向操作者公開此行為的頻道外掛應優先使用共用的 `channels.defaults.botLoopProtection` 結構作為基礎預算，然後在其上層疊加特定於頻道/提供者的覆寫值。共用組態使用秒數，因為它是面向使用者的：

```typescript
type ChannelBotLoopProtectionConfig = {
  enabled?: boolean;
  maxEventsPerWindow?: number;
  windowSeconds?: number;
  cooldownSeconds?: number;
};
```

傳遞正規化的機器人配對事實與解析後的輪次。Core 會解析預設值、單位轉換和 `enabled` 語意：

```typescript
return {
  channel: "example",
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  runDispatch,
  botLoopProtection: {
    scopeId: "account-1",
    conversationId: "channel-1",
    senderId: "bot-a",
    receiverId: "bot-b",
    config: channelConfig.botLoopProtection,
    defaultsConfig: runtimeConfig.channels?.defaults?.botLoopProtection,
    defaultEnabled: allowBotsMode !== "off",
  },
};
```

僅對不通過共用頻道輪次核心的自訂兩方事件迴圈，直接使用 `openclaw/plugin-sdk/pair-loop-guard-runtime`。

## 執行時命名空間

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Agent 身份、目錄和會話管理。

    ```typescript
    // Resolve the agent's working directory
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);

    // Resolve agent workspace
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

    // Get agent identity
    const identity = api.runtime.agent.resolveAgentIdentity(cfg);

    // Get default thinking level
    const thinking = api.runtime.agent.resolveThinkingDefault({
      cfg,
      provider,
      model,
    });

    // Validate a user-provided thinking level against the active provider profile
    const policy = api.runtime.agent.resolveThinkingPolicy({ provider, model });
    const level = api.runtime.agent.normalizeThinkingLevel("extra high");
    if (level && policy.levels.some((entry) => entry.id === level)) {
      // pass level to an embedded run
    }

    // Get agent timeout
    const timeoutMs = api.runtime.agent.resolveAgentTimeoutMs(cfg);

    // Ensure workspace exists
    await api.runtime.agent.ensureAgentWorkspace(cfg);

    // Run an embedded agent turn
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);
    const result = await api.runtime.agent.runEmbeddedAgent({
      sessionId: "my-plugin:task-1",
      runId: crypto.randomUUID(),
      sessionFile: path.join(agentDir, "sessions", "my-plugin-task-1.jsonl"),
      workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg),
      prompt: "Summarize the latest changes",
      timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
    });
    ```

    `runEmbeddedAgent(...)` 是用於從外掛程式碼啟動正常 OpenClaw agent 回合的中性輔助函式。它使用與通道觸發回覆相同的提供者/模型解析和 agent-harness 選擇。

    `runEmbeddedPiAgent(...)` 保留為相容性別名。

    `resolveThinkingPolicy(...)` 會回傳提供者/模型支援的思考層級和可選的預設值。提供者外掛透過其思考 hooks 擁有模型特定的設定檔，因此工具外掛應呼叫此執行時期輔助函式，而不是匯入或複製提供者清單。

    `normalizeThinkingLevel(...)` 會在使用者文字（例如 `on`、`x-high` 或 `extra high`）對照解析的原則進行檢查之前，將其轉換為標準儲存層級。

    **Session store 輔助函式**位於 `api.runtime.agent.session` 之下：

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(storePath);
    await api.runtime.agent.session.updateSessionStore(storePath, (nextStore) => {
      // Patch one entry without replacing the whole file from stale state.
      nextStore[sessionKey] = { ...nextStore[sessionKey], thinkingLevel: "high" };
    });
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

    執行時期寫入建議優先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`。它們會透過 Gateway 擁有的 session-store 寫入器進行路由、保留並行更新，並重用熱快取。`saveSessionStore(...)` 仍然可用於相容性和離線維護風格的重寫。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    預設模型和提供者常數：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    執行主機擁有的文字補全，無需匯入提供者內部或複製 OpenClaw 模型/授權/基礎 URL 準備工作。

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```

    此輔助程式使用與 OpenClaw 內建執行階段和主機擁有的執行階段配置快照相同的簡單補全準備路徑。Context engines 會接收綁定會話的 `llm.complete` 能力，因此模型呼叫會使用作用中會話的代理程式，並不會無聲回退至預設代理程式。結果包含提供者/模型/代理程式歸屬資訊，以及標準化的 token、快取和估計成本使用量（如果可用）。

    <Warning>
    模型覆寫需要操作員透過組態中的 `plugins.entries.<id>.llm.allowModelOverride: true` 加入啟用。使用 `plugins.entries.<id>.llm.allowedModels` 將受信任的外掛程式限制為特定的標準 `provider/model` 目標。跨代理程式補全需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
    啟動並管理背景子代理程式執行。

    ```typescript
    // Start a subagent run
    const { runId } = await api.runtime.subagent.run({
      sessionKey: "agent:main:subagent:search-helper",
      message: "Expand this query into focused follow-up searches.",
      provider: "openai", // optional override
      model: "gpt-4.1-mini", // optional override
      deliver: false,
    });

    // Wait for completion
    const result = await api.runtime.subagent.waitForRun({ runId, timeoutMs: 30000 });

    // Read session messages
    const { messages } = await api.runtime.subagent.getSessionMessages({
      sessionKey: "agent:main:subagent:search-helper",
      limit: 10,
    });

    // Delete a session
    await api.runtime.subagent.deleteSession({
      sessionKey: "agent:main:subagent:search-helper",
    });
    ```

    <Warning>
    模型覆寫 (`provider`/`model`) 需要操作員透過組態中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 加入啟用。未受信任的外掛程式仍然可以執行子代理程式，但覆寫請求會被拒絕。
    </Warning>

    `deleteSession(...)` 可以透過 `api.runtime.subagent.run(...)` 刪除由相同外掛程式建立的會話。刪除任意使用者或操作員會話仍然需要具有 admin 範圍的 Gateway 請求。

  </Accordion>
  <Accordion title="api.runtime.nodes">
    列出已連接的節點，並從 Gateway 載入的外掛程式碼或從外掛程式 CLI 指令叫用節點主機指令。當外掛程式在配對裝置（例如另一台 Mac 上的瀏覽器或音訊橋接器）上擁有本機工作時，請使用此功能。

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    在 Gateway 內部，此執行屬於同處理序。在外掛程式 CLI 指令中，它會透過 RPC 呼叫設定的 Gateway，因此諸如 `openclaw googlemeet recover-tab` 等指令可以從終端機檢查配對的節點。節點指令仍然會經過正常的 Gateway 節點配對、指令允許清單、外掛程式節點叫用策略以及節點本機指令處理。

    暴露危險節點主機指令的外掛程式應使用 `api.registerNodeInvokePolicy(...)` 註冊節點叫用策略。該策略在 Gateway 中於檢查指令允許清單之後、以及將指令轉發至節點之前執行，因此直接 `node.invoke` 呼叫和更高層級的外掛程式工具共用相同的強制執行路徑。

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    將 Task Flow 執行時期繫結至現有的 OpenClaw 工作階段金鑰或受信任工具內容，然後建立及管理 Task Flows，而無需在每次呼叫時傳遞擁有者。

    Task Flow 追蹤持久的循序工作流程狀態。它不是排程器：請使用 Cron 或 `api.session.workflow.scheduleSessionTurn(...)` 進行未來
    的喚醒，然後當該工作
    需要流程狀態、子任務、等待或取消時，從已排程的輪次中使用 `managedFlows`。

    ```typescript
    const taskFlow = api.runtime.tasks.managedFlows.fromToolContext(ctx);

    const created = taskFlow.createManaged({
      controllerId: "my-plugin/review-batch",
      goal: "Review new pull requests",
    });

    const child = taskFlow.runTask({
      flowId: created.flowId,
      runtime: "acp",
      childSessionKey: "agent:main:subagent:reviewer",
      task: "Review PR #123",
      status: "running",
      startedAt: Date.now(),
    });

    const waiting = taskFlow.setWaiting({
      flowId: created.flowId,
      expectedRevision: created.revision,
      currentStep: "await-human-reply",
      waitJson: { kind: "reply", channel: "telegram" },
    });
    ```

    當您已經擁有來自您自己的繫結層的受信任 OpenClaw 工作階段金鑰時，請使用 `bindSession({ sessionKey, requesterOrigin })`。請勿從原始使用者輸入進行繫結。

  </Accordion>
  <Accordion title="api.runtime.tts">
    文字轉語音合成。

    ```typescript
    // Standard TTS
    const clip = await api.runtime.tts.textToSpeech({
      text: "Hello from OpenClaw",
      cfg: api.config,
    });

    // Telephony-optimized TTS
    const telephonyClip = await api.runtime.tts.textToSpeechTelephony({
      text: "Hello from OpenClaw",
      cfg: api.config,
    });

    // List available voices
    const voices = await api.runtime.tts.listVoices({
      provider: "elevenlabs",
      cfg: api.config,
    });
    ```

    使用核心 `messages.tts` 設定和提供者選擇。傳回 PCM 音訊緩衝區 + 取樣率。

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    影像、音訊和影片分析。

    ```typescript
    // Describe an image
    const image = await api.runtime.mediaUnderstanding.describeImageFile({
      filePath: "/tmp/inbound-photo.jpg",
      cfg: api.config,
      agentDir: "/tmp/agent",
    });

    // Transcribe audio
    const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
      filePath: "/tmp/inbound-audio.ogg",
      cfg: api.config,
      mime: "audio/ogg", // optional, for when MIME cannot be inferred
    });

    // Describe a video
    const video = await api.runtime.mediaUnderstanding.describeVideoFile({
      filePath: "/tmp/inbound-video.mp4",
      cfg: api.config,
    });

    // Generic file analysis
    const result = await api.runtime.mediaUnderstanding.runFile({
      filePath: "/tmp/inbound-file.pdf",
      cfg: api.config,
    });

    // Structured image extraction through a specific provider/model.
    // Include at least one image; text inputs are supplemental context.
    const evidence = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
      provider: "codex",
      model: "gpt-5.5",
      input: [
        {
          type: "image",
          buffer: receiptImageBuffer,
          fileName: "receipt.png",
          mime: "image/png",
        },
        { type: "text", text: "Prefer the printed total over handwritten notes." },
      ],
      instructions: "Extract vendor, total, and searchable tags.",
      schemaName: "receipt.evidence",
      jsonSchema: {
        type: "object",
        properties: {
          vendor: { type: "string" },
          total: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["vendor", "total"],
      },
      cfg: api.config,
    });
    ```

    當未產生輸出（例如略過輸入）時，傳回 `{ text: undefined }`。

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` 保持作為 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的相容性別名。
    </Info>

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    影像生成。

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    網路搜尋。

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    底層媒體公用程式。

    ```typescript
    const webMedia = await api.runtime.media.loadWebMedia(url);
    const mime = await api.runtime.media.detectMime(buffer);
    const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
    const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
    const metadata = await api.runtime.media.getImageMetadata(filePath);
    const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
    const terminalQr = await api.runtime.media.renderQrTerminal("https://openclaw.ai");
    const pngQr = await api.runtime.media.renderQrPngBase64("https://openclaw.ai", {
      scale: 6, // 1-12
      marginModules: 4, // 0-16
    });
    const pngQrDataUrl = await api.runtime.media.renderQrPngDataUrl("https://openclaw.ai");
    const tmpRoot = resolvePreferredOpenClawTmpDir();
    const pngQrFile = await api.runtime.media.writeQrPngTempFile("https://openclaw.ai", {
      tmpRoot,
      dirPrefix: "my-plugin-qr-",
      fileName: "qr.png",
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.config">
    目前的執行時期設定快照和交易式設定寫入。優先使用已傳入
    至現有呼叫路徑的設定；僅當處理常式需要直接的程序快照時，才使用
    `current()`。

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` 和 `replaceConfigFile(...)` 會傳回 `followUp`
    值，例如 `{ mode: "restart", requiresRestart: true, reason }`，
    此值會記錄寫入者的意圖，而不會從
    閘道中拿走重新啟動的控制權。

  </Accordion>
  <Accordion title="api.runtime.system">
    系統層級公用程式。

    ```typescript
    await api.runtime.system.enqueueSystemEvent(event);
    api.runtime.system.requestHeartbeat({
      source: "other",
      intent: "event",
      reason: "plugin-event",
    });
    api.runtime.system.requestHeartbeatNow({ reason: "plugin-event" }); // Deprecated compatibility alias.
    const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
    const hint = api.runtime.system.formatNativeDependencyHint(pkg);
    ```

  </Accordion>
  <Accordion title="api.runtime.events">
    事件訂閱。

    ```typescript
    api.runtime.events.onAgentEvent((event) => {
      /* ... */
    });
    api.runtime.events.onSessionTranscriptUpdate((update) => {
      /* ... */
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.logging">
    紀錄 (Logging)。

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    模型和提供者驗證解析。

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    狀態目錄解析與基於 SQLite 的鍵值存儲。

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir(process.env);
    const store = api.runtime.state.openKeyedStore<MyRecord>({
      namespace: "my-feature",
      maxEntries: 200,
      defaultTtlMs: 15 * 60_000,
    });

    await store.register("key-1", { value: "hello" });
    const claimed = await store.registerIfAbsent("dedupe-key", { value: "first" });
    const value = await store.lookup("key-1");
    await store.consume("key-1");
    await store.clear();
    ```

    鍵值存儲在重啟後依然存在，並且由運行時綁定的外掛程式 ID 隔離。使用 `registerIfAbsent(...)` 進行原子去重聲明：當鍵缺失或過期並註冊時，它返回 `true`；當現有值已存在且未覆蓋其值、創建時間或 TTL 時，返回 `false`。限制：每個命名空間 `maxEntries`，每個外掛程式 1,000 個活躍行，JSON 值小於 64KB，以及可選的 TTL 過期。

    <Warning>
    本版本僅限捆綁外掛程式。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools">
    記憶體工具工廠和 CLI。

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    特定通道的運行時輔助函數（載入通道外掛程式時可用）。

    `api.runtime.channel.media` 是通道媒體下載和儲存的首選介面：

    ```typescript
    const saved = await api.runtime.channel.media.saveRemoteMedia({
      url,
      subdir: "inbound",
      maxBytes,
      filePathHint: fileName,
    });
    ```

    當遠端 URL 應成為 OpenClaw 媒體時，請使用 `saveRemoteMedia(...)`。當外掛程式已使用外掛程式擁有的驗證、重新導向或允許清單處理來擷取 `Response` 時，請使用 `saveResponseMedia(...)`。僅當外掛程式需要原始位元組進行檢查、轉換、解密或重新上傳時，才使用 `readRemoteMediaBuffer(...)`。`fetchRemoteMedia(...)` 仍是 `readRemoteMediaBuffer(...)` 的已棄用相容性別名。

    `api.runtime.channel.mentions` 是使用執行時注入的捆綁通道外掛程式的共用輸入提及原則介面：

    ```typescript
    const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
      mentionRegexes,
      mentionPatterns,
    });

    const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
      facts: {
        canDetectMention: true,
        wasMentioned: mentionMatch.matched,
        implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen(
          "reply_to_bot",
          isReplyToBot,
        ),
      },
      policy: {
        isGroup,
        requireMention,
        allowTextCommands,
        hasControlCommand,
        commandAuthorized,
      },
    });
    ```

    可用的提及輔助函數：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` 故意不公開較舊的 `resolveMentionGating*` 相容性輔助函數。請優先使用標準化的 `{ facts, policy }` 路徑。

  </Accordion>
</AccordionGroup>

## 儲存執行時參照

使用 `createPluginRuntimeStore` 來儲存執行時參照，以便在 `register` 回呼之外使用：

<Steps>
  <Step title="Create the store">
    ```typescript
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

    const store = createPluginRuntimeStore<PluginRuntime>({
      pluginId: "my-plugin",
      errorMessage: "my-plugin runtime not initialized",
    });
    ```

  </Step>
  <Step title="Wire into the entry point">
    ```typescript
    export default defineChannelPluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Example",
      plugin: myPlugin,
      setRuntime: store.setRuntime,
    });
    ```
  </Step>
  <Step title="Access from other files">
    ```typescript
    export function getRuntime() {
      return store.getRuntime(); // throws if not initialized
    }

    export function tryGetRuntime() {
      return store.tryGetRuntime(); // returns null if not initialized
    }
    ```

  </Step>
</Steps>

<Note>對於執行時儲存身份，請優先使用 `pluginId`。較低層級的 `key` 形式僅適用於不常見的情況，即一個外掛程式故意需要多個執行時插槽。</Note>

## 其他頂層 `api` 欄位

除了 `api.runtime` 之外，API 物件還提供：

<ParamField path="api.id" type="string">
  外掛程式 ID。
</ParamField>
<ParamField path="api.name" type="string">
  外掛程式顯示名稱。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  目前設定快照（可用時為使用中的記憶體內執行階段快照）。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  來自 `plugins.entries.<id>.config` 的外掛程式特定設定。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  限定範圍的記錄器（`debug`、`info`、`warn`、`error`）。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  目前載入模式；`"setup-runtime"` 是輕量級的完整進入前啟動/設置視窗。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相對於外掛程式根目錄的路徑。
</ParamField>

## 相關

- [外掛程式內部機制](/zh-Hant/plugins/architecture) — 能力模型與註冊表
- [SDK 進入點](/zh-Hant/plugins/sdk-entrypoints) — `definePluginEntry` 選項
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 子路徑參考

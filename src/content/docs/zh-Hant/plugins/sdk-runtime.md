---
summary: "api.runtime -- 外掛程式可用的注入執行時期輔助函式"
title: "外掛程式執行時期輔助函式"
sidebarTitle: "執行時期輔助函式"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

註冊期間注入至每個外掛程式的 `api.runtime` 物件參考資料。請使用這些輔助函式，而不是直接匯入主機內部。

<CardGroup cols={2}>
  <Card title="頻道外掛程式" href="/zh-Hant/plugins/sdk-channel-plugins">
    逐步指南，針對頻道外掛程式在內容中使用這些輔助函式。
  </Card>
  <Card title="提供者外掛程式" href="/zh-Hant/plugins/sdk-provider-plugins">
    逐步指南，針對提供者外掛程式在內容中使用這些輔助函式。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## 設定載入與寫入

偏好使用已傳入至目前呼叫路徑的設定，例如註冊期間的 `api.config` 或頻道/提供者回呼上的 `cfg` 引數。這能讓單一處理程序快照流經工作，而不是在熱路徑上重新解析設定。

僅當長期存活的處理常式需要目前的處理程序快照，且沒有設定傳遞至該函式時，才使用 `api.runtime.config.current()`。傳回值是唯讀的；編輯前請先複製或使用變異輔助函式。

工具工廠會接收 `ctx.runtimeConfig` 加上 `ctx.getRuntimeConfig()`。當設定在工具定義建立後可能變更時，請在長期存活的工具 `execute` 回呼內使用 getter。

使用 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 來保存變更。每次寫入都必須選擇明確的 `afterWrite` 政策：

- `afterWrite: { mode: "auto" }` 讓閘道重新載入規劃程式決定。
- `afterWrite: { mode: "restart", reason: "..." }` 當寫入者知道熱重新載入不安全時，強制進行乾淨的重新啟動。
- `afterWrite: { mode: "none", reason: "..." }` 僅當呼叫者擁有後續處理時，才抑制自動重新載入/重新啟動。

變更輔助函式會傳回 `afterWrite` 以及一個型別化的 `followUp` 摘要，以便呼叫者記錄或測試是否請求了重啟。閘道仍然擁有該重啟實際發生時機的控制權。

`api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)` 是 `runtime-config-load-write` 下的已棄用相容性輔助函式。它們在執行時會警告一次，並在遷移期間保留給舊的外部外掛使用。捆綁外掛不得使用它們；如果外掛程式碼呼叫它們或從外掛 SDK 子路徑匯入這些輔助函式，設定邊界防護將會失敗。

對於直接的 SDK 匯入，請使用專注的設定子路徑，而不是廣泛的 `openclaw/plugin-sdk/config-runtime` 相容性匯出桶：`config-types` 用於型別，`plugin-config-runtime` 用於已載入的設定斷言和外掛條目查找，`runtime-config-snapshot` 用於當前程序快照，以及 `config-mutation` 用於寫入。捆綁外掛測試應該直接模擬這些專注的子路徑，而不是模擬廣泛的相容性匯出桶。

內部 OpenClaw 執行時代碼也有相同的方向：在 CLI、閘道或程序邊界處載入設定一次，然後傳遞該值。成功的變更寫入會刷新程序執行時快照並推進其內部修訂版本；長期存活的快取應該以執行時擁有的快取鍵為鍵，而不是在本地序列化設定。長期存活的執行時模組對於環境 `loadConfig()` 呼叫具有零容忍掃描器；請在明確的程序邊界使用傳入的 `cfg`、請求 `context.getRuntimeConfig()` 或 `getRuntimeConfig()`。

提供者和通道執行路徑必須使用使用中的執行時設定快照，而不是為設定讀回或編輯而傳回的檔案快照。檔案快照會保留原始值，例如用於 UI 和寫入的 SecretRef 標記；提供者回呼需要解析後的執行時視圖。當輔助函式可能會使用使用中的原始快照或使用中的執行時快照呼叫時，請在讀取認證之前透過 `selectApplicableRuntimeConfig()` 進行路由。

## Runtime namespaces

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Agent 身份、目錄與會話管理。

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

    `runEmbeddedAgent(...)` 是從外掛程式碼啟動一般 OpenClaw agent 回合的通用輔助函式。它使用與頻道觸發回覆相同的提供者/模型解析與 agent-harness 選擇邏輯。

    `runEmbeddedPiAgent(...)` 保留作為相容性別名。

    `resolveThinkingPolicy(...)` 會傳回提供者/模型所支援的思考層級與選用的預設值。Provider 外掛透過其 thinking hooks 擁有模型專屬的設定檔，因此工具外掛應呼叫此執行階段輔助函式，而非匯入或重複提供者清單。

    `normalizeThinkingLevel(...)` 會先將使用者文字（例如 `on`、`x-high` 或 `extra high`）轉換為標準的儲存層級，再對其進行已解析原則的檢查。

    **Session store 輔助函式** 位於 `api.runtime.agent.session` 之下：

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(storePath);
    await api.runtime.agent.session.updateSessionStore(storePath, (nextStore) => {
      // Patch one entry without replacing the whole file from stale state.
      nextStore[sessionKey] = { ...nextStore[sessionKey], thinkingLevel: "high" };
    });
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

    針對執行階段寫入，建議優先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`。這些函式會透過 Gateway 擁有的 session-store 寫入器進行路由、保留並行更新，並重用快取。`saveSessionStore(...)` 仍可使用，以維持相容性與離線維護類型的重寫作業。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    預設模型與提供者常數：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    執行主機擁有的文本補全，無需匯入提供商內部機制或
    重複 OpenClaw 模型/驗證/基礎 URL 的準備工作。

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```

    此輔助函數使用與 OpenClaw 內建執行時和主機擁有的執行時設定快照相同的簡單補全準備路徑。上下文引擎
    會收到一個綁定會話的 `llm.complete` 能力，因此模型呼叫會使用
    活躍會話的代理程式，並且不會無聲地回退到預設代理程式。
    結果包含提供商/模型/代理程式的歸屬，以及規範化的 Token、
    快取和估算的成本使用情況（如果可用）。

    <Warning>
    模型覆寫需要操作員透過設定中的 `plugins.entries.<id>.llm.allowModelOverride: true` 進行選擇加入。請使用 `plugins.entries.<id>.llm.allowedModels` 將受信任的外掛程式限制為特定的正規 `provider/model` 目標。跨代理程式的補全需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
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
    模型覆寫 (`provider`/`model`) 需要操作員透過設定中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 進行選擇加入。未受信任的外掛程式仍然可以執行子代理程式，但覆寫請求會被拒絕。
    </Warning>

    `deleteSession(...)` 可以透過 `api.runtime.subagent.run(...)` 刪除由同一個外掛程式建立的會話。刪除任意使用者或操作員的會話仍然需要具有管理員範圍的 Gateway 請求。

  </Accordion>
  <Accordion title="api.runtime.nodes">
    列出已連接的節點，並從 Gateway 載入的插件代碼或插件 CLI 命令調用節點主機命令。當插件在配對設備上擁有本地工作時使用此功能，例如在另一台 Mac 上的瀏覽器或音訊橋接器。

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    在 Gateway 內部，此運行時是進程內的。在插件 CLI 命令中，它通過 RPC 調用已配置的 Gateway，因此諸如 `openclaw googlemeet recover-tab` 之類的命令可以從終端機檢查配對的節點。節點命令仍然需要經過正常的 Gateway 節點配對、命令允許清單、插件節點調用策略以及節點本地命令處理。

    暴露危險節點主機命令的插件應使用 `api.registerNodeInvokePolicy(...)` 註冊節點調用策略。該策略在命令允許清單檢查之後、命令轉發到節點之前在 Gateway 中運行，因此直接 `node.invoke` 調用和高級別插件工具共享相同的執行路徑。

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    將任務流運行時綁定到現有的 OpenClaw 會話金鑰或受信任的工具上下文，然後創建和管理任務流，而無需在每次調用時傳遞所有者。

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

    當您已經擁有來自您自己的綁定層的受信任 OpenClaw 會話金鑰時，請使用 `bindSession({ sessionKey, requesterOrigin })`。不要從原始用戶輸入進行綁定。

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

    使用核心 `messages.tts` 配置和提供者選擇。返回 PCM 音訊緩衝區 + 取樣率。

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    圖像、音訊和影片分析。

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
    ```

    當未產生輸出（例如跳過輸入）時，返回 `{ text: undefined }`。

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` 仍然作為 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的相容性別名。
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
    低階媒體公用程式。

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
    目前的執行時段設定快照與交易式設定寫入。優先使用已傳入
    至目前呼叫路徑的設定；僅在處理程式直接需要
    程序快照時才使用 `current()`。

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
    這會記錄寫入者的意圖，而不會將重新啟動控制權從
    閘道移除。

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
    記錄。

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

    鍵值存儲在重啟後仍然存在，並且按運行時綁定的插件 ID 進行隔離。使用 `registerIfAbsent(...)` 進行原子性去重聲明：當鍵缺失或過期並被註冊時，它返回 `true`；當實時值已存在時，它返回 `false` 而不覆蓋其值、創建時間或 TTL。限制：每個命名空間 `maxEntries`，每個插件 1,000 個實時行，JSON 值小於 64KB，以及可選的 TTL 過期時間。

    <Warning>
    本版本僅限捆綁插件。
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
    特定通道的運行時輔助程式（在加載通道插件時可用）。

    `api.runtime.channel.mentions` 是使用運行時注入的捆綁通道插件共用的入站提及策略表面：

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

    可用的提及輔助程式：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` 故意不公開較舊的 `resolveMentionGating*` 相容性輔助程式。建議優先使用標準化的 `{ facts, policy }` 路徑。

  </Accordion>
</AccordionGroup>

## 儲存運行時參照

使用 `createPluginRuntimeStore` 儲存運行時參照，以便在 `register` 回調外部使用：

<Steps>
  <Step title="建立存儲">
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

<Note>對於運行時存儲標識，建議優先使用 `pluginId`。較低層級的 `key` 形式僅適用於一個插件有意需要多個運行時插槽的罕見情況。</Note>

## 其他頂層 `api` 欄位

除了 `api.runtime` 之外，該 API 物件還提供：

<ParamField path="api.id" type="string">
  外掛程式 ID。
</ParamField>
<ParamField path="api.name" type="string">
  外掛程式顯示名稱。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  目前的設定快照（可用時為作用中的記憶體內執行時期快照）。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  來自 `plugins.entries.<id>.config` 的外掛程式特定設定。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  限定範圍的記錄器（`debug`、`info`、`warn`、`error`）。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  目前的載入模式；`"setup-runtime"` 是在完整進入啟動/設定之前的輕量級視窗。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相對於外掛程式根目錄的路徑。
</ParamField>

## 相關

- [外掛程式內部運作](/zh-Hant/plugins/architecture) — 能力模型與註冊表
- [SDK 進入點](/zh-Hant/plugins/sdk-entrypoints) — `definePluginEntry` 選項
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 子路徑參考

---
summary: "api.runtime -- the injected runtime helpers available to plugins"
title: "Plugin runtime helpers"
sidebarTitle: "Runtime helpers"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

註冊期間注入每個外掛程式的 `api.runtime` 物件參考。請使用這些協助程式，而不是直接匯入主機內部元件。

<CardGroup cols={2}>
  <Card title="Channel plugins" href="/zh-Hant/plugins/sdk-channel-plugins">
    針對頻道外掛程式在語境中使用這些協助程式的逐步指南。
  </Card>
  <Card title="Provider plugins" href="/zh-Hant/plugins/sdk-provider-plugins">
    針對提供者外掛程式在語境中使用這些協助程式的逐步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## 設定載入與寫入

優先使用已傳遞至作用中呼叫路徑的設定，例如註冊期間的 `api.config` 或頻道/提供者回呼上的 `cfg` 引數。這能讓單一程序快照持續流經工作流程，而不是在關鍵路徑上重新解析設定。

僅當長期存活的處理程序需要目前程序快照且未將設定傳遞至該函式時，才使用 `api.runtime.config.current()`。傳回值是唯讀的；在編輯前請先複製或使用變異協助程式。

工具工廠會接收 `ctx.runtimeConfig` 加上 `ctx.getRuntimeConfig()`。當工具定義建立後設定可能變更時，請在長期存活工具的 `execute` 回呼中使用 getter。

使用 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 保存變更。每次寫入必須選擇明確的 `afterWrite` 政策：

- `afterWrite: { mode: "auto" }` 讓閘道重新載入規劃程式決定。
- 當寫入者知道熱重新載入不安全時，`afterWrite: { mode: "restart", reason: "..." }` 會強制乾淨地重新啟動。
- `afterWrite: { mode: "none", reason: "..." }` 僅當呼叫者擁有後續處理權時，才會抑制自動重新載入/重新啟動。

這些變更輔助函數會傳回 `afterWrite` 加上一個類型化的 `followUp` 摘要，以便呼叫者記錄或測試他們是否請求了重啟。閘道仍然擁有該重啟實際發生的時機控制權。

`api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)` 是 `runtime-config-load-write` 下已棄用的相容性輔助函數。它們會在執行時期警告一次，並在遷移期間保留給舊的外部外掛使用。打包外掛必須不得使用它們；如果外掛程式碼呼叫它們或從外掛 SDK 子路徑匯入這些輔助函數，設定邊界防護將會失敗。

對於直接的 SDK 匯入，請使用專注的設定子路徑，而不是廣泛的
`openclaw/plugin-sdk/config-runtime` 相容性統包：用 `config-types` 取得
類型，用 `plugin-config-runtime` 取得已載入的設定斷言和外掛
項目查找，用 `runtime-config-snapshot` 取得目前程序快照，以及
用 `config-mutation` 進行寫入。打包外掛測試應該直接模擬這些專注的
子路徑，而不是模擬廣泛的相容性統包。

內部 OpenClaw 執行時期程式碼有相同的方向：在 CLI、閘道或程序邊界載入設定一次，然後將該值傳遞下去。成功的變更寫入會重新整理程序執行時期快照並推進其內部修訂版本；長期存在的快取應該以執行時期擁有的快取鍵為鍵，而不是在本地序列化設定。長期存在的執行時期模組具有對周遭 `loadConfig()` 呼叫的零容忍掃描器；請在明確的程序邊界使用傳遞的 `cfg`、請求 `context.getRuntimeConfig()` 或 `getRuntimeConfig()`。

## 執行時期命名空間

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

    `runEmbeddedAgent(...)` 是用於從外掛程式碼啟動標準 OpenClaw agent 輪次的輔助函數。它使用與通道觸發回覆相同的提供者/模型解析和 agent-harness 選擇邏輯。

    `runEmbeddedPiAgent(...)` 保留為相容性別名。

    `resolveThinkingPolicy(...)` 會傳回提供者/模型支援的思考層級和可選的預設值。提供者外掛程式透過其思考 hook 擁有特定模型的設定檔，因此工具外掛程式應呼叫此執行時輔助函數，而不是匯入或複製提供者清單。

    `normalizeThinkingLevel(...)` 會將使用者文字（例如 `on`、`x-high` 或 `extra high`）轉換為標準儲存層級，然後再根據解析的原則進行檢查。

    **Session store helpers** 位於 `api.runtime.agent.session` 下：

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(cfg);
    await api.runtime.agent.session.saveSessionStore(cfg, store);
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    預設模型和提供者常數：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>
  <Accordion title="api.runtime.subagent">
    啟動並管理背景 subagent 執行。

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
    模型覆寫（`provider`/`model`）需要操作員透過設定中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 手動加入。不受信任的外掛程式仍然可以執行 subagent，但覆寫請求會被拒絕。
    </Warning>

    `deleteSession(...)` 可以透過 `api.runtime.subagent.run(...)` 刪除由同一個外掛程式建立的會話。刪除任意使用者或操作員的會話仍然需要具有管理員範圍的 Gateway 請求。

  </Accordion>
  <Accordion title="api.runtime.nodes">
    列出已連接的節點，並從 Gateway 載入的外掛程式碼或外掛程式 CLI 指令叫用節點主機指令。當外掛程式在配對裝置（例如另一台 Mac 上的瀏覽器或音訊橋接器）上擁有本機工作時，請使用此功能。

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    在 Gateway 內部，此執行時期是同處理序的。在外掛程式 CLI 指令中，它會透過 RPC 呼叫已設定的 Gateway，因此像 `openclaw googlemeet recover-tab` 這類指令可以從終端機檢查配對的節點。節點指令仍會經過正常的 Gateway 節點配對、指令允許清單以及節點本機指令處理。

  </Accordion>
  <Accordion title="api.runtime.taskFlow">
    將工作流程執行時期繫結至現有的 OpenClaw 工作階段金鑰或受信任工具內容，然後建立及管理工作流程，而不需要在每次呼叫時傳遞擁有者。

    ```typescript
    const taskFlow = api.runtime.taskFlow.fromToolContext(ctx);

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

    當您已經有來自您自己繫結層級的受信任 OpenClaw 工作階段金鑰時，請使用 `bindSession({ sessionKey, requesterOrigin })`。請勿從原始使用者輸入進行繫結。

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
    ```

    當未產生輸出（例如跳過的輸入）時，傳回 `{ text: undefined }`。

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` 仍保留為 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的相容性別名。
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
    底層媒體工具。

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
    目前的運行時配置快照和事務性配置寫入。優先使用已經傳入目前呼叫路徑的配置；僅當處理程序直接需要進程快照時才使用
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

    `mutateConfigFile(...)` 和 `replaceConfigFile(...)` 會回傳一個 `followUp`
    值，例如 `{ mode: "restart", requiresRestart: true, reason }`，
    該值會記錄寫入者的意圖，而不會從閘道奪走重啟控制權。

  </Accordion>
  <Accordion title="api.runtime.system">
    系統層級工具。

    ```typescript
    await api.runtime.system.enqueueSystemEvent(event);
    api.runtime.system.requestHeartbeatNow();
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
    日誌記錄。

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
    狀態目錄解析。

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir();
    ```

  </Accordion>
  <Accordion title="api.runtime.tools">
    記憶體工廠和 CLI。

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    特定頻道的執行時期輔助函式（在載入頻道外掛程式時可用）。

    `api.runtime.channel.mentions` 是使用執行時期注入之捆綁頻道外掛程式的共用輸入提及原則介面：

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

    可用的提及輔助函式：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` 故意不公開較舊的 `resolveMentionGating*` 相容性輔助函式。請優先使用標準化的 `{ facts, policy }` 路徑。

  </Accordion>
</AccordionGroup>

## 儲存執行時期參照

使用 `createPluginRuntimeStore` 來儲存執行時期參照，以便在 `register` 回呼之外使用：

<Steps>
  <Step title="建立存放區">
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

<Note>針對執行時期存放區的身分識別，請優先使用 `pluginId`。較低層級的 `key` 形式適用於少數情況，即某個外掛程式刻意需要多個執行時期插槽時。</Note>

## 其他頂層 `api` 欄位

除了 `api.runtime` 之外，API 物件還提供：

<ParamField path="api.id" type="string">
  外掛程式 ID。
</ParamField>
<ParamField path="api.name" type="string">
  外掛程式顯示名稱。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  目前設定快照 (可用時為作用中記憶體內執行時期快照)。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  來自 `plugins.entries.<id>.config` 的外掛程式特定設定。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  限定範圍的記錄器 (`debug`, `info`, `warn`, `error`)。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  目前載入模式；`"setup-runtime"` 是在完整進入啟動/設定之前的輕量級視窗。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相對於外掛程式根目錄的路徑。
</ParamField>

## 相關

- [外掛程式內部運作](/zh-Hant/plugins/architecture) — 功能模型與註冊表
- [SDK 進入點](/zh-Hant/plugins/sdk-entrypoints) — `definePluginEntry` 選項
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 子路徑參考

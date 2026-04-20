---
title: "外掛程式執行時期協助程式"
sidebarTitle: "執行時期協助程式"
summary: "api.runtime -- 可供外掛程式使用的注入執行時期協助程式"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

# Plugin Runtime Helpers

在註冊期間注入至每個外掛程式的 `api.runtime` 物件參考資料。請使用這些協助程式，而非直接匯入主機內部。

<Tip>**尋找逐步指南？** 請參閱 [通道插件](/en/plugins/sdk-channel-plugins) 或 [提供者插件](/en/plugins/sdk-provider-plugins) 以了解展示這些輔助函式使用情境的 逐步指南。</Tip>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Runtime namespaces

### `api.runtime.agent`

Agent identity, directories, and session management.

```typescript
// Resolve the agent's working directory
const agentDir = api.runtime.agent.resolveAgentDir(cfg);

// Resolve agent workspace
const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

// Get agent identity
const identity = api.runtime.agent.resolveAgentIdentity(cfg);

// Get default thinking level
const thinking = api.runtime.agent.resolveThinkingDefault(cfg, provider, model);

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

`runEmbeddedAgent(...)` 是從外掛程式碼啟動標準 OpenClaw
代理程式回合的通用輔助函數。它使用與通道觸發回應相同的供應商/模型解析
和代理程式束選擇機制。

`runEmbeddedPiAgent(...)` 作為相容性別名保留。

**會話儲存輔助函數** 位於 `api.runtime.agent.session` 之下：

```typescript
const storePath = api.runtime.agent.session.resolveStorePath(cfg);
const store = api.runtime.agent.session.loadSessionStore(cfg);
await api.runtime.agent.session.saveSessionStore(cfg, store);
const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
```

### `api.runtime.agent.defaults`

預設模型和供應商常數：

```typescript
const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
```

### `api.runtime.subagent`

啟動和管理背景子代理程式執行。

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
  模型覆寫 (`provider`/`model`) 需要操作員透過
  設定中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 進行選擇加入。
  不受信任的外掛仍可執行子代理，但覆寫請求會被拒絕。
</Warning>

### `api.runtime.taskFlow`

將任務流程運行時綁定到現有的 OpenClaw 會話金鑰或受信任的工具
情境，然後建立和管理任務流程，而無需在每次呼叫時傳遞擁有者。

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

當您已經從自己的綁定層擁有受信任的 OpenClaw 會話金鑰時，請使用
`bindSession({ sessionKey, requesterOrigin })`。請勿從原始使用者輸入進行綁定。

### `api.runtime.tts`

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

使用核心 `messages.tts` 設定和供應商選擇。傳回 PCM 音訊
緩衝區 + 取樣率。

### `api.runtime.mediaUnderstanding`

圖片、音訊和影片分析。

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

當未產生輸出時（例如跳過輸入），傳回 `{ text: undefined }`。

<Info>`api.runtime.stt.transcribeAudioFile(...)` 作為 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的相容性別名保留。</Info>

### `api.runtime.imageGeneration`

圖片生成。

```typescript
const result = await api.runtime.imageGeneration.generate({
  prompt: "A robot painting a sunset",
  cfg: api.config,
});

const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
```

### `api.runtime.webSearch`

網路搜尋。

```typescript
const providers = api.runtime.webSearch.listProviders({ config: api.config });

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: { query: "OpenClaw plugin SDK", count: 5 },
});
```

### `api.runtime.media`

低階媒體公用程式。

```typescript
const webMedia = await api.runtime.media.loadWebMedia(url);
const mime = await api.runtime.media.detectMime(buffer);
const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
const metadata = await api.runtime.media.getImageMetadata(filePath);
const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
```

### `api.runtime.config`

設定載入和寫入。

```typescript
const cfg = await api.runtime.config.loadConfig();
await api.runtime.config.writeConfigFile(cfg);
```

### `api.runtime.system`

系統層級公用程式。

```typescript
await api.runtime.system.enqueueSystemEvent(event);
api.runtime.system.requestHeartbeatNow();
const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
const hint = api.runtime.system.formatNativeDependencyHint(pkg);
```

### `api.runtime.events`

事件訂閱。

```typescript
api.runtime.events.onAgentEvent((event) => {
  /* ... */
});
api.runtime.events.onSessionTranscriptUpdate((update) => {
  /* ... */
});
```

### `api.runtime.logging`

記錄。

```typescript
const verbose = api.runtime.logging.shouldLogVerbose();
const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
```

### `api.runtime.modelAuth`

模型和供應商驗證解析。

```typescript
const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
  provider: "openai",
  cfg,
});
```

### `api.runtime.state`

狀態目錄解析。

```typescript
const stateDir = api.runtime.state.resolveStateDir();
```

### `api.runtime.tools`

記憶體工具工廠與 CLI。

```typescript
const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
api.runtime.tools.registerMemoryCli(/* ... */);
```

### `api.runtime.channel`

通道特定的執行時輔助函數（載入通道插件時可用）。

`api.runtime.channel.mentions` 是使用執行時注入的捆綁通道插件的共享輸入提及策略介面：

```typescript
const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
  facts: {
    canDetectMention: true,
    wasMentioned: mentionMatch.matched,
    implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen("reply_to_bot", isReplyToBot),
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

`api.runtime.channel.mentions` 故意不公開舊的 `resolveMentionGating*` 相容性輔助函數。請優先使用標準化的 `{ facts, policy }` 路徑。

## 儲存執行時參考

使用 `createPluginRuntimeStore` 來儲存執行時參考，以便在 `register` 回呼之外使用：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "my-plugin",
  errorMessage: "my-plugin runtime not initialized",
});

// In your entry point
export default defineChannelPluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Example",
  plugin: myPlugin,
  setRuntime: store.setRuntime,
});

// In other files
export function getRuntime() {
  return store.getRuntime(); // throws if not initialized
}

export function tryGetRuntime() {
  return store.tryGetRuntime(); // returns null if not initialized
}
```

建議優先使用 `pluginId` 作為 runtime-store 的識別身份。底層的 `key` 形式適用於罕見情況，即當一個插件刻意需要多個 runtime 插槽時。

## 其他頂層 `api` 欄位

除了 `api.runtime` 之外，API 物件還提供：

| 欄位                     | 類型                      | 描述                                                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                             |
| `api.name`               | `string`                  | 插件顯示名稱                                                        |
| `api.config`             | `OpenClawConfig`          | 目前設定快照 (可用時為活躍的記憶體內執行時快照)                     |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的插件專屬設定                   |
| `api.logger`             | `PluginLogger`            | 作用域日誌記錄器 (`debug`, `info`, `warn`, `error`)                 |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前的載入模式；`"setup-runtime"` 是輕量級的完整進入前啟動/設定視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於插件根目錄的路徑                                          |

## 相關

- [SDK 概觀](/en/plugins/sdk-overview) -- 子路徑參考
- [SDK 進入點](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 選項
- [Plugin 內部機制](/en/plugins/architecture) -- 功能模型與註冊表

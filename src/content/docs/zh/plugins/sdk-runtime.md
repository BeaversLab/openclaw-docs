---
summary: "api.runtime -- 注入到插件的可用运行时助手"
title: "插件运行时助手"
sidebarTitle: "运行时助手"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

在注册期间注入到每个插件中的 `api.runtime` 对象的参考。请使用这些助手，而不是直接导入主机内部组件。

<CardGroup cols={2}>
  <Card title="渠道插件" href="/zh/plugins/sdk-channel-plugins">
    针对渠道插件在上下文中使用这些助手的分步指南。
  </Card>
  <Card title="提供商插件" href="/zh/plugins/sdk-provider-plugins">
    针对提供商插件在上下文中使用这些助手的分步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## 配置加载与写入

优先使用已经传入活动调用路径的配置，例如注册期间的 `api.config` 或渠道/提供商回调上的 `cfg` 参数。这可以使一个进程快照在工作流中传递，而不是在热路径上重新解析配置。

仅当长期存在的处理程序需要当前进程快照且没有配置传递给该函数时，才使用 `api.runtime.config.current()`。返回值是只读的；在编辑之前请克隆或使用变更助手。

工具工厂接收 `ctx.runtimeConfig` 以及 `ctx.getRuntimeConfig()`。当配置在工具定义创建后可能发生变化时，请在长期存在的工具的 `execute` 回调中使用该 getter。

使用 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 保持更改。每次写入必须选择明确的 `afterWrite` 策略：

- `afterWrite: { mode: "auto" }` 让网关重载计划程序决定。
- `afterWrite: { mode: "restart", reason: "..." }` 当写入者知道热重载不安全时，强制执行干净的重新启动。
- `afterWrite: { mode: "none", reason: "..." }` 仅当调用者负责后续操作时，才禁止自动重载/重新启动。

变更辅助函数返回 `afterWrite` 以及一个类型化的 `followUp` 摘要，以便调用者可以记录或测试它们是否请求了重启。网关仍然拥有实际发生该重启的时机。

`api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)` 是 `runtime-config-load-write` 下已弃用的兼容性辅助函数。它们在运行时警告一次，并在迁移窗口期间为旧的外部插件保持可用。捆绑插件不得使用它们；如果插件代码调用它们或从插件 SDK 子路径导入这些辅助函数，配置边界守卫将失败。

对于直接的 SDK 导入，请使用特定的配置子路径，而不是广泛的
`openclaw/plugin-sdk/config-runtime` 兼容性导出层：`config-contracts` 用于
类型，`plugin-config-runtime` 用于已加载的配置断言和插件
入口查找，`runtime-config-snapshot` 用于当前进程快照，以及
`config-mutation` 用于写入。打包的插件测试应该直接 mock 这些特定的
子路径，而不是 mock 广泛的兼容性导出层。

内部 OpenClaw 运行时代码具有相同的方向：在 CLI、网关或进程边界处加载一次配置，然后传递该值。成功的变更写入会刷新进程运行时快照并推进其内部修订；长生命周期的缓存应该以运行时拥有的缓存键为键，而不是在本地序列化配置。长生命周期的运行时模块具有针对环境 `loadConfig()` 调用的零容忍扫描器；请使用传递的 `cfg`、请求 `context.getRuntimeConfig()` 或在显式进程边界处使用 `getRuntimeConfig()`。

提供商和渠道执行路径必须使用活动的运行时配置快照，而不是为配置回读或编辑返回的文件快照。文件快照保留源值，例如用于 UI 和写入的 SecretRef 标记；提供商回调需要已解析的运行时视图。当辅助函数可能使用活动源快照或活动运行时快照调用时，请在读取凭据之前通过 `selectApplicableRuntimeConfig()` 进行路由。

## 运行时命名空间

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Agent 身份、目录和会话管理。

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

    `runEmbeddedAgent(...)` 是用于从插件代码启动普通 OpenClaw Agent 回合的中性辅助函数。它使用与渠道触发的回复相同的提供商/模型解析和 agent-harness 选择。

    `runEmbeddedPiAgent(...)` 保留为兼容性别名。

    `resolveThinkingPolicy(...)` 返回提供商/模型支持的思考级别和可选的默认值。提供商插件通过其思考钩子拥有特定于模型的配置文件，因此工具插件应调用此运行时辅助函数，而不是导入或复制提供商列表。

    `normalizeThinkingLevel(...)` 在根据解析的策略检查之前，将用户文本（如 `on`、`x-high` 或 `extra high`）转换为规范存储的级别。

    **会话存储辅助函数** 位于 `api.runtime.agent.session` 下：

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(storePath);
    await api.runtime.agent.session.updateSessionStore(storePath, (nextStore) => {
      // Patch one entry without replacing the whole file from stale state.
      nextStore[sessionKey] = { ...nextStore[sessionKey], thinkingLevel: "high" };
    });
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

    对于运行时写入，请优先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`。它们通过 Gateway(网关) 拥有的会话存储写入器进行路由，保留并发更新，并重用热缓存。`saveSessionStore(...)` 仍可用于兼容性和离线维护式重写。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    默认模型和提供商常量：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    运行宿主拥有的文本补全，而无需导入提供商内部组件或
    重复 OpenClaw 模型/认证/基础 URL 准备工作。

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```

    该辅助函数使用与 OpenClaw 内置运行时相同的简单补全准备路径以及宿主拥有的运行时配置快照。上下文引擎接收绑定到会话的 `llm.complete` 能力，因此模型调用使用活动会话的代理，并且不会静默回退到默认代理。结果包括提供商/模型/代理归属，以及规范化令牌、缓存和可用时的估计成本使用情况。

    <Warning>
    模型覆盖需要操作员通过配置中的 `plugins.entries.<id>.llm.allowModelOverride: true` 选择加入。使用 `plugins.entries.<id>.llm.allowedModels` 将受信任的插件限制为特定的规范 `provider/model` 目标。跨代理补全需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
    启动并管理后台子代理运行。

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
    模型覆盖 (`provider`/`model`) 需要操作员通过配置中的 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。不受信任的插件仍可运行子代理，但覆盖请求将被拒绝。
    </Warning>

    `deleteSession(...)` 可以通过 `api.runtime.subagent.run(...)` 删除由同一插件创建的会话。删除任意用户或操作员会话仍需要管理员范围的 Gateway(网关) 请求。

  </Accordion>
  <Accordion title="api.runtime.nodes"Gateway(网关)CLI>
    列出已连接的节点，并从 Gateway(网关) 加载的插件代码或插件 CLI 命令中调用节点宿主命令。当插件在配对设备（例如另一台 Mac 上的浏览器或音频桥接）上拥有本地工作时，请使用此功能。

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```Gateway(网关)CLIGateway(网关)RPC

    在 Gateway(网关) 内部，此运行时是进程内的。在插件 CLI 命令中，它通过 RPC 调用配置的 Gateway(网关)，因此像 `openclaw googlemeet recover-tab`Gateway(网关) 这样的命令可以从终端检查配对的节点。节点命令仍然经过正常的 Gateway(网关) 节点配对、命令允许列表、插件节点调用策略和节点本地命令处理。

    暴露危险节点宿主命令的插件应使用 `api.registerNodeInvokePolicy(...)`Gateway(网关) 注册节点调用策略。该策略在 Gateway(网关) 中的命令允许列表检查之后、命令转发到节点之前运行，因此直接的 `node.invoke` 调用和更高级别的插件工具共享相同的强制执行路径。

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    将 Task Flow 运行时绑定到现有的 OpenClaw 会话密钥或可信工具上下文，然后创建和管理 Task Flows，而无需在每次调用时传递所有者。

    Task Flow 跟踪持久的多步骤工作流状态。它不是调度器：
    使用 Cron 或 `api.session.workflow.scheduleSessionTurn(...)` 进行未来的
    唤醒，然后当该工作
    需要流状态、子任务、等待或取消时，从计划的轮次中使用 `managedFlows`。

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

    当您从自己的绑定层拥有可信的 OpenClaw 会话密钥时，请使用 `bindSession({ sessionKey, requesterOrigin })`。不要从原始用户输入进行绑定。

  </Accordion>
  <Accordion title="api.runtime.tts">
    文本转语音合成。

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

    使用核心 `messages.tts` 配置和提供商选择。返回 PCM 音频缓冲区 + 采样率。

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    图像、音频和视频分析。

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

    当未产生输出时（例如跳过的输入），返回 `{ text: undefined }`。

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` 保留为 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的兼容性别名。
    </Info>

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    图像生成。

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    网络搜索。

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    低级媒体工具。

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
    当前运行时配置快照和事务性配置写入。优先使用已传递到活动调用路径中的配置；仅当处理程序直接需要进程快照时才使用
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

    `mutateConfigFile(...)` 和 `replaceConfigFile(...)` 返回一个 `followUp`
    值，例如 `{ mode: "restart", requiresRestart: true, reason }`，
    该值记录写入者的意图，而不从网关处接管重启控制。

  </Accordion>
  <Accordion title="api.runtime.system">
    系统级工具。

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
    事件订阅。

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
    日志记录。

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    模型和提供商身份验证解析。

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    状态目录解析和基于 SQLite 的键值存储。

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

    键值存储在重启后依然存在，并按运行时绑定的插件 ID 隔离。使用 `registerIfAbsent(...)` 进行原子去重声明：当键缺失或已过期并注册时，它返回 `true`；当存在活动值时，它返回 `false` 而不覆盖其值、创建时间或 TTL。限制：每个命名空间 `maxEntries`，每个插件 1,000 个活动行，JSON 值小于 64KB，以及可选的 TTL 过期时间。

    <Warning>
    此版本中仅限打包插件使用。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools"CLI>
    记忆工具工厂和 CLI。

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.渠道">
    渠道特定的运行时辅助工具（在加载渠道插件时可用）。

    `api.runtime.channel.mentions` 是使用运行时注入的打包渠道插件共享的入站提及策略界面：

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

    可用的提及辅助工具：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` 故意不暴露较旧的 `resolveMentionGating*` 兼容性辅助工具。优先使用规范化的 `{ facts, policy }` 路径。

  </Accordion>
</AccordionGroup>

## 存储运行时引用

使用 `createPluginRuntimeStore` 来存储运行时引用，以便在 `register` 回调之外使用：

<Steps>
  <Step title="创建存储">
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

<Note>对于运行时存储标识，首选 `pluginId`。较低级别的 `key` 形式适用于不常见的情况，即一个插件有意需要多个运行时槽位。</Note>

## 其他顶级 `api` 字段

除了 `api.runtime`API 之外，API 对象还提供：

<ParamField path="api.id" type="string">
  插件 ID。
</ParamField>
<ParamField path="api.name" type="string">
  插件显示名称。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  当前配置快照（如果可用，则为活动的内存中运行时快照）。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  来自 `plugins.entries.<id>.config` 的特定插件配置。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  作用域日志记录器（`debug`、`info`、`warn`、`error`）。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  当前加载模式；`"setup-runtime"` 是在完整入口启动/设置之前的轻量级窗口。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相对于插件根目录的路径。
</ParamField>

## 相关

- [插件内部](/zh/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/zh/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概述](/zh/plugins/sdk-overview) — 子路径参考

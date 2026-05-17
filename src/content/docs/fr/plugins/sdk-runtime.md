---
summary: "api.runtime -- les assistants d'exécution injectés disponibles pour les plugins"
title: "Assistants d'exécution de plugin"
sidebarTitle: "Assistants d'exécution"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
---

Référence pour l'objet `api.runtime` injecté dans chaque plugin lors de l'enregistrement. Utilisez ces assistants au lieu d'importer directement les éléments internes de l'hôte.

<CardGroup cols={2}>
  <Card title="Plugins de channel" href="/fr/plugins/sdk-channel-plugins">
    Guide étape par étape qui utilise ces assistants dans le contexte des plugins de channel.
  </Card>
  <Card title="Plugins de provider" href="/fr/plugins/sdk-provider-plugins">
    Guide étape par étape qui utilise ces assistants dans le contexte des plugins de provider.
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

## Chargement et écriture de la configuration

Préférez la configuration qui a déjà été transmise dans le chemin d'appel actif, par exemple `api.config` lors de l'enregistrement ou un argument `cfg` sur les rappels de channel/provider. Cela permet de faire circuler un instantané du processus à travers le travail au lieu de réanalyser la configuration sur les chemins critiques.

Utilisez `api.runtime.config.current()` uniquement lorsqu'un gestionnaire de longue durée a besoin de l'instantané actuel du processus et qu'aucune configuration n'a été transmise à cette fonction. La valeur renvoyée est en lecture seule ; clonez ou utilisez un assistant de mutation avant de modifier.

Les fabriques d'outils reçoivent `ctx.runtimeConfig` ainsi que `ctx.getRuntimeConfig()`. Utilisez le getter à l'intérieur du rappel `execute` d'un outil de longue durée lorsque la configuration peut changer après la création de la définition de l'outil.

Persistez les modifications avec `api.runtime.config.mutateConfigFile(...)` ou `api.runtime.config.replaceConfigFile(...)`. Chaque écriture doit choisir une stratégie `afterWrite` explicite :

- `afterWrite: { mode: "auto" }` laisse le décideur de rechargement de la passerelle choisir.
- `afterWrite: { mode: "restart", reason: "..." }` force un redémarrage propre lorsque l'auteur sait que le rechargement à chaud n'est pas sûr.
- `afterWrite: { mode: "none", reason: "..." }` supprime le rechargement/redémarrage automatique uniquement lorsque l'appelant possède la suite.

Les assistants de mutation renvoient `afterWrite` ainsi qu'un résumé typé `followUp` afin que les appelants puissent journaliser ou tester s'ils ont demandé un redémarrage. La passerelle conserve toujours la décision du moment où ce redémarrage a réellement lieu.

`api.runtime.config.loadConfig()` et `api.runtime.config.writeConfigFile(...)` sont des assistants de compatibilité dépréciés sous `runtime-config-load-write`. Ils avertissent une seule fois lors de l'exécution et restent disponibles pour les anciens plugins externes durant la fenêtre de migration. Les plugins groupés ne doivent pas les utiliser ; les gardes de la limite de configuration échouent si le code du plugin les appelle ou importe ces assistants depuis les sous-chemins du SDK de plugin.

Pour les importations directes du SDK, utilisez les sous-chemins de configuration ciblés au lieu du module de compatibilité global `openclaw/plugin-sdk/config-runtime` : `config-contracts` pour les types, `plugin-config-runtime` pour les assertions de configuration déjà chargées et la recherche des points d'entrée des plugins, `runtime-config-snapshot` pour les instantanés du processus actuel, et `config-mutation` pour les écritures. Les tests de plugins groupés doivent simuler (mock) directement ces sous-chemins ciblés au lieu de simuler le module de compatibilité global.

Le code d'exécution interne d'OpenClaw suit la même direction : charger la configuration une fois fois à la limite du CLI, de la passerelle ou du processus, puis transmettre cette valeur. Les écritures de mutation réussies rafraîchissent l'instantané d'exécution du processus et avancent sa révision interne ; les caches à longue durée de vie doivent utiliser la clé de cache détenue par l'exécution au lieu de sérialiser la configuration localement. Les modules d'exécution à longue durée de vie disposent d'un scanner de tolérance zéro pour les appels ambiants `loadConfig()` ; utilisez un `cfg` transmis, une `context.getRuntimeConfig()` de requête, ou `getRuntimeConfig()` à une limite de processus explicite.

Les chemins d'exécution du provider et du channel doivent utiliser l'instantané de configuration d'exécution actif, et non un instantané de fichier renvoyé pour la relecture ou l'édition de la configuration. Les instantanés de fichiers préservent les valeurs sources telles que les marqueurs SecretRef pour l'interface utilisateur et les écritures ; les rappels du provider ont besoin de la vue d'exécution résolue. Lorsqu'un assistant peut être appelé avec l'instantané source actif ou l'instantané d'exécution actif, passez par `selectApplicableRuntimeConfig()` avant de lire les identifiants.

## Espaces de noms d'exécution

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Identité de l'agent, répertoires et gestion de session.

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

    `runEmbeddedAgent(...)`OpenClaw est la fonction neutre pour lancer un tour d'agent OpenClaw normal depuis le code du plugin. Elle utilise la même résolution de fournisseur/modèle et le même choix de harnais d'agent que les réponses déclenchées par le canal.

    `runEmbeddedPiAgent(...)` reste un alias de compatibilité.

    `resolveThinkingPolicy(...)` renvoie les niveaux de réflexion pris en charge par le fournisseur/modèle et l'éventuelle valeur par défaut. Les plugins de fournisseur possèdent le profil spécifique au modèle via leurs hooks de réflexion (thinking hooks), les plugins d'outils doivent donc appeler cette fonction d'exécution plutôt que d'importer ou de dupliquer les listes de fournisseurs.

    `normalizeThinkingLevel(...)` convertit le texte utilisateur tel que `on`, `x-high` ou `extra high` vers le niveau stocké canonique avant de le vérifier par rapport à la stratégie résolue.

    **Les assistants du magasin de session** se trouvent sous `api.runtime.agent.session` :

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(storePath);
    await api.runtime.agent.session.updateSessionStore(storePath, (nextStore) => {
      // Patch one entry without replacing the whole file from stale state.
      nextStore[sessionKey] = { ...nextStore[sessionKey], thinkingLevel: "high" };
    });
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

    Privilégiez `updateSessionStore(...)` ou `updateSessionStoreEntry(...)`Gateway pour les écritures à l'exécution. Ils passent par le rédacteur du magasin de sessions détenu par la Gateway, préservent les mises à jour simultanées et réutilisent le cache actif (hot cache). `saveSessionStore(...)` reste disponible pour la compatibilité et les réécritures de type maintenance hors ligne.

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    Constantes par défaut du modèle et du fournisseur :

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // e.g. "anthropic"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    Exécuter une complétion de texte appartenant à l'hôte sans importer les éléments internes du fournisseur ou
    dupliquer la préparation du modèle/de l'auth/de l'URL de base d'OpenClaw.

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Summarize this transcript." }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
    });
    ```

    L'assistant utilise le même chemin de préparation de simple complétion que celui du runtime intégré d'OpenClaw
    et de l'instantané de la configuration du runtime appartenant à l'hôte. Les moteurs de contexte
    reçoivent une capacité `llm.complete` liée à la session, de sorte que les appels au modèle utilisent
    l'agent de la session active et ne reviennent pas silencieusement à l'agent par défaut. Le
    résultat inclut l'attribution fournisseur/modèle/agent ainsi que les jetons normalisés,
    le cache et l'utilisation estimée des coûts lorsque disponible.

    <Warning>
    Les remplacements de modèle nécessitent l'accord de l'opérateur via `plugins.entries.<id>.llm.allowModelOverride: true` dans la configuration. Utilisez `plugins.entries.<id>.llm.allowedModels` pour restreindre les plugins de confiance à des cibles canoniques `provider/model` spécifiques. Les complétions inter-agents nécessitent `plugins.entries.<id>.llm.allowAgentIdOverride: true`.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
    Lancer et gérer les exécutions de sous-agents en arrière-plan.

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
    Les remplacements de modèle (`provider`/`model`) nécessitent l'accord de l'opérateur via `plugins.entries.<id>.subagent.allowModelOverride: true` dans la configuration. Les plugins non approuvés peuvent toujours exécuter des sous-agents, mais les demandes de remplacement sont rejetées.
    </Warning>

    `deleteSession(...)` peut supprimer les sessions créées par le même plugin via `api.runtime.subagent.run(...)`. La suppression de sessions utilisateur ou opérateur arbitraires nécessite toujours une requête Gateway avec portée administrateur.

  </Accordion>
  <Accordion title="api.runtime.nodes">
    Répertorie les nœuds connectés et invoque une commande d'hôte de nœud à partir du code de plugin chargé par Gateway ou à partir des commandes CLI du plugin. Utilisez ceci lorsqu'un plugin gère un travail local sur un appareil apparié, par exemple un navigateur ou un pont audio sur un autre Mac.

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    À l'intérieur du Gateway%PH:GLOSSARY:194:7aeb2995%% , ce runtime s'exécute en processus. Dans les commandes CLI du plugin, il appelle le Gateway configuré via RPC , de sorte que des commandes telles que `openclaw googlemeet recover-tab` peuvent inspecter les nœuds appariés depuis le terminal. Les commandes de nœud passent toujours par l'appariement de nœud normal du Gateway , les listes d'autorisation de commandes, les stratégies d'invocation de nœud de plugin et le traitement local des commandes de nœud.

    Les plugins qui exposent des commandes d'hôte de nœud dangereuses doivent enregistrer une stratégie d'invocation de nœud avec `api.registerNodeInvokePolicy(...)`. La stratégie s'exécute dans le Gateway après les vérifications des listes d'autorisation de commandes et avant que la commande ne soit transmise au nœud, de sorte que les appels directs `node.invoke` et les outils de plugin de niveau supérieur partagent le même chemin d'application.

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    Liez un runtime Task Flow à une clé de session OpenClaw existante ou à un contexte d'outil de confiance, puis créez et gérez des Task Flows sans avoir à passer un propriétaire à chaque appel.

    Task Flow suit l'état durable des flux de travail en plusieurs étapes. Ce n'est pas un planificateur :
    utilisez Cron ou `api.session.workflow.scheduleSessionTurn(...)` pour les réveils
    futurs, puis utilisez `managedFlows` depuis le tour planifié lorsque ce travail
    nécessite un état de flux, des tâches enfants, des attentes ou une annulation.

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

    Utilisez `bindSession({ sessionKey, requesterOrigin })` lorsque vous possédez déjà une clé de session OpenClaw de confiance issue de votre propre couche de liaison. Ne liez pas à partir d'une saisie utilisateur brute.

  </Accordion>
  <Accordion title="api.runtime.tts">
    Synthèse texte-vers-parole.

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

    Utilise la configuration `messages.tts` principale et la sélection de provider. Renvoie un tampon audio PCM + la fréquence d'échantillonnage.

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    Analyse d'image, d'audio et de vidéo.

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

    Renvoie `{ text: undefined }` lorsqu aucune sortie n'est produite (par exemple, entrée ignorée).

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` reste un alias de compatibilité pour `api.runtime.mediaUnderstanding.transcribeAudioFile(...)`.
    </Info>

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    Génération d'image.

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    Recherche web.

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    Utilitaires média de bas niveau.

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
    Instantané de la configuration d'exécution actuelle et écritures de configuration transactionnelles. Privilégiez la configuration qui a déjà été transmise au chemin d'appel actif ; n'utilisez `current()` que lorsque le gestionnaire a besoin directement de l'instantané du processus.

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` et `replaceConfigFile(...)` renvoient une valeur `followUp`, par exemple `{ mode: "restart", requiresRestart: true, reason }`, qui enregistre l'intention de l'enregistreur sans retirer le contrôle de redémarrage à la passerelle.

  </Accordion>
  <Accordion title="api.runtime.system">
    Utilitaires système.

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
    Abonnements aux événements.

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
    Journalisation.

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    Résolution d'authentification pour les modèles et providers.

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });
    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    Résolution du répertoire d'état et stockage à clé supporté par SQLite.

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

    Les magasins à clé survivent aux redémarrages et sont isolés par l'identifiant du plugin lié au runtime. Utilisez `registerIfAbsent(...)` pour les revendications de déduplication atomique : il renvoie `true` lorsque la clé était manquante ou expirée et a été enregistrée, ou `false` lorsqu'une valeur active existe déjà sans écraser sa valeur, son heure de création ou son TTL. Limites : `maxEntries` par espace de noms, 1 000 lignes actives par plugin, valeurs JSON de moins de 64 Ko et expiration TTL facultative.

    <Warning>
    Plugins fournis uniquement dans cette version.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools">
    Fabriques d'outils de mémoire et CLI.

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    Assistants d'exécution spécifiques au channel (disponibles lorsqu'un plugin de channel est chargé).

    `api.runtime.channel.mentions` est la surface partagée de stratégie de mention entrante pour les plugins de channel fournis qui utilisent l'injection runtime :

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

    Assistants de mention disponibles :

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    `api.runtime.channel.mentions` n'expose pas intentionnellement les anciens assistants de compatibilité `resolveMentionGating*`. Privilégiez le chemin normalisé `{ facts, policy }`.

  </Accordion>
</AccordionGroup>

## Storing runtime references

Utilisez `createPluginRuntimeStore` pour stocker la référence runtime pour une utilisation en dehors du rappel `register` :

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

<Note>Privilégiez `pluginId` pour l'identité du runtime-store. Le formulaire de niveau inférieur `key` est destiné aux cas rares où un plugin a intentionnellement besoin de plus d'un emplacement d'exécution.</Note>

## Autres champs `api` de premier niveau

Au-delà de `api.runtime`, l'objet API fournit également :

<ParamField path="api.id" type="string">
  ID du plugin.
</ParamField>
<ParamField path="api.name" type="string">
  Nom d'affichage du plugin.
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  Instantané de la configuration actuelle (instantané d'exécution en mémoire actif, si disponible).
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  Configuration spécifique au plugin à partir de `plugins.entries.<id>.config`.
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  Enregistreur délimité (`debug`, `info`, `warn`, `error`).
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  Mode de chargement actuel ; `"setup-runtime"` est la fenêtre de démarrage/configuration légère avant l'entrée complète.
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  Résout un chemin relatif à la racine du plugin.
</ParamField>

## Connexes

- [Plugin internals](/fr/plugins/architecture) — model de capacité et registre
- [SDK entry points](/fr/plugins/sdk-entrypoints) — options `definePluginEntry`
- [SDK overview](/fr/plugins/sdk-overview) — référence de sous-chemin

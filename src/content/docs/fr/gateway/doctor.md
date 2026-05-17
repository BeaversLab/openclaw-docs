---
summary: "Commande Doctor : vérifications de santé, migrations de configuration et étapes de réparation"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor`OpenClaw est l'outil de réparation et de migration pour OpenClaw. Il corrige les configurations/états obsolètes, vérifie l'état de santé et fournit des étapes de réparation applicables.

## Quick start

```bash
openclaw doctor
```

### Modes sans tête et d'automatisation

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    Accepter les valeurs par défaut sans demander (y compris les étapes de réparation du redémarrage/du service/du sandbox, le cas échéant).

  </Tab>
  <Tab title="--repair">
    ```bash
    openclaw doctor --repair
    ```

    Appliquer les réparations recommandées sans demander (réparations + redémarrages lorsque c'est sans danger).

  </Tab>
  <Tab title="--repair --force">
    ```bash
    openclaw doctor --repair --force
    ```

    Appliquer également les réparations agressives (écrase les configurations de superviseur personnalisées).

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    Exécuter sans invite et n'appliquer que les migrations sûres (normalisation de la configuration + déplacements de l'état sur disque). Ignore les actions de redémarrage/de service/de sandbox qui nécessitent une confirmation humaine. Les migrations d'état héritées s'exécutent automatiquement lorsqu'elles sont détectées.

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    Rechercher des installations supplémentaires de la passerelle dans les services système (launchd/systemd/schtasks).

  </Tab>
</Tabs>

Si vous souhaitez examiner les modifications avant l'écriture, ouvrez d'abord le fichier de configuration :

```bash
cat ~/.openclaw/openclaw.json
```

## Ce qu'il fait (résumé)

<AccordionGroup>
  <Accordion title="Santé, interface utilisateur et mises à jour">
    - Mise à jour préalable facultative pour les installations git (mode interactif uniquement).
    - Vérification de la fraîcheur du protocole de l'interface utilisateur (reconstruit l'interface de contrôle lorsque le schéma du protocole est plus récent).
    - Vérification de l'état de santé + invite à redémarrer.
    - Résumé de l'état des Skills (éligibles/manquantes/bloquées) et état des plugins.

  </Accordion>
  <Accordion title="Configuration et migrations">
    - Normalisation de la configuration pour les valeurs héritées.
    - Migration de la configuration Talk depuis les champs plats hérités `talk.*` vers `talk.provider` + `talk.providers.<provider>`.
    - Vérifications de migration du navigateur pour les configurations d'extension Chrome héritées et la préparation Chrome MCP.
    - Avertissements de substitution de fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`OAuth).
    - Avertissements de masquage OAuth Codex (`models.providers.openai-codex`OAuthOpenAIOAuth).
    - Vérification des prérequis TLS OAuth pour les profils OAuth Codex OpenAI.
    - Avertissements de liste d'autorisation de plugin/tool lorsque `plugins.allow`WhatsApp est restrictif mais que la stratégie de tool demande toujours des outils génériques ou détenus par des plugins.
    - Migration de l'état sur disque hérité (sessions/répertoire agent/authentification WhatsApp).
    - Migration de clé de contrat de manifeste de plugin hérité (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migration du magasin cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de haut niveau, payload `provider`, tâches de repli webhook simples `notify: true`).
    - Nettoyage de la stratégie d'exécution whole-agent héritée ; la stratégie d'exécution provider/model est le sélecteur d'itinéraire actif.
    - Nettoyage de la configuration de plugin obsolète lorsque les plugins sont activés ; lorsque `plugins.enabled=false`, les références de plugin obsolètes sont traitées comme une configuration de confinement inerte et sont conservées.

  </Accordion>
  <Accordion title="État et intégrité">
    - Inspection du fichier verrou de session et nettoyage des verrous obsolètes.
    - Réparation de la transcription de session pour les branches de réécriture de invites dupliquées créées par les versions affectées du 2026.4.24.
    - Détection de pierre tombale de redémarrage-récupération de sous-agent bloqué, avec `--fix`OAuth support pour effacer les indicateurs de récupération abandonnés obsolètes afin que le démarrage ne continue pas à traiter l'enfant comme abandonné lors du redémarrage.
    - Contrôles d'intégrité et d'autorisations de l'état (sessions, transcriptions, répertoire d'état).
    - Contrôles des autorisations du fichier de configuration (chmod 600) lors d'une exécution locale.
    - Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de refroidissement/désactivation du profil d'authentification.
    - Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).

  </Accordion>
  <Accordion title="Gateway, services, and supervisors">
    - Sandbox image repair when sandboxing is enabled.
    - Legacy service migration and extra gateway detection.
    - Matrix channel legacy state migration (in `--fix` / `--repair` mode).
    - Gateway runtime checks (service installed but not running; cached launchd label).
    - Channel status warnings (probed from the running gateway).
    - Channel-specific permission checks live under `openclaw channels capabilities`; for example, Discord voice channel permissions are audited with `openclaw channels capabilities --channel discord --target channel:<channel-id>`.
    - WhatsApp responsiveness checks for degraded Gateway event-loop health with local TUI clients still running; `--fix` stops only verified local TUI clients.
    - Codex route repair for legacy `openai-codex/*` model refs in primary models, fallbacks, heartbeat/subagent/compaction overrides, hooks, channel model overrides, and session route pins; `--fix` rewrites them to `openai/*`, removes stale session/whole-agent runtime pins, and leaves canonical OpenAI agent refs on the default Codex harness.
    - Supervisor config audit (launchd/systemd/schtasks) with optional repair.
    - Embedded proxy environment cleanup for gateway services that captured shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` values during install or update.
    - Gateway runtime best-practice checks (Node vs Bun, version-manager paths).
    - Gateway port collision diagnostics (default `18789`).

  </Accordion>
  <Accordion title="Auth, sécurité et couplage">
    - Avertissements de sécurité pour les politiques DM ouvertes.
    - Vérifications d'authentification Gateway pour le mode de jeton local (propose la génération de jeton lorsqu'aucune source de jeton n'existe ; ne remplace pas les configurations SecretRef de jeton).
    - Détection des problèmes de couplage d'appareils (demandes de premier couplage en attente, mises à niveau de rôle/portée en attente, dérive du cache du jeton d'appareil local obsolète et dérive d'authentification des enregistrements couplés).

  </Accordion>
  <Accordion title="Espace de travail et shell">
    - Vérification de la persistance systemd sous Linux.
    - Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncation/near-limit pour les fichiers de contexte).
    - Vérification de la disponibilité des Skills pour l'agent par défaut ; signale les Skills autorisés avec des bins, env, config ou exigences OS manquants, et `--fix` peut désactiver les Skills indisponibles dans `skills.entries`.
    - Vérification de l'état de l'auto-complétion du shell et installation/mise à niveau automatique.
    - Vérification de la disponibilité du provider d'embedding pour la recherche mémoire (modèle local, clé API distante, ou binaire QMD).
    - Vérifications de l'installation à partir des sources (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
    - Écrit la configuration mise à jour + les métadonnées de l'assistant.

  </Accordion>
</AccordionGroup>

## Remplissage et réinitialisation de l'interface Dreams UI

La scène Dreams de l'interface de contrôle comprend les actions **Backfill** (Remplissage rétrospectif), **Reset** (Réinitialisation) et **Clear Grounded** (Effacer ancré) pour le flux de travail de rêve ancré. Ces actions utilisent des méthodes de type docteur de passerelle RPC, mais elles ne font **pas** partie de la réparation/migration CLI RPC`openclaw doctor`CLI.

Ce qu'elles font :

- **Backfill** analyse les fichiers historiques `memory/YYYY-MM-DD.md` dans l'espace de travail actif, exécute la passe de journal REM ancré et écrit des entrées de remplissage rétrospectif réversibles dans `DREAMS.md`.
- **Reset** supprime uniquement ces entrées de journal de remplissage rétrospectif marquées de `DREAMS.md`.
- **Effacer l'ancré** (Clear Grounded) supprime uniquement les entrées à court terme mises en scène et ancrées uniquement, provenant de la relecture historique et n'ayant pas encore accumulé de rappel en direct ou de support quotidien.

Ce qu'ils ne font **pas** par eux-mêmes :

- ils ne modifient pas `MEMORY.md`
- ils n'exécutent pas les migrations complètes du docteur
- ils ne mettent pas automatiquement en scène les candidats ancrés dans le magasin de promotion à court terme en direct, sauf si vous exécutez explicitement d'abord le chemin CLI mis en scène CLI

Si vous souhaitez que la relecture historique ancrée influence la voie de promotion profonde normale, utilisez plutôt le flux CLI :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Cela met en place des candidats durables ancrés dans le stockage de rêve à court terme tout en gardant `DREAMS.md` comme surface de révision.

## Comportement détaillé et raisonnement

<AccordionGroup>
  <Accordion title="0. Mise à jour facultative (installations git)">
    S'il s'agit d'une extraction git et que le docteur s'exécute de manière interactive, il propose de mettre à jour (fetch/rebase/build) avant d'exécuter le docteur.
  </Accordion>
  <Accordion title="1. Normalisation de la configuration">
    Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction` sans une substitution spécifique au channel), doctor les normalise selon le schéma actuel.

    Cela inclut les champs plats hérités de Talk. La configuration actuelle de la parole publique Talk est `talk.provider` + `talk.providers.<provider>`, et la configuration vocale en temps réel est `talk.realtime.*`. Doctor réécrit les anciennes formes `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` dans la carte du provider, et réécrit les sélecteurs hérités de premier niveau en temps réel (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) en `talk.realtime`.

    Doctor avertit également lorsque `plugins.allow` n'est pas vide et que la stratégie de tool utilise
    des entrées de tool génériques ou détenues par des plugins. `tools.allow: ["*"]` ne correspond qu'aux tools
    des plugins qui se chargent réellement ; il ne contourne pas la liste d'autorisation
    exclusive de plugins. Doctor écrit `plugins.bundledDiscovery: "compat"` pour les configurations
    héritées de liste d'autorisation migrées afin de préserver le comportement existant des providers groupés, et
    pointe ensuite vers le paramètre plus strict `"allowlist"`.

  </Accordion>
  <Accordion title="2. Migrations des clés de configuration héritées">
    Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent d'exécuter `openclaw doctor`.

    Doctor va :

    - Expliquer quelles clés héritées ont été trouvées.
    - Afficher la migration qu'il a appliquée.
    - Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

    Le démarrage de Gateway refuse les formats de configuration hérités et vous demande d'exécuter `openclaw doctor --fix` ; il ne réécrit pas `openclaw.json` au démarrage. Les migrations du magasin de tâches Cron sont également gérées par `openclaw doctor --fix`.

    Migrations actuelles :

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - configurations de channel configurées sans politique de réponse visible → `messages.groupChat.visibleReplies: "message_tool"`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → `bindings` de premier niveau
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` hérités → `talk.provider` + `talk.providers.<provider>`
    - sélecteurs Talk en temps réel de premier niveau hérités (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` et `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` et `messages.tts.providers.microsoft`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` et `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` et `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - Pour les channels avec `accounts` nommé mais des valeurs de channel de premier niveau à compte unique persistantes, déplacez ces valeurs limitées au compte vers le compte promu choisi pour ce channel (`accounts.default` pour la plupart des channels ; Matrix peut préserver une cible nommée/défaut correspondante existante)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - supprimer `agents.defaults.llm` ; utiliser `models.providers.<id>.timeoutSeconds` pour les délais d'attente lents de provider/model
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)
    - `models.providers.*.api: "openai"` hérité → `"openai-completions"` (le démarrage de la passerelle ignore également les providers dont `api` est défini sur une valeur d'énumération future ou inconnue plutôt que d'échouer fermement)
    - supprimer `plugins.entries.codex.config.codexDynamicToolsProfile` ; Codex app-server garde toujours les outils de l'espace de travail natifs Codex natifs

    Les avertissements de Doctor incluent également des conseils sur le compte par défaut pour les channels multi-comptes :

    - Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, doctor avertit que le routage de secours peut choisir un compte inattendu.
    - Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, doctor avertit et liste les ID de compte configurés.

  </Accordion>
  <Accordion title="2b. Remplacements du fournisseur OpenCode">
    Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go` manuellement, cela remplace le catalogue OpenCode intégré de `@earendil-works/pi-ai`. Cela peut forcer les modèles vers la mauvaise API ou annuler les coûts. Doctor vous avertit afin que vous puissiez supprimer le remplacement et rétablir le routage API par modèle + les coûts.
  </Accordion>
  <Accordion title="2c. Migration du navigateur et disponibilité du MCP Chrome">
    Si la configuration de votre navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, doctor la normalise vers le modèle d'attachement MCP Chrome hôte-local actuel :

    - `browser.profiles.*.driver: "extension"` devient `"existing-session"`
    - `browser.relayBindHost` est supprimé

    Doctor audite également le chemin MCP Chrome hôte-local lorsque vous utilisez `defaultProfile: "user"` ou un profil `existing-session` configuré :

    - vérifie si Google Chrome est installé sur le même hôte pour les profils de connexion automatique par défaut
    - vérifie la version de Chrome détectée et avertit si elle est inférieure à Chrome 144
    - vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` ou `edge://inspect/#remote-debugging`)

    Doctor ne peut pas activer le paramètre côté Chrome pour vous. Le MCP Chrome hôte-local nécessite toujours :

    - un navigateur basé sur Chromium 144+ sur l'hôte de passerelle/nœud
    - le navigateur s'exécutant localement
    - le débogage à distance activé dans ce navigateur
    - l'approbation de la première invite de consentement d'attachement dans le navigateur

    La disponibilité ici concerne uniquement les prérequis d'attachement local. Existing-session conserve les limites de routage MCP Chrome actuelles ; les routes avancées telles que `responsebody`, l'exportation PDF, l'interception de téléchargement et les actions par lots nécessitent toujours un navigateur géré ou un profil CDP brut.

    Cette vérification ne s'applique **pas** à Docker, sandbox, remote-browser ou d'autres flux sans interface utilisateur (headless). Ceux-ci continuent d'utiliser le CDP brut.

  </Accordion>
  <Accordion title="OAuth2d. Prérequis TLS OAuth"OpenAIOAuthOpenAI>
    Lorsqu'un profil OAuth Codex OpenAI est configuré, le docteur sonde le point de terminaison d'autorisation OpenAI pour vérifier que la pile TLS locale Node/OpenSSL peut valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`macOS, certificat expiré ou auto-signé), le docteur affiche des instructions de correction spécifiques à la plate-forme. Sur macOS avec un Node Homebrew, la correction est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute même si la passerelle est en bonne santé.
  </Accordion>
  <Accordion title="OAuth2e. Remplacements du fournisseur OAuth Codex"OpenAI>
    Si vous avez précédemment ajouté des paramètres de transport OpenAI hérités sous `models.providers.openai-codex`OAuthOAuth, ils peuvent masquer le chemin du fournisseur OAuth Codex intégré que les versions plus récentes utilisent automatiquement. Le docteur avertit lorsqu'il détecte ces anciens paramètres de transport en plus de OAuth Codex afin que vous puissiez supprimer ou réécrire le remplacement de transport obsolète et récupérer le comportement de routage/secours intégré. Les proxies personnalisés et les remplacements d'en-têtes uniquement sont toujours pris en charge et ne déclenchent pas cet avertissement.
  </Accordion>
  <Accordion title="2f. Réparation de l'itinéraire Codex">
    Doctor vérifie les références de modèle `openai-codex/*` héritées. Le routage du harnais Codex natif utilise des références de modèle `openai/*` canoniques ; les tours d'agent OpenAI passent par le harnais du serveur d'application Codex au lieu du chemin PI OpenClaw OpenAI.

    En mode `--fix` / `--repair`, doctor réécrit les références affectées de l'agent par défaut et par agent, y compris les modèles principaux, les replis, les remplacements de heartbeat/sous-agent/compactage, les hooks, les remplacements de modèle de canal et l'état d'itinéraire de session persistant obsolète :

    - `openai-codex/gpt-*` devient `openai/gpt-*`.
    - L'intention Codex passe aux entrées `agentRuntime.id: "codex"` délimitées par fournisseur/modèle pour les références de modèle d'agent réparées afin que les profils d'authentification `openai-codex:...` puissent toujours être sélectionnés une fois que la référence de modèle devient `openai/*`.
    - La configuration d'exécution globale de l'agent obsolète et les épingles d'exécution de session persistante sont supprimés car la sélection d'exécution est délimitée par fournisseur/modèle.
    - La stratégie d'exécution fournisseur/modèle existante est préservée, sauf si la référence de modèle héritée réparée a besoin du routage Codex pour conserver l'ancien chemin d'authentification.
    - Les listes de repli de modèle existantes sont préservées avec leurs entrées héritées réécrites ; les paramètres copiés par modèle passent de la clé héritée à la clé canonique `openai/*`.
    - La session persistante `modelProvider`/`providerOverride`, `model`/`modelOverride`, les avis de repli et les épingles de profil d'authentification sont réparés dans tous les magasins de sessions d'agent découverts.
    - `/codex ...` signifie « contrôler ou lier une conversation Codex native à partir du chat ».
    - `/acp ...` ou `runtime: "acp"` signifie « utiliser l'adaptateur externe ACP/acpx ».

  </Accordion>
  <Accordion title="2g. Nettoyage de l'itinéraire de session">
    Doctor analyse également les magasins de sessions d'agent découverts pour détecter l'état de l'itinéraire auto-créé obsolète après avoir déplacé des modèles configurés ou le runtime en dehors d'un itinéraire détenu par un plugin tel que Codex.

    `openclaw doctor --fix` peut effacer l'état obsolète auto-créé tel que les épingles de modèle `modelOverrideSource: "auto"`, les métadonnées du modèle de runtime, les identifiants de harnais épinglés, les liaisons de session CLI et les substitutions automatiques de profil d'authentification lorsque leur itinéraire propriétaire n'est plus configuré. Les choix explicites de l'utilisateur ou de modèle de session hérité sont signalés pour examen manuel et laissés intacts ; basculez-les avec `/model ...`, `/new`, ou réinitialisez la session lorsque cet itinéraire n'est plus voulu.

  </Accordion>
  <Accordion title="3. Migrations d'état hérité (disposition du disque)">
    Doctor peut migrer les anciennes dispositions sur disque vers la structure actuelle :

    - Magasin de sessions + transcripts :
      - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
    - Répertoire de l'agent :
      - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
    - État d'authentification WhatsApp (Baileys) :
      - de l'ancien `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
      - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

    Ces migrations sont de type « best-effort » (meilleurs efforts) et idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités en tant que sauvegardes. Le Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp n'est migrée intentionnellement que via `openclaw doctor`. La normalisation du fournisseur/provider-map de Talk compare désormais par égalité structurelle, de sorte que les différences basées uniquement sur l'ordre des clés ne déclenchent plus de modifications `doctor --fix` répétitives sans effet.

  </Accordion>
  <Accordion title="3a. Migrations de manifeste de plugin hérité">
    Doctor analyse tous les manifestes de plugins installés pour détecter les clés de fonctionnalité de niveau supérieur obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'il en trouve, il propose de les déplacer dans l'objet `contracts` et de réécrire le fichier manifeste sur place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.
  </Accordion>
  <Accordion title="3b. Migrations du magasin cron héritées">
    Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de substitution) pour détecter d'anciennes structures de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

    Les nettoyages cron actuels incluent :

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - champs de payload de premier niveau (`message`, `model`, `thinking`, ...) → `payload`
    - champs de livraison de premier niveau (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de livraison `provider` du payload → `delivery.channel` explicite
    - tâches de secours webhook héritées simples `notify: true` → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

    Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans modifier le comportement. Si une tâche combine un mécanisme de secours de notification hérité avec un mode de livraison non-webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

    Sur Linux, doctor avertit également lorsque la crontab de l'utilisateur appelle encore le `~/.openclaw/bin/ensure-whatsapp.sh` hérité. Ce script local à l'hôte n'est pas maintenu par la version actuelle d'OpenClaw et peut écrire de faux messages `Gateway inactive` dans `~/.openclaw/logs/whatsapp-health.log` lorsque cron ne peut pas atteindre le bus utilisateur systemd. Supprimez l'entrée de crontab obsolète avec `crontab -e`; utilisez `openclaw channels status --probe`, `openclaw doctor` et `openclaw gateway status` pour les vérifications de santé actuelles.

  </Accordion>
  <Accordion title="3c. Nettoyage des verrous de session"OpenClaw>
    Doctor analyse chaque répertoire de session d'agent à la recherche de fichiers de verrouillage d'écriture obsolètes — fichiers laissés lorsqu'une session s'est terminée anormalement. Pour chaque fichier de verrou trouvé, il signale : le chemin, le PID, si le PID est toujours actif, l'âge du verrou et s'il est considéré comme obsolète (PID mort, plus vieux que 30 minutes, ou un PID actif qui peut être prouvé comme appartenant à un processus non-OpenClaw). En mode `--fix` / `--repair`, il supprime automatiquement les fichiers de verrou obsolètes ; sinon, il imprime une note et vous invite à réexécuter avec `--fix`.
  </Accordion>
  <Accordion title="3d. Réparation de la branche de transcription de session"OpenClaw>
    Doctor analyse les fichiers JSONL de session d'agent pour la forme de branche dupliquée créée par le bug de réécriture de transcription de prompt du 2026.4.24 : un tour utilisateur abandonné avec le contexte d'exécution interne OpenClaw plus un frère actif contenant le même prompt utilisateur visible. En mode `--fix` / `--repair`, doctor sauvegarde chaque fichier affecté à côté de l'original et réécrit la transcription vers la branche active afin que l'historique de la passerelle et les lecteurs de mémoire ne voient plus les tours en double.
  </Accordion>
  <Accordion title="4. Contrôles d'intégrité de l'état (persistance de la session, routage et sécurité)">
    Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez les sessions, les identifiants, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

    Doctor vérifie :

    - **Répertoire d'état manquant** : avertit d'une perte catastrophique d'état, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
    - **Permissions du répertoire d'état** : vérifie la possibilité d'écriture ; propose de réparer les permissions (et émet un conseil `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
    - **Répertoire d'état synchronisé dans le cloud sur macOS** : avertit lorsque l'état se trouve sous iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes et des conflits de verrouillage/synchronisation.
    - **Répertoire d'état sur carte SD ou eMMC Linux** : avertit lorsque l'état résout sur une source de montage `mmcblk*`, car les E/S aléatoires sur carte SD ou eMMC peuvent être plus lentes et s'user plus rapidement sous les écritures de session et d'identifiants.
    - **Répertoires de session manquants** : `sessions/` et le répertoire de stockage de session sont requis pour conserver l'historique et éviter les plantages `ENOENT`.
    - **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des fichiers de transcription manquants.
    - **Session principale « 1-ligne JSONL »** : signale lorsque la transcription principale n'a qu'une seule ligne (l'historique ne s'accumule pas).
    - **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent dans les répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut être divisé entre les installations).
    - **Rappel du mode distant** : si `gateway.mode=remote`, Doctor vous rappelle de l'exécuter sur l'hôte distant (l'état s'y trouve).
    - **Permissions du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est lisible par le groupe/le monde et propose de resserrer à `600`.

  </Accordion>
  <Accordion title="5. Intégrité de l'authentification du modèle (expiration OAuth)">
    Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons sont en train d'expirer ou ont expiré, et peut les actualiser lorsque cela est sûr. Si le profil Anthropic/jeton OAuth est obsolète, il suggère une clé Anthropic API ou le chemin du jeton de configuration Anthropic. Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive` ignore les tentatives d'actualisation.

    Lorsqu'une actualisation OAuth échoue de manière permanente (par exemple `refresh_token_reused`, `invalid_grant`, ou un fournisseur vous demandant de vous reconnecter), doctor signale qu'une réauthentification est requise et imprime la commande exacte `openclaw models auth login --provider ...` à exécuter.

    Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

    - courts délais d'attente (limites de délai/dépassements de délai/échecs d'authentification)
    - désactivations plus longues (échecs de facturation/crédit)

  </Accordion>
  <Accordion title="6. Validation du modèle de Hooks">
    Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au catalogue et à la liste d'autorisation et avertit lorsqu'elle ne peut pas être résolue ou n'est pas autorisée.
  </Accordion>
  <Accordion title="7. Réparation de l'image Sandbox">
    Lorsque le bac à sable est activé, doctor vérifie les images Docker et propose de construire ou de passer aux noms hérités si l'image actuelle est manquante.
  </Accordion>
  <Accordion title="7b. Nettoyage de l'installation des plugins"OpenClaw>
    Doctor supprime l'état de mise en zone de préparation des dépendances de plugin hérité généré par OpenClaw en mode `openclaw doctor --fix` / `openclaw doctor --repair`npm. Cela couvre les racines de dépendances générées obsolètes, les anciens répertoires d'étape d'installation, les débris locaux de package issus de l'ancien code de réparation des dépendances de plugins groupés, et les copies gérées orphelines ou récupérées de plugins groupés `@openclaw/*` qui peuvent masquer le manifeste groupé actuel. Doctor relie également le package hôte `openclaw` aux plugins gérés npm qui déclarent `peerDependencies.openclaw`, afin que les importations d'exécution locales de package telles que `openclaw/plugin-sdk/*` continuent d'être résolues après les mises à jour ou les réparations npm.

    Doctor peut également réinstaller les plugins téléchargeables manquants lorsque la configuration les référence mais que le registre local de plugins ne peut pas les trouver. Des exemples incluent le matériel `plugins.entries`, les paramètres channel/provider/search configurés et les environnements d'exécution d'agent configurés. Lors des mises à jour de package, doctor évite d'exécuter la réparation des plugins du gestionnaire de packages pendant que le package principal est en cours d'échange ; exécutez `openclaw doctor --fix` à nouveau après la mise à jour si un plugin configuré a encore besoin d'être récupéré. Le démarrage de la Gateway et le rechargement de la configuration n'exécutent pas les gestionnaires de packages ; les installations de plugins restent un travail explicite de doctor/install/update.

  </Accordion>
  <Accordion title="Gateway8. Gateway service migrations and cleanup hints"OpenClawOpenClawLinuxOpenClaw>
    Doctor détecte les services de passerelle hérités (launchd/systemd/schtasks) et propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle actuel. Il peut également rechercher des services similaires à des passerelles supplémentaires et imprimer des conseils de nettoyage. Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas signalés comme « supplémentaires ».

    Sur Linux, si le service de passerelle au niveau de l'utilisateur est manquant mais qu'un service de passerelle OpenClaw au niveau du système existe, doctor n'installe pas automatiquement un deuxième service au niveau de l'utilisateur. Inspectez avec `openclaw gateway status --deep` ou `openclaw doctor --deep`, puis supprimez le doublon ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un superviseur système possède le cycle de vie de la passerelle.

  </Accordion>
  <Accordion title="Matrix8b. Startup Matrix migration"Matrix>
    Lorsqu'un compte de canal Matrix a une migration d'état héritée en attente ou actionnable, doctor (en mode `--fix` / `--repair`Matrix) crée un instantané avant migration puis exécute les étapes de migration au mieux de ses capacités : migration d'état Matrix hérité et préparation de l'état chiffré hérité. Ces deux étapes ne sont pas fatales ; les erreurs sont consignées et le démarrage se poursuit. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification est entièrement ignorée.
  </Accordion>
  <Accordion title="8c. Appareillage des périphériques et dérive de l'auth">
    Doctor inspecte désormais l'état de l'appareillage des périphériques dans le cadre de la vérification de santé normale.

    Ce qu'il signale :

    - les demandes de premier appareillage en attente
    - les mises à niveau de rôle en attente pour les périphériques déjà appareillés
    - les mises à niveau de portée en attente pour les périphériques déjà appareillés
    - les réparations de discordance de clé publique où l'identifiant du périphérique correspond toujours mais l'identité du périphérique ne correspond plus à l'enregistrement approuvé
    - les enregistrements appareillés manquant un jeton actif pour un rôle approuvé
    - les jetons appareillés dont les portées dérivent en dehors de la ligne de base de l'appareillage approuvé
    - les entrées de jeton-périphérique mises en cache localement pour la machine actuelle qui sont antérieures à une rotation de jeton côté passerelle ou qui portent des métadonnées de portée obsolètes

    Doctor n'approuve pas automatiquement les demandes d'appareillage ni ne fait tourner automatiquement les jetons de périphérique. Il imprime plutôt les étapes suivantes exactes :

    - inspecter les demandes en attente avec `openclaw devices list`
    - approuver la demande exacte avec `openclaw devices approve <requestId>`
    - faire tourner un nouveau jeton avec `openclaw devices rotate --device <deviceId> --role <role>`
    - supprimer et réapprouver un enregistrement obsolète avec `openclaw devices remove <deviceId>`

    Cela comble le trou courant « déjà appareillé mais exigeant toujours un appareillage » : doctor distingue désormais le premier appareillage des mises à niveau de rôle/portée en attente et de la dérive de jeton/identité de périphérique obsolète.

  </Accordion>
  <Accordion title="9. Security warnings">
    Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou lorsqu'une politique est configurée de manière dangereuse.
  </Accordion>
  <Accordion title="Linux10. systemd linger (Linux)">
    S'il est exécuté en tant que service utilisateur systemd, doctor vérifie que la persistance (linger) est activée afin que la passerelle reste active après la déconnexion.
  </Accordion>
  <Accordion title="11. Statut de l'espace de travail (compétences, plugins et répertoires hérités)">
    Doctor imprime un résumé de l'état de l'espace de travail pour l'agent par défaut :

    - **Statut des compétences** : compte les compétences éligibles, celles dont les prérequis manquent et celles bloquées par la liste d'autorisation.
    - **Répertoires d'espace de travail hérités** : avertit lorsque `~/openclaw` ou d'autres répertoires d'espace de travail hérités existent à côté de l'espace de travail actuel.
    - **Statut des plugins** : compte les plugins activés/désactivés/en erreur ; liste les identifiants des plugins pour toute erreur ; signale les capacités des plugins groupés.
    - **Avertissements de compatibilité des plugins** : signale les plugins qui ont des problèmes de compatibilité avec l'exécution actuelle.
    - **Diagnostics des plugins** : met en évidence tous les avertissements ou erreurs au chargement émis par le registre des plugins.

  </Accordion>
  <Accordion title="11b. Taille du fichier d'amorçage">
    Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`, `CLAUDE.md` ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget de caractères configuré. Il signale, pour chaque fichier, le nombre de caractères bruts par rapport à ceux injectés, le pourcentage de troncation, la cause de la troncation (`max/file` ou `max/total`) et le nombre total de caractères injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches de la limite, doctor affiche des conseils pour régler `agents.defaults.bootstrapMaxChars` et `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Nettoyage des plugins de canal obsolètes">
    Lorsque `openclaw doctor --fix` supprime un plugin de canal manquant, il supprime également la configuration de portée de canal pendante qui référençait ce plugin : entrées `channels.<id>`, cibles de battement de cœur nommant le canal et remplacements `agents.*.models["<channel>/*"]`. Cela empêche les boucles de démarrage du Gateway où le runtime du canal a disparu mais où la configuration demande toujours à la passerelle de s'y lier.
  </Accordion>
  <Accordion title="11c. Complétion du shell">
    Doctor vérifie si la complétion par tabulation est installée pour le shell actuel (zsh, bash, fish ou PowerShell) :

    - Si le profil du shell utilise un modèle de complétion dynamique lent (`source <(openclaw completion ...)`), doctor le met à niveau vers la variante de fichier en cache plus rapide.
    - Si la complétion est configurée dans le profil mais que le fichier cache est manquant, doctor régénère automatiquement le cache.
    - Si aucune complétion n'est configurée du tout, doctor propose de l'installer (mode interactif uniquement ; ignoré avec `--non-interactive`).

    Exécutez `openclaw completion --write-state` pour régénérer manuellement le cache.

  </Accordion>
  <Accordion title="Gateway12. Vérifications d'authentification Gateway (jeton local)">
    Doctor vérifie la préparation de l'authentification par jeton local de la passerelle.

    - Si le mode de jeton nécessite un jeton et qu'aucune source de jeton n'existe, Doctor propose d'en générer un.
    - Si `gateway.auth.token` est géré par SecretRef mais indisponible, Doctor avertit et ne l'écrase pas en clair.
    - `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

  </Accordion>
  <Accordion title="12b. Réparations conscientes de SecretRef en lecture seule">
    Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide à l'exécution.

    - `openclaw doctor --fix`Telegram utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
    - Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username`Telegram tente d'utiliser les informations d'identification du bot configurées si elles sont disponibles.
    - Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, Doctor signale que l'information d'identification est configurée mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le jeton comme manquant.

  </Accordion>
  <Accordion title="13. Vérification de l'état du Gateway + redémarrage">
    Doctor exécute une vérification de l'état et propose de redémarrer la passerelle lorsqu'elle semble en mauvaise santé.
  </Accordion>
  <Accordion title="13b. Préparation de la recherche mémoire">
    Doctor vérifie si le fournisseur d'intégration de recherche mémoire configuré est prêt pour l'agent par défaut. Le comportement dépend du backend et du fournisseur configurés :

    - **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable. Dans le cas contraire, imprime des conseils de réparation, y compris le package npm et une option de chemin binaire manuel.
    - **Fournisseur local explicite** : vérifie la présence d'un fichier de modèle local ou d'une URL de modèle distante/téléchargeable reconnue. S'il est manquant, suggère de passer à un fournisseur distant.
    - **Fournisseur distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est présente dans l'environnement ou le magasin d'authentification. Imprime des conseils de réparation actionnables si elle est manquante.
    - **Fournisseur automatique** : vérifie d'abord la disponibilité du modèle local, puis essaie chaque fournisseur distant dans l'ordre de sélection automatique.

    Lorsqu'un résultat de sonde de passerelle mis en cache est disponible (la passerelle était en bonne santé au moment de la vérification), Doctor recoupe ce résultat avec la configuration visible par la CLI et note toute divergence. Doctor ne lance pas de nouveau ping d'intégration sur le chemin par défaut ; utilisez la commande de statut de mémoire approfondie lorsque vous souhaitez une vérification en direct du fournisseur.

    Utilisez `openclaw memory status --deep` pour vérifier la préparation de l'intégration lors de l'exécution.

  </Accordion>
  <Accordion title="14. Avertissements de statut de canal">
    Si la passerelle est en bonne santé, le docteur exécute une sonde de statut de canal et signale les avertissements avec des corrections suggérées.
  </Accordion>
  <Accordion title="15. Audit et réparation de la configuration du superviseur">
    Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour détecter les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances network-online de systemd et le délai de redémarrage). Lorsqu'il détecte une inadéquation, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

    Remarques :

    - `openclaw doctor` invite à confirmer avant de réécrire la configuration du superviseur.
    - `openclaw doctor --yes` accepte les invites de réparation par défaut.
    - `openclaw doctor --repair` applique les corrections recommandées sans invite.
    - `openclaw doctor --repair --force` écrase les configurations personnalisées du superviseur.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` maintient doctor en lecture seule pour le cycle de vie du service gateway. Il signale toujours l'état de santé du service et exécute les réparations non liées aux services, mais ignore l'installation, le démarrage, le redémarrage, l'amorçage des services, la réécriture de la configuration du superviseur et le nettoyage des services hérités, car un superviseur externe est propriétaire de ce cycle de vie.
    - Sur Linux, doctor ne réécrit pas les métadonnées de commande/point d'entrée tant que l'unité systemd gateway correspondante est active. Il ignore également les unités supplémentaires similaires à une gateway inactives et non héritées lors de l'analyse des services en double, afin que les fichiers de service compagnons ne créent pas de bruit de nettoyage.
    - Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation ou la réparation du service doctor valide le SecretRef mais ne conserve pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service superviseur.
    - Doctor détecte les valeurs d'environnement de service gérées `.env`/SecretRef que les installations plus anciennes de LaunchAgent, systemd ou Tâche planifiée Windows avaient intégrées en ligne, et réécrit les métadonnées du service pour que ces valeurs soient chargées depuis la source d'exécution plutôt que depuis la définition du superviseur.
    - Doctor détecte lorsque la commande de service épingle encore un ancien `--port` après des modifications de `gateway.port` et réécrit les métadonnées du service vers le port actuel.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré est non résolu, doctor bloque le chemin d'installation/réparation avec des directives exploitables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
    - Pour les unités utilisateur systemd Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
    - Les réparations de service de doctor refusent de réécrire, d'arrêter ou de redémarrer un service gateway à partir d'un binaire OpenClaw plus ancien lorsque la configuration a été écrite pour la dernière fois par une version plus récente. Voir [Dépannage Gateway](/fr/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="Gateway16. Diagnostic du runtime et du port Gateway">
    Doctor inspecte le runtime du service (PID, dernier état de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de ports sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).
  </Accordion>
  <Accordion title="Gateway17. Bonnes pratiques du runtime Gateway"Bun>
    Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par version (`nvm`, `fnm`, `volta`, `asdf`WhatsAppTelegrammacOS, etc.). Les canaux WhatsApp + Telegram nécessitent Node, et les chemins des gestionnaires de versions peuvent se briser après les mises à niveau car le service ne charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node si disponible (Homebrew/apt/choco).

    Les LaunchAgents nouvellement installés ou réparés sur macOS utilisent un PATH système canonique (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`Linux) au lieu de copier le PATH du shell interactif, de sorte que les binaires système gérés par Homebrew restent disponibles tandis que les répertoires Volta, asdf, fnm, pnpm et autres gestionnaires de versions ne modifient pas la résolution des processus enfants Node. Les services Linux conservent toujours des racines d'environnement explicites (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) et des répertoires utilisateur-bin stables, mais les répertoires de secours des gestionnaires de versions supposés ne sont écrits dans le PATH du service que lorsque ces répertoires existent sur le disque.

  </Accordion>
  <Accordion title="18. Écriture de configuration + métadonnées de l'assistant">
    Doctor conserve toutes les modifications de configuration et appose les métadonnées de l'assistant pour enregistrer l'exécution du doctor.
  </Accordion>
  <Accordion title="19. Conseils d'espace de travail (sauvegarde + système de mémoire)">
    Doctor suggère un système de mémoire pour l'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

    Consultez [/concepts/agent-workspace](/fr/concepts/agent-workspaceGitHub) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (GitHub ou GitLab privé recommandé).

  </Accordion>
</AccordionGroup>

## Connexes

- [Guide de procédures Gateway](Gateway/en/gateway)
- [Dépannage Gateway](Gateway/en/gateway/troubleshooting)

---
summary: "Commande Doctor : vérifications de santé, migrations de configuration et étapes de réparation"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` est l'outil de réparation et de migration pour OpenClaw. Il corrige les configurations/états obsolètes, vérifie l'état de santé et fournit des étapes de réparation applicables.

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
    - Vérification de la fraîcheur du protocole d'interface utilisateur (reconstruit l'interface de contrôle lorsque le schéma de protocole est plus récent).
    - Vérification de l'état de santé + invite de redémarrage.
    - Résumé de l'état des Skills (éligibles/manquantes/bloquées) et de l'état des plugins.
  </Accordion>
  <Accordion title="Configuration et migrations">
    - Normalisation de la configuration pour les valeurs héritées.
    - Migration de la configuration Talk depuis les champs `talk.*` plats hérités vers `talk.provider` + `talk.providers.<provider>`.
    - Vérifications de migration du navigateur pour les configurations d'extension Chrome héritées et la préparation MCP Chrome.
    - Avertissements de substitution de fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
    - Avertissements de masquage OAuth Codex (`models.providers.openai-codex`).
    - Vérification des prérequis TLS OAuth pour les profils OAuth Codex OAuth.
    - Migration de l'état sur disque hérité (sessions/répertoire agent/auth OAuth).
    - Migration de la clé de contrat de manifeste de plugin hérité (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migration du magasin cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de premier niveau, payload `provider`, tâches de secours webhook `notify: true` simples).
    - Migration de la stratégie d'exécution (runtime-policy) d'agent héritée vers `agents.defaults.agentRuntime` et `agents.list[].agentRuntime`.
  </Accordion>
  <Accordion title="État et intégrité">
    - Inspection du fichier de verrouillage de session et nettoyage des verrous périmés.
    - Réparation de la transcription de session pour les branches de réécriture de prompt dupliquées créées par les versions affectées du 24/04/2026.
    - Vérifications d'intégrité et d'autorisations de l'état (sessions, transcriptions, répertoire d'état).
    - Vérifications des autorisations du fichier de configuration (chmod 600) lors d'une exécution locale.
    - Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de cooldown/désactivé du profil d'authentification.
    - Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).
  </Accordion>
  <Accordion title="Gateway, services, and supervisors">
    - Réparation de l'image Sandbox lorsque la mise en sandbox est activée.
    - Migration du service hérité et détection de passerelle supplémentaire.
    - Migration de l'état hérité du canal Matrix (en mode `--fix` / `--repair`).
    - Vérifications d'exécution de la Gateway (service installé mais non en cours d'exécution ; label launchd mis en cache).
    - Avertissements de statut du canal (sondés à partir de la Gateway en cours d'exécution).
    - Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
    - Nettoyage de l'environnement proxy intégré pour les services de passerelle qui ont capturé les valeurs de shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` lors de l'installation ou de la mise à jour.
    - Vérifications des meilleures pratiques d'exécution de la Gateway (Node vs Bun, chemins du gestionnaire de versions).
    - Diagnostics de collision de ports de la Gateway (`18789` par défaut).
  </Accordion>
  <Accordion title="Auth, security, and pairing">
    - Avertissements de sécurité pour les politiques de DM ouvert.
    - Vérifications d'authentification de la Gateway pour le mode de jeton local (offre la génération de jeton lorsqu'aucune source de jeton n'existe ; n'écrase pas les configs SecretRef de jeton).
    - Détection des problèmes de jumelage d'appareils (demandes de premier jumelage en attente, mises à niveau de rôle/portée en attente, dérive du cache de jeton d'appareil local obsolète, et dérive d'authentification des enregistrements jumelés).
  </Accordion>
  <Accordion title="Workspace and shell">
    - Vérification de la persistance systemd sur Linux.
    - Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncation/proche de la limite pour les fichiers de contexte).
    - Vérification du statut de complétion du shell et installation/mise à niveau automatique.
    - Vérification de la préparation du fournisseur d'intégration pour la recherche mémoire (modèle local, clé Linux distante, ou binaire QMD).
    - Vérifications d'installation à partir des sources (inadéquation de l'espace de travail pnpm, ressources UI manquantes, binaire tsx manquant).
    - Écrit la configuration mise à jour + les métadonnées de l'assistant.
  </Accordion>
</AccordionGroup>

## Remplissage et réinitialisation de l'interface Dreams UI

La scène Dreams de l'interface de contrôle (Control UI) comprend les actions **Backfill**, **Reset** et **Clear Grounded** pour le flux de travail de rêve ancré (grounded dreaming). Ces actions utilisent des méthodes RPC de style doctor de la passerelle, mais elles ne font **pas** partie de la réparation/migration du CLI `openclaw doctor`.

Ce qu'elles font :

- **Remplissage** (Backfill) analyse les fichiers `memory/YYYY-MM-DD.md` historiques de l'espace de travail actif, exécute la passe de journal REM ancrée et écrit des entrées de remplissage réversibles dans `DREAMS.md`.
- **Réinitialiser** (Reset) supprime uniquement les entrées de journal de remplissage marquées de `DREAMS.md`.
- **Effacer l'ancré** (Clear Grounded) supprime uniquement les entrées à court terme mises en scène et ancrées uniquement, provenant de la relecture historique et n'ayant pas encore accumulé de rappel en direct ou de support quotidien.

Ce qu'ils ne font **pas** par eux-mêmes :

- ils ne modifient pas `MEMORY.md`
- ils n'exécutent pas les migrations complètes du docteur
- ils ne mettent pas automatiquement en scène les candidats ancrés dans le magasin de promotion à court terme en direct, sauf si vous exécutez explicitement d'abord le chemin CLI mis en scène CLI

Si vous souhaitez que la relecture historique ancrée influence la voie de promotion profonde normale, utilisez plutôt le flux CLI :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Cela met en scène les candidats durables ancrés dans le magasin de rêve à court terme tout en gardant `DREAMS.md` comme surface de révision.

## Comportement détaillé et raisonnement

<AccordionGroup>
  <Accordion title="0. Mise à jour facultative (installations git)">
    S'il s'agit d'une extraction git et que le docteur s'exécute de manière interactive, il propose de mettre à jour (fetch/rebase/build) avant d'exécuter le docteur.
  </Accordion>
  <Accordion title="1. Normalisation de la configuration">
    Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction` sans une substitution spécifique au canal), le docteur les normalise dans le schéma actuel.

    Cela inclut les champs plats hérités de Talk. La configuration publique actuelle de Talk est `talk.provider` + `talk.providers.<provider>`. Le docteur réécrit les anciennes formes `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` dans la carte des fournisseurs.

  </Accordion>
  <Accordion title="2. Migrations des clés de configuration héritées">
    Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent d'exécuter `openclaw doctor`.

    Doctor va :

    - Expliquer quelles clés héritées ont été trouvées.
    - Montrer la migration qu'il a appliquée.
    - Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

    Le Gateway exécute également automatiquement les migrations de doctor au démarrage lorsqu'il détecte un format de configuration hérité, de sorte que les configurations obsolètes sont réparées sans intervention manuelle. Les migrations du magasin de tâches cron sont gérées par `openclaw doctor --fix`.

    Migrations actuelles :

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → `bindings` de niveau supérieur
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` hérité(e)s → `talk.provider` + `talk.providers.<provider>`
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
    - Pour les channels avec `accounts` nommés mais des valeurs de channel de niveau supérieur à compte unique persistantes, déplacez ces valeurs délimitées au compte vers le compte promu choisi pour ce channel (`accounts.default` pour la plupart des channels ; Matrix peut conserver une cible nommée/défaut correspondante existante)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (outils/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - supprimer `agents.defaults.llm` ; utiliser `models.providers.<id>.timeoutSeconds` pour les délais d'expiration lents de provider/model
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)
    - `models.providers.*.api: "openai"` hérité → `"openai-completions"` (le démarrage de la passerelle ignore également les providers dont `api` est défini à une valeur d'énumération future ou inconnue plutôt que d'échouer de manière fermée)

    Les avertissements de Doctor incluent également des directives sur le compte par défaut pour les channels multi-comptes :

    - Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, doctor avertit que le routage de secours peut choisir un compte inattendu.
    - Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, doctor avertit et liste les ID de compte configurés.

  </Accordion>
  <Accordion title="2b. Remplacements du fournisseur OpenCode">
    Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go` manuellement, cela remplace le catalogue OpenCode intégré de `@mariozechner/pi-ai`. Cela peut forcer les modèles vers la mauvaise API ou annuler les coûts. Doctor vous avertit afin que vous puissiez supprimer le remplacement et restaurer le routage et les coûts par modèle via l'API.
  </Accordion>
  <Accordion title="2c. Migration du navigateur et préparation de Chrome MCP">
    Si la configuration de votre navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, doctor la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

    - `browser.profiles.*.driver: "extension"` devient `"existing-session"`
    - `browser.relayBindHost` est supprimé

    Doctor audite également le chemin Chrome MCP hôte-local lorsque vous utilisez `defaultProfile: "user"` ou un profil configuré `existing-session` :

    - vérifie si Google Chrome est installé sur le même hôte pour les profils de connexion automatique par défaut
    - vérifie la version de Chrome détectée et avertit si elle est inférieure à Chrome 144
    - vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` ou `edge://inspect/#remote-debugging`)

    Doctor ne peut pas activer le paramètre côté Chrome pour vous. Chrome MCP hôte-local nécessite toujours :

    - un navigateur basé sur Chromium 144+ sur l'hôte de passerelle/nœud
    - le navigateur s'exécutant localement
    - le débogage à distance activé dans ce navigateur
    - l'approbation de la première invite de consentement d'attachement dans le navigateur

    La préparation ici concerne uniquement les prérequis d'attachement local. Existing-session conserve les limites de routage Chrome MCP actuelles ; les routes avancées comme `responsebody`, l'exportation PDF, l'interception de téléchargement et les actions par lot nécessitent toujours un navigateur géré ou un profil CDP brut.

    Cette vérification ne s'applique **pas** à Docker, sandbox, remote-browser ou d'autres flux sans interface (headless). Ceux-ci continuent d'utiliser CDP brut.

  </Accordion>
  <Accordion title="2d. OAuth TLS prerequisites">
    Lorsqu'un profil OAuth OpenAI Codex est configuré, le docteur sonde le point de terminaison d'autorisation OpenAI pour vérifier que la pile TLS locale Node/OpenSSL peut valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificat expiré ou auto-signé), le docteur imprime des instructions de correction spécifiques à la plateforme. Sur macOS avec un Node installé via Homebrew, la correction est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute même si la passerelle est saine.
  </Accordion>
  <Accordion title="2e. Codex OAuth provider overrides">
    Si vous avez précédemment ajouté des paramètres de transport hérités OpenAI sous `models.providers.openai-codex`, ils peuvent masquer le chemin du fournisseur OAuth Codex intégré que les versions plus récentes utilisent automatiquement. Le docteur avertit lorsqu'il détecte ces anciens paramètres de transport en plus de Codex OAuth afin que vous puissiez supprimer ou réécrire l'ancienne substitution de transport et récupérer le comportement de routage/secours intégré. Les proxies personnalisés et les substitutions d'en-têtes uniquement sont toujours pris en charge et ne déclenchent pas cet avertissement.
  </Accordion>
  <Accordion title="2f. Avertissements de route du plugin Codex">
    Lorsque le plugin Codex groupé est activé, doctor vérifie également si les références de modèle principal `openai-codex/*` se résolvent toujours via le runner PI par défaut. Cette combinaison est valide lorsque vous souhaitez l'authentification par abonnement/OAuth Codex via PI, mais elle est facile à confondre avec le harnais app-server natif de Codex. Doctor avertit et pointe vers la forme explicite de app-server : `openai/*` plus `agentRuntime.id: "codex"` ou `OPENCLAW_AGENT_RUNTIME=codex`.

    Doctor ne répare pas cela automatiquement car les deux routes sont valides :

    - `openai-codex/*` + PI signifie « utiliser l'authentification par abonnement/OAuth Codex via le runner OpenClaw normal. »
    - `openai/*` + `runtime: "codex"` signifie « exécuter le tour intégré via le app-server natif de Codex. »
    - `/codex ...` signifie « contrôler ou lier une conversation Codex native depuis le chat. »
    - `/acp ...` ou `runtime: "acp"` signifie « utiliser l'adaptateur ACP/acpx externe. »

    Si l'avertissement apparaît, choisissez la route que vous aviez prévue et modifiez la configuration manuellement. Gardez l'avertissement tel quel lorsque l'OAuth Codex PI est intentionnel.

  </Accordion>
  <Accordion title="3. Migrations d'état héritées (structure du disque)">
    Doctor peut migrer les structures de disque plus anciennes vers la structure actuelle :

    - Magasin de sessions + transcriptions :
      - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
    - Répertoire de l'agent :
      - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
    - État d'authentification WhatsApp (Baileys) :
      - de l'ancien `~/.openclaw/credentials/*.json` (à l'exception de `oauth.json`)
      - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

    Ces migrations sont effectuées au mieux et sont idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités en tant que sauvegardes. La Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage, afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp n'est migrée intentionnellement que via `openclaw doctor`. La normalisation du fournisseur de discussion/fournisseur-map compare désormais par égalité structurelle, les différences basées uniquement sur l'ordre des clés ne déclenchent donc plus de modifications `doctor --fix` répétitives sans effet.

  </Accordion>
  <Accordion title="3a. Migrations de manifeste de plugin héritées">
    Doctor analyse tous les manifestes de plugins installés pour les clés de capacité de niveau supérieur obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'elles sont trouvées, il propose de les déplacer vers l'objet `contracts` et de réécrire le fichier manifeste sur place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.
  </Accordion>
  <Accordion title="3b. Migrations du magasin cron hérité">
    Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de substitution) pour détecter les anciens formats de tâches que le planificateur accepte toujours par souci de compatibilité.

    Les nettoyages cron actuels incluent :

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - champs de payload de premier niveau (`message`, `model`, `thinking`, ...) → `payload`
    - champs de livraison de premier niveau (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de livraison `provider` du payload → `delivery.channel` explicite
    - tâches de secours webhook `notify: true` héritées simples → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

    Doctor ne migre automatiquement les tâches `notify: true` que s'il peut le faire sans modifier le comportement. Si une tâche combine le secours de notification hérité avec un mode de livraison autre que webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

  </Accordion>
  <Accordion title="3c. Nettoyage du verrou de session">
    Doctor analyse chaque répertoire de session d'agent à la recherche de fichiers de verrouillage d'écriture obsolètes — des fichiers laissés lorsqu'une session s'est terminée de manière anormale. Pour chaque fichier de verrouillage trouvé, il signale : le chemin, le PID, si le PID est toujours actif, l'âge du verrou et s'il est considéré comme obsolète (PID mort ou âgé de plus de 30 minutes). En mode `--fix` / `--repair`, il supprime automatiquement les fichiers de verrouillage obsolètes ; sinon, il imprime une note et vous invite à réexécuter avec `--fix`.
  </Accordion>
  <Accordion title="3d. Réparation de la branche du transcript de session">
    Doctor analyse les fichiers JSONL de session d'agent pour la forme de branche dupliquée créée par le bug de réécriture du transcript de prompt du 2026.4.24 : un tour utilisateur abandonné avec le contexte d'exécution interne OpenClaw plus un frère actif contenant le même prompt utilisateur visible. En mode `--fix` / `--repair`, doctor sauvegarde chaque fichier affecté à côté de l'original et réécrit le transcript vers la branche active afin que l'historique et les lecteurs de mémoire de la passerelle ne voient plus les tours en double.
  </Accordion>
  <Accordion title="4. Vérifications de l'intégrité de l'état (persistance de session, routage et sécurité)">
    Le répertoire d'état est le centre opérationnel. S'il disparaît, vous perdez les sessions, les identifiants, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

    Doctor vérifie :

    - **Répertoire d'état manquant** : avertit d'une perte catastrophique d'état, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
    - **Autorisations du répertoire d'état** : vérifie la possibilité d'écriture ; propose de réparer les autorisations (et émet un indice `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
    - **Répertoire d'état synchronisé par le cloud sur macOS** : avertit lorsque l'état se résout sous iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes et des conflits de verrouillage/synchronisation.
    - **Répertoire d'état sur SD ou eMMC Linux** : avertit lorsque l'état se résout vers une source de montage `mmcblk*`, car les E/S aléatoires sur SD ou eMMC peuvent être plus lentes et s'user plus rapidement sous les écritures de session et d'identifiants.
    - **Répertoires de session manquants** : `sessions/` et le répertoire de stockage des sessions sont requis pour conserver l'historique et éviter les plantages `ENOENT`.
    - **Inadéquation des transcriptions** : avertit lorsque les entrées de session récentes ont des fichiers de transcription manquants.
    - **Session principale « 1-ligne JSONL »** : signale lorsque la transcription principale n'a qu'une seule ligne (l'historique ne s'accumule pas).
    - **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent dans les répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut être divisé entre les installations).
    - **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter sur l'hôte distant (l'état s'y trouve).
    - **Autorisations du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est lisible par le groupe/le monde et propose de le resserrer à `600`.

  </Accordion>
  <Accordion title="5. Santé de l'authentification du modèle (expiration OAuth)">
    Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons sont sur le point d'expirer ou expirés, et peut les actualiser lorsque c'est sûr. Si le profil OAuth/jeton Anthropic est périmé, il suggère une clé API Anthropic ou le chemin du jeton de configuration (setup-token) Anthropic. Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive` ignore les tentatives d'actualisation.

    Lorsqu'une actualisation OAuth échoue de manière permanente (par exemple `refresh_token_reused`, `invalid_grant`, ou un fournisseur vous demandant de vous reconnecter), doctor signale qu'une réauthentification est requise et imprime la commande exacte `openclaw models auth login --provider ...` à exécuter.

    Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

    - courts temps de recharge (limites de délai/délais d'attente/échecs d'authentification)
    - désactivations plus longues (échecs de facturation/crédit)

  </Accordion>
  <Accordion title="6. Validation du modèle de Hooks">
    Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au catalogue et à la liste d'autorisation (allowlist) et avertit lorsqu'elle ne peut pas être résolue ou n'est pas autorisée.
  </Accordion>
  <Accordion title="7. Réparation de l'image Sandbox">
    Lorsque la mise en bac à sable (sandboxing) est activée, doctor vérifie les images Docker et propose de les construire ou de passer aux noms hérités si l'image actuelle est manquante.
  </Accordion>
  <Accordion title="7b. Dépendances d'exécution des plugins groupés">
    Doctor vérifie les dépendances d'exécution uniquement pour les plugins groupés actifs dans la configuration actuelle ou activés par défaut via leur manifeste groupé, par exemple `plugins.entries.discord.enabled: true`, `channels.discord.enabled: true` hérité, ou un fournisseur groupé activé par défaut. S'il en manque, Doctor signale les packages et les installe en mode `openclaw doctor --fix` / `openclaw doctor --repair`. Les plugins externes utilisent toujours `openclaw plugins install` / `openclaw plugins update` ; Doctor n'installe pas les dépendances pour des chemins de plugins arbitraires.

    Pendant la réparation de Doctor, les installations npm des dépendances d'exécution groupées signalent la progression via un indicateur rotatif dans les sessions TTY et une progression périodique par ligne dans la sortie redirigée/sans interface. Le Gateway et la CLI locale peuvent également réparer les dépendances d'exécution des plugins groupés actifs à la demande avant d'importer un plugin groupé. Ces installations sont limitées à la racine d'installation du runtime du plugin, s'exécutent avec les scripts désactivés, n'écrivent pas de fichier de verrouillage de package, et sont protégées par un verrou de racine d'installation afin que les démarrages simultanés de la CLI ou du npm Gateway ne modifient pas le même arbre `node_modules` en même temps.

  </Accordion>
  <Accordion title="8. Migrations de service Gateway et conseils de nettoyage">
    Doctor détecte les services de passerelle hérités (launchd/systemd/schtasks) et propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle actuel. Il peut également rechercher des services supplémentaires de type passerelle et imprimer des conseils de nettoyage. Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas signalés comme « supplémentaires ».

    Sur Linux, si le service de passerelle au niveau de l'utilisateur est manquant mais qu'un service de passerelle OpenClaw au niveau du système existe, Doctor n'installe pas automatiquement un deuxième service au niveau de l'utilisateur. Inspectez avec `openclaw gateway status --deep` ou `openclaw doctor --deep`, puis supprimez le doublon ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un superviseur système possède le cycle de vie de la passerelle.

  </Accordion>
  <Accordion title="8b. Migration Matrix au démarrage">
    Lorsqu'un compte de channel Matrix dispose d'une migration d'état héritée en attente ou actionnable, doctor (en mode `--fix` / `--repair`) crée un instantané de pré-migration, puis exécute les étapes de migration de meilleure tentative : migration d'état Matrix hérité et préparation de l'état chiffré hérité. Ces deux étapes ne sont pas fatales ; les erreurs sont journalisées et le démarrage se poursuit. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification est entièrement ignorée.
  </Accordion>
  <Accordion title="8c. Dérive de l'appareillage et de l'authentification">
    Doctor inspecte désormais l'état d'appareillage dans le cadre du contrôle de santé normal.

    Ce qu'il signale :

    - demandes de premier appareillage en attente
    - mises à niveau de rôle en attente pour les appareils déjà appareillés
    - mises à niveau de portée en attente pour les appareils déjà appareillés
    - réparations de discordance de clé publique où l'identifiant de l'appareil correspond toujours mais l'identité de l'appareil ne correspond plus à l'enregistrement approuvé
    - enregistrements appareillés manquant un jeton actif pour un rôle approuvé
    - jetons appareillés dont les portées dérivent en dehors de la base de référence d'appareillage approuvée
    - entrées de jeton d'appareil mises en cache localement pour la machine actuelle qui datent d'avant une rotation de jeton côté passerelle ou portent des métadonnées de portée obsolètes

    Doctor n'approuve pas automatiquement les demandes d'appareillage et ne fait pas tourner automatiquement les jetons d'appareil. Il imprime plutôt les étapes suivantes exactes :

    - inspecter les demandes en attente avec `openclaw devices list`
    - approuver la demande exacte avec `openclaw devices approve <requestId>`
    - faire tourner un nouveau jeton avec `openclaw devices rotate --device <deviceId> --role <role>`
    - supprimer et réapprouver un enregistrement obsolète avec `openclaw devices remove <deviceId>`

    Cela comble le problème courant « déjà appareillé mais nécessitant toujours un appareillage » : doctor distingue désormais le premier appareillage des mises à niveau de rôle/portée en attente et de la dérive des jetons/identité d'appareil obsolètes.

  </Accordion>
  <Accordion title="9. Avertissements de sécurité">
    Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou lorsqu'une stratégie est configurée de manière dangereuse.
  </Accordion>
  <Accordion title="10. persistance systemd (Linux)">
    S'il est exécuté en tant que service utilisateur systemd, doctor vérifie que la persistance est activée pour que la passerelle reste active après la déconnexion.
  </Accordion>
  <Accordion title="11. État de l'espace de travail (compétences, plugins et répertoires hérités)">
    Doctor affiche un résumé de l'état de l'espace de travail pour l'agent par défaut :

    - **État des compétences** : compte les compétences éligibles, celles dont il manque des prérequis et celles bloquées par la liste d'autorisation.
    - **Répertoires d'espace de travail hérités** : avertit lorsque `~/openclaw` ou d'autres répertoires d'espace de travail hérités existent aux côtés de l'espace de travail actuel.
    - **État des plugins** : compte les plugins activés/désactivés/erreur ; répertorie les ID des plugins pour toute erreur ; signale les capacités des plugins groupés.
    - **Avertissements de compatibilité des plugins** : signale les plugins qui ont des problèmes de compatibilité avec l'environnement d'exécution actuel.
    - **Diagnostics des plugins** : expose les avertissements ou erreurs de chargement émis par le registre des plugins.

  </Accordion>
  <Accordion title="11b. Taille du fichier d'amorçage">
    Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`, `CLAUDE.md` ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget de caractères configuré. Il signale les nombres de caractères bruts par rapport aux caractères injectés par fichier, le pourcentage de troncation, la cause de la troncation (`max/file` ou `max/total`) et le total des caractères injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches de la limite, doctor affiche des conseils pour régler `agents.defaults.bootstrapMaxChars` et `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Nettoyage du plugin de canal obsolète">
    Lorsque `openclaw doctor --fix` supprime un plugin de canal manquant, il supprime également la configuration délimitée au canal qui référençait ce plugin : entrées `channels.<id>`, cibles de battement de cœur nommant le canal et remplacements `agents.*.models["<channel>/*"]`. Cela empêche les boucles de démarrage de Gateway où l'exécution du canal a disparu mais la configuration demande toujours à la passerelle de s'y lier.
  </Accordion>
  <Accordion title="11c. Complétion du shell">
    Doctor vérifie si la complétion par tabulation est installée pour le shell actuel (zsh, bash, fish ou PowerShell) :

    - Si le profil du shell utilise un modèle de complétion dynamique lent (`source <(openclaw completion ...)`), doctor le met à niveau vers la variante de fichier en cache plus rapide.
    - Si la complétion est configurée dans le profil mais que le fichier cache est manquant, doctor régénère le cache automatiquement.
    - Si aucune complétion n'est configurée du tout, doctor propose de l'installer (mode interactif uniquement ; ignoré avec `--non-interactive`).

    Exécutez `openclaw completion --write-state` pour régénérer le cache manuellement.

  </Accordion>
  <Accordion title="12. Vérifications d'auth du Gateway (jeton local)">
    Doctor vérifie la préparation de l'auth par jeton local du Gateway.

    - Si le mode jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
    - Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas en texte clair.
    - `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

  </Accordion>
  <Accordion title="12b. Réparations conscientes de SecretRef en lecture seule">
    Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide à l'exécution.

    - `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
    - Exemple : la réparation `allowFrom` / `groupAllowFrom` `@username` du bot Telegram tente d'utiliser les informations d'identification du bot configurées si elles sont disponibles.
    - Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que l'information d'identification est configurée mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le jeton comme manquant.

  </Accordion>
  <Accordion title="13. Vérification de santé du Gateway + redémarrage">
    Doctor exécute une vérification de santé et propose de redémarrer la passerelle lorsqu'elle semble malsaine.
  </Accordion>
  <Accordion title="13b. État de préparation de la recherche mémoire">
    Doctor vérifie si le fournisseur d'intégration de recherche mémoire configuré est prêt pour l'agent par défaut. Le comportement dépend du backend et du fournisseur configurés :

    - **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable. Dans le cas contraire, il imprime des conseils de réparation, y compris le package npm et une option de chemin binaire manuel.
    - **Fournisseur local explicite** : vérifie la présence d'un fichier de modèle local ou d'une URL de modèle distante/reconnaissable/téléchargeable. Si absent, suggère de passer à un fournisseur distant.
    - **Fournisseur distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est présente dans l'environnement ou le magasin d'authentification. Imprime des conseils de réparation exploitables si elle est manquante.
    - **Fournisseur automatique** : vérifie d'abord la disponibilité du modèle local, puis essaie chaque fournisseur distant dans l'ordre de sélection automatique.

    Lorsqu'un résultat de sonde de passerelle en cache est disponible (la passerelle était en bonne santé au moment de la vérification), le doctor effectue un rapprochement de son résultat avec la configuration visible par la CLI et note toute divergence. Le doctor ne lance pas de nouveau ping d'intégration sur le chemin par défaut ; utilisez la commande de statut de mémoire approfondie lorsque vous souhaitez une vérification en direct du fournisseur.

    Utilisez `openclaw memory status --deep` pour vérifier l'état de préparation de l'intégration lors de l'exécution.

  </Accordion>
  <Accordion title="14. Avertissements de statut de canal">
    Si la passerelle est en bonne santé, le doctor exécute une sonde de statut de canal et signale les avertissements avec des corrections suggérées.
  </Accordion>
  <Accordion title="15. Audit et réparation de la configuration du superviseur">
    Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour détecter les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances network-online de systemd et le délai de redémarrage). Lorsqu'il détecte une inadéquation, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

    Notes :

    - `openclaw doctor` demande confirmation avant de réécrire la configuration du superviseur.
    - `openclaw doctor --yes` accepte les invites de réparation par défaut.
    - `openclaw doctor --repair` applique les corrections recommandées sans confirmation.
    - `openclaw doctor --repair --force` écrase les configurations de superviseur personnalisées.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` maintient doctor en lecture seule pour le cycle de vie du service de passerelle. Il signale toujours l'état de santé du service et exécute les réparations non liées aux services, mais ignore l'installation, le démarrage, le redémarrage, l'amorçage (bootstrap) du service, la réécriture de la configuration du superviseur et le nettoyage des services hérités, car un superviseur externe possède ce cycle de vie.
    - Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, la réparation/installation du service doctor valide le SecretRef mais ne conserve pas les valeurs de jeton en texte clair résolues dans les métadonnées d'environnement du service du superviseur.
    - Doctor détecte les valeurs d'environnement de service gérées `.env`/backées par SecretRef que les anciennes installations LaunchAgent, systemd ou Tâche planifiée Windows intégraient en ligne et réécrit les métadonnées du service afin que ces valeurs soient chargées depuis la source d'exécution au lieu de la définition du superviseur.
    - Doctor détecte lorsque la commande de service épingle toujours un ancien `--port` après les modifications `gateway.port` et réécrit les métadonnées du service vers le port actuel.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré n'est pas résolu, doctor bloque le chemin d'installation/réparation avec des conseils exploitables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
    - Pour les unités utilisateur-systemd Linux, les contrôles de dérive de jeton du doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
    - Les réparations de service du doctor refusent de réécrire, d'arrêter ou de redémarrer un service de passerelle à partir d'un binaire OpenClaw plus ancien lorsque la configuration a été écrite pour la dernière fois par une version plus récente. Voir [Dépannage Gateway](/fr/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Diagnostics du runtime et du port de la Gateway">
    Doctor inspecte le runtime du service (PID, dernier statut de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de ports sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).
  </Accordion>
  <Accordion title="17. Bonnes pratiques du runtime de la Gateway">
    Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou sur un chemin Node géré par un gestionnaire de versions (`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp et Telegram nécessitent Node, et les chemins des gestionnaires de versions peuvent cesser de fonctionner après les mises à niveau car le service ne charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node si elle est disponible (Homebrew/apt/choco).
  </Accordion>
  <Accordion title="18. Écriture de la configuration + métadonnées de l'assistant">
    Doctor conserve toutes les modifications de configuration et ajoute des métadonnées de l'assistant pour enregistrer l'exécution de doctor.
  </Accordion>
  <Accordion title="19. Conseils d'espace de travail (sauvegarde + système de mémoire)">
    Doctor suggère un système de mémoire pour l'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

    Consultez [/concepts/agent-workspace](/fr/concepts/agent-workspace) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (GitHub ou GitLab privé recommandé).

  </Accordion>
</AccordionGroup>

## Connexes

- [Guide opérationnel de la Gateway](/fr/gateway)
- [Dépannage de la Gateway](/fr/gateway/troubleshooting)

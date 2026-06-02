---
summary: "Commande Doctor : vérifications de santé, migrations de configuration et étapes de réparation"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` est l'outil de réparation et de migration pour OpenClaw. Il corrige les configurations/états obsolètes, vérifie la santé et fournit des étapes de réparation actionnables.

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

    Accepter les valeurs par défaut sans invitation (y compris les étapes de réparation de redémarrage/service/sandbox lorsque applicable).

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    Appliquer les réparations recommandées sans invitation (réparations + redémarrages lorsque c'est sûr).

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    Exécuter des vérifications de santé structurées pour l'automatisation CI ou pré-vol. Ce mode est
    en lecture seule : il n'invite pas, ne répare pas, ne migre pas la configuration, ne redémarre pas les services ou
    ne touche pas à l'état.

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    Appliquer également des réparations agressives (écrase les configurations de superviseur personnalisées).

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    Exécuter sans invites et n'appliquer que les migrations sûres (normalisation de la configuration + déplacements d'état sur disque). Ignore les actions de redémarrage/service/sandbox nécessitant une confirmation humaine. Les migrations d'état héritées s'exécutent automatiquement lorsqu'elles sont détectées.

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    Rechercher dans les services système les installations de passerelle supplémentaires (launchd/systemd/schtasks).

  </Tab>
</Tabs>

Si vous souhaitez examiner les modifications avant l'écriture, ouvrez d'abord le fichier de configuration :

```bash
cat ~/.openclaw/openclaw.json
```

## Mode lint en lecture seule

`openclaw doctor --lint` est le frère adapté à l'automatisation de
`openclaw doctor --fix`. Les deux utilisent les vérifications de santé du doctor, mais leur posture est
différente :

| Mode                     | Invites | Écrit la config/l'état                | Sortie                          | Utilisation                            |
| ------------------------ | ------- | ------------------------------------- | ------------------------------- | -------------------------------------- |
| `openclaw doctor`        | oui     | non                                   | rapport de santé convivial      | un humain vérifiant le statut          |
| `openclaw doctor --fix`  | parfois | oui, avec une politique de réparation | journal de réparation convivial | application des réparations approuvées |
| `openclaw doctor --lint` | non     | non                                   | résultats structurés            | CI, pré-vol et portes de révision      |

Les contrôles de santé modernisés peuvent fournir une implémentation `repair()` facultative.
`doctor --fix` applique ces réparations lorsqu'elles existent et continue à utiliser le
flux de réparation doctor existant pour les contrôles qui n'ont pas encore été migrés.
Le contrat de réparation structuré sépare également le signalement des réparations de la détection :
`detect()` signale les résultats actuels, tandis que `repair()` peut signaler des modifications,
les différences de configuration/fichier et les effets secondaires hors fichier. Cela permet de garder la voie de migration ouverte
pour les futurs `doctor --fix --dry-run` et la sortie de différences sans obliger les contrôles de lint
à planifier des mutations.

Exemples :

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

La sortie JSON inclut :

- `ok` : indique si un résultat visible a atteint le seuil de gravité sélectionné
- `checksRun` : nombre de contrôles de santé exécutés
- `checksSkipped` : contrôles ignorés par `--only` ou `--skip`
- `findings` : diagnostics structurés avec `checkId`, `severity`, `message` et
  facultatif `path`, `line`, `column`, `ocPath`, et `fixHint`

Codes de sortie :

- `0` : aucun résultat au niveau ou au-dessus du seuil sélectionné
- `1` : un ou plusieurs résultats ont atteint le seuil sélectionné
- `2` : échec de la commande/à l'exécution avant que les résultats du lint ne puissent être émis

Utilisez `--severity-min info|warning|error` pour contrôler à la fois ce qui est imprimé et ce qui
provoque une sortie de lint non nulle. Utilisez `--only <id>` pour des portes de pré-vol étroites et
`--skip <id>` pour exclure temporairement une vérification bruyante tout en gardant le reste de
l'exécution du lint actif.
Les options de sortie de lint telles que `--json`, `--severity-min`, `--only` et `--skip`
doivent être associées à `--lint` ; les exécutions régulières du docteur et des réparations les rejettent.

## Ce qu'il fait (résumé)

<AccordionGroup>
  <Accordion title="Santé, interface utilisateur et mises à jour">
    - Mise à jour préalable facultative pour les installations git (mode interactif uniquement).
    - Vérification de la fraîcheur du protocole d'interface (reconstruit l'interface de contrôle lorsque le schéma du protocole est plus récent).
    - Vérification de la santé + invite de redémarrage.
    - Résumé de l'état des Skills (éligibles/manquantes/bloquées) et état des plugins.

  </Accordion>
  <Accordion title="Config and migrations">
    - Normalisation de la configuration pour les valeurs héritées.
    - Migration de la configuration Talk des champs `talk.*` plats hérités vers `talk.provider` + `talk.providers.<provider>`.
    - Vérifications de migration du navigateur pour les configurations d'extensions Chrome héritées et la préparation de Chrome MCP.
    - Avertissements de remplacement du fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
    - Migration de fournisseur/profil Codex OpenAI hérité (`openai-codex` → `openai`) et avertissements de masquage pour `models.providers.openai-codex` obsolètes.
    - Vérification des prérequis TLS OAuth pour les profils OpenAI OAuth Codex OAuth.
    - Avertissements de liste d'autorisation (allowlist) de plugin/tool lorsque `plugins.allow` est restrictif mais que la stratégie de tool demande toujours des outils génériques ou détenus par des plugins.
    - Migration de l'état sur disque hérité (sessions/répertoire agent/auth WhatsApp).
    - Migration de clé de contrat de manifeste de plugin hérité (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migration de magasin cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de niveau supérieur, payload `provider`, tâches de secours webhook simples `notify: true`).
    - Nettoyage de la stratégie d'exécution (runtime-policy) globale de l'agent hérité ; la stratégie d'exécution provider/model est le sélecteur de route actif.
    - Nettoyage de la configuration de plugin obsolète lorsque les plugins sont activés ; lorsque `plugins.enabled=false`, les références de plugin obsolètes sont traitées comme une configuration de confinement inerte et sont conservées.

  </Accordion>
  <Accordion title="État et intégrité">
    - Inspection du fichier de verrouillage de session et nettoyage des verrous obsolètes.
    - Réparation des transcriptions de session pour les branches de réécriture de prompt dupliquées créées par les versions affectées du 24/04/2026.
    - Détection des pierres tombales de redémarrage-récupération de sous-agent bloqué, avec `--fix` pour effacer les indicateurs obsolètes de récupération abandonnée afin que le démarrage ne continue pas à traiter l'enfant comme abandonné lors du redémarrage.
    - Contrôles d'intégrité et d'autorisation de l'état (sessions, transcriptions, répertoire d'état).
    - Contrôles des autorisations du fichier de configuration (chmod 600) lors d'une exécution locale.
    - Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de refroidissement/désactivation du profil d'authentification.
    - Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).

  </Accordion>
  <Accordion title="GatewayGateway, services and supervisors"Matrix>
    - Réparation de l'image Sandbox lorsque le sandboxing est activé.
    - Migration des services hérités et détection de passerelles supplémentaires.
    - Migration de l'état hérité du channel Matrix (en mode `--fix` / `--repair`Gateway).
    - Vérifications de l'exécution de la passerelle (service installé mais non exécuté ; label launchd mis en cache).
    - Avertissements de l'état du channel (sondés à partir de la passerelle en cours d'exécution).
    - Les vérifications d'autorisation spécifiques au canal se trouvent sous `openclaw channels capabilities`Discord ; par exemple, les autorisations du canal vocal Discord sont auditées avec `openclaw channels capabilities --channel discord --target channel:<channel-id>`WhatsAppGatewayTUI.
    - Vérifications de réactivité de WhatsApp pour une santé dégradée de la boucle d'événements de la passerelle alors que les clients TUI locaux sont toujours en cours d'exécution ; `--fix`TUI n'arrête que les clients TUI locaux vérifiés.
    - Réparation des routes Codex pour les références de model héritées `openai-codex/*` dans les modèles principaux, les solutions de repli, les modèles de génération d'images/vidéos, les substitutions de battement de cœur/sous-agent/compactage, les hooks, les substitutions de model de channel et les épingles de route de session ; `--fix` les réécrit en `openai/*`, migre les profils/ordres d'auth `openai-codex:*` vers `openai:*`OpenAI, supprime les épingles d'exécution de session/agent entier obsolètes et laisse des références d'agent OpenAI canoniques sur le harnais Codex par défaut.
    - Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
    - Nettoyage de l'environnement de proxy intégré pour les services de passerelle qui ont capturé les valeurs shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`GatewayBunGateway lors de l'installation ou de la mise à jour.
    - Vérifications des meilleures pratiques d'exécution de la passerelle (Node vs Bun, chemins du gestionnaire de versions).
    - Diagnostics des collisions de ports de passerelle (`18789` par défaut).

  </Accordion>
  <Accordion title="Authentification, sécurité et appariement"Gateway>
    - Avertissements de sécurité pour les politiques DM ouvertes.
    - Vérifications d'authentification de la Gateway pour le mode de jeton local (propose la génération de jeton lorsqu'aucune source de jeton n'existe ; ne remplace pas les configurations SecretRef de jeton).
    - Détection des problèmes d'appareil (demandes de premier appariement en attente, mises à niveau de rôle/portée en attente, dérive du cache du jeton d'appareil local périmé et dérive d'authentification de l'enregistrement apparié).

  </Accordion>
  <Accordion title="Espace de travail et shell">
    - Vérification de la persistance systemd sur Linux.
    - Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncation/proche de la limite pour les fichiers de contexte).
    - Vérification de la disponibilité des compétences pour l'agent par défaut ; signale les compétences autorisées dont les binaires, les variables d'environnement, la configuration ou les exigences OS sont manquants, et `--fix` peut désactiver les compétences indisponibles dans `skills.entries`.
    - Vérification de l'état de la complétion du shell et installation/mise à niveau automatique.
    - Vérification de la disponibilité du fournisseur d'embeddings pour la recherche mémoire (modèle local, clé API distante, ou binaire QMD).
    - Vérifications de l'installation source (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
    - Écrit la configuration mise à jour + les métadonnées de l'assistant.

  </Accordion>
</AccordionGroup>

## Remplissage (backfill) et réinitialisation de Dreams UI

La scène Dreams de l'interface de contrôle Control UI comprend les actions **Backfill** (Remplissage), **Reset** (Réinitialisation) et **Clear Grounded** (Effacer Grounded) pour le workflow de rêve ancré (grounded dreaming). Ces actions utilisent des méthodes RPC de style docteur de passerelle, mais elles ne font **pas** partie de la réparation/migration du CLI `openclaw doctor`.

Ce qu'elles font :

- Le **Backfill** analyse les fichiers historiques `memory/YYYY-MM-DD.md` dans l'espace de travail actif, exécute la passe de journal REM ancrée, et écrit des entrées de remplissage réversibles dans `DREAMS.md`.
- Le **Reset** supprime uniquement ces entrées de journal de remplissage marquées de `DREAMS.md`.
- **Clear Grounded** supprime uniquement les entrées à court terme mises en scène et uniquement ancrées (grounded-only) provenant de la rediffusion historique et qui n'ont pas encore accumulé de rappel en direct ou de support quotidien.

Ce qu'elles ne font **pas** par elles-mêmes :

- ils ne modifient pas `MEMORY.md`
- elles n'exécutent pas les migrations complètes du docteur
- ils ne mettent pas automatiquement en scène les candidats ancrés dans le magasin de promotion à court terme en direct, sauf si vous exécutez explicitement d'abord le chemin de la CLI intermédiaire

Si vous souhaitez que la relecture historique ancrée influence la voie de promotion profonde normale, utilisez plutôt le flux CLI :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Cela met en scène les candidats durables ancrés dans le stockage de rêve à court terme tout en conservant `DREAMS.md` comme surface de révision.

## Comportement détaillé et justification

<AccordionGroup>
  <Accordion title="0. Mise à jour facultative (installations git)">
    S'il s'agit d'une extraction git et que doctor s'exécute de manière interactive, il propose de mettre à jour (fetch/rebase/build) avant d'exécuter doctor.
  </Accordion>
  <Accordion title="1. Normalisation de la configuration">
    Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction` sans une priorité spécifique au channel), doctor les normalise dans le schéma actuel.

    Cela inclut les champs plats hérités de Talk. La configuration publique actuelle de la parole Talk est `talk.provider` + `talk.providers.<provider>`, et la configuration vocale en temps réel est `talk.realtime.*`. Doctor réécrit les anciennes formes `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` dans la carte du provider, et réécrit les sélecteurs hérités de premier niveau en temps réel (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) en `talk.realtime`.

    Doctor avertit également lorsque `plugins.allow` n'est pas vide et que la stratégie de tool utilise des entrées de tool avec caractères génériques ou appartenant à des plugins. `tools.allow: ["*"]` ne correspond qu'aux tools des plugins qui sont réellement chargés ; il ne contourne pas la liste d'autorisation exclusive des plugins.

  </Accordion>
  <Accordion title="2. Migration des clés de configuration héritées">
    Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent d'exécuter `openclaw doctor`.

    Doctor va :

    - Expliquer quelles clés héritées ont été trouvées.
    - Afficher la migration qu'il a appliquée.
    - Réécrire `~/.openclaw/openclaw.json`Gateway avec le schéma mis à jour.

    Le démarrage du Gateway refuse les formats de configuration hérités et vous demande d'exécuter `openclaw doctor --fix` ; il ne réécrit pas `openclaw.json` au démarrage. Les migrations du magasin de tâches cron sont également gérées par `openclaw doctor --fix`.

    Migrations actuelles :

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → `bindings` de premier niveau
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` hérités → `talk.provider` + `talk.providers.<provider>`
    - sélecteurs Talk en temps réel de premier niveau hérités (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` et `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` et `messages.tts.providers.microsoft`
    - Champs de sélection du locateur TTS (`voice`/`voiceName`/`voiceId`) → `speakerVoice`/`speakerVoiceId`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` et `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` et `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - Pour les channels avec `accounts` nommé mais des valeurs de channel de premier niveau à compte unique résiduelles, déplacez ces valeurs délimitées au compte vers le compte promu choisi pour ce channel (`accounts.default`Matrix pour la plupart des channels ; Matrix peut conserver une cible nommée/défaut correspondante existante)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - supprimer `agents.defaults.llm` ; utiliser `models.providers.<id>.timeoutSeconds` pour les délais d'attente lents du provider/model, et garder le délai d'attente de l'agent/exécution au-dessus de cette valeur lorsque l'exécution entière doit durer plus longtemps
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)
    - `models.providers.*.api: "openai"` hérité → `"openai-completions"` (le démarrage de la passerelle ignore également les providers dont `api` est défini sur une valeur enum future ou inconnue au lieu d'échouer fermement)
    - supprimer `plugins.entries.codex.config.codexDynamicToolsProfile` ; le serveur d'application Codex garde toujours les outils de workspace natifs Codex natifs

    Les avertissements de Doctor incluent également des recommandations par défaut de compte pour les channels multi-comptes :

    - Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, doctor avertit que le routage de secours peut choisir un compte inattendu.
    - Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, doctor avertit et liste les IDs de compte configurés.

  </Accordion>
  <Accordion title="2b. Remplacements du fournisseur OpenCode">
    Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go` manuellement, cela remplace le catalogue intégré d'OpenCode provenant de `openclaw/plugin-sdk/llm`. Cela peut forcer les modèles vers une mauvaise API ou annuler les coûts. Doctor vous avertit afin que vous puissiez supprimer le remplacement et rétablir le routage et les coûts par modèle de l'API.
  </Accordion>
  <Accordion title="2c. Migration du navigateur et préparation de Chrome MCP">
    Si la configuration de votre navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, doctor la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

    - `browser.profiles.*.driver: "extension"` devient `"existing-session"`
    - `browser.relayBindHost` est supprimé

    Doctor audite également le chemin Chrome MCP hôte-local lorsque vous utilisez `defaultProfile: "user"` ou un profil configuré `existing-session` :

    - vérifie si Google Chrome est installé sur le même hôte pour les profils de connexion automatique par défaut
    - vérifie la version de Chrome détectée et avertit lorsqu'elle est inférieure à Chrome 144
    - vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` ou `edge://inspect/#remote-debugging`)

    Doctor ne peut pas activer le paramètre côté Chrome pour vous. Chrome MCP hôte-local nécessite toujours :

    - un navigateur basé sur Chromium 144+ sur l'hôte de la passerelle/du nœud
    - le navigateur exécuté localement
    - le débogage à distance activé dans ce navigateur
    - l'approbation de la première invite de consentement d'attachement dans le navigateur

    La préparation ici concerne uniquement les prérequis d'attachement local. Existing-session conserve les limites de routage Chrome MCP actuelles ; les routes avancées comme `responsebody`, l'exportation PDF, l'interception de téléchargement et les actions par lot nécessitent toujours un navigateur géré ou un profil CDP brut.

    Cette vérification ne s'applique **pas** au Docker, à l'environnement de bac à sable (sandbox), au navigateur distant ou à d'autres flux sans interface (headless). Ceux-ci continuent d'utiliser le CDP brut.

  </Accordion>
  <Accordion title="2d. Prérequis TLS OAuth">
    Lorsqu'un profil Codex OpenAI OAuth est configuré, le docteur sonde le point de terminaison d'autorisation OpenAI pour vérifier que la pile TLS Node/OpenSSL locale peut valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificat expiré ou auto-signé), le docteur affiche des instructions de correction spécifiques à la plateforme. Sur macOS avec un Node installé via Homebrew, la correction est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute même si la passerelle est saine.
  </Accordion>
  <Accordion title="OAuth2e. Remplacements de fournisseur OAuth Codex">
    Si vous avez précédemment ajouté des paramètres de transport OpenAI hérités sous `models.providers.openai-codex`OAuthOAuth, ils peuvent masquer le chemin du fournisseur OAuth Codex intégré que les nouvelles versions utilisent automatiquement. Le docteur avertit lorsqu'il détecte ces anciens paramètres de transport avec OAuth Codex afin que vous puissiez supprimer ou réécrire le remplacement de transport obsolète et récupérer le comportement de routage/secours intégré. Les proxies personnalisés et les remplacements d'en-têtes uniquement sont toujours pris en charge et ne déclenchent pas cet avertissement.
  </Accordion>
  <Accordion title="2f. Réparation de l'acheminement Codex">
    Doctor vérifie les références de modèle `openai-codex/*` héritées. L'acheminement natif du harnais Codex utilise des références de modèle canoniques `openai/*` ; les tours d'agent OpenAI passent par le harnais du serveur d'application Codex au lieu du chemin du fournisseur OpenClaw OpenAI.

    En mode `--fix` / `--repair`, le docteur réécrit les références de l'agent par défaut et par agent affectées, y compris les modèles principaux, les replis, les modèles de génération d'images/vidéos, les substitutions de battement de cœur/sous-agent/compactage, les hooks, les substitutions de modèle de canal et l'état d'acheminement de session persistant obsolète :

    - `openai-codex/gpt-*` devient `openai/gpt-*`.
    - L'intention Codex passe aux entrées `agentRuntime.id: "codex"` délimitées au fournisseur/modèle pour les références de modèle d'agent réparées.
    - La configuration d'exécution de l'agent complet obsolète et les épingles d'exécution de session persistante sont supprimées car la sélection d'exécution est délimitée au fournisseur/modèle.
    - La stratégie d'exécution existante du fournisseur/modèle est conservée, sauf si la référence de modèle hérité réparée nécessite un acheminement Codex pour conserver l'ancien chemin d'authentification.
    - Les listes de repli de modèles existantes sont conservées avec leurs entrées héritées réécrites ; les paramètres copiés par modèle passent de la clé héritée à la clé canonique `openai/*`.
    - La session persistante `modelProvider`/`providerOverride`, `model`/`modelOverride`, les avis de repli et les épingles de profil d'authentification sont réparés dans tous les magasins de sessions d'agent découverts.
    - `/codex ...` signifie « contrôler ou lier une conversation Codex native depuis le chat ».
    - `/acp ...` ou `runtime: "acp"` signifie « utiliser l'adaptateur externe ACP/acpx ».

  </Accordion>
  <Accordion title="2g. Nettoyage de la route de session">
    Doctor analyse également les magasins de sessions d'agent découverts pour détecter l'état de route auto-créé obsolète après avoir déplacé des modèles configurés ou l'exécution (runtime) loin d'une route détenue par un plugin telle que Codex.

    `openclaw doctor --fix` peut effacer l'état obsolète auto-créé tel que les épingles de modèle `modelOverrideSource: "auto"`CLI, les métadonnées de modèle d'exécution, les identifiants de harnais épinglés, les liaisons de session CLI, et les remplacements automatiques de profil d'authentification lorsque leur route propriétaire n'est plus configurée. Les choix explicites de modèle de session utilisateur ou hérités sont signalés pour examen manuel et laissés intouchés ; changez-les avec `/model ...`, `/new`, ou réinitialisez la session lorsque cette route n'est plus prévue.

  </Accordion>
  <Accordion title="3. Migrations d'état hérité (disposition disque)">
    Doctor peut migrer les dispositions sur disque plus anciennes vers la structure actuelle :

    - Magasin de sessions + transcriptions :
      - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
    - Répertoire de l'agent :
      - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
    - État d'authentification WhatsApp (Baileys) :
      - de l'héritage `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
      - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

    Ces migrations sont de type « best-effort » (au mieux) et idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités derrière en tant que sauvegardes. Le Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp est intentionnellement migrée uniquement via `openclaw doctor`. La normalisation du fournisseur de conversation (Talk provider)/provider-map compare maintenant par égalité structurelle, de sorte que les diffs basés uniquement sur l'ordre des clés ne déclenchent plus de changements `doctor --fix` répétés sans effet.

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor analyse tous les manifestes de plugins installés pour rechercher des clés de fonctionnalité de niveau supérieur obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'elles sont trouvées, il propose de les déplacer dans l'objet `contracts` et de réécrire le fichier manifeste sur place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.
  </Accordion>
  <Accordion title="3b. Migrations de magasin cron héritées">
    Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de substitution) pour détecter les anciennes formes de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

    Les nettoyages cron actuels incluent :

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - champs de payload de premier niveau (`message`, `model`, `thinking`, ...) → `payload`
    - champs de livraison de premier niveau (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de livraison `provider` du payload → `delivery.channel` explicite
    - tâches de repli de webhook héritées simples `notify: true` → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

    Le Gateway nettoie également les lignes cron malformées au chargement pour que les tâches valides continuent de s'exécuter. Les lignes malformées brutes sont copiées vers `jobs-quarantine.json` à côté du magasin actif avant d'être supprimées de `jobs.json` ; doctor signale les lignes mises en quarantaine pour que vous puissiez les examiner ou les réparer manuellement.

    Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans modifier le comportement. Si une tâche combine un repli de notification hérité avec un mode de livraison non-webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

    Sur Linux, doctor avertit également lorsque la crontab de l'utilisateur appelle encore le `~/.openclaw/bin/ensure-whatsapp.sh` hérité. Ce script local à l'hôte n'est pas maintenu par OpenClaw actuel et peut écrire de faux messages `Gateway inactive` dans `~/.openclaw/logs/whatsapp-health.log` lorsque cron ne peut pas atteindre le bus utilisateur systemd. Supprimez l'entrée de crontab obsolète avec `crontab -e` ; utilisez `openclaw channels status --probe`, `openclaw doctor` et `openclaw gateway status` pour les vérifications de santé actuelles.

  </Accordion>
  <Accordion title="3c. Nettoyage des verrous de session"OpenClaw>
    Doctor analyse chaque répertoire de session d'agent pour détecter les fichiers de verrouillage d'écriture obsolètes — des fichiers laissés lorsqu'une session s'est terminée anormalement. Pour chaque fichier de verrou trouvé, il signale : le chemin, le PID, si le PID est toujours actif, l'âge du verrou et s'il est considéré comme obsolète (PID mort, métadonnées de propriétaire malformées, âgé de plus de 30 minutes, ou un PID actif dont on peut prouver qu'il appartient à un processus non-OpenClaw). En mode `--fix` / `--repair`OpenClawOpenClaw, il supprime automatiquement les verrous avec des propriétaires morts, orphelins, recyclés, malformés-anciens ou non-OpenClaw. Les anciens verrous qui appartiennent toujours à un processus OpenClaw actif sont signalés mais conservés en place pour que doctor ne coupe pas un enregistreur de transcription actif.
  </Accordion>
  <Accordion title="3d. Réparation de la branche de transcription de session"OpenClaw>
    Doctor analyse les fichiers JSONL de session d'agent pour détecter la forme de branche dupliquée créée par le bug de réécriture de la transcription des invites du 2026.4.24 : un tour d'utilisateur abandonné avec le contexte d'exécution interne OpenClaw plus un frère actif contenant la même invite utilisateur visible. En mode `--fix` / `--repair`, doctor sauvegarde chaque fichier affecté à côté de l'original et réécrit la transcription vers la branche active pour que les lecteurs d'historique et de mémoire de la passerelle ne voient plus les tours en double.
  </Accordion>
  <Accordion title="4. Vérifications de l'intégrité de l'état (persistance de la session, routage et sécurité)">
    Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez les sessions, les identifiants, les journaux et la configuration (à moins que vous n'ayez des sauvegardes ailleurs).

    Le médecin vérifie :

    - **Répertoire d'état manquant** : avertit d'une perte d'état catastrophique, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
    - **Permissions du répertoire d'état** : vérifie la capacité d'écriture ; propose de réparer les permissions (et émet une indication `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
    - **Répertoire d'état synchronisé par le cloud sur macOS** : avertit lorsque l'état se résout sous iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes et des conflits de verrouillage/synchronisation.
    - **Répertoire d'état sur carte SD ou eMMC Linux** : avertit lorsque l'état se résout vers une source de montage `mmcblk*`, car les E/S aléatoires sur carte SD ou eMMC peuvent être plus lentes et s'user plus rapidement sous les écritures de session et d'identifiants.
    - **Répertoires de session manquants** : `sessions/` et le répertoire de stockage de session sont requis pour conserver l'historique et éviter les plantages `ENOENT`.
    - **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des fichiers de transcription manquants.
    - **Session principale « 1-line JSONL »** : signale lorsque la transcription principale ne contient qu'une seule ligne (l'historique ne s'accumule pas).
    - **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent dans les répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut être divisé entre les installations).
    - **Rappel du mode distant** : si `gateway.mode=remote`, le médecin vous rappelle de l'exécuter sur l'hôte distant (l'état s'y trouve).
    - **Permissions du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est lisible par le groupe/le monde et propose de le resserrer à `600`.

  </Accordion>
  <Accordion title="OAuth5. Santé de l'authentification du modèle (expiration OAuth)"OAuthAnthropicOAuthAnthropicAPIAnthropic>
    Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons sont sur le point d'expirer ou expirés, et peut les actualiser lorsque cela est sûr. Si le profil OAuth/jeton Anthropic est obsolète, il suggère une clé API Anthropic ou le chemin du jeton de configuration (setup-token) Anthropic. Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive`OAuth ignore les tentatives d'actualisation.

    Lorsqu'une actualisation OAuth échoue de manière permanente (par exemple `refresh_token_reused`, `invalid_grant`, ou un provider vous demandant de vous reconnecter), doctor signale qu'une réauthentification est requise et imprime la commande exacte `openclaw models auth login --provider ...`OAuthmacOS à exécuter.

    Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

    - courts temps de recharge (limites de délai/temps d'attente/échecs d'authentification)
    - désactivations plus longues (échecs de facturation/crédit)

    Les profils OAuth Codex hérités dont les jetons résident dans le trousseau macOS (onboarding plus ancien avant la mise en page sidecar basée sur des fichiers) sont réparés uniquement par doctor. Exécutez `openclaw doctor --fix` une fois depuis un terminal interactif pour migrer les jetons hérités sauvegardés dans le trousseau directement vers `auth-profiles.json`TelegramOpenAIOAuth ; après cela, les tours intégrés (Telegram, cron, dispatch de sous-agent) les résolvent en tant que profils OAuth OpenAI canoniques.

  </Accordion>
  <Accordion title="6. Validation du modèle de Hooks">
    Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au catalogue et à la liste blanche (allowlist) et avertit lorsqu'elle ne pourra pas être résolue ou si elle n'est pas autorisée.
  </Accordion>
  <Accordion title="7. Réparation de l'image Sandbox"Docker>
    Lorsque la mise en bac à sable (sandboxing) est activée, doctor vérifie les images Docker et propose de les construire ou de passer aux noms hérités si l'image actuelle est manquante.
  </Accordion>
  <Accordion title="7b. Plugin install cleanup">
    Doctor supprime l'état de mise en zone de préparation des dépendances de plugin généré par l'ancien OpenClaw en mode `openclaw doctor --fix` / `openclaw doctor --repair`. Cela couvre les racines de dépendances générées obsolètes, les anciens répertoires de phase d'installation, les débris locaux de package provenant de l'ancien code de réparation des dépendances des plugins groupés, et les copies gérées orphelines ou récupérées de plugins groupés `@openclaw/*` par npm qui peuvent masquer le manifeste groupé actuel. Doctor lie également à nouveau le package hôte `openclaw` dans les plugins gérés par npm qui déclarent `peerDependencies.openclaw`, afin que les importations d'exécution locales de package telles que `openclaw/plugin-sdk/*` continuent à être résolues après les mises à jour ou les réparations npm.

    Doctor peut également réinstaller les plugins téléchargeables manquants lorsque la configuration y fait référence mais que le registre local de plugins ne peut pas les trouver. Les exemples incluent le matériau `plugins.entries`, les paramètres de canal/fournisseur/recherche configurés et les runtimes d'agent configurés. Lors des mises à jour de package, doctor évite d'exécuter la réparation du plugin de gestionnaire de package pendant que le package principal est en cours d'échange ; exécutez `openclaw doctor --fix` à nouveau après la mise à jour si un plugin configuré a toujours besoin de récupération. Le démarrage de Gateway et le rechargement de la configuration n'exécutent pas les gestionnaires de package ; les installations de plugins restent un travail explicite de doctor/install/update.

  </Accordion>
  <Accordion title="8. Migration et nettoyage des services de Gateway">
    Doctor détecte les services de passerelle hérités (launchd/systemd/schtasks) et propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle actuel. Il peut également rechercher des services similaires à des passerelles supplémentaires et imprimer des conseils de nettoyage. Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas signalés comme « supplémentaires ».

    Sur Linux, si le service de passerelle au niveau de l'utilisateur est manquant mais qu'un service de passerelle OpenClaw au niveau du système existe, doctor n'installe pas automatiquement un deuxième service au niveau de l'utilisateur. Inspectez avec `openclaw gateway status --deep` ou `openclaw doctor --deep`, puis supprimez le doublon ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un superviseur système possède le cycle de vie de la passerelle.

  </Accordion>
  <Accordion title="8b. Migration de Matrix au démarrage">
    Lorsqu'un compte de canal Matrix a une migration d'état héritée en attente ou actionnable, doctor (en mode `--fix` / `--repair`) crée un instantané pré-migration puis exécute les étapes de migration de meilleure tentative : migration de l'état hérité Matrix et préparation de l'état chiffré hérité. Ces deux étapes ne sont pas fatales ; les erreurs sont enregistrées et le démarrage se poursuit. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification est entièrement ignorée.
  </Accordion>
  <Accordion title="8c. Appareil jumelé et dérive de l'auth">
    Doctor inspecte désormais l'état du jumelage d'appareil dans le cadre de la vérification de santé normale.

    Ce qu'il signale :

    - demandes de premier jumelage en attente
    - mises à niveau de rôle en attente pour les appareils déjà jumelés
    - mises à niveau de portée en attente pour les appareils déjà jumelés
    - réparations de non-concordance de clé publique où l'ID de l'appareil correspond toujours mais l'identité de l'appareil ne correspond plus à l'enregistrement approuvé
    - enregistrements jumelés manquant un jeton actif pour un rôle approuvé
    - jetons jumelés dont les portées dérivent en dehors de la ligne de base de jumelage approuvée
    - entrées de jeton d'appareil mises en cache localement pour la machine actuelle qui sont antérieures à une rotation de jeton côté passerelle ou portent des métadonnées de portée obsolètes

    Doctor n'approuve pas automatiquement les demandes de jumelage et ne fait pas pivoter automatiquement les jetons d'appareil. Il imprime plutôt les étapes exactes à suivre :

    - inspecter les demandes en attente avec `openclaw devices list`
    - approuver la demande exacte avec `openclaw devices approve <requestId>`
    - faire pivoter un nouveau jeton avec `openclaw devices rotate --device <deviceId> --role <role>`
    - supprimer et réapprouver un enregistrement obsolète avec `openclaw devices remove <deviceId>`

    Cela comble le problème courant « déjà jumelé mais nécessite toujours un jumelage » : doctor distingue désormais le premier jumelage des mises à niveau de rôle/portée en attente et de la dérive du jeton/identité de l'appareil obsolète.

  </Accordion>
  <Accordion title="9. Avertissements de sécurité">
    Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou lorsqu'une stratégie est configurée de manière dangereuse.
  </Accordion>
  <Accordion title="Linux10. persistance systemd (Linux)">
    S'il s'exécute en tant que service utilisateur systemd, doctor s'assure que la persistance est activée afin que la passerelle reste active après la déconnexion.
  </Accordion>
  <Accordion title="11. État de l'espace de travail (compétences, plugins et répertoires hérités)">
    Doctor imprime un résumé de l'état de l'espace de travail pour l'agent par défaut :

    - **État des compétences** : compte les compétences éligibles, celles dont les prérequis manquent et celles bloquées par la liste d'autorisation.
    - **Répertoires d'espace de travail hérités** : avertit lorsque `~/openclaw` ou d'autres répertoires d'espace de travail hérités existent à côté de l'espace de travail actuel.
    - **État des plugins** : compte les plugins activés/désactivés/en erreur ; répertorie les ID de plugin pour toute erreur ; signale les capacités des plugins groupés.
    - **Avertissements de compatibilité des plugins** : signale les plugins qui ont des problèmes de compatibilité avec l'environnement d'exécution actuel.
    - **Diagnostics des plugins** : met en évidence les avertissements ou erreurs de chargement émis par le registre des plugins.

  </Accordion>
  <Accordion title="11b. Taille du fichier d'amorçage">
    Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`, `CLAUDE.md` ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget de caractères configuré. Il signale le nombre de caractères bruts par rapport à ceux injectés pour chaque fichier, le pourcentage de troncation, la cause de la troncation (`max/file` ou `max/total`) et le nombre total de caractères injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches de la limite, Doctor affiche des conseils pour ajuster `agents.defaults.bootstrapMaxChars` et `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Nettoyage des plugins de canal obsolètes">
    Lorsque `openclaw doctor --fix` supprime un plugin de canal manquant, il supprime également la configuration périmée étendue au canal qui référençait ce plugin : entrées `channels.<id>`, cibles de heartbeat nommant le canal et substitutions `agents.*.models["<channel>/*"]`. Cela empêche les boucles de démarrage du Gateway où le runtime du canal a disparu mais où la configuration demande toujours à la passerelle de s'y lier.
  </Accordion>
  <Accordion title="11c. Complétion du shell">
    Doctor vérifie si la complétion par tabulation est installée pour le shell actuel (zsh, bash, fish ou PowerShell) :

    - Si le profil du shell utilise un modèle de complétion dynamique lent (`source <(openclaw completion ...)`), Doctor le met à niveau vers la variante de fichier en cache plus rapide.
    - Si la complétion est configurée dans le profil mais que le fichier cache est manquant, Doctor régénère le cache automatiquement.
    - Si aucune complétion n'est configurée, Doctor propose de l'installer (mode interactif uniquement ; ignoré avec `--non-interactive`).

    Exécutez `openclaw completion --write-state` pour régénérer le cache manuellement.

  </Accordion>
  <Accordion title="Gateway12. Vérifications d'authentification du Gateway (jeton local)">
    Doctor vérifie la préparation de l'authentification par jeton local de la passerelle.

    - Si le mode de jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
    - Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas avec du texte en clair.
    - `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

  </Accordion>
  <Accordion title="12b. Réparations en lecture seule tenant compte des SecretRef">
    Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide de l'exécution.

    - `openclaw doctor --fix`Telegram utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
    - Exemple : la réparation du `allowFrom` / `groupAllowFrom` `@username`Telegram de Telegram tente d'utiliser les informations d'identification du bot configurées lorsqu'elles sont disponibles.
    - Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que l'information d'identification est configurée mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement que le jeton est manquant.

  </Accordion>
  <Accordion title="Gateway13. Vérification de l'état du Gateway + redémarrage">
    Doctor exécute une vérification de l'état et propose de redémarrer le gateway lorsqu'il semble défectueux.
  </Accordion>
  <Accordion title="13b. Préparation de la recherche mémoire">
    Doctor vérifie si le fournisseur d'intégration de recherche mémoire configuré est prêt pour l'agent par défaut. Le comportement dépend du backend et du fournisseur configurés :

    - **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable. Sinon, imprime des conseils de réparation, y compris le package npm et une option de chemin binaire manuel.
    - **Fournisseur local explicite** : recherche un fichier de modèle local ou une URL de modèle distante/téléchargeable reconnue. S'il est manquant, suggère de passer à un fournisseur distant.
    - **Fournisseur distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est présente dans l'environnement ou le stockage d'authentification. Imprime des conseils de réparation exploitables si elle est manquante.
    - **Fournisseur automatique hérité** : traite `memorySearch.provider: "auto"` comme OpenAI, vérifie la disponibilité de OpenAI et `doctor --fix` le réécrit en `provider: "openai"`.

    Lorsqu'un résultat de sonde de passerelle en cache est disponible (la passerelle était en bonne santé au moment de la vérification), Doctor croise son résultat avec la configuration visible CLI et note toute discordance. Doctor ne lance pas de nouveau ping d'intégration sur le chemin par défaut ; utilisez la commande de statut de mémoire approfondie lorsque vous souhaitez une vérification en direct du fournisseur.

    Utilisez `openclaw memory status --deep` pour vérifier la disponibilité de l'intégration lors de l'exécution.

  </Accordion>
  <Accordion title="14. Avertissements de statut de channel">
    Si la passerelle est en bonne santé, Doctor exécute une sonde de statut de channel et signale des avertissements avec des corrections suggérées.
  </Accordion>
  <Accordion title="15. Audit et réparation de la configuration du superviseur">
    Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour détecter les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances network-online de systemd et le délai de redémarrage). Lorsqu'il détecte une incohérence, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

    Notes :

    - `openclaw doctor` demande confirmation avant de réécrire la configuration du superviseur.
    - `openclaw doctor --yes` accepte les invites de réparation par défaut.
    - `openclaw doctor --fix` applique les corrections recommandées sans demander confirmation (`--repair` est un alias).
    - `openclaw doctor --fix --force` écrase les configurations personnalisées du superviseur.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` maintient doctor en lecture seule pour le cycle de vie du service de la passerelle. Il signale toujours l'état de santé du service et exécute les réparations non liées aux services, mais ignore l'installation, le démarrage, le redémarrage, l'amorçage, la réécriture de la configuration du superviseur et le nettoyage des services hérités, car un superviseur externe possède ce cycle de vie.
    - Sur Linux, doctor ne réécrit pas les métadonnées de commande/point d'entrée tant que l'unité systemd de passerelle correspondante est active. Il ignore également les unités supplémentaires de type passerelle inactives et non héritées lors de l'analyse des services en double, afin que les fichiers de service compagnons ne créent pas de bruit lors du nettoyage.
    - Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation/réparation du service doctor valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service du superviseur.
    - Doctor détecte les valeurs d'environnement de service gérées `.env`/prises en charge par SecretRef que les anciennes installations LaunchAgent, systemd ou Tâche planifiée Windows avaient intégrées en ligne, et réécrit les métadonnées du service pour que ces valeurs soient chargées à partir de la source d'exécution plutôt que de la définition du superviseur.
    - Doctor détecte lorsque la commande de service épingle encore un ancien `--port` après les modifications de `gateway.port` et réécrit les métadonnées du service vers le port actuel.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré n'est pas résolu, doctor bloque le chemin d'installation/réparation avec des conseils exploitables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
    - Pour les unités user-systemd Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
    - Les réparations de service de doctor refusent de réécrire, d'arrêter ou de redémarrer un service de passerelle à partir d'un binaire OpenClaw plus ancien lorsque la configuration a été écrite pour la dernière fois par une version plus récente. Voir [Dépannage de la Gateway](/fr/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="Gateway16. Diagnostics du runtime Gateway + port">
    Doctor inspecte le runtime du service (PID, dernier statut de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de ports sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).
  </Accordion>
  <Accordion title="Gateway17. Bonnes pratiques du runtime Gateway"Bun>
    Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par une version (`nvm`, `fnm`, `volta`, `asdf`WhatsAppTelegrammacOS, etc.). Les canaux WhatsApp + Telegram nécessitent Node, et les chemins des gestionnaires de versions peuvent se briser après les mises à niveau car le service ne charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node si elle est disponible (Homebrew/apt/choco).

    Les LaunchAgents nouvellement installés ou réparés sur macOS utilisent un PATH système canonique (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`Linux) au lieu de copier le PATH du shell interactif, de sorte que les binaires système gérés par Homebrew restent disponibles tandis que les répertoires Volta, asdf, fnm, pnpm et d'autres gestionnaires de versions ne modifient pas la résolution des processus enfants Node. Les services Linux conservent toujours des racines d'environnement explicites (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) et des répertoires utilisateur-bin stables, mais les répertoires de repli des gestionnaires de versions supposés ne sont écrits dans le PATH du service que lorsque ces répertoires existent sur le disque.

  </Accordion>
  <Accordion title="18. Écriture de configuration + métadonnées de l'assistant">
    Doctor persiste toutes les modifications de configuration et applique les métadonnées de l'assistant pour enregistrer l'exécution de doctor.
  </Accordion>
  <Accordion title="19. Conseils d'espace de travail (sauvegarde + système de mémoire)">
    Doctor suggère un système de mémoire d'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

    Consultez [/concepts/agent-workspace](/fr/concepts/agent-workspaceGitHub) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (GitHub ou GitLab privé recommandé).

  </Accordion>
</AccordionGroup>

## Connexes

- [Guide de procédures Gateway](Gateway/en/gateway)
- [Dépannage Gateway](Gateway/en/gateway/troubleshooting)

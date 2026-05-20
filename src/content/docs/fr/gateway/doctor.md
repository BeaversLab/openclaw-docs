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
    - Migration de la configuration de discussion des champs plats hérités `talk.*` vers `talk.provider` + `talk.providers.<provider>`.
    - Vérifications de migration du navigateur pour les configurations d'extension Chrome héritées et la préparation Chrome MCP.
    - Avertissements de substitution de fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`OAuth).
    - Avertissements de masquage OAuth Codex (`models.providers.openai-codex`OAuth).
    - Vérification des prérequis TLS OAuth pour les profils OAuth Codex OpenAIOAuth.
    - Avertissements de liste d'autorisation de plugin/tool lorsque `plugins.allow` est restrictif mais que la stratégie de tool demande toujours des caractères génériques ou des tools appartenant à des plugins.
    - Migration de l'état sur disque hérité (sessions/répertoire agent/authentification WhatsApp).
    - Migration de la clé de contrat de manifeste de plugin hérité (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migration du magasin cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de niveau supérieur, payload `provider`, tâches de repli webhook simples `notify: true`).
    - Nettoyage de la stratégie d'exécution whole-agent héritée ; la stratégie d'exécution provider/model est le sélecteur de route actif.
    - Nettoyage de la configuration de plugin obsolète lorsque les plugins sont activés ; lorsque `plugins.enabled=false`, les références de plugin obsolètes sont traitées comme une configuration de confinement inerte et sont conservées.

  </Accordion>
  <Accordion title="État et intégrité">
    - Inspection du fichier de verrouillage de session et nettoyage des verrous périmés.
    - Réparation de la transcription de session pour les branches de réécriture de prompt dupliquées créées par les versions affectées du 2026.4.24.
    - Détection des pierres tombales de redémarrage-récupération de sous-agent bloqué, avec `--fix` prise en charge pour effacer les drapeaux de récupération abandonnés périmés afin que le démarrage ne continue pas à traiter l'enfant comme abandonné lors du redémarrage.
    - Contrôles d'intégrité et d'autorisations de l'état (sessions, transcriptions, répertoire d'état).
    - Contrôles des autorisations du fichier de configuration (chmod 600) lors d'une exécution locale.
    - Santé de l'authentification du modèle : vérifie l'expiration du OAuth OAuth, peut actualiser les jetons expirants et signale les états de refroidissement/désactivation du profil d'authentification.
    - Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).

  </Accordion>
  <Accordion title="GatewayGateway, services et superviseurs"Matrix>
    - Réparation de l'image Sandbox lorsque le sandboxing est activé.
    - Migration des services hérités et détection de passerelles supplémentaires.
    - Migration de l'état hérité du canal Matrix (en mode `--fix` / `--repair`Gateway).
    - Contrôles d'exécution de la Gateway (service installé mais non en cours d'exécution ; label launchd mis en cache).
    - Avertissements de l'état du canal (sondés à partir de la Gateway en cours d'exécution).
    - Les contrôles d'autorisation spécifiques au canal se trouvent sous `openclaw channels capabilities`Discord ; par exemple, les autorisations du canal vocal Discord sont auditées avec `openclaw channels capabilities --channel discord --target channel:<channel-id>`WhatsAppGatewayTUI.
    - Contrôles de réactivité de WhatsApp pour une santé dégradée de la boucle d'événements de la Gateway alors que les clients TUI locaux sont toujours en cours d'exécution ; `--fix`TUI n'arrête que les clients TUI locaux vérifiés.
    - Réparation des routes Codex pour les références de model `openai-codex/*` héritées dans les modèles principaux, les solutions de repli, les substitutions de heartbeat/subagent/compaction, les hooks, les substitutions de model de canal et les épingles de route de session ; `--fix` les réécrit en `openai/*`OpenAI, supprime les épingles d'exécution de session/agent entier obsolètes et laisse les références d'agent OpenAI canoniques sur le harnais Codex par défaut.
    - Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
    - Nettoyage de l'environnement proxy intégré pour les services de passerelle qui ont capturé les valeurs du shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`GatewayBunGateway lors de l'installation ou de la mise à jour.
    - Contrôles des meilleures pratiques d'exécution de la Gateway (Node vs Bun, chemins des gestionnaires de version).
    - Diagnostic des collisions de ports de la Gateway (`18789` par défaut).

  </Accordion>
  <Accordion title="Authentification, sécurité et appariement"Gateway>
    - Avertissements de sécurité pour les politiques DM ouvertes.
    - Vérifications d'authentification de la Gateway pour le mode de jeton local (propose la génération de jeton lorsqu'aucune source de jeton n'existe ; ne remplace pas les configurations SecretRef de jeton).
    - Détection des problèmes d'appareil (demandes de premier appariement en attente, mises à niveau de rôle/portée en attente, dérive du cache du jeton d'appareil local périmé et dérive d'authentification de l'enregistrement apparié).

  </Accordion>
  <Accordion title="Espace de travail et shell"Linux>
    - Vérification de la persistance systemd sur Linux.
    - Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncuration/limite proche pour les fichiers de contexte).
    - Vérification de la disponibilité des compétences pour l'agent par défaut ; signale les compétences autorisées avec des bins, env, config ou exigences OS manquants, et `--fix` peut désactiver les compétences indisponibles dans `skills.entries`API.
    - Vérification de l'état de la complétion du shell et installation/mise à niveau automatique.
    - Vérification de la disponibilité du fournisseur d'intégration de recherche mémoire (modèle local, clé API distante, ou binaire QMD).
    - Vérifications de l'installation source (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
    - Écrit la configuration mise à jour + les métadonnées de l'assistant.

  </Accordion>
</AccordionGroup>

## Remplissage (backfill) et réinitialisation de Dreams UI

La scène Dreams de l'interface de contrôle comprend les actions **Backfill** (remplissage), **Reset** (réinitialisation) et **Clear Grounded** (effacer Grounded) pour le flux de travail de rêve ancré (grounded dreaming). Ces actions utilisent des méthodes RPC de style docteur de la passerelle, mais elles ne font **pas** partie de la réparation/migration du RPC`openclaw doctor`CLI CLI.

Ce qu'elles font :

- **Backfill** analyse les fichiers historiques `memory/YYYY-MM-DD.md` dans l'espace de travail actif, exécute la passe de journal REM ancré et écrit des entrées de remplissage réversibles dans `DREAMS.md`.
- **Reset** supprime uniquement les entrées de journal de remplissage (backfill) marquées de `DREAMS.md`.
- **Clear Grounded** supprime uniquement les entrées à court terme mises en scène et uniquement ancrées (grounded-only) provenant de la rediffusion historique et qui n'ont pas encore accumulé de rappel en direct ou de support quotidien.

Ce qu'elles ne font **pas** par elles-mêmes :

- elles ne modifient pas `MEMORY.md`
- elles n'exécutent pas les migrations complètes du docteur
- ils ne mettent pas automatiquement en scène les candidats ancrés dans le magasin de promotion à court terme en direct, sauf si vous exécutez explicitement d'abord le chemin de la CLI intermédiaire

Si vous souhaitez que la relecture historique ancrée influence la voie de promotion profonde normale, utilisez plutôt le flux CLI :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Cela met en scène les candidats durables ancrés dans le magasin de rêve à court terme tout en conservant `DREAMS.md` comme surface de révision.

## Comportement détaillé et justification

<AccordionGroup>
  <Accordion title="0. Mise à jour facultative (installations git)">
    S'il s'agit d'une extraction git et que doctor s'exécute de manière interactive, il propose de mettre à jour (fetch/rebase/build) avant d'exécuter doctor.
  </Accordion>
  <Accordion title="1. Normalisation de la configuration">
    Si la configuration contient des formes de valeur héritées (par exemple `messages.ackReaction` sans remplacement spécifique au channel), doctor les normalise dans le schéma actuel.

    Cela inclut les champs plats hérités de Talk. La configuration publique actuelle de la parole Talk est `talk.provider` + `talk.providers.<provider>`, et la configuration vocale en temps réel est `talk.realtime.*`. Doctor réécrit les anciennes formes `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` dans la carte du fournisseur, et réécrit les sélecteurs de temps réel de premier niveau hérités (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) dans `talk.realtime`.

    Doctor avertit également lorsque `plugins.allow` n'est pas vide et que la stratégie d'outil utilise des entrées d'outil génériques ou détenues par un plugin. `tools.allow: ["*"]` ne correspond qu'aux outils des plugins qui se chargent réellement ; il ne contourne pas la liste d'autorisation exclusive des plugins. Doctor écrit `plugins.bundledDiscovery: "compat"` pour les configurations de liste d'autorisation héritées migrées afin de préserver le comportement existant du fournisseur groupé, puis pointe vers le paramètre plus strict `"allowlist"`.

  </Accordion>
  <Accordion title="2. Migrations des clés de configuration héritées">
    Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent d'exécuter `openclaw doctor`.

    Doctor effectuera les actions suivantes :

    - Expliquer quelles clés héritées ont été trouvées.
    - Afficher la migration qu'il a appliquée.
    - Réécrire `~/.openclaw/openclaw.json`Gateway avec le schéma mis à jour.

    Le démarrage du Gateway refuse les formats de configuration hérités et vous demande d'exécuter `openclaw doctor --fix` ; il ne réécrit pas `openclaw.json` au démarrage. Les migrations du magasin de tâches Cron sont également gérées par `openclaw doctor --fix`.

    Migrations actuelles :

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → `bindings` de niveau supérieur
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - hérité `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - sélecteurs Talk en temps réel hérités de niveau supérieur (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
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
    - Pour les canaux avec `accounts` nommé mais des valeurs de canal de niveau supérieur à compte unique persistantes, déplacez ces valeurs étendues au compte vers le compte promu choisi pour ce canal (`accounts.default`Matrix pour la plupart des canaux ; Matrix peut préserver une cible nommée/défaut correspondante existante)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - supprimer `agents.defaults.llm` ; utiliser `models.providers.<id>.timeoutSeconds` pour les délais d'expiration lents du provider/model, et garder le délai d'expiration de l'agent/exécution au-dessus de cette valeur lorsque toute l'exécution doit durer plus longtemps
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)
    - hérité `models.providers.*.api: "openai"` → `"openai-completions"` (le démarrage de la passerelle ignore également les providers dont `api` est défini sur une valeur d'énumération future ou inconnue au lieu d'échouer en mode fermé)
    - supprimer `plugins.entries.codex.config.codexDynamicToolsProfile` ; le serveur d'application Codex garde toujours les outils d'espace de travail natifs Codex natifs

    Les avertissements de Doctor incluent également des conseils sur le compte par défaut pour les canaux multi-comptes :

    - Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ou `accounts.default`, le doctor avertit que le routage de repli peut choisir un compte inattendu.
    - Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, le doctor avertit et liste les IDs de compte configurés.

  </Accordion>
  <Accordion title="2b. Remplacements du fournisseur OpenCode">
    Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go` manuellement, cela remplace le catalogue OpenCode intégré de `@earendil-works/pi-ai`. Cela peut forcer les modèles vers la mauvaise API ou annuler les coûts. Doctor vous avertit pour que vous puissiez supprimer le remplacement et restaurer le routage et les coûts par modèle de l'API.
  </Accordion>
  <Accordion title="2c. Migration du navigateur et préparation de Chrome MCP">
    Si votre configuration de navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, doctor la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

    - `browser.profiles.*.driver: "extension"` devient `"existing-session"`
    - `browser.relayBindHost` est supprimé

    Doctor vérifie également le chemin Chrome MCP hôte-local lorsque vous utilisez `defaultProfile: "user"` ou un profil `existing-session` configuré :

    - vérifie si Google Chrome est installé sur le même hôte pour les profils de connexion automatique par défaut
    - vérifie la version de Chrome détectée et avertit si elle est inférieure à Chrome 144
    - vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` ou `edge://inspect/#remote-debugging`)

    Doctor ne peut pas activer le paramètre côté Chrome pour vous. Chrome MCP hôte-local nécessite toujours :

    - un navigateur basé sur Chromium 144+ sur l'hôte de passerelle/nœud
    - le navigateur s'exécutant localement
    - le débogage à distance activé dans ce navigateur
    - l'approbation de la première invite de consentement d'attachement dans le navigateur

    La préparation ici concerne uniquement les prérequis d'attachement local. Existing-session conserve les limites de routage Chrome MCP actuelles ; les routes avancées comme `responsebody`, l'exportation PDF, l'interception de téléchargement et les actions par lot nécessitent toujours un navigateur géré ou un profil CDP brut.

    Cette vérification ne s'applique **pas** à Docker, au sandbox, au remote-browser ou à d'autres flux headless. Ceux-ci continuent d'utiliser le CDP brut.

  </Accordion>
  <Accordion title="OAuth2d. Prérequis TLS OAuth"OpenAIOAuth>
    Lorsqu'un profil OAuth OpenAI Codex est configuré, le médecin sonde le point de terminaison d'autorisation OpenAI pour vérifier que la pile TLS Node/OpenSSL locale peut valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificat expiré ou auto-signé), le médecin imprime des instructions de correction spécifiques à la plateforme. Sur macOS avec un Node Homebrew, la correction est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute même si la passerelle est en bonne santé.
  </Accordion>
  <Accordion title="OAuth2e. Remplacements du provider OAuth Codex">
    Si vous avez précédemment ajouté des paramètres de transport hérités OpenAI sous `models.providers.openai-codex`OAuthOAuth, ils peuvent masquer le chemin du provider OAuth Codex intégré que les versions plus récentes utilisent automatiquement. Le médecin avertit lorsqu'il détecte ces anciens paramètres de transport en parallèle à l'OAuth Codex afin que vous puissiez supprimer ou réécrire le remplacement de transport obsolète et récupérer le comportement de routage/secours intégré. Les proxies personnalisés et les remplacements d'en-têtes uniquement sont toujours pris en charge et ne déclenchent pas cet avertissement.
  </Accordion>
  <Accordion title="2f. Réparation de l'itinéraire Codex">
    Doctor vérifie les références de modèle `openai-codex/*` héritées. Le routage du harnais Codex natif utilise des références de modèle canoniques `openai/*` ; les tours d'agent OpenAI passent par le harnais du serveur d'application Codex au lieu du chemin OpenClaw PI OpenAI.

    En mode `--fix` / `--repair`, doctor réécrit les références d'agent par défaut et par agent affectées, y compris les modèles principaux, les solutions de repli, les remplacements de rythme cardiaque/sous-agent/compactage, les hooks, les remplacements de modèle de canal et l'état d'itinéraire de session persistant obsolète :

    - `openai-codex/gpt-*` devient `openai/gpt-*`.
    - L'intention Codex passe aux entrées `agentRuntime.id: "codex"` de portée fournisseur/modèle pour les références de modèle d'agent réparées afin que les profils d'authentification `openai-codex:...` puissent toujours être sélectionnés une fois que la référence de modèle devient `openai/*`.
    - La configuration d'exécution de l'agent complet obsolète et les épingles d'exécution de session persistante sont supprimés car la sélection d'exécution est de portée fournisseur/modèle.
    - La stratégie d'exécution fournisseur/modèle existante est préservée, sauf si la référence de modèle héritée réparée a besoin du routage Codex pour conserver l'ancien chemin d'authentification.
    - Les listes de repli de modèle existantes sont préservées avec leurs entrées héritées réécrites ; les paramètres copiés par modèle passent de la clé héritée à la clé canonique `openai/*`.
    - La session persistante `modelProvider`/`providerOverride`, `model`/`modelOverride`, les avis de repli et les épingles de profil d'authentification sont réparés sur tous les magasins de session d'agent découverts.
    - `/codex ...` signifie « contrôler ou lier une conversation Codex native à partir du chat ».
    - `/acp ...` ou `runtime: "acp"` signifie « utiliser l'adaptateur ACP/acpx externe ».

  </Accordion>
  <Accordion title="2g. Nettoyage des itinéraires de session">
    Doctor analyse également les magasins de sessions d'agents découverts pour détecter l'état obsolète des itinéraires créés automatiquement après avoir déplacé des modèles ou des runtimes configurés hors d'un itinéraire détenue par un plugin tel que Codex.

    `openclaw doctor --fix` peut effacer l'état obsolète créé automatiquement, tel que les épingles de modèle `modelOverrideSource: "auto"`, les métadonnées de modèle d'exécution, les identifiants de harnais épinglés, les liaisons de session CLI et les remplacements de profil d'auth automatique, lorsque leur itinéraire propriétaire n'est plus configuré. Les choix explicites de l'utilisateur ou de modèle de session hérités sont signalés pour examen manuel et laissés intacts ; modifiez-les avec `/model ...`, `/new`, ou réinitialisez la session lorsque cet itinéraire n'est plus voulu.

  </Accordion>
  <Accordion title="3. Migrations d'état hérité (disposition du disque)">
    Doctor peut migrer des dispositions de disque plus anciennes vers la structure actuelle :

    - Magasin de sessions + transcriptions :
      - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
    - Répertoire de l'agent :
      - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
    - État d'authentification WhatsApp (Baileys) :
      - de l'ancien `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
      - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

    Ces migrations sont de « meilleure effort » et idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités comme sauvegardes. Le Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage, afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp n'est migrée intentionnellement que via `openclaw doctor`. La normalisation du fournisseur de discussions/de la carte des fournisseurs compare désormais par égalité structurelle, les différences basées uniquement sur l'ordre des clés ne déclenchent donc plus de modifications `doctor --fix` sans effet répétées.

  </Accordion>
  <Accordion title="3a. Migrations du manifeste de plugin hérité">
    Doctor analyse tous les manifestes de plugins installés pour détecter les clés de capacités de niveau supérieur obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'il en trouve, il propose de les déplacer vers l'objet `contracts` et de réécrire le fichier manifeste sur place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.
  </Accordion>
  <Accordion title="3b. Migrations de magasin de cron héritées">
    Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de substitution) pour détecter les anciens formats de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

    Les nettoyages de cron actuels incluent :

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - champs de payload de niveau supérieur (`message`, `model`, `thinking`, ...) → `payload`
    - champs de livraison de niveau supérieur (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de livraison `provider` du payload → `delivery.channel` explicite
    - tâches de secours webhook héritées simples `notify: true` → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

    Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans modifier le comportement. Si une tâche combine le secours de notification hérité avec un mode de livraison autre que webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

    Sur Linux, doctor avertit également lorsque la crontab de l'utilisateur appelle toujours le `~/.openclaw/bin/ensure-whatsapp.sh` hérité. Ce script localisé à l'hôte n'est pas maintenu par la version actuelle d'OpenClaw et peut écrire de faux messages `Gateway inactive` dans `~/.openclaw/logs/whatsapp-health.log` lorsque cron ne peut pas atteindre le bus utilisateur systemd. Supprimez l'entrée de crontab obsolète avec `crontab -e` ; utilisez `openclaw channels status --probe`, `openclaw doctor` et `openclaw gateway status` pour les contrôles de santé actuels.

  </Accordion>
  <Accordion title="3c. Nettoyage des verrous de session">
    Doctor analyse chaque répertoire de session d'agent pour détecter les fichiers de verrouillage d'écriture obsolètes — fichiers laissés lorsqu'une session s'est terminée de manière anormale. Pour chaque fichier de verrouillage trouvé, il signale : le chemin, le PID, si le PID est toujours actif, l'âge du verrou, et s'il est considéré comme obsolète (PID mort, âgé de plus de 30 minutes, ou un PID actif qui peut être prouvé comme appartenant à un processus non-OpenClaw). En mode `--fix` / `--repair`, il supprime automatiquement les fichiers de verrouillage obsolètes ; sinon, il imprime une note et vous invite à relancer avec `--fix`.
  </Accordion>
  <Accordion title="3d. Réparation de la branche de transcript de session">
    Doctor analyse les fichiers JSONL de session d'agent pour détecter la forme de branche dupliquée créée par le bug de réécriture du transcript de prompt du 2026.4.24 : un tour utilisateur abandonné avec le contexte d'exécution interne OpenClaw plus un frère actif contenant le même prompt utilisateur visible. En mode `--fix` / `--repair`, doctor sauvegarde chaque fichier affecté à côté de l'original et réécrit le transcript vers la branche active afin que les lecteurs d'historique et de mémoire de la passerine ne voient plus les tours en double.
  </Accordion>
  <Accordion title="4. Vérifications de l'intégrité de l'état (persistance de la session, routage et sécurité)">
    Le répertoire d'état est le centre névralgique opérationnel. S'il disparaît, vous perdez les sessions, les identifiants, les journaux et la configuration (sauf si vous disposez de sauvegardes ailleurs).

    Doctor vérifie :

    - **Répertoire d'état manquant** : avertit d'une perte catastrophique de l'état, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
    - **Permissions du répertoire d'état** : vérifie la capacité d'écriture ; propose de réparer les permissions (et émet un indice `chown` lorsqu'une inadéquation propriétaire/groupe est détectée).
    - **Répertoire d'état synchronisé par le cloud sur macOS** : avertit lorsque l'état se résout sous iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou `~/Library/CloudStorage/...`, car les chemins soutenus par la synchronisation peuvent entraîner des E/S plus lentes et des conflits de verrouillage/synchronisation.
    - **Répertoire d'état sur carte SD ou eMMC Linux** : avertit lorsque l'état se résout vers une source de montage `mmcblk*`, car les E/S aléatoires sur carte SD ou eMMC peuvent être plus lentes et user plus rapidement sous les écritures de session et d'identifiants.
    - **Répertoires de session manquants** : `sessions/` et le répertoire de stockage de session sont requis pour conserver l'historique et éviter les plantages `ENOENT`.
    - **Inadéquation des transcriptions** : avertit lorsque les entrées de session récentes ont des fichiers de transcription manquants.
    - **Session principale « 1-line JSONL »** : signale lorsque la transcription principale ne contient qu'une seule ligne (l'historique ne s'accumule pas).
    - **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent à travers les répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut être divisé entre les installations).
    - **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter sur l'hôte distant (l'état réside là).
    - **Permissions du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est lisible par le groupe/le monde et propose de resserrer à `600`.

  </Accordion>
  <Accordion title="OAuth5. Intégrité de l'authentification du modèle (expiration OAuth)"OAuthAnthropicOAuthAnthropicAPIAnthropic>
    Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons sont sur le point d'expirer ou expirés, et peut les actualiser lorsque cela est sûr. Si le profil OAuth/jeton Anthropic est obsolète, il suggère une clé API Anthropic ou le chemin du jeton de configuration (setup-token) Anthropic. Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive`OAuth ignore les tentatives d'actualisation.

    Lorsqu'une actualisation OAuth échoue de manière permanente (par exemple `refresh_token_reused`, `invalid_grant`, ou un fournisseur vous demandant de vous reconnecter), doctor signale qu'une réauthentification est requise et imprime la commande exacte `openclaw models auth login --provider ...` à exécuter.

    Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

    - courts refroidissements (limites de délai/dépassements de délai/échecs d'authentification)
    - désactivations plus longues (échecs de facturation/crédit)

  </Accordion>
  <Accordion title="6. Validation du modèle de Hooks">
    Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au catalogue et à la liste d'autorisation (allowlist) et avertit lorsqu'elle ne sera pas résolue ou n'est pas autorisée.
  </Accordion>
  <Accordion title="7. Réparation de l'image Sandbox"Docker>
    Lorsque la mise en bac à sable (sandboxing) est activée, doctor vérifie les images Docker et propose de les construire ou de passer aux noms hérités si l'image actuelle est manquante.
  </Accordion>
  <Accordion title="7b. Nettoyage de l'installation des plugins">
    Doctor supprime l'état de mise en zone de préparation des dépendances de plugins hérité généré par OpenClaw en mode `openclaw doctor --fix` / `openclaw doctor --repair`. Cela couvre les racines de dépendances générées obsolètes, les anciens répertoires d'étape d'installation, les débris locaux de package provenant de l'ancien code de réparation des dépendances des plugins groupés, et les copies gérées de npm de plugins groupés `@openclaw/*` orphelines ou récupérées qui peuvent masquer le manifeste groupé actuel. Doctor relie également le package hôte `openclaw` aux plugins gérés npm qui déclarent `peerDependencies.openclaw`, afin que les importations d'exécution locales de package telles que `openclaw/plugin-sdk/*` continuent à être résolues après les mises à jour ou les réparations npm.

    Doctor peut également réinstaller les plugins téléchargeables manquants lorsque la configuration y fait référence mais que le registre local de plugins ne peut pas les trouver. Des exemples incluent le matériel `plugins.entries`, les paramètres configurés de canal/fournisseur/recherche et les environnements d'exécution d'agent configurés. Lors des mises à jour de package, doctor évite d'exécuter la réparation de plugin de gestionnaire de package pendant que le package principal est en cours d'échange ; exécutez à nouveau `openclaw doctor --fix` après la mise à jour si un plugin configuré a toujours besoin de récupération. Le démarrage de Gateway et le rechargement de la configuration n'exécutent pas les gestionnaires de package ; les installations de plugins restent un travail explicite de doctor/install/update.

  </Accordion>
  <Accordion title="Gateway8. Migration et nettoyage des services Gateway"OpenClawOpenClawLinuxOpenClaw>
    Doctor détecte les services Gateway hérités (launchd/systemd/schtasks) et propose de les supprimer et d'installer le service OpenClaw en utilisant le port Gateway actuel. Il peut également rechercher des services similaires supplémentaires et imprimer des conseils de nettoyage. Les services Gateway OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas signalés comme « supplémentaires ».

    Sur Linux, si le service Gateway au niveau de l'utilisateur est manquant mais qu'un service Gateway OpenClaw au niveau du système existe, doctor n'installe pas automatiquement un deuxième service au niveau de l'utilisateur. Inspectez avec `openclaw gateway status --deep` ou `openclaw doctor --deep`, puis supprimez le doublon ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un superviseur système possède le cycle de vie de la gateway.

  </Accordion>
  <Accordion title="Matrix8b. Migration de Matrix au démarrage"Matrix>
    Lorsqu'un compte de channel Matrix a une migration d'état héritée en attente ou actionable, doctor (en mode `--fix` / `--repair`Matrix) crée un instantané de pré-migration puis exécute les étapes de migration de mieux effort : migration d'état hérité Matrix et préparation de l'état chiffré hérité. Ces deux étapes ne sont pas fatales ; les erreurs sont consignées et le démarrage continue. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification est entièrement ignorée.
  </Accordion>
  <Accordion title="8c. Appareillage des périphériques et dérive de l'authentification">
    Doctor inspecte désormais l'état de l'appareillage des périphériques dans le cadre de la vérification de santé normale.

    Ce qu'il signale :

    - demandes d'appareillage initial en attente
    - mises à niveau de rôle en attente pour les périphériques déjà appariés
    - mises à niveau de portée en attente pour les périphériques déjà appariés
    - réparations de discordance de clé publique où l'ID du périphérique correspond toujours mais l'identité du périphérique ne correspond plus à l'enregistrement approuvé
    - enregistrements appariés manquant un jeton actif pour un rôle approuvé
    - jetons appariés dont les portées dérivent en dehors de la base de référence d'appareillage approuvée
    - entrées locales en cache de jetons de périphérique pour la machine actuelle qui précèdent une rotation de jeton côté passerelle ou transportent des métadonnées de portée obsolètes

    Doctor n'approuve pas automatiquement les demandes d'appareillage ni ne fait pivoter automatiquement les jetons de périphérique. Il imprime plutôt les étapes exactes suivantes :

    - inspecter les demandes en attente avec `openclaw devices list`
    - approuver la demande exacte avec `openclaw devices approve <requestId>`
    - faire pivoter un nouveau jeton avec `openclaw devices rotate --device <deviceId> --role <role>`
    - supprimer et réapprouver un enregistrement obsolète avec `openclaw devices remove <deviceId>`

    Cela comble le problème courant « déjà apparié mais nécessitant toujours un appareillage » : doctor distingue désormais l'appareillage initial des mises à niveau de rôle/portée en attente et de la dérive de jeton/identité de périphérique obsolète.

  </Accordion>
  <Accordion title="9. Avertissements de sécurité">
    Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou lorsqu'une stratégie est configurée de manière dangereuse.
  </Accordion>
  <Accordion title="Linux10. persistance systemd (Linux)">
    S'il s'exécute en tant que service utilisateur systemd, doctor s'assure que la persistance est activée afin que la passerelle reste active après la déconnexion.
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor affiche un résumé de l'état de l'espace de travail pour l'agent par défaut :

    - **Skills status** : compte les compétences éligibles, celles dont les prérequis sont manquants et celles bloquées par la liste d'autorisation.
    - **Legacy workspace dirs** : avertit lorsque `~/openclaw` ou d'autres répertoires d'espace de travail hérités existent aux côtés de l'espace de travail actuel.
    - **Plugin status** : compte les plugins activés/désactivés/en erreur ; répertorie les identifiants des plugins pour toute erreur ; signale les capacités des plugins groupés.
    - **Plugin compatibility warnings** : signale les plugins qui présentent des problèmes de compatibilité avec l'exécution actuelle.
    - **Plugin diagnostics** : met en évidence les avertissements ou erreurs de chargement émis par le registre de plugins.

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`, `CLAUDE.md`, ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget de caractères configuré. Il signale le nombre brut de caractères par rapport au nombre injecté par fichier, le pourcentage de troncation, la cause de la troncation (`max/file` ou `max/total`) et le nombre total de caractères injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches de la limite, doctor affiche des conseils pour régler `agents.defaults.bootstrapMaxChars` et `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    Lorsque `openclaw doctor --fix` supprime un plugin de canal manquant, il supprime également la configuration délimitée au canal en suspens qui référençait ce plugin : entrées `channels.<id>`, cibles de heartbeat nommant le canal et remplacements `agents.*.models["<channel>/*"]`. Cela empêche les boucles de démarrage de Gateway où l'exécution du canal a disparu mais où la configuration demande toujours à la passerelle de s'y lier.
  </Accordion>
  <Accordion title="11c. Complétion du shell">
    Doctor vérifie si la complétion par tabulation est installée pour le shell actuel (zsh, bash, fish ou PowerShell) :

    - Si le profil du shell utilise un modèle de complétion dynamique lent (`source <(openclaw completion ...)`), doctor le met à niveau vers la variante de fichier en cache plus rapide.
    - Si la complétion est configurée dans le profil mais que le fichier cache est manquant, doctor régénère le cache automatiquement.
    - Si aucune complétion n'est configurée du tout, doctor propose de l'installer (mode interactif uniquement ; ignoré avec `--non-interactive`).

    Exécutez `openclaw completion --write-state` pour régénérer le cache manuellement.

  </Accordion>
  <Accordion title="Gateway12. Vérifications d'authentification du Gateway (jeton local)">
    Doctor vérifie la disponibilité de l'authentification par jeton du Gateway local.

    - Si le mode de jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
    - Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas en clair.
    - `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

  </Accordion>
  <Accordion title="12b. Réparations compatibles SecretRef en lecture seule">
    Certains flux de réparation doivent inspecter les identifiants configurés sans affaiblir le comportement d'échec rapide (fail-fast) à l'exécution.

    - `openclaw doctor --fix`Telegram utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
    - Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username`Telegram essaie d'utiliser les identifiants de bot configurés lorsqu'ils sont disponibles.
    - Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que l'identifiant est configuré mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le jeton comme manquant.

  </Accordion>
  <Accordion title="Gateway13. Vérification de l'état du Gateway + redémarrage">
    Doctor exécute une vérification de l'état et propose de redémarrer le gateway lorsqu'il semble défectueux.
  </Accordion>
  <Accordion title="13b. Préparation de la recherche mémoire">
    Doctor vérifie si le fournisseur d'embeddings de recherche mémoire configuré est prêt pour l'agent par défaut. Le comportement dépend du backend et du fournisseur configurés :

    - **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable. Si ce n'est pas le cas, il imprime des instructions de réparation, y compris le package npm et une option de chemin binaire manuel.
    - **Fournisseur local explicite** : vérifie la présence d'un fichier de modèle local ou d'une URL de modèle distante/reconnaissable et téléchargeable. S'il est manquant, il suggère de passer à un fournisseur distant.
    - **Fournisseur distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est présente dans l'environnement ou le stockage d'authentification. Imprime des indices de réparation exploitables si elle est manquante.
    - **Fournisseur automatique** : vérifie d'abord la disponibilité du modèle local, puis essaie chaque fournisseur distant dans l'ordre de sélection automatique.

    Lorsqu'un résultat de sonde de passerelle mis en cache est disponible (la passerelle était en bonne santé au moment de la vérification), Doctor recoupe ce résultat avec la configuration visible CLI et note toute divergence. Doctor ne lance pas de nouveau ping d'embeddings sur le chemin par défaut ; utilisez la commande de statut de mémoire approfondie lorsque vous souhaitez une vérification en direct du fournisseur.

    Utilisez `openclaw memory status --deep` pour vérifier la préparation des embeddings à l'exécution.

  </Accordion>
  <Accordion title="14. Avertissements de statut de channel">
    Si la passerelle est en bonne santé, Doctor exécute une sonde de statut de channel et signale des avertissements avec des corrections suggérées.
  </Accordion>
  <Accordion title="15. Audit et réparation de la configuration du superviseur">
    Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour détecter les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances réseau systemd et le délai de redémarrage). Lorsqu'il détecte une inadéquation, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

    Notes :

    - `openclaw doctor` demande une confirmation avant de réécrire la configuration du superviseur.
    - `openclaw doctor --yes` accepte les invites de réparation par défaut.
    - `openclaw doctor --fix` applique les corrections recommandées sans invite (`--repair` est un alias).
    - `openclaw doctor --fix --force` écrase les configurations personnalisées du superviseur.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` maintient doctor en lecture seule pour le cycle de vie du service Gateway. Il signale toujours l'état de santé du service et exécute les réparations non liées aux services, mais ignore l'installation, le démarrage, le redémarrage, l'amorçage du service, la réécriture de la configuration du superviseur et le nettoyage des services obsolètes, car un superviseur externe est propriétaire de ce cycle de vie.
    - Sur Linux, doctor ne réécrit pas les métadonnées de commande/point d'entrée tant que l'unité systemd Gateway correspondante est active. Il ignore également les unités supplémentaires inactives de type Gateway non obsolètes lors de l'analyse des services en double, afin que les fichiers de services compagnons ne créent pas de bruit de nettoyage.
    - Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation/réparation du service doctor valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service superviseur.
    - Doctor détecte les valeurs d'environnement de service gérées `.env`/SecretRef que les anciennes installations LaunchAgent, systemd ou Tâche planifiée Windows avaient intégrées en ligne, et réécrit les métadonnées du service pour que ces valeurs soient chargées depuis la source d'exécution plutôt que depuis la définition du superviseur.
    - Doctor détecte lorsque la commande du service épingle encore un ancien `--port` après des modifications de `gateway.port` et réécrit les métadonnées du service vers le port actuel.
    - Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré est non résolu, doctor bloque le chemin d'installation/réparation avec des directives exploitables.
    - Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
    - Pour les unités utilisateur-systemd Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
    - Les réparations de service doctor refusent de réécrire, d'arrêter ou de redémarrer un service Gateway provenant d'un binaire OpenClaw plus ancien lorsque la configuration a été écrite pour la dernière fois par une version plus récente. Voir [Dépannage Gateway](/fr/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Diagnostic d'exécution et de port du Gateway">
    Doctor inspecte le runtime du service (PID, dernier état de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de port sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).
  </Accordion>
  <Accordion title="17. Bonnes pratiques d'exécution du Gateway">
    Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par version (`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp + Telegram nécessitent Node, et les chemins des gestionnaires de versions peuvent casser après les mises à niveau car le service ne charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node si elle est disponible (Homebrew/apt/choco).

    Les LaunchAgents nouvellement installés ou réparés sur macOS utilisent un PATH système canonique (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`) au lieu de copier le PATH du shell interactif, de sorte que les binaires système gérés par Homebrew restent disponibles tandis que les répertoires de gestionnaires de versions comme Volta, asdf, fnm, pnpm et autres ne modifient pas la résolution des processus enfants Node. Les services Linux conservent toujours des racines d'environnement explicites (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) et des répertoires bin-utilisateurs stables, mais les répertoires de repli de gestionnaires de versions devinés ne sont écrits dans le PATH du service que lorsque ces répertoires existent sur le disque.

  </Accordion>
  <Accordion title="18. Écriture de configuration + métadonnées de l'assistant">
    Doctor persiste toutes les modifications de configuration et applique les métadonnées de l'assistant pour enregistrer l'exécution de doctor.
  </Accordion>
  <Accordion title="19. Conseils d'espace de travail (sauvegarde + système de mémoire)">
    Doctor suggère un système de mémoire pour l'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

    Voir [/concepts/agent-workspace](/fr/concepts/agent-workspaceGitHub) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (GitHub ou GitLab privé recommandé).

  </Accordion>
</AccordionGroup>

## Connexes

- [Guide de procédures Gateway](Gateway/en/gateway)
- [Dépannage Gateway](Gateway/en/gateway/troubleshooting)

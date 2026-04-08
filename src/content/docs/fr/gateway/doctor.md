---
summary: "Commande Doctor : vérifications de santé, migrations de configuration et étapes de réparation"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` est l'outil de réparation et de migration pour OpenClaw. Il corrige les configurations/états obsolètes, vérifie la santé et fournit des étapes de réparation actionnables.

## Quick start

```bash
openclaw doctor
```

### Headless / automation

```bash
openclaw doctor --yes
```

Accepter les valeurs par défaut sans invite (y compris les étapes de réparation du redémarrage/du service/du bac à sable lorsque cela s'applique).

```bash
openclaw doctor --repair
```

Appliquer les réparations recommandées sans invite (réparations + redémarrages si sécurisé).

```bash
openclaw doctor --repair --force
```

Appliquer également les réparations agressives (écrase les configurations de superviseur personnalisées).

```bash
openclaw doctor --non-interactive
```

Exécuter sans invite et n'appliquer que les migrations sécurisées (normalisation de la configuration + déplacements d'état sur disque). Ignore les actions de redémarrage/service/bac à sable nécessitant une confirmation humaine.
Les migrations d'état héritées s'exécutent automatiquement lorsqu'elles sont détectées.

```bash
openclaw doctor --deep
```

Scanner les services système pour trouver des installations de passerelle supplémentaires (launchd/systemd/schtasks).

Si vous souhaitez examiner les modifications avant l'écriture, ouvrez d'abord le fichier de configuration :

```bash
cat ~/.openclaw/openclaw.json
```

## Ce qu'il fait (résumé)

- Mise à jour préalable facultative pour les installations git (mode interactif uniquement).
- Vérification de la fraîcheur du protocole UI (reconstruit l'interface de contrôle lorsque le schéma de protocole est plus récent).
- Vérification de la santé + invite de redémarrage.
- Résumé de l'état des Skills (éligibles/manquantes/bloquées) et état des plugins.
- Normalisation de la configuration pour les valeurs héritées.
- Talk config migration from legacy flat `talk.*` fields into `talk.provider` + `talk.providers.<provider>`.
- Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
- OpenCode provider override warnings (`models.providers.opencode` / `models.providers.opencode-go`).
- OAuth TLS prerequisites check for OpenAI Codex OAuth profiles.
- Legacy on-disk state migration (sessions/agent dir/WhatsApp auth).
- Legacy plugin manifest contract key migration (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Legacy cron store migration (`jobId`, `schedule.cron`, top-level delivery/payload fields, payload `provider`, simple `notify: true` webhook fallback jobs).
- Session lock file inspection and stale lock cleanup.
- State integrity and permissions checks (sessions, transcripts, state dir).
- Config file permission checks (chmod 600) when running locally.
- Model auth health: checks OAuth expiry, can refresh expiring tokens, and reports auth-profile cooldown/disabled states.
- Extra workspace dir detection (`~/openclaw`).
- Sandbox image repair when sandboxing is enabled.
- Legacy service migration and extra gateway detection.
- Matrix channel legacy state migration (in `--fix` / `--repair` mode).
- Gateway runtime checks (service installed but not running; cached launchd label).
- Channel status warnings (probed from the running gateway).
- Supervisor config audit (launchd/systemd/schtasks) with optional repair.
- Gateway runtime best-practice checks (Node vs Bun, version-manager paths).
- Gateway port collision diagnostics (default `18789`).
- Security warnings for open DM policies.
- Gateway auth checks for local token mode (offers token generation when no token source exists; does not overwrite token SecretRef configs).
- vérification de la persistance systemd sur Linux.
- Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncation/proche de la limite pour les fichiers de contexte).
- Vérification de l'état de la complétion du shell et installation/mise à niveau automatique.
- Vérification de l'état de préparation du fournisseur d'embeddings pour la recherche mémoire (modèle local, clé API distante, ou binaire QMD).
- Vérifications de l'installation source (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
- Écrit la configuration mise à jour + les métadonnées de l'assistant.

## Comportement détaillé et justification

### 0) Mise à jour facultative (installations git)

S'il s'agit d'un extraction git et que doctor s'exécute de manière interactive, il propose de
mettre à jour (fetch/rebase/build) avant d'exécuter doctor.

### 1) Normalisation de la configuration

Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction`
sans remplacement spécifique au canal), doctor les normalise dans le
schéma actuel.

Cela inclut les champs plats hérités de Talk. La configuration publique actuelle de Talk est
`talk.provider` + `talk.providers.<provider>`. Doctor réécrit les anciennes formes
`talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` dans la carte du fournisseur.

### 2) Migrations des clés de configuration héritées

Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et demandent
de lancer `openclaw doctor`.

Doctor va :

- Expliquer quelles clés héritées ont été trouvées.
- Afficher la migration qu'il a appliquée.
- Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

Le Gateway exécute également automatiquement les migrations de doctor au démarrage lorsqu'il détecte un
format de configuration hérité, afin que les configurations obsolètes soient réparées sans intervention manuelle.
Les migrations du magasin de tâches cron sont gérées par `openclaw doctor --fix`.

Migrations actuelles :

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de premier niveau
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
- `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
- `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
- `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold`
  → `plugins.entries.voice-call.config.streaming.providers.openai.*`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Pour les channels avec `accounts` nommés mais des valeurs de channel de niveau supérieur à compte unique persistantes, déplacez ces valeurs limitées au compte vers le compte promu choisi pour ce channel (`accounts.default` pour la plupart des channels ; Matrix peut préserver une cible nommée/défaut existante correspondante)
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)

Les avertissements de Doctor incluent également des conseils sur le compte par défaut pour les canaux multi-comptes :

- Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, Doctor avertit que le routage de secours peut choisir un compte inattendu.
- Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, Doctor avertit et répertorie les ID de compte configurés.

### 2b) Remplacements de fournisseur OpenCode

Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go`
manuellement, cela remplace le catalogue intégré OpenCode de `@mariozechner/pi-ai`.
Cela peut forcer les modèles sur la mauvaise API ou annuler les coûts. Doctor avertit pour que vous
puissiez supprimer le remplacement et restaurer le routage + les coûts par modèle de API.

### 2c) Migration du navigateur et préparation Chrome MCP

Si votre configuration de navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, Doctor
la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

- `browser.profiles.*.driver: "extension"` devient `"existing-session"`
- `browser.relayBindHost` est supprimé

Doctor vérifie également le chemin Chrome MCP hôte-local lorsque vous utilisez le profil `defaultProfile:
"user"` or a configured `existing-session` :

- vérifie si Google Chrome est installé sur le même hôte pour les profils
  de connexion automatique par défaut
- vérifie la version de Chrome détectée et avertit lorsqu'elle est inférieure à Chrome 144
- vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par
  exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`
  ou `edge://inspect/#remote-debugging`)

Doctor ne peut pas activer le paramètre côté Chrome pour vous. Chrome MCP local à l'hôte
exige toujours :

- un navigateur basé sur Chromium 144+ sur l'hôte de la passerelle/du nœud
- le navigateur s'exécutant localement
- le débogage à distance activé dans ce navigateur
- l'approbation de la première invite de consentement de connexion dans le navigateur

La préparation ici concerne uniquement les prérequis de connexion locale. Existing-session conserve
les limites de route Chrome MCP actuelles ; les routes avancées comme `responsebody`, l'export
PDF, l'interception des téléchargements et les actions par lot nécessitent toujours un navigateur
géré ou un profil CDP brut.

Cette vérification ne s'applique **pas** à Docker, à l'environnement de bac à sable (sandbox), au navigateur distant (remote-browser) ou à d'autres
flux sans tête (headless). Ceux-ci continuent d'utiliser le CDP brut.

### 2d) Prérequis TLS OAuth

Lorsqu'un profil Codex OpenAI OAuth est configuré, doctor sonde le point de terminaison
d'autorisation OpenAI pour vérifier que la pile TLS locale Node/OpenSSL peut
valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par
exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificat expiré ou auto-signé),
doctor imprime des instructions de correction spécifiques à la plateforme. Sur macOS avec un Node Homebrew,
la solution est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute
même si la passerelle est saine.

### 3) Migrations d'état héritées (structure du disque)

Doctor peut migrer d'anciennes structures sur disque vers la structure actuelle :

- Magasin de sessions + transcriptions :
  - de `~/.openclaw/sessions/` vers `~/.openclaw/agents/<agentId>/sessions/`
- Répertoire de l'agent :
  - de `~/.openclaw/agent/` vers `~/.openclaw/agents/<agentId>/agent/`
- État d'authentification WhatsApp (Baileys) :
  - de l'ancien `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
  - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

Ces migrations sont effectuées au mieux de nos capacités et sont idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités en tant que sauvegardes. La Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage, afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification Gateway est intentionnellement migrée uniquement via `openclaw doctor`. La normalisation du provider/de la provider-map de Talk compare désormais par égalité structurelle, de sorte que les différences liées uniquement à l'ordre des clés ne déclenchent plus de modifications `doctor --fix` répétitives sans effet.

### 3a) Migrations des manifest de plugin hérités

Doctor analyse tous les manifests de plugin installés pour les clés de capacité de premier niveau obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'elles sont trouvées, il propose de les déplacer dans l'objet `contracts` et de réécrire le fichier manifest sur place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.

### 3b) Migrations du magasin cron hérité

Doctor vérifie également le magasin des tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de remplacement) pour les anciennes formes de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

Les nettoyages cron actuels incluent :

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- champs de payload de premier niveau (`message`, `model`, `thinking`, ...) → `payload`
- champs de delivery de premier niveau (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de delivery `provider` du payload → `delivery.channel` explicite
- tâches de repli webhook `notify: true` simples héritées → `delivery.mode="webhook"` explicites avec `delivery.to=cron.webhook`

Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans modifier le comportement. Si une tâche combine le repli de notification hérité avec un mode de livraison non webhook existant, Doctor avertit et laisse cette tâche pour un examen manuel.

### 3c) Nettoyage des verrous de session

Doctor analyse chaque répertoire de session d'agent pour les fichiers de verrou d'écriture obsolètes — fichiers laissés lorsqu'une session s'est terminée anormalement. Pour chaque fichier de verrou trouvé, il signale : le chemin, le PID, si le PID est toujours actif, l'âge du verrou et s'il est considéré comme obsolète (PID mort ou plus vieux que 30 minutes). En mode `--fix` / `--repair`, il supprime automatiquement les fichiers de verrou obsolètes ; sinon, il imprime une note et vous invite à réexécuter avec `--fix`.

### 4) Vérifications d'intégrité de l'état (persistance de la session, routage et sécurité)

Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez les sessions, les informations d'identification, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

Doctor vérifie :

- **Répertoire d'état manquant** : avertit d'une perte d'état catastrophique, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
- **Autorisations du répertoire d'état** : vérifie la possibilité d'écriture ; propose de réparer les autorisations (et émet un indice `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
- **Répertoire d'état macOS synchronisé dans le cloud** : avertit lorsque l'état se résout sous iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes et des conflits de verrouillage/synchronisation.
- **Répertoire d'état Linux SD ou eMMC** : avertit lorsque l'état se résout vers une source de montage `mmcblk*`, car les E/S aléatoires sur SD ou eMMC peuvent être plus lentes et s'user plus rapidement sous les écritures de session et d'informations d'identification.
- **Répertoires de session manquants** : `sessions/` et le répertoire de stockage des sessions sont requis pour conserver l'historique et éviter les plantages `ENOENT`.
- **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des fichiers de transcription manquants.
- **Session principale « JSONL 1-ligne »** : signale lorsque la transcription principale ne contient qu'une seule ligne (l'historique ne s'accumule pas).
- **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent dans les répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut être divisé entre les installations).
- **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter sur l'hôte distant (l'état réside là).
- **Autorisations du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est lisible par le groupe/le monde et propose de le resserrer à `600`.

### 5) Santé de l'auth du modèle (expiration OAuth)

Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons expirent/sont expirés et peut les actualiser en toute sécurité. Si le profil Anthropic/jeton OAuth est obsolète, il suggère une clé Anthropic de l'API ou l'ancien chemin du jeton de configuration Anthropic.
Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive` ignore les tentatives d'actualisation.

Doctor détecte également l'état supprimé et obsolète du Anthropic Claude de CLI. Si d'anciens octets d'identification `anthropic:claude-cli` existent toujours dans `auth-profiles.json`, doctor les reconvertit en profils de jeton/Anthropic OAuth et réécrit les références de modèle `claude-cli/...` obsolètes.
Si les octets ont disparu, doctor supprime la configuration obsolète et imprime les commandes de récupération à la place.

Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

- courts temps d'attente (limites de délai/délais d'attente/échecs d'authentification)
- désactivations plus longues (échecs de facturation/crédit)

### 6) Validation du modèle de hooks

Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au catalogue et à la liste autorisée et avertit lorsqu'elle ne pourra pas être résolue ou si elle n'est pas autorisée.

### 7) Réparation de l'image du bac à sable

Lorsque le bac à sable est activé, doctor vérifie les images Docker et propose de construire ou de passer aux noms hérités si l'image actuelle est manquante.

### 7b) Dépendances d'exécution des plugins groupés

Doctor vérifie que les dépendances d'exécution des plugins groupés (par exemple, les packages d'exécution du plugin Discord) sont présentes à la racine d'installation d'OpenClaw.
S'il en manque, doctor signale les packages et les installe en mode `openclaw doctor --fix` / `openclaw doctor --repair`.

### 8) Migrations de services Gateway et conseils de nettoyage

Doctor détecte les services gateway hérités (launchd/systemd/schtasks) et
propose de les supprimer et d'installer le service OpenClaw en utilisant le port gateway
courant. Il peut également rechercher des services supplémentaires de type gateway et afficher des conseils de nettoyage.
Les services gateway OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas
signalés comme « supplémentaires ».

### 8b) Migration de démarrage Matrix

Lorsqu'un compte de canal Matrix a une migration d'état héritée en attente ou actionnable,
doctor (en mode `--fix` / `--repair`) crée un instantané de pré-migration puis
exécute les étapes de migration de mieux que possible : migration d'état hérité Matrix et préparation
d'état chiffré hérité. Ces deux étapes ne sont pas fatales ; les erreurs sont enregistrées et
le démarrage continue. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification
est entièrement ignorée.

### 9) Avertissements de sécurité

Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou
lorsqu'une stratégie est configurée de manière dangereuse.

### 10) systemd linger (Linux)

S'il s'exécute en tant que service utilisateur systemd, doctor vérifie que le lingering est activé pour que la
gateway reste active après la déconnexion.

### 11) État de l'espace de travail (skills, plugins et répertoires hérités)

Doctor affiche un résumé de l'état de l'espace de travail pour l'agent par défaut :

- **État des Skills** : compte les skills éligibles, ceux dont il manque des prérequis et ceux bloqués par la liste d'autorisation.
- **Répertoires d'espace de travail hérités** : avertit lorsque `~/openclaw` ou d'autres répertoires d'espace de travail hérités
  existent aux côtés de l'espace de travail actuel.
- **État des plugins** : compte les plugins chargés/désactivés/erreur ; liste les ID de plugins pour toute
  erreur ; signale les capacités des plugins groupés.
- **Avertissements de compatibilité des plugins** : signale les plugins qui ont des problèmes de compatibilité avec
  l'environnement d'exécution actuel.
- **Diagnostics des plugins** : expose tous les avertissements ou erreurs de chargement émis par le
  registre de plugins.

### 11b) Taille du fichier d'amorçage

Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`,
`CLAUDE.md`, ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget
de caractères configuré. Il signale les comptes de caractères bruts par rapport aux caractères injectés pour chaque fichier, le pourcentage
de troncation, la cause de la troncation (`max/file` ou `max/total`) et le total de caractères
injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches
de la limite, doctor affiche des conseils pour régler `agents.defaults.bootstrapMaxChars`
et `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Shell completion

Doctor vérifie si la complétion par tabulation est installée pour le shell actuel
(zsh, bash, fish ou PowerShell) :

- Si le profil du shell utilise un modèle de complétion dynamique lent
  (`source <(openclaw completion ...)`), doctor le met à niveau vers la variante
  de fichier en cache plus rapide.
- Si la complétion est configurée dans le profil mais que le fichier cache est manquant,
  doctor régénère le cache automatiquement.
- Si aucune complétion n'est configurée du tout, doctor propose de l'installer
  (mode interactif uniquement ; ignoré avec `--non-interactive`).

Exécutez `openclaw completion --write-state` pour régénérer le cache manuellement.

### 12) Gateway auth checks (local token)

Doctor vérifie la préparation de l'authentification par jeton local du passerelle.

- Si le mode jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
- Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas avec du texte en clair.
- `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

### 12b) Read-only SecretRef-aware repairs

Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide (fail-fast) à l'exécution.

- `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
- Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username` tente d'utiliser les informations d'identification du bot configurées lorsqu'elles sont disponibles.
- Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, Doctor signale que l'identifiant est configuré mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler à tort que le jeton est manquant.

### 13) Vérification de l'état du Gateway + redémarrage

Doctor exécute une vérification de l'état de santé et propose de redémarrer la passerelle lorsqu'elle semble
en mauvaise santé.

### 13b) Préparation de la recherche mémoire

Doctor vérifie si le fournisseur d'intégration de recherche mémoire configuré est prêt
pour l'agent par défaut. Le comportement dépend du backend et du fournisseur configurés :

- **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable.
  Si ce n'est pas le cas, imprime des conseils de réparation incluant le package npm et une option de chemin binaire manuel.
- **Fournisseur local explicite** : vérifie la présence d'un fichier de modèle local ou d'une URL de modèle
  distante/téléchargeable reconnue. Si manquant, suggère de passer à un fournisseur distant.
- **Fournisseur distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est
  présente dans l'environnement ou le stockage d'authentification. Imprime des conseils de réparation actionnables si manquante.
- **Fournisseur automatique** : vérifie d'abord la disponibilité du modèle local, puis essaie chaque fournisseur
  distant dans l'ordre de sélection automatique.

Lorsqu'un résultat de sonde de passerelle est disponible (la passerelle était en bonne santé au moment de la
vérification), Doctor recoupe ce résultat avec la configuration visible par la CLI et note
toute incohérence.

Utilisez `openclaw memory status --deep` pour vérifier la préparation de l'intégration lors de l'exécution.

### 14) Avertissements de statut de canal

Si la passerelle est en bonne santé, Doctor exécute une sonde de statut de canal et signale
les avertissements avec les corrections suggérées.

### 15) Audit et réparation de la configuration du superviseur

Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour
des valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances réseau-online de systemd et
le délai de redémarrage). Lorsqu'il détecte une incohérence, il recommande une mise à jour et peut
réécrire le fichier de service/tâche aux valeurs par défaut actuelles.

Notes :

- `openclaw doctor` demande confirmation avant de réécrire la configuration du superviseur.
- `openclaw doctor --yes` accepte les invites de réparation par défaut.
- `openclaw doctor --repair` applique les corrections recommandées sans invite.
- `openclaw doctor --repair --force` écrase les configurations personnalisées du superviseur.
- Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, le service doctor install/repair valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service supervisor.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré est non résolu, doctor bloque le chemin d'installation/réparation avec des conseils exploitables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
- Pour les unités utilisateur-systemd Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
- Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

### 16) Diagnostics d'exécution + de port Gateway

Doctor inspecte l'exécution du service (PID, dernier état de sortie) et avertit lorsque le
service est installé mais pas réellement en cours d'exécution. Il vérifie également les conflits de port
sur le port de passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà
en cours d'exécution, tunnel SSH).

### 17) Bonnes pratiques d'exécution Gateway

Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par version
(`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp + Telegram nécessitent Node,
et les chemins des gestionnaires de version peuvent se briser après les mises à niveau car le service ne
charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node lorsque
disponible (Homebrew/apt/choco).

### 18) Écriture de config + métadonnées de l'assistant

Doctor persiste toutes les modifications de configuration et appose les métadonnées de l'assistant pour enregistrer
l'exécution de doctor.

### 19) Conseils d'espace de travail (sauvegarde + système de mémoire)

Doctor suggère un système de mémoire d'espace de travail lorsqu'il est manquant et imprime un conseil de sauvegarde
si l'espace de travail n'est pas déjà sous git.

Voir [/concepts/agent-workspace](/en/concepts/agent-workspace) pour un guide complet sur
la structure de l'espace de travail et la sauvegarde git (privée GitHub ou GitLab recommandés).

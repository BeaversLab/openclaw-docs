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
- Avertissements de masquage OAuth de Codex (`models.providers.openai-codex`).
- Vérification des prérequis TLS OAuth pour les profils Codex OAuth OAuth.
- Migration de l'état sur disque hérité (sessions/répertoire agent/auth WhatsApp).
- Migration de la clé de contrat de manifeste de plugin héritée (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Migration du magasin cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de premier niveau, payload `provider`, tâches de secours webhook simples `notify: true`).
- Inspection du fichier de verrouillage de session et nettoyage des verrous périmés.
- Vérifications d'intégrité et d'autorisations de l'état (sessions, transcriptions, répertoire d'état).
- Vérifications des autorisations du fichier de configuration (chmod 600) lors d'une exécution locale.
- Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de refroidissement/désactivation du profil d'authentification.
- Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).
- Réparation de l'image Sandbox lorsque le sandboxing est activé.
- Migration de service héritée et détection de passerelle supplémentaire.
- Migration de l'état hérité du canal Matrix (en mode `--fix` / `--repair`).
- Vérifications de l'exécution de la passerelle (service installé mais non en cours d'exécution ; label launchd mis en cache).
- Avertissements de statut du canal (sondés à partir de la passerelle en cours d'exécution).
- Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
- Vérifications des meilleures pratiques d'exécution de la passerelle (Node vs Gateway, chemins du gestionnaire de versions).
- Diagnostics de collision de ports de la passerelle (`18789` par défaut).
- Avertissements de sécurité pour les stratégies DM ouvertes.
- Vérifications d'authentification de la passerelle pour le mode de jeton local (offre la génération de jeton lorsqu'aucune source de jeton n'existe ; n'écrase pas les configurations SecretRef de jeton).
- Vérification de la persistance systemd sur Linux.
- Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncation/proche de la limite pour les fichiers de contexte).
- Vérification de l'état de complétion du shell et installation/mise à niveau automatiques.
- Vérification de la disponibilité du fournisseur d'intégration pour la recherche mémoire (modèle local, clé API distante, ou binaire QMD).
- Vérifications de l'installation source (incompatibilité d'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
- Écrit la configuration mise à jour + les métadonnées de l'assistant.

## Comportement détaillé et justification

### 0) Mise à jour facultative (installations git)

S'il s'agit d'un extraction git et que doctor s'exécute de manière interactive, il propose de mettre à jour (fetch/rebase/build) avant d'exécuter doctor.

### 1) Normalisation de la configuration

Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction` sans remplacement spécifique au canal), doctor les normalise dans le schéma actuel.

Cela inclut les champs plats hérités de Talk. La configuration publique actuelle de Talk est `talk.provider` + `talk.providers.<provider>`. Doctor réécrit les anciennes formes `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` dans la carte des providers.

### 2) Migrations de clés de configuration héritées

Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent d'exécuter `openclaw doctor`.

Doctor va :

- Expliquer quelles clés héritées ont été trouvées.
- Afficher la migration qu'il a appliquée.
- Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

Le Gateway exécute également automatiquement les migrations du doctor au démarrage lorsqu'il détecte un format de configuration hérité, afin que les configurations obsolètes soient réparées sans intervention manuelle. Les migrations du magasin de tâches cron sont gérées par `openclaw doctor --fix`.

Migrations actuelles :

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de premier niveau
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- hérité `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
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
- Pour les channels avec des `accounts` nommés mais des valeurs de channel de niveau supérieur à compte unique persistantes, déplacez ces valeurs délimitées au compte vers le compte promu choisi pour ce channel (`accounts.default` pour la plupart des channels ; Matrix peut conserver une cible nommée/défaut existante correspondante)
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- remove `browser.relayBindHost` (paramètre de relais d'extension obsolète)

Les avertissements du Docteur incluent également des conseils par défaut de compte pour les canaux multi-comptes :

- Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, le docteur avertit que le routage de secours peut choisir un compte inattendu.
- Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, le docteur avertit et liste les IDs de compte configurés.

### 2b) Remplacements de provider OpenCode

Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go`
manuellement, cela remplace le catalogue OpenCode intégré de `@mariozechner/pi-ai`.
Cela peut forcer les models sur une mauvaise API ou annuler les coûts. Le docteur avertit pour que vous
puissiez supprimer le remplacement et rétablir le routage + les coûts par model de l'API.

### 2c) Migration du navigateur et préparation Chrome MCP

Si votre configuration de navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, le docteur
la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

- `browser.profiles.*.driver: "extension"` devient `"existing-session"`
- `browser.relayBindHost` est supprimé

Le docteur audite également le chemin Chrome MCP hôte-local lorsque vous utilisez le profil `defaultProfile:
"user"` or a configured `existing-session` :

- vérifie si Google Chrome est installé sur le même hôte pour les profils
  de connexion automatique par défaut
- vérifie la version de Chrome détectée et avertit lorsqu'elle est inférieure à Chrome 144
- vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par
  exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  ou `edge://inspect/#remote-debugging`)

Le docteur ne peut pas activer le paramètre côté Chrome pour vous. Le Chrome MCP hôte-local
requiert toujours :

- un navigateur basé sur Chromium 144+ sur l'hôte de passerelle/nœud
- le navigateur exécuté localement
- le débogage à distance activé dans ce navigateur
- approuver la première invite de consentement d'attachement dans le navigateur

La préparation ici concerne uniquement les prérequis d'attachement local. Existing-session conserve les limites de route Chrome MCP actuelles ; les routes avancées comme `responsebody`, l'export PDF, l'interception de téléchargement et les actions par lots nécessitent toujours un navigateur géré ou un profil CDP brut.

Cette vérification ne s'applique **pas** à Docker, sandbox, remote-browser, ou d'autres flux headless. Ceux-ci continuent d'utiliser le CDP brut.

### 2d) Prérequis TLS OAuth

Lorsqu'un profil Codex OpenAI OAuth est configuré, Doctor sonde le point de terminaison d'autorisation OpenAI pour vérifier que la pile TLS Node/OpenSSL locale peut valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificat expiré ou auto-signé), Doctor imprime des instructions de correction spécifiques à la plateforme. Sur macOS avec un Node Homebrew, la correction est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute même si la passerelle est saine.

### 2c) Remplacements du provider OAuth Codex

Si vous avez précédemment ajouté des paramètres de transport hérités OpenAI sous `models.providers.openai-codex`, ils peuvent masquer le chemin du provider OAuth Codex intégré que les nouvelles versions utilisent automatiquement. Doctor avertit lorsqu'il détecte ces anciens paramètres de transport en même temps que OAuth Codex afin que vous puissiez supprimer ou réécrire le remplacement de transport obsolète et récupérer le comportement de routage/secours intégré. Les proxys personnalisés et les remplacements d'en-têtes uniquement sont toujours pris en charge et ne déclenchent pas cet avertissement.

### 3) Migrations d'état héritées (disposition du disque)

Doctor peut migrer les dispositions sur disque plus anciennes vers la structure actuelle :

- Magasin de sessions + transcriptions :
  - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
- Répertoire Agent :
  - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
- État d'authentification WhatsApp (Baileys) :
  - de `~/.openclaw/credentials/*.json` hérité (sauf `oauth.json`)
  - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

Ces migrations sont effectuées au mieux et sont idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités en tant que sauvegardes. Le Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage, afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp n'est migrée intentionnellement que via `openclaw doctor`. La normalisation du fournisseur Talk / de la carte des fournisseurs compare désormais par égalité structurelle, de sorte que les différences liées uniquement à l'ordre des clés ne déclenchent plus de modifications `doctor --fix` répétitives sans effet.

### 3a) Migrations des manifestes de plugins hérités

Doctor analyse tous les manifestes de plugins installés pour trouver des clés de capacité de niveau supérieur obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'il en trouve, il propose de les déplacer vers l'objet `contracts` et de réécrire le fichier manifeste sur place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.

### 3b) Migrations du stockage cron hérité

Doctor vérifie également le stockage des tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de remplacement) pour détecter d'anciennes formes de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

Les nettoyages cron actuels incluent :

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- champs de payload de niveau supérieur (`message`, `model`, `thinking`, ...) → `payload`
- champs de livraison de niveau supérieur (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de livraison `provider` du payload → `delivery.channel` explicite
- tâches de secours webhook héritées simples `notify: true` → explicites `delivery.mode="webhook"` avec `delivery.to=cron.webhook`

Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans
changer le comportement. Si une tâche combine le secours de notification hérité avec un mode
livraison non-webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

### 3c) Nettoyage des verrous de session

Doctor analyse chaque répertoire de session d'agent pour détecter les fichiers de verrouillage d'écriture obsolètes — fichiers laissés
en place lorsqu'une session se termine anormalement. Pour chaque fichier de verrouillage trouvé, il signale :
le chemin, le PID, si le PID est toujours actif, l'âge du verrou et s'il est
considéré comme obsolète (PID mort ou âgé de plus de 30 minutes). En mode `--fix` / `--repair`
il supprime automatiquement les fichiers de verrouillage obsolètes ; sinon, il imprime une note et
vous invite à relancer avec `--fix`.

### 4) Vérifications de l'intégrité de l'état (persistance de la session, routage et sécurité)

Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez
les sessions, les identifiants, les journaux et la configuration (à moins que vous n'ayez des sauvegardes ailleurs).

Doctor vérifie :

- **Répertoire d'état manquant** : avertit d'une perte catastrophique de l'état, invite à recréer
  le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
- **Permissions du répertoire d'état** : vérifie la capacité d'écriture ; propose de réparer les permissions
  (et émet un indice `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
- **Répertoire d'état synchronisé dans le cloud sur macOS** : avertit lorsque l'état se résout sous iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou
  `~/Library/CloudStorage/...` car les chemins soutenus par la synchronisation peuvent provoquer des E/S plus lentes
  et des conflits de verrouillage/synchronisation.
- **Répertoire d'état SD ou eMMC sur Linux** : avertit lorsque l'état se résout à une source de montage `mmcblk*`
  car les E/S aléatoires sur SD ou eMMC peuvent être plus lentes et s'user
  plus rapidement sous les écritures de session et d'identifiants.
- **Répertoires de session manquants** : `sessions/` et le répertoire du magasin de sessions sont
  requis pour conserver l'historique et éviter les plantages `ENOENT`.
- **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des fichiers
  transcription manquants.
- **Session principale « 1-ligne JSONL »** : signale lorsque le transcript principal n'a qu'une
  seule ligne (l'historique ne s'accumule pas).
- **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent sur
  différents répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut
  être divisé entre les installations).
- **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter
  sur l'hôte distant (l'état s'y trouve).
- **Permissions du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est
  lisible par le groupe/le monde et propose de le resserrer à `600`.

### 5) Santé de l'auth du modèle (expiration OAuth)

Doctor inspecte les profils OAuth dans le magasin d'auth, avertit lorsque les jetons expirent
ou sont expirés, et peut les actualiser en toute sécurité. Si le profil
Anthropic/jeton OAuth est périmé, il suggère une clé Anthropic de l'API
ou le chemin setup-token de l'Anthropic.
Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive`
ignore les tentatives d'actualisation.

Doctor signale également les profils d'auth temporairement inutilisables en raison de :

- délais de refroidissement courts (limites de délai/dépassements de délai/échecs d'auth)
- désactivations plus longues (échecs de facturation/crédit)

### 6) Validation du modèle de hooks

Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au
catalogue et à la liste d'autorisation et avertit lorsqu'elle ne pourra pas être résolue ou n'est pas autorisée.

### 7) Réparation de l'image Sandbox

Lorsque le sandboxing est activé, doctor vérifie les images Docker et propose de construire ou
de passer aux noms hérités si l'image actuelle est manquante.

### 7b) Dépendances d'exécution des plugins groupés

Doctor vérifie que les dépendances d'exécution des plugins groupés (par exemple les
paquets d'exécution du plugin Discord) sont présentes à la racine de l'installation OpenClaw.
S'il en manque, doctor signale les paquets et les installe en
mode `openclaw doctor --fix` / `openclaw doctor --repair`.

### 8) Migrations de service Gateway et indications de nettoyage

Doctor détecte les services de passerelle hérités (launchd/systemd/schtasks) et
propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle
actuel. Il peut également rechercher des services similaires à des passerelles supplémentaires et imprimer des indications de nettoyage.
Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas
signalés comme « supplémentaires ».

### 8b) Migration de la Matrix au démarrage

Lorsqu'un compte de canal Matrix dispose d'une migration d'état héritée en attente ou actionable, doctor (en mode `--fix` / `--repair`) crée un instantané de pré-migration puis exécute les étapes de migration au mieux : migration d'état Matrix héritée et préparation d'état chiffré hérité. Les deux étapes ne sont pas fatales ; les erreurs sont consignées et le démarrage se poursuit. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification est entièrement ignorée.

### 9) Avertissements de sécurité

Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou lorsqu'une stratégie est configurée de manière dangereuse.

### 10) Persistance systemd (Linux)

S'il s'exécute en tant que service utilisateur systemd, doctor vérifie que la persistance est activée pour que la passerelle reste active après la déconnexion.

### 11) État de l'espace de travail (skills, plugins et répertoires hérités)

Doctor affiche un résumé de l'état de l'espace de travail pour l'agent par défaut :

- **État des Skills** : compte les skills éligibles, those dont les prérequis manquent et ceux bloqués par la liste d'autorisation.
- **Répertoires d'espace de travail hérités** : avertit lorsque `~/openclaw` ou d'autres répertoires d'espace de travail hérités existent à côté de l'espace de travail actuel.
- **État des plugins** : compte les plugins chargés/désactivés/erreur ; répertorie les ID de plugin pour toute erreur ; signale les capacités des plugins groupés.
- **Avertissements de compatibilité des plugins** : signale les plugins qui ont des problèmes de compatibilité avec l'environnement d'exécution actuel.
- **Diagnostics des plugins** : expose tous les avertissements ou erreurs de chargement émis par le registre de plugins.

### 11b) Taille du fichier d'amorçage

Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`, `CLAUDE.md`, ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget de caractères configuré. Il signale les nombres de caractères bruts par rapport à injectés par fichier, le pourcentage de troncation, la cause de la troncation (`max/file` ou `max/total`), et le total des caractères injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches de la limite, doctor affiche des conseils pour régler `agents.defaults.bootstrapMaxChars` et `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Complétion du shell

Doctor vérifie si la complétion par tabulation est installée pour le shell actuel (zsh, bash, fish ou PowerShell) :

- Si le profil de shell utilise un modèle de complétion dynamique lent
  (`source <(openclaw completion ...)`), doctor le met à niveau vers la variante
  de fichier en cache plus rapide.
- Si la complétion est configurée dans le profil mais que le fichier cache est manquant,
  doctor régénère le cache automatiquement.
- Si aucune complétion n'est configurée du tout, doctor propose de l'installer
  (mode interactif uniquement ; ignoré avec `--non-interactive`).

Exécutez `openclaw completion --write-state` pour régénérer le cache manuellement.

### 12) Vérifications d'authentification Gateway (jeton local)

Doctor vérifie la préparation de l'authentification par jeton de la passerelle locale.

- Si le mode jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
- Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas avec du texte brut.
- `openclaw doctor --generate-gateway-token` force la génération uniquement lorsque aucun SecretRef de jeton n'est configuré.

### 12b) Réparations conscientes des SecretRef en lecture seule

Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide (fail-fast) à l'exécution.

- `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations ciblées de la configuration.
- Exemple : la réparation `allowFrom` / `groupAllowFrom` `@username` du bot Telegram tente d'utiliser les informations d'identification du bot configurées lorsqu'elles sont disponibles.
- Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que l'information d'identification est configurée mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le jeton comme manquant.

### 13) Vérification de santé de la passerelle Gateway + redémarrage

Doctor exécute une vérification de santé et propose de redémarrer la passerelle lorsqu'elle semble
en mauvaise santé.

### 13b) Préparation de la recherche mémoire

Doctor vérifie si le fournisseur d'embeddings de recherche mémoire configuré est prêt
pour l'agent par défaut. Le comportement dépend du backend et du fournisseur configurés :

- **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable.
  Si non, imprime des conseils de réparation incluant le package npm et une option de chemin binaire manuel.
- **Fournisseur local explicite** : recherche un fichier de modèle local ou une URL de modèle
  distant/téléchargeable reconnue. Si manquant, suggère de passer à un fournisseur distant.
- **Fournisseur distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est
  présente dans l'environnement ou le magasin d'authentification. Affiche des conseils de correction exploitables si elle est manquante.
- **Fournisseur automatique** : vérifie d'abord la disponibilité du modèle local, puis essaie chaque fournisseur
  distant dans l'ordre de sélection automatique.

Lorsqu'un résultat de sonde de passerelle est disponible (la passerelle était en bonne santé au moment de la
vérification), doctor recoupe son résultat avec la configuration visible par la CLI et note
toute discordance.

Utilisez `openclaw memory status --deep` pour vérifier la disponibilité de l'incorporation (embedding) à l'exécution.

### 14) Avertissements de statut de canal

Si la passerelle est en bonne santé, doctor exécute une sonde de statut de canal et signale
les avertissements avec les corrections suggérées.

### 15) Audit et réparation de la configuration du superviseur

Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour
des valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances réseau systemd et
le délai de redémarrage). Lorsqu'il détecte une inadéquation, il recommande une mise à jour et peut
réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

Notes :

- `openclaw doctor` demande confirmation avant de réécrire la configuration du superviseur.
- `openclaw doctor --yes` accepte les invites de réparation par défaut.
- `openclaw doctor --repair` applique les corrections recommandées sans invite.
- `openclaw doctor --repair --force` écrase les configurations personnalisées du superviseur.
- Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation/réparation du service doctor valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service superviseur.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré est non résolu, doctor bloque le chemin d'installation/réparation avec des conseils exploitables.
- Si à la fois `gateway.auth.token` et `gateway.auth.password` sont configurés et que `gateway.auth.mode` n'est pas défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
- Pour les unités utilisateur-systemd Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
- Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

### 16) Diagnostics d'exécution et de port de la Gateway

Doctor inspecte le runtime du service (PID, dernier état de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de ports sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).

### 17) Bonnes pratiques d'exécution de Gateway

Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou sur un chemin Node géré par version (`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp et Telegram nécessitent Node, et les chemins des gestionnaires de version peuvent se rompre après les mises à jour car le service ne charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node lorsqu'elle est disponible (Homebrew/apt/choco).

### 18) Écriture de la configuration + métadonnées de l'assistant

Doctor persiste tous les changements de configuration et applique les métadonnées de l'assistant pour enregistrer l'exécution de doctor.

### 19) Conseils d'espace de travail (sauvegarde + système de mémoire)

Doctor suggère un système de mémoire d'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

Voir [/concepts/agent-workspace](/en/concepts/agent-workspace) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (privé GitHub ou GitLab recommandé).

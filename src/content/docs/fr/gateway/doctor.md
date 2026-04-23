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
- Parle de la migration de configuration Talk depuis les champs plats hérités `talk.*` vers `talk.provider` + `talk.providers.<provider>`.
- Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
- Avertissements de substitution de fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Avertissements de masquage Codex OAuth (`models.providers.openai-codex`).
- Vérification des prérequis TLS OAuth pour les profils Codex OAuth OAuth.
- Migration de l'état sur disque hérité (sessions/répertoire agent/auth WhatsApp).
- Migration de la clé de contrat de manifeste de plugin héritée (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Migration du stock cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de premier niveau, payload `provider`, tâches de webhook de repli simple `notify: true`).
- Inspection du fichier de verrouillage de session et nettoyage des verrous périmés.
- Vérifications d'intégrité et d'autorisations de l'état (sessions, transcriptions, répertoire d'état).
- Vérifications des autorisations du fichier de configuration (chmod 600) lors d'une exécution locale.
- Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de refroidissement/désactivation du profil d'authentification.
- Détection de répertoire de workspace supplémentaire (`~/openclaw`).
- Réparation de l'image Sandbox lorsque le sandboxing est activé.
- Migration de service héritée et détection de passerelle supplémentaire.
- Migration de l'état hérité du canal Matrix (en mode `--fix` / `--repair`).
- Vérifications de l'exécution de la passerelle (service installé mais non en cours d'exécution ; label launchd mis en cache).
- Avertissements de statut du canal (sondés à partir de la passerelle en cours d'exécution).
- Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
- Vérifications des meilleures pratiques d'exécution de la passerelle (Node vs Gateway, chemins du gestionnaire de versions).
- Diagnostics de collision de port Gateway (`18789` par défaut).
- Avertissements de sécurité pour les stratégies DM ouvertes.
- Vérifications d'authentification de la passerelle pour le mode de jeton local (offre la génération de jeton lorsqu'aucune source de jeton n'existe ; n'écrase pas les configurations SecretRef de jeton).
- Détection des problèmes d'appairage d'appareils (demandes de premier appairage en attente, mises à niveau de rôle/portée en attente, dérive du cache local du jeton d'appareil obsolète, et dérive d'auth des enregistrements appairés).
- Vérification de la persistance systemd (linger) sur Linux.
- Vérification de la taille du fichier d'amorçage de l'espace de travail (avertissements de troncation/proche de la limite pour les fichiers de contexte).
- Vérification de l'état de complétion du shell et auto-installation/mise à niveau.
- Vérification de la disponibilité du provider d'incorporation pour la recherche mémoire (model local, clé API distante, ou binaire QMD).
- Vérifications de l'installation source (discordance de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
- Écrit la configuration mise à jour + les métadonnées de l'assistant.

## Remplissage (backfill) et réinitialisation de l'interface Dreams

La scène Dreams de l'interface Control inclut les actions **Backfill** (remplissage), **Reset** (réinitialisation), et **Clear Grounded**
pour le flux de travail grounded dreaming. Ces actions utilisent des méthodes RPC de style doctor de la passerelle, mais elles ne font **pas** partie de la réparation/migration CLI de `openclaw doctor`.

Ce qu'elles font :

- **Backfill** analyse les fichiers `memory/YYYY-MM-DD.md` historiques dans l'espace de travail
  actif, exécute la passe de journal REM (grounded), et écrit des entrées de remplissage (backfill)
  réversibles dans `DREAMS.md`.
- **Reset** supprime uniquement ces entrées de journal de remplissage (backfill) marquées de `DREAMS.md`.
- **Clear Grounded** supprime uniquement les entrées à court terme mises en scène et exclusivement grounded qui
  proviennent de la relecture historique et n'ont pas encore accumulé de rappel en direct ou de
  support quotidien.

Ce qu'elles ne font **pas** par elles-mêmes :

- elles ne modifient pas `MEMORY.md`
- elles n'exécutent pas les migrations complètes du doctor
- elles ne mettent pas automatiquement en scène les candidats grounded dans le magasin de promotion
  à court terme en direct, sauf si vous exécutez explicitement d'abord le chemin CLI de mise en scène

Si vous souhaitez que la relecture historique grounded influence la voie de promotion
profonde normale, utilisez plutôt le flux CLI :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Cela met en scène des candidats durables grounded dans le magasin de rêve à court terme tout en
gardant `DREAMS.md` comme surface de révision.

## Comportement détaillé et justification

### 0) Mise à jour facultative (installations git)

S'il s'agit d'un extrait git et que le doctor s'exécute de manière interactive, il propose de
mettre à jour (fetch/rebase/build) avant d'exécuter le doctor.

### 1) Normalisation de la configuration

Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction`
sans une substitution spécifique à un canal), le doctor les normalise dans le schéma
actuel.

Cela inclut les champs plats hérités de Talk. La configuration publique actuelle de Talk est `talk.provider` + `talk.providers.<provider>`. Doctor réécrit les anciennes formes `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` dans la carte du provider.

### 2) Migrations de clés de configuration héritées

Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent d'exécuter `openclaw doctor`.

Doctor va :

- Expliquer quelles clés héritées ont été trouvées.
- Afficher la migration qu'il a appliquée.
- Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

Le Gateway exécute également automatiquement les migrations de doctor au démarrage lorsqu'il détecte un format de configuration hérité, de sorte que les configurations obsolètes sont réparées sans intervention manuelle. Les migrations du magasin de tâches Cron sont gérées par `openclaw doctor --fix`.

Migrations actuelles :

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de premier niveau
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` hérités → `talk.provider` + `talk.providers.<provider>`
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
- Pour les channels avec des `accounts` nommés mais des valeurs de channel de premier niveau à compte unique persistantes, déplacez ces valeurs limitées au compte vers le compte promu choisi pour ce channel (`accounts.default` pour la plupart des channels ; Matrix peut préserver une cible nommée/défaut existante correspondante)
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)

Les avertissements de Doctor incluent également des conseils sur le compte par défaut pour les channels multi-comptes :

- Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ou `accounts.default`, Doctor avertit que le routage de secours peut sélectionner un compte inattendu.
- Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, Doctor avertit et répertorie les ID de compte configurés.

### 2b) Remplacements de fournisseur OpenCode

Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go`
manuellement, cela remplace le catalogue OpenCode intégré de `@mariozechner/pi-ai`.
Cela peut forcer les modèles vers une mauvaise API ou annuler les coûts. Doctor avertit afin que
vous puissiez supprimer le remplacement et rétablir le routage et les coûts par modèle de API.

### 2c) Migration du navigateur et préparation Chrome MCP

Si la configuration de votre navigateur pointe toujours vers le chemin de l'extension Chrome supprimé, Doctor
la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

- `browser.profiles.*.driver: "extension"` devient `"existing-session"`
- `browser.relayBindHost` est supprimé

Doctor audit également le chemin Chrome MCP hôte-local lorsque vous utilisez le profil `defaultProfile:
"user"` or a configured `existing-session` :

- vérifie si Google Chrome est installé sur le même hôte pour les profils
  de connexion automatique par défaut
- vérifie la version de Chrome détectée et avertit lorsqu'elle est inférieure à Chrome 144
- vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par
  exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`
  ou `edge://inspect/#remote-debugging`)

Doctor ne peut pas activer le paramètre côté Chrome pour vous. Chrome MCP hôte-local
nécessite toujours :

- un navigateur basé sur Chromium 144+ sur l'hôte de passerelle/nœud
- le navigateur s'exécutant localement
- le débogage à distance activé dans ce navigateur
- l'approbation de la première invite de consentement d'attachement dans le navigateur

La préparation ici concerne uniquement les prérequis d'attachement local. Existing-session conserve
les limites de routage Chrome MCP actuelles ; les itinéraires avancés comme `responsebody`, l'export
PDF, l'interception de téléchargement et les actions par lots nécessitent toujours un navigateur
géré ou un profil CDP brut.

Cette vérification ne s'applique **pas** à Docker, sandbox, remote-browser ou autres
flux sans tête. Ceux-ci continuent d'utiliser le CDP brut.

### 2d) Prérequis TLS OAuth

Lorsqu'un profil Codex OAuth OpenAI est configuré, le docteur sonde le point de terminaison d'autorisation OAuth pour vérifier que la pile TLS locale Node/OpenSSL peut valider la chaîne de certificats. Si la sonde échoue avec une erreur de certificat (par exemple `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificat expiré ou auto-signé), le docteur imprime des conseils de réparation spécifiques à la plate-forme. Sur OpenAI avec un Node Homebrew, la correction est généralement `brew postinstall ca-certificates`. Avec `--deep`, la sonde s'exécute même si la passerelle est saine.

### 2c) Remplacements du fournisseur Codex OAuth

Si vous avez précédemment ajouté des paramètres de transport hérités OpenAI sous `models.providers.openai-codex`, ils peuvent masquer le chemin du fournisseur Codex OAuth intégré que les nouvelles versions utilisent automatiquement. Le docteur avertit lorsqu'il voit ces anciens paramètres de transport à côté de Codex OAuth afin que vous puissiez supprimer ou réécrire le remplacement de transport obsolète et récupérer le comportement de routage/secours intégré. Les proxies personnalisés et les remplacements d'en-têtes uniquement sont toujours pris en charge et ne déclenchent pas cet avertissement.

### 3) Migrations d'état héritées (disposition du disque)

Le docteur peut migrer les dispositions sur disque plus anciennes vers la structure actuelle :

- Magasin de sessions + transcriptions :
  - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
- Répertoire de l'agent :
  - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
- État d'authentification WhatsApp (Baileys) :
  - de l'ancien `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
  - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

Ces migrations sont de type « best-effort » (au mieux) et idempotentes ; le docteur émettra des avertissements lorsqu'il laisse des dossiers hérités en tant que sauvegardes. Le Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage, de sorte que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle du docteur. L'authentification WhatsApp est intentionnellement migrée uniquement via `openclaw doctor`. La normalisation du fournisseur/de la carte de fournisseur Talk compare désormais par égalité structurelle, de sorte que les différences basées uniquement sur l'ordre des clés ne déclenchent plus de modifications `doctor --fix` répétées sans effet.

### 3a) Migrations de manifeste de plugin héritées

Doctor analyse tous les manifests de plugins installés pour rechercher des clés de capacité de niveau supérieur obsolètes (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Lorsqu'il en trouve, il propose de les déplacer dans l'objet `contracts` et de réécrire le fichier manifest en place. Cette migration est idempotente ; si la clé `contracts` possède déjà les mêmes valeurs, la clé héritée est supprimée sans dupliquer les données.

### 3b) Migrations du magasin cron hérité

Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de substitution) pour détecter d'anciennes structures de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

Les nettoyages cron actuels incluent :

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- champs de payload de niveau supérieur (`message`, `model`, `thinking`, ...) → `payload`
- champs de livraison de niveau supérieur (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de livraison `provider` du payload → `delivery.channel` explicite
- tâches de repli webhook `notify: true` héritées simples → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans modifier le comportement. Si une tâche combine le repli de notification hérité avec un mode de livraison non-webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

### 3c) Nettoyage des verrous de session

Doctor analyse chaque répertoire de session d'agent pour détecter les fichiers de verrouillage d'écriture obsolètes — fichiers laissés en place lorsqu'une session se termine anormalement. Pour chaque fichier de verrou trouvé, il signale : le chemin, le PID, si le PID est toujours actif, l'âge du verrou et s'il est considéré comme obsolète (PID mort ou âgé de plus de 30 minutes). En mode `--fix` / `--repair`, il supprime automatiquement les fichiers de verrou obsolètes ; sinon, il imprime une note et vous invite à relancer avec `--fix`.

### 4) Vérifications de l'intégrité de l'état (persistance de la session, routage et sécurité)

Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez les sessions, les identifiants, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

Doctor vérifie :

- **Répertoire d'état manquant** : avertit d'une perte catastrophique de l'état, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
- **Autorisations du répertoire d'état** : vérifie la possibilité d'écriture ; propose de réparer les autorisations (et émet un indice `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
- **Répertoire d'état synchronisé dans le cloud macOS** : avertit lorsque l'état se résout sous iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes et des courses de verrouillage/synchronisation.
- **Répertoire d'état SD ou eMMC Linux** : avertit lorsque l'état se résout vers une source de montage `mmcblk*`, car les E/S aléatoires sauvegardées sur SD ou eMMC peuvent être plus lentes et s'user plus rapidement sous les écritures de session et d'identifiants.
- **Répertoires de session manquants** : `sessions/` et le répertoire de stockage de session sont requis pour conserver l'historique et éviter les plantages `ENOENT`.
- **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des fichiers de transcription manquants.
- **Session principale « 1-ligne JSONL »** : signale lorsque la transcription principale n'a qu'une seule ligne (l'historique ne s'accumule pas).
- **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent sur différents répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut être divisé entre les installations).
- **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter sur l'hôte distant (l'état s'y trouve).
- **Autorisations du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est
  lisible par le groupe/le monde et propose de le resserrer à `600`.

### 5) Santé de l'authentification du modèle (expiration OAuth)

Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons
expirent/sont expirés et peut les actualiser en toute sécurité. Si le profil
Anthropic/jeton OAuth est obsolète, il suggère une clé Anthropic API ou le
chemin du jeton de configuration Anthropic.
Les invites d'actualisation n'apparaissent que lors de l'exécution interactive (TTY) ; `--non-interactive`
ignore les tentatives d'actualisation.

Lorsqu'une actualisation OAuth échoue de manière permanente (par exemple `refresh_token_reused`,
`invalid_grant`, ou un provider vous demandant de vous reconnecter), doctor signale
qu'une réauthentification est requise et imprime la commande exacte `openclaw models auth login --provider ...`
à exécuter.

Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

- courts temps de recharge (limites de délai/délais d'attente/échecs d'authentification)
- désactivations plus longues (échecs de facturation/crédit)

### 6) Validation du modèle de Hooks

Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au
catalogue et à la liste d'autorisation et avertit lorsqu'elle ne pourra pas être résolue ou est interdite.

### 7) Réparation de l'image Sandbox

Lorsque le sandboxing est activé, doctor vérifie les images Docker et propose de construire ou
de passer aux noms hérités si l'image actuelle est manquante.

### 7b) Dépendances d'exécution des plugins groupés

Doctor vérifie les dépendances d'exécution uniquement pour les plugins groupés qui sont actifs dans
la configuration actuelle ou activés par leur valeur par défaut du manifeste groupé, par exemple
`plugins.entries.discord.enabled: true`, `channels.discord.enabled: true` hérité,
ou un provider groupé activé par défaut. S'il en
manque, doctor signale les packages et les installe en
mode `openclaw doctor --fix` / `openclaw doctor --repair`. Les plugins externes utilisent
toujours `openclaw plugins install` / `openclaw plugins update` ; doctor n'installe
pas de dépendances pour les chemins de plugin arbitraires.

### 8) Migrations du service Gateway et indices de nettoyage

Doctor détecte les services de passerelle hérités (launchd/systemd/schtasks) et
propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle
courant. Il peut également scanner les services similaires à des passerelles supplémentaires et afficher des indices de nettoyage.
Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas
signalés comme « supplémentaires ».

### 8b) Migration de la matrice de démarrage

Lorsqu'un compte de canal Matrix a une migration d'état héritée en attente ou actionnable,
le doctor (en mode `--fix` / `--repair`) crée un instantané de pré-migration puis
exécute les étapes de migration de meilleur effort : migration d'état Matrix hérité et préparation
d'état chiffré hérité. Ces deux étapes ne sont pas fatales ; les erreurs sont enregistrées et
le démarrage se poursuit. En mode lecture seule (`openclaw doctor` sans `--fix`), cette vérification
est entièrement ignorée.

### 8c) Jumelage d'appareil et dérive d'authentification

Doctor inspecte maintenant l'état du jumelage d'appareil dans le cadre de la vérification de santé normale.

Ce qu'il signale :

- demandes de jumelage initial en attente
- mises à niveau de rôle en attente pour les appareils déjà jumelés
- mises à niveau de portée en attente pour les appareils déjà jumelés
- réparations de discordance de clé publique où l'identifiant de l'appareil correspond toujours mais l'identité
  de l'appareil ne correspond plus à l'enregistrement approuvé
- enregistrements jumelés manquant un jeton actif pour un rôle approuvé
- jetons jumelés dont les portées dépassent la ligne de base de jumelage approuvée
- entrées locales en cache de jetons d'appareil pour la machine actuelle qui précèdent une
  rotation de jeton côté passerelle ou transportent des métadonnées de portée périmées

Doctor n'approuve pas automatiquement les demandes de jumelage ni ne fait pivoter automatiquement les jetons d'appareil. Il
imprime les étapes exactes suivantes à la place :

- inspecter les demandes en attente avec `openclaw devices list`
- approuver la demande exacte avec `openclaw devices approve <requestId>`
- faire pivoter un nouveau jeton avec `openclaw devices rotate --device <deviceId> --role <role>`
- supprimer et réapprouver un enregistrement périmé avec `openclaw devices remove <deviceId>`

Cela comble le problème courant « déjà jumelé mais nécessitant toujours un jumelage » :
le doctor distingue maintenant le jumelage initial des mises à niveau de rôle/portée en attente et de la dérive
d'identité de jeton/d'appareil périmée.

### 9) Avertissements de sécurité

Doctor émet des avertissements lorsqu'un fournisseur est ouvert aux DMs sans liste blanche, ou
lorsqu'une stratégie est configurée de manière dangereuse.

### 10) systemd linger (Linux)

S'il est exécuté en tant que service utilisateur systemd, doctor s'assure que la persistance est activée pour que la gateway reste active après la déconnexion.

### 11) Statut de l'espace de travail (skills, plugins et répertoires hérités)

Doctor imprime un résumé de l'état de l'espace de travail pour l'agent par défaut :

- **Statut des Skills** : compte les skills éligibles, ceux dont il manque des prérequis et ceux bloqués par la liste d'autorisation.
- **Répertoires de l'espace de travail hérités** : avertit lorsque `~/openclaw` ou d'autres répertoires de l'espace de travail hérités existent à côté de l'espace de travail actuel.
- **Statut des plugins** : compte les plugins chargés/désactivés/erreur ; répertorie les ID de plugins pour toute erreur ; signale les capacités des plugins groupés.
- **Avertissements de compatibilité des plugins** : signale les plugins qui ont des problèmes de compatibilité avec le runtime actuel.
- **Diagnostics des plugins** : affiche tous les avertissements ou erreurs de chargement émis par le registre de plugins.

### 11b) Taille du fichier d'amorçage

Doctor vérifie si les fichiers d'amorçage de l'espace de travail (par exemple `AGENTS.md`, `CLAUDE.md` ou d'autres fichiers de contexte injectés) sont proches ou dépassent le budget de caractères configuré. Il signale les comptes de caractères bruts par rapport à injectés par fichier, le pourcentage de troncature, la cause de la troncature (`max/file` ou `max/total`) et le total des caractères injectés en fraction du budget total. Lorsque les fichiers sont tronqués ou proches de la limite, doctor imprime des conseils pour régler `agents.defaults.bootstrapMaxChars` et `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Complétion du shell

Doctor vérifie si la complétion par tabulation est installée pour le shell actuel (zsh, bash, fish ou PowerShell) :

- Si le profil du shell utilise un modèle de complétion dynamique lent (`source <(openclaw completion ...)`), doctor le met à niveau vers la variante de fichier en cache plus rapide.
- Si la complétion est configurée dans le profil mais que le fichier cache est manquant, doctor régénère automatiquement le cache.
- Si aucune complétion n'est configurée du tout, doctor propose de l'installer (mode interactif uniquement ; ignoré avec `--non-interactive`).

Exécutez `openclaw completion --write-state` pour régénérer le cache manuellement.

### 12) Vérifications d'authentification de la Gateway (jeton local)

Doctor vérifie l'état de préparation de l'authentification par jeton de la passerelle locale.

- Si le mode jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
- Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas en texte clair.
- `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de token n'est configuré.

### 12b) Réparations conscientes de SecretRef en lecture seule

Certains flux de réparation doivent inspecter les identifiants configurés sans affaiblir le comportement d'échec rapide (fail-fast) à l'exécution.

- `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
- Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username` essaie d'utiliser les identifiants de bot configurés lorsqu'ils sont disponibles.
- Si le token du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que l'identifiant est configuré mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le token comme manquant.

### 13) Vérification de santé du Gateway + redémarrage

Doctor exécute une vérification de santé et propose de redémarrer la passerelle lorsqu'elle semble
en mauvaise santé.

### 13b) Préparation de la recherche de mémoire

Doctor vérifie si le provider d'incorporation (embedding) de recherche de mémoire configuré est prêt
pour l'agent par défaut. Le comportement dépend du backend et du provider configurés :

- **Backend QMD** : sonde si le binaire `qmd` est disponible et démarrable.
  Si ce n'est pas le cas, imprime des conseils de réparation, y compris le package npm et une option de chemin binaire manuel.
- **Provider local explicite** : recherche un fichier de modèle local ou une URL de modèle
  distant/téléchargeable reconnue. Si manquant, suggère de passer à un provider distant.
- **Provider distant explicite** (`openai`, `voyage`, etc.) : vérifie qu'une clé API est
  présente dans l'environnement ou le stockage d'authentification. Imprime des conseils de réparation exploitables si elle est manquante.
- **Provider automatique** : vérifie d'abord la disponibilité du modèle local, puis essaie chaque provider
  distant dans l'ordre de sélection automatique.

Lorsqu'un résultat de sonde de passerelle est disponible (la passerée était en bonne santé au moment de la
vérification), doctor recoupe ce résultat avec la configuration visible CLI et note
toute divergence.

Utilisez `openclaw memory status --deep` pour vérifier la préparation de l'incorporation (embedding) à l'exécution.

### 14) Avertissements de statut de canal

Si la passerelle est saine, le docteur exécute une sonde de statut de canal et signale des avertissements avec des corrections suggérées.

### 15) Audit et réparation de la configuration du superviseur

Le docteur vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances network-online de systemd et le délai de redémarrage). Lorsqu'il détecte une incohérence, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

Notes :

- `openclaw doctor` invite à confirmer avant de réécrire la configuration du superviseur.
- `openclaw doctor --yes` accepte les invites de réparation par défaut.
- `openclaw doctor --repair` applique les corrections recommandées sans invite.
- `openclaw doctor --repair --force` écrase les configurations personnalisées du superviseur.
- Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation/la réparation du service docteur valide le SecretRef mais ne persiste pas les valeurs de jeton en texte clair résolues dans les métadonnées d'environnement du service superviseur.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré est non résolu, le docteur bloque le chemin d'installation/réparation avec des conseils actionnables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, le docteur bloque l'installation/la réparation jusqu'à ce que le mode soit défini explicitement.
- Pour les unités systemd utilisateur Linux, les vérifications de dérive de jeton du docteur incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
- Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

### 16) Diagnostics d'exécution et de port Gateway

Le docteur inspecte l'exécution du service (PID, dernier statut de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de port sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).

### 17) Bonnes pratiques d'exécution Gateway

Doctor avertit lorsque le service de la passerelle s'exécute sur Bun ou un chemin Node géré par version
(`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp + Telegram nécessitent Node,
et les chemins des gestionnaires de version peuvent se rompre après les mises à niveau car le service ne
charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node lorsque
disponible (Homebrew/apt/choco).

### 18) Écriture de la configuration + métadonnées de l'assistant

Doctor persiste toutes les modifications de configuration et applique les métadonnées de l'assistant pour enregistrer
l'exécution de doctor.

### 19) Conseils d'espace de travail (sauvegarde + système de mémoire)

Doctor suggère un système de mémoire d'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde
si l'espace de travail n'est pas déjà sous git.

Voir [/concepts/agent-workspace](/fr/concepts/agent-workspace) pour un guide complet sur
la structure de l'espace de travail et la sauvegarde git (GitHub privé ou GitLab recommandé).

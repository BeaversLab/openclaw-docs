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
- Résumé de l'état des Skills (éligibles/manquantes/bloquées).
- Normalisation de la configuration pour les valeurs héritées.
- La migration du navigateur vérifie les configurations obsolètes de l'extension Chrome et la préparation de Chrome MCP.
- Avertissements de remplacement du fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Migration de l'état sur disque obsolète (sessions/répertoire agent/authentification WhatsApp).
- Migration du magasin cron obsolète (`jobId`, `schedule.cron`, champs de livraison/payload de niveau supérieur, payload `provider`, tâches de repli webhook simple `notify: true`).
- Vérifications de l'intégrité et des permissions de l'état (sessions, transcriptions, répertoire d'état).
- Vérifications des permissions du fichier de configuration (chmod 600) lors d'une exécution locale.
- Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de refroidissement/désactivation du profil d'authentification.
- Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).
- Réparation de l'image Sandbox lorsque le bac à sable est activé.
- Migration de service obsolète et détection de passerelle supplémentaire.
- Vérifications d'exécution de la Gateway (service installé mais non en cours d'exécution ; label launchd mis en cache).
- Avertissements de statut du canal (sondés à partir de la passerelle en cours d'exécution).
- Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
- Vérifications des meilleures pratiques d'exécution de la Gateway (Node vs Bun, chemins du gestionnaire de versions).
- Diagnostics de collision de port de Gateway (`18789` par défaut).
- Avertissements de sécurité pour les stratégies DM ouvertes.
- Vérifications d'authentification de la Gateway pour le mode de jeton local (offre la génération de jeton lorsqu'aucune source de jeton n'existe ; ne remplace pas les configurations de SecretRef de jeton).
- Vérification de la persistance systemd sur Linux.
- Vérifications de l'installation source (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
- Écrit la configuration mise à jour + les métadonnées de l'assistant.

## Comportement détaillé et justification

### 0) Mise à jour facultative (installations git)

S'il s'agit d'une extraction git et que doctor s'exécute de manière interactive, il propose de
mettre à jour (fetch/rebase/build) avant d'exécuter doctor.

### 1) Normalisation de la configuration

Si la configuration contient des formes de valeurs obsolètes (par exemple `messages.ackReaction`
sans remplacement spécifique au canal), doctor les normalise dans le schéma
actuel.

### 2) Migrations de clés de configuration obsolètes

Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et demandent
d'exécuter `openclaw doctor`.

Doctor va :

- Expliquer quelles clés obsolètes ont été trouvées.
- Afficher la migration appliquée.
- Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

Le Gateway exécute également automatiquement les migrations du docteur au démarrage lorsqu'il détecte un format de configuration obsolète, afin que les configurations périmées soient réparées sans intervention manuelle.

Migrations actuelles :

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de niveau supérieur
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Pour les channels avec un `accounts` nommé mais sans `accounts.default`, déplacer les valeurs de channel de compte unique de niveau supérieur dans `channels.<channel>.accounts.default` si elles sont présentes
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)

Les avertissements du docteur incluent également des conseils de compte par défaut pour les channels multi-comptes :

- Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ou `accounts.default`, doctor avertit que le routage de secours peut choisir un compte inattendu.
- Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, doctor avertit et liste les IDs de compte configurés.

### 2b) Remplacements de fournisseur OpenCode

Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go`
manuellement, cela remplace le catalogue OpenCode intégré de `@mariozechner/pi-ai`.
Cela peut forcer les models vers la mauvaise API ou annuler les coûts. Doctor avertit afin que
vous puissiez supprimer le remplacement et restaurer le routage + les coûts par model de API.

### 2c) Migration du navigateur et préparation Chrome MCP

Si votre configuration de navigateur pointe toujours vers le chemin de l'extension Chrome supprimée, doctor
la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

- `browser.profiles.*.driver: "extension"` devient `"existing-session"`
- `browser.relayBindHost` est supprimé

Doctor audit également le chemin Chrome MCP hôte-local lorsque vous utilisez le profil `defaultProfile:
"user"` or a configured `existing-session` :

- vérifie si Google Chrome est installé sur le même hôte pour les profils
  de connexion automatique par défaut
- vérifie la version de Chrome détectée et avertit lorsqu'elle est inférieure à Chrome 144
- vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par
  exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  ou `edge://inspect/#remote-debugging`)

Doctor ne peut pas activer le paramètre côté Chrome pour vous. Chrome MCP hôte-local
requiert toujours :

- un navigateur basé sur Chromium 144+ sur l'hôte de passerelle/nœud
- le navigateur exécuté localement
- le débogage à distance activé dans ce navigateur
- l'approbation de la première invite de consentement d'attachement dans le navigateur

Cette vérification ne s'applique **pas** à Docker, sandbox, remote-browser ou autres
flux sans tête. Ceux-ci continuent d'utiliser le CDP brut.

### 3) Migrations d'état héritées (disposition du disque)

Doctor peut migrer d'anciennes dispositions sur disque vers la structure actuelle :

- Store de Sessions + transcripts :
  - de `~/.openclaw/sessions/` vers `~/.openclaw/agents/<agentId>/sessions/`
- Répertoire Agent :
  - de `~/.openclaw/agent/` vers `~/.openclaw/agents/<agentId>/agent/`
- État d'authentification WhatsApp (Baileys) :
  - à partir de `~/.openclaw/credentials/*.json` hérité (sauf `oauth.json`)
  - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

Ces migrations sont de type « best-effort » et idempotentes ; doctor émettra des avertissements lorsqu'il laisse des dossiers hérités en tant que sauvegardes. Le Gateway/CLI migre également automatiquement les sessions héritées + le répertoire de l'agent au démarrage, afin que l'historique/l'authentification/les modèles atterrissent dans le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp est migrée intentionnellement uniquement via `openclaw doctor`.

### 3b) Migrations du magasin cron hérité

Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut, ou `cron.store` en cas de remplacement) pour détecter les anciens formats de tâches que le planificateur accepte toujours pour des raisons de compatibilité.

Les nettoyages cron actuels incluent :

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- champs de payload de niveau supérieur (`message`, `model`, `thinking`, ...) → `payload`
- champs de livraison de niveau supérieur (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de livraison `provider` du payload → `delivery.channel` explicite
- tâches de repli webhook `notify: true` héritées simples → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans modifier le comportement. Si une tâche combine le repli de notification hérité avec un mode de livraison non-webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

### 4) Vérifications de l'intégrité de l'état (persistance de la session, routage et sécurité)

Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez les sessions, les identifiants, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

Doctor vérifie :

- **Répertoire d'état manquant** : avertit d'une perte catastrophique d'état, invite à recréer le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
- **Autorisations du répertoire d'état** : vérifie la capacité d'écriture ; propose de réparer les autorisations
  (et émet un indice `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
- **Répertoire d'état synchronisé via le cloud sur macOS** : avertit lorsque l'état est résolu sous iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou
  `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes
  et des conflits de verrouillage/synchronisation.
- **Répertoire d'état SD ou eMMC sur Linux** : avertit lorsque l'état est résolu vers une source de montage `mmcblk*`
  , car les E/S aléatoires sur SD ou eMMC peuvent être plus lentes et s'user
  plus rapidement avec les écritures de session et d'identifiants.
- **Répertoires de session manquants** : `sessions/` et le répertoire du magasin de sessions sont
  requis pour persister l'historique et éviter les plantages `ENOENT`.
- **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des fichiers
  de transcription manquants.
- **« 1-ligne JSONL » de la session principale** : signale lorsque la transcription principale n'a qu'une seule
  ligne (l'historique ne s'accumule pas).
- **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent sur
  différents répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut
  être divisé entre les installations).
- **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter
  sur l'hôte distant (l'état s'y trouve).
- **Autorisations du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est
  lisible par le groupe/le monde et propose de le resserrer à `600`.

### 5) Santé de l'auth du modèle (expiration OAuth)

Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons expirent
sont expirants/expirés, et peut les actualiser en toute sécurité. Si le profil Claude Code de Anthropic
est obsolète, il suggère d'exécuter `claude setup-token` (ou de coller un jeton de configuration).
Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive`
saute les tentatives d'actualisation.

Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

- courts temps de recharge (limites de délai/expire/d'échecs d'authentification)
- désactivations plus longues (échecs de facturation/crédit)

### 6) Validation du modèle de hooks

Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au
catalogue et à la liste d'autorisation et avertit lorsqu'elle ne pourra pas être résolue ou si elle est interdite.

### 7) Réparation de l'image de bac à sable

Lorsque le sandboxing est activé, doctor vérifie les images Docker et propose de les construire ou de passer aux noms hérités si l'image actuelle est manquante.

### 8) Migrations et conseils de nettoyage des services Gateway

Doctor détecte les services de passerelle hérités (launchd/systemd/schtasks) et propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle actuel. Il peut également scanner les services similaires à des passerelles supplémentaires et imprimer des conseils de nettoyage. Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont pas signalés comme « supplémentaires ».

### 9) Avertissements de sécurité

Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou lorsqu'une stratégie est configurée de manière dangereuse.

### 10) systemd linger (Linux)

S'il s'exécute en tant que service utilisateur systemd, doctor s'assure que la fonctionnalité linger est activée pour que la passerelle reste active après la déconnexion.

### 11) Statut des Skills

Doctor imprime un bref résumé des compétences éligibles/manquantes/bloquées pour l'espace de travail actuel.

### 12) Vérifications d'authentification Gateway (jeton local)

Doctor vérifie la disponibilité de l'authentification par jeton de la passerelle locale.

- Si le mode jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
- Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas en texte clair.
- `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

### 12b) Réparations conscientes de SecretRef en lecture seule

Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide à l'exécution.

- `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
- Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username` tente d'utiliser les informations d'identification du bot configurées lorsqu'elles sont disponibles.
- Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que les informations d'identification sont configurées mais indisponibles et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le jeton comme manquant.

### 13) Vérification de santé + redémarrage Gateway

Doctor exécute une vérification de santé et propose de redémarrer la passerelle lorsqu'elle semble non saine.

### 14) Avertissements de statut de canal

Si la passerelle est saine, doctor exécute une sonde de statut de canal et signale les avertissements avec les corrections suggérées.

### 15) Audit et réparation de la configuration du superviseur

Doctor vérifie la configuration du superviseur installé (launchd/systemd/schtasks) pour détecter les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances network-online de systemd et le délai de redémarrage). Lorsqu'il détecte une inadéquation, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

Notes :

- `openclaw doctor` demande une confirmation avant de réécrire la configuration du superviseur.
- `openclaw doctor --yes` accepte les invites de réparation par défaut.
- `openclaw doctor --repair` applique les corrections recommandées sans invite.
- `openclaw doctor --repair --force` écrase les configurations personnalisées du superviseur.
- Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation ou la réparation du service doctor valide la SecretRef mais ne persiste pas les valeurs de jeton en texte clair résolues dans les métadonnées d'environnement du service superviseur.
- Si l'authentification par jeton nécessite un jeton et que la SecretRef configurée pour le jeton n'est pas résolue, doctor bloque le chemin d'installation/réparation avec des conseils exploitables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit explicitement défini.
- Pour les unités user-systemd Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
- Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

### 16) Diagnostics d'exécution et de port du Gateway

Doctor inspecte l'exécution du service (PID, dernier état de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les conflits de ports sur le port de passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).

### 17) Bonnes pratiques d'exécution du Gateway

Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par une version
(`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp + Telegram nécessitent Node,
et les chemins des gestionnaires de version peuvent se briser après les mises à niveau car le service ne
charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node si
elle est disponible (Homebrew/apt/choco).

### 18) Écriture de configuration + métadonnées de l'assistant

Doctor persiste tous les changements de configuration et appose les métadonnées de l'assistant pour enregistrer
l'exécution de doctor.

### 19) Conseils d'espace de travail (sauvegarde + système de mémoire)

Doctor suggère un système de mémoire d'espace de travail lorsqu'il est manquant et imprime un conseil de sauvegarde
si l'espace de travail n'est pas déjà sous git.

Voir [/concepts/agent-workspace](/fr/concepts/agent-workspace) pour un guide complet sur
la structure de l'espace de travail et la sauvegarde git (GitHub privé ou GitLab recommandé).

import fr from "/components/footer/fr.mdx";

<fr />

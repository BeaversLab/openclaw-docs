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
- Avertissements de substitution de fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Migration d'état héritée sur disque (sessions/répertoire de l'agent/authentification WhatsApp).
- Migration de stockage cron héritée (`jobId`, `schedule.cron`, champs de livraison/payload de premier niveau, payload `provider`, travaux de secours webhook simples `notify: true`).
- Vérifications de l'intégrité et des permissions de l'état (sessions, transcriptions, répertoire d'état).
- Vérifications des permissions du fichier de configuration (chmod 600) lors d'une exécution locale.
- Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les jetons expirants et signale les états de temps de recharge/désactivation du profil d'authentification.
- Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).
- Réparation de l'image Sandbox lorsque le sandboxing est activé.
- Migration du service hérité et détection de Gateway supplémentaire.
- Vérifications de l'exécution du Gateway (service installé mais non en cours d'exécution ; label launchd mis en cache).
- Avertissements de l'état du channel (sondé à partir du Gateway en cours d'exécution).
- Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
- Vérifications des meilleures pratiques d'exécution du Gateway (Node vs Bun, chemins du gestionnaire de versions).
- Diagnostics de collision de port du Gateway (par défaut `18789`).
- Avertissements de sécurité pour les stratégies DM ouvertes.
- Vérifications d'authentification du Gateway pour le mode de jeton local (propose la génération de jeton lorsqu'aucune source de jeton n'existe ; ne remplace pas les configurations de SecretRef de jeton).
- Vérification de la persistance systemd sur Linux.
- Vérifications de l'installation à partir des sources (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
- Écrit la configuration mise à jour + les métadonnées de l'assistant.

## Comportement détaillé et justification

### 0) Mise à jour facultative (installations git)

S'il s'agit d'un extraction git et que doctor s'exécute de manière interactive, il propose de
mettre à jour (fetch/rebase/build) avant d'exécuter doctor.

### 1) Normalisation de la configuration

Si la configuration contient des formes de valeurs héritées (par exemple `messages.ackReaction`
sans remplacement spécifique au channel), doctor les normalise dans le schéma
actuel.

### 2) Migrations des clés de configuration héritées

Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous
demandent d'exécuter `openclaw doctor`.

Doctor va :

- Expliquer quelles clés héritées ont été trouvées.
- Afficher la migration qu'il a appliquée.
- Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

Le Gateway exécute également automatiquement les migrations de doctor au démarrage lorsqu'il détecte un
format de configuration hérité, afin que les configurations obsolètes soient réparées sans intervention manuelle.

Migrations actuelles :

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de premier niveau
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Pour les canaux avec un `accounts` nommé mais sans `accounts.default`, déplacer les valeurs de canal uniques de premier niveau délimitées au compte dans `channels.<channel>.accounts.default` lorsqu'elles sont présentes
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

Les avertissements du Doctor incluent également des conseils par défaut de compte pour les canaux multi-comptes :

- Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, le Doctor avertit que le routage de secours peut choisir un compte inattendu.
- Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, le Doctor avertit et liste les IDs de compte configurés.

### 2b) Remplacements du provider OpenCode

Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go`
manuellement, cela remplace le catalogue intégré d'OpenCode de `@mariozechner/pi-ai`.
Cela peut forcer les modèles vers la mauvaise API ou annuler les coûts. Doctor vous avertit afin que
vous puissiez supprimer la substitution et restaurer le routage + les coûts par API.

### 3) Migrations d'état héritées (structure du disque)

Doctor peut migrer les structures sur disque plus anciennes vers la structure actuelle :

- Magasin de sessions + transcripts :
  - de `~/.openclaw/sessions/` à `~/.openclaw/agents/<agentId>/sessions/`
- Répertoire de l'Agent :
  - de `~/.openclaw/agent/` à `~/.openclaw/agents/<agentId>/agent/`
- État d'authentification WhatsApp (Baileys) :
  - de l'ancien `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
  - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

Ces migrations sont de type « best-effort » et idempotentes ; doctor émettra des avertissements lorsque
il laisse des dossiers hérités en tant que sauvegardes. Le Gateway/CLI migre également automatiquement
les sessions héritées + le répertoire de l'agent au démarrage, afin que l'historique/l'authentification/les modèles atterrissent dans
le chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp n'est intentionnellement migrée
que via `openclaw doctor`.

### 3b) Migrations du magasin cron hérité

Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut,
ou `cron.store` en cas de substitution) pour les anciennes formes de tâches que le planificateur accepte toujours
pour des raisons de compatibilité.

Les nettoyages cron actuels incluent :

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- champs de payload de premier niveau (`message`, `model`, `thinking`, ...) → `payload`
- champs de livraison de premier niveau (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de livraison de payload `provider` → `delivery.channel` explicite
- tâches de repli de webhook `notify: true` héritées simples → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans
changer le comportement. Si une tâche combine le repli de notification hérité avec un mode
de livraison non-webhook existant, doctor avertit et laisse cette tâche pour examen manuel.

### 4) Contrôles d'intégrité de l'état (persistance de session, routage et sécurité)

Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez
les sessions, les identifiants, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

Doctor vérifie :

- **Répertoire d'état manquant** : avertit d'une perte catastrophique d'état, invite à recréer
  le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
- **Permissions du répertoire d'état** : vérifie la possibilité d'écriture ; propose de réparer les permissions
  (et émet un conseil `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
- **Répertoire d'état synchronisé par le cloud sur macOS** : avertit lorsque l'état se trouve sous iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou
  `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes
  et des conflits de verrouillage/synchronisation.
- **Répertoire d'état SD ou eMMC sur Linux** : avertit lorsque l'état pointe vers une source de montage `mmcblk*`
  , car les E/S aléatoires sur SD ou eMMC peuvent être plus lentes et s'user
  plus rapidement sous les écritures de session et d'identifiants.
- **Répertoires de session manquants** : `sessions/` et le répertoire du magasin de sessions sont
  requis pour persister l'historique et éviter les plantages `ENOENT`.
- **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des
  fichiers de transcription manquants.
- **« 1-line JSONL » de session principale** : signale lorsque la transcription principale n'a qu'une
  seule ligne (l'historique ne s'accumule pas).
- **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent
  dans les répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut
  être divisé entre les installations).
- **Rappel du mode distant** : si `gateway.mode=remote`, le docteur vous rappelle de l'exécuter
  sur l'hôte distant (l'état s'y trouve).
- **Autorisations du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est
  lisible par le groupe/le monde et propose de le resserrer à `600`.

### 5) Santé de l'authentification du modèle (expiration OAuth)

Le docteur inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons
expirent/sont expirés et peut les rafraîchir en toute sécurité. Si le profil Claude Code Anthropic
est périmé, il suggère d'exécuter `claude setup-token` (ou de coller un jeton de configuration).
Les invites de rafraîchissement n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive`
ignore les tentatives de rafraîchissement.

Le docteur signale également les profils d'authentification temporairement inutilisables en raison de :

- délais de refroidissement courts (limites de délai/délais d'attente/échecs d'authentification)
- désactivations plus longues (échecs de facturation/crédit)

### 6) Validation du modèle de hooks

Si `hooks.gmail.model` est défini, le docteur valide la référence du modèle par rapport au
catalogue et à la liste d'autorisation et avertit lorsqu'elle ne sera pas résolue ou n'est pas autorisée.

### 7) Réparation de l'image Sandbox

Lorsque le bac à sable est activé, le docteur vérifie les images Docker et propose de construire ou
de basculer vers les noms hérités si l'image actuelle est manquante.

### 8) Migrations des services Gateway et conseils de nettoyage

Le docteur détecte les services de passerelle hérités (launchd/systemd/schtasks) et
propose de les supprimer et d'installer le service OpenClaw en utilisant le port de passerelle
actuel. Il peut également rechercher des services de type passerelle supplémentaires et imprimer des conseils de nettoyage.
Les services de passerelle OpenClaw nommés par profil sont considérés comme de première classe et ne sont
pas signalés comme "supplémentaires".

### 9) Avertissements de sécurité

Le docteur émet des avertissements lorsqu'un fournisseur est ouvert aux DMs sans liste d'autorisation, ou
lorsqu'une stratégie est configurée de manière dangereuse.

### 10) persistance systemd (Linux)

Si exécuté en tant que service utilisateur systemd, doctor vérifie que la persistance (lingering) est activée afin que la gateway reste active après la déconnexion.

### 11) Statut des Skills

Doctor affiche un résumé rapide des skills éligibles/manquants/bloqués pour l'espace de travail actuel.

### 12) Vérifications d'authentification de la Gateway (jeton local)

Doctor vérifie la préparation de l'authentification par jeton local de la gateway.

- Si le mode jeton nécessite un jeton et qu'aucune source de jeton n'existe, doctor propose d'en générer un.
- Si `gateway.auth.token` est géré par SecretRef mais indisponible, doctor avertit et ne l'écrase pas avec du texte en clair.
- `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de jeton n'est configuré.

### 12b) Réparations tenant compte des SecretRef en lecture seule

Certains flux de réparation doivent inspecter les identifiants configurés sans affaiblir le comportement d'échec rapide (fail-fast) à l'exécution.

- `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
- Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username` tente d'utiliser les identifiants de bot configurés lorsqu'ils sont disponibles.
- Si le jeton du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, doctor signale que l'identifiant est configuré mais indisponible et ignore la résolution automatique au lieu de planter ou de rapporter incorrectement le jeton comme manquant.

### 13) Vérification de santé de la Gateway + redémarrage

Doctor exécute une vérification de santé et propose de redémarrer la gateway lorsqu'elle semble malsaine.

### 14) Avertissements sur le statut des canaux

Si la gateway est en bonne santé, doctor exécute une sonde de statut de canal et signale les avertissements avec les corrections suggérées.

### 15) Audit et réparation de la configuration du superviseur

Doctor vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour les valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances réseau systemd et le délai de redémarrage). Lorsqu'il détecte une incohérence, il recommande une mise à jour et peut réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

Notes :

- `openclaw doctor` invite avant de réécrire la configuration du superviseur.
- `openclaw doctor --yes` accepte les invites de réparation par défaut.
- `openclaw doctor --repair` applique les correctifs recommandés sans invite.
- `openclaw doctor --repair --force` écrase les configurations personnalisées du superviseur.
- Si l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, l'installation/réparation du service doctor valide le SecretRef mais ne persiste pas les valeurs de jeton en texte brut résolues dans les métadonnées d'environnement du service superviseur.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef du jeton configuré est non résolu, doctor bloque le chemin d'installation/réparation avec des directives exploitables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` est non défini, doctor bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
- Pour les unités systemd utilisateur Linux, les vérifications de dérive de jeton de doctor incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
- Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

### 16) Diagnostics d'exécution et de port du Gateway

Doctor inspecte l'exécution du service (PID, dernier état de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de ports sur le port de passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).

### 17) Bonnes pratiques d'exécution du Gateway

Doctor avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par version (`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp et Telegram nécessitent Node, et les chemins de gestionnaires de version peuvent se rompre après les mises à niveau car le service ne charge pas votre initialisation de shell. Doctor propose de migrer vers une installation système de Node lorsqu'elle est disponible (Homebrew/apt/choco).

### 18) Écriture de la configuration + métadonnées de l'assistant

Doctor persiste toutes les modifications de configuration et tamponne les métadonnées de l'assistant pour enregistrer l'exécution de doctor.

### 19) Conseils d'espace de travail (sauvegarde + système de mémoire)

Doctor suggère un système de mémoire d'espace de travail lorsqu'il est manquant et imprime un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

Voir [/concepts/agent-workspace](/fr/concepts/agent-workspace) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (GitHub ou GitLab privé recommandé).

import fr from '/components/footer/fr.mdx';

<fr />

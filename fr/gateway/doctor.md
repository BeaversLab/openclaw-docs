---
summary: "Commande Doctor : vérifications de santé, migrations de configuration et étapes de réparation"
read_when:
  - Ajout ou modification de migrations du Doctor
  - Introduction de modifications de configuration avec rupture de compatibilité
title: "Doctor"
---

# Doctor

`openclaw doctor` est l'outil de réparation et de migration pour OpenClaw. Il corrige les configurations/états obsolètes,
vérifie la santé et fournit des étapes de réparation actionnables.

## Quick start

```bash
openclaw doctor
```

### Headless / automation

```bash
openclaw doctor --yes
```

Accepter les valeurs par défaut sans demander (y compris les étapes de réparation du redémarrage/service/sandbox le cas échéant).

```bash
openclaw doctor --repair
```

Appliquer les réparations recommandées sans demander (réparations + redémarrages lorsque c'est sans danger).

```bash
openclaw doctor --repair --force
```

Appliquer également les réparations agressives (écrase les configurations personnalisées du superviseur).

```bash
openclaw doctor --non-interactive
```

Exécuter sans invite et n'appliquer que les migrations sûres (normalisation de la configuration + déplacements de l'état sur disque). Ignore les actions de redémarrage/service/sandbox nécessitant une confirmation humaine.
Les migrations de l'état hérité s'exécutent automatiquement lorsqu'elles sont détectées.

```bash
openclaw doctor --deep
```

Scanner les services système pour les installations supplémentaires de passerelle (launchd/systemd/schtasks).

Si vous souhaitez examiner les modifications avant de les écrire, ouvrez d'abord le fichier de configuration :

```bash
cat ~/.openclaw/openclaw.json
```

## Ce qu'il fait (résumé)

- Mise à jour préalable facultative pour les installations git (mode interactif uniquement).
- Vérification de la fraîcheur du protocole UI (reconstruit l'interface de contrôle lorsque le schéma du protocole est plus récent).
- Vérification de la santé + invite de redémarrage.
- Résumé de l'état des Skills (éligibles/manquants/bloqués).
- Normalisation de la configuration pour les valeurs héritées.
- Vérifications de migration du navigateur pour les configurations héritées de l'extension Chrome et la préparation Chrome MCP.
- Avertissements de remplacement du fournisseur OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Migration de l'état hérité sur disque (sessions/répertoire agent/authentification WhatsApp).
- Migration du stockage cron hérité (`jobId`, `schedule.cron`, champs de livraison/payload de haut niveau, payload `provider`, tâches de secours webhook simple `notify: true`).
- Vérifications de l'intégrité et des permissions de l'état (sessions, transcriptions, répertoire d'état).
- Vérifications des permissions du fichier de configuration (chmod 600) lors d'une exécution locale.
- Santé de l'authentification du modèle : vérifie l'expiration OAuth, peut actualiser les tokens expirants et signale les états de refroidissement/désactivation du profil d'authentification.
- Détection de répertoire d'espace de travail supplémentaire (`~/openclaw`).
- Réparation de l'image Sandbox lorsque la sandbox est activée.
- Migration du service hérité et détection de passerelle supplémentaire.
- Vérifications de l'exécution Gateway (service installé mais non exécuté ; label launchd mis en cache).
- Avertissements de statut de la chaîne (sondés à partir de la Gateway en cours d'exécution).
- Audit de la configuration du superviseur (launchd/systemd/schtasks) avec réparation facultative.
- Vérifications des meilleures pratiques d'exécution Gateway (Node vs Bun, chemins du gestionnaire de versions).
- Diagnostics de collision de port Gateway (`18789` par défaut).
- Avertissements de sécurité pour les stratégies DM ouvertes.
- Vérifications d'authentification Gateway pour le mode de jeton local (offre la génération de jeton lorsqu'aucune source de jeton n'existe ; ne remplace pas les configs SecretRef de jeton).
- Vérification de la persistance systemd sur Linux.
- Vérifications de l'installation source (inadéquation de l'espace de travail pnpm, assets UI manquants, binaire tsx manquant).
- Écrit la configuration mise à jour + les métadonnées de l'assistant.

## Comportement détaillé et justification

### 0) Mise à jour facultative (installations git)

S'il s'agit d'une extraction git et que doctor s'exécute de manière interactive, il propose de
mettre à jour (fetch/rebase/build) avant d'exécuter doctor.

### 1) Normalisation de la configuration

Si la configuration contient des formes de valeur héritées (par exemple `messages.ackReaction`
sans remplacement spécifique à la chaîne), doctor les normalise dans le schéma
actuel.

### 2) Migrations des clés de configuration héritées

Lorsque la configuration contient des clés obsolètes, les autres commandes refusent de s'exécuter et vous demandent
d'exécuter `openclaw doctor`.

Doctor va :

- Expliquer quelles clés héritées ont été trouvées.
- Afficher la migration appliquée.
- Réécrire `~/.openclaw/openclaw.json` avec le schéma mis à jour.

La Gateway exécute également automatiquement les migrations doctor au démarrage lorsqu'elle détecte un
format de configuration hérité, afin que les configurations obsolètes soient réparées sans intervention manuelle.

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
- Pour les channels avec `accounts` nommé mais `accounts.default` manquant, déplacez les valeurs de channel de compte unique de niveau supérieur délimitées au compte dans `channels.<channel>.accounts.default` lorsque présentes
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- supprimer `browser.relayBindHost` (paramètre de relais d'extension hérité)

Les avertissements du Doctor incluent également des conseils par défaut de compte pour les channels multi-comptes :

- Si deux entrées `channels.<channel>.accounts` ou plus sont configurées sans `channels.<channel>.defaultAccount` ni `accounts.default`, le Doctor avertit que le routage de repli peut choisir un compte inattendu.
- Si `channels.<channel>.defaultAccount` est défini sur un ID de compte inconnu, le Doctor avertit et liste les IDs de compte configurés.

### 2b) Remplacements de provider OpenCode

Si vous avez ajouté `models.providers.opencode`, `opencode-zen` ou `opencode-go`
manuellement, cela remplace le catalogue OpenCode intégré de `@mariozechner/pi-ai`.
Cela peut forcer les models sur la mauvaise API ou annuler les coûts. Le Doctor avertit afin que vous
puissiez supprimer le remplacement et restaurer le routage + les coûts par model de API.

### 2c) Migration du navigateur et préparation Chrome MCP

Si votre configuration de navigateur pointe toujours vers le chemin de l'extension Chrome supprimé, le Doctor
la normalise vers le modèle d'attachement Chrome MCP hôte-local actuel :

- `browser.profiles.*.driver: "extension"` devient `"existing-session"`
- `browser.relayBindHost` est supprimé

Doctor vérifie également le chemin Chrome MCP local à l'hôte lorsque vous utilisez le profil `defaultProfile:
"user"` or a configured `existing-session` :

- vérifie si Google Chrome est installé sur le même hôte pour les profils
  de connexion automatique par défaut
- vérifie la version de Chrome détectée et avertit lorsqu'elle est inférieure à Chrome 144
- vous rappelle d'activer le débogage à distance dans la page d'inspection du navigateur (par
  exemple `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  ou `edge://inspect/#remote-debugging`)

Doctor ne peut pas activer le paramètre côté Chrome pour vous. Le Chrome MCP local
requiert toujours :

- un navigateur basé sur Chromium version 144+ sur l'hôte de la passerelle/du nœud
- le navigateur s'exécutant localement
- le débogage à distance activé dans ce navigateur
- l'approbation de la première invite de consentement de connexion dans le navigateur

Cette vérification ne s'applique **pas** à Docker, sandbox, remote-browser ou autres
flux sans tête. Ceux-ci continuent d'utiliser le CDP brut.

### 3) Migrations d'état héritées (disposition du disque)

Doctor peut migrer les dispositions sur disque plus anciennes vers la structure actuelle :

- Magasin de sessions + transcriptions :
  - de `~/.openclaw/sessions/` vers `~/.openclaw/agents/<agentId>/sessions/`
- Répertoire de l'Agent :
  - de `~/.openclaw/agent/` vers `~/.openclaw/agents/<agentId>/agent/`
- État d'authentification WhatsApp (Baileys) :
  - de l'ancien `~/.openclaw/credentials/*.json` (sauf `oauth.json`)
  - vers `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de compte par défaut : `default`)

Ces migrations sont de meilleur effort et idempotentes ; doctor émettra des avertissements lorsque
il laisse des dossiers hérités en tant que sauvegardes. Le Gateway/CLI migre également automatiquement
les sessions héritées + le répertoire de l'agent au démarrage afin que l'historique/l'authentification/les modèles atterrissent dans le
chemin par agent sans exécution manuelle de doctor. L'authentification WhatsApp n'est intentionnellement migrée
que via `openclaw doctor`.

### 3b) Migrations du magasin cron hérité

Doctor vérifie également le magasin de tâches cron (`~/.openclaw/cron/jobs.json` par défaut,
ou `cron.store` en cas de substitution) pour les anciennes formes de tâches que le planificateur accepte toujours
pour compatibilité.

Les nettoyages cron actuels incluent :

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- champs de payload de niveau supérieur (`message`, `model`, `thinking`, ...) → `payload`
- champs de livraison de niveau supérieur (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de livraison de payload `provider` → `delivery.channel` explicite
- tâches de repli de webhook `notify: true` héritées simples → `delivery.mode="webhook"` explicite avec `delivery.to=cron.webhook`

Doctor ne migre automatiquement les tâches `notify: true` que lorsqu'il peut le faire sans
changer le comportement. Si une tâche combine un repli de notification hérité avec un mode
de livraison non-webhook existant, doctor avertit et laisse cette tâche pour un examen manuel.

### 4) Contrôles d'intégrité de l'état (persistance de session, routage et sécurité)

Le répertoire d'état est le tronc cérébral opérationnel. S'il disparaît, vous perdez
les sessions, les identifiants, les journaux et la configuration (sauf si vous avez des sauvegardes ailleurs).

Doctor vérifie :

- **Répertoire d'état manquant** : avertit d'une perte catastrophique d'état, invite à recréer
  le répertoire et rappelle qu'il ne peut pas récupérer les données manquantes.
- **Permissions du répertoire d'état** : vérifie la possibilité d'écriture ; propose de réparer les permissions
  (et émet un indice `chown` lorsqu'une inadéquation de propriétaire/groupe est détectée).
- **Répertoire d'état synchronisé par le cloud sur macOS** : avertit lorsque l'état se trouve sous iCloud Drive
  (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) ou
  `~/Library/CloudStorage/...` car les chemins sauvegardés par synchronisation peuvent provoquer des E/S plus lentes
  et des conflits de verrouillage/synchronisation.
- **Répertoire d'état SD ou eMMC Linux** : avertit lorsque l'état correspond à une source de montage `mmcblk*`
  , car les E/S aléatoires sur SD ou eMMC peuvent être plus lentes et s'user
  plus rapidement sous l'écriture de sessions et d'identifiants.
- **Répertoires de session manquants** : `sessions/` et le répertoire de stockage de session sont
  requis pour conserver l'historique et éviter les plantages `ENOENT`.
- **Inadéquation de transcription** : avertit lorsque les entrées de session récentes ont des
  fichiers de transcription manquants.
- **« 1-line JSONL » de la session principale** : signale lorsque la transcription principale n'a qu'une seule
  ligne (l'historique ne s'accumule pas).
- **Plusieurs répertoires d'état** : avertit lorsque plusieurs dossiers `~/.openclaw` existent sur
  différents répertoires personnels ou lorsque `OPENCLAW_STATE_DIR` pointe ailleurs (l'historique peut
  être divisé entre les installations).
- **Rappel du mode distant** : si `gateway.mode=remote`, doctor vous rappelle de l'exécuter
  sur l'hôte distant (l'état s'y trouve).
- **Autorisations du fichier de configuration** : avertit si `~/.openclaw/openclaw.json` est
  lisible par le groupe/le monde et propose de le resserrer à `600`.

### 5) Santé de l'authentification du modèle (expiration OAuth)

Doctor inspecte les profils OAuth dans le magasin d'authentification, avertit lorsque les jetons
  sont en train d'expirer ou expirés, et peut les actualiser lorsque cela est sans danger. Si le profil Claude Code Anthropic est périmé, il suggère d'exécuter `claude setup-token` (ou de coller un setup-token).
  Les invites d'actualisation n'apparaissent que lors d'une exécution interactive (TTY) ; `--non-interactive`
  ignore les tentatives d'actualisation.

Doctor signale également les profils d'authentification temporairement inutilisables en raison de :

- courts temps de recharge (limites de délai/délais d'attente/échecs d'authentification)
- désactivations plus longues (échecs de facturation/crédit)

### 6) Validation du modèle de hooks

Si `hooks.gmail.model` est défini, doctor valide la référence du modèle par rapport au
  catalogue et à la liste d'autorisation, et avertit lorsqu'elle ne peut pas être résolue ou n'est pas autorisée.

### 7) Réparation de l'image Sandbox

Lorsque le sandboxing est activé, doctor vérifie les images Docker et propose de construire ou
  de passer aux noms hérités si l'image actuelle est manquante.

### 8) Migrations et conseils de nettoyage du service Gateway

Doctor détecte les services gateway hérités (launchd/systemd/schtasks) et
  propose de les supprimer et d'installer le service OpenClaw en utilisant le port gateway
  actuel. Il peut également rechercher des services supplémentaires de type gateway et imprimer des conseils de nettoyage.
  Les services gateway OpenClaw nommés par profil sont considérés comme de première classe et ne sont
  pas signalés comme "supplémentaires".

### 9) Avertissements de sécurité

Doctor émet des avertissements lorsqu'un provider est ouvert aux DMs sans liste d'autorisation, ou
  lorsqu'une stratégie est configurée de manière dangereuse.

### 10) systemd linger (Linux)

S'il s'exécute en tant que service utilisateur systemd, doctor s'assure que la persistance est activée afin que la
  gateway reste active après la déconnexion.

### 11) État des Skills

Doctor imprime un résumé rapide des skills éligibles/manquants/bloqués pour l'espace de travail
  actuel.

### 12) Vérifications d'authentification Gateway (jeton local)

Doctor vérifie la préparation de l'authentification par jeton gateway local.

- Si le mode token nécessite un token et qu'aucune source de token n'existe, le docteur propose d'en générer un.
- Si `gateway.auth.token` est géré par SecretRef mais indisponible, le docteur avertit et ne l'écrase pas avec du texte brut.
- `openclaw doctor --generate-gateway-token` force la génération uniquement lorsqu'aucun SecretRef de token n'est configuré.

### 12b) Réparations conscientes du SecretRef en lecture seule

Certains flux de réparation doivent inspecter les informations d'identification configurées sans affaiblir le comportement d'échec rapide à l'exécution.

- `openclaw doctor --fix` utilise désormais le même modèle de résumé SecretRef en lecture seule que les commandes de la famille status pour les réparations de configuration ciblées.
- Exemple : la réparation Telegram `allowFrom` / `groupAllowFrom` `@username` tente d'utiliser les informations d'identification du bot configurées lorsqu'elles sont disponibles.
- Si le token du bot Telegram est configuré via SecretRef mais indisponible dans le chemin de commande actuel, le docteur signale que l'information d'identification est configurée mais indisponible et ignore la résolution automatique au lieu de planter ou de signaler incorrectement le token comme manquant.

### 13) Vérification de santé + redémarrage du Gateway

Le docteur exécute une vérification de santé et propose de redémarrer la passerelle lorsqu'elle semble
en mauvaise santé.

### 14) Avertissements de statut de canal

Si la passerelle est en bonne santé, le docteur exécute une sonde de statut de canal et signale
les avertissements avec les corrections suggérées.

### 15) Audit et réparation de la configuration du superviseur

Le docteur vérifie la configuration du superviseur installée (launchd/systemd/schtasks) pour
des valeurs par défaut manquantes ou obsolètes (par exemple, les dépendances réseau systemd et
le délai de redémarrage). Lorsqu'il détecte une inadéquation, il recommande une mise à jour et peut
réécrire le fichier de service/tâche avec les valeurs par défaut actuelles.

Notes :

- `openclaw doctor` demande confirmation avant de réécrire la configuration du superviseur.
- `openclaw doctor --yes` accepte les invites de réparation par défaut.
- `openclaw doctor --repair` applique les corrections recommandées sans invite.
- `openclaw doctor --repair --force` écrase les configurations de superviseur personnalisées.
- Si l'authentification par token nécessite un token et que `gateway.auth.token` est géré par SecretRef, l'installation/réparation du service du docteur valide le SecretRef mais ne persiste pas les valeurs de token en texte brut résolues dans les métadonnées d'environnement du service du superviseur.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef configuré n'est pas résolu, le docteur bloque le chemin d'installation/réparation avec des instructions exploitables.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, le docteur bloque l'installation/réparation jusqu'à ce que le mode soit défini explicitement.
- Pour les unités utilisateur systemd Linux, les vérifications de dérive de jeton du docteur incluent désormais les sources `Environment=` et `EnvironmentFile=` lors de la comparaison des métadonnées d'authentification du service.
- Vous pouvez toujours forcer une réécriture complète via `openclaw gateway install --force`.

### 16) Diagnostics d'exécution et de port Gateway

Le docteur inspecte l'exécution du service (PID, dernier état de sortie) et avertit lorsque le service est installé mais pas réellement en cours d'exécution. Il vérifie également les collisions de ports sur le port de la passerelle (par défaut `18789`) et signale les causes probables (passerelle déjà en cours d'exécution, tunnel SSH).

### 17) Bonnes pratiques d'exécution Gateway

Le docteur avertit lorsque le service de passerelle s'exécute sur Bun ou un chemin Node géré par version (`nvm`, `fnm`, `volta`, `asdf`, etc.). Les canaux WhatsApp et Telegram nécessitent Node, et les chemins des gestionnaires de versions peuvent se rompre après les mises à niveau car le service ne charge pas votre initialisation de shell. Le docteur propose de migrer vers une installation système de Node lorsqu'elle est disponible (Homebrew/apt/choco).

### 18) Écriture de la configuration + métadonnées de l'assistant

Le docteur persiste tous les changements de configuration et appose les métadonnées de l'assistant pour enregistrer l'exécution du docteur.

### 19) Conseils d'espace de travail (sauvegarde + système de mémoire)

Le docteur suggère un système de mémoire d'espace de travail lorsqu'il est manquant et affiche un conseil de sauvegarde si l'espace de travail n'est pas déjà sous git.

Voir [/concepts/agent-workspace](/fr/concepts/agent-workspace) pour un guide complet sur la structure de l'espace de travail et la sauvegarde git (GitHub ou GitLab privé recommandé).

import en from "/components/footer/en.mdx";

<en />

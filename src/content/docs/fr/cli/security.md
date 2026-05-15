---
summary: "Référence de la CLI pour `openclaw security` (audit et correction des pièges de sécurité courants)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (permissions, tighten defaults)
title: "Sécurité"
---

# `openclaw security`

Outils de sécurité (audit + corrections facultatives).

Voir aussi :

- Guide de sécurité : [Sécurité](/fr/gateway/security)

## Audit

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

Le `security audit` brut reste sur le chemin de configuration froid/système de fichiers/lecture seule. Il ne découvre pas les collecteurs de sécurité d'exécution des plugins par défaut, donc les audits de routine ne chargent pas chaque exécution de plugin installée. Utilisez `--deep` pour inclure les sondes du Gateway en direct et les collecteurs d'audit de sécurité détenus par des plugins ; les appelants internes explicites peuvent également opter pour ces collecteurs détenus par des plugins lorsqu'ils disposent déjà d'une portée d'exécution appropriée.

L'audit avertit lorsque plusieurs expéditeurs de DM partagent la session principale et recommande le **mode DM sécurisé** : `session.dmScope="per-channel-peer"` (ou `per-account-channel-peer`Gateway pour les canaux multi-comptes) pour les boîtes de réception partagées.
Ceci est pour le durcissement des boîtes de réception coopératives/partagées. Un seul Gateway partagé par des opérateurs mutuellement non fiables ou hostiles n'est pas une configuration recommandée ; séparez les limites de confiance avec des passerelles distinctes (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic`OpenClaw lorsque la configuration suggère une entrée probable d'utilisateur partagé (par exemple politique de DM/groupe ouvert, cibles de groupe configurées, ou règles d'expéditeur génériques), et vous rappelle qu'OpenClaw est un modèle de confiance d'assistant personnel par défaut.
Pour les configurations intentionnelles d'utilisateur partagé, la recommandation de l'audit est de mettre en bac à sable (sandbox) toutes les sessions, de garder l'accès au système de fichiers limité à l'espace de travail, et de garder les identités ou informations d'identification personnelles/privées hors de cet environnement d'exécution.
Il avertit également lorsque de petits modèles (`<=300B`) sont utilisés sans mise en bac à sable et avec les outils Web/navigateur activés.
Pour l'entrée par webhook, il avertit lorsque `hooks.token`Gateway réutilise le jeton Gateway, lorsque `hooks.token` est court, lorsque `hooks.path="/"`, lorsque `hooks.defaultSessionKey` n'est pas défini, lorsque `hooks.allowedAgentIds` est sans restriction, lorsque les remplacements de requête `sessionKey` sont activés, et lorsque les remplacements sont activés sans `hooks.allowedSessionKeyPrefixes`Docker.
Il avertit également lorsque les paramètres Docker de bac à sable sont configurés alors que le mode bac à sable est désactivé, lorsque `gateway.nodes.denyCommands` utilise des entrées inefficaces de type motif ou inconnues (correspondance exacte du nom de commande de nœud uniquement, pas de filtrage de texte shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque le `tools.profile="minimal"` global est remplacé par les profils d'outils de l'agent, lorsque les outils d'écriture/édition sont désactivés mais que `exec` est toujours disponible sans limite de système de fichiers de bac à sable, lorsque les groupes ouverts exposent des outils d'exécution/système de fichiers sans gardes de bac à sable/espace de travail, et lorsque les outils de plugins installés peuvent être accessibles sous une stratégie d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque d'usurpation d'en-tête si les proxys sont mal configurés) et `discovery.mdns.mode="full"`Docker (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur en bac à sable utilise le réseau Docker `bridge` sans `sandbox.browser.cdpSourceRange`Docker.
Il signale également les modes de réseau Docker de bac à sable dangereux (y compris les jointures d'espace de noms `host` et `container:*`Docker).
Il avertit également lorsque les conteneurs Docker du navigateur en bac à sable existants ont des étiquettes de hachage manquantes ou obsolètes (par exemple les conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`npmDiscordSlackGoogle ChatMicrosoft TeamsMattermost.
Il avertit également lorsque les enregistrements d'installation de plugin/hook basés sur npm ne sont pas épinglés, manquent de métadonnées d'intégrité, ou dérivent des versions de paquets actuellement installées.
Il avertit lorsque les listes autorisées de canaux reposent sur des noms/e-mails/étiquettes modifiables au lieu d'IDs stables (Discord, Slack, Google Chat, Microsoft Teams, Mattermost, portées IRC le cas échéant).
Il avertit lorsque `gateway.auth.mode="none"`Gateway laisse les API HTTP Gateway accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des remplacements explicites d'opérateur de bris de glace ; en activer un n'est pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, voir la section "Insecure or dangerous flags summary" dans [Security](/fr/gateway/security).

Comportement de SecretRef :

- `security audit` résout les SecretRefs pris en charge en mode lecture seule pour ses chemins cibles.
- Si un SecretRef n'est pas disponible dans le chemin de la commande actuel, l'audit continue et signale `secretDiagnostics` (au lieu de planter).
- `--token` et `--password` ne remplacent l'authentification deep-probe que pour cette invocation de commande ; ils ne réécrivent pas la configuration ni les mappages SecretRef.

## Sortie JSON

Utilisez `--json` pour les vérifications CI/stratégie :

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

Si `--fix` et `--json` sont combinés, la sortie inclut à la fois les actions de correction et le rapport final :

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## Ce que `--fix` modifie

`--fix` applique des remédiations sûres et déterministes :

- bascule les `groupPolicy="open"` courants vers `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- lorsque la stratégie de groupe WhatsApp bascule sur `allowlist`, initialise `groupAllowFrom` à partir du
  fichier `allowFrom` stocké lorsque cette liste existe et que la configuration ne définit pas encore
  `allowFrom`
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- resserre les permissions pour l'état/la configuration et les fichiers sensibles courants
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session
  `*.jsonl`)
- resserre également les fichiers d'inclusion de configuration référencés depuis `openclaw.json`
- utilise `chmod` sur les hôtes POSIX et `icacls` réinitialise sur Windows

`--fix` ne fait **pas** :

- faire pivoter les jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- modifier les choix de liaison/authentification/exposition réseau de la passerelle
- supprimer ou réécrire les plugins/compétences

## Connexes

- [Référence CLI](/fr/cli)
- [Audit de sécurité](/fr/gateway/security)

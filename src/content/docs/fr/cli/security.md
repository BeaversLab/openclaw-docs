---
summary: "Référence de la CLI pour `openclaw security` (audit et correction des pièges de sécurité courants)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (permissions, tighten defaults)
title: "sécurité"
---

# `openclaw security`

Outils de sécurité (audit + corrections facultatives).

Voir aussi :

- Guide de sécurité : [Sécurité](/en/gateway/security)

## Audit

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

L'audit avertit lorsque plusieurs expéditeurs de DM partagent la session principale et recommande le **mode DM sécurisé** : `session.dmScope="per-channel-peer"` (ou `per-account-channel-peer` pour les canaux multi-comptes) pour les boîtes de réception partagées.
Cela vise au durcissement des boîtes de réception coopératives/partagées. Un seul Gateway partagé par des opérateurs mutuellement non fiables ou hostiles n'est pas une configuration recommandée ; séparez les limites de confiance avec des passerelles distinctes (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic` lorsque la configuration suggère une entrée probablement partagée par plusieurs utilisateurs (par exemple une stratégie de DM/groupe ouvert, des cibles de groupe configurées, ou des règles d'expéditeur avec caractère générique), et vous rappelle que OpenClaw est un modèle de confiance d'assistant personnel par défaut.
Pour les configurations partagées intentionnelles, la directive d'audit est d'isoler (sandbox) toutes les sessions, de garder l'accès au système de fichiers limité à l'espace de travail, et de garder les identités ou les identifiants personnels/privés en dehors de cet environnement d'exécution.
Il avertit également lorsque des petits modèles (`<=300B`) sont utilisés sans isolation (sandboxing) et avec les outils web/navigateur activés.
Pour l'entrée par webhook, il avertit lorsque `hooks.token` réutilise le jeton du Gateway, lorsque `hooks.token` est court, lorsque `hooks.path="/"`, lorsque `hooks.defaultSessionKey` n'est pas défini, lorsque `hooks.allowedAgentIds` est sans restriction, lorsque les substitutions de requête `sessionKey` sont activées, et lorsque les substitutions sont activées sans `hooks.allowedSessionKeyPrefixes`.
Il avertit également lorsque les paramètres Docker du bac à sable (sandbox) sont configurés alors que le mode bac à sable est désactivé, lorsque `gateway.nodes.denyCommands` utilise des entrées inefficaces de type motif ou inconnues (correspondance exacte du nom de commande du nœud uniquement, pas de filtrage de texte de shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque le `tools.profile="minimal"` global est substitué par des profils d'outils d'agent, lorsque des groupes ouverts exposent des outils d'exécution/système de fichiers sans gardiens de bac à sable/espace de travail, et lorsque les outils d'extension de plugin installés peuvent être accessibles sous une stratégie d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque de falsification d'en-tête si les proxys sont mal configurés) et `discovery.mdns.mode="full"` (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur bac à sable utilise le réseau Docker Docker `bridge` sans `sandbox.browser.cdpSourceRange`.
Il signale également les modes de réseau Docker dangereux pour le bac à sable (y compris les jointures d'espace de noms `host` et `container:*`).
Il avertit également lorsque les conteneurs Docker du navigateur bac à sable existants ont des étiquettes de hachage manquantes ou obsolètes (par exemple les conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`.
Il avertit également lorsque les enregistrements d'installation de plugin/hook basés sur Docker ne sont pas épinglés (unpinned), manquent des métadonnées d'intégrité, ou divergent des versions de paquets actuellement installées.
Il avertit lorsque les listes blanches de canaux reposent sur des noms/e-mails/tags modifiables au lieu d'ID stables (portées Docker, Docker, npm, Discord, Slack, IRC si applicable).
Il avertit lorsque `gateway.auth.mode="none"` laisse les API HTTP du Google Chat accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des substitutions d'opérateur explicites de type brise-glace ; l'activation de l'un d'eux ne constitue pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, consultez la section « Résumé des indicateurs non sécurisés ou dangereux » dans [Sécurité](/en/gateway/security).

Comportement de SecretRef :

- `security audit` résout les SecretRefs pris en charge en mode lecture seule pour ses chemins cibles.
- Si un SecretRef n'est pas disponible dans le chemin de la commande actuel, l'audit continue et signale `secretDiagnostics` (au lieu de planter).
- `--token` et `--password` ne remplacent l'authentification deep-probe que pour cette invocation de commande ; ils ne réécrivent pas la configuration ou les mappages SecretRef.

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

`--fix` applique des correctifs sûrs et déterministes :

- bascule les `groupPolicy="open"` courants vers `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- lorsque la stratégie de groupe WhatsApp bascule vers `allowlist`, amorce `groupAllowFrom` à partir du
  fichier `allowFrom` stocké lorsque cette liste existe et que la configuration ne définit pas encore
  `allowFrom`
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- renforce les autorisations pour l'état/la configuration et les fichiers sensibles courants
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session
  `*.jsonl`)
- renforce également les fichiers d'inclusion de configuration référencés depuis `openclaw.json`
- utilise `chmod` sur les hôtes POSIX et les réinitialisations `icacls` sur Windows

`--fix` ne fait **pas** :

- faire tourner les jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- changer les choix de liaison/authentification/exposition réseau de la passerelle
- supprimer ou réécrire les plugins/compétences

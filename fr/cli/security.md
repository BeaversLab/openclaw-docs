---
summary: "Référence de la CLI pour `openclaw security` (audit et correction des pièges de sécurité courants)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "sécurité"
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

L'audit avertit lorsque plusieurs expéditeurs de DM partagent la session principale et recommande le **mode DM sécurisé** : `session.dmScope="per-channel-peer"` (ou `per-account-channel-peer` pour les canaux multi-comptes) pour les boîtes de réception partagées.
Ceci est destiné au durcissement des boîtes de réception coopératives/partagées. Un Gateway unique partagé par des opérateurs mutuellement non fiables ou hostiles n'est pas une configuration recommandée ; séparez les frontières de confiance avec des passerelles distinctes (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic` lorsque la configuration suggère une entrée probablement partagée entre utilisateurs (par exemple politique de DM/groupe ouvert, cibles de groupe configurées, ou règles d'expéditeur avec caractères génériques), et vous rappelle que OpenClaw est un modèle de confiance d'assistant personnel par défaut.
Pour les configurations partagées intentionnelles entre utilisateurs, les recommandations de l'audit consistent à isoler (sandbox) toutes les sessions, limiter l'accès au système de fichiers à l'espace de travail, et garder les identités ou informations d'identification personnelles/privées hors de cet environnement d'exécution.
Il avertit également lorsque de petits modèles (`<=300B`) sont utilisés sans isolation (sandboxing) et avec les outils web/navigateur activés.
Pour l'ingestion par webhook, il avertit lorsque `hooks.token` réutilise le jeton du Gateway, lorsque `hooks.defaultSessionKey` n'est pas défini, lorsque `hooks.allowedAgentIds` est sans restriction, lorsque les substitutions de requête `sessionKey` sont activées, et lorsque les substitutions sont activées sans `hooks.allowedSessionKeyPrefixes`.
Il avertit également lorsque les paramètres du bac à sable Docker sont configurés alors que le mode bac à sable est désactivé, lorsque `gateway.nodes.denyCommands` utilise des entrées inefficaces de type inconnu/modèle (correspondance exacte du nom de commande de nœud uniquement, pas de filtrage de texte de shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque le `tools.profile="minimal"` global est remplacé par des profils d'outils d'agent, lorsque des groupes ouverts exposent des outils d'exécution/système de fichiers sans gardes de bac à sable/espace de travail, et lorsque les outils d'extension de plug-in installés peuvent être accessibles sous une stratégie d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque de spoofing d'en-tête si les proxies sont mal configurés) et `discovery.mdns.mode="full"` (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur bac à sable utilise le réseau `bridge` de Docker sans `sandbox.browser.cdpSourceRange`.
Il signale également les modes de réseau bac à sable dangereux de Docker (y compris les jointures d'espace de noms `host` et `container:*`).
Il avertit également lorsque les conteneurs du navigateur bac à sable existants ont des étiquettes de hachage manquantes ou obsolètes (par exemple les conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`.
Il avertit également lorsque les enregistrements d'installation de plug-in/hook basés sur Docker ne sont pas épinglés (unpinned), manquent des métadonnées d'intégrité, ou divergent des versions de paquets actuellement installées.
Il avertit lorsque les listes blanches de canaux reposent sur des noms/e-mails/tags modifiables au lieu d'ID stables (npm, Discord, Slack, Google Chat, Microsoft Teams, portées IRC le cas échéant).
Il avertit lorsque `gateway.auth.mode="none"` laisse les API HTTP du Mattermost accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des substitutions explicites d'opérateur de type « bris de glace » ; en activer un ne constitue pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, consultez la section « Résumé des indicateurs non sécurisés ou dangereux » dans [Sécurité](/fr/gateway/security).

Comportement de SecretRef :

- `security audit` résout les SecretRefs pris en charge en mode lecture seule pour ses chemins ciblés.
- Si un SecretRef n'est pas disponible dans le chemin de commande actuel, l'audit continue et signale `secretDiagnostics` (au lieu de planter).
- `--token` et `--password` ne remplacent l'authentification deep-probe que pour cette invocation de commande ; ils ne réécrivent pas la configuration ou les mappages SecretRef.

## Sortie JSON

Utilisez `--json` pour les vérifications CI/stratégiques :

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

- modifie les `groupPolicy="open"` courants pour `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- resserre les autorisations pour l'état/la configuration et les fichiers sensibles courants (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session `*.jsonl`)

`--fix` ne fait **pas** :

- faire tourner les jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- modifier les choix de liaison/authentification/exposition réseau de la passerelle
- supprimer ou réécrire les plugins/compétences

import fr from "/components/footer/fr.mdx";

<fr />

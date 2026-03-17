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
Cela concerne le durcissement des boîtes de réception coopératives/partagées. Un seul Gateway partagé par des opérateurs mutuellement non fiables ou antagonistes n'est pas une configuration recommandée ; séparez les limites de confiance avec des gateways distincts (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic` lorsque la configuration suggère un ingress probablement multi-utilisateur (par exemple politique de groupe/DM ouvert, cibles de groupe configurées, ou règles d'expéditeur avec caractères génériques), et vous rappelle qu'OpenClaw est un modèle de confiance d'assistant personnel par défaut.
Pour les configurations multi-utilisateur intentionnelles, les recommandations de l'audit sont de sandboxer toutes les sessions, de garder l'accès au système de fichiers limité à l'espace de travail, et de garder les identités ou informations d'identification personnelles/privées hors de ce runtime.
Il avertit également lorsque de petits modèles (`<=300B`) sont utilisés sans sandboxing et avec les outils web navigateur activés.
Pour l'ingress de webhook, il avertit lorsque `hooks.defaultSessionKey` n'est pas défini, lorsque les dépassements de demande `sessionKey` sont activés, et lorsque les dépassements sont activés sans `hooks.allowedSessionKeyPrefixes`.
Il avertit également lorsque les paramètres Docker du sandbox sont configurés alors que le mode sandbox est désactivé, lorsque `gateway.nodes.denyCommands` utilise des entrées inefficaces de type modèle ou inconnues (correspondance exacte du nom de commande de nœud uniquement, pas de filtrage de texte shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque le `tools.profile="minimal"` global est remplacé par les profils d'outil d'agent, lorsque les groupes ouverts exposent des outils runtime/système de fichiers sans gardes de sandbox/espace de travail, et lorsque les outils d'extension de plug-in installés peuvent être accessibles sous une stratégie d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque d'usurpation d'en-tête si les proxys sont mal configurés) et `discovery.mdns.mode="full"` (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur sandbox utilise le réseau Docker `bridge` sans `sandbox.browser.cdpSourceRange`.
Il signale également les modes de réseau Docker sandbox dangereux (y compris les jointures d'espace de noms `host` et `container:*`).
Il avertit également lorsque les conteneurs Docker du navigateur sandbox existants ont des étiquettes de hachage manquantes ou périmées (par exemple les conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`.
Il avertit également lorsque les enregistrements d'installation de plug-in/hook basés sur npm ne sont pas épinglés, manquent de métadonnées d'intégrité, ou dérivent des versions de package actuellement installées.
Il avertit lorsque les listes d'autorisation de canaux reposent sur des noms/e-mails/tags modifiables au lieu d'IDs stables (Discord, Slack, Google Chat, MS Teams, Mattermost, portées IRC le cas échéant).
Il avertit lorsque `gateway.auth.mode="none"` laisse les API HTTP du Gateway accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des dépassements explicites d'opérateur de bris de glace ; en activer un ne constitue pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, consultez la section « Résumé des indicateurs non sécurisés ou dangereux » dans [Sécurité](/fr/gateway/security).

Comportement de SecretRef :

- `security audit` résout les SecretRefs pris en charge en mode lecture seule pour ses chemins cibles.
- Si un SecretRef n'est pas disponible dans le chemin de commande actuel, l'audit continue et signale `secretDiagnostics` (au lieu de planter).
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

`--fix` applique des correctifs sûrs et déterministes :

- modifie les `groupPolicy="open"` courants vers `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- resserre les autorisations pour l'état/la configuration et les fichiers sensibles courants (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session `*.jsonl`)

`--fix` ne fait **pas** :

- faire tourner les jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- modifier les choix de liaison/authentification/exposition réseau de la passerelle
- supprimer ou réécrire les plugins/compétences

import fr from "/components/footer/fr.mdx";

<fr />

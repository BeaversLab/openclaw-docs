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
openclaw security audit --fix
openclaw security audit --json
```

L'audit avertit lorsque plusieurs expéditeurs de DM partagent la session principale et recommande le **mode DM sécurisé** : `session.dmScope="per-channel-peer"` (ou `per-account-channel-peer` pour les canaux multi-comptes) pour les boîtes de réception partagées.
Ceci est destiné au durcissement des boîtes de réception coopératives/partagées. Une seule passerelle (Gateway) partagée par des opérateurs mutuellement non fiables ou hostiles n'est pas une configuration recommandée ; séparez les limites de confiance avec des passerelles distinctes (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic` lorsque la configuration suggère une entrée probablement partagée par plusieurs utilisateurs (par exemple politique de groupe/DM ouvert, cibles de groupe configurées, ou règles d'expéditeur avec caractères génériques), et vous rappelle qu'OpenClaw est un modèle de confiance d'assistant personnel par défaut.
Pour les configurations partagées intentionnelles, la recommandation de l'audit est de mettre en bac à sable (sandbox) toutes les sessions, de garder l'accès au système de fichiers limité à l'espace de travail, et de garder les identités ou informations d'identification personnelles/privées hors de cette exécution.
Il avertit également lorsque des petits modèles (`<=300B`) sont utilisés sans sandboxing et avec les outils web/navigateur activés.
Pour l'ingress de webhook, il avertit lorsque `hooks.defaultSessionKey` n'est pas défini, lorsque les substitutions de requête `sessionKey` sont activées, et lorsque les substitutions sont activées sans `hooks.allowedSessionKeyPrefixes`.
Il avertit également lorsque les paramètres Docker du sandbox sont configurés alors que le mode sandbox est désactivé, lorsque `gateway.nodes.denyCommands` utilise des entrées inefficaces de type motif/inconnues (correspondance exacte du nom de commande de nœud uniquement, pas de filtrage de texte shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque le `tools.profile="minimal"` global est substitué par des profils d'outils d'agent, lorsque des groupes ouverts exposent des outils d'exécution/système de fichiers sans gardes de sandbox/espace de travail, et lorsque les outils d'extension de plug-in installés peuvent être accessibles sous une stratégie d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque de spoofing d'en-tête si les proxys sont mal configurés) et `discovery.mdns.mode="full"` (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur sandbox utilise le réseau Docker `bridge` sans `sandbox.browser.cdpSourceRange`.
Il signale également les modes de réseau Docker de sandbox dangereux (y compris les jointures d'espace de noms `host` et `container:*`).
Il avertit également lorsque les conteneurs Docker du navigateur sandbox existants ont des étiquettes de hachage manquantes ou obsolètes (par exemple conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`.
Il avertit également lorsque les enregistrements d'installation de plug-in/hooks basés sur npm ne sont pas épinglés (unpinned), manquent de métadonnées d'intégrité, ou ont divergé par rapport aux versions de paquets actuellement installées.
Il avertit lorsque les listes autorisées de canaux reposent sur des noms/e-mails/tags modifiables au lieu d'ID stables (Discord, Slack, Google Chat, MS Teams, Mattermost, portées IRC le cas échéant).
Il avertit lorsque `gateway.auth.mode="none"` laisse les API HTTP de la passerelle (Gateway) accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des substitutions explicites d'opérateur de type « bris de glace » ; en activer un n'est pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, consultez la section « Résumé des indicateurs non sécurisés ou dangereux » dans [Sécurité](/fr/gateway/security).

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

- modifie les `groupPolicy="open"` courantes pour `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- resserre les autorisations pour l'état/la configuration et les fichiers sensibles courants (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session `*.jsonl`)

`--fix` ne fait **pas** :

- fait tourner les jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- changer les choix de liaison/authentification/exposition réseau de la passerelle
- supprimer ou réécrire les plugins/compétences

import fr from "/components/footer/fr.mdx";

<fr />

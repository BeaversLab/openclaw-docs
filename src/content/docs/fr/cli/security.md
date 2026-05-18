---
summary: "CLIRéférence CLI pour `openclaw security` (audit et correction des pièges de sécurité courants)"
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

Plain `security audit` reste sur le chemin de configuration froide/système de fichiers/lecture seule. Il ne découvre pas les collecteurs de sécurité d'exécution des plugins par défaut, donc les audits de routine ne chargent pas chaque runtime de plugin installé. Utilisez `--deep`Gateway pour inclure les sondes en direct du Gateway au mieux et les collecteurs d'audit de sécurité détenus par le plugin ; les appelants internes explicites peuvent également choisir ces collecteurs détenus par le plugin lorsqu'ils disposent déjà d'une portée d'exécution appropriée.

L'audit avertit lorsque plusieurs expéditeurs de DM partagent la session principale et recommande le **mode DM sécurisé** : `session.dmScope="per-channel-peer"` (ou `per-account-channel-peer` pour les canaux multi-comptes) pour les boîtes de réception partagées.
Cela concerne le durcissement des boîtes de réception coopératives/partagées. Un seul Gateway partagé par des opérateurs mutuellement non fiables ou hostiles n'est pas une configuration recommandée ; séparez les limites de confiance avec des passerelles distinctes (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic` lorsque la configuration suggère une entrée probable par utilisateur partagé (par exemple politique de DM/groupe ouvert, cibles de groupe configurées, ou règles d'expéditeur avec caractères génériques), et vous rappelle que OpenClaw est par défaut un modèle de confiance d'assistant personnel.
Pour les configurations partagées intentionnelles, la recommandation de l'audit est d'isoler toutes les sessions, de garder l'accès au système de fichiers limité à l'espace de travail, et de garder les identités ou informations d'identification personnelles/privées hors de cet environnement d'exécution.
Il avertit également lorsque des petits modèles (`<=300B`) sont utilisés sans isolement et avec les outils web/navigateur activés.
Pour l'entrée par webhook, il avertit lorsque `hooks.token` réutilise le jeton du Gateway, lorsque `hooks.token` est court, lorsque `hooks.path="/"`, lorsque `hooks.defaultSessionKey` est non défini, lorsque `hooks.allowedAgentIds` est sans restriction, lorsque les substitutions de `sessionKey` de requête sont activées, et lorsque les substitutions sont activées sans `hooks.allowedSessionKeyPrefixes`.
Il avertit également lorsque les paramètres du bac à sable Docker sont configurés alors que le mode bac à sable est désactivé, lorsque `gateway.nodes.denyCommands` utilise des entrées inefficaces de type motif/inconnues (correspondance exacte du nom de commande de nœud uniquement, pas de filtrage de texte shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque le `tools.profile="minimal"` global est remplacé par des profils d'outil d'agent, lorsque les outils d'écriture/édition sont désactivés mais que `exec` est toujours disponible sans limite de système de fichiers du bac à sable, lorsque les groupes ouverts exposent des outils d'exécution/système de fichiers sans gardes de bac à sable/espace de travail, et lorsque les outils de plugin installés peuvent être accessibles sous une stratégie d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque d'usurpation d'en-tête si les proxys sont mal configurés) et `discovery.mdns.mode="full"` (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur du bac à sable utilise le réseau `bridge` de Docker sans `sandbox.browser.cdpSourceRange`.
Il signale également les modes de réseau de bac à sable Docker dangereux (y compris les jointures d'espace de noms `host` et `container:*`).
Il avertit également lorsque les conteneurs Docker du navigateur du bac à sable existants ont des étiquettes de hachage manquantes/obsolètes (par exemple les conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`.
Il avertit également lorsque les enregistrements d'installation de plugin/hook basés sur npm ne sont pas épinglés, manquent de métadonnées d'intégrité, ou dérivent des versions de paquets actuellement installées.
Il avertit lorsque les listes blanches de canaux reposent sur des noms/e-mails/tags modifiables au lieu d'IDs stables (portées Discord, Slack, Google Chat, Microsoft Teams, Mattermost, IRC le cas échéant).
Il avertit lorsque `gateway.auth.mode="none"` laisse les API HTTP du Gateway accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des substitutions explicites d'opérateur de bris de vitre ; en activer un ne constitue pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, voir la section « Résumé des indicateurs non sécurisés ou dangereux » dans [Sécurité](/fr/gateway/security).

Les constats intentionnels persistants peuvent être acceptés avec `security.audit.suppressions`.
Chaque suppression correspond exactement à un `checkId` et peut être restreinte avec des
sous-chaînes `titleIncludes` et/ou `detailIncludes` insensibles à la casse :

```json
{
  "security": {
    "audit": {
      "suppressions": [
        {
          "checkId": "plugins.tools_reachable_permissive_policy",
          "detailIncludes": "Enabled extension plugins: gbrain",
          "reason": "trusted local operator plugin"
        }
      ]
    }
  }
}
```

Les constats supprimés sont retirés de la liste active `summary` et `findings`.
La sortie JSON les conserve sous `suppressedFindings` pour des raisons d'audit.
Lorsque des suppressions sont configurées, la sortie active conserve également un constat
`security.audit.suppressions.active` d'information non supprimable afin que les lecteurs puissent voir que l'audit
a été filtré. Les indicateurs de configuration dangereux sont émis un indicateur par constat, donc
l'acceptation d'un indicateur dangereux ne masque pas les autres indicateurs activés qui partagent
le même `config.insecure_or_dangerous_flags` checkId.
Parce que les suppressions peuvent masquer des risques persistants, l'ajout ou la suppression de celles-ci via
des commandes shell d'exécution d'agent nécessite une approbation exec, sauf si exec s'exécute déjà
avec `security="full"` et `ask="off"` pour l'automatisation locale approuvée.

Comportement de SecretRef :

- `security audit` résout les SecretRef pris en charge en mode lecture seule pour ses chemins cibles.
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

- active les `groupPolicy="open"` courantes sur `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- lorsque la stratégie de groupe WhatsApp bascule vers `allowlist`, amorçage de `groupAllowFrom` à partir du
  fichier `allowFrom` stocké lorsque cette liste existe et que la configuration ne définit pas encore
  `allowFrom`
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- resserre les autorisations pour l'état/la configuration et les fichiers sensibles courants
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session
  `*.jsonl`)
- resserre également les fichiers d'inclusion de configuration référencés à partir de `openclaw.json`
- utilise `chmod` sur les hôtes POSIX et les réinitialisations `icacls` sur Windows

`--fix` fait **pas** :

- faire tourner les jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- changer les choix de liaison/d'authentification/exposition réseau de la passerelle
- supprimer ou réécrire les greffons/compétences

## Connexes

- [référence CLI](/fr/cli)
- [Audit de sécurité](/fr/gateway/security)

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

L'audit avertit lorsque plusieurs expéditeurs DM partagent la session principale et recommande le **mode DM sécurisé** : `session.dmScope="per-channel-peer"` (ou `per-account-channel-peer`Gateway pour les canaux multi-comptes) pour les boîtes de réception partagées.
Ceci est pour le durcissement des boîtes de réception coopératives/partagées. Un Gateway unique partagé par des opérateurs mutuellement non fiables ou hostiles n'est pas une configuration recommandée ; séparez les limites de confiance avec des passerelles distinctes (ou des utilisateurs/hôtes OS distincts).
Il émet également `security.trust_model.multi_user_heuristic`OpenClaw lorsque la configuration suggère une entrée probablement partagée par plusieurs utilisateurs (par exemple politique de DM/groupe ouvert, cibles de groupe configurées, ou règles d'expéditeur génériques), et vous rappelle qu'OpenClaw est un modèle de confiance d'assistant personnel par défaut.
Pour les configurations partagées intentionnelles, la recommandation de l'audit est de placer toutes les sessions dans un bac à sable (sandbox), de garder l'accès au système de fichiers limité à l'espace de travail, et de garder les identités ou informations d'identification personnelles/privées hors de ce runtime.
Il avertit également lorsque de petits modèles (`<=300B`) sont utilisés sans sandboxing et avec les outils web/navigateur activés.
Pour l'entrée webhook, les journaux de démarrage affichent un avertissement de sécurité non fatal et l'audit signale `hooks.token`Gateway la réutilisation des valeurs d'authentification par secret partagé du Gateway actif, y compris `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` et `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`. Il avertit également lorsque :

- `hooks.token` est court
- `hooks.path="/"`
- `hooks.defaultSessionKey` n'est pas défini
- `hooks.allowedAgentIds` est sans restriction
- les remplacements de la requête `sessionKey` sont activés
- les remplacements sont activés sans `hooks.allowedSessionKeyPrefixes`

Si l'authentification par mot de passe du Gateway n'est fournie qu'au démarrage, passez la même valeur à Gateway`openclaw security audit --auth password --password <password>` afin que l'audit puisse la comparer à `hooks.token`.
Exécutez `openclaw doctor --fix` pour faire pivoter un `hooks.token` réutilisé persistant, puis mettez à jour les expéditeurs de hook externes pour utiliser le nouveau jeton de hook.

Il avertit également lorsque les paramètres sandbox Docker sont configurés alors que le mode sandbox est désactivé, lorsque Docker`gateway.nodes.denyCommands` utilise des entrées inefficaces de type modèle/inconnues (correspondance exacte du nom de commande de nœud uniquement, pas de filtrage de texte de shell), lorsque `gateway.nodes.allowCommands` active explicitement des commandes de nœud dangereuses, lorsque `tools.profile="minimal"` global est remplacé par les profils d'outil d'agent, lorsque les outils d'écriture/de modification sont désactivés mais que `exec` est toujours disponible sans limite de système de fichiers sandbox, lorsque les groupes ouverts exposent des outils d'exécution/système de fichiers sans gardes de sandbox/espace de travail, et lorsque les outils de plugin installés peuvent être accessibles sous une politique d'outil permissive.
Il signale également `gateway.allowRealIpFallback=true` (risque d'usurpation d'en-tête si les proxys sont mal configurés) et `discovery.mdns.mode="full"`Docker (fuite de métadonnées via les enregistrements TXT mDNS).
Il avertit également lorsque le navigateur sandbox utilise le réseau Docker `bridge` sans `sandbox.browser.cdpSourceRange`Docker.
Il signale également les modes de réseau Docker sandbox dangereux (y compris les jointures d'espace de noms `host` et `container:*`Docker).
Il avertit également lorsque les conteneurs Docker du navigateur sandbox existants ont des étiquettes de hachage manquantes/périmées (par exemple, les conteneurs pré-migration manquant `openclaw.browserConfigEpoch`) et recommande `openclaw sandbox recreate --browser --all`.
Il avertit également lorsque les enregistrements d'installation de plugin/hook basés sur npm ne sont pas épinglés, manquent de métadonnées d'intégrité ou dérivent des versions de paquets actuellement installées.
Il avertit lorsque les listes d'autorisation de canaux reposent sur des noms/e-mails/tags modifiables au lieu d'ID stables (portées Discord, Slack, Google Chat, Microsoft Teams, Mattermost, IRC le cas échéant).
Il avertit lorsque `gateway.auth.mode="none"` laisse les API HTTP Gateway accessibles sans secret partagé (`/tools/invoke` plus tout point de terminaison `/v1/*` activé).
Les paramètres préfixés par `dangerous`/`dangerously` sont des substitutions explicites d'opérateur de dernier recours ; en activer un ne constitue pas, en soi, un rapport de vulnérabilité de sécurité.
Pour l'inventaire complet des paramètres dangereux, consultez la section « Résumé des indicateurs non sécurisés ou dangereux » dans [Sécurité](/fr/gateway/security).

Les constats intentionnels persistants peuvent être acceptés avec `security.audit.suppressions`.
Chaque suppression correspond exactement à un `checkId` et peut être restreinte par des sous-chaînes `titleIncludes` et/ou `detailIncludes` insensibles à la casse :

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

Les constats supprimés sont retirés de la liste `summary` et `findings` active.
La sortie JSON les conserve sous `suppressedFindings` pour la traçabilité.
Lorsque des suppressions sont configurées, la sortie active conserve également un constat d'information `security.audit.suppressions.active` non supprimable afin que les lecteurs puissent voir que l'audit a été filtré. Les indicateurs de configuration dangereux sont émis un indicateur par constat, donc accepter un indicateur dangereux ne masque pas les autres indicateurs activés qui partagent le même `config.insecure_or_dangerous_flags` checkId.
Parce que les suppressions peuvent masquer des risques persistants, l'ajout ou la suppression de celles-ci via des commandes shell d'exécution d'agent nécessite une approbation exec, sauf si exec s'exécute déjà avec `security="full"` et `ask="off"` pour l'automatisation locale de confiance.

Comportement de SecretRef :

- `security audit` résout les SecretRefs pris en charge en mode lecture seule pour ses chemins ciblés.
- Si un SecretRef n'est pas disponible dans le chemin de la commande actuelle, l'audit se poursuit et signale `secretDiagnostics` (au lieu de planter).
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

- change les `groupPolicy="open"` courants en `groupPolicy="allowlist"` (y compris les variantes de compte dans les canaux pris en charge)
- lorsque la stratégie de groupe WhatsApp bascule vers `allowlist`, amorçage de `groupAllowFrom` à partir du
  fichier `allowFrom` stocké lorsque cette liste existe et que la configuration ne définit pas encore
  `allowFrom`
- définit `logging.redactSensitive` de `"off"` à `"tools"`
- resserre les autorisations pour l'état/la configuration et les fichiers sensibles courants
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, session
  `*.jsonl`)
- resserre également les fichiers d'inclusion de configuration référencés à partir de `openclaw.json`
- utilise `chmod` sur les hôtes POSIX et les réinitialisations `icacls` sur Windows

`--fix` ne fait **pas** :

- faire une rotation des jetons/mots de passe/clés API
- désactiver les outils (`gateway`, `cron`, `exec`, etc.)
- modifier les choix de liaison/authentification/exposition réseau de la passerelle
- supprimer ou réécrire les plugins/compétences

## Connexes

- [référence CLI](/fr/cli)
- [Audit de sécurité](/fr/gateway/security)

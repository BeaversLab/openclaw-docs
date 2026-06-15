---
summary: "Modes de permission pour l'exécution hôte, les approbations Codex Guardian et les sessions de harnais ACPX"
read_when:
  - Choosing auto, ask, allowlist, full, or deny for command permissions
  - Configuring Codex Guardian-reviewed approvals through tools.exec.mode
  - Comparing OpenClaw exec approvals with ACPX harness permissions
title: "Modes de permission"
---

Les modes de permission déterminent l'autorité d'un agent avant qu'il ne puisse exécuter des commandes hôtes, écrire des fichiers ou demander un accès supplémentaire à un harnais backend. Commencez avec `tools.exec.mode: "auto"` lorsque vous voulez qu'OpenClaw utilise d'abord des listes d'autorisation, puis la révision automatique native de Codex ou une voie d'approbation humaine pour les échecs.

<Note>Le mode de permission est distinct de `tools.exec.host=auto`. `tools.exec.host` choisit où une commande s'exécute. `tools.exec.mode` choisit comment l'exécution hôte est approuvée.</Note>

## Par défaut recommandé

Utilisez `auto` pour les agents de codage qui ont besoin d'un accès hôte utile sans faire de chaque échec une invite humaine :

```bash
openclaw config set tools.exec.mode auto
openclaw approvals get
openclaw gateway restart
```

Vérifiez ensuite la stratégie efficace :

```bash
openclaw exec-policy show
```

En mode `auto`, OpenClaw exécute directement les correspondances de liste d'autorisation déterministes. Les absences d'approbation passent d'abord par l'auto-réviseur natif de OpenClaw, puis reviennent au parcours d'approbation humaine configuré si nécessaire.

## Modes d'exécution hôte OpenClaw

`tools.exec.mode` est la surface de stratégie normalisée pour l' `exec` de l'hôte.

| Mode        | Comportement                                                                            | À utiliser quand                                                       |
| ----------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `deny`      | Bloquer l'exécution hôte.                                                               | Aucune commande hôte n'est autorisée.                                  |
| `allowlist` | Exécuter uniquement les commandes de la liste d'autorisation.                           | Vous disposez d'un ensemble de commandes connues comme sûres.          |
| `ask`       | Exécuter les correspondances de la liste d'autorisation et demander en cas d'absence.   | Un humain doit examiner les nouvelles commandes.                       |
| `auto`      | Exécuter les correspondances de la liste d'autorisation, puis utiliser l'auto-révision. | Les sessions de codage nécessitent un accès gardé pratique.            |
| `full`      | Exécuter l'exec hôte sans invite.                                                       | Cet hôte/session de confiance devrait sauter les portes d'approbation. |

Pour la stratégie complète d'exécution hôte, le fichier d'approbations locales, le schéma de liste blanche, les bacs sûrs et le comportement de transfert, voir [Approbations d'exécution](/fr/tools/exec-approvals).

## Mappage Codex Guardian

Pour les sessions natives de serveur d'application Codex, `tools.exec.mode: "auto"` correspond aux approbations vérifiées par Codex Guardian lorsque les exigences Codex locales l'autorisent. OpenClaw envoie généralement :

| Champ Codex         | Valeur typique    |
| ------------------- | ----------------- |
| `approvalPolicy`    | `on-request`      |
| `approvalsReviewer` | `auto_review`     |
| `sandbox`           | `workspace-write` |

En mode `auto`, OpenClaw ne conserve pas les substitutions Codex non sécurisées héritées telles que `approvalPolicy: "never"` ou `sandbox: "danger-full-access"`. N'utilisez `tools.exec.mode: "full"` que si vous souhaitez intentionnellement une posture sans approbation.

Pour la configuration du serveur d'application, l'ordre d'authentification et les détails d'exécution natifs de Codex, consultez [Codex harness](/fr/plugins/codex-harness).

## Autorisations du harnais ACPX

Les sessions ACPX sont non interactives, elles ne peuvent donc pas cliquer sur une invite d'autorisation TTY. ACPX utilise des paramètres distincts au niveau du harnais sous `plugins.entries.acpx.config` :

| Paramètre                   | Valeur courante | Signification                                                   |
| --------------------------- | --------------- | --------------------------------------------------------------- |
| `permissionMode`            | `approve-reads` | Approuver automatiquement les lectures uniquement.              |
| `permissionMode`            | `approve-all`   | Approuver automatiquement les écritures et les commandes shell. |
| `permissionMode`            | `deny-all`      | Refuser toutes les invites d'autorisation.                      |
| `nonInteractivePermissions` | `fail`          | Abandonner lorsqu'une invite serait requise.                    |
| `nonInteractivePermissions` | `deny`          | Refuser l'invite et continuer si possible.                      |

Définissez les autorisations ACPX séparément des approbations d'exécution OpenClaw :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
openclaw gateway restart
```

Utilisez `approve-all` comme l'équivalent de bris de glace ACPX d'une session de harnais sans invite. Pour les détails de configuration et les modes d'échec, consultez [ACP agents setup](/fr/tools/acp-agents-setup#permission-configuration).

## Choisir un mode

| Objectif                                                                    | Configurer                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Bloquer complètement les commandes de l'hôte                                | `tools.exec.mode: "deny"`                                                             |
| Autoriser uniquement l'exécution des commandes connues comme sûres          | `tools.exec.mode: "allowlist"`                                                        |
| Demander à un humain pour chaque nouvelle forme de commande                 | `tools.exec.mode: "ask"`                                                              |
| Utiliser la révision automatique Codex/OpenClaw avant les humains           | `tools.exec.mode: "auto"`                                                             |
| Ignorer entièrement les approbations d'exécution de l'hôte                  | `tools.exec.mode: "full"` ainsi que le fichier d'approbations de l'hôte correspondant |
| Autoriser l'écriture et l'exécution dans les sessions ACPX non interactives | `plugins.entries.acpx.config.permissionMode: "approve-all"`                           |

Si une commande demande toujours une confirmation ou échoue après le changement de mode, inspectez les deux couches :

```bash
openclaw approvals get
openclaw exec-policy show
```

L'exécution de l'hôte utilise le résultat le plus strict de la configuration OpenClaw et du fichier d'approbations local à l'hôte. Les permissions du harnais ACPX ne relâchent pas les approbations d'exécution de l'hôte, et les approbations d'exécution de l'hôte ne relâchent pas les invites du harnais ACPX.

## Connexes

- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Approbations d'exécution - avancé](/fr/tools/exec-approvals-advanced)
- [Harnais Codex](/fr/plugins/codex-harness)
- [Configuration des agents ACP](/fr/tools/acp-agents-setup#permission-configuration)

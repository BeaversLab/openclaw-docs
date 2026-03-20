---
summary: "Mode d'exécution élevé et directives /elevated"
read_when:
  - Ajustement des valeurs par défaut du mode élevé, des listes d'autorisation ou du comportement des commandes slash
title: "Mode élevé"
---

# Mode élevé (directives /elevated)

## Ce qu'il fait

- `/elevated on` s'exécute sur l'hôte de la passerelle et conserve les approbations d'exécution (identique à `/elevated ask`).
- `/elevated full` s'exécute sur l'hôte de la passerelle **et** approuve automatiquement l'exécution (ignore les approbations d'exécution).
- `/elevated ask` s'exécute sur l'hôte de la passerelle mais conserve les approbations d'exécution (identique à `/elevated on`).
- `on`/`ask` ne forcent **pas** `exec.security=full` ; la stratégie de sécurité/demande configurée s'applique toujours.
- Modifie le comportement uniquement lorsque l'agent est **sandboxed** (sinon, l'exécution a déjà lieu sur l'hôte).
- Formes de directive : `/elevated on|off|ask|full`, `/elev on|off|ask|full`.
- Seuls les `on|off|ask|full` sont acceptés ; tout autre retourne un indice et ne change pas l'état.

## Ce qu'il contrôle (et ce qu'il ne contrôle pas)

- **Portes de disponibilité** : `tools.elevated` est la ligne de base globale. `agents.list[].tools.elevated` peut restreindre davantage le mode élevé par agent (les deux doivent autoriser).
- **État par session** : `/elevated on|off|ask|full` définit le niveau élevé pour la clé de session actuelle.
- **Directive en ligne** : `/elevated on|ask|full` à l'intérieur d'un message s'applique uniquement à ce message.
- **Groupes** : Dans les discussions de groupe, les directives élevées sont honorées uniquement lorsque l'agent est mentionné. Les messages de type commande uniquement qui contournent les exigences de mention sont traités comme s'ils étaient mentionnés.
- **Exécution de l'hôte** : le mode élevé force `exec` sur l'hôte de la passerelle ; `full` définit également `security=full`.
- **Approbations** : `full` ignore les approbations d'exécution ; `on`/`ask` les respectent lorsque les règles de liste d'autorisation/demande l'exigent.
- **Agents non isolés** : sans effet pour l'emplacement ; affecte uniquement la validation (gating), la journalisation et le statut.
- **La stratégie d'outil s'applique toujours** : si `exec` est refusé par la stratégie d'outil, le mode élevé ne peut pas être utilisé.
- **Séparé de `/exec`** : `/exec` ajuste les valeurs par défaut par session pour les expéditeurs autorisés et ne nécessite pas de mode élevé.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini en envoyant un message contenant uniquement la directive).
3. Valeur par défaut globale (`agents.defaults.elevatedDefault` dans la configuration).

## Définir une valeur par défaut de session

- Envoyez un message qui est **uniquement** la directive (espaces blancs autorisés), par exemple `/elevated full`.
- Une réponse de confirmation est envoyée (`Elevated mode set to full...` / `Elevated mode disabled.`).
- Si l'accès élevé est désactivé ou si l'expéditeur ne figure pas sur la liste d'autorisation approuvée, la directive répond par une erreur actionnable et ne modifie pas l'état de la session.
- Envoyez `/elevated` (ou `/elevated:`) sans argument pour voir le niveau élevé actuel.

## Disponibilité + listes d'autorisation

- Feature gate : `tools.elevated.enabled` (par défaut peut être désactivé via la configuration même si le code le prend en charge).
- Sender allowlist : `tools.elevated.allowFrom` avec des listes d'autorisation par fournisseur (ex. `discord`, `whatsapp`).
- Les entrées de liste d'autorisation sans préfixe correspondent uniquement aux valeurs d'identité délimitées à l'expéditeur (`SenderId`, `SenderE164`, `From`) ; les champs de routage du destinataire ne sont jamais utilisés pour l'autorisation élevée.
- Les métadonnées d'expéditeur modifiables nécessitent des préfixes explicites :
  - `name:<value>` correspond à `SenderName`
  - `username:<value>` correspond à `SenderUsername`
  - `tag:<value>` correspond à `SenderTag`
  - `id:<value>`, `from:<value>`, `e164:<value>` sont disponibles pour le ciblage explicite d'identité
- Per-agent gate : `agents.list[].tools.elevated.enabled` (facultatif ; ne peut que restreindre davantage).
- Per-agent allowlist : `agents.list[].tools.elevated.allowFrom` (facultatif ; lorsqu'elle est définie, l'expéditeur doit correspondre aux listes d'autorisation globales **et** par agent).
- Discord de secours : si `tools.elevated.allowFrom.discord` est omis, la liste `channels.discord.allowFrom` est utilisée comme solution de secours (ancien : `channels.discord.dm.allowFrom`). Définissez `tools.elevated.allowFrom.discord` (même `[]`) pour remplacer. Les listes d'autorisation par agent n'utilisent **pas** la solution de secours.
- Toutes les portes doivent être passées ; sinon, le mode élevé est traité comme indisponible.

## Journalisation + statut

- Les appels exec élevés sont journalisés au niveau info.
- L'état de la session inclut le mode élevé (ex. `elevated=ask`, `elevated=full`).

import fr from "/components/footer/fr.mdx";

<fr />

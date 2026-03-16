---
summary: "Contexte : ce que le modèle voit, comment il est construit et comment l'inspecter"
read_when:
  - You want to understand what “context” means in OpenClaw
  - You are debugging why the model “knows” something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Contexte"
---

# Contexte

Le « contexte » est **tout ce que OpenClaw envoie au modèle pour une exécution**. Il est limité par la **fenêtre de contexte** du modèle (limite de jetons).

Modèle mental pour débutants :

- **Invite système** (construite par OpenClaw) : règles, outils, liste de compétences, heure/exécution et fichiers d'espace de travail injectés.
- **Historique de conversation** : vos messages + les messages de l'assistant pour cette session.
- **Appels/résultats d'outils + pièces jointes** : sortie de commande, lectures de fichiers, images/audio, etc.

Le contexte n'est _pas la même chose_ que la « mémoire » : la mémoire peut être stockée sur disque et rechargée plus tard ; le contexte est ce qui se trouve dans la fenêtre actuelle du modèle.

## Démarrage rapide (inspecter le contexte)

- `/status` → vue rapide de « à quel point ma fenêtre est pleine ? » + paramètres de session.
- `/context list` → ce qui est injecté + tailles approximatives (par fichier + totaux).
- `/context detail` → ventilation plus approfondie : tailles par fichier, par schéma d'outil, par entrée de compétence et taille de l'invite système.
- `/usage tokens` → ajouter un pied de page d'utilisation par réponse aux réponses normales.
- `/compact` → résumer l'historique ancien dans une entrée compacte pour libérer de l'espace dans la fenêtre.

Voir aussi : [Commandes slash](/fr/tools/slash-commands), [Utilisation des jetons et coûts](/fr/reference/token-use), [Compactage](/fr/concepts/compaction).

## Exemple de sortie

Les valeurs varient selon le modèle, le fournisseur, la stratégie d'outil et ce qui se trouve dans votre espace de travail.

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

## Ce qui compte dans la fenêtre de contexte

Tout ce que le modèle reçoit compte, y compris :

- Invite système (toutes les sections).
- Historique de conversation.
- Appels d'outils + résultats d'outils.
- Pièces jointes/transcriptions (images/audio/fichiers).
- Résumés de compactage et artefacts d'élagage.
- « Enveloppes » du fournisseur ou en-têtes masqués (non visibles, mais toujours comptés).

## Comment OpenClaw construit l'invite système

Le système de prompt est **propriétaire d'OpenClaw** et reconstruit à chaque exécution. Il inclut :

- Liste des outils + descriptions courtes.
- Liste des Skills (métadonnées uniquement ; voir ci-dessous).
- Emplacement de l'espace de travail.
- Heure (UTC + heure utilisateur convertie si configuré).
- Métadonnées d'exécution (hôte/OS/modèle/réflexion).
- Fichiers d'amorçage de l'espace de travail injectés sous **Projet Context**.

Détail complet : [System Prompt](/fr/concepts/system-prompt).

## Fichiers de l'espace de travail injectés (Projet Context)

Par défaut, OpenClaw injecte un ensemble fixe de fichiers de l'espace de travail (si présents) :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (première exécution uniquement)

Les fichiers volumineux sont tronqués par fichier en utilisant `agents.defaults.bootstrapMaxChars` (défaut `20000` caractères). OpenClaw applique également une limite totale d'injection d'amorçage sur tous les fichiers avec `agents.defaults.bootstrapTotalMaxChars` (défaut `150000` caractères). `/context` affiche les tailles **brutes vs injectées** et indique si une troncature a eu lieu.

Lorsqu'une troncature se produit, l'exécution peut injecter un bloc d'avertissement dans le prompt sous Projet Context. Configurez ceci avec `agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ; défaut `once`).

## Skills : ce qui est injecté vs chargé à la demande

Le système de prompt inclut une **liste de skills** compacte (nom + description + emplacement). Cette liste a un surcoût réel.

Les instructions du skill ne sont _pas_ incluses par défaut. On s'attend à ce que le modèle `read` le `SKILL.md` du skill **uniquement lorsque nécessaire**.

## Outils : il y a deux coûts

Les outils affectent le contexte de deux manières :

1. **Texte de la liste des outils** dans le système de prompt (ce que vous voyez en tant que « Tooling »).
2. **Schémas d'outils** (JSON). Ceux-ci sont envoyés au modèle afin qu'il puisse appeler des outils. Ils comptent dans le contexte même si vous ne les voyez pas en texte brut.

`/context detail` détaille les plus grands schémas d'outils pour que vous puissiez voir ce qui prédomine.

## Commandes, directives et « raccourcis en ligne »

Les commandes slash sont gérées par la Gateway. Il existe quelques comportements différents :

- **Commandes autonomes** : un message qui n'est que `/...` s'exécute en tant que commande.
- **Directives** : `/think`, `/verbose`, `/reasoning`, `/elevated`, `/model`, `/queue` sont supprimés avant que le modèle ne voie le message.
  - Les messages contenant uniquement des directives conservent les paramètres de la session.
  - Les directives en ligne dans un message normal agissent comme des indices par message.
- **Raccourcis en ligne** (expéditeurs autorisés uniquement) : certains jetons `/...` à l'intérieur d'un message normal peuvent s'exécuter immédiatement (exemple : « hey /status »), et sont supprimés avant que le modèle ne voie le texte restant.

Détails : [Commandes slash](/fr/tools/slash-commands).

## Sessions, compactage et élagage (ce qui persiste)

Ce qui persiste d'un message à l'autre dépend du mécanisme :

- **L'historique normal** persiste dans la transcription de la session jusqu'à ce qu'il soit compacté/élagué par la stratégie.
- **Le compactage** fait persister un résumé dans la transcription et conserve les messages récents intacts.
- **L'élagage** supprime les anciens résultats d'outils du prompt _en mémoire_ pour une exécution, mais ne réécrit pas la transcription.

Docs : [Session](/fr/concepts/session), [Compactage](/fr/concepts/compaction), [Élagage de session](/fr/concepts/session-pruning).

Par défaut, OpenClaw utilise le moteur de contexte intégré `legacy` pour l'assemblage et
la compactage. Si vous installez un plugin qui fournit `kind: "context-engine"` et
que vous le sélectionnez avec `plugins.slots.contextEngine`, OpenClaw délègue l'assemblage du contexte,
`/compact` et les hooks de cycle de vie du contexte des sous-agents associés à ce
moteur à la place.

## Ce que `/context` rapporte réellement

`/context` préfère le dernier rapport de prompt système **construit lors de l'exécution** (run-built) lorsqu'il est disponible :

- `System prompt (run)` = capturé lors de la dernière exécution intégrée (capable d'utiliser des outils) et conservé dans le magasin de session.
- `System prompt (estimate)` = calculé à la volée lorsqu'aucun rapport d'exécution n'existe (ou lors de l'exécution via un backend CLI qui ne génère pas le rapport).

Dans les deux cas, il signale les tailles et les principaux contributeurs ; il **ne** vide **pas** le prompt système complet ni les schémas d'outils.

import fr from "/components/footer/fr.mdx";

<fr />

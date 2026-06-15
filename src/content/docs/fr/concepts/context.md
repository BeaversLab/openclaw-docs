---
summary: "Contexte : ce que le modèle voit, comment il est construit et comment l'inspecter"
read_when:
  - You want to understand what "context" means in OpenClaw
  - You are debugging why the model "knows" something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Contexte"
---

Le « contexte » est **tout ce qu'OpenClaw envoie au modèle pour une exécution**. Il est limité par la **fenêtre de contexte** (limite de jetons) du modèle.

Modèle mental débutant :

- **Invite système** (construite par OpenClaw) : règles, outils, liste des compétences, heure/exécution et fichiers de l'espace de travail injectés.
- **Historique de conversation** : vos messages + les messages de l'assistant pour cette session.
- **Appels/résultats d'outils + pièces jointes** : sortie de commande, lectures de fichiers, images/audio, etc.

Le contexte n'est _pas la même chose_ que la « mémoire » : la mémoire peut être stockée sur disque et rechargée plus tard ; le contexte est ce qui se trouve dans la fenêtre actuelle du modèle.

## Quick start (inspect context)

- `/status` → vue rapide « ma fenêtre est-elle pleine ? » + paramètres de session.
- `/context list` → ce qui est injecté + tailles approximatives (par fichier + totaux).
- `/context detail` → répartition plus détaillée : par fichier, tailles de schéma par outil, tailles d'entrée par compétence, et taille du prompt système.
- `/context map` → image de treemap style WinDirStat des contributeurs au contexte suivis pour la session actuelle.
- `/usage tokens` → ajoute un pied de page d'utilisation par réponse aux réponses normales.
- `/compact` → résume l'historique ancien en une entrée compacte pour libérer de l'espace dans la fenêtre.

Voir aussi : [Commandes slash](/fr/tools/slash-commands), [Utilisation des tokens et coûts](/fr/reference/token-use), [Compactage](/fr/concepts/compaction).

## Exemple de sortie

Les valeurs varient en fonction du model, du provider, de la politique d'outil et de ce qui se trouve dans votre espace de travail.

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 12,000 chars
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

### `/context map`

Envoie une image générée à partir du dernier rapport d'exécution mis en cache. Avant qu'un message normal n'ait produit un rapport d'exécution dans la session, `/context map` renvoie un message indisponible au lieu de rendre une estimation. La surface du rectangle est proportionnelle aux caractères de prompt suivis :

- fichiers de l'espace de travail injectés
- texte du système de base
- entrées de prompt de compétences
- schémas JSON d'outils

`/context list`, `/context detail` et `/context json` peuvent toujours inspecter une estimation à la demande lorsqu'aucun rapport d'exécution n'est mis en cache.

## Ce qui compte dans la fenêtre de contexte

Tout ce que le model reçoit compte, y compris :

- System prompt (toutes les sections).
- Historique de la conversation.
- Appels d'outils + résultats des outils.
- Pièces jointes/transcriptions (images/audio/fichiers).
- Résumés de compactage et artefacts d'élagage.
- "Wrappers" ou en-têtes cachés du provider (non visibles, mais toujours comptés).

## Comment OpenClaw construit le system prompt

Le system prompt est **la propriété de OpenClaw** et est reconstruit à chaque exécution. Il inclut :

- Liste des outils + courtes descriptions.
- Liste des Skills (métadonnées uniquement ; voir ci-dessous).
- Emplacement de l'espace de travail.
- Heure (UTC + heure utilisateur convertie si configurée).
- Métadonnées d'exécution (hôte/OS/model/pensée).
- Fichiers d'amorçage de l'espace de travail injectés sous **Projet Context**.

Répartition complète : [System Prompt](/fr/concepts/system-prompt).

## Fichiers de l'espace de travail injectés (Projet Context)

Par défaut, OpenClaw injecte un ensemble fixe de fichiers de l'espace de travail (s'ils sont présents) :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (première exécution uniquement)

Les fichiers volumineux sont tronqués par fichier à l'aide de `agents.defaults.bootstrapMaxChars` (défaut `20000`OpenClaw caractères). OpenClaw applique également une limite totale d'injection d'amorçage sur tous les fichiers avec `agents.defaults.bootstrapTotalMaxChars` (défaut `60000` caractères). `/context` affiche les tailles **brutes par rapport à injectées** et indique si une troncature a eu lieu.

Lorsqu'une troncation se produit, le runtime peut injecter un bloc d'avertissement dans le prompt sous le contexte du projet. Configurez ceci avec `agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`; par défaut `always`).

## Compétences : injectées vs chargées à la demande

Le prompt système inclut une **liste de compétences** compacte (nom + description + emplacement). Cette liste représente une surcharge réelle.

Les instructions des compétences ne sont _pas_ incluses par défaut. On attend du modèle qu'il `read` le `SKILL.md` de la compétence **uniquement lorsque cela est nécessaire**.

## Outils : il y a deux coûts

Les outils affectent le contexte de deux manières :

1. **Texte de la liste des outils** dans le prompt système (ce que vous voyez en tant que "Tooling").
2. **Schémas d'outils** (JSON). Ceux-ci sont envoyés au modèle afin qu'il puisse appeler les outils. Ils comptent dans le contexte même si vous ne les voyez pas en texte brut.

`/context detail` détaille les plus gros schémas d'outils afin que vous puissiez voir ce qui domine.

## Commandes, directives et "raccourcis en ligne"

Les commandes slash sont gérées par la Gateway. Il y a quelques comportements différents :

- **Commandes autonomes** : un message qui est uniquement `/...` s'exécute en tant que commande.
- **Directives** : `/think`, `/verbose`, `/trace`, `/reasoning`, `/elevated`, `/model`, `/queue` sont supprimées avant que le modèle ne voie le message.
  - Les messages constitués uniquement de directives conservent les paramètres de la session.
  - Les directives en ligne dans un message normal agissent comme des indices par message.
- **Raccourcis en ligne** (expéditeurs autorisés uniquement) : certains jetons `/...` dans un message normal peuvent s'exécuter immédiatement (exemple : « hey /status »), et sont supprimés avant que le modèle ne voie le texte restant.

Détails : [Commandes slash](/fr/tools/slash-commands).

## Sessions, compactage et élagage (ce qui persiste)

Ce qui persiste d'un message à l'autre dépend du mécanisme :

- **L'historique normal** persiste dans la transcription de la session jusqu'à ce qu'il soit compacté/élagué par la stratégie.
- **Le compactage** fait persister un résumé dans la transcription et conserve les messages récents intacts.
- **L'élagage** supprime les anciens résultats d'outils du _prompt en mémoire_ pour libérer de l'espace dans la fenêtre de contexte, mais ne réécrit pas la transcription de la session - l'historique complet est toujours inspectable sur le disque.

Docs : [Session](/fr/concepts/session), [Compactage](/fr/concepts/compaction), [Élagage de session](/fr/concepts/session-pruning).

Par défaut, OpenClaw utilise le moteur de contexte intégré `legacy` pour l'assemblage et le compactage. Si vous installez un plugin qui fournit `kind: "context-engine"` et que vous le sélectionnez avec `plugins.slots.contextEngine`, OpenClaw délègue l'assemblage du contexte, `/compact` et les hooks de cycle de vie de contexte de sous-agent connexes à ce moteur à la place. `ownsCompaction: false` ne revient pas automatiquement à l'ancien moteur ; le moteur actif doit toujours implémenter `compact()` correctement. Voir [Context Engine](/fr/concepts/context-engine) pour l'interface complète enfichable, les hooks de cycle de vie et la configuration.

## Ce que `/context` rapporte réellement

`/context` préfère le dernier rapport de prompt système **construit lors de l'exécution** lorsqu'il est disponible :

- `System prompt (run)` = capturé à partir de la dernière exécution intégrée (capable d'utiliser des outils) et persisté dans le magasin de sessions.
- `System prompt (estimate)` = calculé à la volée lorsqu'aucun rapport d'exécution n'existe (ou lors de l'exécution via un backend CLI qui ne génère pas le rapport).

Dans les deux cas, il signale les tailles et les principaux contributeurs ; il **ne** déverse **pas** le prompt système complet ou les schémas d'outils.

## Connexes

<CardGroup cols={2}>
  <Card title="Moteur de contexte" href="/fr/concepts/context-engine" icon="puzzle-piece">
    Injection de contexte personnalisé via des plugins.
  </Card>
  <Card title="Compactage" href="/fr/concepts/compaction" icon="compress">
    Résumé des longues conversations pour les maintenir dans la fenêtre du modèle.
  </Card>
  <Card title="Invite système" href="/fr/concepts/system-prompt" icon="message-lines">
    Construction de l'invite système et ce qu'elle injecte à chaque tour.
  </Card>
  <Card title="Boucle de l'agent" href="/fr/concepts/agent-loop" icon="arrows-rotate">
    Le cycle complet d'exécution de l'agent, du message entrant à la réponse finale.
  </Card>
</CardGroup>

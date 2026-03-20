---
summary: "Notes de recherche : système de mémoire hors ligne pour les espaces de travail Clawd (Markdown source de vérité + index dérivé)"
read_when:
  - Conception de la mémoire de l'espace de travail (~/.openclaw/workspace) au-delà des journaux Markdown quotidiens
  - Décision: CLI autonome vs intégration OpenClaw profonde
  - Ajout du rappel hors ligne + de la réflexion (retenir/rappeler/réfléchir)
title: "Recherche sur la mémoire de l'espace de travail"
---

# Mémoire de l'espace de travail v2 (hors ligne) : notes de recherche

Cible : espace de travail style Clawd (`agents.defaults.workspace`, `~/.openclaw/workspace` par défaut) où la « mémoire » est stockée sous la forme d'un fichier Markdown par jour (`memory/YYYY-MM-DD.md`) plus un petit ensemble de fichiers stables (ex. `memory.md`, `SOUL.md`).

Ce document propose une architecture de mémoire **hors ligne d'abord** qui conserve le Markdown comme source de vérité canonique et vérifiable, mais ajoute un **rappel structuré** (recherche, résumés d'entités, mises à jour de confiance) via un index dérivé.

## Pourquoi changer ?

La configuration actuelle (un fichier par jour) est excellente pour :

- la journalisation « ajout uniquement »
- l'édition humaine
- la durabilité et l'auditabilité soutenues par git
- la capture à faible friction (« notez-le simplement »)

Elle est faible pour :

- la récupération à haut rappel (« qu'avons-nous décidé à propos de X ? », « la dernière fois que nous avons essayé Y ? »)
- les réponses centrées sur les entités (« parle-moi d'Alice / du Château / warelay ») sans avoir à relire de nombreux fichiers
- la stabilité des opinions/préférences (et les preuves lorsqu'elles changent)
- les contraintes temporelles (« qu'était vrai en novembre 2025 ? ») et la résolution des conflits

## Objectifs de conception

- **Hors ligne** : fonctionne sans réseau ; peut fonctionner sur ordinateur portable/Château ; aucune dépendance cloud.
- **Explicable** : les éléments récupérés doivent être attribuables (fichier + emplacement) et séparables de l'inférence.
- **Peu de cérémonie** : la journalisation quotidienne reste en Markdown, aucun travail de schéma lourd.
- **Incrémental** : v1 est utile avec la recherche en texte intégrale uniquement ; la sémantique/vectorielle et les graphiques sont des améliorations optionnelles.
- **Convivial pour les agents** : facilite le « rappel dans les limites du budget de jetons » (renvoie de petits paquets de faits).

## Modèle étoile polaire (Hindsight × Letta)

Deux éléments à combiner :

1. **Boucle de contrôle style Letta/MemGPT**

- garder un petit « noyau » toujours dans le contexte (personnalité + faits clés de l'utilisateur)
- tout le reste est hors contexte et récupéré via des outils
- les écritures mémoire sont des appels d'outil explicites (ajouter/remplacer/insérer), persistants, puis réinjectés au tour suivant

2. **Substrat de mémoire style Hindsight**

- séparer ce qui est observé de ce qui est cru et de ce qui est résumé
- prendre en charge retain/recall/reflect
- opinions avec niveau de confiance pouvant évoluer avec les preuves
- récupération sensible aux entités + requêtes temporelles (même sans graphes de connaissances complets)

## Architecture proposée (source de vérité Markdown + index dérivé)

### Stockage canonique (compatible git)

Garder `~/.openclaw/workspace` comme mémoire canonique lisible par l'humain.

Disposition de l'espace de travail suggérée :

```
~/.openclaw/workspace/
  memory.md                    # small: durable facts + preferences (core-ish)
  memory/
    YYYY-MM-DD.md              # daily log (append; narrative)
  bank/                        # “typed” memory pages (stable, reviewable)
    world.md                   # objective facts about the world
    experience.md              # what the agent did (first-person)
    opinions.md                # subjective prefs/judgments + confidence + evidence pointers
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

Notes :

- **Le journal quotidien reste un journal quotidien**. Pas besoin de le transformer en JSON.
- Les fichiers `bank/` sont **sélectionnés**, produits par les tâches de réflexion, et peuvent toujours être modifiés à la main.
- `memory.md` reste « petit + essentiel » : les éléments que vous voulez que Clawd voie à chaque session.

### Stockage dérivé (rappel machine)

Ajouter un index dérivé sous l'espace de travail (pas nécessairement suivi par git) :

```
~/.openclaw/workspace/.memory/index.sqlite
```

Soutenir avec :

- schéma SQLite pour les faits + liens d'entités + métadonnées d'opinion
- SQLite **FTS5** pour le rappel lexical (rapide, minuscule, hors ligne)
- table d'intégrations optionnelle pour le rappel sémantique (toujours hors ligne)

L'index est toujours **reconstruisible à partir de Markdown**.

## Retain / Recall / Reflect (boucle opérationnelle)

### Retain : normaliser les journaux quotidiens en « faits »

L'élément clé de Hindsight qui compte ici : stocker des **faits narratifs et autonomes**, pas de minuscules extraits.

Règle pratique pour `memory/YYYY-MM-DD.md` :

- à la fin de la journée (ou pendant), ajouter une section `## Retain` avec 2 à 5 puces qui sont :
  - narratifs (contexte inter-tours préservé)
  - autonomes (indépendants, compréhensibles plus tard)
  - étiquetés avec type + mentions d'entités

Exemple :

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

Analyse minimale :

- Préfixe de type : `W` (monde), `B` (expérience/biographique), `O` (opinion), `S` (observation/résumé ; généralement généré)
- Entités : `@Peter`, `@warelay`, etc (les slugs correspondent à `bank/entities/*.md`)
- Confiance de l'opinion : `O(c=0.0..1.0)` optionnel

Si vous ne voulez pas que les auteurs y réfléchissent : la tâche de réflexion peut déduire ces puces du reste du journal, mais avoir une section `## Retain` explicite est le « levier de qualité » le plus simple.

### Rappel : requêtes sur l'index dérivé

Le rappel doit prendre en charge :

- **lexicale** : « trouver les termes exacts / noms / commandes » (FTS5)
- **entité** : « parlez-moi de X » (pages d'entité + facts liés aux entités)
- **temporelle** : « qu'est-ce qui s'est passé autour du 27 novembre » / « depuis la semaine dernière »
- **opinion** : « que préfère Peter ? » (avec confiance + preuves)

Le format de retour doit être adapté aux agents et citer les sources :

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (jour source, ou plage de temps extraite si présente)
- `entities` (`["Peter","warelay"]`)
- `content` (le fact narratif)
- `source` (`memory/2025-11-27.md#L12` etc.)

### Réflexion : produire des pages stables + mettre à jour les croyances

La réflexion est une tâche planifiée (quotidienne ou à chaque battement de cœur `ultrathink`) qui :

- met à jour `bank/entities/*.md` à partir des faits récents (résumés d'entités)
- met à jour la confiance `bank/opinions.md` en fonction du renforcement/contradiction
- propose facultativement des modifications `memory.md` (faits durables « fondamentaux »)

Évolution de l'opinion (simple, explicable) :

- chaque opinion a :
  - déclaration
  - confiance `c ∈ [0,1]`
  - last_updated
  - liens de preuve (IDs de faits à l'appui + contradictoires)
- lorsque de nouveaux faits arrivent :
  - trouver des opinions candidates par chevauchement d'entités + similarité (FTS d'abord, embeddings ensuite)
  - mettre à jour la confiance par de petits deltas ; les grands sauts nécessitent une forte contradiction + des preuves répétées

## Intégration CLI : autonome vs intégration approfondie

Recommandation : **intégration approfondie dans OpenClaw**, mais conserver une bibliothèque principale séparable.

### Pourquoi intégrer dans OpenClaw ?

- OpenClaw connaît déjà :
  - le chemin de l'espace de travail (`agents.defaults.workspace`)
  - le modèle de session + battements de cœur
  - modèles de journalisation + de dépannage
- Vous voulez que l'agent lui-même appelle les outils :
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### Pourquoi séparer quand même une bibliothèque ?

- garder la logique de la mémoire testable sans passerelle/runtime
- réutilisation dans d'autres contextes (scripts locaux, future application de bureau, etc.)

Forme :
Les outils de mémoire sont destinés à être une petite couche CLI + bibliothèque, mais il ne s'agit que d'une exploration.

## « S-Collide » / SuCo : quand l'utiliser (recherche)

Si « S-Collide » désigne **SuCo (Subspace Collision)** : c'est une approche de récupération ANN qui cible de forts compromis rappel/latence en utilisant des collisions apprises/structurées dans des sous-espaces (article : arXiv 2411.14754, 2024).

Approche pragmatique pour `~/.openclaw/workspace` :

- **ne commencez pas** avec SuCo.
- commencez avec SQLite FTS + (optionnel) de simples embeddings ; vous obtiendrez la plupart des gains d'UX immédiatement.
- envisagez les solutions de type SuCo/HNSW/ScaNN uniquement une fois que :
  - le corpus est volumineux (dizaines/centaines de milliers de segments)
  - la recherche par force brute sur les embeddings devient trop lente
  - la qualité du rappel est significativement limitée par la recherche lexicale

Alternatives compatibles hors ligne (par complexité croissante) :

- SQLite FTS5 + filtres de métadonnées (zéro ML)
- Embeddings + force brute (fonctionne étonnamment loin si le nombre de segments est faible)
- Index HNSW (courant, robuste ; nécessite une liaison de bibliothèque)
- SuCo (niveau recherche ; attractif s'il existe une implémentation solide que vous pouvez intégrer)

Question ouverte :

- quel est le **meilleur** modèle d'embeddings hors ligne pour la « mémoire d'assistant personnel » sur vos machines (ordinateur portable + bureau) ?
  - si vous avez déjà Ollama : effectuez des embeddings avec un modèle local ; sinon, livrez un petit modèle d'embeddings dans la chaîne d'outils.

## Plus petit pilote utile

Si vous souhaitez une version minimale, mais toujours utile :

- Ajoutez des pages d'entités `bank/` et une section `## Retain` dans les journaux quotidiens.
- Utilisez SQLite FTS pour le rappel avec citations (chemin + numéros de ligne).
- Ajoutez des embeddings uniquement si la qualité ou l'échelle du rappel l'exige.

## Références

- Concepts Letta / MemGPT : « blocs de mémoire centrale » + « mémoire d'archivage » + mémoire auto-éditable pilotée par des outils.
- Rapport technique Hindsight : « retain / recall / reflect », mémoire à quatre réseaux, extraction narrative de faits, évolution de la confiance des opinions.
- SuCo : arXiv 2411.14754 (2024) : récupération des plus proches voisins approximative par « Subspace Collision ».

import fr from "/components/footer/fr.mdx";

<fr />

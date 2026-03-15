---
summary: "Notes de recherche : système de mémoire hors ligne pour les espaces de travail Clawd (source de vérité Markdown + index dérivé)"
read_when:
  - Designing workspace memory (~/.openclaw/workspace) beyond daily Markdown logs
  - Deciding: standalone CLI vs deep OpenClaw integration
  - Adding offline recall + reflection (retain/recall/reflect)
title: "Recherche sur la mémoire de l'espace de travail"
---

# Mémoire de l'espace de travail v2 (hors ligne) : notes de recherche

Cible : espace de travail style Clawd (`agents.defaults.workspace`, `~/.openclaw/workspace` par défaut) où la « mémoire » est stockée sous la forme d'un fichier Markdown par jour (`memory/YYYY-MM-DD.md`) plus un petit ensemble de fichiers stables (p. ex. `memory.md`, `SOUL.md`).

Ce document propose une architecture de mémoire **hors ligne d'abord** qui conserve le Markdown comme source de vérité canonique et vérifiable, mais ajoute une **rappel structuré** (recherche, résumés d'entités, mises à jour de confiance) via un index dérivé.

## Pourquoi changer ?

La configuration actuelle (un fichier par jour) est excellente pour :

- la tenue d'un journal « en ajout seulement »
- l'édition humaine
- la durabilité et l'auditabilité soutenues par git
- la capture à faible friction (« écrivez-le simplement »)

Elle est faible pour :

- la récupération à fort rappel (« qu'avons-nous décidé à propos de X ? », « la dernière fois que nous avons essayé Y ? »)
- les réponses centrées sur les entités (« parlez-moi d'Alice / du Château / de warelay ») sans relire de nombreux fichiers
- la stabilité des opinions/préférences (et les preuves lorsqu'elles changent)
- les contraintes temporelles (« qu'est-ce qui était vrai en novembre 2025 ? ») et la résolution des conflits

## Objectifs de conception

- **Hors ligne** : fonctionne sans réseau ; peut fonctionner sur ordinateur portable/Château ; aucune dépendance cloud.
- **Explicable** : les éléments récupérés doivent être attribuables (fichier + emplacement) et séparables de l'inférence.
- **Peu de cérémonie** : la journalisation quotidienne reste en Markdown, pas de travail de schéma lourd.
- **Incrémentiel** : v1 est utile avec la recherche en texte intégrale (FTS) uniquement ; la sémantique/vectorielle et les graphiques sont des mises à niveau facultatives.
- **Convivial pour les agents** : facilite le « rappel dans les limites du budget de jetons » (renvoie de petits paquets de faits).

## Modèle directeur (Hindsight × Letta)

Deux éléments à combiner :

1. **Boucle de contrôle style Letta/MemGPT**

- garder un petit « cœur » toujours dans le contexte (persona + faits clés sur l'utilisateur)
- tout le reste est hors contexte et récupéré via des outils
- les écritures en mémoire sont des appels d'outil explicites (ajout/remplacement/insertion), persistés, puis réinjectés au tour suivant

2. **substrat de mémoire style Hindsight**

- séparer ce qui est observé de ce qui est cru de ce qui est résumé
- supporter la conservation/rappel/réflexion
- opinions avec niveau de confiance pouvant évoluer avec les preuves
- récupération sensible aux entités + requêtes temporelles (même sans graphes de connaissances complets)

## Architecture proposée (Markdown source de vérité + index dérivé)

### Magasin canonique (compatible git)

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

- **Le journal quotidien reste un journal quotidien**. Pas besoin de le convertir en JSON.
- Les fichiers `bank/` sont **sélectionnés**, produits par des tâches de réflexion, et peuvent toujours être édités à la main.
- `memory.md` reste « petit + essentiel » : les choses que vous voulez que Clawd voie à chaque session.

### Magasin dérivé (rappel machine)

Ajouter un index dérivé sous l'espace de travail (pas nécessairement suivi par git) :

```
~/.openclaw/workspace/.memory/index.sqlite
```

Soutenir avec :

- schéma SQLite pour les faits + les liens d'entités + les métadonnées d'opinion
- SQLite **FTS5** pour le rappel lexical (rapide, minuscule, hors ligne)
- table d'embeddings optionnelle pour le rappel sémantique (toujours hors ligne)

L'index est toujours **reconstructible à partir du Markdown**.

## Conserver / Rappeler / Réfléchir (boucle opérationnelle)

### Conserver : normaliser les journaux quotidiens en « faits »

L'idée clé de Hindsight qui importe ici : stocker des **faits narratifs et autonomes**, et non de petits extraits.

Règle pratique pour `memory/YYYY-MM-DD.md` :

- en fin de journée (ou pendant), ajouter une section `## Retain` avec 2 à 5 puces qui sont :
  - narratives (contexte inter-tours préservé)
  - autonomes (comprendre le sens seul plus tard)
  - étiquetées avec le type + les mentions d'entités

Exemple :

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

Analyse minimale :

- Préfixe de type : `W` (monde), `B` (expérience/biographique), `O` (opinion), `S` (observation/résumé ; généralement généré)
- Entités : `@Peter`, `@warelay`, etc. (les slugs mappent vers `bank/entities/*.md`)
- Confiance de l'opinion : `O(c=0.0..1.0)` en option

Si vous ne voulez pas que les auteurs s'en soucient : la tâche de réflexion peut déduire ces puces à partir du reste du journal, mais avoir une section `## Retain` explicite est le « levier de qualité » le plus simple.

### Rappel : requêtes sur l'index dérivé

Le rappel doit prendre en charge :

- **lexical** : « trouver des termes / noms / commandes exacts » (FTS5)
- **entité** : « parle-moi de X » (pages d'entité + facts liés à des entités)
- **temporel** : « que s'est-il passé autour du 27 nov » / « depuis la semaine dernière »
- **opinion** : « que préfère Peter ? » (avec confiance + preuves)

Le format de retour doit être adapté aux agents et citer les sources :

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (jour source, ou plage de temps extraite si présente)
- `entities` (`["Peter","warelay"]`)
- `content` (le fact narratif)
- `source` (`memory/2025-11-27.md#L12` etc.)

### Réflexion : produire des pages stables + mettre à jour les croyances

La réflexion est une tâche planifiée (quotidienne ou heartbeat `ultrathink`) qui :

- met à jour les `bank/entities/*.md` à partir des faits récents (résumés d'entités)
- met à jour la confiance des `bank/opinions.md` basée sur le renforcement/la contradiction
- propose facultativement des modifications à `memory.md` (faits durables « de base »)

Évolution de l'opinion (simple, explicable) :

- chaque opinion a :
  - déclaration
  - confiance `c ∈ [0,1]`
  - last_updated
  - liens de preuve (ID de faits à l'appui et contradictoires)
- lorsque de nouveaux faits arrivent :
  - trouver des opinions candidates par chevauchement d'entités + similarité (FTS d'abord, embeddings ensuite)
  - mettre à jour la confiance par petits deltas ; les grands sauts nécessitent une forte contradiction + des preuves répétées

## Intégration CLI : autonome vs intégration profonde

Recommandation : **intégration profonde dans OpenClaw**, mais conserver une bibliothèque principale séparable.

### Pourquoi intégrer dans OpenClaw ?

- OpenClaw connaît déjà :
  - le chemin de l'espace de travail (`agents.defaults.workspace`)
  - le modèle de session + battements de cœur
  - les modèles de journalisation + dépannage
- Vous voulez que l'agent lui-même appelle les outils :
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### Pourquoi séparer tout de même une bibliothèque ?

- garder la logique de mémoire testable sans passerelle/runtime
- réutiliser dans d'autres contextes (scripts locaux, application de bureau future, etc.)

Forme :
Les outils de mémoire sont destinés à être une petite couche CLI + bibliothèque, mais ceci est uniquement exploratoire.

## « S-Collide » / SuCo : quand l'utiliser (recherche)

Si « S-Collide » fait référence à **SuCo (Subspace Collision)** : c'est une approche de récupération ANN qui cible de forts compromis rappel/latence en utilisant des collisions apprises/structurées dans des sous-espaces (article : arXiv 2411.14754, 2024).

Approche pragmatique pour `~/.openclaw/workspace` :

- **ne commencez pas** avec SuCo.
- commencez avec SQLite FTS + (optionnel) des embeddings simples ; vous obtiendrez la plupart des gains UX immédiatement.
- envisagez les solutions de type SuCo/HNSW/ScaNN uniquement une fois que :
  - le corpus est volumineux (dizaines/centaines de milliers de blocs)
  - la recherche par embeddings par force brute devient trop lente
  - la qualité du rappel est sensiblement limitée par la recherche lexicale

Alternatives hors ligne (par complexité croissante) :

- SQLite FTS5 + filtres de métadonnées (zéro ML)
- Embeddings + force brute (fonctionne étonnamment bien si le nombre de blocs est faible)
- Index HNSW (courant, robuste ; nécessite un lien de bibliothèque)
- SuCo (niveau recherche ; attrayant s'il existe une implémentation solide que vous pouvez intégrer)

Question ouverte :

- quel est le **meilleur** modèle d'embeddings hors ligne pour la « mémoire d'assistant personnel » sur vos machines (ordinateur portable + de bureau) ?
  - si vous avez déjà Ollama : faites des embeddings avec un modèle local ; sinon, embarquez un petit modèle d'embeddings dans la chaîne d'outils.

## Plus petit pilote utile

Si vous souhaitez une version minimale, mais toujours utile :

- Ajoutez des pages d'entités `bank/` et une section `## Retain` dans les journaux quotidiens.
- Utilisez SQLite FTS pour le rappel avec citations (chemin + numéros de ligne).
- Ajouter des embeddings uniquement si la qualité ou l'échelle du rappel l'exige.

## Références

- Concepts de Letta / MemGPT : « blocs de mémoire centrale » + « mémoire d'archivage » + mémoire auto-éditable par tool.
- Rapport technique Hindsight : « retain / recall / reflect », mémoire à quatre réseaux, extraction narrative de faits, évolution de la confiance des opinions.
- SuCo : arXiv 2411.14754 (2024) : récupération des plus proches voisins « Subspace Collision » approximative.

import fr from '/components/footer/fr.mdx';

<fr />

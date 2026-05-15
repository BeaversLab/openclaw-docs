---
summary: "Plan complet de modernisation de l'application avec mises à jour des compétences de livraison front-end"
title: "Plan de modernisation de l'application"
read_when:
  - Planning a broad OpenClaw application modernization pass
  - Updating frontend implementation standards for app or Control UI work
  - Turning a broad product quality review into phased engineering work
---

## Objectif

Faire évoluer l'application vers un produit plus propre, plus rapide et plus maintenable sans
interrompre les flux de travail actuels ni masquer les risques dans des refactorisations larges. Le travail doit
être livré sous forme de petites tranches révisables, avec une preuve pour chaque surface touchée.

## Principes

- Conserver l'architecture actuelle, sauf si une frontière cause démonstrablement du turnover,
  des coûts de performance ou des bogues visibles par l'utilisateur.
- Privilégier le plus petit correctif approprié pour chaque problème, puis répéter.
- Séparer les corrections requises des améliorations optionnelles afin que les mainteneurs puissent livrer un travail
  à haute valeur sans attendre de décisions subjectives.
- Maintenir le comportement orienté plugin documenté et compatible avec les versions antérieures.
- Vérifier le comportement expédié, les contrats de dépendance et les tests avant d'affirmer qu'une
  régression est corrigée.
- Améliorer d'abord le chemin utilisateur principal : onboarding, auth, chat, configuration du provider,
  gestion des plugins et diagnostics.

## Phase 1 : Audit de référence

Inventorier l'application actuelle avant de la modifier.

- Identifier les principaux flux de travail utilisateur et les surfaces de code qui les possèdent.
- Lister les fonctionnalités inutilisées, les paramètres en double, les états d'erreur flous et les chemins
  de rendu coûteux.
- Capturer les commandes de validation actuelles pour chaque surface.
- Marquer les problèmes comme requis, recommandés ou optionnels.
- Documenter les bloqueurs connus nécessitant un examen par le propriétaire, en particulier les API, la sécurité,
  la publication et les modifications de contrat de plugin.

Définition de terminé :

- Une liste de problèmes avec des références de fichiers à la racine du dépôt.
- Chaque problème a une gravité, une surface propriétaire, un impact utilisateur attendu et un chemin
  de validation proposé.
- Aucun élément de nettoyage spéculatif n'est mélangé aux corrections requises.

## Phase 2 : Nettoyage du produit et de l'UX

Prioriser les flux de travail visibles et éliminer la confusion.

- Raffiner les textes d'onboarding et les états vides autour de l'authentification du modèle, du statut de la passerelle,
  et de la configuration des plugins.
- Supprimer ou désactiver les fonctionnalités inutilisées lorsqu'aucune action n'est possible.
- Garder les actions importantes visibles sur différentes largeurs responsives au lieu de les cacher
  derrière des hypothèses de mise en page fragiles.
- Consolider le langage de statut répété pour que les erreurs aient une seule source de vérité.
- Ajouter une divulgation progressive pour les paramètres avancés tout en gardant la configuration principale rapide.

Validation recommandée :

- Chemin heureux manuel pour la configuration de premier démarrage et le démarrage pour les utilisateurs existants.
- Tests ciblés pour toute logique de routage, de persistance de configuration ou de dérivation de statut.
- Captures d'écran du navigateur pour les surfaces responsives modifiées.

## Phase 3 : Resserrage de l'architecture frontend

Améliorer la maintenabilité sans réécriture large.

- Déplacer les transformations d'état d'interface utilisateur répétées vers des assistants typés ciblés.
- Garder séparées les responsabilités de récupération des données, de persistance et de présentation.
- Préférer les hooks, stores et modèles de composants existants aux nouvelles abstractions.
- Diviser les composants surdimensionnés uniquement si cela réduit le couplage ou clarifie les tests.
- Éviter d'introduire un état global large pour les interactions locales de panneau.

Garanties requises :

- Ne pas modifier le comportement public comme effet secondaire du fractionnement des fichiers.
- Maintenir le comportement d'accessibilité intact pour les menus, les boîtes de dialogue, les onglets et la navigation au clavier.
- Vérifier que les états de chargement, vide, erreur et optimiste s'affichent toujours.

## Phase 4 : Performance et fiabilité

Cibler la douleur mesurée plutôt qu'une optimisation théorique large.

- Mesurer les coûts de démarrage, de transition de route, de grande liste et de transcription de chat.
- Remplacer les données dérivées coûteuses répétées par des sélecteurs mémorisés ou des assistants mis en cache là où le profilage prouve la valeur.
- Réduire les analyses réseau ou de système de fichiers évitables sur les chemins chauds.
- Conserver un ordre déterministe pour les entrées de prompt, de registre, de fichier, de plugin et de réseau avant la construction de la charge utile du modèle.
- Ajouter des tests de régression légers pour les assistants chauds et les limites de contrat.

Définition de terminé :

- Chaque modification de performance enregistre la ligne de base, l'impact attendu, l'impact réel et l'écart restant.
- Aucun correctif de perf n'est intégré uniquement sur l'intuition lorsqu'une mesure bon marché est disponible.

## Phase 5 : Renforcement des types, contrats et tests

Augmenter l'exactitude aux points limites dont dépendent les utilisateurs et les auteurs de plugins.

- Remplacer les chaînes d'exécution lâches par des unions discriminées ou des listes de code fermées.
- Valider les entrées externes avec des assistants de schéma existants ou zod.
- Ajouter des tests de contrat autour des manifestes de plugin, des catalogues de provider, des messages de protocole de passerelle et du comportement de migration de configuration.
- Conserver les chemins de compatibilité dans les flux de diagnostic ou de réparation plutôt que dans les migrations cachées au démarrage.
- Éviter le couplage uniquement de test aux internes du plugin ; utiliser les façades du SDK et les barils documentés.

Validation recommandée :

- `pnpm check:changed`
- Tests ciblés pour chaque limite modifiée.
- `pnpm build` lorsque les limites paresseuses, le conditionnement ou les surfaces publiées changent.

## Phase 6 : Documentation et préparation à la sortie

Garder la documentation utilisateur alignée sur le comportement.

- Mettre à jour la documentation avec les modifications de comportement, d'API, de configuration, d'onboarding ou de plugins.
- Ajouter des entrées dans le journal des modifications uniquement pour les modifications visibles par l'utilisateur.
- Conserver la terminologie des plugins orientée utilisateur ; n'utiliser les noms de packages internes que là où c'est nécessaire pour les contributeurs.
- Confirmer que les instructions de publication et d'installation correspondent toujours à la surface de commande actuelle.

Définition de terminé :

- La documentation pertinente est mise à jour dans la même branche que les modifications de comportement.
- Les vérifications de dérive de la documentation générée ou de l'API réussissent lorsqu'elles sont touchées.
- La transmission nomme toute validation ignorée et la raison pour laquelle elle a été ignorée.

## Première tranche recommandée

Commencer par une passe ciblée sur l'interface utilisateur de contrôle et l'onboarding :

- Auditer la configuration de première exécution, la préparation de l'authentification du provider, le statut de la passerelle et les surfaces de configuration des plugins.
- Supprimer les actions mortes et clarifier les états d'échec.
- Ajouter ou mettre à jour des tests ciblés pour la dérivation de statut et la persistance de la configuration.
- Exécuter `pnpm check:changed`.

Cela offre une valeur utilisateur élevée avec un risque architectural limité.

## Mise à jour des compétences frontend

Utilisez cette section pour mettre à jour le `SKILL.md` axé sur le frontend fourni avec la tâche de modernisation. Si vous adoptez ces conseils en tant que compétence OpenClaw locale au dépôt, créez d'abord `.agents/skills/openclaw-frontend/SKILL.md`, conservez les métadonnées (frontmatter) qui appartiennent à cette compétence cible, puis ajoutez ou remplacez les directives du corps par le contenu suivant.

```markdown
# Frontend Delivery Standards

Use this skill when implementing or reviewing user-facing React, Next.js,
desktop webview, or app UI work.

## Operating rules

- Start from the existing product workflow and code conventions.
- Prefer the smallest correct patch that improves the current user path.
- Separate required fixes from optional polish in the handoff.
- Do not build marketing pages when the request is for an application surface.
- Keep actions visible and usable across supported viewport sizes.
- Remove dead affordances instead of leaving controls that cannot act.
- Preserve loading, empty, error, success, and permission states.
- Use existing design-system components, hooks, stores, and icons before adding
  new primitives.

## Implementation checklist

1. Identify the primary user task and the component or route that owns it.
2. Read the local component patterns before editing.
3. Patch the narrowest surface that solves the issue.
4. Add responsive constraints for fixed-format controls, toolbars, grids, and
   counters so text and hover states cannot resize the layout unexpectedly.
5. Keep data loading, state derivation, and rendering responsibilities clear.
6. Add tests when logic, persistence, routing, permissions, or shared helpers
   change.
7. Verify the main happy path and the most relevant edge case.

## Visual quality gates

- Text must fit inside its container on mobile and desktop.
- Toolbars may wrap, but controls must remain reachable.
- Buttons should use familiar icons when the icon is clearer than text.
- Cards should be used for repeated items, modals, and framed tools, not for
  every page section.
- Avoid one-note color palettes and decorative backgrounds that compete with
  operational content.
- Dense product surfaces should optimize for scanning, comparison, and repeated
  use.

## Handoff format

Report:

- What changed.
- What user behavior changed.
- Required validation that passed.
- Any validation skipped and the concrete reason.
- Optional follow-up work, clearly separated from required fixes.
```

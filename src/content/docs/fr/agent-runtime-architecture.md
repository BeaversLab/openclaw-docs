---
title: "Architecture de l'runtime de l'agent"
summary: "Comment OpenClaw exécute l'runtime de l'agent intégré, les providers, les sessions, les outils et les extensions."
---

OpenClaw possède directement l'runtime de l'agent intégré. Le code de l'runtime se trouve sous `src/agents/`, les helpers de modèle/provider se trouvent sous `src/llm/`, et les contrats orientés plugin sont exposés via les barils `openclaw/plugin-sdk/*`.

## Disposition de l'Runtime

- `src/agents/embedded-agent-runner/` : boucle de tentative de l'agent intégré, adaptateurs de flux de provider, compactage, sélection du modèle et câblage de session.
- `src/agents/sessions/` : persistance de session, chargement des extensions, découverte des ressources, compétences, invites, thèmes et moteurs de rendu d'outils basés sur TUI.
- `packages/agent-core/` : cœur d'agent réutilisable, types de harnais de niveau inférieur, messages, helpers de compactage, modèles d'invites et contrats d'outil/session.
- `src/agents/runtime/` : façane OpenClaw pour `@openclaw/agent-core` plus utilitaires de proxy local.
- `src/agents/agent-tools*.ts` : définitions d'outils détenues par OpenClaw, schémas, stratégies, adaptateurs de crochets avant/après et support d'édition d'hôte.
- `src/agents/agent-hooks/` : crochets d'runtime intégrés tels que les sauvegardes de compactage et l'élagage du contexte.
- `src/llm/` : registre de modèle/provider, helpers de transport et implémentations de flux spécifiques au provider.

## Limites

Le code principal appelle l'runtime intégré via les modules OpenClaw et les barils du SDK, et non via les anciens packages d'agents externes. Les plugins utilisent les points d'entrée documentés `openclaw/plugin-sdk/*` et n'importent pas les éléments internes `src/**`.

`@earendil-works/pi-tui` reste une dépendance tierce TUI. Il est utilisé comme boîte à outils de composants de terminal par le TUI local et les moteurs de rendu de session ; son internalisation représenterait un effort distinct de 'vendoring'.

## Manifestes

Les packages de ressources déclarent les ressources OpenClaw dans les métadonnées du package :

```json
{
  "openclaw": {
    "extensions": ["extensions/index.ts"],
    "skills": ["skills/*.md"],
    "prompts": ["prompts/*.md"],
    "themes": ["themes/*.json"]
  }
}
```

Le gestionnaire de packages découvre également les répertoires conventionnels `extensions/`, `skills/`, `prompts/` et `themes/`.

## Sélection du Runtime

L'identifiant du runtime intégré par défaut est `openclaw`. Les harnais de plugins peuvent enregistrer des identifiants de runtime supplémentaires. `auto` sélectionne un harnais de plugin prenant en charge lorsqu'il en existe un et utilise sinon le runtime OpenClaw intégré.

## Connexes

- [Flux de travail du runtime d'agent OpenClaw](/fr/openclaw-agent-runtime)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)

---
summary: "Contrats de compatibilité des plugins, métadonnées de dépréciation et attentes de migration"
title: "Compatibilité des plugins"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw maintient les anciens contrats de plugin connectés via des adaptateurs de compatibilité nommés avant de les supprimer. Cela protège les plugins groupés existants et les plugins externes pendant que les contrats du SDK, du manifeste, de la configuration, de l'installation et du runtime de l'agent évoluent.

## Registre de compatibilité

Les contrats de compatibilité des plugins sont suivis dans le registre principal à `src/plugins/compat/registry.ts`.

Chaque enregistrement possède :

- un code de compatibilité stable
- statut : `active`, `deprecated`, `removal-pending`, ou `removed`
- propriétaire : SDK, config, installation, channel, provider, exécution du plugin, runtime de l'agent, ou core
- dates d'introduction et de dépréciation, le cas échéant
- recommandations de remplacement
- documentation, diagnostics et tests couvrant l'ancien et le nouveau comportement

Le registre sert de source pour la planification des mainteneurs et les futures vérifications de l'inspecteur de plugins. Si un comportement orienté vers les plugins change, ajoutez ou mettez à jour l'enregistrement de compatibilité dans le même changement que celui qui ajoute l'adaptateur.

La compatibilité de réparation et de migration du Docteur est suivie séparément à l'adresse `src/commands/doctor/shared/deprecation-compat.ts`. Ces enregistrements couvrent les anciennes structures de configuration, les mises en page du registre d'installation et les correctifs de réparation qui peuvent devoir rester disponibles après la suppression du chemin de compatibilité du runtime.

Les balayages de release doivent vérifier les deux registres. Ne supprimez pas une migration de médecin simplement parce que l'enregistrement de compatibilité runtime ou config correspondant a expiré ; vérifiez d'abord qu'il n'existe aucun chemin de mise à niveau pris en charge qui nécessite encore la réparation. Revalidez également chaque annotation de remplacement lors de la planification de la release, car la propriété du plugin et l'empreinte de configuration peuvent changer lorsque les fournisseurs et les canaux quittent le core.

## Package d'inspection de plugin

L'inspecteur de plugin doit résider en dehors du dépôt central OpenClaw en tant que package/dépôt distinct soutenu par les contrats de compatibilité et de manifeste versionnés.

La CLI du premier jour devrait être :

```sh
openclaw-plugin-inspector ./my-plugin
```

Elle devrait émettre :

- validation du manifeste/schéma
- la version de compatibilité du contrat en cours de vérification
- vérifications des métadonnées d'installation/source
- vérifications d'importation à froid (cold-path)
- avertissements d'obsolescence et de compatibilité

Utilisez `--json` pour une sortie lisible par machine stable dans les annotations CI. Le cœur d'OpenClaw doit exposer les contrats et fixtures que l'inspecteur peut consommer, mais ne doit pas publier le binaire de l'inspecteur depuis le package principal `openclaw`.

## Politique d'obsolescence

OpenClaw ne doit pas supprimer un contrat de plugin documenté dans la même version qui introduit son remplacement.

La séquence de migration est la suivante :

1. Ajouter le nouveau contrat.
2. Garder l'ancien comportement connecté via un adaptateur de compatibilité nommé.
3. Émettre des diagnostics ou des avertissements lorsque les auteurs de plugins peuvent agir.
4. Documenter le remplacement et le calendrier.
5. Tester les anciens et nouveaux chemins.
6. Attendre la fin de la fenêtre de migration annoncée.
7. Supprimer uniquement avec une approbation explicite de version avec rupture de compatibilité.

Les enregistrements obsolètes doivent inclure une date de début d'avertissement, un remplacement, un lien vers la documentation et une date de suppression finale au plus trois mois après le début de l'avertissement. N'ajoutez pas un chemin de compatibilité obsolète avec une fenêtre de suppression ouverte, sauf si les responsables décident explicitement qu'il s'agit d'une compatibilité permanente et le marquent `active` à la place.

## Zones de compatibilité actuelles

Les enregistrements de compatibilité actuels incluent :

- les importations larges héritées du SDK telles que `openclaw/plugin-sdk/compat`
- les formes de plugins héritées uniquement par hook et `before_agent_start`
- les points d'entrée de plugin hérités `activate(api)` pendant que les plugins migrent vers `register(api)`
- les alias SDK hérités tels que `openclaw/extension-api`,
  `openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/command-auth`
  les builders de statut, `openclaw/plugin-sdk/test-utils`, et les alias de type `ClawdbotConfig` /
  `OpenClawSchemaType`
- liste d'autorisation (allowlist) et comportement d'activation des plugins groupés
- métadonnées de manifeste de variables d'environnement (env-var) de provider/channel héritées
- hooks et alias de type de plugin de provider hérités pendant que les providers passent aux
  hooks explicites de catalogue, d'authentification, de réflexion, de relecture et de transport
- les alias d'exécution (runtime) hérités tels que `api.runtime.taskFlow`,
  `api.runtime.subagent.getSession`, `api.runtime.stt`, et les `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)` obsolètes
- l'enregistrement séparé hérité des plugins de mémoire pendant que les plugins de mémoire passent à
  `registerMemoryCapability`
- helpers SDK de canal hérités pour les schémas de messages natifs, le filtrage des mentions, le formatage des enveloppes entrantes et l'imbrication des capacités d'approbation
- indices d'activation qui sont remplacés par la propriété des contributions du manifeste
- `setup-api` repli à l'exécution pendant que les descripteurs de configuration passent aux métadonnées à froid `setup.requiresRuntime: false`
- hooks `discovery` du fournisseur pendant que les hooks du catalogue de fournisseurs passent à `catalog.run(...)`
- métadonnées `showConfigured` / `showInSetup` du canal pendant que les packages de canaux passent à `openclaw.channel.exposure`
- clés de configuration runtime-policy héritées pendant que doctor migre les opérateurs vers `agentRuntime`
- repli des métadonnées de configuration de canal groupé généré pendant que les métadonnées `channelConfigs` priorité au registre arrivent
- persisted plugin registry disable and install-migration env flags while
  repair flows migrate operators to `openclaw plugins registry --refresh` and
  `openclaw doctor --fix`
- legacy plugin-owned web search, web fetch, and x_search config paths while
  doctor migrates them to `plugins.entries.<plugin>.config`
- legacy `plugins.installs` authored config and bundled plugin load-path
  aliases while install metadata moves into the state-managed plugin ledger

New plugin code should prefer the replacement listed in the registry and in the
specific migration guide. Existing plugins can keep using a compatibility path
until the docs, diagnostics, and release notes announce a removal window.

## Release notes

Les notes de version doivent inclure les abandons à venir des plug-ins avec des dates cibles et des liens vers la documentation de migration. Cet avertissement doit se produire avant qu'un chemin de compatibilité ne passe à `removal-pending` ou `removed`.

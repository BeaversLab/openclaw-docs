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

Les contrats de compatibilité des plugins sont suivis dans le registre central à
`src/plugins/compat/registry.ts`.

Chaque enregistrement possède :

- un code de compatibilité stable
- status : `active`, `deprecated`, `removal-pending`, ou `removed`
- propriétaire : SDK, config, installation, channel, provider, exécution du plugin, runtime de l'agent, ou core
- dates d'introduction et de dépréciation, le cas échéant
- recommandations de remplacement
- documentation, diagnostics et tests couvrant l'ancien et le nouveau comportement

Le registre sert de source pour la planification des mainteneurs et les futures vérifications de l'inspecteur de plugins. Si un comportement orienté vers les plugins change, ajoutez ou mettez à jour l'enregistrement de compatibilité dans le même changement que celui qui ajoute l'adaptateur.

La compatibilité de la réparation et de la migration de Doctor est suivie séparément à
`src/commands/doctor/shared/deprecation-compat.ts`. Ces enregistrements couvrent les anciennes structures de
configuration, les dispositions du registre d'installation et les correctifs (shims) de réparation qui peuvent devoir rester
disponibles après le retrait du chemin de compatibilité du runtime.

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

Utilisez `--json` pour une sortie stable lisible par machine dans les annotations CI. Le cœur d'OpenClaw
doit exposer des contrats et des appareils que l'inspecteur peut consommer, mais ne doit
pas publier le binaire de l'inspecteur depuis le package principal `openclaw`.

### Voie d'acceptation par le mainteneur

Utilisez Blacksmith Testbox pour la voie d'acceptation des packages installables lors de la validation
de l'inspecteur externe par rapport aux packages de plugins OpenClaw. Exécutez-le à partir d'un
extraction OpenClaw propre après la construction du package :

```sh
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
blacksmith testbox run --id <tbx_id> "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
blacksmith testbox run --id <tbx_id> "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
blacksmith testbox stop <tbx_id>
```

Gardez cette voie en option (opt-in) pour les mainteneurs car elle installe un package externe npm
et peut inspecter des packages de plugins clonés en dehors du dépôt. Les gardes du dépôt local
couvrent la carte d'exportation du SDK, les métadonnées du registre de compatibilité, la réduction de l'importation du SDK déprécié,
et les limites d'importation des extensions groupées ; la preuve de l'inspecteur Testbox
couvre le package tel que les auteurs de plugins externes le consomment.

## Politique de dépréciation

OpenClaw ne doit pas supprimer un contrat de plugin documenté dans la même version
qui introduit son remplacement.

La séquence de migration est :

1. Ajouter le nouveau contrat.
2. Conserver l'ancien comportement connecté via un adaptateur de compatibilité nommé.
3. Émettre des diagnostics ou des avertissements lorsque les auteurs de plugins peuvent agir.
4. Documenter le remplacement et le calendrier.
5. Tester les anciens et nouveaux chemins.
6. Attendre pendant la fenêtre de migration annoncée.
7. Supprimer uniquement avec une approbation explicite de version avec rupture.

Les enregistrements obsolètes doivent inclure une date de début d'avertissement, un remplacement, un lien vers la documentation et une date de suppression finale au plus tard trois mois après le début de l'avertissement. N'ajoutez pas de chemin de compatibilité obsolète avec une fenêtre de suppression indéfinie, sauf si les mainteneurs décident explicitement qu'il s'agit d'une compatibilité permanente et le marquent `active` à la place.

## Zones de compatibilité actuelles

Les enregistrements de compatibilité actuels incluent :

- les importations larges obsolètes du SDK telles que `openclaw/plugin-sdk/compat`
- les formes obsolètes de plugins basés uniquement sur des hooks et `before_agent_start`
- les points d'entrée obsolètes de plugins `activate(api)` pendant que les plugins migrent vers `register(api)`
- les alias obsolètes du SDK tels que `openclaw/extension-api`, `openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/command-auth` les constructeurs de statut, `openclaw/plugin-sdk/test-utils` (remplacés par des sous-chemins de test ciblés `openclaw/plugin-sdk/*`) et les alias de type `ClawdbotConfig` / `OpenClawSchemaType`
- liste d'autorisation et comportement d'activation des plugins groupés
- métadonnées de manifeste obsolètes de variables d'environnement provider/channel
- hooks et alias de type obsolètes des plugins de provider pendant que les providers passent à des hooks explicites de catalogue, d'authentification, de réflexion, de relecture et de transport
- les alias obsolètes de runtime tels que `api.runtime.taskFlow`, `api.runtime.subagent.getSession`, `api.runtime.stt` et les alias obsolètes `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- l'enregistrement fractionné obsolète des memory-plugins pendant que les memory-plugins passent à `registerMemoryCapability`
- les assistants obsolètes du SDK de channel pour les schémas de messages natifs, le filtrage des mentions, le formatage des enveloppes entrantes et l'imbrication des capacités d'approbation
- les clés de route obsolètes et les alias d'assistance de cible comparable pendant que les plugins passent à `openclaw/plugin-sdk/channel-route`
- indices d'activation en cours de remplacement par la propriété des contributions du manifeste
- le repli de runtime `setup-api` pendant que les descripteurs de configuration passent aux métadonnées `setup.requiresRuntime: false` à froid
- hooks `discovery` du provider pendant que les hooks de catalogue de provider passent à `catalog.run(...)`
- métadonnées du canal `showConfigured` / `showInSetup` pendant que les packages de canaux migrent
  vers `openclaw.channel.exposure`
- clés de configuration de stratégie d'exécution héritées pendant que doctor migre les opérateurs vers
  `agentRuntime`
- repli des métadonnées de configuration de canal groupé généré pendant que les métadonnées `channelConfigs`
  priorisées par le registre sont déployées
- indicateurs d'environnement de désactivation du registre de plugins persistés et de migration d'installation pendant que
  les flux de réparation migrent les opérateurs vers `openclaw plugins registry --refresh` et
  `openclaw doctor --fix`
- chemins de configuration de recherche web, récupération web et x_search hérités appartenant au plugin pendant que
  doctor les migre vers `plugins.entries.<plugin>.config`
- configuration créée par `plugins.installs` héritée et alias de chemin de chargement de plugin groupé pendant
  que les métadonnées d'installation sont déplacées vers le registre de plugins géré par l'état

Le nouveau code de plugin devrait privilégier le remplacement répertorié dans le registre et dans le
guide de migration spécifique. Les plugins existants peuvent continuer à utiliser un chemin de compatibilité
jusqu'à ce que la documentation, les diagnostics et les notes de version annoncent une fenêtre de suppression.

## Notes de version

Les notes de version doivent inclure les futures obsolescences de plugins avec des dates cibles et
des liens vers la documentation de migration. Cet avertissement doit se produire avant qu'un chemin de compatibilité
passe à `removal-pending` ou `removed`.

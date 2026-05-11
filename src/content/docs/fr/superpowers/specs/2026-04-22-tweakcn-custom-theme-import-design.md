# Tweakcn Custom Theme Import Design

Status: approved in terminal on 2026-04-22

## Résumé

Ajoutez exactement un emplacement de thème d'interface utilisateur de contrôle personnalisé local au navigateur qui peut être importé depuis un lien de partage tweakcn. Les familles de thèmes intégrées existantes restent `claw`, `knot` et `dash`. La nouvelle famille `custom` se comporte comme une famille de thèmes OpenClaw normale et prend en charge le mode `light`, `dark` et `system` lorsque la charge utile tweakcn importée inclut les deux jeux de jetons clair et sombre.

Le thème importé est stocké uniquement dans le profil de navigateur actuel avec le reste des paramètres de l'interface utilisateur de contrôle. Il n'est pas écrit dans la configuration de la passerelle et ne se synchronise pas entre les appareils ou les navigateurs.

## Problème

Le système de thème de l'interface utilisateur de contrôle est actuellement fermé sur trois familles de thèmes codées en dur :

- `ui/src/ui/theme.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/styles/base.css`

Les utilisateurs peuvent basculer entre les familles intégrées et les variantes de mode, mais ils ne peuvent pas importer un thème depuis tweakcn sans modifier le CSS du dépôt. Le résultat demandé est plus restreint qu'un système de thématisation général : conserver les trois thèmes intégrés et ajouter un emplacement importé contrôlé par l'utilisateur qui peut être remplacé par un lien tweakcn.

## Objectifs

- Garder les familles de thèmes intégrées existantes inchangées.
- Ajouter exactement un emplacement personnalisé importé, pas une bibliothèque de thèmes.
- Accepter un lien de partage tweakcn ou une URL `https://tweakcn.com/r/themes/{id}` directe.
- Conserver le thème importé uniquement dans le stockage local du navigateur.
- Faire fonctionner l'emplacement importé avec les contrôles de mode `light`, `dark` et `system` existants.
- Garder le comportement en cas d'échec sécurisé : une mauvaise importation ne casse jamais le thème de l'interface utilisateur actif.

## Non-objectifs

- Pas de bibliothèque multi-thèmes ou de liste d'imports locale au navigateur.
- Pas de persistance côté passerelle ou de synchronisation multi-appareils.
- Pas d'éditeur CSS arbitraire ou d'éditeur JSON de thème brut.
- Pas de chargement automatique des ressources de polices distantes depuis tweakcn.
- Aucune tentative de prise en charge des charges utiles tweakcn qui n'exposent qu'un seul mode.
- Aucune refactorisation de thématisation à l'échelle du dépôt au-delà des coutures requises pour l'interface utilisateur de contrôle.

## Décisions utilisateur déjà prises

- Conserver les trois thèmes intégrés.
- Ajouter un emplacement d'importation propulsé par tweakcn.
- Stocker le thème importé dans le navigateur, et non dans la configuration de la passerelle.
- Prendre en charge `light`, `dark` et `system` pour l'emplacement importé.
- L'écrasement de l'emplacement personnalisé par l'importation suivante est le comportement prévu.

## Approche recommandée

Ajouter un quatrième identifiant de famille de thèmes, `custom`, au modèle de thème de l'interface utilisateur de contrôle. La famille `custom` ne devient sélectionnable que lorsqu'une importation tweakcn valide est présente. La charge utile importée est normalisée en un enregistrement de thème personnalisé spécifique à OpenClaw et stockée dans le stockage local du navigateur avec le reste des paramètres de l'interface utilisateur.

Au moment de l'exécution, OpenClaw restitue une balise `<style>` gérée qui définit les blocs de variables CSS personnalisés résolus :

```css
:root[data-theme="custom"] { ... }
:root[data-theme="custom-light"] { ... }
```

Cela permet de garder les variables de thème personnalisé limitées à la famille `custom` et d'éviter que des variables CSS en ligne ne fuient dans les familles intégrées.

## Architecture

### Modèle de thème

Mettre à jour `ui/src/ui/theme.ts` :

- Étendre `ThemeName` pour inclure `custom`.
- Étendre `ResolvedTheme` pour inclure `custom` et `custom-light`.
- Étendre `VALID_THEME_NAMES`.
- Mettre à jour `resolveTheme()` afin que `custom` reflète le comportement de la famille existante :
  - `custom + dark` -> `custom`
  - `custom + light` -> `custom-light`
  - `custom + system` -> `custom` ou `custom-light` en fonction des préférences du système d'exploitation

Aucun alias d'héritage n'est ajouté pour `custom`.

### Modèle de persistance

Étendre la persistance de `UiSettings` dans `ui/src/ui/storage.ts` avec une charge utile de thème personnalisé facultative :

- `customTheme?: ImportedCustomTheme`

Forme de stockage recommandée :

```ts
type ImportedCustomTheme = {
  sourceUrl: string;
  themeId: string;
  label: string;
  importedAt: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};
```

Remarques :

- `sourceUrl` stocke la saisie d'origine de l'utilisateur après normalisation.
- `themeId` est l'identifiant de thème tweakcn extrait de l'URL.
- `label` est le champ `name` de tweakcn lorsqu'il est présent, sinon `Custom`.
- `light` et `dark` sont déjà des cartes de jetons OpenClaw normalisées, et non des charges utiles tweakcn brutes.
- La charge utile importée réside à côté des autres paramètres locaux du navigateur et est sérialisée dans le même document de stockage local.
- Si les données du thème personnalisé stocké sont manquantes ou invalides au chargement, ignorez la charge utile et revenez à `theme: "claw"` lorsque la famille persistée était `custom`.

### Application à l'exécution

Ajoutez un gestionnaire de feuille de style de thème personnalisé étroit dans le runtime de l'interface utilisateur de contrôle, détenu près de `ui/src/ui/app-settings.ts` et `ui/src/ui/theme.ts`.

Responsabilités :

- Créez ou mettez à jour une balise `<style id="openclaw-custom-theme">` stable dans `document.head`.
- Émettez du CSS uniquement lorsqu'une charge utile de thème personnalisé valide existe.
- Supprimez le contenu de la balise de style lorsque la charge utile est effacée.
- Conservez le CSS de la famille intégrée dans `ui/src/styles/base.css` ; n'insérez pas les jetons importés dans la feuille de style validée.

Ce gestionnaire s'exécute chaque fois que les paramètres sont chargés, enregistrés, importés ou effacés.

### Sélecteurs en mode clair

L'implémentation devrait préférer `data-theme-mode="light"` pour le style clair inter-familles plutôt que de créer un cas particulier pour `custom-light`. Si un sélecteur existant est épinglé à `data-theme="light"` et doit s'appliquer à chaque famille claire, élargissez-le dans le cadre de ce travail.

## UX d'importation

Mettez à jour `ui/src/ui/views/config.ts` dans la section `Appearance` :

- Ajoutez une carte de thème `Custom` à côté de `Claw`, `Knot` et `Dash`.
- Affichez la carte comme désactivée lorsqu'aucun thème personnalisé importé n'existe.
- Ajoutez un panneau d'importation sous la grille de thèmes avec :
  - une zone de saisie de texte pour un lien de partage tweakcn ou une URL `/r/themes/{id}`
  - un bouton `Import`
  - un chemin `Replace` lorsqu'une charge utile personnalisée existe déjà
  - une action `Clear` lorsqu'une charge utile personnalisée existe déjà
- Affichez l'étiquette du thème importé et l'hôte source lorsqu'une charge utile existe.
- Si le thème actif est `custom`, l'importation d'un remplacement s'applique immédiatement.
- Si le thème actif n'est pas `custom`, l'importation stocke uniquement la nouvelle charge utile jusqu'à ce que l'utilisateur sélectionne la carte `Custom`.

Le sélecteur de thème des paramètres rapides dans `ui/src/ui/views/config-quick.ts` doit également afficher `Custom` uniquement lorsqu'une charge utile existe.

## Analyse de l'URL et récupération distante

Le chemin d'importation du navigateur accepte :

- `https://tweakcn.com/themes/{id}`
- `https://tweakcn.com/r/themes/{id}`

L'implémentation doit normaliser les deux formes vers :

- `https://tweakcn.com/r/themes/{id}`

Le navigateur récupère ensuite directement le point de terminaison normalisé `/r/themes/{id}`.

Utilisez un validateur de schéma étroit pour la charge utile externe. Un schéma zod est préféré car il s'agit d'une limite externe non fiable.

Champs distants requis :

- `name` de niveau supérieur en tant que chaîne facultative
- `cssVars.theme` en tant qu'objet facultatif
- `cssVars.light` en tant qu'objet
- `cssVars.dark` en tant qu'objet

Si `cssVars.light` ou `cssVars.dark` est manquant, rejetez l'importation. C'est délibéré : le comportement produit approuvé est la prise en charge du mode complet, et non la synthèse de meilleure effort d'un côté manquant.

## Mappage des jetons

Ne reflétez pas aveuglément les variables tweakcn. Normalisez un sous-ensemble borné en jetons OpenClaw et dérivez le reste dans un assistant.

### Jeton importés directement

À partir de chaque bloc de mode tweakcn :

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `destructive-foreground`
- `border`
- `input`
- `ring`
- `radius`

À partir du `cssVars.theme` partagé lorsqu'il est présent :

- `font-sans`
- `font-mono`

Si un bloc de mode remplace `font-sans`, `font-mono` ou `radius`, la valeur locale au mode l'emporte.

### Jetons dérivés pour OpenClaw

L'importateur dérive des variables exclusives à OpenClaw à partir des couleurs de base importées :

- `--bg-accent`
- `--bg-elevated`
- `--bg-hover`
- `--panel`
- `--panel-strong`
- `--panel-hover`
- `--chrome`
- `--chrome-strong`
- `--text`
- `--text-strong`
- `--chat-text`
- `--muted`
- `--muted-strong`
- `--accent-hover`
- `--accent-muted`
- `--accent-subtle`
- `--accent-glow`
- `--focus`
- `--focus-ring`
- `--focus-glow`
- `--secondary`
- `--secondary-foreground`
- `--danger`
- `--danger-muted`
- `--danger-subtle`

Les règles de dérivation résident dans un assistant pur afin qu'elles puissent être testées indépendamment. Les formules exactes de mélange des couleurs sont un détail d'implémentation, mais l'assistant doit satisfaire à deux contraintes :

- préserver un contraste lisible proche de l'intention du thème importé
- produire une sortie stable pour la même charge utile importée

### Jetons ignorés dans la v1

Ces jetons tweakcn sont intentionnellement ignorés dans la première version :

- `chart-*`
- `sidebar-*`
- `font-serif`
- `shadow-*`
- `tracking-*`
- `letter-spacing`
- `spacing`

Cela permet de limiter la portée aux jetons dont l'interface utilisateur de contrôle actuelle a réellement besoin.

### Polices

Les chaînes de piles de polices sont importées si elles sont présentes, mais OpenClaw ne charge pas les ressources de polices distantes dans la v1. Si la pile importée fait référence à des polices non disponibles dans le navigateur, le comportement de repli normal s'applique.

## Comportement en cas d'échec

Les mauvaises importations doivent échouer de manière fermée.

- Format d'URL invalide : afficher une erreur de validation en ligne, ne pas récupérer.
- Hôte ou chemin non pris en charge : afficher une erreur de validation en ligne, ne pas récupérer.
- Échec du réseau, réponse non OK ou JSON malformé : afficher une erreur en ligne, laisser la charge utile stockée actuelle intacte.
- Échec du schéma ou blocs clair/sombre manquants : afficher une erreur en ligne, laisser la charge utile stockée actuelle intacte.
- Action Effacer :
  - supprime la charge utile personnalisée stockée
  - supprime le contenu de la balise de style personnalisée gérée
  - si `custom` est actif, rétablit la famille de thèmes sur `claw`
- Charge utile personnalisée stockée invalide au premier chargement :
  - ignorer la charge utile stockée
  - ne pas émettre de CSS personnalisé
  - si la famille de thèmes persistée était `custom`, revenir à `claw`

À aucun moment une importation échouée ne doit laisser le document actif avec des variables CSS personnalisées partiellement appliquées.

## Fichiers devant changer lors de la mise en œuvre

Fichiers principaux :

- `ui/src/ui/theme.ts`
- `ui/src/ui/storage.ts`
- `ui/src/ui/app-settings.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/ui/views/config-quick.ts`
- `ui/src/styles/base.css`

Nouveaux assistants probables :

- `ui/src/ui/custom-theme.ts`
- `ui/src/ui/custom-theme-import.ts`

Tests :

- `ui/src/ui/app-settings.test.ts`
- `ui/src/ui/storage.node.test.ts`
- `ui/src/ui/views/config.browser.test.ts`
- nouveaux tests ciblés pour l'analyse d'URL et la normalisation de la charge utile

## Tests

Couverture minimale de la mise en œuvre :

- analyser l'URL du lien de partage pour obtenir l'identifiant du thème tweakcn
- normaliser `/themes/{id}` et `/r/themes/{id}` dans l'URL de récupération
- rejeter les hôtes non pris en charge et les identifiants malformés
- valider la forme de la charge utile tweakcn
- mapper une charge utile tweakcn valide dans les cartes de jetons clair et sombre normalisées OpenClaw
- charger et enregistrer la charge utile personnalisée dans les paramètres locaux du navigateur
- résoudre `custom` pour `light`, `dark` et `system`
- désactiver la sélection `Custom` lorsqu'aucune charge utile n'existe
- appliquer le thème importé immédiatement lorsque `custom` est déjà actif
- revenir à `claw` lorsque le thème personnalisé actif est effacé

Objectif de vérification manuelle :

- importer un thème tweakcn connu à partir des Paramètres
- basculer entre `light`, `dark` et `system`
- basculer entre `custom` et les familles intégrées
- recharger la page et confirmer que le thème personnalisé importé persiste localement

## Notes de déploiement

Cette fonctionnalité est volontairement limitée. Si les utilisateurs demandent ultérieurement plusieurs thèmes importés, le renommage, l'exportation ou la synchronisation multi-appareils, traitez cela comme une conception ultérieure. Ne créez pas une abstraction de bibliothèque de thèmes dans cette implémentation.

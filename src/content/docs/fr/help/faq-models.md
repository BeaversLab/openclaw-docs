---
summary: "FAQ : valeurs par défaut des modèles, sélection, alias, basculement et profils d'authentification"
read_when:
  - Choosing or switching models, configuring aliases
  - Debugging model failover / "All models failed"
  - Understanding auth profiles and how to manage them
title: "FAQ : modèles et authentification"
sidebarTitle: "FAQ sur les modèles"
---

Questions et réponses sur les modèles et les profils d'authentification. Pour la configuration, les sessions, la passerelle, les canaux et le dépannage, consultez la [FAQ](/fr/help/faq) principale.

## Modèles : valeurs par défaut, sélection, alias, basculement

<AccordionGroup>
  <Accordion title='Qu'est-ce que le « modèle par défaut » ?'OpenClaw>
    Le modèle par défaut d'OpenClaw est celui que vous définissez comme :

    ```
    agents.defaults.model.primary
    ```

    Les modèles sont référencés sous la forme `provider/model` (exemple : `openai/gpt-5.5` ou `anthropic/claude-sonnet-4-6`OpenClawOpenClaw). Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite au fournisseur par défaut configuré que comme chemin de compatibilité déprécié. Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un ancien défaut de fournisseur supprimé. Vous devriez toujours définir `provider/model` de manière **explicite**.

  </Accordion>

  <Accordion title="Quel modèle recommandez-vous ?">
    **Par défaut recommandé :** utilisez le modèle le plus puissant de la dernière génération disponible dans votre pile de fournisseurs.
    **Pour les agents activant des outils ou utilisant des entrées non fiables :** privilégiez la puissance du modèle plutôt que le coût.
    **Pour les conversations de routine ou à faible enjeu :** utilisez des modèles de repli moins coûteux et routez en fonction du rôle de l'agent.

    MiniMax possède sa propre documentation : [MiniMax](/fr/providers/minimax) et
    [Modèles locaux](/fr/gateway/local-models).

    Règle empirique : utilisez le **meilleur modèle que vous pouvez vous permettre** pour les travaux à enjeux élevés, et un modèle
    moins cher pour les conversations de routine ou les résumés. Vous pouvez router les modèles par agent et utiliser des sous-agents pour
    paralléliser les tâches longues (chaque sous-agent consomme des jetons). Consultez [Modèles](/fr/concepts/models) et
    [Sous-agents](/fr/tools/subagents).

    Avertissement important : les modèles plus faibles ou trop quantifiés sont plus vulnérables à l'injection
    de prompt et aux comportements non sécurisés. Consultez [Sécurité](/fr/gateway/security).

    Plus de contexte : [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Comment changer de model sans effacer ma config ?">
    Utilisez les **commandes de model** ou modifiez uniquement les champs **model**. Évitez les remplacements complets de la configuration.

    Options sûres :

    - `/model` dans le chat (rapide, par session)
    - `openclaw models set ...` (met à jour uniquement la config du model)
    - `openclaw configure --section model` (interactif)
    - modifier `agents.defaults.model` dans `~/.openclaw/openclaw.json`

    Évitez `config.apply` avec un objet partiel à moins que vous ne souhaitiez remplacer toute la configuration.
    Pour les modifications RPC, inspectez d'abord avec `config.schema.lookup` et préférez `config.patch`. La payload de lookup vous donne le chemin normalisé, les docs/contraintes de schéma superficiels et les résumés des enfants immédiats.
    pour les mises à jour partielles.
    Si vous avez écrasé la configuration, restaurez-la à partir d'une sauvegarde ou relancez `openclaw doctor` pour la réparer.

    Docs : [Models](/fr/concepts/models), [Configure](/fr/cli/configure), [Config](/fr/cli/config), [Doctor](/fr/gateway/doctor).

  </Accordion>

  <Accordion title="Puis-je utiliser des modèles auto-hébergés (llama.cpp, vLLM, Ollama) ?">
    Oui. Ollama est la voie la plus simple pour les modèles locaux.

    Configuration la plus rapide :

    1. Installez Ollama à partir de `https://ollama.com/download`
    2. Téléchargez un modèle local tel que `ollama pull gemma4`
    3. Si vous voulez aussi des modèles cloud, exécutez `ollama signin`
    4. Exécutez `openclaw onboard` et choisissez `Ollama`
    5. Sélectionnez `Local` ou `Cloud + Local`

    Remarques :

    - `Cloud + Local` vous donne des modèles cloud plus vos modèles Ollama locaux
    - les modèles cloud tels que `kimi-k2.5:cloud` n'ont pas besoin d'être téléchargés localement
    - pour une commutation manuelle, utilisez `openclaw models list` et `openclaw models set ollama/<model>`

    Note de sécurité : les modèles plus petits ou fortement quantifiés sont plus vulnérables à l'injection de prompt (prompt injection). Nous recommandons vivement des **modèles de grande taille** pour tout bot capable d'utiliser des outils. Si vous souhaitez tout de même utiliser des petits modèles, activez le sandboxing et des listes d'autorisation strictes pour les outils.

    Documentation : [Ollama](/fr/providers/ollama), [Modèles locaux](/fr/gateway/local-models),
    [Fournisseurs de modèles](/fr/concepts/model-providers), [Sécurité](/fr/gateway/security),
    [Sandboxing](/fr/gateway/sandboxing).

  </Accordion>

  <Accordion title="Qu'utilisent OpenClaw, Flawd et Krill pour les modèles ?">
    - Ces déploiements peuvent différer et évoluer dans le temps ; il n'y a pas de recommandation fixe de fournisseur.
    - Vérifiez le paramètre d'exécution actuel sur chaque passerelle avec `openclaw models status`.
    - Pour les agents sensibles à la sécurité ou activant des outils, utilisez le modèle le plus puissant de la dernière génération disponible.

  </Accordion>

  <Accordion title="Comment changer de modèle à la volée (sans redémarrer) ?">
    Utilisez la commande `/model` comme message autonome :

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    Ce sont les alias intégrés. Des alias personnalisés peuvent être ajoutés via `agents.defaults.models`.

    Vous pouvez lister les modèles disponibles avec `/model`, `/model list` ou `/model status`.

    `/model` (et `/model list`) affiche un sélecteur compact et numéroté. Sélectionnez par numéro :

    ```
    /model 3
    ```

    Vous pouvez également forcer un profil d'authentification spécifique pour le provider (par session) :

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    Astuce : `/model status` indique quel agent est actif, quel fichier `auth-profiles.json` est utilisé et quel profil d'authentification sera essayé ensuite.
    Il indique également le endpoint du provider configuré (`baseUrl`) et le mode API (`api`) lorsque disponibles.

    **Comment puis-je désépingler un profil que j'ai défini avec @profile ?**

    Relancez `/model` **sans** le suffixe `@profile` :

    ```
    /model anthropic/claude-opus-4-6
    ```

    Si vous souhaitez revenir au modèle par défaut, sélectionnez-le depuis `/model` (ou envoyez `/model <default provider/model>`).
    Utilisez `/model status` pour confirmer quel profil d'authentification est actif.

  </Accordion>

  <Accordion title="Si deux providers exposent le même id de modèle, lequel /model utilise-t-il ?">
    `/model provider/model` sélectionne cette route de provider exacte pour la session.

    Par exemple, `qianfan/deepseek-v4-flash` et `deepseek/deepseek-v4-flash` sont des références de modèle différentes même si elles contiennent toutes les deux `deepseek-v4-flash`. OpenClaw ne doit pas passer silencieusement d'un provider à l'autre simplement parce que l'id de modèle nu correspond.

    Une référence `/model` sélectionnée par l'utilisateur est également stricte pour la politique de repli. Si ce provider/modèle sélectionné n'est pas disponible, la réponse échoue visiblement au lieu de répondre à partir de `agents.defaults.model.fallbacks`. Les chaînes de repli configurées s'appliquent toujours aux valeurs par défaut configurées, aux tâches cron principales et à l'état de repli sélectionné automatiquement.

    Si une exécution qui a commencé à partir d'une substitution non-session est autorisée à utiliser le repli, OpenClaw essaie d'abord le provider/modèle demandé, puis les replis configurés, et enfin le principal configuré. Cela empêche les ids de modèle nus en double de revenir directement au provider par défaut.

    Voir [Modèles](/fr/concepts/models) et [Basculement de modèle](/fr/concepts/model-failover).

  </Accordion>

  <Accordion title="Puis-je utiliser GPT 5.5 pour les tâches quotidiennes et Codex 5.5 pour le codage ?">
    Oui. Traitez le choix du modèle et le choix de l'exécution séparément :

    - **Agent de codage Codex natif :** définissez `agents.defaults.model.primary` sur `openai/gpt-5.5`. Connectez-vous avec `openclaw models auth login --provider openai` lorsque vous souhaitez utiliser l'authentification par abonnement ChatGPT/Codex.
    - **Tâches directes de l'OpenAI API en dehors de la boucle de l'agent :** configurez `OPENAI_API_KEY` pour les images, les embeddings, la voix, la temps réel et d'autres surfaces de l'OpenAI API sans agent.
    - **Authentification par clé d'API de l'agent OpenAIAPI :** utilisez `/model openai/gpt-5.5` avec un profil de clé API-key `openai` ordonné.
    - **Sous-agents :** routez les tâches de codage vers un agent axé sur Codex avec son propre modèle `openai/gpt-5.5`.

    Voir [Modèles](/fr/concepts/models) et [Commandes slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Comment configurer le mode rapide pour GPT 5.5 ?">
    Utilisez soit un commutateur de session, soit une configuration par défaut :

    - **Par session :** envoyez `/fast on` pendant que la session utilise `openai/gpt-5.5`.
    - **Par défaut du modèle :** définissez `agents.defaults.models["openai/gpt-5.5"].params.fastMode` sur `true`.

    Exemple :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```OpenAI

    Pour OpenAI, le mode rapide correspond à `service_tier = "priority"` sur les requêtes Responses natives prises en charge. Le `/fast` de la session prime sur les configurations par défaut.

    Voir [Réflexion et mode rapide](/en/tools/thinkingOpenAI) et [Mode rapide OpenAI](/en/providers/openai#fast-mode).

  </Accordion>

  <Accordion title='Pourquoi vois-je « Modèle ... non autorisé » et ensuite aucune réponse ?'>
    Si `agents.defaults.models` est défini, il devient la **liste blanche** pour `/model` et toutes
    les substitutions de session. Choisir un modèle qui n'est pas dans cette liste renvoie :

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    Cette erreur est renvoyée **à la place de** une réponse normale. Solution : ajoutez le modèle exact à
    `agents.defaults.models`, ajoutez un caractère générique de fournisseur tel que `"provider/*": {}` pour les catalogues de fournisseurs dynamiques, supprimez la liste blanche, ou choisissez un modèle parmi `/model list`.
    Si la commande incluait également `--runtime codex`, mettez d'abord à jour la liste blanche puis réessayez
    la même commande `/model provider/model --runtime codex`.

  </Accordion>

  <Accordion title='Pourquoi vois-je « Modèle inconnu : minimax/MiniMax-M2.7 » ?'>
    Cela signifie que le **fournisseur n'est pas configuré** (aucune configuration de fournisseur MiniMax ou profil d'authentification n'a été trouvé), le modèle ne peut donc pas être résolu.

    Liste de vérification pour la correction :

    1. Mettez à niveau vers une version actuelle d'OpenClaw (ou exécutez à partir de la source `main`), puis redémarrez la passerelle.
    2. Assurez-vous que MiniMax est configuré (assistant ou JSON), ou que l'authentification MiniMax
       existe dans les profils env/auth pour que le fournisseur correspondant puisse être injecté
       (`MINIMAX_API_KEY` pour `minimax`, `MINIMAX_OAUTH_TOKEN` ou MiniMax
       OAuth stocké pour `minimax-portal`).
    3. Utilisez l'identifiant exact du modèle (sensible à la casse) pour votre chemin d'authentification :
       `minimax/MiniMax-M2.7` ou `minimax/MiniMax-M2.7-highspeed` pour la configuration
       par clé d'API, ou `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` pour la configuration OAuth.
    4. Exécutez :

       ```bash
       openclaw models list
       ```

       et choisissez dans la liste (ou `/model list` dans le chat).

    Voir [MiniMax](/fr/providers/minimax) et [Modèles](/fr/concepts/models).

  </Accordion>

  <Accordion title="Puis-je utiliser MiniMax comme modèle par défaut et OpenAI pour les tâches complexes ?">
    Oui. Utilisez **MiniMax comme modèle par défaut** et changez de modèle **par session** si nécessaire.
    Les replis (fallbacks) sont destinés aux **erreurs**, et non aux « tâches difficiles », utilisez donc `/model` ou un agent distinct.

    **Option A : changer par session**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    Ensuite :

    ```
    /model gpt
    ```

    **Option B : agents distincts**

    - Agent A par défaut : MiniMax
    - Agent B par défaut : OpenAI
    - Acheminez par agent ou utilisez `/agent` pour changer

    Docs : [Modèles](/fr/concepts/models), [Acheminement multi-agent](/fr/concepts/multi-agent), [MiniMax](/fr/providers/minimax), [OpenAI](/fr/providers/openai).

  </Accordion>

  <Accordion title="Les raccourcis opus / sonnet / gpt sont-ils intégrés ?">
    Oui. OpenClaw fournit quelques raccourcis par défaut (uniquement appliqués lorsque le modèle existe dans `agents.defaults.models`) :

    - `opus` → `anthropic/claude-opus-4-8`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite`

    Si vous définissez votre propre alias avec le même nom, votre valeur prévaut.

  </Accordion>

  <Accordion title="Comment définir/surcharger les raccourcis de modèle (alias) ?">
    Les alias proviennent de `agents.defaults.models.<modelId>.alias`. Exemple :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
          },
        },
      },
    }
    ```

    Ensuite, `/model sonnet` (ou `/<alias>` lorsque pris en charge) résout vers cet ID de modèle.

  </Accordion>

  <Accordion title="Comment ajouter des modèles d'autres fournisseurs comme OpenRouter ou Z.AI ?">
    OpenRouter (paiement par jeton ; de nombreux modèles) :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI (modèles GLM) :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    Si vous faites référence à un fournisseur/modèle mais que la clé de fournisseur requise est manquante, vous obtiendrez une erreur d'authentification au moment de l'exécution (par exemple, `No API key found for provider "zai"`).

    **Aucune clé API trouvée pour le fournisseur après l'ajout d'un nouvel agent**

    Cela signifie généralement que le **nouvel agent** a un stockage d'authentification vide. L'authentification est par agent et est stockée dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Options de correction :

    - Exécutez `openclaw agents add <id>` et configurez l'authentification lors de l'assistant.
    - Ou copiez uniquement les profils statiques portables `api_key` / `token` du stockage d'authentification de l'agent principal vers celui du nouvel agent.
    - Pour les profils OAuth, connectez-vous depuis le nouvel agent lorsqu'il a besoin de son propre compte ; sinon, OpenClaw peut lire jusqu'à l'agent principal par défaut sans cloner les jetons d'actualisation.

    N'utilisez **pas** `agentDir` sur plusieurs agents ; cela provoque des collisions d'authentification/session.

  </Accordion>
</AccordionGroup>

## Bascule de modèle et "All models failed"

<AccordionGroup>
  <Accordion title="Comment fonctionne le basculement ?">
    Le basculement s'effectue en deux étapes :

    1. **Rotation du profil d'auth** au sein du même fournisseur.
    2. **Repli du modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

    Les temps de recharge s'appliquent aux profils en échec (backoff exponentiel), afin qu'OpenClaw puisse continuer à répondre même lorsqu'un fournisseur est limité par son taux ou échoue temporairement.

    Le compartiment de limite de taux inclut plus que de simples réponses `429`. OpenClaw
    considère également les messages tels que `Too many concurrent requests`,
    `ThrottlingException`, `concurrency limit reached`,
    `workers_ai ... quota limit exceeded`, `resource exhausted`, et les limites
    périodiques de fenêtre d'utilisation (`weekly/monthly limit reached`) comme des limites de taux
    justifiant un basculement.

    Certaines réponses ressemblant à des erreurs de facturation ne sont pas des `402`, et certaines réponses HTTP `402`
    restent également dans ce compartiment transitoire. Si un fournisseur renvoie
    du texte de facturation explicite sur `401` ou `403`, OpenClaw peut tout de même le conserver dans
    la voie de facturation, mais les correspondances de texte spécifiques au fournisseur restent limitées au
    fournisseur qui les possède (par exemple OpenRouter `Key limit exceeded`). Si un message `402`
    ressemble plutôt à une limite de dépense réessayable de fenêtre d'utilisation ou
    d'organisation/espace de travail (`daily limit reached, resets tomorrow`,
    `organization spending limit exceeded`), OpenClaw le traite comme
    `rate_limit`, et non comme une désactivation de facturation longue durée.

    Les erreurs de dépassement de contexte sont différentes : les signatures telles que
    `request_too_large`, `input exceeds the maximum number of tokens`,
    `input token count exceeds the maximum number of input tokens`,
    `input is too long for the model`, ou `ollama error: context length
    exceeded` restent sur le chemin de compactage/réessai au lieu d'avancer le repli
    de modèle.

    Le texte générique d'erreur serveur est intentionnellement plus restreint que "n'importe quoi contenant
    unknown/error". OpenClaw traite bien entendu les formes transitoires limitées au fournisseur
    telles que Anthropic nu `An unknown error occurred`, OpenRouter nu
    `Provider returned error`, les erreurs de raison d'arrêt comme `Unhandled stop reason:
    error`, JSON `api_error` avec du texte serveur transitoire
    (`internal server error`, `unknown error, 520`, `upstream error`, `backend
    error`), and provider-busy errors such as `ModelNotReadyException` comme des signaux
    de dépassement de délai/surcharge justifiant un basculement lorsque le contexte du fournisseur
    correspond.
    Le texte générique de repli interne tel que `LLM request failed with an unknown
    error.` reste conservateur et ne déclenche pas par lui-même le repli de modèle.

  </Accordion>

  <Accordion title='Que signifie « No credentials found for profile anthropic:default » ?'>
    Cela signifie que le système a tenté d'utiliser l'ID de profil d'authentification `anthropic:default`, mais n'a pas pu trouver les identifiants correspondants dans le magasin d'authentification attendu.

    **Liste de vérification pour la correction :**

    - **Confirmer l'emplacement des profils d'authentification** (nouveaux chemins vs chemins hérités)
      - Actuel : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - Hérité : `~/.openclaw/agent/*` (migré par `openclaw doctor`)
    - **Confirmer que votre env var est chargée par le Gateway**
      - Si vous définissez `ANTHROPIC_API_KEY` dans votre shell mais que vous exécutez le Gateway via systemd/launchd, il est possible qu'il ne l'hérite pas. Placez-la dans `~/.openclaw/.env` ou activez `env.shellEnv`.
    - **Assurez-vous que vous modifiez le bon agent**
      - Les configurations multi-agents signifient qu'il peut y avoir plusieurs fichiers `auth-profiles.json`.
    - **Vérification rapide de l'état du modèle/de l'authentification**
      - Utilisez `openclaw models status` pour voir les modèles configurés et si les fournisseurs sont authentifiés.

    **Liste de vérification pour la correction de « No credentials found for profile anthropic »**

    Cela signifie que l'exécution est épinglée à un profil d'authentification Anthropic, mais que le Gateway
    ne peut pas le trouver dans son magasin d'authentification.

    - **Utiliser le Claude CLI**
      - Exécutez `openclaw models auth login --provider anthropic --method cli --set-default` sur l'hôte de la passerelle.
    - **Si vous souhaitez utiliser une clé API à la place**
      - Placez `ANTHROPIC_API_KEY` dans `~/.openclaw/.env` sur l'**hôte de la passerelle**.
      - Effacez tout ordre épinglé qui force un profil manquant :

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **Confirmer que vous exécutez les commandes sur l'hôte de la passerelle**
      - En mode distant, les profils d'authentification résident sur la machine passerelle, et non sur votre ordinateur portable.

  </Accordion>

  <Accordion title="Pourquoi a-t-il également essayé Google Gemini et échoué ?">
    Si la configuration de votre modèle inclut Google Gemini comme solution de repli (ou si vous avez basculé vers un raccourci Gemini), OpenClaw essaiera de l'utiliser lors du basculement de modèle. Si vous n'avez pas configuré d'identifiants Google, vous verrez `No API key found for provider "google"`.

    Solution : fournissez soit une authentification Google, soit supprimez/évitez les modèles Google dans `agents.defaults.model.fallbacks` / les alias afin que le basculement ne soit pas redirigé vers eux.

    **LLM request rejected: thinking signature required (Google Antigravity)**

    Cause : l'historique de la session contient des **blocs de réflexion sans signatures** (souvent suite à un flux interrompu/partiel). Google Antigravity exige des signatures pour les blocs de réflexion.

    Solution : OpenClaw supprime désormais les blocs de réflexion non signés pour Google Antigravity Claude. Si le problème persiste, démarrez une **nouvelle session** ou définissez `/thinking off` pour cet agent.

  </Accordion>
</AccordionGroup>

## Profils d'authentification : ce qu'ils sont et comment les gérer

Connexes : [/concepts/oauth](/fr/concepts/oauth) (flux OAuth, stockage des jetons, modèles multi-comptes)

<AccordionGroup>
  <Accordion title="Qu'est-ce qu'un profil d'authentification ?">
    Un profil d'authentification est un enregistrement d'identifiants nommé (OAuth ou clé API) lié à un fournisseur. Les profils résident dans :

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    Pour inspecter les profils enregistrés sans révéler les secrets, exécutez `openclaw models auth list` (optionnellement `--provider <id>` ou `--json`). Voir [Models CLI](/fr/cli/models#auth-profiles) pour plus de détails.

  </Accordion>

  <Accordion title="Quels sont les ID de profil typiques ?">
    OpenClaw utilise des ID préfixés par le fournisseur, tels que :

    - `anthropic:default` (courant lorsqu'aucune identité par e-mail n'existe)
    - `anthropic:<email>` pour les identités OAuth
    - des ID personnalisés de votre choix (par ex. `anthropic:work`)

  </Accordion>

  <Accordion title="Puis-je contrôler quel profil d'authentification est essayé en premier ?">
    Oui. La configuration prend en charge des métadonnées facultatives pour les profils et un ordre par fournisseur (`auth.order.<provider>`OpenClaw). Cela ne stocke **pas** les secrets ; il mappe les ID au fournisseur/mode et définit l'ordre de rotation.

    OpenClaw peut temporairement sauter un profil s'il est dans un court **refroidissement** (limites de taux/délais d'attente/échecs d'authentification) ou un état plus long **désactivé** (facturation/crédits insuffisants). Pour inspecter cela, exécutez `openclaw models status --json` et vérifiez `auth.unusableProfiles`. Réglage : `auth.cooldowns.billingBackoffHours*`.

    Les refroidissements dus aux limites de taux peuvent être limités au modèle. Un profil qui est en refroidissement pour un modèle peut toujours être utilisable pour un modèle frère sur le même fournisseur, tandis que les fenêtres de facturation/désactivation bloquent toujours l'ensemble du profil.

    Vous pouvez également définir une priorité de commande **par agent** (stockée dans le `auth-state.json`CLI de cet agent) via le CLI :

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    Pour cibler un agent spécifique :

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    Pour vérifier ce qui sera réellement essayé, utilisez :

    ```bash
    openclaw models status --probe
    ```

    Si un profil stocké est omis de l'ordre explicite, le sonde signale `excluded_by_auth_order` pour ce profil au lieu de l'essayer silencieusement.

  </Accordion>

  <Accordion title="OAuth vs clé API — quelle est la différence ?">
    OpenClaw prend en charge les deux :

    - **OAuth / Connexion CLI** tire souvent parti de l'accès par abonnement lorsque le
      fournisseur le prend en charge. Pour Anthropic, le backend Claude OpenClaw de CLI utilise
      Claude Code `claude -p` ; Anthropic considère actuellement cela comme une utilisation
      d'Agent SDK/programmatique, avec un crédit mensuel séparé pour l'Agent SDK à compter du
      15 juin 2026.
    - **Les clés API** utilisent la facturation au paiement à l'utilisation.

    L'assistant prend explicitement en charge Claude Anthropic de CLI, Codex OpenAI de OAuth et les clés API.

  </Accordion>
</AccordionGroup>

## Connexes

- [FAQ](/fr/help/faq) — la FAQ principale
- [FAQ — démarrage rapide et configuration du premier lancement](/fr/help/faq-first-run)
- [Sélection du modèle](/fr/concepts/model-providers)
- [Bascule de modèle](/fr/concepts/model-failover)

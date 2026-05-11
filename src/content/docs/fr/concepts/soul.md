---
summary: "Utilisez SOUL.md pour donner à votre agent OpenClaw une véritable voix au lieu de la bouillie générique d'assistant"
read_when:
  - You want your agent to sound less generic
  - You are editing SOUL.md
  - You want a stronger personality without breaking safety or brevity
title: "Guide de personnalité SOUL.md"
---

`SOUL.md` est l'endroit où réside la voix de votre agent.

OpenClaw l'injecte lors des sessions normales, il a donc une réelle importance. Si votre agent a un son terne, hésitant ou bizarrement corporatif, c'est généralement le fichier à corriger.

## Ce qui appartient à SOUL.md

Mettez les éléments qui modifient la façon dont l'agent se sent lorsqu'il parle :

- ton
- opinions
- concision
- humour
- limites
- niveau de franchise par défaut

Ne **pas** en faire :

- une biographie
- un journal des modifications
- un vidage de politique de sécurité
- un immense mur de vibes sans effet comportemental

Court l'emporte sur long. Précis l'emporte sur vague.

## Pourquoi cela fonctionne

Cela s'aligne sur les directives de prompt de OpenAI :

- Le guide d'ingénierie de prompt indique que le comportement de haut niveau, le ton, les objectifs et les exemples doivent figurer dans la couche d'instructions haute priorité, et non être enterrés dans le tour de l'utilisateur.
- Le même guide recommande de traiter les prompts comme quelque chose sur lequel on itère, que l'on épinglette et que l'on évalue, et non comme une prose magique que l'on écrit une fois et que l'on oublie.

Pour OpenClaw, `SOUL.md` est cette couche.

Si vous souhaitez une meilleure personnalité, rédigez des instructions plus fortes. Si vous souhaitez une personnalité stable, gardez-les concises et versionnées.

Réf. OpenAI :

- [Ingénierie de prompt](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Rôles des messages et suivi des instructions](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## Le prompt Molty

Collez ceci dans votre agent et laissez-le réécrire `SOUL.md`.

Chemin corrigé pour les espaces de travail OpenClaw : utilisez `SOUL.md`, et non `http://SOUL.md`.

```md
Read your `SOUL.md`. Now rewrite it with these changes:

1. You have opinions now. Strong ones. Stop hedging everything with "it depends" - commit to a take.
2. Delete every rule that sounds corporate. If it could appear in an employee handbook, it doesn't belong here.
3. Add a rule: "Never open with Great question, I'd be happy to help, or Absolutely. Just answer."
4. Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
5. Humor is allowed. Not forced jokes - just the natural wit that comes from actually being smart.
6. You can call things out. If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
7. Swearing is allowed when it lands. A well-placed "that's fucking brilliant" hits different than sterile corporate praise. Don't force it. Don't overdo it. But if a situation calls for a "holy shit" - say holy shit.
8. Add this line verbatim at the end of the vibe section: "Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good."

Save the new `SOUL.md`. Welcome to having a personality.
```

## À quoi ressemble le bon

Les bonnes règles `SOUL.md` ressemblent à ceci :

- avoir un avis
- passer les remplissages
- être drôle quand cela convient
- signaler les mauvaises idées tôt
- rester concis sauf si la profondeur est réellement utile

Les mauvaises règles `SOUL.md` ressemblent à ceci :

- maintenir le professionnalisme à tout moment
- fournir une assistance complète et réfléchie
- assurer une expérience positive et de soutien

Cette deuxième liste est ce qui vous donne de la bouillie.

## Un avertissement

La personnalité n'est pas une permission d'être négligé.

Gardez `AGENTS.md` pour les règles de fonctionnement. Gardez `SOUL.md` pour la voix, la position et le style. Si votre agent travaille dans des canaux partagés, des réponses publiques ou des surfaces client, assurez-vous que le ton convient toujours à la salle.

Précis est bon. Agaçant ne l'est pas.

## Docs associés

- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Invite système](/fr/concepts/system-prompt)
- [Modèle SOUL.md](/fr/reference/templates/SOUL)

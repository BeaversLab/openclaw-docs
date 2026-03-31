---
summary: "Durcissement de la liste d'autorisation Telegram : normalisation du préfixe et des espaces blancs"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Durcissement de la liste d'autorisation Telegram"
---

# Durcissement de la liste d'autorisation Telegram

**Date** : 2026-01-05  
**Statut** : Terminé  
**PR** : #216

## Résumé

Les listes d'autorisation Telegram acceptent désormais les préfixes `telegram:` et `tg:` sans distinction de casse et tolèrent les espaces blancs accidentels. Cela aligne les contrôles de la liste d'autorisation entrante avec la normalisation de l'envoi sortant.

## Ce qui a changé

- Les préfixes `telegram:` et `tg:` sont traités de manière identique (insensible à la casse).
- Les entrées de la liste d'autorisation sont nettoyées ; les entrées vides sont ignorées.

## Exemples

Tous les éléments suivants sont acceptés pour le même ID :

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## Pourquoi c'est important

Le copier-coller à partir des journaux ou des ID de discussion inclut souvent des préfixes et des espaces blancs. La normalisation évite les faux négatifs lors de la décision de répondre dans les DMs ou les groupes.

## Documentation connexe

- [Discussions de groupe](/en/concepts/groups)
- [Fournisseur Telegram](/en/channels/telegram)

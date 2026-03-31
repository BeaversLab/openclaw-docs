---
summary: "Exploración: configuración del modelo, perfiles de autenticación y comportamiento de respaldo"
read_when:
  - Exploring future model selection + auth profile ideas
title: "Exploración de la configuración del modelo"
---

# Configuración del modelo (Exploración)

Este documento captura **ideas** para la configuración futura del modelo. No es una
especificación de lanzamiento. Para el comportamiento actual, consulte:

- [Modelos](/en/concepts/models)
- [Conmutación por error del modelo](/en/concepts/model-failover)
- [OAuth + perfiles](/en/concepts/oauth)

## Motivación

Los operadores desean:

- Múltiples perfiles de autenticación por proveedor (personal vs. trabajo).
- Selección simple de `/model` con respaldos predecibles.
- Separación clara entre modelos de texto y modelos con capacidad de imagen.

## Posible dirección (alto nivel)

- Mantener la selección del modelo simple: `provider/model` con alias opcionales.
- Permitir que los proveedores tengan múltiples perfiles de autenticación, con un orden explícito.
- Utilizar una lista global de respaldo para que todas las sesiones conmuten por error de manera consistente.
- Anular el enrutamiento de imágenes solo cuando se configure explícitamente.

## Preguntas abiertas

- ¿La rotación de perfiles debe ser por proveedor o por modelo?
- ¿Cómo debería la interfaz de usuario mostrar la selección de perfil para una sesión?
- ¿Cuál es la ruta de migración más segura desde las claves de configuración heredadas?

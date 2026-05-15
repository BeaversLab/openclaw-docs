---
summary: "Cómo funciona la publicación en ClawHub para habilidades, complementos, propietarios, ámbitos, versiones y revisiones."
read_when:
  - Publishing a skill or plugin
  - Debugging owner or package scope errors
  - Adding publish UI, CLI, or backend behavior
---

# Publicar en ClawHub

La publicación en ClawHub está basada en el propietario: cada publicación tiene como objetivo un editor y el servidor decide si se permite al usuario que ha iniciado sesión publicar allí.

## Propietarios

Un propietario es un identificador de editor de ClawHub, como `@alice` o `@openclaw`.
Se crean propietarios personales para los usuarios. Los propietarios de organizaciones pueden tener varios miembros.

Cuando publique, utilice su propietario personal o elija un propietario de organización
en el que tenga acceso de editor.

## Habilidades

Las habilidades se publican desde una carpeta de habilidades. La página pública es:

```text
https://clawhub.ai/<owner>/<slug>
```

Ejemplo:

```text
https://clawhub.ai/alice/review-helper
```

La solicitud de publicación incluye el propietario seleccionado, el slug, la versión, el registro de cambios y
los archivos. El servidor verifica que el actor puede publicar como ese propietario antes de
crear la versión.

## Complementos

Los complementos usan nombres de paquetes estilo npm. Los nombres de paquetes con ámbito incluyen el propietario en
la primera parte del nombre:

```text
@owner/package-name
```

El ámbito debe coincidir con el propietario de publicación seleccionado. Si su paquete se llama
`@openclaw/dronzer`, solo se puede publicar como `@openclaw`. Si publica como
`@vintageayu`, cambie el nombre del paquete a `@vintageayu/dronzer`.

Esto evita que un paquete reclame un espacio de nombres de organización que el editor no
controla.

## Flujo de lanzamiento

1. La interfaz de usuario, la CLI o el flujo de trabajo de GitHub recopilan los metadatos y los archivos del paquete.
2. La solicitud de publicación se envía a ClawHub con el propietario seleccionado.
3. El servidor valida los permisos del propietario, el ámbito del paquete, el nombre del paquete, la versión,
   los límites de archivo y los metadatos de origen.
4. ClawHub almacena la versión e inicia comprobaciones de seguridad automatizadas.
5. Las nuevas versiones están ocultas en las superficies normales de instalación/descarga hasta que finalicen
   la revisión y la verificación.

Si la validación falla, no se crea la versión.

## Preguntas frecuentes

### El ámbito del paquete debe coincidir con el propietario seleccionado

Si el ámbito del paquete y el propietario seleccionado no coinciden, ClawHub rechaza la
publicación:

```text
Package scope "@openclaw" must match selected owner "@vintageayu".
Publish as "@openclaw" or rename this package to "@vintageayu/dronzer".
```

Para solucionarlo, elija el propietario nombrado por el ámbito del paquete o cambie el nombre del
paquete para que el ámbito coincida con el propietario con el que puede publicar.

Si el nombre del paquete ya tiene el ámbito correcto pero el paquete es propiedad del
editor equivocado, transfiera la propiedad en su lugar:

```sh
clawhub package transfer @opik/opik-openclaw --to opik
```

Use la transferencia de paquetes solo cuando tenga acceso de administrador tanto al propietario del paquete actual como al editor de destino. No le permite publicar en un ámbito que no pueda administrar.

Esto protege los espacios de nombres de las organizaciones. Un paquete llamado `@openclaw/dronzer` reclama el espacio de nombres `@openclaw`, por lo que solo los editores con acceso al propietario `@openclaw` pueden publicarlo.

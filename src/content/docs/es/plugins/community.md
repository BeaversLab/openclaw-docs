---
summary: "Buscar y publicar complementos de OpenClaw mantenidos por la comunidad"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin on ClawHub
title: "Complementos de la comunidad"
doc-schema-version: 1
---

Los complementos de la comunidad son paquetes de terceros que extienden OpenClaw con canales,
herramientas, proveedores, enlaces u otras capacidades. Use [ClawHub](/es/clawhub) como la
principal superficie de descubrimiento para los complementos públicos de la comunidad.

## Buscar complementos

Buscar en ClawHub desde la CLI:

```bash
openclaw plugins search "calendar"
```

Instale un complemento de ClawHub con un prefijo de origen explícito:

```bash
openclaw plugins install clawhub:<package-name>
```

npm sigue siendo una ruta de instalación directa compatible durante la transición de lanzamiento:

```bash
openclaw plugins install npm:<package-name>
```

Use [Administrar complementos](/es/plugins/manage-plugins) para ver ejemplos comunes de instalación, actualización,
inspección y desinstalación. Use [`openclaw plugins`](/es/cli/plugins) para obtener la
referencia completa de comandos y las reglas de selección de origen.

## Publicar complementos

Publique complementos públicos de la comunidad en ClawHub cuando desee que los usuarios de OpenClaw
los descubran e instalen. ClawHub posee el listado de paquetes en vivo, el historial
de versiones, el estado de escaneo y las sugerencias de instalación; la documentación no mantiene un catálogo
estático de complementos de terceros.

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

Antes de publicar, asegúrese de que el complemento tenga metadatos del paquete, un manifiesto del complemento,
documentación de configuración y un propietario de mantenimiento claro. ClawHub valida el alcance del propietario,
nombre del paquete, versión, límites de archivos y metadatos de origen antes de crear una
versión, y luego mantiene las nuevas versiones ocultas de las superficies normales de instalación y descarga
hasta que finalicen la revisión y verificación.

Use esta lista de verificación antes de publicar:

| Requisito                            | Por qué                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Publicado en ClawHub                 | Los usuarios necesitan que las sugerencias `openclaw plugins install` funcionen |
| Repositorio público de GitHub        | Revisión del código, seguimiento de problemas, transparencia                    |
| Documentación de configuración y uso | Los usuarios necesitan saber cómo configurarlo                                  |
| Mantenimiento activo                 | Actualizaciones recientes o gestión de problemas responsiva                     |

Use estas páginas para obtener el contrato completo de publicación:

- [Publicación en ClawHub](/es/clawhub/publishing) explica los propietarios, alcances, versiones,
  revisión, validación de paquetes y transferencia de paquetes.
- [Compilación de complementos](/es/plugins/building-plugins) muestra la estructura del paquete del complemento
  y el flujo de trabajo de primera publicación.
- [Manifiesto del complemento](/es/plugins/manifest) define los campos del manifiesto del complemento nativo.

## Relacionado

- [Plugins](/es/tools/plugin) - instalar, configurar, reiniciar y solucionar problemas
- [Administrar plugins](/es/plugins/manage-plugins) - ejemplos de comandos
- [Publicación en ClawHub](/es/clawhub/publishing) - reglas de publicación y lanzamiento

---
summary: "Resumen visual y evidencia técnica para la limpieza de rendimiento, tamaño de paquete, dependencias y shrinkwrap de mayo de 2026"
read_when:
  - You are validating the May 2026 performance and package-size cleanup
  - You need the numbers behind the OpenClaw performance and dependency blog post
  - You are changing release gates, package shrinkwrap, or plugin dependency boundaries
title: "Barrido de rendimiento de lanzamiento"
---

Esta página captura las evidencias detrás de la limpieza de rendimiento, tamaño de paquete, dependencias y shrinkwrap de OpenClaw de mayo de 2026. Es el acompañamiento técnico de la publicación del blog público.

Aquí se combinan dos auditorías:

- **Barrido de rendimiento de lanzamientos:** Lanzamientos de GitHub desde `v2026.5.28` hacia atrás
  hasta la versión estable `v2026.4.23`, utilizando el flujo de trabajo `OpenClaw Performance`,
  `profile=smoke`, carril mock-provider. La mayoría de las filas de etiquetas son una muestra; las
  filas `v2026.5.27` y `v2026.5.28` utilizan los artefactos más recientes de repetición-3 de la rama de lanzamiento.
- **Contexto de principios de abril:** publicó `clawgrit-reports` líneas base
  de mock-provider desde `v2026.4.1` hasta `v2026.5.2`, usadas solo para evitar tratar
  los lanzamientos rotos de finales de abril como la línea base de rendimiento público.
- **Barrido de la huella de instalación:** instalaciones `npm install --ignore-scripts` nuevas
  en paquetes temporales, con `du -sk node_modules` para el tamaño y un
  recorrido `node_modules` para el conteo de instancias de paquetes.
- **Barrido del tamaño del paquete npm:** `npm pack openclaw@<version> --dry-run --json`
  para lanzamientos publicados, registrando el tamaño del archivo tar comprimido, el tamaño descomprimido y
  el recuento de archivos.

<Warning>
  El barrido de rendimiento principal utiliza una muestra de prueba por etiqueta, excepto las filas `v2026.5.27` y `v2026.5.28`, que utilizan los artefactos más recientes de repetición-3 de la rama de lanzamiento. El contexto de principios de abril utiliza medianas de repetición-3 publicadas de `clawgrit-reports`. Trate los números como evidencia de tendencias y señales de búsqueda de regresiones,
  no como estadísticas de puertas de lanzamiento.
</Warning>

## Instantánea

Cobertura de rendimiento: **77 lanzamientos solicitados**, **74 puntos con respaldo de artefactos**,
y **3 ejecuciones de CI no disponibles**. Último punto medido estable: `v2026.5.28`.

<CardGroup cols={2}>
  <Card title="Agente estable turno" icon="gauge">
    **5.1x más rápido en arranque en frío**

    - `v2026.4.14`: 9.8s
    - `v2026.5.28`: 1.9s

  </Card>
  <Card title="Paquete publicado" icon="package">
    **Archivador tar de 17.9MB**

    Último paquete estable, frente al pico de tamaño de paquete de 43.3MB de marzo.

  </Card>
  <Card title="Última instalación estable" icon="hard-drive">
    **361.7MiB instalación nueva**

    `v2026.5.28` reduce drásticamente el árbol de dependencias anidado de OpenClaw, pero aún
    permanece un árbol anidado más pequeño de 259.7MiB en la auditoría de instalación local.

  </Card>
  <Card title="Gráfico de dependencias" icon="boxes">
    **300 paquetes instalados**

    Última versión estable, medida como raíces únicas de nombre/versión de paquete en una
    instalación nueva con scripts deshabilitados.

  </Card>
</CardGroup>

## Cronología de la huella de instalación

<CardGroup cols={2}>
  <Card title="Máximo mensual" icon="triangle-alert">
    **645 dependencias**

    `2026.2.26` fue el máximo mensual de conteo de dependencias en esta muestra.

  </Card>
  <Card title="Introducción de shrinkwrap" icon="lock">
    **1,020.6MB instalación**

    `2026.5.22` añadió shrinkwrap raíz y expuso un problema de forma de paquete:
    911.8MB aterrizaron bajo `openclaw/node_modules` anidado.

  </Card>
  <Card title="Última estable" icon="tag">
    **361.7MiB instalación**

    `2026.5.28` reduce el tamaño de instalación nueva en un 52.8% respecto a `2026.5.27`, pero aún
    instala un árbol anidado de OpenClaw de 259.7MiB.

  </Card>
  <Card title="Gráfico de dependencias" icon="scissors">
    **300 raíces de paquetes**

    `2026.5.28` instala 71 raíces únicas de nombre/versión de paquete menos que
    `2026.5.27`.

  </Card>
</CardGroup>

<Tip>Shrinkwrap no era el problema por sí mismo. La mala forma del paquete lo era. `v2026.5.28` todavía envía shrinkwrap, pero el árbol de dependencias anidado es mucho más pequeño y la dispersión de canvas multiplataforma ha desaparecido en la auditoría local.</Tip>

## Qué cambió en 5.28

La limpieza entre `v2026.5.27` y `v2026.5.28` redujo el gráfico de instalación predeterminado
en lugar de eliminar las capacidades en sí.

<CardGroup cols={2}>
  <Card title="Root default graph" icon="git-branch">
    Las raíces únicas de nombre de paquete/versión bajaron de **371** a **300**. Las instancias de paquetes bajaron de **372** a **301**.
  </Card>
  <Card title="Nested tree" icon="unplug">
    El `openclaw/node_modules` anidado bajó de **656.1MiB** a **259.7MiB** en la misma auditoría de instalación local.
  </Card>
  <Card title="Native optional cones" icon="cpu">
    El cono de paquete nativo `@napi-rs/canvas` de todas las plataformas dejó de aterrizar en la instalación predeterminada.
  </Card>
  <Card title="Superficie de la cadena de suministro" icon="shield">
    Menos paquetes predeterminados significa menos tarballs, mantenedores, binarios nativos, comportamientos de tiempo de instalación y rutas de actualización transitivas en las que confiar de forma predeterminada.
  </Card>
</CardGroup>

## Números destacados

No use las filas rotas de finales de abril como líneas base de rendimiento público.
`v2026.4.23` y `v2026.4.29` son pruebas de regresión útiles, pero los grandes
deltas estilo `14x` describen mayormente la recuperación de una línea de versión defectuosa.

Para la narrativa del blog, use la línea base publicada a principios de abril como escala:

| Métrica                     | Línea base de principios de abril | `v2026.5.28` |                        Delta |
| --------------------------- | --------------------------------: | -----------: | ---------------------------: |
| Turno de agente en frío     |                           9,819ms |      1,908ms | 80.6% menor, 5.1x más rápido |
| Turno de agente en caliente |                           7,458ms |      1,870ms | 74.9% menor, 4.0x más rápido |
| Pico RSS del agente         |                           686.2MB |      581.0MB |                  15.3% menor |

La línea base de abril anterior es `v2026.4.14` de la ejecución
publicada del proveedor simulado `clawgrit-reports`. Esa ejecución usó el repetidor 3 y falló solo
porque no se emitió la línea de tiempo de diagnóstico; las medianas de frío, cálido y RSS
siguen siendo útiles como escala aproximada. Trate esto como contexto narrativo, no una
estadística de puerta de versión.

Dentro del barrido de mayo, la fila de la rama de versión más reciente cambió materialmente desde
`v2026.5.2`:

| Métrica                      | `v2026.5.2` | `v2026.5.28` |       Delta |
| ---------------------------- | ----------: | -----------: | ----------: |
| Turno del agente en frío     |     3,897ms |      1,908ms | 51.0% menor |
| Turno del agente en caliente |     3,610ms |      1,870ms | 48.2% menor |
| Pico RSS del agente          |     613.7MB |      581.0MB |  5.3% menor |

Comparado con la versión estable anterior:

| Métrica                                 | `v2026.5.27` | `v2026.5.28` |       Delta |
| --------------------------------------- | -----------: | -----------: | ----------: |
| Turno del agente en frío                |      2,231ms |      1,908ms | 14.5% menor |
| Tiempo de vuelta del agente en caliente |      2,226ms |      1,870ms | 16.0% menor |
| Pico de RSS del agente                  |      649.0MB |      581.0MB | 10.5% menor |

### Huella de instalación

| Métrica                                                   | Línea base | `v2026.5.28` |       Delta |
| --------------------------------------------------------- | ---------: | -----------: | ----------: |
| Tamaño de instalación desde el pico `2026.5.22`           |  1,020.6MB |     361.7MiB | 64.6% menor |
| Tamaño de instalación desde la última versión `2026.5.27` |   767.1MiB |     361.7MiB | 52.8% menor |
| Dependencias desde el máximo mensual `2026.2.26`          |        645 |          300 | 53.5% menor |
| Dependencias desde la última versión `2026.5.27`          |        371 |          300 | 19.1% menor |
| Anidación `openclaw/node_modules` desde `2026.5.22`       |    911.8MB |     259.7MiB | 71.5% menor |
| Anidación `openclaw/node_modules` desde `2026.5.27`       |   656.1MiB |     259.7MiB | 60.4% menor |

### Tamaño del paquete npm

| Versión     | Archivocomprimido | Paquete desempaquetado | Archivos | Notas                                        |
| ----------- | ----------------: | ---------------------: | -------: | -------------------------------------------- |
| `2026.1.30` |            12.8MB |                 33.5MB |    4,607 | paquete renombrado temprano                  |
| `2026.2.26` |           23,6 MB |                82,9 MB |   10 125 | crecimiento de características               |
| `2026.3.31` |           43,3 MB |               182,6 MB |   21 037 | punto más alto del tamaño del paquete        |
| `2026.4.29` |           22,9 MB |                74,6 MB |    9 309 | poda de paquetes visible                     |
| `2026.5.12` |           23,4 MB |                80,1 MB |   12 035 | división importante de complementos externos |
| `2026.5.22` |           17,2 MB |                76,9 MB |   12 386 | docs/assets excluidos del paquete            |
| `2026.5.27` |           17,8 MB |                79,0 MB |   12 509 | paquete estable anterior                     |
| `2026.5.28` |            17.9MB |                 81.0MB |    9,082 | último paquete estable                       |

`2026.5.12` es el hito visible de extracción de complementos en el registro de cambios:
Amazon Bedrock, Bedrock Mantle, Slack, entorno de pruebas de OpenShell, Anthropic Vertex,
Matrix y WhatsApp se movieron fuera de la ruta de dependencia central, por lo que sus conos
de dependencia se instalan con esos complementos en lugar de en cada instalación central.

## Resumen de turnos del agente Kova

La línea estable de abril contiene dos historias diferentes. A principios de abril fue lento
pero reconocible. A finales de abril se convirtió en un acantilado de regresión. `v2026.5.2` es donde
el carril de proveedor simulado cae por primera vez en el rango de 3-5s y comienza a pasar
constantemente en el barrido suministrado.

Contexto publicado anteriormente:

| Versión      | Kova  | Turno en frío | Turno en caliente | Pico RSS del agente |
| ------------ | ----- | ------------: | ----------------: | ------------------: |
| `v2026.4.10` | FALLO |      11,031ms |           7,962ms |             679.0MB |
| `v2026.4.12` | FALLO |      11,965ms |           8,289ms |             713.5MB |
| `v2026.4.14` | FALLO |       9,819ms |           7,458ms |             686.2MB |
| `v2026.4.20` | FALLO |      22,314ms |          18,811ms |             810.8MB |
| `v2026.4.22` | FALLO |       9,630ms |           7,459ms |             743.0MB |

Barrido suministrado:

| Versión             | Kova     | Turno en frío | Turno en caliente | Pico RSS del agente |
| ------------------- | -------- | ------------: | ----------------: | ------------------: |
| `v2026.4.23`        | FALLO    |      47,847ms |           8,010ms |           1,082.7MB |
| `v2026.4.24`        | FALLO    |      48,264ms |          25,483ms |             996.0MB |
| `v2026.4.25`        | FALLO    |      81,080ms |          59,172ms |           1,113.9MB |
| `v2026.4.26`        | FALLO    |      76,771ms |          54,941ms |           1,140.8MB |
| `v2026.4.27`        | FALLO    |      60,902ms |          33,699ms |           1,156.0MB |
| `v2026.4.29`        | FALLO    |      94,031ms |          57,334ms |           3,613.7MB |
| `v2026.5.2`         | APROBADO |       3,897ms |           3,610ms |             613.7MB |
| `v2026.5.7`         | APROBADO |       3,923ms |           3,693ms |             654.1MB |
| `v2026.5.12`        | APROBADO |       7,248ms |           6,629ms |             834.8MB |
| `v2026.5.18`        | APROBADO |       3,301ms |           2,913ms |             630.3MB |
| `v2026.5.20`        | APROBADO |       3,413ms |           2,952ms |             643.2MB |
| `v2026.5.22`        | APROBADO |       4,494ms |           4,093ms |             654.3MB |
| `v2026.5.26`        | APROBADO |       2,626ms |           2,282ms |             660.4MB |
| `v2026.5.27-beta.1` | APROBADO |       2,575ms |           2,217ms |             635.3MB |
| `v2026.5.27`        | APROBADO |       2,231ms |           2,226ms |             649.0MB |
| `v2026.5.28`        | APROBADO |       1,908ms |           1,870ms |             581.0MB |

## Sondas de origen

Se omitieron las sondas de origen para 17 referencias antiguas exitosas porque esos árboles
de origen aún no tenían los puntos de entrada de sonda requeridos. Las métricas de
turno del agente aún existen para esas referencias.

Puntos de sonda de origen representativos:

| Lanzamiento         | Predeterminado `readyz` p50 | 50 complementos `readyz` p50 | Salud de CLI p50 | RSS máximo de complemento |
| ------------------- | --------------------------: | ---------------------------: | ---------------: | ------------------------: |
| `v2026.4.29`        |                     2,819ms |                      2,618ms |          1,679ms |                   389.0MB |
| `v2026.5.2`         |                     2,324ms |                      2,013ms |          1,384ms |                   377.2MB |
| `v2026.5.7`         |                     1,649ms |                      1,540ms |          1,175ms |                   387.6MB |
| `v2026.5.18`        |                     1,942ms |                      1,927ms |            607ms |                   426.5MB |
| `v2026.5.20`        |                     1,966ms |                      1,987ms |            621ms |                   455.0MB |
| `v2026.5.22`        |                     2,081ms |                      1,884ms |          5,095ms |                   444.2MB |
| `v2026.5.26`        |                     1,546ms |                      1,634ms |            656ms |                   400.4MB |
| `v2026.5.27-beta.1` |                     1,462ms |                      1,548ms |            548ms |                   394.0MB |
| `v2026.5.27`        |                     1,491ms |                      1,571ms |            553ms |                   401.5MB |
| `v2026.5.28`        |                     1,457ms |                      1,474ms |            623ms |                   386.1MB |

El pico de salud de la CLI de `v2026.5.22` es visible en esta tabla aunque el
carril de turno del agente aún haya pasado. Mantenga las sondas de origen al investigar
regresiones específicas de la CLI o la puerta de enlace.

## Auditoría de huella de instalación

Las muestras de dependencia usan un lanzamiento estable por mes, además del evento
de introducción de shrinkwrap `2026.5.22` y el último lanzamiento `2026.5.28`.

| Punto                    | Dependencias instaladas | Instalación nueva | Paquete OpenClaw | Anidado `openclaw/node_modules` | Root shrinkwrap | Comportamiento de instalación de Canvas    |
| ------------------------ | ----------------------: | ----------------: | ---------------: | ------------------------------: | --------------- | ------------------------------------------ |
| Ene `2026.1.30`          |                     605 |           438.4MB |           45.8MB |                           2.4MB | no              | wrapper de nivel superior + `darwin-arm64` |
| Feb `2026.2.26`          |                     645 |           575.7MB |          110.1MB |                           3.5MB | no              | wrapper de nivel superior + `darwin-arm64` |
| Mar `2026.3.31`          |                     438 |           584.1MB |          234.8MB |                             0MB | no              | wrapper de nivel superior + `darwin-arm64` |
| Abr `2026.4.29`          |                     392 |           335.0MB |           97.4MB |                             0MB | no              | ninguno instalado                          |
| `2026.5.22`              |                     401 |         1,020.6MB |        1,020.4MB |                         911.8MB | sí              | anidado: los 12 paquetes `@napi-rs/canvas` |
| May `2026.5.26`          |                     371 |           767.5MB |          767.4MB |                         656.4MB | sí              | anidado: los 12 paquetes `@napi-rs/canvas` |
| `2026.5.27`              |                     371 |          767.1MiB |         766.9MiB |                        656.1MiB | sí              | anidado: los 12 paquetes `@napi-rs/canvas` |
| Más reciente `2026.5.28` |                     300 |          361.7MiB |         361.6MiB |                        259.7MiB | sí              | ninguno instalado                          |

### Límite de shrinkwrap

<CardGroup cols={2}>
  <Card title="Antes de shrinkwrap" icon="unlock">
    `2026.5.20` no tiene root shrinkwrap y ningún árbol de dependencias de OpenClaw anidado grande.
  </Card>
  <Card title="Introducido" icon="lock">
    `2026.5.22` agrega root shrinkwrap e instala 911.8MB bajo `openclaw/node_modules` anidado.
  </Card>
  <Card title="Última versión estable" icon="tag">
    `2026.5.28` mantiene el shrinkwrap y todavía instala 259.7MiB bajo `openclaw/node_modules` anidado.
  </Card>
  <Card title="Fanout de Canvas corregido" icon="check">
    `2026.5.28` ya no instala ningún paquete `@napi-rs/canvas` en la auditoría de instalación fresca local.
  </Card>
</CardGroup>

La inspección del tarball publicado verifica el límite:

| Versión     | ¿Estable publicada? | Root `npm-shrinkwrap.json` | Notas                                            |
| ----------- | ------------------- | -------------------------- | ------------------------------------------------ |
| `2026.5.20` | sí                  | no                         | última versión estable antes de shrinkwrap       |
| `2026.5.21` | no                  | n/a                        | sin lanzamiento npm estable                      |
| `2026.5.22` | sí                  | sí                         | shrinkwrap introducido                           |
| `2026.5.23` | no                  | n/a                        | sin lanzamiento npm estable                      |
| `2026.5.24` | no                  | n/a                        | sin lanzamiento npm estable                      |
| `2026.5.25` | no                  | n/a                        | sin lanzamiento npm estable                      |
| `2026.5.26` | sí                  | sí                         | árbol de dependencias anidadas todavía presente  |
| `2026.5.27` | sí                  | sí                         | árbol de dependencias anidadas todavía presente  |
| `2026.5.28` | sí                  | sí                         | árbol de dependencias anidadas mucho más pequeño |

La distinción importante: **el shrinkwrap en sí no es el problema**.
`v2026.5.28` todavía envía el shrinkwrap raíz. El problema era la forma del paquete
que hacía que npm materializara un gran árbol de dependencias anidadas de OpenClaw y todos los 12
paquetes de plataforma `@napi-rs/canvas`. El árbol anidado es más pequeño en `v2026.5.28`,
y la expansión de la plataforma canvas ya no aparece en la auditoría local.

Para una explicación en lenguaje sencillo sobre el shrinkwrap y las comprobaciones de paquetes a nivel de mantenedor,
consulte [npm shrinkwrap](/es/gateway/security/shrinkwrap).

## Interpretación de la cadena de suministro

El recuento de dependencias es una métrica de seguridad operativa, no solo una métrica
de tamaño de instalación. Cada paquete expande el conjunto de mantenedores, tarballs, actualizaciones
transitivas, binarios nativos opcionales y comportamientos en tiempo de instalación que los operadores
deben confiar.

La dirección de la limpieza es:

- mantener las capacidades pesadas y opcionales fuera de la instalación principal predeterminada
- hacer que los paquetes de complementos sean dueños de su gráfico de dependencias en tiempo de ejecución
- evitar la reparación del administrador de paquetes en tiempo de ejecución durante el inicio de Gateway
- preservar instalaciones deterministas sin causar la materialización
  de paquetes nativos de todas las plataformas
- mantener los scripts de instalación deshabilitados en las rutas de aceptación y medición de paquetes
- detectar árboles de dependencias anidadas y explosiones de dependencias nativas opcionales antes
  de publicar

Documentos relacionados:

- [Resolución de dependencias de complementos](/es/plugins/dependency-resolution)
- [Inventario de complementos](/es/plugins/plugin-inventory)
- [Validación completa de la versión](/es/reference/full-release-validation)

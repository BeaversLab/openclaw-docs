---
summary: "Explicación técnica y en lenguaje sencillo de npm shrinkwrap en las versiones de OpenClaw"
read_when:
  - You want to know what npm shrinkwrap means in an OpenClaw release
  - You are reviewing package lockfiles, dependency changes, or supply-chain risk
  - You are validating root or plugin npm packages before publishing
title: "npm shrinkwrap"
---

Las descargas de código fuente de OpenClaw usan `pnpm-lock.yaml`. Los paquetes npm publicados de OpenClaw
usan `npm-shrinkwrap.json`, el archivo de bloqueo de dependencias publicable de npm, para que
las instalaciones de paquetes usen el gráfico de dependencias revisado durante el lanzamiento.

## La versión sencilla

Shrinkwrap es un recibo del árbol de dependencias que se envía con un paquete npm.
Le indica a npm qué versiones exactas de paquetes transitivos instalar.

Para las versiones de OpenClaw, esto significa:

- el paquete publicado no le pide a npm que invente un gráfico de dependencias nuevo en
  el momento de la instalación;
- los cambios en las dependencias son más fáciles de revisar porque aparecen en un archivo de bloqueo;
- la validación del lanzamiento puede probar el mismo gráfico que instalarán los usuarios;
- las sorpresas en el tamaño del paquete o en las dependencias nativas son más fáciles de detectar antes
  de publicar.

Shrinkwrap no es un sandbox. Por sí solo no hace que una dependencia sea segura y
no reemplaza el aislamiento del host, `openclaw security audit`, la
procedencia del paquete o las pruebas de humo de instalación.

El modelo mental corto:

| Archivo               | Dónde importa                         | Lo que significa                             |
| --------------------- | ------------------------------------- | -------------------------------------------- |
| `pnpm-lock.yaml`      | Descarga de código fuente de OpenClaw | Gráfico de dependencias del mantenedor       |
| `npm-shrinkwrap.json` | Paquete npm publicado                 | Gráfico de instalación de npm para usuarios  |
| `package-lock.json`   | Aplicaciones npm locales              | No es el contrato de publicación de OpenClaw |

## Por qué OpenClaw lo usa

OpenClaw es una puerta de enlace, host de complementos, enrutador de modelos y tiempo de ejecución de agentes. Una instalación
defecto puede afectar el tiempo de inicio, el uso de disco, las descargas de paquetes nativos y
la exposición de la cadena de suministro.

Shrinkwrap otorga a la revisión del lanzamiento un límite estable:

- los revisores pueden ver el movimiento de las dependencias transitivas;
- los validadores de paquetes pueden rechazar derivas inesperadas en el archivo de bloqueo;
- la aceptación del paquete puede probar las instalaciones con el gráfico que se enviará;
- los paquetes de complementos pueden llevar su propio gráfico de dependencias bloqueado en lugar de
  depender del paquete raíz para poseer dependencias exclusivas de complementos.

El objetivo no son "más archivos de bloqueo". El objetivo son instalaciones de lanzamiento reproducibles
con propiedad clara.

## Detalles técnicos

El paquete npm raíz `openclaw` y los paquetes de complementos npm propiedad de OpenClaw incluyen
`npm-shrinkwrap.json` cuando se publican. Los paquetes de complementos
propiedad de OpenClaw adecuados también pueden publicarse con `bundledDependencies` explícito, por lo que sus archivos
de dependencias en tiempo de ejecución se incluyen en el archivo tar del complemento en lugar de depender únicamente de
la resolución en el momento de la instalación.

Mantenga el límite de la siguiente manera:

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

El generador resuelve el formato de bloqueo publicable de npm, pero rechaza las
versiones de paquetes generadas que aún no están presentes en `pnpm-lock.yaml`. Eso mantiene
el límite de antigüedad, anulación y revisión de parches de las dependencias de pnpm intacto.

Use comandos solo para la raíz solo cuando intencionalmente actualice el paquete raíz
sin tocar los paquetes de complementos:

```bash
pnpm deps:shrinkwrap:root:generate
pnpm deps:shrinkwrap:root:check
```

Revise estos archivos como confidenciales para la seguridad:

- `pnpm-lock.yaml`
- `npm-shrinkwrap.json`
- cargas útiles de dependencias de complementos agrupadas
- cualquier diferencia de `package-lock.json`

Los validadores de paquetes de OpenClaw requieren shrinkwrap en los nuevos archivos tar del paquete raíz.
La ruta de publicación npm del complemento verifica el shrinkwrap local del complemento, instala
dependencias agrupadas locales del paquete y luego empaqueta o publica. Los
validadores de paquetes rechazan `package-lock.json` para los paquetes de OpenClaw publicados.

Para inspeccionar un paquete raíz publicado:

```bash
npm pack openclaw@<version> --json --pack-destination /tmp/openclaw-pack
tar -tf /tmp/openclaw-pack/openclaw-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
```

Para inspeccionar un paquete de complemento propiedad de OpenClaw:

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
```

Antecedentes: [npm-shrinkwrap.](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json).

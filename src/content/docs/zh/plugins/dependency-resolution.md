---
summary: "OpenClawOpenClaw 如何安装插件包并解析插件依赖"
read_when:
  - You are debugging plugin package installs
  - You are changing plugin startup, doctor, or package-manager install behavior
  - You are maintaining packaged OpenClaw installs or bundled plugin manifests
title: "插件依赖解析"
sidebarTitle: "依赖"
---

OpenClaw 将插件依赖工作保留在安装/更新时。运行时加载
不会运行包管理器、修复依赖树或更改 OpenClaw
包目录。

## 职责划分

插件包拥有其依赖关系图：

- 运行时依赖位于插件包 `dependencies` 或
  `optionalDependencies` 中
- SDK/core 导入是 peer 或提供的 OpenClaw 导入
- 本地开发插件自带其已安装的依赖项
- npm 和 git 插件安装在 OpenClaw 拥有的包根目录中

OpenClaw 仅拥有插件生命周期：

- 发现插件源
- 在明确请求时安装或更新包
- 记录安装元数据
- 加载插件入口点
- 当依赖项缺失时，返回可操作的错误并失败

## 安装根目录

OpenClaw 使用每个源稳定的根目录：

- npm 包安装在 npm`~/.openclaw/npm` 下
- git 包克隆在 `~/.openclaw/git` 下
- 本地/路径/归档安装会被复制或引用，而不进行依赖修复

npm 安装在 npm 根目录中运行，使用：

```bash
cd ~/.openclaw/npm
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>`npmnpmOpenClawnpm 使用同一个受管理的 npm 根目录
来处理本地 npm-pack tarball。OpenClaw 读取 tarball 的 npm 元数据，将其作为
复制的 `file:`npm 依赖项添加到受管理的根目录中，运行正常的 npm 安装，
然后在信任插件之前验证已安装的 lockfile 元数据。
这旨在用于包验收和候选版本验证，即本地包工件
的行为应类似于其模拟的注册表工件。

npm 可能会将传递依赖提升到插件包旁边的 `~/.openclaw/npm/node_modules` 中。OpenClaw 在信任安装之前会扫描受管理的 npm 根目录，并在卸载期间使用 npm 移除由 npm 管理的包，因此提升后的运行时依赖项仍保留在受管理的清理边界内。

导入 `openclaw/plugin-sdk/*` 的插件会将 `openclaw` 声明为对等依赖（peer dependency）。OpenClaw 不允许 npm 将主机包的独立注册表副本安装到受管理的根目录中，因为过时的主机包可能会在后续的插件安装期间影响 npm 的对等解析。受管理的 npm 安装会跳过共享根目录的 npm 对等解析/具象化，并且 OpenClaw 会在安装、更新或卸载后，为声明主机对等依赖的已安装包重新断言插件本地的 `node_modules/openclaw` 链接。

git 安装会克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

已安装的插件随后从该包目录加载，因此包本地和父级 `node_modules` 解析的工作方式与普通 Node 包相同。

## 本地插件

本地插件被视为受开发者控制的目录。OpenClaw 不会为它们运行 `npm install`、`pnpm install` 或依赖项修复。如果本地插件具有依赖项，请在加载该插件之前在该插件中安装它们。

第三方 TypeScript 本地插件可以使用紧急 Jiti 路径。打包的 JavaScript 插件和捆绑的内部插件通过原生的 import/require 而不是 Jiti 加载。

## 启动和重载

Gateway(网关) 启动和配置重载从不安装插件依赖项。它们读取插件安装记录，计算入口点并加载它。

如果运行时缺少依赖项，插件将无法加载，并且错误应指向操作员明确的修复方法：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix`OpenClaw 可以清理传统的 OpenClaw 生成的依赖状态，并恢复在配置引用时本地安装记录中缺失的可下载插件。Doctor 不会为已安装的本地插件修复依赖关系。

## 捆绑插件

轻量级且对核心至关重要的捆绑插件作为 OpenClaw 的一部分提供。它们应该没有繁重的运行时依赖树，或者被移出到 ClawHub/npm 上的可下载包中。

有关当前随核心包提供、外部安装或保持仅源码的插件生成列表，请参阅[插件清单](/zh/plugins/plugin-inventory)。

捆绑插件清单不得请求依赖暂存。大型或可选的插件功能应打包为普通插件，并通过与第三方插件相同的 npm/git/ClawHub 路径进行安装。

在源代码检出中，OpenClaw 将存储库视为 pnpm monorepo。在 OpenClaw`pnpm install` 之后，捆绑插件从 `extensions/<id>` 加载，因此包本地工作区依赖项可用，并且编辑会直接被捕获。源代码检出的开发仅支持 pnpm；在存储库根目录直接运行 `npm install` 不是准备捆绑插件依赖项的受支持方式。

| 安装形式                         | 捆绑插件位置                      | 依赖所有者                                       |
| -------------------------------- | --------------------------------- | ------------------------------------------------ |
| `npm install -g openclaw`        | 包内构建的运行时树                | OpenClaw 包和显式插件 install/update/doctor 流程 |
| Git checkout 加上 `pnpm install` | `extensions/<id>` workspace 包    | pnpm workspace，包括每个插件包自己的依赖项       |
| `openclaw plugins install ...`   | 托管的 npm/git/ClawHub 插件根目录 | 插件 install/update 流程                         |

## 传统清理

旧版 OpenClaw 会在启动或 doctor 修复期间生成捆绑插件依赖根目录。当前的 doctor 清理会在使用 OpenClaw`--fix` 时删除这些过时的目录和符号链接，包括旧的 `plugin-runtime-deps` 根目录、指向已修剪 `plugin-runtime-deps` 目标的全局 Node-prefix 包符号链接、`.openclaw-runtime-deps*` 清单、生成的插件 `node_modules`、安装阶段目录以及包本地的 pnpm 存储。打包后的 postinstall 还会在修剪旧的目标根目录之前删除这些全局符号链接，以免升级后留下悬空的 ESM 包导入。

这些路径仅是遗留的残留物。新的安装不应创建它们。

> [!NOTE]
> 本页正在翻译中。

# Crawfish 国际化 (i18n) 实施指南

## 概述

本文档介绍如何为 Crawfish 项目添加国际化支持，使其能够支持中文和英文等多种语言。

## 文件结构

```
ui/src/i18n/
├── index.ts           # 导出模块
├── locales.ts         # 语言配置
├── translations.ts    # 翻译文件
└── i18n.ts           # i18n 核心逻辑
```

## 已创建的文件

### 1. `ui/src/i18n/locales.ts`
定义支持的语言类型和配置。

### 2. `ui/src/i18n/translations.ts`
包含所有翻译文本，目前支持中英文。

### 3. `ui/src/i18n/i18n.ts`
核心 i18n 逻辑，包括：
- `I18nController`: Lit 控制器
- `t`: 翻译指令
- `createI18n`: 创建 i18n 实例
- `useI18n`: 使用 i18n hook

### 4. `ui/src/i18n/index.ts`
统一导出模块。

### 5. `ui/src/ui/components/locale-switcher.ts`
语言切换器组件。

## 使用方法

### 在组件中集成 i18n

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { createI18n } from '../i18n';

@customElement('my-component')
export class MyComponent extends LitElement {
  private i18n = createI18n(this);

  render() {
    const { t } = this.i18n;
    
    return html`
      <h1>${t.topbar.brandTitle}</h1>
      <p>${t.topbar.brandSub}</p>
      <locale-switcher></locale-switcher>
    `;
  }
}
```

### 修改 app.ts

在 `OpenClawApp` 类中添加 i18n 控制器：

```typescript
import { createI18n, type Locale } from '../i18n';

@customElement('openclaw-app')
export class OpenClawApp extends LitElement {
  // 添加 i18n 控制器
  private i18n = createI18n(this);

  // 现有代码...
}
```

### 修改 app-render.ts

更新渲染函数使用翻译：

```typescript
import { createI18n } from './i18n';

export function renderApp(state: AppViewState) {
  // 添加 i18n
  const i18n = createI18n(state);
  const { t } = i18n;

  return html`
    <header class="topbar">
      <div class="brand-text">
        <div class="brand-title">${t.topbar.brandTitle}</div>
        <div class="brand-sub">${t.topbar.brandSub}</div>
      </div>
      <div class="topbar-status">
        <div class="pill">
          <span>${t.topbar.health}</span>
          <span>${state.connected ? t.topbar.healthOk : t.topbar.healthOffline}</span>
        </div>
        <locale-switcher></locale-switcher>
      </div>
    </header>
  `;
}
```

## 导航翻译

修改 `ui/src/ui/navigation.ts` 添加翻译支持：

```typescript
import { createI18n } from '../i18n';

export function titleForTab(tab: Tab): string {
  const i18n = createI18n(/* 需要传递 host */);
  const { t } = i18n;
  
  const titles: Record<Tab, string> = {
    overview: t.nav.overview,
    chat: t.nav.chat,
    config: t.nav.config,
    // ...
  };
  
  return titles[tab] || tab;
}
```

## 语言切换器

在顶部栏添加语言切换器：

```typescript
import '../components/locale-switcher';

// 在 renderApp 中添加
<locale-switcher></locale-switcher>
```

## 下一步工作

### 1. 修改核心文件

- `ui/src/ui/app.ts`: 添加 i18n 控制器
- `ui/src/ui/app-render.ts`: 使用翻译文本
- `ui/src/ui/navigation.ts`: 添加翻译支持
- 所有 view 文件: 使用翻译替换硬编码文本

### 2. 完善翻译

- 检查所有硬编码的英文字符串
- 添加到 `translations.ts`
- 提供准确的中英文翻译

### 3. 测试

- 测试语言切换功能
- 检查所有页面的翻译
- 确保语言偏好持久化

### 4. 渠道本土化

- 研究需要支持的本土化渠道（如微信）
- 添加渠道特定的翻译
- 适配本土化服务

## 技术说明

### i18n 控制器

`I18nController` 是一个 Lit 控制器，提供：
- 当前语言 (`locale`)
- 翻译函数 (`t`)
- 语言切换 (`set locale`)
- 自动检测浏览器语言
- 持久化到 localStorage

### 翻译函数

使用点号分隔的路径访问翻译：
```typescript
t.topbar.brandTitle    // 'OPENCLAW' 或 'OPENCLAW'
t.common.save          // 'Save' 或 '保存'
```

### 参数化翻译

支持参数替换：
```typescript
// 翻译中: 'Hello {name}!'
t.greeting({ name: 'World' })  // 'Hello World!'
```

## 注意事项

1. **翻译键命名**: 使用嵌套对象结构，便于组织
2. **缺失翻译**: 如果翻译不存在，返回键名
3. **语言检测**: 优先级：localStorage > 浏览器语言 > 默认语言
4. **性能**: i18n 控制器会在语言改变时触发更新

## 贡献指南

添加新语言时：
1. 在 `locales.ts` 中添加语言配置
2. 在 `translations.ts` 中添加翻译对象
3. 测试所有页面

## 参考资料

- [Lit 文档](https://lit.dev/)
- [Web i18n API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)

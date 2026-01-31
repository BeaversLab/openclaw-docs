# i18n 快速开始

## 1. 安装依赖

无需额外安装，i18n 模块已内置。

## 2. 导入 i18n

```typescript
import { createI18n } from '../i18n';
```

## 3. 在组件中使用

```typescript
@customElement('my-component')
export class MyComponent extends LitElement {
  private i18n = createI18n(this);

  render() {
    const { t } = this.i18n;
    return html`<p>${t.common.save}</p>`;
  }
}
```

## 4. 添加语言切换器

```typescript
import '../components/locale-switcher';

render() {
  return html`
    <locale-switcher></locale-switcher>
  `;
}
```

## 5. 测试

运行 UI:
```bash
cd ui
pnpm dev
```

访问 http://localhost:5173，你应该能看到语言切换器。

## 示例

完整示例请参见 `docs/i18n-guide.md`。

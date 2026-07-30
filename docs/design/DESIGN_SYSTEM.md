# FastLead Design System - Premium Edition

> **Premium minimalista + Micro-interações elegantes**
> 
> Um design system de classe mundial para a plataforma FastLead de publicidade em tablets de táxis.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Paleta de Cores](#paleta-de-cores)
3. [Tipografia](#tipografia)
4. [Espaçamento](#espaçamento)
5. [Elevações & Sombras](#elevações--sombras)
6. [Componentes](#componentes)
7. [Animações](#animações)
8. [Dark Mode](#dark-mode)
9. [Acessibilidade](#acessibilidade)
10. [Guia de Uso](#guia-de-uso)

---

## Visão Geral

O FastLead Design System é uma coleção premium de componentes React reutilizáveis, tokens de design e diretrizes que definem a identidade visual e experiência de usuário da plataforma.

### Princípios de Design

- **Minimalismo Elegante**: Design limpo com foco na usabilidade
- **Premium Visual**: Paleta sofisticada com cores vibrantes estratégicas
- **Acessibilidade Primeira**: WCAG 2.1 AA compliance em todos os componentes
- **Micro-interações**: Transições suaves e feedback visual imediato
- **Dark Mode Native**: Suporte completo para temas claro e escuro

### Stack Tecnológico

- **Framework**: React 18.x
- **Build Tool**: Vite
- **Utility CSS**: TailwindCSS 3.x
- **Component Library**: shadcn/ui (inspiration)
- **Font Loading**: Google Fonts (Inter + Poppins + Fira Code)

---

## Paleta de Cores

### Cores Primárias

A cor primária é um **azul profundo e elegante** que transmite confiança, profissionalismo e modernidade.

```
Primary Blue
├── 50   #F0F4FF  (Lightest - backgrounds)
├── 100  #E2EAFF
├── 200  #C5D5FF
├── 300  #A8BFFF
├── 400  #8BA9FF
├── 500  #6E93FF
├── 600  #5573E8  (Light primary - interactive)
├── 700  #3D52D6
├── 800  #2632C4
├── 900  #1B3B9C  (Deep primary - headers, dashboard)
└── 950  #0F2366  (Darkest)
```

**Uso**:
- CTAs primárias, links, highlights
- Backgrounds de headers e footers
- Focus states e accents

### Cores Secundárias

Laranja vibrante para destacar ações, promoções e elementos que precisam chamar atenção.

```
Secondary Orange
├── 50   #FFF8F1  (Lightest)
├── 100  #FFE8D8
├── 200  #FFD1B0
├── 300  #FFBA88
├── 400  #FFA360
├── 500  #FF8C38
├── 600  #FF7A1F
├── 700  #FF6B35  (Main secondary - CTAs, highlights)
├── 800  #E65A2B
├── 900  #CC4921
└── 950  #8B2E0F  (Darkest)
```

**Uso**:
- CTAs secundárias
- Elementos que precisam destacar
- Badges de promoção
- Hover states em elementos primários

### Cores Neutras

Escala de cinzas para backgrounds, borders, texto e estrutura geral.

```
Neutrals
├── 50   #FAFAFA  (Lightest - subtle backgrounds)
├── 100  #F4F4F7
├── 200  #E9E9EF  (Borders padrão)
├── 300  #D9D9E3
├── 400  #ACACC1  (Disabled text)
├── 500  #7C7C8F
├── 600  #64647E
├── 700  #464655  (Secondary text)
├── 800  #2A2A33
├── 900  #1A1A1F  (Primary text)
└── 950  #0F0F12  (Dark mode bg)
```

### Cores de Status

Cores semânticas para comunicar estado.

```
Status Colors
├── Success   #22C55E (Operações bem-sucedidas)
├── Error     #EF4444 (Erros e alertas críticos)
├── Warning   #F59E0B (Avisos e atenção)
└── Info      #0EA5E9 (Informações e dicas)
```

### Aplicando Cores

```jsx
// Classes TailwindCSS
<button className="bg-primary-600 text-white">Primary</button>
<button className="bg-secondary-600 text-white">Secondary</button>
<div className="bg-success-50 text-success-900">Success State</div>

// CSS Variables
<div style={{ color: 'var(--color-primary-600)' }}>Text</div>
```

---

## Tipografia

Sistema de tipografia com duas famílias de fontes para hierarquia clara.

### Famílias de Fontes

```
Display & Headings:  Poppins (bold, extrabold)
Body & UI:          Inter (light, normal, medium, semibold)
Code/Technical:     Fira Code (monospace)
```

### Escala de Tamanhos

#### Display (Hero/Section Titles)

```
Display XL: 3.5rem (56px) • Line-height: 1.2 • Weight: 700
Display LG: 3rem (48px)   • Line-height: 1.2 • Weight: 700
Display MD: 2.5rem (40px) • Line-height: 1.2 • Weight: 700
```

#### Headings (Section Titles, Cards)

```
H1/Heading XL: 2rem (32px)    • Line-height: 1.3 • Weight: 700
H2/Heading LG: 1.75rem (28px) • Line-height: 1.3 • Weight: 700
H3/Heading MD: 1.5rem (24px)  • Line-height: 1.4 • Weight: 600
H4/Heading SM: 1.25rem (20px) • Line-height: 1.4 • Weight: 600
H5/Heading XS: 1.125rem (18px)• Line-height: 1.5 • Weight: 600
```

#### Body (Conteúdo, Descrições)

```
Body LG: 1.125rem (18px) • Line-height: 1.6 • Weight: 400
Body MD: 1rem (16px)     • Line-height: 1.6 • Weight: 400 (padrão)
Body SM: 0.875rem (14px) • Line-height: 1.5 • Weight: 400
Body XS: 0.75rem (12px)  • Line-height: 1.5 • Weight: 400
```

#### Labels & Captions (UI, Forms)

```
Label:   0.875rem (14px) • Line-height: 1.5 • Weight: 500 • Letter-spacing: 0.5px
Caption: 0.75rem (12px)  • Line-height: 1.5 • Weight: 500 • Letter-spacing: 1px
```

### Usando Tipografia

```jsx
// CSS Classes
<h1 className="text-display-lg font-display font-bold">Hero Title</h1>
<p className="text-body-md">Body text</p>
<label className="text-label">Form Label</label>

// HTML Tags (com estilos base aplicados automaticamente)
<h1>Automatically styled</h1>
<p>Automatically styled</p>
```

---

## Espaçamento

Sistema de espaçamento baseado em múltiplos de 4px para harmonia visual e alinhamento de grid.

### Escala

```
0    → 0px      (none)
1    → 4px      (xs)
2    → 8px      (sm)
3    → 12px     (sm+)
4    → 16px     (md) ✨ MAIS USADO
5    → 20px     (md+)
6    → 24px     (lg) ✨ MAIS USADO
8    → 32px     (lg+)
10   → 40px     (xl)
12   → 48px     (2xl)
16   → 64px     (4xl)
```

### Usando Espaçamento

```jsx
// Padding
<div className="p-4">           {/* padding: 16px all */}
<div className="px-6 py-4">     {/* padding: 24px x, 16px y */}
<div className="p-4 md:p-6">     {/* responsive */}

// Margin
<div className="m-4">           {/* margin: 16px all */}
<div className="mx-auto">       {/* margin: auto x (center) */}
<div className="gap-4">         {/* gap in flex/grid: 16px */}

// CSS Variables
<div style={{ marginBottom: 'var(--spacing-4)' }}>
```

### Espaçamento Padrão para Componentes

```
Buttons:     px-6 py-2.5 (20px x, 10px y)
Cards:       p-6 (24px all)
Inputs:      px-4 py-2.5 (16px x, 10px y)
Modals:      p-6 (24px all)
Section:     py-12 px-6 (48px y, 24px x)
```

---

## Elevações & Sombras

Sistema de elevações em 3 níveis para criar hierarquia de profundidade.

### Níveis de Elevação

#### Elevation 1 - Sutil

Para elementos que flutuam levemente acima da superfície.

```css
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 
            0 1px 2px rgba(0, 0, 0, 0.04);
```

**Uso**: Buttons, small cards, hoverable elements

```jsx
<button className="shadow-elevation-1 hover:shadow-elevation-1-hover">
```

#### Elevation 2 - Médio

Para componentes mais elevados, dropdowns, popovers.

```css
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12),
            0 4px 8px rgba(0, 0, 0, 0.08);
```

**Uso**: Large cards, dropdowns, elevated containers

```jsx
<div className="shadow-elevation-2 hover:shadow-elevation-2-hover">
```

#### Elevation 3 - Forte

Para elementos que flutuam acima de tudo (modals, popovers, sticky).

```css
box-shadow: 0 16px 32px rgba(0, 0, 0, 0.16),
            0 8px 16px rgba(0, 0, 0, 0.1);
```

**Uso**: Modals, popovers, sticky headers

```jsx
<Modal className="shadow-elevation-3">
```

### Focus Shadow

Para estados de foco acessível.

```css
box-shadow: 0 0 0 3px rgba(110, 147, 255, 0.1),
            0 0 0 5px rgba(110, 147, 255, 0.3);
```

---

## Componentes

### Button

Component botão versátil com múltiplas variações.

#### Variantes

- **primary**: Ação principal
- **secondary**: Ação secundária
- **outline**: Bordered button
- **ghost**: Texto apenas
- **danger**: Ações destrutivas
- **success**: Confirmações positivas

#### Sizes

- **xs**: 12px, compacto
- **sm**: 14px, pequeno
- **md**: 16px (padrão)
- **lg**: 16px, maior
- **xl**: 18px, extra grande

#### Exemplo

```jsx
import { Button } from '@/components';

<Button variant="primary" size="md">
  Primary Action
</Button>

<Button variant="secondary">
  Secondary Action
</Button>

<Button variant="ghost" size="sm">
  Link Button
</Button>

<Button loading disabled>
  Loading...
</Button>

<Button fullWidth>
  Full Width
</Button>
```

---

### Input

Campo de entrada com suporte a múltiplas variantes.

#### Variantes

- **default**: Background branco, border padrão
- **outlined**: Apenas border
- **filled**: Background preenchido

#### Sizes

- **sm**: Compacto
- **md**: Padrão (recomendado)
- **lg**: Maior

#### Exemplo

```jsx
import { Input } from '@/components';

<Input
  label="Email"
  placeholder="seu@email.com"
  type="email"
  size="md"
/>

<Input
  label="Senha"
  type="password"
  error={true}
  errorMessage="Mínimo 8 caracteres"
/>

<Input
  label="Com ícone"
  icon={<SearchIcon />}
  placeholder="Buscar..."
/>

<Input
  placeholder="Com helper text"
  helperText="Máximo 100 caracteres"
/>
```

---

### Card

Container semântico para conteúdo agrupado.

#### Props

- **hoverable**: Efeito hover com shadow
- **interactive**: Comportamento de clique
- **bordered**: Com ou sem border
- **shadow**: Nível de elevação
- **padding**: Espaçamento interno

#### Exemplo

```jsx
import { Card } from '@/components';

<Card padding="md" shadow="elevation-1">
  <h3 className="text-heading-md mb-2">Card Title</h3>
  <p>Card content goes here</p>
</Card>

<Card hoverable interactive onClick={() => {}}>
  Clicável
</Card>

<Card bordered={false} padding="lg">
  Sem border
</Card>
```

---

### Badge

Pequeno rótulo/tag com múltiplas variantes.

#### Variantes

- **default**, **secondary**, **success**, **error**, **warning**, **info**, **neutral**

#### Sizes

- **sm**: Pequeno
- **md**: Padrão
- **lg**: Maior

#### Exemplo

```jsx
import { Badge } from '@/components';

<Badge>Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="error" size="lg">Error Badge</Badge>

<Badge
  removable
  onRemove={() => console.log('removed')}
>
  Removable
</Badge>

<Badge icon={<CheckIcon />}>
  With Icon
</Badge>
```

---

### Avatar

Componente de avatar com suporte a imagem, iniciais e status.

#### Sizes

- **xs**: 24px
- **sm**: 32px
- **md**: 40px (padrão)
- **lg**: 48px
- **xl**: 64px
- **2xl**: 80px

#### Status

- **online**: Verde
- **offline**: Cinza
- **away**: Amarelo
- **busy**: Vermelho

#### Exemplo

```jsx
import { Avatar } from '@/components';

<Avatar
  src="https://example.com/avatar.jpg"
  alt="User name"
  size="md"
/>

<Avatar
  initials="JD"
  size="lg"
  status="online"
/>

<Avatar
  src={userImage}
  status="away"
/>
```

---

### Skeleton

Loading placeholder com diferentes variantes.

#### Variantes

- **text**: Linha de texto
- **avatar**: Avatar circular
- **avatar-lg**: Avatar grande
- **image-square**: Imagem quadrada
- **image-rect**: Imagem retangular
- **card**: Card completo
- **button**: Button skeleton
- **title**: Título

#### Exemplo

```jsx
import { Skeleton } from '@/components';

<Skeleton variant="text" count={3} />

<div className="flex gap-4">
  <Skeleton variant="avatar" />
  <div className="flex-1">
    <Skeleton variant="title" className="w-2/3" />
    <Skeleton variant="text" count={2} />
  </div>
</div>
```

---

### Modal

Diálogo modal com header, content e footer.

#### Props

- **isOpen**: Controla visibilidade
- **onClose**: Callback ao fechar
- **title**: Título do modal
- **size**: sm, md, lg, xl, 2xl, full
- **footer**: Conteúdo do footer
- **closeButton**: Mostrar botão de fechar

#### Exemplo

```jsx
import { Modal, Button } from '@/components';
import { useState } from 'react';

function MyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Modal Title"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary">Confirm</Button>
          </div>
        }
      >
        <p>Modal content goes here</p>
      </Modal>
    </>
  );
}
```

---

### Toast

Notificação toast com posicionamento e tipo.

#### Tipos

- **success**: Verde
- **error**: Vermelho
- **warning**: Amarelo
- **info**: Azul
- **default**: Cinza escuro

#### Posições

- **top-left**, **top-center**, **top-right**
- **bottom-left**, **bottom-center**, **bottom-right**

#### Exemplo

```jsx
import { Toast, Button } from '@/components';
import { useState } from 'react';

function MyComponent() {
  const [showToast, setShowToast] = useState(false);

  return (
    <>
      <Button onClick={() => setShowToast(true)}>
        Show Toast
      </Button>

      {showToast && (
        <Toast
          type="success"
          message="Ação realizada com sucesso!"
          position="bottom-right"
          duration={3000}
          onClose={() => setShowToast(false)}
          action={{
            label: 'Desfazer',
            onClick: () => console.log('Undo')
          }}
        />
      )}
    </>
  );
}
```

---

### Tabs

Abas com diferentes layouts.

#### Variantes

- **default**: Underline style
- **pills**: Pill style com background
- **underline**: Apenas underline

#### Exemplo

```jsx
import { Tabs } from '@/components';

const tabItems = [
  {
    label: 'Tab 1',
    content: <div>Content 1</div>
  },
  {
    label: 'Tab 2',
    icon: <IconComponent />,
    content: <div>Content 2</div>
  },
  {
    label: 'Tab 3',
    content: <div>Content 3</div>
  }
];

<Tabs
  tabs={tabItems}
  defaultActiveTab={0}
  onChange={(index) => console.log(index)}
  variant="default"
/>
```

---

### Accordion

Conteúdo expansível com múltiplos items.

#### Props

- **items**: Array de { label, content }
- **defaultOpenIndex**: Item aberto por padrão
- **allowMultiple**: Permitir múltiplos items abertos

#### Exemplo

```jsx
import { Accordion } from '@/components';

const items = [
  {
    label: 'Section 1',
    content: <p>Content for section 1</p>
  },
  {
    label: 'Section 2',
    content: <p>Content for section 2</p>
  }
];

<Accordion
  items={items}
  defaultOpenIndex={0}
  allowMultiple={false}
/>
```

---

### Select

Select dropdown com opções.

#### Exemplo

```jsx
import { Select } from '@/components';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' }
];

<Select
  label="Choose an option"
  placeholder="Select..."
  options={options}
  value={selectedValue}
  onChange={(val) => setSelectedValue(val)}
  size="md"
/>

<Select
  options={options}
  error={true}
  errorMessage="This field is required"
/>
```

---

## Animações

Sistema de animações para micro-interações elegantes.

### Animações Base

```
fade-in         300ms • Aparecer gradualmente
fade-out        300ms • Desaparecer gradualmente
slide-in-top    300ms • Deslizar de cima
slide-in-bottom 300ms • Deslizar de baixo
slide-in-left   300ms • Deslizar da esquerda
slide-in-right  300ms • Deslizar da direita
scale-in        300ms • Aparecer com zoom
pulse-soft      2s    • Pulsação suave (indefinido)
float           3s    • Flutuação suave (indefinido)
shimmer         2s    • Carregamento (indefinido)
```

### Timing Functions

```
ease-smooth    cubic-bezier(0.4, 0, 0.2, 1)    (padrão)
ease-elastic   cubic-bezier(0.175, 0.885, 0.32, 1.275)
ease-bounce    cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Exemplo

```jsx
// Usar classes automaticamente
<div className="animate-fade-in">
  Apareça com fade
</div>

<div className="animate-slide-in-bottom duration-300">
  Deslize de baixo
</div>

// Custom durations
<div className="animate-pulse duration-1000">
  Mais lento
</div>
```

### Usando Transições

```jsx
// Smooth color change
<button className="transition-colors duration-200 hover:bg-primary-700">
  
// Smooth transform
<div className="transition-transform duration-300 hover:scale-110">

// Multiple properties
<div className="transition-all duration-200 hover:shadow-lg">
```

---

## Dark Mode

Design system com suporte completo para dark mode.

### Ativando Dark Mode

```jsx
// Em App.jsx ou root component
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Detectar preferência do sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return <YourApp />;
}

// Ou controlar manualmente
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
};
```

### Cores em Dark Mode

Todos os componentes incluem estilos dark mode automáticos:

```jsx
// Estes estilos se aplicam automaticamente em modo escuro
<div className="bg-white dark:bg-neutral-900">
  {/* Branco em light mode, cinza escuro em dark mode */}
</div>

<p className="text-neutral-900 dark:text-white">
  {/* Texto escuro em light, texto claro em dark */}
</p>
```

### Tested Dark Mode Colors

```
Background:      #0F0F12 (neutral-950)
Background Alt:  #1A1A1F (neutral-900)
Border:          #464655 (neutral-700)
Text:            #FAFAFA (neutral-50)
Text Secondary:  #ACACC1 (neutral-400)
```

---

## Acessibilidade

Todos os componentes são construídos com acessibilidade como prioridade.

### WCAG 2.1 AA Compliance

- Contraste de cor mínimo 4.5:1
- Focus states visíveis
- Suporte a teclado
- ARIA labels apropriadas
- Semântica HTML correta

### Focus States

Todos os elementos interativos têm focus states visíveis:

```jsx
// Ring automático em focus
<button className="focus:outline-none focus:ring-2 focus:ring-primary-500">
  {/* Ring azul em volta quando focado */}
</button>
```

### Suporte a Teclado

- Tab para navegar
- Enter/Space para ativar
- Escape para fechar modals
- Arrow keys para navegação em menus

### Reduzir Movimento

Respeitamos `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Guia de Uso

### Setup Inicial

1. **Instalar dependências**:

```bash
npm install tailwindcss postcss autoprefixer
npm install -D @tailwindcss/typography
```

2. **Copiar arquivos**:
   - `tailwind.config.js` → Raiz do projeto
   - `src/styles/globals.css` → Seu CSS global
   - `src/components/` → Pasta de componentes

3. **Importar CSS global**:

```jsx
// Em main.jsx ou App.jsx
import './styles/globals.css';
```

### Usando Componentes

```jsx
import { Button, Input, Card, Badge } from '@/components';

function Dashboard() {
  return (
    <div className="p-6">
      <Card padding="lg">
        <h1 className="text-heading-xl mb-4">Welcome</h1>

        <Input
          label="Email"
          placeholder="seu@email.com"
          className="mb-4"
        />

        <div className="flex gap-3">
          <Button variant="primary">
            Submit
          </Button>
          <Button variant="ghost">
            Cancel
          </Button>
        </div>

        <Badge variant="success" className="mt-4">
          All set!
        </Badge>
      </Card>
    </div>
  );
}

export default Dashboard;
```

### Criar Novo Componente

1. **Criar pasta**: `src/components/MyComponent/`
2. **Criar arquivo**: `MyComponent.jsx`
3. **Exportar**: `index.js`

```jsx
// MyComponent.jsx
import React from 'react';

export const MyComponent = React.forwardRef((props, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white dark:bg-neutral-900 rounded-lg shadow-elevation-1 p-6"
      {...props}
    >
      {/* Content */}
    </div>
  );
});

MyComponent.displayName = 'MyComponent';
```

4. **Adicionar a exports**: `src/components/index.js`

```js
export { MyComponent } from './MyComponent';
```

### Best Practices

1. **Use classes TailwindCSS** para estilos:
   ```jsx
   ❌ style={{ padding: '24px' }}
   ✅ className="p-6"
   ```

2. **Responda a tema escuro**:
   ```jsx
   ❌ className="bg-white"
   ✅ className="bg-white dark:bg-neutral-900"
   ```

3. **Use variáveis CSS** para valores dinâmicos:
   ```jsx
   <div style={{ color: 'var(--color-primary-600)' }} />
   ```

4. **Mantenha components pequenos e focados**:
   - 1 responsabilidade por componente
   - Props bem documentadas
   - Reutilizável em múltiplos contextos

5. **Sempre incluir displayName**:
   ```jsx
   MyComponent.displayName = 'MyComponent';
   ```

---

## Estrutura de Arquivos

```
FastLead/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   ├── Button.css
│   │   │   └── index.js
│   │   ├── Input/
│   │   │   ├── Input.jsx
│   │   │   └── index.js
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Modal/
│   │   ├── Toast/
│   │   ├── Tabs/
│   │   ├── Accordion/
│   │   ├── Select/
│   │   ├── Skeleton/
│   │   └── index.js (exports centralizados)
│   ├── styles/
│   │   └── globals.css (design tokens + estilos base)
│   ├── assets/
│   ├── hooks/
│   └── utils/
├── tailwind.config.js
├── postcss.config.js
└── DESIGN_SYSTEM.md (este arquivo)
```

---

## Próximos Passos

- [ ] Criar componentes adicionais (Navbar, Sidebar, Breadcrumbs)
- [ ] Adicionar componentes de Data (Datepicker, Calendar)
- [ ] Adicionar componentes de Charts (Bar, Line, Pie)
- [ ] Criar Storybook para documentação visual
- [ ] Adicionar testes unitários (Vitest + React Testing Library)
- [ ] Documentar patterns comuns
- [ ] Criar guia de acessibilidade detalhado
- [ ] Setup CI/CD para verificar compliance

---

## Suporte e Feedback

Encontrou algo? Tem sugestões?

1. Verifique se o componente existe
2. Leia a documentação completa
3. Teste em múltiplos browsers
4. Reporte com exemplos isolados

---

**Versão**: 1.0  
**Atualizado**: 09/07/2026  
**Status**: Pronto para Produção  

Made with ❤️ for FastLead

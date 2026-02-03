# HoloScript Language - Complete Documentation

**Version:** 2.0  
**Status:** Core Component of Holo* Ecosystem  
**Last Updated:** February 3, 2026  
**Architecture:** Spatial Computing Language

---

## 🎯 Overview

HoloScript is a **domain-specific language (DSL) for spatial computing** that compiles to both **DOM2D (browser-based 2D rendering) and native spatial formats** (AR/VR).

**Primary Purpose:**
- Declarative UI definition for spatial interfaces
- Cross-platform spatial application development
- Integration with Hololand runtime

**Core Value Proposition:**
- Write once, render anywhere (web, AR, VR)
- Spatial-first design paradigm
- Seamless Hololand integration

---

## 📋 Language Fundamentals

### Syntax Overview

```holoscript
// Basic HoloScript file structure
@namespace "myapp.spatial"
@version "1.0.0"

// Define a spatial component
spatial Component(width: 100, height: 100) {
  // Layout system - spatial positioning
  layout: flex {
    direction: vertical
    align: center
    justify: space-between
  }
  
  // Visual properties
  background: {
    color: #2d2d2d
    opacity: 1.0
    corners: 8px
  }
  
  // Children elements
  element Text("Hello HoloScript") {
    font-size: 16px
    color: #ffffff
  }
  
  element Button("Click Me") {
    action: @on-click handleClick
    state: hover {
      background: #404040
      transform: scale(1.05)
    }
  }
}

// Event handler
handler handleClick() {
  emit Button:clicked
  log "Button clicked!"
}

// Animations
animation slideIn {
  from: { transform: translateX(-100px), opacity: 0 }
  to: { transform: translateX(0), opacity: 1 }
  duration: 300ms
  easing: ease-out
}

// Responsive breakpoints
@media (max-width: 768px) {
  spatial Component {
    layout: flex { direction: vertical }
  }
}
```

### Language Concepts

**1. Spatial Primitives**
```holoscript
// Basic shapes
element Rect(width: 100, height: 100)
element Circle(radius: 50)
element Line(from: [0,0], to: [100,100])
element Text("Content")
element Image("path/to/image.png")
```

**2. Layout System**
```holoscript
layout: flex {
  direction: row | column | vertical | horizontal
  align: start | center | end | stretch
  justify: start | center | end | space-between | space-around
  gap: 16px
  wrap: true | false
}

layout: grid {
  columns: auto | 1fr | repeat(3, 1fr)
  rows: auto | 1fr
  gap: 8px
}

layout: absolute {
  x: 10px
  y: 20px
  z-index: 1
}
```

**3. State Management**
```holoscript
// Local component state
state {
  isActive: boolean = false
  count: number = 0
  selected: string = "option1"
}

// Reactive updates
on count > 5 {
  background: { color: #ff0000 }
}

// Event handlers
handler increment() {
  set count = count + 1
}

handler reset() {
  set count = 0
}
```

**4. Binding & Data Flow**
```holoscript
// Data binding
element Text(content: @bind(store.message))

// Computed properties
computed isValid = email.includes("@") && email.length > 5

// Conditional rendering
@if user.isLoggedIn {
  element Text("Welcome " + user.name)
} @else {
  element Button("Login") { action: @on-click openLoginForm }
}

// Lists
@for (item in items) {
  element ListItem(text: item.name)
}
```

**5. Styling System**
```holoscript
// Inline styles
element Text {
  color: #ffffff
  font-size: 16px
  font-weight: bold
  line-height: 1.5
  letter-spacing: 0.5px
}

// Style classes
@style .heading {
  font-size: 24px
  font-weight: bold
  color: #2d2d2d
  margin: 0 0 16px 0
}

element Text("Title") {
  class: heading
}

// Theme system
@theme dark {
  primary-color: #2d2d2d
  secondary-color: #404040
  text-color: #ffffff
  accent-color: #007bff
}

@theme light {
  primary-color: #ffffff
  secondary-color: #f5f5f5
  text-color: #2d2d2d
  accent-color: #0056b3
}
```

**6. Animations & Transitions**
```holoscript
animation slideIn {
  from: { transform: translateX(-100px), opacity: 0 }
  to: { transform: translateX(0), opacity: 1 }
  duration: 300ms
  easing: ease-out
  delay: 0ms
}

transition smooth {
  duration: 200ms
  easing: ease-in-out
  properties: [background, transform, opacity]
}

element Text {
  animation: slideIn
  state: hover { transform: scale(1.05), transition: smooth }
}
```

---

## 🏗️ Architecture

### Compilation Pipeline

```
HoloScript Source (.holo)
    ↓
Lexer (Tokenization)
    ↓
Parser (AST Generation)
    ↓
Type Checker
    ↓
Optimizer
    ↓
Code Generation
    ├─→ DOM2D (Browser/Web)
    ├─→ AR/VR Format
    └─→ Intermediate Representation
```

### Compiler Phases

**Phase 1: Lexical Analysis**
- Tokenize source code
- Identify keywords, identifiers, literals
- Handle comments and whitespace

**Phase 2: Syntax Analysis**
- Parse tokens into Abstract Syntax Tree (AST)
- Validate grammar
- Report syntax errors

**Phase 3: Semantic Analysis**
- Type checking
- Symbol resolution
- Scope validation
- Error detection

**Phase 4: Optimization**
- Dead code elimination
- Constant folding
- Layout optimization
- Animation pre-computation

**Phase 5: Code Generation**
- Generate target-specific code
- DOM2D: Create JavaScript/React components
- AR/VR: Generate spatial format
- Optimize for runtime

### Runtime Execution

```
Compiled Code
    ↓
HoloScript Runtime
    ├─→ Layout Engine (Spatial positioning)
    ├─→ Animation System (Keyframes & timing)
    ├─→ Event System (User interactions)
    ├─→ Binding System (State management)
    └─→ Renderer (DOM2D or native)
```

---

## 🔌 Integration with Hololand

HoloScript is the **primary UI definition language for Hololand runtime**.

### Hololand Usage Pattern

**1. Define UI in HoloScript:**
```holoscript
// my-world.holo
spatial MainWorld {
  element Header {
    element Text("Welcome to HoloWorld")
  }
  
  element Content {
    @for (item in items) {
      element Card(data: item)
    }
  }
}
```

**2. Load in Hololand:**
```typescript
// Hololand runtime code
import { loadHoloFile } from '@holoscript/runtime';

const composition = await loadHoloFile('my-world.holo');
const dom = createDOM2DRenderer(composition);
document.body.appendChild(dom);
```

**3. Runtime Integration:**
- Hololand loads `.holo` files
- Parses with HoloScript compiler
- Renders to DOM2D or native spatial format
- Manages lifecycle and interactions

---

## 📚 Standard Library

### Built-in Components

**UI Elements:**
```holoscript
element Text(content: string, options?: TextOptions)
element Button(label: string, options?: ButtonOptions)
element Input(type: "text" | "number" | "date", options?: InputOptions)
element Image(src: string, options?: ImageOptions)
element Video(src: string, options?: VideoOptions)
element Icon(name: string, options?: IconOptions)
element Card(children: Component[], options?: CardOptions)
element Modal(title: string, children: Component[])
element Dropdown(options: string[], selected?: string)
element Checkbox(checked?: boolean)
element Toggle(enabled?: boolean)
element ProgressBar(value: 0-100)
element Slider(min: number, max: number, value?: number)
```

**Layout Components:**
```holoscript
element VStack(children: Component[])  // Vertical flex
element HStack(children: Component[])  // Horizontal flex
element Grid(columns: number, children: Component[])
element Spacer(width?: number, height?: number)
element Divider(orientation?: "horizontal" | "vertical")
element Container(children: Component[], padding?: number)
```

**Specialized Components:**
```holoscript
element Timeline(events: TimelineEvent[])
element Chart(data: ChartData, type: "line" | "bar" | "pie")
element DataTable(data: Row[], columns: Column[])
element Form(fields: FormField[])
element Breadcrumb(items: BreadcrumbItem[])
element AccordionGroup(items: AccordionItem[])
element Tabs(tabs: TabItem[])
```

### Built-in Functions

**Utility Functions:**
```holoscript
// String functions
concat(a: string, b: string): string
substring(str: string, start: number, end?: number): string
toUpperCase(str: string): string
toLowerCase(str: string): string
trim(str: string): string
includes(str: string, search: string): boolean

// Array functions
length(arr: any[]): number
map(arr: T[], fn: (item: T) => U): U[]
filter(arr: T[], fn: (item: T) => boolean): T[]
find(arr: T[], fn: (item: T) => boolean): T
reduce(arr: T[], fn: (acc: U, item: T) => U, init: U): U
join(arr: any[], separator: string): string

// Math functions
abs(n: number): number
round(n: number): number
floor(n: number): number
ceil(n: number): number
min(a: number, b: number): number
max(a: number, b: number): number

// Time functions
now(): timestamp
delay(ms: number): promise
setTimeout(fn: () => void, ms: number): void
```

### Built-in Variables

```holoscript
// Window/View
@window.width    // Current viewport width
@window.height   // Current viewport height
@window.scale    // Device pixel ratio

// User/Device
@device.type     // "web" | "mobile" | "ar" | "vr"
@device.os       // "web" | "ios" | "android"

// Time
@time.now        // Current timestamp
@time.elapsed    // Elapsed time since load

// Platform
@platform.theme  // "light" | "dark"
@platform.lang   // Current language code
```

---

## 🔧 Development Tools

### Compiler CLI

```bash
# Compile HoloScript to JavaScript
holoscript compile input.holo --output output.js

# Watch mode for development
holoscript watch input.holo --output output.js

# Generate type definitions
holoscript types input.holo --output types.d.ts

# Validate syntax
holoscript check input.holo

# Optimize for production
holoscript build input.holo --minify --optimize
```

### IDE Support

**VS Code Extension:**
- Syntax highlighting
- Auto-completion
- Real-time validation
- Error squiggles
- Preview rendering

**Installation:**
```bash
code --install-extension holoscript.holoscript-vscode
```

### Debug Mode

```holoscript
@debug @on
// All logs and warnings enabled

element Text("Debug enabled") {
  @debug-label "text-element-1"  // Named breakpoint
}

// Console logging
log "Message: " + value
warn "Warning: something unexpected"
error "Error: something failed"
```

---

## 📖 Examples

### Example 1: Todo Application

```holoscript
@namespace "examples.todo"

spatial TodoApp {
  state {
    todos: Todo[] = []
    inputValue: string = ""
    filter: "all" | "active" | "completed" = "all"
  }
  
  element VStack {
    element Header {
      element Text("My Todos") { class: heading }
    }
    
    element InputForm {
      element Input(type: "text") {
        state: { placeholder: "Add a todo..." }
        action: @on-change { inputValue } = event.target.value
      }
      element Button("Add") {
        action: @on-click addTodo
      }
    }
    
    element FilterButtons {
      @for (filterType in ["all", "active", "completed"]) {
        element Button(filterType) {
          state: { selected: filter == filterType }
          action: @on-click { filter } = filterType
        }
      }
    }
    
    element TodoList {
      @for (todo in filteredTodos) {
        element TodoItem(todo: todo)
      }
    }
  }
  
  // Computed filtered list
  computed filteredTodos = todos.filter(todo => {
    @if filter == "all" { return true }
    @if filter == "active" { return !todo.completed }
    @if filter == "completed" { return todo.completed }
  })
  
  // Event handlers
  handler addTodo() {
    @if inputValue.trim().length > 0 {
      set todos = [...todos, { id: uuid(), text: inputValue, completed: false }]
      set inputValue = ""
    }
  }
}

// Type definition
type Todo = {
  id: string
  text: string
  completed: boolean
}
```

### Example 2: Dashboard with Charts

```holoscript
@namespace "examples.dashboard"

spatial Dashboard {
  state {
    timeRange: "1d" | "7d" | "30d" = "7d"
    selectedMetric: string = "revenue"
  }
  
  element VStack {
    element TopBar {
      element Text("Analytics Dashboard") { class: heading }
      
      element HStack {
        @for (range in ["1d", "7d", "30d"]) {
          element Button(range) {
            action: @on-click { timeRange } = range
          }
        }
      }
    }
    
    element Grid(columns: 2) {
      element Card {
        element Chart(data: revenueData, type: "line")
      }
      
      element Card {
        element Chart(data: usersData, type: "bar")
      }
      
      element Card {
        element DataTable(data: transactionData, columns: tableColumns)
      }
      
      element Card {
        element Text("Key Metrics") { class: heading }
        element HStack {
          element MetricBox(label: "Total Revenue", value: "$12,345")
          element MetricBox(label: "New Users", value: "234")
          element MetricBox(label: "Conversion", value: "3.2%")
        }
      }
    }
  }
}
```

---

## 🚀 Best Practices

### 1. Component Organization

```holoscript
// Group related components
@namespace "components.ui"

spatial Button {
  // Pure presentation component
  // No side effects
}

spatial Form {
  // Stateful component
  // Manages form state internally
}
```

### 2. Performance Optimization

```holoscript
// Memoize computed values
computed expensiveComputation = memo(() => {
  return heavyCalculation(data)
})

// Lazy load components
element LazyComponent {
  loader: @lazy loadComponentPath
  loading: { element Text("Loading...") }
  error: { element Text("Failed to load") }
}

// Virtualize long lists
element VirtualList(items: items, itemHeight: 50) {
  @for (item in visibleItems) {
    element ListItem(data: item)
  }
}
```

### 3. Accessibility

```holoscript
element Button("Submit") {
  @aria-label "Submit form"
  @aria-pressed @bind(isActive)
  @role "button"
  @keyboard-shortcut "enter"
}

element Card {
  @aria-label "Card title"
  @tabindex 0
}
```

### 4. Testing

```holoscript
// Unit test format
@test "Button renders correctly" {
  const comp = render(ButtonComponent)
  expect(comp.text).toBe("Click Me")
}

@test "Click handler fires" {
  const comp = render(ButtonComponent)
  comp.click()
  expect(onClickMock).toHaveBeenCalled()
}

@test "Disabled state works" {
  const comp = render(ButtonComponent, { disabled: true })
  expect(comp.disabled).toBe(true)
}
```

---

## 📊 Type System

HoloScript includes a **static type system** inspired by TypeScript:

```holoscript
// Primitive types
type MyString = string
type MyNumber = number
type MyBoolean = boolean
type MyAny = any

// Union types
type ButtonVariant = "primary" | "secondary" | "danger"

// Object types
type User = {
  id: string
  name: string
  email: string
  age?: number  // Optional property
}

// Array types
type Users = User[]

// Function types
type Handler = (event: Event) => void

// Generic types
type Box<T> = {
  value: T
  isEmpty: () => boolean
}

// Type aliases
type Coordinate = { x: number, y: number }
type Color = "#RRGGBB" | "rgba(r,g,b,a)"
```

---

## 🔄 Version History

**v2.0 (Current - Feb 2026):**
- Spatial-first design paradigm
- Enhanced animation system
- Type safety improvements
- Better Hololand integration
- Performance optimizations

**v1.5 (2025):**
- DOM2D renderer
- Basic component library
- State management

**v1.0 (2024):**
- Initial language spec
- Lexer and parser
- Basic rendering

---

## 📚 Resources

- **GitHub:** github.com/brianonbased-dev/HoloScript
- **Playground:** holoscript.dev/playground
- **Docs:** https://holoscript.dev/docs
- **Discord:** discord.gg/holoscript

---

## 🤝 Contributing

See CONTRIBUTING.md in the HoloScript repository.

Contributions welcome! Key areas:
- Standard library expansion
- Performance improvements
- IDE extensions
- Documentation

---

**Last Updated:** February 3, 2026  
**Maintained By:** HoloScript Team  
**Status:** Production Ready

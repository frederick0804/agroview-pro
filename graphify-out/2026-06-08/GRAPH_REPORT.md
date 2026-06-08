# Graph Report - C:\Users\Frederick\Documents\blue-data\agroview-pro\.claude\worktrees\recursing-golick  (2026-06-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1007 nodes · 1923 edges · 73 communities (65 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd5ee2cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Dynamic Form Fields|Dynamic Form Fields]]
- [[_COMMUNITY_Report Builder Metrics|Report Builder Metrics]]
- [[_COMMUNITY_External Dependencies|External Dependencies]]
- [[_COMMUNITY_Role Based Access|Role Based Access]]
- [[_COMMUNITY_Dashboard Area Management|Dashboard Area Management]]
- [[_COMMUNITY_Inventory Management Hooks|Inventory Management Hooks]]
- [[_COMMUNITY_Report Configuration|Report Configuration]]
- [[_COMMUNITY_Sidebar Navigation Components|Sidebar Navigation Components]]
- [[_COMMUNITY_Module Definitions|Module Definitions]]
- [[_COMMUNITY_Build and Lint Config|Build and Lint Config]]
- [[_COMMUNITY_Toast Notification System|Toast Notification System]]
- [[_COMMUNITY_App Configuration Constants|App Configuration Constants]]
- [[_COMMUNITY_Layout Grid Utilities|Layout Grid Utilities]]
- [[_COMMUNITY_AI Analysis Panel|AI Analysis Panel]]
- [[_COMMUNITY_Module Providers|Module Providers]]
- [[_COMMUNITY_Navigation Context|Navigation Context]]
- [[_COMMUNITY_Supply Table Components|Supply Table Components]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_Navigation UI Components|Navigation UI Components]]
- [[_COMMUNITY_Inventory Data Context|Inventory Data Context]]
- [[_COMMUNITY_UI Framework Config|UI Framework Config]]
- [[_COMMUNITY_Report Version Comparison|Report Version Comparison]]
- [[_COMMUNITY_Commercial Page Headers|Commercial Page Headers]]
- [[_COMMUNITY_TypeScript Node Config|TypeScript Node Config]]
- [[_COMMUNITY_Form UI Components|Form UI Components]]
- [[_COMMUNITY_Inventory Rules Config|Inventory Rules Config]]
- [[_COMMUNITY_Authentication Views|Authentication Views]]
- [[_COMMUNITY_Theme and Styling|Theme and Styling]]
- [[_COMMUNITY_Weather Chat Widget|Weather Chat Widget]]
- [[_COMMUNITY_Carousel UI Components|Carousel UI Components]]
- [[_COMMUNITY_TypeScript Project Config|TypeScript Project Config]]
- [[_COMMUNITY_Menubar UI Components|Menubar UI Components]]
- [[_COMMUNITY_Field Difference Dialogs|Field Difference Dialogs]]
- [[_COMMUNITY_Button and Calendar|Button and Calendar]]
- [[_COMMUNITY_Chart Configuration|Chart Configuration]]
- [[_COMMUNITY_Command Palette UI|Command Palette UI]]
- [[_COMMUNITY_Context Menu UI|Context Menu UI]]
- [[_COMMUNITY_Dropdown Menu UI|Dropdown Menu UI]]
- [[_COMMUNITY_Header Design Editor|Header Design Editor]]
- [[_COMMUNITY_Alert and Avatar|Alert and Avatar]]
- [[_COMMUNITY_Table UI Components|Table UI Components]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Drawer UI Components|Drawer UI Components]]
- [[_COMMUNITY_CSV Export Utilities|CSV Export Utilities]]
- [[_COMMUNITY_Breadcrumb Navigation|Breadcrumb Navigation]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_User Profile View|User Profile View]]
- [[_COMMUNITY_OTP Input Components|OTP Input Components]]
- [[_COMMUNITY_Trend Preview Widgets|Trend Preview Widgets]]
- [[_COMMUNITY_Config Migration Utilities|Config Migration Utilities]]
- [[_COMMUNITY_Accordion UI Components|Accordion UI Components]]
- [[_COMMUNITY_Local Permissions Settings|Local Permissions Settings]]
- [[_COMMUNITY_Recent Activity Feed|Recent Activity Feed]]
- [[_COMMUNITY_Dashboard Tab Content|Dashboard Tab Content]]
- [[_COMMUNITY_Textarea UI Component|Textarea UI Component]]
- [[_COMMUNITY_Development Shell Scripts|Development Shell Scripts]]
- [[_COMMUNITY_Metric Card Component|Metric Card Component]]
- [[_COMMUNITY_Quick Action Buttons|Quick Action Buttons]]
- [[_COMMUNITY_Producer Summary Data|Producer Summary Data]]
- [[_COMMUNITY_Block Height Utilities|Block Height Utilities]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 140 edges
2. `useRole()` - 37 edges
3. `useConfig()` - 26 edges
4. `Button` - 25 edges
5. `useInventario()` - 24 edges
6. `compilerOptions` - 19 edges
7. `Input` - 18 edges
8. `Label` - 16 edges
9. `compilerOptions` - 14 edges
10. `DialogContent` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Anti-flash Theme Script` --conceptually_related_to--> `Tailwind CSS`  [INFERRED]
  index.html → README.md
- `ProtectedRoute()` --calls--> `useRole()`  [EXTRACTED]
  src/App.tsx → src/contexts/RoleContext.tsx
- `ModuleGuard()` --calls--> `useRole()`  [EXTRACTED]
  src/App.tsx → src/contexts/RoleContext.tsx
- `BloqueCard()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/InformeVersionDialog.tsx → src/lib/utils.ts
- `AutocompleteCell()` --calls--> `cn()`  [EXTRACTED]
  src/components/tables/EditableTable.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (73 total, 8 thin omitted)

### Community 0 - "Dynamic Form Fields"
Cohesion: 0.05
Nodes (49): CampoDependencia, CampoOpcion, CampoValidaciones, CalculoCampoRef, RelacionOperacion, CampoIA, DEMO_RESULTS, FaseIA (+41 more)

### Community 1 - "Report Builder Metrics"
Cohesion: 0.04
Nodes (43): AgregacionTipo, BLOCK_HEIGHT_DEFAULT, BLOCK_HEIGHT_MAX, BLOCK_HEIGHT_MIN, CampoCalculado, CampoEncabezado, CampoInfo, CamposCalculadosEditor() (+35 more)

### Community 2 - "External Dependencies"
Cohesion: 0.04
Nodes (48): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers, input-otp (+40 more)

### Community 3 - "Role Based Access"
Cohesion: 0.06
Nodes (38): roles, ActionPermission, ACTIONS_BY_ROLE, ALL_ACTIONS, _ALL_MODULE_KEYS, ALL_MODULES, AREA_MODULES, CLIENTES_DEMO (+30 more)

### Community 4 - "Dashboard Area Management"
Cohesion: 0.05
Nodes (33): Activity, AREA_COLORS, AREA_LABELS, AREA_PATHS, AX, DashboardEditCtx, DateRangeKey, GLOBAL_RESUMEN_DATA (+25 more)

### Community 5 - "Inventory Management Hooks"
Cohesion: 0.08
Nodes (34): getStockPct(), getStockStatus(), useInventario(), ReglasSection(), InventarioAlertaWidget(), CatalogoInline(), ConteoFisicoView(), DetalleSheet() (+26 more)

### Community 6 - "Report Configuration"
Cohesion: 0.06
Nodes (35): CATEGORIA_CONFIG, CategoriaInforme, CATEGORIES, DEMO_GENERACION_TIMES, DetailPanelProps, ESTADO_CONFIG, EstadoGeneracion, EstadoInforme (+27 more)

### Community 7 - "Sidebar Navigation Components"
Cohesion: 0.07
Nodes (27): useIsMobile(), Separator, Sidebar, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+19 more)

### Community 8 - "Module Definitions"
Cohesion: 0.13
Nodes (25): ACCESOS_DEFINICION_DEMO, Calibre, Cultivo, CULTIVOS, DATOS_DEMO, DefinicionAccesoUsuario, DEFINICIONES, DefSnapshot (+17 more)

### Community 9 - "Build and Lint Config"
Cohesion: 0.07
Nodes (27): Anti-flash Theme Script, devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+19 more)

### Community 10 - "Toast Notification System"
Cohesion: 0.12
Nodes (23): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+15 more)

### Community 11 - "App Configuration Constants"
Cohesion: 0.08
Nodes (18): version, avatarColors, EMPTY_EMPRESA, EMPTY_PARAM_FORM, ESTADO_OPTIONS, EVENTO_TEMPLATES, INFORMES_ACCION_INFO, MODULO_OPTIONS (+10 more)

### Community 12 - "Layout Grid Utilities"
Cohesion: 0.11
Nodes (17): BloqueLayout, ComponenteCampo, NivelEstructura, clampBloqueToGrid(), clampNumber(), clampPanToGridBounds(), COLOR_PALETTE, COLOR_THEMES (+9 more)

### Community 13 - "AI Analysis Panel"
Cohesion: 0.11
Nodes (17): DEMO_IA_ROWS, DEMO_ML_RESULTS, DetectedField, DetectedRow, Fase, Tipo, AutocompleteCell(), EditableCell() (+9 more)

### Community 14 - "Module Providers"
Cohesion: 0.12
Nodes (16): ConfigProvider(), RoleProvider(), ComercialModule(), Cosecha(), Cultivo(), DynRow, Laboratorio(), ModuleDashboard() (+8 more)

### Community 15 - "Navigation Context"
Cohesion: 0.19
Nodes (20): RoleSelector(), useConfig(), useRole(), bottomNavItems, navItems, Sidebar(), SidebarProps, cn() (+12 more)

### Community 16 - "Supply Table Components"
Cohesion: 0.12
Nodes (15): TablaInsumosRow, diasParaVencer(), SUBTIPOS, TIPO_BORDER, TIPO_ICONS, TIPO_LABELS, VencimientoBadge(), AREA_LABELS (+7 more)

### Community 17 - "TypeScript App Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 18 - "Navigation UI Components"
Cohesion: 0.11
Nodes (10): NavLink, NavLinkCompatProps, HoverCardContent, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuViewport, Progress, RadioGroup (+2 more)

### Community 19 - "Inventory Data Context"
Cohesion: 0.11
Nodes (16): AlertaVencimiento, DEMO_CATALOGOS, DEMO_FORMULARIO_MAPAS, DEMO_LOTES, DEMO_MOVIMIENTOS, getCampoVencimiento(), InvCampoConValor, InvCampoTipo (+8 more)

### Community 20 - "UI Framework Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 21 - "Report Version Comparison"
Cohesion: 0.16
Nodes (12): BloqueCard(), BloqueDiff, DiffStatus, InformeSnapshot, PropDiff, Informe, InformeSnapshot, BuilderConfig (+4 more)

### Community 22 - "Commercial Page Headers"
Cohesion: 0.16
Nodes (12): PageHeader(), PageHeaderProps, Cliente, clienteColumns, initialClientes, initialPedidos, Pedido, pedidoColumns (+4 more)

### Community 23 - "TypeScript Node Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 24 - "Form UI Components"
Cohesion: 0.14
Nodes (11): LiveChart(), FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormLabel (+3 more)

### Community 25 - "Inventory Rules Config"
Cohesion: 0.18
Nodes (13): InvFormularioMapa, InvMovimientoSubtipo, InvMovimientoTipo, EMPTY_FORM, paramLabel(), ReglaDialog(), ReglaForm, SUBTIPOS (+5 more)

### Community 26 - "Authentication Views"
Cohesion: 0.19
Nodes (8): RecoveryData, Login(), Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 27 - "Theme and Styling"
Cohesion: 0.21
Nodes (11): applyTheme(), DEFAULT_THEME, getLuminance(), hexToHsl(), hexToHslParts(), ThemeConfig, ThemeContextValue, ThemeProvider() (+3 more)

### Community 28 - "Weather Chat Widget"
Cohesion: 0.19
Nodes (12): buildInitialMessage(), ChatMessage, CultivationVerdict, generateBotResponse(), generateWeather(), getCultivationVerdict(), QUICK_QUESTIONS, randomBetween() (+4 more)

### Community 29 - "Carousel UI Components"
Cohesion: 0.15
Nodes (11): CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions, CarouselPlugin (+3 more)

### Community 30 - "TypeScript Project Config"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+3 more)

### Community 31 - "Menubar UI Components"
Cohesion: 0.17
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 32 - "Field Difference Dialogs"
Cohesion: 0.20
Nodes (7): estadoBadge, ModDef, ModParam, CampoConfigDrawerProps, DiffStatus, FieldDiff, PropDiff

### Community 33 - "Button and Calendar"
Cohesion: 0.20
Nodes (9): ButtonProps, buttonVariants, Calendar(), CalendarProps, PaginationContent, PaginationEllipsis(), PaginationItem, PaginationLinkProps (+1 more)

### Community 34 - "Chart Configuration"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 35 - "Command Palette UI"
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Community 36 - "Context Menu UI"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 37 - "Dropdown Menu UI"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 38 - "Header Design Editor"
Cohesion: 0.25
Nodes (6): CAMPOS, HeaderCell, HeaderCellType, HeaderLayout, HeaderRow, Input

### Community 39 - "Alert and Avatar"
Cohesion: 0.19
Nodes (7): Alert, AlertDescription, AlertTitle, alertVariants, Avatar, AvatarFallback, AvatarImage

### Community 40 - "Table UI Components"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 41 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 42 - "Drawer UI Components"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 43 - "CSV Export Utilities"
Cohesion: 0.47
Nodes (4): CsvRow, downloadCsv(), exportToCsv(), toCsvString()

### Community 44 - "Breadcrumb Navigation"
Cohesion: 0.33
Nodes (5): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbPage, BreadcrumbSeparator()

### Community 45 - "Package Metadata"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "User Profile View"
Cohesion: 0.50
Nodes (4): ALL_MODULES, getInitials(), Perfil(), ROLE_BADGE

### Community 47 - "OTP Input Components"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 48 - "Trend Preview Widgets"
Cohesion: 0.50
Nodes (4): buildIdxTrendLabels(), fakeComp(), fakeTrend(), MiniWidgetPreview()

### Community 49 - "Config Migration Utilities"
Cohesion: 0.50
Nodes (4): createDefaultGrafico(), createDefaultTabla(), migrateConfig(), nextId()

### Community 50 - "Accordion UI Components"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 53 - "Dashboard Tab Content"
Cohesion: 0.67
Nodes (3): ModuleTabContent(), ResumenTabContent(), useSavedWidgets()

## Knowledge Gaps
- **518 isolated node(s):** `version`, `allow`, `start-dev.sh script`, `$schema`, `style` (+513 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Navigation Context` to `Dynamic Form Fields`, `Report Builder Metrics`, `Role Based Access`, `Dashboard Area Management`, `Inventory Management Hooks`, `Report Configuration`, `Sidebar Navigation Components`, `Toast Notification System`, `App Configuration Constants`, `Layout Grid Utilities`, `AI Analysis Panel`, `Module Providers`, `Supply Table Components`, `Navigation UI Components`, `Report Version Comparison`, `Commercial Page Headers`, `Form UI Components`, `Inventory Rules Config`, `Authentication Views`, `Weather Chat Widget`, `Carousel UI Components`, `Menubar UI Components`, `Field Difference Dialogs`, `Button and Calendar`, `Chart Configuration`, `Command Palette UI`, `Context Menu UI`, `Dropdown Menu UI`, `Header Design Editor`, `Alert and Avatar`, `Table UI Components`, `Drawer UI Components`, `Breadcrumb Navigation`, `User Profile View`, `OTP Input Components`, `Trend Preview Widgets`, `Accordion UI Components`, `Recent Activity Feed`, `Textarea UI Component`, `Metric Card Component`, `Quick Action Buttons`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **What connects `version`, `allow`, `start-dev.sh script` to the rest of the system?**
  _518 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dynamic Form Fields` be split into smaller, more focused modules?**
  _Cohesion score 0.05257936507936508 - nodes in this community are weakly interconnected._
- **Should `Report Builder Metrics` be split into smaller, more focused modules?**
  _Cohesion score 0.03636363636363636 - nodes in this community are weakly interconnected._
- **Should `External Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Role Based Access` be split into smaller, more focused modules?**
  _Cohesion score 0.05603864734299517 - nodes in this community are weakly interconnected._
- **Should `Dashboard Area Management` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
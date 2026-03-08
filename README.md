# 🚗 Sistema de Produção Automotiva — Next.js 14

Sistema completo de controle de produção para montagem automotiva com **Next.js 14 App Router**, unificando frontend e backend em um único projeto.

## 🗂️ Estrutura do Projeto

```
automotive-nextjs/
├── app/
│   ├── api/                     # API Routes (Route Handlers)
│   │   ├── employees/           # GET, POST /api/employees
│   │   ├── employees/[id]/      # PUT, DELETE /api/employees/:id
│   │   ├── productions/         # GET, POST /api/productions
│   │   ├── dashboard/           # GET /api/dashboard
│   │   ├── ranking/             # GET /api/ranking
│   │   ├── stats/quarterly/     # GET /api/stats/quarterly
│   │   └── reports/monthly/     # GET /api/reports/monthly
│   ├── dashboard/               # Página Dashboard
│   ├── register/                # Página Registrar Montagem
│   ├── ranking/                 # Página Ranking
│   ├── history/                 # Página Histórico
│   ├── employees/               # Página Funcionários
│   ├── settings/                # Página Configurações
│   ├── layout.tsx               # Root Layout
│   ├── page.tsx                 # Redirect → /dashboard
│   └── globals.css              # Estilos globais
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # Sidebar + mobile header
│   │   └── AppProviders.tsx     # Providers + WebSocket boot
│   ├── ui/                      # Componentes base
│   ├── charts/                  # Recharts production chart
│   ├── scanner/                 # ZXing barcode scanner
│   └── dashboard/               # GoalAlert (🎉)
├── lib/
│   ├── prisma.ts                # Prisma singleton
│   ├── shiftUtils.ts            # Lógica de turno
│   ├── utils.ts                 # cn(), áudio, vibração
│   └── wsManager.ts             # WebSocket broadcast
├── stores/
│   └── appStore.ts              # Zustand global store
├── types/
│   └── index.ts                 # TypeScript types
├── prisma/
│   ├── schema.prisma            # Modelos Employee + Production
│   └── seed.ts                  # Seed inicial
└── server.ts                    # Custom HTTP server (WS)
```

## 🚀 Como Rodar

### 1. Pré-requisitos
- Node.js 20+
- Conta no [Supabase](https://supabase.com) (PostgreSQL gratuito)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com sua connection string do Supabase:
```
DATABASE_URL="postgresql://postgres.[ref]:[password]@[host]:5432/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@[host]:5432/postgres"
```

### 4. Configurar banco de dados

```bash
npm run db:push      # Cria as tabelas
npm run db:seed      # Adiciona funcionários de exemplo
```

### 5. Rodar em desenvolvimento

```bash
# Modo padrão Next.js (sem WebSocket real-time)
npm run dev

# OU com WebSocket (servidor customizado)
npx tsx server.ts
```

## 🌐 Deploy

### Vercel (Recomendado para Next.js)

1. Conecte seu repositório no [Vercel](https://vercel.com)
2. Adicione as variáveis de ambiente:
   - `DATABASE_URL` — connection string do Supabase
   - `DIRECT_URL` — mesmo valor
3. Deploy automático!

> ⚠️ **WebSocket no Vercel:** O Vercel usa serverless functions, então o WebSocket customizado não funciona diretamente. Para WebSocket em produção no Vercel, use [Supabase Realtime](https://supabase.com/docs/guides/realtime) ou [Pusher](https://pusher.com/) — o sistema continua funcional sem WS (polling automático a cada 30s).

### Railway (Full WebSocket support)

1. Crie um projeto no [Railway](https://railway.app)
2. Conecte o repositório
3. Configure:
   - **Start command:** `npx tsx server.ts`
   - Adicione as env vars
4. Deploy!

### Render

1. Crie um Web Service no [Render](https://render.com)
2. **Build command:** `npm install && npx prisma generate && npm run build`
3. **Start command:** `npx tsx server.ts`
4. Adicione as env vars

## ⚙️ Scripts

```bash
npm run dev          # Desenvolvimento (Next.js padrão)
npx tsx server.ts    # Desenvolvimento com WebSocket
npm run build        # Build produção
npm run start        # Iniciar produção (sem WS customizado)
npm run db:push      # Aplicar schema no banco
npm run db:seed      # Popular banco com exemplos
npm run db:studio    # Visualizar dados (Prisma Studio)
npm run db:migrate   # Criar migration
```

## 📱 Funcionalidades

| Feature | Descrição |
|---------|-----------|
| 🏭 Dashboard | Meta diária, progresso, gráfico por hora, recentes |
| 🚗 Registrar | Formulário com scanner de código de barras (ZXing) |
| 🏆 Ranking | Pódio + tabela completa em tempo real (WebSocket) |
| 📊 Histórico | Filtros + exportar CSV + relatório mensal |
| 👥 Funcionários | CRUD completo, máx. 20, ativar/desativar |
| ⚙️ Configurações | Status WS, horários de turno, instrução PWA |
| 🎉 Meta batida | Alerta animado com confetti ao atingir 100 carros |
| 📡 Tempo real | WebSocket atualiza ranking e dashboard instantaneamente |
| 📲 PWA | Instalável no celular/tablet como app nativo |

## 🕐 Turno de Trabalho

```
16:48 → início do turno
02:00 → fim do turno normal
04:00 → fim da hora extra
05:00 → reset automático (broadcast via WebSocket)
```

Registros entre 00:00–05:00 pertencem ao turno do dia anterior.

---

Desenvolvido para uso industrial em linha de produção automotiva.
Otimizado para tablets e celulares (telas grandes, sem zoom no iOS).

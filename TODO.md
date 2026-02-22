# Kanux - Sistema SaaS Multi-tenant

## ✅ Status Atual

### Web (Next.js)
- Frontend responsivo em `/src/app/`
- Pages: Login, Tickets, Chats, Admin, Profile
- Integração com Supabase
- Tema: TailwindCSS com cores verde/esmeralda

### Mobile (Expo)
- App em `/mobile/` (Expo SDK 52)
- Screens: Login, Tickets, Chat, Company Select
- Contextos: AuthContext, SyncContext
- Suporte a PWA

### Banco de Dados
- Schema em `/sql/supabase_full_schema.sql`
- Trigger de sincronização: `/sql/sync_triggers.sql`
- Tabelas: companies, departments, user_profiles, company_members, tickets, chats, audit_logs

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

Crie `.env.local` na raiz:
```
env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

Para Mobile, configure em `/mobile/.env`:
```
env
EXPO_PUBLIC_SUPABASE_URL=sua_url_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
```

### 2. Executar no Supabase SQL Editor

Execute o conteúdo de `/sql/sync_triggers.sql` para:
- Criar trigger de sincronização auth.users → user_profiles
- Criar FKs entre tabelas
- Criar funções helper (get_user_companies, get_current_user_profile)

### 3. Iniciar Web
```
bash
npm run dev
# Acesse http://localhost:3000
```

### 4. Iniciar Mobile (Expo)
```
bash
cd mobile
npx expo start
# Escaneie o QR code com Expo Go
```

### 5. Build Android
```
bash
cd mobile
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
# APK em mobile/android/app/build/outputs/apk/debug/
```

## 📋 Estrutura de Arquivos

```
/home/jefferson/kanux/
├── src/                    # Web (Next.js)
│   ├── app/               # Páginas
│   ├── components/       # Componentes reutilizáveis
│   └── lib/              # Configurações (Supabase, etc)
├── mobile/               # Mobile (Expo)
│   ├── app/              # Screens (Expo Router)
│   ├── src/              # Contextos e libs
│   └── android/          # Build Android
├── sql/                  # Scripts SQL
│   ├── supabase_full_schema.sql
│   └── sync_triggers.sql
└── public/               # Arquivos estáticos
```

## 🔧 Problemas Conhecidos

1. **Android SDK** - Precisa configurar ANDROID_HOME para build
2. **Trigger auth.users** - Requer permissões de superuser no Supabase

## 📱 Funcionalidades

- [x] Login/Logout com Supabase Auth
- [x] Multi-empresa (Company Switcher)
- [x] Tickets (CRUD)
- [x] Chats por empresa
- [x] Perfis de usuário
- [x] Painel Admin
- [x] Mobile (Expo)
- [x] PWA (Service Worker)

#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$(pwd)"
TMPDIR="$(mktemp -d)"
ZIPNAME="kanux-scaffold.zip"

echo "Creating scaffold files in temporary directory: $TMPDIR"

after() {
  echo
  echo "Done. ZIP created at: $WORKDIR/$ZIPNAME"
  echo "Extract the ZIP into your repo, review files, then run ./setup_post_files.sh inside the repo to install and commit."
}

write_file() {
  local target="$1"
  shift
  mkdir -p "$(dirname "$target")"
  cat > "$target" <<'EOF'
$*
EOF
}

# We'll write files into $TMPDIR using here-documents

# .gitignore
cat > "$TMPDIR/.gitignore" <<'EOF'
node_modules
.next
/out
/dist
.env
.env.local
.env.*
.vscode
.DS_Store
coverage
EOF

# package.json
cat > "$TMPDIR/package.json" <<'EOF'
{
  "name": "kanux-scaffold",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.28.0",
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.14",
    "eslint": "8.49.0",
    "eslint-config-next": "14.0.0",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.4.2"
  }
}
EOF

# tsconfig.json
cat > "$TMPDIR/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

# next.config.js
cat > "$TMPDIR/next.config.js" <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
};
module.exports = nextConfig;
EOF

# postcss.config.cjs
cat > "$TMPDIR/postcss.config.cjs" <<'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

# tailwind.config.js
cat > "$TMPDIR/tailwind.config.js" <<'EOF'
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
EOF

# .env.example
cat > "$TMPDIR/.env.example" <<'EOF'
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EOF

# README.md
cat > "$TMPDIR/README.md" <<'EOF'
# Kanux scaffold

Next.js (App Router) + TypeScript + Tailwind + Supabase multi-tenant scaffold.

Steps after extracting:
1. Install: npm install
2. Run: npm run dev
3. Add secrets in .env.local or in your hosting provider.

Supabase SQL is in ./sql/supabase_setup.sql
Edge Function in ./supabase/functions/send-welcome/index.ts
EOF

# app/layout.tsx
mkdir -p "$TMPDIR/app"
cat > "$TMPDIR/app/layout.tsx" <<'EOF'
import "./globals.css"
import { ReactNode } from "react"

export const metadata = { title: "Kanux", description: "Kanux - Next + Supabase scaffold" }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
EOF

# app/globals.css
cat > "$TMPDIR/app/globals.css" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #next { height: 100%; }
EOF

# app/page.tsx
cat > "$TMPDIR/app/page.tsx" <<'EOF'
import Link from "next/link"
export default function Page() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold">Bem-vindo ao Kanux</h1>
      <p className="mt-4">Projeto multi-tenant com Supabase.</p>
      <p className="mt-6"><Link href="/dashboard" className="text-blue-600 underline">Ir para dashboard</Link></p>
    </main>
  )
}
EOF

# app/dashboard/page.tsx
mkdir -p "$TMPDIR/app/dashboard"
cat > "$TMPDIR/app/dashboard/page.tsx" <<'EOF'
export default function Dashboard() {
  return (
    <main className="container mx-auto p-8">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-4">Conteúdo do dashboard (placeholder).</p>
    </main>
  )
}
EOF

# components
mkdir -p "$TMPDIR/components"
cat > "$TMPDIR/components/Navbar.tsx" <<'EOF'
"use client";
import Link from "next/link"
export default function Navbar(){
  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto p-4 flex justify-between">
        <div className="font-bold">Kanux</div>
        <div className="space-x-4">
          <Link href="/" className="text-gray-700">Home</Link>
          <Link href="/dashboard" className="text-gray-700">Dashboard</Link>
        </div>
      </div>
    </nav>
  )
}
EOF

cat > "$TMPDIR/components/OrgSelector.tsx" <<'EOF'
"use client";
import { useState } from "react";
export default function OrgSelector({ orgs = [] }: { orgs?: Array<{id:string,name:string}> }) {
  const [selected, setSelected] = useState<string | null>(orgs[0]?.id ?? null);
  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-700">Organização</div>
      <select value={selected ?? ""} onChange={(e)=>setSelected(e.target.value)} className="mt-1 block w-full">
        {orgs.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
      </select>
    </label>
  )
}
EOF

# lib
mkdir -p "$TMPDIR/lib"
cat > "$TMPDIR/lib/supabaseClient.ts" <<'EOF'
import { createClient } from "@supabase/supabase-js"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF

cat > "$TMPDIR/lib/serverSupabase.ts" <<'EOF'
import { createClient } from "@supabase/supabase-js"
export const serverSupabase = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL")
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
EOF

# sql
mkdir -p "$TMPDIR/sql"
cat > "$TMPDIR/sql/supabase_setup.sql" <<'EOF'
-- Multi-tenant schema: organizations, projects, organization_members

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_organization_ids() RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION get_user_organization_ids() FROM anon, authenticated;

CREATE POLICY org_select_for_members ON organizations FOR SELECT TO authenticated USING (id = ANY(get_user_organization_ids()));
CREATE POLICY projects_select_for_orgs ON projects FOR SELECT TO authenticated USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY members_select_self ON organization_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY members_insert_allowed ON organization_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EOF

# supabase function
mkdir -p "$TMPDIR/supabase/functions/send-welcome"
cat > "$TMPDIR/supabase/functions/send-welcome/index.ts" <<'EOF'
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.28.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const userId = body.user_id;
    if (!userId) return new Response(JSON.stringify({ error: 'missing user_id' }), { status: 400 });
    await sb.from('welcome_messages').insert({ user_id: userId, message: 'Bem-vindo!' });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
});
EOF

cat > "$TMPDIR/supabase/functions/send-welcome/README.md" <<'EOF'
Deploy with Supabase CLI:

supabase login
supabase functions deploy send-welcome --project-ref <project-ref>
EOF

# GitHub Actions
mkdir -p "$TMPDIR/.github/workflows"
cat > "$TMPDIR/.github/workflows/ci.yml" <<'EOF'
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
EOF

# helper script to install deps and commit
cat > "$TMPDIR/setup_post_files.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "Committing files..."
git add .
git commit -m "chore: scaffold project" || echo "No changes to commit"

echo "Done. Push to your existing repo with: git push origin main"
EOF
chmod +x "$TMPDIR/setup_post_files.sh"

# pack
( cd "$TMPDIR" && zip -r "$WORKDIR/$ZIPNAME" . >/dev/null )

echo "Created $WORKDIR/$ZIPNAME"
rm -rf "$TMPDIR"
after

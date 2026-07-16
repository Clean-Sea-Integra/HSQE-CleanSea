# HSQE · Clean Sea — INTEGRA

Módulo de gestión HSQE (Health, Safety, Quality, Environment) para Clean Sea,
parte del ecosistema INTEGRA del Grupo Terra Mare / Paraná Logística.

## Stack
- Vite + JavaScript (vanilla) + Chart.js
- Supabase (auth compartida INTEGRA + Postgres + Storage)
- Deploy en Vercel

## Variables de entorno (Vercel → Settings → Environment Variables)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Backend (Supabase)
- Auth compartida con el resto de INTEGRA.
- Tablas: `hsqe_registros`, `hsqe_catalogos`, `hsqe_config` (RLS: auth.uid() IS NOT NULL).
- Bucket privado: **`hsqe-adjuntos-cleansea`** — hay que crearlo en Supabase (Storage → New bucket, privado) para que funcionen los adjuntos.
- Acceso al módulo controlado por `user_roles.modulos` (id `'h
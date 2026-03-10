# SKYOPT — Buscador de Vuelos con AI

Comparador de vuelos potenciado por Claude AI. El usuario busca una ruta, Claude genera opciones realistas y recomienda la mejor. El botón de compra redirige a Kiwi.com via Travelpayouts (afiliado).

## Stack
- Next.js 14 (React)
- Claude API (claude-sonnet-4-5) via route server-side
- Travelpayouts / Kiwi.com affiliate links

## Deploy en Vercel (5 minutos)

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "SKYOPT v1"
git remote add origin https://github.com/TU_USUARIO/skyopt.git
git push -u origin main
```

### 2. Conectar Vercel
1. Ir a vercel.com → New Project
2. Importar el repo de GitHub
3. Vercel detecta Next.js automáticamente

### 3. Variables de entorno en Vercel
En Settings → Environment Variables agregar:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Tu key de console.anthropic.com |
| `NEXT_PUBLIC_AFFILIATE_ID` | Tu partner ID de Travelpayouts |

### 4. Deploy
Click en "Deploy" — listo. Vercel da una URL pública automáticamente (ej: skyopt.vercel.app).

## Variables de entorno locales
```bash
cp .env.local.example .env.local
# Editar .env.local con tus keys
npm run dev
```

## Monetización
- Registrarse en travelpayouts.com
- Suscribirse al programa de Kiwi.com
- Pegar el partner ID en NEXT_PUBLIC_AFFILIATE_ID
- Comisión: ~3% por booking completado (~$13 USD promedio)

## Próximos pasos
- [ ] Activar partner ID de Travelpayouts
- [ ] Integrar precios reales (Sky Scrapper API via RapidAPI)
- [ ] Agregar alertas de precio por email
- [ ] SEO: páginas estáticas por ruta popular (EZE-MIA, EZE-MAD, etc.)

# Push VAPID — quick start CRICRI

## 1. SQL
```bash
psql "$DATABASE_URL" -f supabase/STEP_G_push_subscriptions.sql
```

## 2. Secrets + function
```bash
supabase functions deploy send-push
supabase secrets set \
  VAPID_PUBLIC_KEY="BBvmr6tIC0YWjrN4C6jmEmcIhGB8ho5DfQI_tZ4wa1-sAayKfF8xUqlw-cZKIN19pS9PzyECL6rcNf521pRESBg" \
  VAPID_PRIVATE_KEY="y-c2l1ojJ-Og_72p0F2SZWZblS1XmleoCDQ8_p-sfK8" \
  VAPID_SUBJECT="mailto:voce@seudominio.com"
```

Chave pública já está em `js/config.js`.

## 3. App
1. HTTPS (ou localhost)
2. Login
3. Sininho → **Ativar notificações** → aceitar prompt
4. Pedido de amizade dispara push pro outro usuário (se ele ativou)

## API front
```js
await CricriPush.enable()
await CricriPush.notifyUser(userId, { title: 'Oi', body: 'teste', url: '/index.html' })
CricriPush.vapidKey()
```

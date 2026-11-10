const FIREBASE_PROJECT_ID = 'vap-origin';
const OWNER_EMAIL = 'noahselomon@gmail.com';
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const encoder = new TextEncoder();
let jwksCache;
let jwksExpiresAt = 0;

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store', ...headers } });
}
function fail(message, status = 400) { return json({ error: message }, status); }
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}
async function getJwks() {
  if (jwksCache && Date.now() < jwksExpiresAt) return jwksCache;
  const response = await fetch(FIREBASE_JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) throw new Error('Could not load Firebase public keys.');
  const data = await response.json();
  jwksCache = data.keys || [];
  jwksExpiresAt = Date.now() + 55 * 60 * 1000;
  return jwksCache;
}
async function verifyFirebaseToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = match[1].split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader)));
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    if (claims.aud !== FIREBASE_PROJECT_ID || claims.iss !== FIREBASE_ISSUER) return null;
    if (!claims.sub || typeof claims.sub !== 'string' || claims.sub.length > 128) return null;
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 60) return null;
    if (!claims.email_verified || typeof claims.email !== 'string') return null;
    const jwk = (await getJwks()).find(key => key.kid === header.kid);
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signingInput = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const signature = decodeBase64Url(encodedSignature);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput)) return null;
    return claims;
  } catch {
    return null;
  }
}
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const requestUrl = new URL(request.url);
    return parsed.origin === requestUrl.origin || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch { return false; }
}
function serializeOrder(row) {
  return {
    id: row.id,
    email: row.customer_email,
    name: row.customer_name,
    items: JSON.parse(row.items_json),
    total: row.total_cents / 100,
    status: row.delivery_status === 'delivered' ? 'Delivered' : row.delivery_status === 'canceled' ? 'Canceled' : 'Awaiting confirmation',
    deliveryStatus: row.delivery_status === 'delivered' ? 'Delivered' : row.delivery_status === 'canceled' ? 'Canceled' : 'Pending',
    paymentStatus: row.payment_status === 'paid' ? 'Paid' : 'Unpaid',
    scheduledAt: row.scheduled_at,
    date: row.created_at,
    deliveredAt: row.delivered_at,
    canceledAt: row.canceled_at,
    customerReview: row.customer_review_json ? JSON.parse(row.customer_review_json) : null,
    sellerReview: row.seller_note_json ? JSON.parse(row.seller_note_json) : null
  };
}
async function resolveUser(claims, env) {
  const email = claims.email.toLowerCase();
  let row = await env.vap_origin_db.prepare('SELECT uid, email, display_name, role FROM users WHERE uid = ?').bind(claims.sub).first();
  if (row) return row;
  const invitation = await env.vap_origin_db.prepare('SELECT role FROM staff_invites WHERE email = ?').bind(email).first();
  let role = invitation?.role || 'customer';
  if (email === OWNER_EMAIL) {
    const existingOwner = await env.vap_origin_db.prepare("SELECT uid FROM users WHERE role = 'owner' LIMIT 1").first();
    if (!existingOwner) role = 'owner';
  }
  const displayName = String(claims.name || email.split('@')[0]).slice(0, 100);
  await env.vap_origin_db.prepare('INSERT INTO users (uid, email, display_name, role) VALUES (?, ?, ?, ?)').bind(claims.sub, email, displayName, role).run();
  if (invitation) await env.vap_origin_db.prepare('DELETE FROM staff_invites WHERE email = ?').bind(email).run();
  return await env.vap_origin_db.prepare('SELECT uid, email, display_name, role FROM users WHERE uid = ?').bind(claims.sub).first();
}
async function requireUser(request, env) {
  const claims = await verifyFirebaseToken(request);
  if (!claims) return { response: fail('Connexion vérifiée requise.', 401) };
  const user = await resolveUser(claims, env);
  return { claims, user };
}
function requireRole(user, roles) {
  return roles.includes(user.role);
}
async function readJson(request, maxBytes = 100_000) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('Requête trop volumineuse.');
  const text = await request.text();
  if (encoder.encode(text).byteLength > maxBytes) throw new Error('Requête trop volumineuse.');
  return JSON.parse(text);
}
async function listProducts(env) {
  const { results = [] } = await env.vap_origin_db.prepare('SELECT id,name,category,price_cents,tag,image,description,reviews_json FROM products WHERE active = 1 ORDER BY name').all();
  return results.map(product => ({ id: product.id, name: product.name, category: product.category, price: product.price_cents / 100, tag: product.tag, image: product.image, description: product.description, reviews: JSON.parse(product.reviews_json || '[]').map(({ name, stars, note, date }) => ({ name, stars, note, date })) }));
}
async function api(request, env) {
  if (!sameOrigin(request)) return fail('Origine non autorisée.', 403);
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const method = request.method.toUpperCase();

  if (method === 'GET' && path === 'health') return json({ ok: true, service: 'vap-origin-api' });
  if (method === 'GET' && path === 'products') return json({ products: await listProducts(env) });

  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const { user, claims } = auth;

  if (method === 'GET' && path === 'session') return json({ user: { uid: user.uid, email: user.email, name: user.display_name, role: user.role } });

  const productReviewMatch = path.match(/^products\/([^/]+)\/reviews$/);
  if (productReviewMatch && method === 'POST') {
    if (user.role !== 'customer') return fail('Un compte client est requis pour publier un avis.', 403);
    const productId = decodeURIComponent(productReviewMatch[1]);
    const product = await env.vap_origin_db.prepare('SELECT id,reviews_json FROM products WHERE id=? AND active=1').bind(productId).first();
    if (!product) return fail('Produit introuvable.', 404);
    const { results: orders = [] } = await env.vap_origin_db.prepare("SELECT items_json FROM orders WHERE customer_uid=? AND delivery_status='delivered'").bind(user.uid).all();
    const purchased = orders.some(order => JSON.parse(order.items_json).some(item => item.id === productId));
    if (!purchased) return fail('Un achat livré est nécessaire pour publier un avis vérifié.', 403);
    const body = await readJson(request);
    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return fail('Note invalide.');
    const review = { uid: user.uid, name: user.display_name.split(' ')[0], stars, note: String(body.note || '').trim().slice(0, 700), date: new Date().toISOString() };
    const reviews = JSON.parse(product.reviews_json || '[]').filter(item => item.uid !== user.uid);
    reviews.push(review);
    await env.vap_origin_db.prepare("UPDATE products SET reviews_json=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(JSON.stringify(reviews), productId).run();
    return json({ review: { name: review.name, stars, note: review.note, date: review.date } }, 201);
  }

  if (method === 'GET' && path === 'orders') {
    const query = requireRole(user, ['owner', 'admin', 'seller'])
      ? env.vap_origin_db.prepare('SELECT * FROM orders ORDER BY created_at DESC')
      : env.vap_origin_db.prepare('SELECT * FROM orders WHERE customer_uid = ? ORDER BY created_at DESC').bind(user.uid);
    const { results = [] } = await query.all();
    return json({ orders: results.map(serializeOrder) });
  }

  if (method === 'POST' && path === 'orders') {
    const body = await readJson(request);
    const scheduledAt = new Date(body.scheduledAt || '');
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date() || scheduledAt > new Date(Date.now() + 31 * 86400_000)) return fail('Choisissez un créneau futur valide (moins de 31 jours).');
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return fail('Articles de commande invalides.');
    let customer = user;
    if (user.role !== 'customer') {
      if (!requireRole(user, ['owner', 'admin', 'seller'])) return fail('Seuls les clients et le personnel autorisé peuvent créer une commande.', 403);
      const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
      customer = await env.vap_origin_db.prepare('SELECT uid,email,display_name,role FROM users WHERE email = ? AND role = \'customer\'').bind(customerEmail).first();
      if (!customer) return fail('Le client doit avoir un compte vérifié avant de créer une commande pour lui.', 404);
    }
    const items = [];
    let totalCents = 0;
    for (const requested of body.items) {
      const id = String(requested.id || '').slice(0, 80);
      const quantity = Number(requested.qty);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail('Quantité invalide.');
      const product = await env.vap_origin_db.prepare('SELECT id,name,price_cents FROM products WHERE id = ? AND active = 1').bind(id).first();
      if (!product) return fail('Un produit de la commande est indisponible.', 409);
      items.push({ id: product.id, name: product.name, price: product.price_cents / 100, qty: quantity });
      totalCents += product.price_cents * quantity;
    }
    const id = `VO-${crypto.randomUUID()}`;
    await env.vap_origin_db.prepare('INSERT INTO orders (id,customer_uid,customer_email,customer_name,items_json,total_cents,scheduled_at) VALUES (?,?,?,?,?,?,?)')
      .bind(id, customer.uid, customer.email, user.role === 'customer' ? user.display_name : customer.display_name, JSON.stringify(items), totalCents, scheduledAt.toISOString()).run();
    const row = await env.vap_origin_db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    return json({ order: serializeOrder(row) }, 201);
  }

  const orderMatch = path.match(/^orders\/([^/]+)(?:\/(payment|delivery|cancel|review|seller-note))?$/);
  if (orderMatch) {
    const orderId = decodeURIComponent(orderMatch[1]);
    const action = orderMatch[2] || '';
    const order = await env.vap_origin_db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    if (!order) return fail('Commande introuvable.', 404);
    const staff = requireRole(user, ['owner', 'admin', 'seller']);
    if (!staff && order.customer_uid !== user.uid) return fail('Accès refusé.', 403);
    if (!action && method === 'DELETE') {
      if (!staff) return fail('Accès refusé.', 403);
      await env.vap_origin_db.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run();
      return json({ ok: true });
    }
    if (!action && method === 'PATCH') {
      if (!staff) return fail('Accès refusé.', 403);
      if (order.delivery_status === 'delivered' || order.delivery_status === 'canceled') return fail('Une commande livrée ou annulée ne peut plus être modifiée.', 409);
      const body = await readJson(request);
      const scheduledAt = new Date(body.scheduledAt || '');
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return fail('Choisissez un créneau futur valide.');
      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return fail('Articles de commande invalides.');
      const items = [];
      let totalCents = 0;
      for (const requested of body.items) {
        const quantity = Number(requested.qty);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail('Quantité invalide.');
        const product = await env.vap_origin_db.prepare('SELECT id,name,price_cents FROM products WHERE id=? AND active=1').bind(String(requested.id || '')).first();
        if (!product) return fail('Un produit de la commande est indisponible.', 409);
        items.push({ id: product.id, name: product.name, price: product.price_cents / 100, qty: quantity });
        totalCents += product.price_cents * quantity;
      }
      await env.vap_origin_db.prepare("UPDATE orders SET customer_name=?,items_json=?,total_cents=?,scheduled_at=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?")
        .bind(String(body.name || order.customer_name).trim().slice(0,100), JSON.stringify(items), totalCents, scheduledAt.toISOString(), orderId).run();
      const updated = await env.vap_origin_db.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first();
      return json({ order: serializeOrder(updated) });
    }
    if (method === 'PATCH' && action === 'payment') {
      if (!staff) return fail('Accès refusé.', 403);
      if (order.delivery_status === 'delivered') return fail('Le paiement ne peut plus être modifié après livraison.', 409);
      const body = await readJson(request);
      const payment = body.paymentStatus === 'Paid' ? 'paid' : body.paymentStatus === 'Unpaid' ? 'unpaid' : null;
      if (!payment || order.delivery_status === 'canceled' && payment === 'paid') return fail('Statut de paiement invalide.', 409);
      await env.vap_origin_db.prepare("UPDATE orders SET payment_status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").bind(payment, orderId).run();
    } else if (method === 'PATCH' && action === 'delivery') {
      if (!staff) return fail('Accès refusé.', 403);
      if (order.delivery_status === 'canceled') return fail('Une commande annulée ne peut pas être livrée.', 409);
      const body = await readJson(request);
      const delivery = body.deliveryStatus === 'Pending' ? 'pending' : body.deliveryStatus === 'Delivered' ? 'delivered' : null;
      if (!delivery) return fail('Statut de livraison invalide.', 400);
      if (delivery === 'delivered' && order.payment_status !== 'paid') return fail('Confirmez le paiement avant de valider la livraison.', 409);
      await env.vap_origin_db.prepare("UPDATE orders SET delivery_status = ?, delivered_at = CASE WHEN ? = 'delivered' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").bind(delivery, delivery, orderId).run();
    } else if (method === 'PATCH' && action === 'cancel') {
      if (!staff || order.delivery_status === 'delivered') return fail('Cette commande ne peut pas être annulée.', 409);
      await env.vap_origin_db.prepare("UPDATE orders SET delivery_status='canceled', canceled_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(orderId).run();
    } else if (method === 'PATCH' && action === 'review') {
      if (user.role !== 'customer' || order.customer_uid !== user.uid || order.delivery_status !== 'delivered') return fail('Un avis client est possible après la livraison.', 403);
      const body = await readJson(request);
      const stars = Number(body.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) return fail('Note invalide.');
      const note = String(body.note || '').trim().slice(0, 700);
      await env.vap_origin_db.prepare("UPDATE orders SET customer_review_json=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(JSON.stringify({ stars, note, date: new Date().toISOString() }), orderId).run();
    } else if (method === 'PATCH' && action === 'seller-note') {
      if (!staff) return fail('Accès refusé.', 403);
      const body = await readJson(request);
      const stars = Number(body.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) return fail('Note de fiabilité invalide.');
      const note = String(body.note || '').trim().slice(0, 500);
      await env.vap_origin_db.prepare("UPDATE orders SET seller_note_json=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(JSON.stringify({ stars, note, date: new Date().toISOString() }), orderId).run();
    } else if (method !== 'GET') return fail('Méthode non autorisée.', 405);
    const updated = await env.vap_origin_db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    if (!updated) return json({ ok: true });
    const data = serializeOrder(updated);
    if (!staff) delete data.sellerReview;
    return json({ order: data });
  }

  if (path === 'staff') {
    if (!requireRole(user, ['owner'])) return fail('Accès propriétaire requis.', 403);
    if (method === 'GET') {
      const [registered, invited] = await Promise.all([
        env.vap_origin_db.prepare('SELECT email,display_name,role,created_at FROM users ORDER BY created_at DESC').all(),
        env.vap_origin_db.prepare('SELECT email,role,created_at FROM staff_invites ORDER BY created_at DESC').all()
      ]);
      return json({ accounts: registered.results || [], invites: invited.results || [] });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const email = String(body.email || '').trim().toLowerCase();
      const role = body.role === 'admin' || body.role === 'seller' ? body.role : null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role || email === OWNER_EMAIL) return fail('Adresse e-mail ou rôle invalide.');
      const existing = await env.vap_origin_db.prepare('SELECT uid FROM users WHERE email = ?').bind(email).first();
      if (existing) await env.vap_origin_db.prepare("UPDATE users SET role=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email=?").bind(role, email).run();
      else await env.vap_origin_db.prepare('INSERT INTO staff_invites (email,role,created_by) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,created_by=excluded.created_by').bind(email, role, user.uid).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      const email = decodeURIComponent(url.searchParams.get('email') || '').toLowerCase();
      if (!email || email === OWNER_EMAIL) return fail('Compte propriétaire protégé.', 403);
      await env.vap_origin_db.prepare('DELETE FROM staff_invites WHERE email=?').bind(email).run();
      await env.vap_origin_db.prepare("UPDATE users SET role='customer',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email=? AND role IN ('admin','seller')").bind(email).run();
      return json({ ok: true });
    }
  }

  if (path === 'products' && method === 'POST') {
    if (!requireRole(user, ['owner', 'admin'])) return fail('Accès administration requis.', 403);
    const body = await readJson(request, 2_500_000);
    const id = String(body.id || `prod-${crypto.randomUUID()}`).slice(0, 80);
    const name = String(body.name || '').trim().slice(0, 160);
    const category = String(body.category || '').trim().slice(0, 80);
    const priceCents = Math.round(Number(body.price) * 100);
    if (!name || !category || !Number.isFinite(priceCents) || priceCents < 0 || priceCents > 100_000_000) return fail('Informations produit invalides.');
    await env.vap_origin_db.prepare(`INSERT INTO products (id,name,category,price_cents,tag,image,description,active,updated_at) VALUES (?,?,?,?,?,?,?,1,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,price_cents=excluded.price_cents,tag=excluded.tag,image=excluded.image,description=excluded.description,active=1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
      .bind(id, name, category, priceCents, String(body.tag || '').slice(0, 80), String(body.image || '').slice(0, 2_000_000), String(body.description || '').slice(0, 3000)).run();
    return json({ ok: true, id });
  }
  const productMatch = path.match(/^products\/([^/]+)$/);
  if (productMatch && method === 'DELETE') {
    if (!requireRole(user, ['owner', 'admin'])) return fail('Accès administration requis.', 403);
    await env.vap_origin_db.prepare("UPDATE products SET active=0,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(decodeURIComponent(productMatch[1])).run();
    return json({ ok: true });
  }
  const categoryMatch = path.match(/^categories\/(.+)$/);
  if (categoryMatch && method === 'DELETE') {
    if (!requireRole(user, ['owner', 'admin'])) return fail('Accès administration requis.', 403);
    const category = decodeURIComponent(categoryMatch[1]).slice(0, 80);
    const result = await env.vap_origin_db.prepare('UPDATE products SET active=0,updated_at=strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE category=? AND active=1').bind(category).run();
    return json({ ok: true, removed: result.meta?.changes || 0 });
  }
  return fail('Route inconnue.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env); }
      catch (error) {
        console.error('API error:', error?.message || 'Unknown error');
        return fail('Erreur serveur. Réessayez plus tard.', 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin', 'owner')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS staff_invites (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('seller', 'admin')),
  created_by TEXT NOT NULL REFERENCES users(uid),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  tag TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  reviews_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_uid TEXT NOT NULL REFERENCES users(uid),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  scheduled_at TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'canceled')),
  customer_review_json TEXT,
  seller_note_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  delivered_at TEXT,
  canceled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(delivery_status, payment_status, scheduled_at);

INSERT OR IGNORE INTO products (id, name, category, price_cents, tag, image, description) VALUES
('p1', 'Mug en céramique du dimanche', 'Maison', 2400, 'Meilleure vente', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=85', 'Une tasse en grès façonnée à la main, pour le premier café comme pour le dernier.'),
('p2', 'Miel de fleurs sauvages', 'Épicerie', 1600, 'Nouveauté', 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=800&q=85', 'Un miel doré en petite série, récolté dans les champs de fleurs sauvages locaux.'),
('p3', 'Savon liquide aux agrumes', 'Corps', 1900, '', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=85', 'Un nettoyant doux aux plantes, relevé de bergamote et d’orange.'),
('p4', 'Cuillère en bois d’olivier', 'Maison', 2200, 'Fabriqué à proximité', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=85', 'Une cuillère de cuisine solide au beau veinage, pensée pour servir tous les jours.'),
('p5', 'Sac de marché', 'Quotidien', 2800, '', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=85', 'Un grand sac cabas en toile de coton, pour le marché et les petites sorties.'),
('p6', 'Carnet du jardin', 'Quotidien', 1800, 'Nouveauté', 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=85', 'Un carnet souple pour vos listes, projets, croquis et idées.'),
('p7', 'Chocolat au sel marin', 'Épicerie', 900, '', 'https://images.unsplash.com/photo-1548907040-4d42d72f8c6f?auto=format&fit=crop&w=800&q=85', 'Du chocolat noir, du sel marin croquant et une liste d’ingrédients courte.'),
('p8', 'Torchon en lin', 'Maison', 2100, '', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=85', 'Du lin lavé à carreaux discrets, pour les gestes du quotidien en cuisine.');

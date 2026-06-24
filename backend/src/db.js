import pg from 'pg';
const { Pool } = pg;

let pool = null;
export function dbEnabled() { return !!process.env.DATABASE_URL; }
export function getPool() {
  if (!pool && dbEnabled()) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function initSchema() {
  if (!dbEnabled()) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS credentials (
      token_id      BIGINT PRIMARY KEY,
      holder        TEXT NOT NULL,
      course_id     NUMERIC NOT NULL,
      issuer        TEXT NOT NULL,
      uri           TEXT,
      revoked       BOOLEAN NOT NULL DEFAULT FALSE,
      tx_hash       TEXT,
      block_number  BIGINT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_credentials_holder ON credentials (lower(holder));
  `);
}

export async function upsertIssued(c) {
  if (!dbEnabled()) return;
  await getPool().query(
    `INSERT INTO credentials (token_id, holder, course_id, issuer, uri, tx_hash, block_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (token_id) DO UPDATE SET holder=EXCLUDED.holder, course_id=EXCLUDED.course_id,
       issuer=EXCLUDED.issuer, uri=COALESCE(EXCLUDED.uri, credentials.uri),
       tx_hash=EXCLUDED.tx_hash, block_number=EXCLUDED.block_number`,
    [c.tokenId, c.holder, c.courseId, c.issuer, c.uri ?? null, c.txHash ?? null, c.blockNumber ?? null]
  );
}

export async function markRevoked(tokenId) {
  if (!dbEnabled()) return;
  await getPool().query(`UPDATE credentials SET revoked = TRUE WHERE token_id = $1`, [tokenId]);
}

export async function getByHolder(addr) {
  if (!dbEnabled()) return null;
  const r = await getPool().query(
    `SELECT * FROM credentials WHERE lower(holder) = lower($1) ORDER BY token_id DESC`, [addr]);
  return r.rows;
}

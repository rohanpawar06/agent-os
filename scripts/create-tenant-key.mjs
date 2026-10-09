import { createHash, randomBytes } from "node:crypto";

const tenantId = process.argv[2];
if (!tenantId || !/^[A-Za-z0-9_-]{1,64}$/.test(tenantId)) {
  console.error("Usage: node scripts/create-tenant-key.mjs <tenant-id>");
  process.exit(2);
}

const token = randomBytes(32).toString("base64url");
const sha256 = createHash("sha256").update(token, "utf8").digest("hex");
process.stdout.write(`${JSON.stringify({ tenantId, token, sha256 }, null, 2)}\n`);

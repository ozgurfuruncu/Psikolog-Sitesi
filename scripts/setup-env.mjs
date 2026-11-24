import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env")) {
  const secret = () => randomBytes(32).toString("hex");
  writeFileSync(
    ".env",
    `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/durak\nBETTER_AUTH_URL=http://localhost:3000\nAPP_URL=http://localhost:3000\nBETTER_AUTH_SECRET=${secret()}\nDEMO_MODE=true\nPAYMENT_PROVIDER=mock\nVIDEO_PROVIDER=mock\nEMAIL_PROVIDER=preview\nPRODUCTION_LEGAL_APPROVED=false\nMOCK_WEBHOOK_SECRET=${secret()}\nJOB_SECRET=${secret()}\nPRIVATE_STORAGE_PATH=.local/private\nDEMO_CLIENT_PASSWORD=${secret().slice(0, 20)}\nDEMO_ADMIN_PASSWORD=${secret().slice(0, 20)}\n`,
  );
  console.log("Created ignored .env with unique local secrets. Demo passwords are in this file.");
}
mkdirSync(".local", { recursive: true });

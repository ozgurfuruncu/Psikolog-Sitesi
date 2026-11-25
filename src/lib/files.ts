import { randomUUID, createHmac } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "./db";
import { fail } from "./errors";
import { signaturesEqual } from "./providers/payment";
export function inspectFile(bytes: Uint8Array, mime: string) {
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 8)
    fail("Dosya boyutu 5 MB sınırını aşmamalı.");
  const header = Buffer.from(bytes.subarray(0, 8));
  const valid =
    (mime === "application/pdf" && header.subarray(0, 5).toString() === "%PDF-") ||
    (mime === "image/png" && header.toString("hex") === "89504e470d0a1a0a") ||
    (mime === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff);
  if (!valid) fail("Yalnızca geçerli PDF, PNG ve JPEG dosyaları yüklenebilir.");
  if (
    mime === "application/pdf" &&
    /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA)\b/i.test(
      Buffer.from(bytes).toString("latin1"),
    )
  )
    fail("Etkin içerik barındıran PDF dosyaları kabul edilmez.");
}
const root = () => resolve(process.env.PRIVATE_STORAGE_PATH || ".local/private");
export async function storeFile(file: File, purpose: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  inspectFile(bytes, file.type);
  const key = randomUUID();
  if (process.env.FILE_STORAGE_PROVIDER === "database") {
    return db.privateFile.create({
      data: {
        storageKey: key,
        mimeType: file.type,
        size: bytes.length,
        purpose,
        content: { create: { bytes } },
      },
    });
  }
  await mkdir(root(), { recursive: true });
  await writeFile(resolve(root(), key), bytes, { flag: "wx" });
  try {
    return await db.privateFile.create({
      data: { storageKey: key, mimeType: file.type, size: bytes.length, purpose },
    });
  } catch (error) {
    await unlink(resolve(root(), key));
    throw error;
  }
}
export async function loadFile(id: string) {
  const file = await db.privateFile.findUnique({ where: { id } });
  if (!file) fail("Dosya bulunamadı.", 404);
  if (!/^[0-9a-f-]{36}$/.test(file.storageKey)) fail("Dosya bulunamadı.", 404);
  const content = await db.privateFileContent.findUnique({ where: { fileId: id } });
  return {
    file,
    bytes: content ? Buffer.from(content.bytes) : await readFile(resolve(root(), file.storageKey)),
  };
}
export function signedFileUrl(id: string) {
  const expires = Date.now() + 5 * 60_000;
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update(`${id}:${expires}`)
    .digest("hex");
  return `/api/files/${id}?expires=${expires}&signature=${signature}`;
}
export function checkFileSignature(id: string, url: URL) {
  const expires = Number(url.searchParams.get("expires"));
  if (!Number.isFinite(expires) || expires < Date.now() || expires > Date.now() + 6 * 60_000)
    return false;
  return signaturesEqual(
    url.searchParams.get("signature"),
    createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(`${id}:${expires}`).digest("hex"),
  );
}

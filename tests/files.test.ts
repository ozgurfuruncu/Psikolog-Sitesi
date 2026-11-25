import { afterAll, afterEach, expect, it, vi } from "vitest";
import { db } from "../src/lib/db";
import { storeFile, loadFile } from "../src/lib/files";
afterEach(() => vi.unstubAllEnvs());
afterAll(() => db.$disconnect());
it("persists an upload in PostgreSQL and reads it after disconnect without filesystem storage", async () => {
  vi.stubEnv("FILE_STORAGE_PROVIDER", "database");
  // A valid one-pixel PNG, using the same signature validation as disk uploads.
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5n0AAAAASUVORK5CYII=",
    "base64",
  );
  const file = await storeFile(new File([bytes], "demo.png", { type: "image/png" }), "review-test");
  expect(file).not.toHaveProperty("content");
  await db.$disconnect();
  const restored = await loadFile(file.id);
  expect(Buffer.from(restored.bytes)).toEqual(bytes);
  expect(restored.file.size).toBe(bytes.length);
  await db.privateFile.delete({ where: { id: file.id } });
  expect(await db.privateFileContent.count({ where: { fileId: file.id } })).toBe(0);
});

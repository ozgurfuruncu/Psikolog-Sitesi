import { spawn } from "node:child_process";
import { expect } from "@playwright/test";
export async function verifyRestartedContent() {
  for (let attempt = 0; attempt < 2; attempt++) {
    const server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3102"],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          NEXT_DIST_DIR: ".next-e2e",
          ISOLATED_TEST_MODE: "true",
        },
        stdio: "ignore",
      },
    );
    try {
      await expect
        .poll(
          async () => {
            try {
              return (await fetch("http://127.0.0.1:3102/api/health")).status;
            } catch {
              return 0;
            }
          },
          { timeout: 20000 },
        )
        .toBe(200);
      const homepage = await (await fetch("http://127.0.0.1:3102/")).text();
      expect(homepage).toContain("E2E Kaydedilen Ana Başlık");
      const profile = await (await fetch("http://127.0.0.1:3102/hakkinda")).text();
      expect(profile).toContain("E2E kalıcı biyografi");
      const src = profile.match(/src="(\/api\/files\/[^\"]+)"/);
      expect(src).toBeTruthy();
      const image = await fetch(`http://127.0.0.1:3102${src![1].replaceAll("&amp;", "&")}`);
      expect(image.status).toBe(200);
      expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(8);
    } finally {
      const closed = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await closed;
    }
  }
}

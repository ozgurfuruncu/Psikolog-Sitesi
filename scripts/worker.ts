import "dotenv/config";
import { runJobs } from "../src/lib/jobs";
async function tick() {
  try {
    await runJobs();
    console.log("Background delivery cycle completed.");
  } catch {
    console.error("Background delivery cycle failed; retrying on next tick.");
  }
}
await tick();
setInterval(tick, 60_000);

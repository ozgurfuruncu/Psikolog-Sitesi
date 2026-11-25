import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = async (error) => {
  const { reportServerError } = await import("./lib/monitoring");
  await reportServerError(error, "next");
};

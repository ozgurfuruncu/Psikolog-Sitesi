import { cache } from "react";
import { db } from "./db";

export const getSite = cache(async () =>
  db.siteSettings.upsert({ where: { id: "primary" }, create: { id: "primary" }, update: {} }),
);
export const getProfile = cache(async () =>
  db.psychologistProfile.upsert({
    where: { id: "primary" },
    create: { id: "primary" },
    update: {},
  }),
);

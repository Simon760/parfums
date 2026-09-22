import type { Metadata } from "next";
import { loadDB } from "@/lib/data";
import { ImportWizard } from "./ImportWizard";

export const metadata: Metadata = { title: "Ajouter" };

export default async function AddPage() {
  const db = await loadDB();
  return <ImportWizard db={db} />;
}

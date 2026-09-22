import type { Metadata } from "next";
import { loadDB } from "@/lib/data";
import { LayeringsView } from "./LayeringsView";

export const metadata: Metadata = { title: "Layerings" };

export default async function LayeringsPage() {
  const db = await loadDB();
  return <LayeringsView db={db} />;
}

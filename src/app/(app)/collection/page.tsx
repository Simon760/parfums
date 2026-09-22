import type { Metadata } from "next";
import { loadDB } from "@/lib/data";
import { CollectionView } from "./CollectionView";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionPage() {
  const db = await loadDB();
  return <CollectionView db={db} />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDB } from "@/lib/data";
import { EditPerfume } from "./EditPerfume";

export const metadata: Metadata = { title: "Modifier" };

export default async function EditPage({ params }: PageProps<"/collection/[id]/modifier">) {
  const { id } = await params;
  const db = await loadDB();
  const perfume = db.perfumes.find((p) => p.id === id);
  if (!perfume) notFound();
  return (
    <div className="rise mx-auto max-w-3xl">
      <Link href={`/collection/${id}`} className="mb-4 inline-block text-sm font-medium text-muted hover:text-ink">
        ← {perfume.name}
      </Link>
      <h1 className="title mb-6 text-[40px] md:text-6xl">Modifier la fiche</h1>
      <EditPerfume db={db} perfume={perfume} />
    </div>
  );
}

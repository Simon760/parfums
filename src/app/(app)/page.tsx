import { loadDB } from "@/lib/data";
import { TodayView } from "./TodayView";

export default async function TodayPage() {
  const db = await loadDB();
  return <TodayView db={db} />;
}

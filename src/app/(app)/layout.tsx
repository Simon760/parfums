import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 md:px-8 md:pb-16 md:pt-10">{children}</main>
    </>
  );
}

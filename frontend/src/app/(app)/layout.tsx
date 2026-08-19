import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/data/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const meResult = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <NavBar me={meResult.ok ? meResult.data : null} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

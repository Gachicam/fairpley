import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header session={session} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

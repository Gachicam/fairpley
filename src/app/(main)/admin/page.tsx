import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPendingUsers, getAllUsers } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingUserList } from "@/components/admin/pending-user-list";
import { UserList } from "@/components/admin/user-list";

export default async function AdminPage(): Promise<React.ReactElement> {
  const session = await auth();

  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const [pendingUsers, allUsers] = await Promise.all([getPendingUsers(), getAllUsers()]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">管理者ページ</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">承認待ち ({pendingUsers.length})</TabsTrigger>
          <TabsTrigger value="all">全ユーザー ({allUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>承認待ちユーザー</CardTitle>
              <CardDescription>新規登録ユーザーを承認または拒否してください</CardDescription>
            </CardHeader>
            <CardContent>
              <PendingUserList users={pendingUsers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>全ユーザー</CardTitle>
              <CardDescription>ユーザーの権限を管理できます</CardDescription>
            </CardHeader>
            <CardContent>
              <UserList users={allUsers} currentUserId={session.user.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

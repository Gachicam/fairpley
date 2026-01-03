"use client";

import { useState } from "react";
import { updateUserRole } from "@/actions/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@prisma/client";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: Date;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
}

const roleLabels: Record<UserRole, string> = {
  PENDING: "承認待ち",
  MEMBER: "メンバー",
  ADMIN: "管理者",
};

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  MEMBER: "secondary",
  ADMIN: "default",
};

export function UserList({ users, currentUserId }: UserListProps): React.ReactElement {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, role: UserRole): Promise<void> => {
    setProcessingId(userId);
    try {
      await updateUserRole(userId, role);
    } catch (error) {
      console.error("Failed to update user role:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (user: User): string => {
    const name = user.name ?? user.email;
    return name.substring(0, 2).toUpperCase();
  };

  if (users.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">ユーザーがいません</p>;
  }

  return (
    <div className="divide-y">
      {users.map((user) => {
        const isCurrentUser = user.id === currentUserId;
        const isProcessing = processingId === user.id;

        return (
          <div key={user.id} className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
                <AvatarFallback>{getInitials(user)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{user.name ?? "名前未設定"}</p>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      あなた
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isCurrentUser ? (
                <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
              ) : (
                <Select
                  defaultValue={user.role}
                  onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">{roleLabels.PENDING}</SelectItem>
                    <SelectItem value="MEMBER">{roleLabels.MEMBER}</SelectItem>
                    <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

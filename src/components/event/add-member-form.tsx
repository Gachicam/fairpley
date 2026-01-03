"use client";

import { useState, useActionState } from "react";
import { addMember } from "@/actions/member";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddMemberFormProps {
  eventId: string;
}

interface FormState {
  error?: Record<string, string[]>;
}

export function AddMemberForm({ eventId }: AddMemberFormProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const result = await addMember(formData);
      if (!result.error) {
        setIsOpen(false);
      }
      return result;
    },
    {}
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          {isOpen ? "キャンセル" : "+ 参加者を追加"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" placeholder="example@gmail.com" required />
            {state.error?.email && <p className="text-sm text-red-500">{state.error.email[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム（任意）</Label>
            <Input id="nickname" name="nickname" placeholder="表示名を設定" maxLength={50} />
            {state.error?.nickname && (
              <p className="text-sm text-red-500">{state.error.nickname[0]}</p>
            )}
          </div>

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "追加中..." : "追加"}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}

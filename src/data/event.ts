import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// 型定義
export type EventWithDetails = Prisma.EventGetPayload<{
  include: {
    members: {
      include: {
        user: true;
      };
    };
    _count: {
      select: {
        payments: true;
      };
    };
  };
}>;

export type EventWithFullDetails = Prisma.EventGetPayload<{
  include: {
    owner: true;
    members: {
      include: {
        user: true;
        vehicles: true;
      };
    };
    payments: {
      include: {
        payer: true;
        beneficiaries: true;
      };
    };
  };
}>;

export type PaymentWithDetails = Prisma.PaymentGetPayload<{
  include: {
    payer: true;
    beneficiaries: {
      include: {
        member: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

/**
 * 自分が参加しているイベント一覧を取得
 */
export async function getMyEvents(): Promise<EventWithDetails[]> {
  const session = await auth();
  if (!session) {
    return [];
  }

  return prisma.event.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      _count: {
        select: { payments: true },
      },
    },
    orderBy: { startDate: "desc" },
  });
}

/**
 * イベント詳細を取得
 * 参加者のみ閲覧可能
 */
export async function getEventById(eventId: string): Promise<EventWithFullDetails | null> {
  const session = await auth();
  if (!session) {
    return null;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      owner: true,
      members: {
        include: {
          user: true,
          vehicles: true,
        },
      },
      payments: {
        include: {
          payer: true,
          beneficiaries: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) {
    return null;
  }

  // アクセス権チェック（参加者のみ閲覧可能）
  const isMember = event.members.some((m) => m.userId === session.user.id);

  if (!isMember) {
    return null;
  }

  return event;
}

/**
 * イベントの支払い一覧を取得
 */
export async function getEventPayments(eventId: string): Promise<PaymentWithDetails[] | null> {
  const session = await auth();
  if (!session) {
    return null;
  }

  // アクセス権チェック
  const isMember = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id },
    },
  });

  if (!isMember) {
    return null;
  }

  return prisma.payment.findMany({
    where: { eventId },
    include: {
      payer: true,
      beneficiaries: {
        include: { member: { include: { user: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 単一の支払いを取得
 */
export async function getPaymentById(paymentId: string): Promise<PaymentWithDetails | null> {
  const session = await auth();
  if (!session) {
    return null;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      payer: true,
      beneficiaries: {
        include: { member: { include: { user: true } } },
      },
    },
  });

  if (!payment) {
    return null;
  }

  // アクセス権チェック
  const isMember = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: { eventId: payment.eventId, userId: session.user.id },
    },
  });

  if (!isMember) {
    return null;
  }

  return payment;
}

export type VehicleWithOwner = Prisma.VehicleGetPayload<{
  include: {
    owner: {
      include: {
        user: true;
      };
    };
  };
}>;

/**
 * イベントに関連する車両を取得
 */
export async function getEventVehicles(eventId: string): Promise<VehicleWithOwner[]> {
  const session = await auth();
  if (!session) {
    return [];
  }

  // アクセス権チェック
  const isMember = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id },
    },
  });

  if (!isMember) {
    return [];
  }

  // イベントメンバーが所有する車両を取得
  const memberIds = await prisma.eventMember.findMany({
    where: { eventId },
    select: { id: true },
  });

  return prisma.vehicle.findMany({
    where: {
      ownerId: { in: memberIds.map((m) => m.id) },
    },
    include: {
      owner: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

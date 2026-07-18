import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";
import { PLANS } from "./constants";
import type { Plan } from "@/types/plans";

const getCurrentPlan = async (): Promise<Plan> => {
  const { has } = await auth();
  if (has({ plan: "pro" })) return "pro";
  if (has({ plan: "starter" })) return "starter";
  return "free";
};

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) return null;

  try {
    const currentPlan = await getCurrentPlan();

    // Upsert ensures user record always exists
    const record = await db.user.upsert({
      where: { email: user.emailAddresses[0].emailAddress },
      update: {
        clerkId: user.id,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        imageUrl: user.imageUrl ?? "",
        plan: currentPlan,
      },
      create: {
        clerkId: user.id,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        email: user.emailAddresses[0].emailAddress,
        imageUrl: user.imageUrl ?? "",
        credits: PLANS.free.credits,
        plan: "free",
      },
    });

    // Handle credit logic if plan changed
    if (record.plan !== currentPlan) {
      const existingPlanCredits = PLANS[record.plan as Plan]?.credits ?? 0;
      const newPlanCredits = PLANS[currentPlan].credits;
      const creditDelta = newPlanCredits - existingPlanCredits;

      if (creditDelta > 0) {
        // Upgrade → add difference
        await db.user.update({
          where: { email: record.email },
          data: {
            plan: currentPlan,
            credits: record.credits + creditDelta,
          },
        });
      } else {
        // Downgrade → reset to baseline
        await db.user.update({
          where: { email: record.email },
          data: {
            plan: currentPlan,
            credits: newPlanCredits,
          },
        });
      }
    }

    return await db.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });
  } catch (error) {
    console.error("checkUser error:", error);
    return null;
  }
};

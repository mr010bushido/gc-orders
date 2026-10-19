import { redirect } from "next/navigation";
import { requireOwner } from "../../lib/auth/require-owner";

export default async function OwnerHome() {
  await requireOwner();
  redirect("/owner/orders");
}

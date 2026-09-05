"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { updatePermissions } from "@/lib/store";

export async function updateAccountPermissionsAction(formData: FormData) {
  await requireSuperAdmin();

  const code = String(formData.get("code") || "").trim();
  if (!code) redirect("/super-admin");

  await updatePermissions(code, {
    permissions: {
      ambassador: formData.get("perm_ambassador") === "on",
      vendor: formData.get("perm_vendor") === "on",
      music: formData.get("perm_music") === "on",
      ssbd: formData.get("perm_ssbd") === "on",
      eventsAdmin: formData.get("perm_events_admin") === "on",
      eventSales: formData.get("perm_event_sales") === "on",
    },
    isSuperAdmin: formData.get("is_super_admin") === "on",
    vendorSlug: String(formData.get("vendor_slug") || "").trim(),
  });

  redirect(`/super-admin/${code}?saved=1`);
}

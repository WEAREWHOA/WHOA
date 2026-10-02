"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getByCode, updatePermissions } from "@/lib/store";
import { sendAmbassadorApprovedEmail } from "@/lib/email";

export async function updateAccountPermissionsAction(formData: FormData) {
  await requireSuperAdmin();

  const code = String(formData.get("code") || "").trim();
  if (!code) redirect("/super-admin");

  const before = await getByCode(code);
  const ambassador = formData.get("perm_ambassador") === "on";

  await updatePermissions(code, {
    permissions: {
      ambassador,
      vendor: formData.get("perm_vendor") === "on",
      music: formData.get("perm_music") === "on",
      ssbd: formData.get("perm_ssbd") === "on",
      eventsAdmin: formData.get("perm_events_admin") === "on",
      eventSales: formData.get("perm_event_sales") === "on",
      art: formData.get("perm_art") === "on",
      artAdmin: formData.get("perm_art_admin") === "on",
      rsvpAdmin: formData.get("perm_rsvp_admin") === "on",
      rolodex: formData.get("perm_rolodex") === "on",
      analytics: formData.get("perm_analytics") === "on",
      baAdmin: formData.get("perm_ba_admin") === "on",
      customerAdmin: formData.get("perm_customer_admin") === "on",
      newsletter: formData.get("perm_newsletter") === "on",
    },
    isSuperAdmin: formData.get("is_super_admin") === "on",
    vendorSlug: String(formData.get("vendor_slug") || "").trim(),
    squareCustomerId: String(formData.get("square_customer_id") || "").trim(),
  });

  // Switching ambassador on here is an approval too — tell them, same as
  // the Approve link in the application email. Best-effort.
  if (ambassador && before && !before.permissions.ambassador) {
    try {
      await sendAmbassadorApprovedEmail(before);
    } catch (err) {
      console.error("sendAmbassadorApprovedEmail failed:", err);
    }
  }

  redirect(`/super-admin/${code}?saved=1`);
}

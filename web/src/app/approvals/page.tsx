import { Approvals } from "@/components/Approvals";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/i18n";

export const metadata = { title: "Device Approvals · OpenShell on OpenShift" };
export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const lang = await getLang();
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-mut)]">{tr(lang, "Operator · human-in-the-loop control", "Opérateur · contrôle human-in-the-loop")}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-fg)]">Approvals</h1>
      {lang === "fr" ? (
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-fg-mut)]">
          Deux files de demandes, et c&apos;est vous qui décidez. <strong>Demandes d&apos;accès</strong> : lorsque l&apos;agent se voit refuser l&apos;accès à une API ou à un site web, la gateway propose une allow-rule. Approuvez-la pour l&apos;ajouter à la policy d&apos;egress active, ou refusez-la. <strong>Approbations d&apos;appareils</strong> : lorsqu&apos;un navigateur ou une CLI demande à être appairé avec la Control UI de l&apos;agent, vous acceptez ou refusez la demande ici.
        </p>
      ) : (
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-fg-mut)]">
          Two inboxes, both gated by you. <strong>Access requests</strong>: when the agent is denied reaching an API or website, the gateway proposes an allow-rule — approve to merge it into the live egress policy, deny to reject. <strong>Device approvals</strong>: when a browser or CLI asks to pair with the agent&apos;s Control UI, approve or deny it here.
        </p>
      )}
      <Approvals />
    </main>
  );
}

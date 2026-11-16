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
          Deux boîtes de réception, toutes deux sous votre contrôle. <strong>Demandes d&apos;accès</strong> : quand l&apos;agent se voit refuser l&apos;accès à une API ou à un site web, la gateway propose une allow-rule. Approuvez pour la fusionner dans la policy egress active, refusez pour la rejeter. <strong>Approbations d&apos;appareils</strong> : quand un navigateur ou un CLI demande à s&apos;appairer avec la Control UI de l&apos;agent, approuvez-le ou refusez-le ici.
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

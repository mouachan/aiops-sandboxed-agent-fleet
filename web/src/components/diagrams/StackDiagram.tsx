"use client";
import { DIAGRAM as C } from "./palette";
import { useT } from "@/lib/lang-client";

// The full workshop stack, top to bottom — pure inline SVG, scales via viewBox.
const W = 880;
const H = 480;
const Layer = ({ y, h, fill, stroke, n, title, sub, badge, badgeColor }: {
  y: number; h: number; fill: string; stroke: string; n: number; title: string; sub: string; badge?: string; badgeColor?: string;
}) => {
  const x = 70, w = W - 140;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <circle cx={x + 26} cy={y + h / 2} r={13} fill={stroke} stroke="#fff" strokeWidth={1.7} />
      <text x={x + 26} y={y + h / 2 + 4.6} fontSize={13} fill="#fff" textAnchor="middle" fontWeight={700}>{n}</text>
      <text x={x + 52} y={y + (badge ? 25 : h / 2 - 2)} fontSize={15} fill={C.ink} fontWeight={700}>{title}</text>
      <text x={x + 52} y={y + (badge ? 44 : h / 2 + 16)} fontSize={11.5} fill={C.sub}>{sub}</text>
      {badge && (
        <g>
          <rect x={x + w - 150} y={y + h / 2 - 11} width={132} height={22} rx={11} fill={`${badgeColor}1c`} stroke={badgeColor} strokeWidth={1} />
          <text x={x + w - 84} y={y + h / 2 + 4} fontSize={11} fill={badgeColor} textAnchor="middle" fontWeight={700}>{badge}</text>
        </g>
      )}
    </g>
  );
};
const Arrow = ({ y }: { y: number }) => <path d={`M${W / 2},${y} L${W / 2},${y + 16}`} stroke={C.ink} strokeWidth={2} markerEnd="url(#sd_ar)" />;

export function StackDiagram() {
  const t = useT();

  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-[var(--color-line)]">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" fontFamily={C.font} role="img" aria-label={t("Workshop architecture stack", "Architecture de l'atelier, couche par couche")}>
        <defs><marker id="sd_ar" markerWidth="10" markerHeight="10" refX="7" refY="3.2" orient="auto"><path d="M0,0 L8,3.2 L0,6.4 Z" fill={C.ink} /></marker></defs>
        <rect x={0} y={0} width={W} height={H} fill={C.bg} />
        <Layer y={28} h={68} fill={C.redTint} stroke={C.redhat} n={1} title={t("OpenShift cluster", "Cluster OpenShift")} sub={t("Helm-deployed · OpenShift APIs & oc · Routes for external access", "déployé par Helm · API OpenShift et oc · Routes pour l'accès externe")} badge="Red Hat" badgeColor={C.redhat} />
        <Arrow y={96} />
        <Layer y={112} h={68} fill={C.lav} stroke={C.auth} n={2} title={t("OpenShell gateway", "Gateway OpenShell")} sub={t("sandbox control plane · watches agent-sandbox CRD", "control plane des sandboxes · surveille le CRD agent-sandbox")} />
        <Arrow y={180} />
        <Layer y={196} h={76} fill={C.greenTint} stroke={C.nvidia} n={3} title={t("OpenClaw sandbox — “Shifty” 🦞", "Sandbox OpenClaw — « Shifty » 🦞")} sub={t("agent + control UI (sandbox-internal :30789) · password auth · device pairing", "agent + Control UI (port 30789, interne à la sandbox) · mot de passe · appairage des appareils")} />
        <Arrow y={272} />
        <Layer y={288} h={62} fill={C.data} stroke={C.green} n={4} title={t("Model endpoint (OpenAI-compatible)", "Endpoint du modèle (compatible OpenAI)")} sub={t("here: nemotron via OpenShift AI Models-as-a-Service — or a remote API", "ici, nemotron servi par OpenShift AI Models-as-a-Service, ou une API distante")} />
        <rect x={70} y={370} width={W - 140} height={78} rx={12} fill={C.white} stroke={C.border} strokeWidth={1.4} strokeDasharray="6 4" />
        <text x={W / 2} y={392} fontSize={12.5} fill={C.ink} textAnchor="middle" fontWeight={700}>{t("How you reach it (OpenShift Routes)", "Points d'accès (Routes OpenShift)")}</text>
        <g fontSize={11} fill={C.sub} textAnchor="middle">
          <text x={210} y={418} fontWeight={700} fill={C.ink}>Workshop + shell</text><text x={210} y={435}>Route (:3000)</text>
          <text x={440} y={418} fontWeight={700} fill={C.ink}>{t("OpenClaw UI", "Interface OpenClaw")}</text><text x={440} y={435}>{t("Route (sandbox-internal :30789)", "Route (port 30789 de la sandbox)")}</text>
          <text x={670} y={418} fontWeight={700} fill={C.ink}>{t("OpenShift console", "Console OpenShift")}</text><text x={670} y={435}>Route /console</text>
        </g>
      </svg>
    </figure>
  );
}

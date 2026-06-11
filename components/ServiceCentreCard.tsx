"use client";

import { getServiceCentre, ServiceCentre } from "@/lib/service-centres";
import { Phone, MessageCircle, ExternalLink, Clock } from "lucide-react";

interface Props {
  brand: string;
  compact?: boolean; // inline chip vs. full card
}

export default function ServiceCentreCard({ brand, compact = false }: Props) {
  const sc: ServiceCentre | null = getServiceCentre(brand);

  if (!sc) {
    // Fallback to national consumer helpline
    return (
      <div className="service-centre-card service-centre-card--fallback">
        <div className="service-centre-card__header">
          <Phone size={16} />
          <span>National Consumer Helpline</span>
        </div>
        <a href="tel:1800114000" className="service-centre-card__cta service-centre-card__cta--primary">
          <Phone size={16} />
          1800-11-4000 (Free)
        </a>
        <span className="service-centre-card__hours">Mon–Sat 9am–5pm</span>
      </div>
    );
  }

  if (compact) {
    return (
      <a
        href={`tel:${sc.toll_free.replace(/[^\d]/g, "")}`}
        className="service-centre-chip"
        aria-label={`Call ${sc.brand} support: ${sc.toll_free}`}
      >
        <Phone size={13} />
        {sc.toll_free}
      </a>
    );
  }

  return (
    <div className="service-centre-card">
      <div className="service-centre-card__header">
        <Phone size={15} />
        <span>{sc.brand} Customer Care</span>
      </div>

      <div className="service-centre-card__actions">
        {/* Primary: one-tap call */}
        <a
          href={`tel:${sc.toll_free.replace(/[^\d]/g, "")}`}
          className="service-centre-card__cta service-centre-card__cta--primary"
          aria-label={`Call ${sc.brand} support`}
        >
          <Phone size={16} />
          {sc.toll_free}
        </a>

        {/* WhatsApp shortcut */}
        {sc.whatsapp && (
          <a
            href={`https://wa.me/${sc.whatsapp.replace(/[^\d]/g, "")}?text=Hi%2C%20I%20need%20warranty%20support`}
            target="_blank"
            rel="noopener noreferrer"
            className="service-centre-card__cta service-centre-card__cta--whatsapp"
            aria-label={`WhatsApp ${sc.brand} support`}
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        )}

        {/* Portal link */}
        {sc.portal && (
          <a
            href={sc.portal}
            target="_blank"
            rel="noopener noreferrer"
            className="service-centre-card__cta service-centre-card__cta--ghost"
            aria-label={`${sc.brand} service portal`}
          >
            <ExternalLink size={14} />
            Portal
          </a>
        )}
      </div>

      <div className="service-centre-card__meta">
        <Clock size={12} />
        <span>{sc.hours}</span>
        {sc.languages.length > 0 && (
          <span className="service-centre-card__langs">
            · {sc.languages.slice(0, 3).join(", ")}{sc.languages.length > 3 ? " +more" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

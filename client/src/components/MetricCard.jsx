import React from 'react';

export default function MetricCard({
  title,
  titleHi,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'register',
  isHindi = false,
}) {
  const colorMap = {
    register: 'border-register-200 bg-white text-register-800',
    emerald: 'border-emerald-200 bg-white text-emerald-800',
    amber: 'border-amber-200 bg-white text-amber-800',
    saffron: 'border-saffron-300 bg-white text-saffron-700',
    blue: 'border-blue-200 bg-white text-blue-800',
  };

  const iconBgMap = {
    register: 'bg-register-50 text-register-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    saffron: 'bg-saffron-50 text-saffron-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-md border p-5 shadow-card transition-all hover:shadow-md ${
        colorMap[color] || colorMap.register
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            {isHindi && titleHi ? titleHi : title}
          </p>
          <p className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink">
            {value !== undefined && value !== null ? value : '—'}
          </p>
        </div>
        {Icon && (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg border border-paper-line ${
              iconBgMap[color] || iconBgMap.register
            }`}
          >
            <Icon size={22} strokeWidth={2} />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between border-t border-paper-line/80 pt-2.5 text-xs text-ink-soft">
          <span>{subtitle}</span>
          {trend && <span className="font-medium text-emerald-700">{trend}</span>}
        </div>
      )}
    </div>
  );
}

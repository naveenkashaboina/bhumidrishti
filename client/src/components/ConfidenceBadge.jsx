import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export default function ConfidenceBadge({ confidence = 0, size = 'sm', showIcon = true }) {
  const score = Math.round(Number(confidence) || 0);

  let colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  let Icon = AlertCircle;
  let label = 'Low';

  if (score >= 80) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    Icon = CheckCircle2;
    label = 'High';
  } else if (score >= 60) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    Icon = AlertTriangle;
    label = 'Medium';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-mono tracking-tight font-medium ${colorClasses} ${sizeClasses}`}
      title={`Confidence Score: ${score}% (${label})`}
    >
      {showIcon && <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2} />}
      <span>{score}%</span>
    </span>
  );
}

import React from 'react';

const STATUS_CONFIG = {
  PUBLISHED: {
    label: 'Published',
    labelHi: 'प्रकाशित',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  VALIDATED: {
    label: 'Validated',
    labelHi: 'सत्यापित',
    classes: 'bg-blue-50 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
  },
  NEEDS_VERIFICATION: {
    label: 'Needs Verification',
    labelHi: 'जाँच आवश्यक',
    classes: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    labelHi: 'स्वीकृति प्रतीक्षित',
    classes: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dot: 'bg-indigo-500',
  },
  EXTRACTED: {
    label: 'Extracted',
    labelHi: 'निष्कर्षित',
    classes: 'bg-slate-50 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  },
  REJECTED: {
    label: 'Rejected',
    labelHi: 'अस्वीकृत',
    classes: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-500',
  },
  PROCESSING: {
    label: 'Processing',
    labelHi: 'प्रक्रिया जारी',
    classes: 'bg-sky-50 text-sky-800 border-sky-300',
    dot: 'bg-sky-500 animate-pulse',
  },
  UPLOADED: {
    label: 'Uploaded',
    labelHi: 'अपलोड किया',
    classes: 'bg-slate-50 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  },
  FAILED: {
    label: 'Failed',
    labelHi: 'विफल',
    classes: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-600',
  },
};

export default function StatusBadge({ status, size = 'sm', isHindi = false }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    labelHi: status || 'अज्ञात',
    classes: 'bg-slate-50 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.classes} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{isHindi ? config.labelHi : config.label}</span>
    </span>
  );
}

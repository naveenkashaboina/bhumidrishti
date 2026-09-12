import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  FileCheck,
  Globe,
  MapPin,
  Calendar,
  Layers,
  User,
  Share2,
  ExternalLink,
} from 'lucide-react';

import { recordsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfidenceBadge from '../components/ConfidenceBadge';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [record, setRecord] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchRecordData = async () => {
    try {
      setLoading(true);
      setError('');
      const [recRes, auditRes] = await Promise.all([
        recordsApi.getRecordById(id),
        recordsApi.getRecordAudit(id),
      ]);

      if (recRes.success) setRecord(recRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.error('Failed to load record details:', err);
      setError(err.message || 'Failed to fetch record from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordData();
  }, [id]);

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this validated record to the public open registry?')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await recordsApi.publishRecord(id);
      if (res.success) {
        setSuccessMessage('Land record has been successfully published to the Open Cadastral Registry!');
        setRecord(res.data);
      }
    } catch (err) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-ink-soft">
        Loading cadastral record details…
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8">
        <div className="rounded border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h3 className="font-serif text-lg font-bold">Record Not Found</h3>
          <p className="mt-1 text-sm">{error || 'Unable to retrieve the requested record.'}</p>
          <Link
            to="/records"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-register-700 underline"
          >
            <ArrowLeft size={14} /> Back to Records List
          </Link>
        </div>
      </div>
    );
  }

  const primaryOwner = record.landownerDetails?.[0];
  const canPublish =
    record.status === 'VALIDATED' &&
    [ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-line pb-4 md:flex-row md:items-center">
        <div>
          <Link
            to="/records"
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-register-700"
          >
            <ArrowLeft size={14} />
            <span>Back to Records List</span>
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
              Survey No: {record.surveyNumber}
            </h1>
            <StatusBadge status={record.status} size="md" isHindi={isHi} />
            <ConfidenceBadge confidence={record.confidence?.overall || 0} size="md" />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-faint">
            Record ID: {record._id} · Version: {record.version} · Registered:{' '}
            {record.registrationInfo?.date || '—'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPublish && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-emerald-800 disabled:opacity-50"
            >
              <Globe size={14} />
              Publish to Open Registry
            </button>
          )}

          {record.status === 'NEEDS_VERIFICATION' && (
            <Link
              to="/verification-workspace"
              className="flex items-center gap-1.5 rounded bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-amber-700"
            >
              <ShieldCheck size={14} />
              Verify in Workspace
            </Link>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Core Cadastral Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Land Parcel Information */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-serif text-base font-bold text-ink">
              <Layers size={18} className="text-register-600" />
              <span>Cadastral Parcel Details / भूखंड विवरण</span>
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 sm:text-sm">
              <div>
                <span className="text-ink-soft">Khasra Number:</span>
                <p className="mt-0.5 font-mono font-semibold text-ink">{record.khasraNumber || '—'}</p>
              </div>
              <div>
                <span className="text-ink-soft">Khata Number:</span>
                <p className="mt-0.5 font-mono font-semibold text-ink">{record.khataNumber || '—'}</p>
              </div>
              <div>
                <span className="text-ink-soft">Plot Area:</span>
                <p className="mt-0.5 font-mono font-semibold text-ink">
                  {record.plotArea?.value} {record.plotArea?.unit}
                </p>
              </div>
              <div>
                <span className="text-ink-soft">Land Classification:</span>
                <p className="mt-0.5 font-semibold text-ink">
                  {record.landClassification?.replace(/_/g, ' ') || '—'}
                </p>
              </div>
              <div>
                <span className="text-ink-soft">Ownership Category:</span>
                <p className="mt-0.5 font-semibold text-ink">
                  {record.ownershipDetails?.type?.replace(/_/g, ' ') || 'INDIVIDUAL'}
                </p>
              </div>
              <div>
                <span className="text-ink-soft">Registration Number:</span>
                <p className="mt-0.5 font-mono font-semibold text-ink">
                  {record.registrationInfo?.registrationNumber || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Registered Landowners */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-serif text-base font-bold text-ink">
              <User size={18} className="text-register-600" />
              <span>Registered Landowner(s) / काश्तकार विवरण</span>
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-paper-line bg-paper text-xs uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Owner Name</th>
                    <th className="px-3 py-2 font-semibold">Guardian / Relation</th>
                    <th className="px-3 py-2 font-semibold">Share Ratio</th>
                    <th className="px-3 py-2 font-semibold">Aadhaar Vault</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-line">
                  {(record.landownerDetails || []).map((owner, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2.5 font-medium text-ink">{owner.name || '—'}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{owner.guardianName || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-ink">{owner.share || '1/1'}</td>
                      <td className="px-3 py-2.5 text-xs text-ink-faint">
                        {owner.aadhaarHash ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={12} /> Masked & Linked
                          </span>
                        ) : (
                          'Not seeded'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Mutation Records */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-serif text-base font-bold text-ink">
              <History size={18} className="text-register-600" />
              <span>Mutation History (दाखिल ख़ारिज)</span>
            </h2>

            {record.mutationRecords && record.mutationRecords.length > 0 ? (
              <div className="mt-3 divide-y divide-paper-line">
                {record.mutationRecords.map((mut, idx) => (
                  <div key={idx} className="py-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between font-medium text-ink">
                      <span className="font-mono text-register-700">{mut.mutationNumber}</span>
                      <span className="text-xs text-ink-soft">{mut.date || '—'}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{mut.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-faint">No mutation orders recorded for this parcel.</p>
            )}
          </div>
        </div>

        {/* Right Column: Cross-Checks & Audit Trail */}
        <div className="space-y-6">
          {/* Location Card */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold text-ink">
              <MapPin size={16} className="text-register-600" />
              <span>Revenue Jurisdiction</span>
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between border-b border-paper-line/60 pb-1.5">
                <span className="text-ink-soft">Village:</span>
                <span className="font-semibold text-ink">{record.location?.village || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-paper-line/60 pb-1.5">
                <span className="text-ink-soft">Tehsil:</span>
                <span className="font-semibold text-ink">{record.location?.tehsil || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-paper-line/60 pb-1.5">
                <span className="text-ink-soft">District:</span>
                <span className="font-semibold text-ink">{record.location?.district || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">State:</span>
                <span className="font-semibold text-ink">{record.location?.state || '—'}</span>
              </div>
            </div>
          </div>

          {/* Cross-Database Checks */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold text-ink">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Cross-Registry Verification</span>
            </h3>

            <div className="mt-3 space-y-3">
              <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-800">
                  <span>State LRMS Registry</span>
                  <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px]">MATCHED</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-ink-soft">
                  Ref: {record.crossCheck?.lrms?.referenceId || 'LRMS-AUTO'}
                </p>
              </div>

              <div className="rounded border border-blue-200 bg-blue-50/50 p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-800">
                  <span>Central DILRMP (ULPIN)</span>
                  <span className="rounded bg-blue-200/70 px-1.5 py-0.5 text-[10px]">MATCHED</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-ink-soft">
                  ULPIN: {record.crossCheck?.dilrmp?.referenceId || 'ULPIN-PROV'}
                </p>
              </div>
            </div>
          </div>

          {/* Field Confidence Breakdown */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h3 className="font-serif text-sm font-bold text-ink">Field Extraction Confidence</h3>
            <div className="mt-3 space-y-2 text-xs">
              {record.confidence?.fields &&
                Object.entries(record.confidence.fields).map(([fieldName, conf]) => (
                  <div key={fieldName} className="flex items-center justify-between">
                    <span className="text-ink-soft capitalize">
                      {fieldName.replace(/([A-Z])/g, ' $1')}:
                    </span>
                    <ConfidenceBadge confidence={conf} />
                  </div>
                ))}
            </div>
          </div>

          {/* Immutable Audit Log Timeline */}
          <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold text-ink">
              <History size={16} className="text-register-600" />
              <span>Audit Trail (अपरिवर्तनीय लॉग)</span>
            </h3>

            <div className="mt-4 space-y-3">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log._id} className="relative border-l-2 border-register-200 pl-3 text-xs">
                    <div className="flex items-center justify-between font-medium text-ink">
                      <span className="font-semibold text-register-800">{log.action}</span>
                      <span className="text-[10px] text-ink-faint">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      By: {log.performedBy?.name || 'System Auto-Engine'} ({log.performedBy?.role || 'SYSTEM'})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink-faint">No audit entries recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  Download,
  Eye,
  FileSpreadsheet,
  FileJson,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { recordsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfidenceBadge from '../components/ConfidenceBadge';

export default function RecordsListPage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState('');
  const [confidenceMin, setConfidenceMin] = useState('');
  const [page, setPage] = useState(1);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 10,
      };
      if (search) {
        // Can match surveyNumber or ownerName in backend
        params.surveyNumber = search;
      }
      if (district) params.district = district;
      if (status) params.status = status;
      if (confidenceMin) params.confidenceMin = Number(confidenceMin);

      const res = await recordsApi.getRecords(params);
      if (res.success) {
        setRecords(res.data || []);
        if (res.meta) setMeta(res.meta);
      }
    } catch (err) {
      console.error('Failed to load land records:', err);
      setError(err.message || 'Failed to fetch records from registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, district, status, confidenceMin]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDistrict('');
    setStatus('');
    setConfidenceMin('');
    setPage(1);
  };

  const handleExport = async (format) => {
    try {
      const res = await recordsApi.exportRecords({
        format,
        district: district || undefined,
        status: status || undefined,
      });

      const blob = new Blob([typeof res === 'string' ? res : JSON.stringify(res, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bhumidrishti_records_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-line pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-register-600">
            <Layers size={16} />
            <span>SIH 2026 · Cadastral Ledger</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
            {isHi ? 'डिजिटल भू-अभिलेख रजिस्टर' : 'Cadastral Land Records Register'}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isHi
              ? 'अभिलेख संख्या, खसरा संख्या, काश्तकार नाम एवं सत्यापन स्थिति अनुसार खोजें'
              : 'Official digitized register of verified land titles, survey plots, and mutations.'}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 rounded border border-paper-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-slate-50"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 rounded border border-paper-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-slate-50"
          >
            <FileJson size={14} className="text-indigo-600" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-md border border-paper-line bg-white p-4 shadow-card">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isHi ? 'सर्वे / खसरा संख्या अथवा काश्तकार का नाम...' : 'Search Survey No, Khasra, or Landowner...'}
              className="w-full rounded border border-paper-line bg-paper py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-register-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setPage(1);
              }}
              className="rounded border border-paper-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink focus:border-register-500 focus:outline-none"
            >
              <option value="">All Districts</option>
              <option value="Pune">Pune (Maharashtra)</option>
              <option value="Nagpur">Nagpur (Maharashtra)</option>
              <option value="Varanasi">Varanasi (Uttar Pradesh)</option>
              <option value="Lucknow">Lucknow (Uttar Pradesh)</option>
              <option value="Jaipur">Jaipur (Rajasthan)</option>
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded border border-paper-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink focus:border-register-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published (प्रकाशित)</option>
              <option value="VALIDATED">Validated (सत्यापित)</option>
              <option value="NEEDS_VERIFICATION">Needs Verification (जाँच आवश्यक)</option>
              <option value="EXTRACTED">Extracted (निष्कर्षित)</option>
              <option value="REJECTED">Rejected (अस्वीकृत)</option>
            </select>

            <select
              value={confidenceMin}
              onChange={(e) => {
                setConfidenceMin(e.target.value);
                setPage(1);
              }}
              className="rounded border border-paper-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink focus:border-register-500 focus:outline-none"
            >
              <option value="">Any Confidence</option>
              <option value="80">≥ 80% (High Certainty)</option>
              <option value="60">≥ 60% (Medium)</option>
              <option value="40">≥ 40%</option>
            </select>

            <button
              type="submit"
              className="rounded bg-register-700 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-register-800"
            >
              Filter
            </button>

            {(search || district || status || confidenceMin) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Responsive Table */}
      <div className="overflow-hidden rounded-md border border-paper-line bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-paper-line bg-paper text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Survey / Khasra</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Landowner & Share</th>
                <th className="px-4 py-3 font-semibold">Plot Area</th>
                <th className="px-4 py-3 font-semibold">Classification</th>
                <th className="px-4 py-3 font-semibold">Confidence</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-faint">
                    Loading cadastral records from server…
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-faint">
                    No cadastral records found matching current criteria.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const primaryOwner = rec.landownerDetails?.[0];
                  return (
                    <tr key={rec._id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-ink">
                        <div className="font-mono text-xs font-semibold text-register-700">
                          {rec.surveyNumber || '—'}
                        </div>
                        <div className="text-[11px] text-ink-faint">
                          Kh: {rec.khasraNumber || '—'} / Khata: {rec.khataNumber || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink">
                        <div>{rec.location?.village || '—'}</div>
                        <div className="text-[11px] text-ink-faint">
                          {rec.location?.tehsil}, {rec.location?.district}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink">
                        <div className="font-medium">{primaryOwner?.name || '—'}</div>
                        <div className="text-[11px] text-ink-faint">
                          Share: {primaryOwner?.share || '1/1'} {primaryOwner?.guardianName ? `(s/o ${primaryOwner.guardianName})` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink">
                        {rec.plotArea?.value ? `${rec.plotArea.value} ${rec.plotArea.unit}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {rec.landClassification ? rec.landClassification.replace(/_/g, ' ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge confidence={rec.confidence?.overall || 0} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rec.status} isHindi={isHi} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/records/${rec._id}`}
                          className="inline-flex items-center gap-1 rounded border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-register-700 transition-colors hover:border-register-400 hover:bg-register-50"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-paper-line px-4 py-3 text-xs text-ink-soft">
          <div>
            Showing <span className="font-medium">{records.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0}</span> to{' '}
            <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of{' '}
            <span className="font-medium">{meta.total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="flex items-center gap-1 rounded border border-paper-line bg-white px-2.5 py-1 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span className="font-mono text-xs font-semibold text-ink">
              Page {meta.page} of {meta.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded border border-paper-line bg-white px-2.5 py-1 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

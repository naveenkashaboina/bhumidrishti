import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShieldCheck,
  Landmark,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Calendar,
} from 'lucide-react';

import { recordsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function CitizenLookupPage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [district, setDistrict] = useState('Pune');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!surveyNumber.trim()) return;

    try {
      setLoading(true);
      setError('');
      setRecord(null);
      setHasSearched(true);

      const res = await recordsApi.getRecords({
        district,
        surveyNumber: surveyNumber.trim(),
        limit: 1,
      });

      if (res.success && res.data && res.data.length > 0) {
        setRecord(res.data[0]);
      } else {
        setRecord(null);
      }
    } catch (err) {
      console.error('Citizen lookup error:', err);
      setError(err.message || 'Error querying land records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header Banner */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-register-200 bg-register-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-register-800">
          <Landmark size={14} />
          <span>Public Cadastral Portal · Department of Land Resources</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-bold text-ink sm:text-4xl">
          {isHi ? 'नागरिक भू-अभिलेख सत्यापन पोर्टल' : 'Citizen Land Records Public Portal'}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">
          Search and verify the official digitization status of land parcels across India using Survey Number or Khasra Number.
        </p>
      </div>

      {/* Search Box */}
      <div className="rounded-lg border border-paper-line bg-white p-6 shadow-card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-ink-soft">
                District / ज़िला
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 w-full rounded border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-register-500 focus:bg-white focus:outline-none"
              >
                <option value="Pune">Pune (Maharashtra)</option>
                <option value="Nagpur">Nagpur (Maharashtra)</option>
                <option value="Varanasi">Varanasi (Uttar Pradesh)</option>
                <option value="Lucknow">Lucknow (Uttar Pradesh)</option>
                <option value="Jaipur">Jaipur (Rajasthan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft">
                Survey Number / सर्वे संख्या (e.g. 101/1, 111/3)
              </label>
              <input
                type="text"
                required
                value={surveyNumber}
                onChange={(e) => setSurveyNumber(e.target.value)}
                placeholder="Enter Survey No or Khasra..."
                className="mt-1 w-full rounded border border-paper-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-register-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded bg-register-700 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-register-800 disabled:opacity-50"
          >
            <Search size={16} />
            <span>{loading ? 'Searching Cadastral Registry…' : 'Verify Land Record Status'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Result Card */}
      {hasSearched && (
        <div>
          {record ? (
            <div className="rounded-lg border border-paper-line bg-white p-6 shadow-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-register-800">
                      Survey No: {record.surveyNumber}
                    </span>
                    <StatusBadge status={record.status} isHindi={isHi} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {record.location?.village}, {record.location?.tehsil}, {record.location?.district}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck size={16} />
                  <span>DILRMP Verified</span>
                </div>
              </div>

              {/* Citizen-safe Information (No PII) */}
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 sm:text-sm">
                <div>
                  <span className="text-ink-soft">Khasra Number:</span>
                  <p className="font-mono font-semibold text-ink">{record.khasraNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Registered Plot Area:</span>
                  <p className="font-mono font-semibold text-ink">
                    {record.plotArea?.value} {record.plotArea?.unit}
                  </p>
                </div>
                <div>
                  <span className="text-ink-soft">Land Classification:</span>
                  <p className="font-semibold text-ink">
                    {record.landClassification?.replace(/_/g, ' ') || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-ink-soft">Ownership Title Type:</span>
                  <p className="font-semibold text-ink">
                    {record.ownershipDetails?.type?.replace(/_/g, ' ') || 'INDIVIDUAL'}
                  </p>
                </div>
                <div>
                  <span className="text-ink-soft">Unique Parcel ID (ULPIN):</span>
                  <p className="font-mono font-semibold text-register-700">
                    {record.crossCheck?.dilrmp?.referenceId || 'ULPIN-PROV'}
                  </p>
                </div>
                <div>
                  <span className="text-ink-soft">Registration Number:</span>
                  <p className="font-mono font-semibold text-ink">
                    {record.registrationInfo?.registrationNumber || '—'}
                  </p>
                </div>
              </div>

              {/* Notice */}
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[11px] text-ink-soft">
                Notice: In accordance with Central Information Security and Data Protection standards, private landowner identification numbers (Aadhaar vault tokens) are masked from public citizen queries.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-paper-line bg-white p-8 text-center shadow-card">
              <FileText size={32} className="mx-auto text-ink-faint" />
              <h3 className="mt-2 font-serif text-base font-bold text-ink">
                No Record Found for "{surveyNumber}" in {district}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Please verify the entered survey or khasra number with your physical passbook/khatoni.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

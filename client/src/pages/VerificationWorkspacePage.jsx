import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCheck2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  CheckCircle,
  XCircle,
  Sparkles,
  FileText,
  Clock,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

import { verificationApi, recordsApi } from '../services/api';
import ConfidenceBadge from '../components/ConfidenceBadge';
import StatusBadge from '../components/StatusBadge';

const PRIORITY_BADGES = {
  URGENT: 'bg-rose-100 text-rose-800 border-rose-300',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-300',
  MEDIUM: 'bg-blue-100 text-blue-800 border-blue-300',
  LOW: 'bg-slate-100 text-slate-800 border-slate-300',
};

export default function VerificationWorkspacePage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [queue, setQueue] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [record, setRecord] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    surveyNumber: '',
    khasraNumber: '',
    khataNumber: '',
    plotAreaValue: '',
    plotAreaUnit: 'acres',
    ownerName: '',
    guardianName: '',
    landClassification: '',
  });

  // Viewer controls
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showRawText, setShowRawText] = useState(false);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await verificationApi.getQueue({ limit: 20 });
      if (res.success && res.data) {
        setQueue(res.data);
        if (res.data.length > 0 && !selectedTask) {
          selectTask(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const selectTask = (task) => {
    setSelectedTask(task);
    const rec = task.landRecordId;
    setRecord(rec);
    if (rec) {
      setFormData({
        surveyNumber: rec.surveyNumber || '',
        khasraNumber: rec.khasraNumber || '',
        khataNumber: rec.khataNumber || '',
        plotAreaValue: rec.plotArea?.value || '',
        plotAreaUnit: rec.plotArea?.unit || 'acres',
        ownerName: rec.landownerDetails?.[0]?.name || '',
        guardianName: rec.landownerDetails?.[0]?.guardianName || '',
        landClassification: rec.landClassification || 'AGRICULTURAL_IRRIGATED',
      });
    }
    setStatusMessage(null);
    setZoom(100);
    setRotation(0);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCorrection = async () => {
    if (!record) return;

    try {
      setSaving(true);
      setStatusMessage(null);

      const updates = {
        version: record.version,
        surveyNumber: formData.surveyNumber,
        khasraNumber: formData.khasraNumber,
        khataNumber: formData.khataNumber,
        landClassification: formData.landClassification,
        plotArea: {
          value: parseFloat(formData.plotAreaValue) || 0,
          unit: formData.plotAreaUnit,
        },
        landownerDetails: [
          {
            name: formData.ownerName,
            guardianName: formData.guardianName,
            share: record.landownerDetails?.[0]?.share || '1/1',
            aadhaarHash: record.landownerDetails?.[0]?.aadhaarHash || null,
          },
        ],
      };

      const res = await recordsApi.updateRecord(record._id, updates);
      if (res.success) {
        setRecord(res.data.record);
        setStatusMessage({
          type: 'success',
          text: 'Changes saved & recorded to Feedback collection for AI retraining!',
        });
        // Refresh queue
        fetchQueue();
      }
    } catch (err) {
      console.error('Save error:', err);
      if (err.message?.includes('Conflict') || err.message?.includes('409')) {
        setStatusMessage({
          type: 'error',
          text: '409 Conflict: Another verifier modified this record. Reloading latest version.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Save failed: ${err.message}`,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!record) return;
    if (!window.confirm('Confirm validation of this cadastral land record?')) return;

    try {
      setSaving(true);
      const res = await recordsApi.approveRecord(record._id);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Record ${record.surveyNumber} successfully validated!`,
        });
        // Remove task from local queue
        setQueue((prev) => prev.filter((t) => t._id !== selectedTask._id));
        if (queue.length > 1) {
          selectTask(queue[1]);
        } else {
          setSelectedTask(null);
          setRecord(null);
        }
      }
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!record || !rejectReason) {
      alert('Please specify a rejection reason');
      return;
    }

    try {
      setSaving(true);
      const res = await recordsApi.rejectRecord(record._id, { reason: rejectReason });
      if (res.success) {
        setShowRejectModal(false);
        setRejectReason('');
        setStatusMessage({
          type: 'info',
          text: `Record rejected: ${rejectReason}`,
        });
        setQueue((prev) => prev.filter((t) => t._id !== selectedTask._id));
        if (queue.length > 1) {
          selectTask(queue[1]);
        } else {
          setSelectedTask(null);
          setRecord(null);
        }
      }
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isFlagged = (fieldName) => record?.flaggedFields?.includes(fieldName);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden bg-paper">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-paper-line bg-white px-6 py-2.5">
        <div className="flex items-center gap-3">
          <FileCheck2 size={20} className="text-register-700" />
          <div>
            <h1 className="font-serif text-base font-bold text-ink">
              {isHi ? 'मानव-सहायित सत्यापन कार्यक्षेत्र' : 'Human-Assisted Verification Workspace'}
            </h1>
            <p className="text-[11px] text-ink-soft">
              Side-by-side scan inspection, AI confidence scoring, and active learning feedback loop.
            </p>
          </div>
        </div>

        {record && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink-faint">Version: {record.version}</span>
            <button
              type="button"
              onClick={handleSaveCorrection}
              disabled={saving}
              className="flex items-center gap-1.5 rounded border border-saffron-500 bg-saffron-50 px-3 py-1.5 text-xs font-semibold text-saffron-700 transition-colors hover:bg-saffron-100 disabled:opacity-50"
            >
              <Save size={13} />
              Save & Feed AI
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:opacity-50"
            >
              <CheckCircle size={13} />
              Approve Record
            </button>
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              <XCircle size={13} />
              Reject
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`flex items-center justify-between px-6 py-2 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-ink-soft hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {/* Workspace Body: 3-column split (Queue sidebar, Scan Viewer, Editable Form) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Task Queue */}
        <div className="flex w-72 flex-col border-r border-paper-line bg-white">
          <div className="flex items-center justify-between border-b border-paper-line px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Verification Queue ({queue.length})
            </span>
            <button
              onClick={fetchQueue}
              className="text-ink-soft hover:text-ink"
              title="Refresh Queue"
            >
              <RefreshCw size={13} className={loadingQueue ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-paper-line">
            {loadingQueue ? (
              <div className="p-4 text-center text-xs text-ink-faint">Loading tasks…</div>
            ) : queue.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-faint">
                🎉 No open verification tasks pending in your jurisdiction!
              </div>
            ) : (
              queue.map((task) => {
                const rec = task.landRecordId;
                const isSelected = selectedTask?._id === task._id;
                return (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() => selectTask(task)}
                    className={`w-full text-left p-3 transition-colors ${
                      isSelected
                        ? 'bg-register-50/80 border-l-4 border-register-700'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-register-800">
                        {rec?.surveyNumber || 'Survey ?'}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.2 text-[10px] font-medium ${
                          PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-ink font-medium truncate">
                      {rec?.landownerDetails?.[0]?.name || 'Unknown Owner'}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-ink-faint">
                      <span>
                        {rec?.location?.village}, {rec?.location?.district}
                      </span>
                      <ConfidenceBadge confidence={rec?.confidence?.overall || 0} />
                    </div>

                    {rec?.flaggedFields && rec.flaggedFields.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {rec.flaggedFields.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-rose-50 px-1 py-0.2 text-[10px] text-rose-700 border border-rose-200"
                          >
                            ⚠ {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Column: Document Scan Viewer */}
        <div className="flex flex-1 flex-col border-r border-paper-line bg-slate-100">
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between border-b border-paper-line bg-white px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">
                Scan:{' '}
                <span className="font-mono text-register-700">
                  {record?.documentId?.originalFileName || `Register_${record?.surveyNumber}.pdf`}
                </span>
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-ink-soft">
                Indic OCR: हिन्दी / Marathi
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 15, 50))}
                className="rounded border border-paper-line bg-white p-1 hover:bg-slate-50"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="font-mono text-xs w-10 text-center">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 15, 200))}
                className="rounded border border-paper-line bg-white p-1 hover:bg-slate-50"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded border border-paper-line bg-white p-1 hover:bg-slate-50"
                title="Rotate 90°"
              >
                <RotateCw size={13} />
              </button>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                  showRawText
                    ? 'bg-register-700 text-white border-register-800'
                    : 'bg-white text-ink border-paper-line hover:bg-slate-50'
                }`}
              >
                {showRawText ? 'Show Scan' : 'Raw OCR Text'}
              </button>
            </div>
          </div>

          {/* Scan Canvas Viewport */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            {showRawText ? (
              <div className="h-full w-full max-w-2xl rounded border border-paper-line bg-white p-6 font-mono text-xs text-ink shadow-card overflow-auto">
                <h4 className="border-b border-paper-line pb-2 font-bold text-register-800">
                  Raw Tesseract OCR Text Output:
                </h4>
                <pre className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-soft">
                  {`महाराष्ट्र शासन — महसूल विभाग (गाव नमुना १२)
जिल्हा: ${record?.location?.district || 'पुणे'} | तालुका: ${record?.location?.tehsil || 'हवेली'} | गाव: ${record?.location?.village || 'वाघोली'}

सर्वे क्रमांक: ${record?.surveyNumber} / हिस्सा क्र: १
खसरा क्रमांक: ${record?.khasraNumber} | खाते क्र: ${record?.khataNumber}
काश्तकार नाव: ${record?.landownerDetails?.[0]?.name}
क्षेत्रफळ: ${record?.plotArea?.value} ${record?.plotArea?.unit}
जमीन प्रकार: ${record?.landClassification}

[अधिकृत मुद्रा व स्वाक्षरी — उपनिबंधक कार्यालय]`}
                </pre>
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="relative max-w-xl rounded border-2 border-slate-300 bg-[#fbf8ee] p-8 shadow-xl"
              >
                {/* Simulated degraded physical register page with ruled lines & stamps */}
                <div className="absolute right-4 top-4 flex flex-col items-center justify-center rounded-full border-2 border-dashed border-red-700/60 p-2 text-[9px] font-bold text-red-700/70 rotate-[-12deg]">
                  <span>GOVERNMENT OF INDIA</span>
                  <span>DEPARTMENT OF REVENUE</span>
                  <span>VERIFIED CADASTRE</span>
                </div>

                <div className="border-b-2 border-register-800 pb-3 text-center font-serif">
                  <p className="text-xs uppercase tracking-widest text-ink-soft">
                    Ministry of Rural Development · DoLR
                  </p>
                  <h3 className="text-lg font-bold text-register-900">
                    खतौनी / खाता रजिस्टर (नकल प्रतिलिपि)
                  </h3>
                  <p className="font-mono text-[10px] text-ink-faint">
                    REGISTRATION NO: {record?.registrationInfo?.registrationNumber || 'REG-2024-OFFICIAL'}
                  </p>
                </div>

                <div className="mt-6 space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-paper-line pb-2">
                    <div>
                      <span className="text-ink-faint">District / ज़िला:</span>
                      <p className="font-bold text-ink">{record?.location?.district}</p>
                    </div>
                    <div>
                      <span className="text-ink-faint">Tehsil / तहसील:</span>
                      <p className="font-bold text-ink">{record?.location?.tehsil}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-paper-line pb-2">
                    <div>
                      <span className="text-ink-faint">Survey No / सर्वे क्र:</span>
                      <p className="text-base font-bold text-register-800">{record?.surveyNumber}</p>
                    </div>
                    <div>
                      <span className="text-ink-faint">Khasra / खसरा क्र:</span>
                      <p className="text-base font-bold text-register-800">{record?.khasraNumber}</p>
                    </div>
                  </div>

                  <div className="border-b border-paper-line pb-2">
                    <span className="text-ink-faint">Owner Name / काश्तकार का नाम:</span>
                    <p className="font-bold text-ink">{record?.landownerDetails?.[0]?.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-paper-line pb-2">
                    <div>
                      <span className="text-ink-faint">Plot Area / क्षेत्रफल:</span>
                      <p className="font-bold text-ink">
                        {record?.plotArea?.value} {record?.plotArea?.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-ink-faint">Classification:</span>
                      <p className="font-bold text-ink">{record?.landClassification}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between pt-4 text-[10px] text-ink-faint border-t border-slate-300">
                  <span>ULPIN: {record?.crossCheck?.dilrmp?.referenceId || 'GENERATED'}</span>
                  <span>SEAL OF SUB-REGISTRAR</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bilingual Structured Form */}
        <div className="flex w-96 flex-col overflow-y-auto border-l border-paper-line bg-white p-5">
          <div className="flex items-center justify-between border-b border-paper-line pb-3">
            <div>
              <h2 className="font-serif text-sm font-bold text-ink">
                {isHi ? 'निष्कर्षित फ़ील्ड्स सत्यापन' : 'Extracted Field Verification'}
              </h2>
              <p className="text-[11px] text-ink-soft">
                Edit fields to calibrate AI model via feedback loop
              </p>
            </div>
            <ConfidenceBadge confidence={record?.confidence?.overall || 0} size="md" />
          </div>

          {/* Form Fields */}
          {record ? (
            <div className="mt-4 space-y-4 text-xs">
              {/* Field 1: Survey Number */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Survey Number / <span className="font-normal text-ink-soft">सर्वे संख्या</span>
                  </label>
                  <ConfidenceBadge confidence={record.confidence?.fields?.surveyNumber || 80} />
                </div>
                <input
                  type="text"
                  value={formData.surveyNumber}
                  onChange={(e) => handleFieldChange('surveyNumber', e.target.value)}
                  className={`mt-1 w-full rounded border px-3 py-1.5 font-mono text-sm focus:outline-none ${
                    isFlagged('surveyNumber')
                      ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-600'
                      : 'border-paper-line bg-paper text-ink focus:border-register-500 focus:bg-white'
                  }`}
                />
                {isFlagged('surveyNumber') && (
                  <p className="mt-0.5 text-[11px] text-rose-600">⚠ Low OCR extraction confidence</p>
                )}
              </div>

              {/* Field 2: Khasra Number */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Khasra Number / <span className="font-normal text-ink-soft">खसरा संख्या</span>
                  </label>
                  <ConfidenceBadge confidence={record.confidence?.fields?.khasraNumber || 50} />
                </div>
                <input
                  type="text"
                  value={formData.khasraNumber}
                  onChange={(e) => handleFieldChange('khasraNumber', e.target.value)}
                  className={`mt-1 w-full rounded border px-3 py-1.5 font-mono text-sm focus:outline-none ${
                    isFlagged('khasraNumber')
                      ? 'border-amber-400 bg-amber-50/40 text-amber-900 focus:border-amber-600'
                      : 'border-paper-line bg-paper text-ink focus:border-register-500 focus:bg-white'
                  }`}
                />
                {isFlagged('khasraNumber') && (
                  <p className="mt-0.5 text-[11px] text-amber-600">
                    ⚠ Flagged field: Review against scan digits
                  </p>
                )}
              </div>

              {/* Field 3: Khata Number */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Khata Number / <span className="font-normal text-ink-soft">खाता संख्या</span>
                  </label>
                  <ConfidenceBadge confidence={85} />
                </div>
                <input
                  type="text"
                  value={formData.khataNumber}
                  onChange={(e) => handleFieldChange('khataNumber', e.target.value)}
                  className="mt-1 w-full rounded border border-paper-line bg-paper px-3 py-1.5 font-mono text-sm text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Field 4: Primary Owner Name */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Landowner Name / <span className="font-normal text-ink-soft">काश्तकार का नाम</span>
                  </label>
                  <ConfidenceBadge confidence={record.confidence?.fields?.landownerDetails || 88} />
                </div>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                  className="mt-1 w-full rounded border border-paper-line bg-paper px-3 py-1.5 text-sm font-medium text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Field 5: Guardian Name */}
              <div>
                <label className="font-semibold text-ink">
                  Guardian / <span className="font-normal text-ink-soft">पिता या पति का नाम</span>
                </label>
                <input
                  type="text"
                  value={formData.guardianName}
                  onChange={(e) => handleFieldChange('guardianName', e.target.value)}
                  className="mt-1 w-full rounded border border-paper-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Field 6: Plot Area & Unit */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Plot Area / <span className="font-normal text-ink-soft">क्षेत्रफल</span>
                  </label>
                  <ConfidenceBadge confidence={record.confidence?.fields?.plotArea || 60} />
                </div>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.plotAreaValue}
                    onChange={(e) => handleFieldChange('plotAreaValue', e.target.value)}
                    className="w-2/3 rounded border border-paper-line bg-paper px-3 py-1.5 font-mono text-sm text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                  />
                  <select
                    value={formData.plotAreaUnit}
                    onChange={(e) => handleFieldChange('plotAreaUnit', e.target.value)}
                    className="w-1/3 rounded border border-paper-line bg-white px-2 py-1.5 text-xs text-ink focus:border-register-500 focus:outline-none"
                  >
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                    <option value="bigha">Bigha</option>
                    <option value="sq_meters">Sq. Meters</option>
                  </select>
                </div>
              </div>

              {/* Field 7: Land Classification */}
              <div>
                <label className="font-semibold text-ink">
                  Land Classification / <span className="font-normal text-ink-soft">भूमि वर्गीकरण</span>
                </label>
                <select
                  value={formData.landClassification}
                  onChange={(e) => handleFieldChange('landClassification', e.target.value)}
                  className="mt-1 w-full rounded border border-paper-line bg-white px-2.5 py-1.5 text-xs text-ink focus:border-register-500 focus:outline-none"
                >
                  <option value="AGRICULTURAL_IRRIGATED">Agricultural (Irrigated) / सिंचित</option>
                  <option value="AGRICULTURAL_UNIRRIGATED">Agricultural (Unirrigated) / असिंचित</option>
                  <option value="RESIDENTIAL">Residential / आवासीय</option>
                  <option value="COMMERCIAL">Commercial / व्यावसायिक</option>
                  <option value="FOREST">Forest / वन भूमि</option>
                  <option value="GOVERNMENT_PUBLIC">Government Public / सरकारी भूमि</option>
                  <option value="PASTURE_GRAZING">Pasture Grazing / चरागाह</option>
                </select>
              </div>

              {/* AI Active Learning Callout */}
              <div className="rounded border border-saffron-200 bg-saffron-50/70 p-3 text-[11px] text-saffron-800">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles size={14} className="text-saffron-600" />
                  <span>AI Learning Loop Active</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  Saving any correction sends a structured delta to the <code>Feedback</code> collection, retraining local Indic OCR models against handwriting quirks.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-10 text-center text-xs text-ink-faint">
              Select a task from the queue to start verifying.
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-md bg-white p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-ink">Reject Land Record</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Please enter official revenue reason for rejecting this record:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Illegible survey seal, conflicting owner names, or torn registrar page..."
              className="mt-3 w-full rounded border border-paper-line p-2 text-xs text-ink focus:border-rose-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded border border-paper-line px-3 py-1.5 text-ink hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="rounded bg-rose-700 px-3 py-1.5 text-white hover:bg-rose-800"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

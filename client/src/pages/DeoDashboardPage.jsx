import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Download,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';

import { documentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';

export default function DeoDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null);

  // Form jurisdiction state (prepopulated from user)
  const [district, setDistrict] = useState(user?.jurisdiction?.district || 'Pune');
  const [tehsil, setTehsil] = useState(user?.jurisdiction?.tehsil || 'Haveli');
  const [village, setVillage] = useState(user?.jurisdiction?.village || 'Wagholi');
  const [languageHint, setLanguageHint] = useState('mar+eng');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tif', '.tiff'],
    },
    maxFiles: 1,
    onDrop: (files) => {
      if (files.length > 0) {
        setSelectedFile(files[0]);
        setUploadMessage(null);
      }
    },
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentsApi.getDocuments({ limit: 15 });
      if (res.success && res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('district', district);
      formData.append('tehsil', tehsil);
      formData.append('village', village);
      formData.append('languageHint', languageHint);

      const res = await documentsApi.uploadSingle(formData);
      if (res.success) {
        setUploadMessage({
          type: 'success',
          text: `File "${selectedFile.name}" successfully uploaded and queued for Indic OCR extraction!`,
        });
        setSelectedFile(null);
        fetchDocuments();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadMessage({
        type: 'error',
        text: err.message || 'File upload failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const processedCount = documents.filter((d) => d.status === 'PROCESSED').length;
  const processingCount = documents.filter((d) => d.status === 'PROCESSING' || d.status === 'UPLOADED').length;

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-line pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-register-600">
            <FolderOpen size={16} />
            <span>DEO Workspace · Operator Ingestion Desk</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
            {isHi ? 'डाटा एंट्री ऑपरेटर डैशबोर्ड' : 'DEO Upload & Ingestion Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Jurisdiction: <span className="font-semibold text-ink">{user?.jurisdiction?.district || 'Pune'}</span>
            {user?.jurisdiction?.tehsil ? ` · Tehsil: ${user.jurisdiction.tehsil}` : ''}
            {user?.jurisdiction?.village ? ` · Village: ${user.jurisdiction.village}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/bulk-upload"
            className="flex items-center gap-1.5 rounded border border-register-600 bg-white px-3 py-1.5 text-xs font-semibold text-register-700 hover:bg-register-50"
          >
            <span>Switch to Bulk Upload</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Documents Uploaded"
          titleHi="कुल अपलोड किए गए दस्तावेज"
          value={documents.length || 70}
          subtitle="Lifetime files registered"
          icon={FileText}
          color="register"
        />
        <MetricCard
          title="Extracted & Processed"
          titleHi="सफलतापूर्वक निष्कर्षित"
          value={processedCount || 65}
          subtitle="OCR & NER fields extracted"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Active OCR Queue"
          titleHi="प्रक्रियारत दस्तावेज"
          value={processingCount || 5}
          subtitle="In BullMQ background runner"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Main Form + Dropzone */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Card */}
        <div className="rounded-md border border-paper-line bg-white p-5 shadow-card lg:col-span-1">
          <h2 className="font-serif text-sm font-bold text-ink">Upload New Record Scan</h2>
          <p className="text-xs text-ink-soft">Submit physical scan or PDF for OCR extraction.</p>

          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center rounded border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
                isDragActive
                  ? 'border-register-500 bg-register-50'
                  : 'border-paper-line hover:border-register-400 bg-paper/50'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud size={20} className="text-register-600" />
              <span className="mt-1 text-xs font-medium text-ink">
                {selectedFile ? selectedFile.name : 'Select or drop single file'}
              </span>
              <span className="text-[10px] text-ink-faint">PDF, JPG, PNG (up to 25 MB)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-semibold text-ink-soft">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="mt-0.5 w-full rounded border border-paper-line bg-paper px-2.5 py-1 text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-ink-soft">Tehsil</label>
                <input
                  type="text"
                  value={tehsil}
                  onChange={(e) => setTehsil(e.target.value)}
                  className="mt-0.5 w-full rounded border border-paper-line bg-paper px-2.5 py-1 text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-ink-soft">Village</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="mt-0.5 w-full rounded border border-paper-line bg-paper px-2.5 py-1 text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-ink-soft">Language Hint</label>
                <select
                  value={languageHint}
                  onChange={(e) => setLanguageHint(e.target.value)}
                  className="mt-0.5 w-full rounded border border-paper-line bg-paper px-2.5 py-1 text-ink focus:border-register-500 focus:bg-white focus:outline-none"
                >
                  <option value="mar+eng">Marathi + English (मराठी)</option>
                  <option value="hin+eng">Hindi + English (हिन्दी)</option>
                  <option value="tel+eng">Telugu + English (తెలుగు)</option>
                </select>
              </div>
            </div>

            {uploadMessage && (
              <div
                className={`rounded p-2 text-xs font-medium ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {uploadMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full rounded bg-register-700 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-register-800 disabled:opacity-50"
            >
              {uploading ? 'Processing OCR…' : 'Upload & Start Extraction'}
            </button>
          </form>
        </div>

        {/* Uploads History Table */}
        <div className="rounded-md border border-paper-line bg-white p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-paper-line pb-3">
            <h2 className="font-serif text-sm font-bold text-ink">Recent Ingested Documents</h2>
            <button
              onClick={fetchDocuments}
              className="text-xs text-ink-soft hover:text-ink flex items-center gap-1"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-paper-line bg-paper uppercase tracking-wider text-[11px] text-ink-soft">
                <tr>
                  <th className="px-3 py-2 font-semibold">Document File</th>
                  <th className="px-3 py-2 font-semibold">Upload Date</th>
                  <th className="px-3 py-2 font-semibold">Language</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-ink-faint">
                      No documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  documents.slice(0, 10).map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-ink">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <FileText size={14} className="text-register-600 flex-shrink-0" />
                          <span className="truncate">{doc.originalFileName || 'Scan_Document.pdf'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 font-mono uppercase text-ink-faint">
                        {doc.ocrData?.languageHint || 'hin+eng'}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <a
                          href={documentsApi.getFileUrl(doc._id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-register-700 hover:underline"
                        >
                          <Download size={12} /> View
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

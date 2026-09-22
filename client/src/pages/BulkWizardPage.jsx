import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

import { documentsApi } from '../services/api';

export default function BulkWizardPage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [files, setFiles] = useState([]);
  const [district, setDistrict] = useState('Pune');
  const [tehsil, setTehsil] = useState('Haveli');
  const [village, setVillage] = useState('Wagholi');
  const [languageHint, setLanguageHint] = useState('hin+eng');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tif', '.tiff'],
      'text/plain': ['.txt'],
    },
    maxFiles: 20,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles && rejectedFiles.length > 0) {
        setError(`Some files were rejected. Allowed formats: PDF, PNG, JPG, TIFF, TXT.`);
      }
      setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 20));
      if (acceptedFiles.length > 0) setError('');
    },
  });

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) {
      setError('Please add at least one scanned land register document.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadResult(null);

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('district', district);
      formData.append('tehsil', tehsil);
      formData.append('village', village);
      formData.append('languageHint', languageHint);

      const res = await documentsApi.uploadBulk(formData);
      if (res.success) {
        setUploadResult(res.data);
        setFiles([]);
      }
    } catch (err) {
      console.error('Bulk upload failed:', err);
      setError(err.message || 'Bulk upload request failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-paper-line pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-register-600">
          <Layers size={16} />
          <span>Batch Ingestion Engine</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
          {isHi ? 'थोक भू-अभिलेख अपलोड विज़ार्ड' : 'Bulk Cadastral Document Upload Wizard'}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Upload up to 20 scanned cadastral sheets, PDFs, or register images for automated Indic OCR, NLP extraction, and deduplication.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {uploadResult && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold text-base">
            <CheckCircle2 size={18} />
            <span>Batch Upload Queued Successfully!</span>
          </div>
          <p className="mt-1">
            {uploadResult.uploadedCount || 'All'} documents enqueued to extraction pipeline.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href="/deo-dashboard"
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Monitor Ingestion Progress →
            </a>
          </div>
        </div>
      )}

      {/* Jurisdiction & Language Tagger Card */}
      <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
        <h2 className="font-serif text-sm font-bold text-ink">
          1. Batch Revenue Jurisdiction & OCR Language Hint
        </h2>
        <p className="text-xs text-ink-soft">
          These jurisdiction tags will apply to all files in this ingestion batch.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft">District / ज़िला</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full rounded border border-paper-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-register-500 focus:bg-white focus:outline-none"
            >
              <option value="Pune">Pune (Maharashtra)</option>
              <option value="Nagpur">Nagpur (Maharashtra)</option>
              <option value="Varanasi">Varanasi (Uttar Pradesh)</option>
              <option value="Lucknow">Lucknow (Uttar Pradesh)</option>
              <option value="Jaipur">Jaipur (Rajasthan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">Tehsil / तहसील</label>
            <input
              type="text"
              value={tehsil}
              onChange={(e) => setTehsil(e.target.value)}
              className="mt-1 w-full rounded border border-paper-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-register-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">Village / ग्राम</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="mt-1 w-full rounded border border-paper-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-register-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft">OCR Script Hint</label>
            <select
              value={languageHint}
              onChange={(e) => setLanguageHint(e.target.value)}
              className="mt-1 w-full rounded border border-paper-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-register-500 focus:bg-white focus:outline-none"
            >
              <option value="hin+eng">Hindi + English (हिन्दी)</option>
              <option value="mar+eng">Marathi + English (मराठी)</option>
              <option value="tel+eng">Telugu + English (తెలుగు)</option>
              <option value="eng">English Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dropzone Upload Area */}
      <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
        <h2 className="font-serif text-sm font-bold text-ink">
          2. Drag & Drop Documents or Registers
        </h2>

        <div
          {...getRootProps()}
          className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-register-500 bg-register-50/50'
              : 'border-paper-line hover:border-register-400 bg-paper/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-register-100 text-register-700">
            <UploadCloud size={24} />
          </div>
          <p className="mt-3 font-serif text-sm font-bold text-ink">
            {isDragActive ? 'Drop your files here…' : 'Drag & drop scans here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Supports PDF, PNG, JPG, TIFF (up to 25 MB per file, max 20 files per batch)
          </p>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
              <span>Queued Files ({files.length} / 20)</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-rose-600 hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="divide-y divide-paper-line rounded border border-paper-line max-h-60 overflow-y-auto">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 text-xs bg-white">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={15} className="text-register-600 flex-shrink-0" />
                    <span className="font-medium text-ink truncate">{file.name}</span>
                    <span className="font-mono text-ink-faint">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-ink-soft hover:text-rose-600"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleBulkUpload}
                disabled={uploading}
                className="flex items-center gap-2 rounded bg-register-800 px-5 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-register-900 disabled:opacity-50"
              >
                {uploading ? (
                  <>Uploading & Enqueuing Pipeline…</>
                ) : (
                  <>
                    <span>Submit {files.length} Scans to Extraction Pipeline</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

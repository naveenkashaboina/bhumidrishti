import React from 'react';
import { Filter } from 'lucide-react';

const LOCATIONS = {
  Maharashtra: {
    Pune: ['Haveli', 'Baramati', 'Khed'],
    Nagpur: ['Kamptee', 'Hingna'],
  },
  'Uttar Pradesh': {
    Varanasi: ['Sadar', 'Pindra'],
    Lucknow: ['Mohanlalganj', 'Bakshi Ka Talab'],
  },
  Rajasthan: {
    Jaipur: ['Sanganer', 'Amer'],
  },
};

export default function JurisdictionFilter({
  selectedState = '',
  selectedDistrict = '',
  selectedTehsil = '',
  onChange,
  className = '',
}) {
  const handleStateChange = (e) => {
    const state = e.target.value;
    onChange({ state, district: '', tehsil: '' });
  };

  const handleDistrictChange = (e) => {
    const district = e.target.value;
    onChange({ state: selectedState, district, tehsil: '' });
  };

  const handleTehsilChange = (e) => {
    const tehsil = e.target.value;
    onChange({ state: selectedState, district: selectedDistrict, tehsil });
  };

  const districts = selectedState ? Object.keys(LOCATIONS[selectedState] || {}) : [];
  const tehsils = selectedDistrict && selectedState ? LOCATIONS[selectedState]?.[selectedDistrict] || [] : [];

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs sm:text-sm ${className}`}>
      <span className="flex items-center gap-1 font-medium text-ink-soft">
        <Filter size={14} className="text-register-600" /> Jurisdiction:
      </span>

      <select
        value={selectedState}
        onChange={handleStateChange}
        className="rounded border border-paper-line bg-white px-2.5 py-1 text-ink focus:border-register-500 focus:outline-none"
      >
        <option value="">All States</option>
        {Object.keys(LOCATIONS).map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </select>

      <select
        value={selectedDistrict}
        onChange={handleDistrictChange}
        disabled={!selectedState}
        className="rounded border border-paper-line bg-white px-2.5 py-1 text-ink disabled:bg-gray-100 focus:border-register-500 focus:outline-none"
      >
        <option value="">All Districts</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        value={selectedTehsil}
        onChange={handleTehsilChange}
        disabled={!selectedDistrict}
        className="rounded border border-paper-line bg-white px-2.5 py-1 text-ink disabled:bg-gray-100 focus:border-register-500 focus:outline-none"
      >
        <option value="">All Tehsils</option>
        {tehsils.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

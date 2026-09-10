import React, { useState, useEffect } from 'react';
import { 
  COUNTRIES_DATA, 
  OTHER_OPTION_VALUE, 
  getCountryData, 
  getProvincesForCountry, 
  getCitiesForProvince 
} from '../utils/locations';
import { Globe, MapPin, Building } from 'lucide-react';

interface LocationSelectorProps {
  country?: string;
  province?: string;
  city?: string;
  onChange: (location: { country: string; province: string; city: string }) => void;
  required?: boolean;
  compact?: boolean;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  country = 'Argentina',
  province = '',
  city = '',
  onChange,
  required = false,
  compact = false,
  className = ''
}) => {
  const currentCountry = country || 'Argentina';
  const countryConfig = getCountryData(currentCountry);
  const provincesList = getProvincesForCountry(currentCountry);

  // Determine if incoming province is a known one or custom
  const isKnownProvince = provincesList.some(p => p.name.toLowerCase() === (province || '').toLowerCase());
  const initialProvinceSelect = !province 
    ? '' 
    : (isKnownProvince ? province : OTHER_OPTION_VALUE);

  const [provinceSelect, setProvinceSelect] = useState<string>(initialProvinceSelect);
  const [customProvince, setCustomProvince] = useState<string>(!isKnownProvince && province ? province : '');

  // Calculate available cities for the active province
  const effectiveProvinceName = provinceSelect === OTHER_OPTION_VALUE ? customProvince : provinceSelect;
  const citiesList = getCitiesForProvince(currentCountry, effectiveProvinceName);

  const isKnownCity = citiesList.some(c => c.toLowerCase() === (city || '').toLowerCase());
  const initialCitySelect = !city 
    ? '' 
    : (isKnownCity ? city : OTHER_OPTION_VALUE);

  const [citySelect, setCitySelect] = useState<string>(initialCitySelect);
  const [customCity, setCustomCity] = useState<string>(!isKnownCity && city ? city : '');

  // Sync internal state when external props change
  useEffect(() => {
    const knownProv = provincesList.some(p => p.name.toLowerCase() === (province || '').toLowerCase());
    if (province) {
      if (knownProv) {
        setProvinceSelect(province);
        setCustomProvince('');
      } else {
        setProvinceSelect(OTHER_OPTION_VALUE);
        setCustomProvince(province);
      }
    } else {
      setProvinceSelect('');
      setCustomProvince('');
    }
  }, [province, currentCountry]);

  useEffect(() => {
    const knownCity = citiesList.some(c => c.toLowerCase() === (city || '').toLowerCase());
    if (city) {
      if (knownCity) {
        setCitySelect(city);
        setCustomCity('');
      } else {
        setCitySelect(OTHER_OPTION_VALUE);
        setCustomCity(city);
      }
    } else {
      setCitySelect('');
      setCustomCity('');
    }
  }, [city, effectiveProvinceName]);

  const handleCountryChange = (newCountry: string) => {
    setProvinceSelect('');
    setCustomProvince('');
    setCitySelect('');
    setCustomCity('');
    onChange({
      country: newCountry,
      province: '',
      city: ''
    });
  };

  const handleProvinceChange = (newSelectValue: string) => {
    setProvinceSelect(newSelectValue);
    setCitySelect('');
    setCustomCity('');

    if (newSelectValue === OTHER_OPTION_VALUE) {
      onChange({
        country: currentCountry,
        province: customProvince,
        city: ''
      });
    } else {
      setCustomProvince('');
      onChange({
        country: currentCountry,
        province: newSelectValue,
        city: ''
      });
    }
  };

  const handleCustomProvinceChange = (val: string) => {
    setCustomProvince(val);
    onChange({
      country: currentCountry,
      province: val,
      city: citySelect === OTHER_OPTION_VALUE ? customCity : citySelect
    });
  };

  const handleCityChange = (newSelectValue: string) => {
    setCitySelect(newSelectValue);
    const activeProv = provinceSelect === OTHER_OPTION_VALUE ? customProvince : provinceSelect;

    if (newSelectValue === OTHER_OPTION_VALUE) {
      onChange({
        country: currentCountry,
        province: activeProv,
        city: customCity
      });
    } else {
      setCustomCity('');
      onChange({
        country: currentCountry,
        province: activeProv,
        city: newSelectValue
      });
    }
  };

  const handleCustomCityChange = (val: string) => {
    setCustomCity(val);
    const activeProv = provinceSelect === OTHER_OPTION_VALUE ? customProvince : provinceSelect;
    onChange({
      country: currentCountry,
      province: activeProv,
      city: val
    });
  };

  const provinceLabel = countryConfig?.provincesLabel || 'Provincia / Estado';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-3'} gap-3`}>
        {/* Country Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Globe size={12} className="text-primary" /> País {required && '*'}
          </label>
          <select
            value={currentCountry}
            onChange={e => handleCountryChange(e.target.value)}
            required={required}
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
          >
            {COUNTRIES_DATA.map(c => (
              <option key={c.code} value={c.name} className="bg-dark text-white">
                {c.name} {c.code === 'AR' ? '🇦🇷' : c.code === 'UY' ? '🇺🇾' : '🇪🇸'}
              </option>
            ))}
          </select>
        </div>

        {/* Province / Department Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <MapPin size={12} className="text-primary" /> {provinceLabel} {required && '*'}
          </label>
          <select
            value={provinceSelect}
            onChange={e => handleProvinceChange(e.target.value)}
            required={required}
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
          >
            <option value="" className="bg-dark text-slate-400">
              Seleccionar {provinceLabel}...
            </option>
            {provincesList.map(p => (
              <option key={p.name} value={p.name} className="bg-dark text-white">
                {p.name}
              </option>
            ))}
            <option value={OTHER_OPTION_VALUE} className="bg-dark text-primary font-bold">
              ✍️ Otro {provinceLabel.toLowerCase()}...
            </option>
          </select>
        </div>

        {/* City Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building size={12} className="text-primary" /> Ciudad / Depto. {required && '*'}
          </label>
          <select
            value={citySelect}
            onChange={e => handleCityChange(e.target.value)}
            required={required}
            disabled={!provinceSelect}
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" className="bg-dark text-slate-400">
              {!provinceSelect ? `Primero elige ${provinceLabel.toLowerCase()}` : 'Seleccionar Ciudad...'}
            </option>
            {citiesList.map(c => (
              <option key={c} value={c} className="bg-dark text-white">
                {c}
              </option>
            ))}
            <option value={OTHER_OPTION_VALUE} className="bg-dark text-primary font-bold">
              ✍️ Otra ciudad / localidad...
            </option>
          </select>
        </div>
      </div>

      {/* Fallback Custom Inputs when "Other" is selected */}
      {(provinceSelect === OTHER_OPTION_VALUE || citySelect === OTHER_OPTION_VALUE) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-up">
          {provinceSelect === OTHER_OPTION_VALUE && (
            <div>
              <label className="block text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
                Escribe tu {provinceLabel.toLowerCase()}
              </label>
              <input
                type="text"
                value={customProvince}
                onChange={e => handleCustomProvinceChange(e.target.value)}
                placeholder={`Ej: ${provinceLabel}`}
                required={required}
                className="w-full bg-primary/10 border border-primary/40 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none transition-colors text-sm"
              />
            </div>
          )}

          {citySelect === OTHER_OPTION_VALUE && (
            <div>
              <label className="block text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
                Escribe tu Ciudad o Localidad
              </label>
              <input
                type="text"
                value={customCity}
                onChange={e => handleCustomCityChange(e.target.value)}
                placeholder="Ej: Localidad o pueblo"
                required={required}
                className="w-full bg-primary/10 border border-primary/40 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none transition-colors text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

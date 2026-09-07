'use client';

import { useCity } from '@/components/city-provider';

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSelectCity: (city: string) => void;
  required?: boolean;
}

export function CitySelectorModal({
  isOpen,
  onClose,
  currentCity,
  onSelectCity,
  required = false,
}: CitySelectorModalProps) {
  const { cities } = useCity();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-lg bg-white px-6 py-8 text-center shadow-2xl sm:px-10">
        {!required ? (
          <button type="button" onClick={onClose} className="absolute right-4 top-3 text-2xl text-[#999]" aria-label="Close city selector">
            ×
          </button>
        ) : null}
        <h2 className="font-display text-2xl font-extrabold text-[#111]">Please select your city</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {cities.map((city) => {
            const selected =
              city.slug === currentCity.toLowerCase() || city.name.toLowerCase() === currentCity.toLowerCase();
            return (
              <button
                key={city.slug}
                type="button"
                onClick={() => onSelectCity(city.slug)}
                className={`text-sm font-semibold ${selected ? 'text-[#2E86DE]' : 'text-[#333] hover:text-[#2E86DE]'}`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
        {!currentCity ? <p className="mt-6 text-sm text-[#c0392b]">Kindly select a city</p> : null}
      </div>
    </div>
  );
}

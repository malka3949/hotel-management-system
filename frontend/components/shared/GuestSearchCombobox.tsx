'use client';

import { useState, useRef, useCallback } from 'react';
import { searchGuests, type GuestSearchResult } from '@/lib/api/guests';

interface Props {
  onSelect: (guest: GuestSearchResult) => void;
  value?: string;
  placeholder?: string;
  branchId?: string;
}

export function GuestSearchCombobox({ onSelect, value, placeholder = 'חפש אורח...', branchId }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<GuestSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await searchGuests(q, branchId);
          setResults(res);
          setOpen(true);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [branchId],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  function handleSelect(guest: GuestSearchResult) {
    setQuery(guest.fullName);
    setOpen(false);
    onSelect(guest);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: 'var(--color-border-default)' }}
      />
      {loading && (
        <span
          className="absolute left-3 top-2.5 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          מחפש...
        </span>
      )}
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-md border shadow-lg overflow-hidden"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          {results.map((g) => (
            <li
              key={g.id}
              onMouseDown={() => handleSelect(g)}
              className="px-3 py-2 text-sm cursor-pointer hover:opacity-80"
              style={{ borderBottom: '1px solid var(--color-border-default)' }}
            >
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {g.fullName}
              </span>
              <span className="mr-2 text-xs" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                {g.phone}
              </span>
              {g.email && (
                <span className="mr-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  · {g.email}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

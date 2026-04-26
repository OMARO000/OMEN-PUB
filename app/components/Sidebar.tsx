'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const VIOLATION_TYPES = [
  { code: 'PRI', label: 'PRIVACY' },
  { code: 'LAB', label: 'LABOR' },
  { code: 'ETH', label: 'ETHICS' },
  { code: 'ENV', label: 'ENVIRONMENT' },
  { code: 'ANT', label: 'ANTITRUST' },
] as const;

const TIERS = [1, 2, 3, 4, 5] as const;

type CompanyResult = {
  id: number;
  name: string;
  slug: string;
  tier: number | null;
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isLedger = pathname === '/ledger';

  const catParam = searchParams.get('cat') ?? '';
  const tierParam = searchParams.get('tier') ?? '';
  const violationFilters = new Set(catParam.split(',').filter(Boolean));
  const tierFilters = new Set(
    tierParam.split(',').map(Number).filter(n => !isNaN(n) && n > 0),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: search.trim() });
        const res = await fetch(`/api/companies?${params}`);
        if (res.ok) {
          const data: CompanyResult[] = await res.json();
          setResults(data);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  function buildFilterUrl(nextCats: Set<string>, nextTiers: Set<number>): string {
    const p = new URLSearchParams();
    if (nextCats.size > 0) p.set('cat', [...nextCats].join(','));
    if (nextTiers.size > 0) p.set('tier', [...nextTiers].join(','));
    const qs = p.toString();
    return qs ? `/ledger?${qs}` : '/ledger';
  }

  function toggleViolation(code: string) {
    const next = new Set(violationFilters);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    router.push(buildFilterUrl(next, tierFilters));
  }

  function toggleTier(tier: number) {
    const next = new Set(tierFilters);
    if (next.has(tier)) next.delete(tier);
    else next.add(tier);
    router.push(buildFilterUrl(violationFilters, next));
  }

  const toggleLabel = isOpen ? '[CLOSE]' : (isLedger ? '[FILTER]' : '[SEARCH]');

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close sidebar' : (isLedger ? 'Open filters' : 'Open search')}
        aria-expanded={isOpen}
        aria-controls="sidebar-panel"
      >
        {toggleLabel}
      </button>

      <aside
        id="sidebar-panel"
        className={`sidebar${isOpen ? ' sidebar--open' : ''}`}
        aria-label="Search and filter"
      >
        {/* Search */}
        <div className="sidebar-section">
          <label htmlFor="company-search" className="sidebar-label">
            SEARCH
          </label>
          <div className="sidebar-search-wrapper">
            <span className="sidebar-prompt" aria-hidden="true">
              &gt;
            </span>
            <input
              id="company-search"
              type="search"
              className="sidebar-search"
              placeholder="company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {(isSearching || results.length > 0 || (search.trim() && !isSearching)) && (
            <div aria-live="polite" aria-label="Search results">
              {isSearching && (
                <p className="sidebar-search-status">searching...</p>
              )}
              {!isSearching && search.trim() && results.length === 0 && (
                <p className="sidebar-search-status">-- no results</p>
              )}
              {!isSearching && results.length > 0 && (
                <ul role="list" className="sidebar-results">
                  {results.map((company) => (
                    <li key={company.id}>
                      <Link
                        href={`/ledger/${company.slug}`}
                        className="sidebar-result-link"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="sidebar-result-prefix" aria-hidden="true">&gt;</span>
                        <span className="sidebar-result-name">{company.name}</span>
                        {company.tier != null && (
                          <span className="sidebar-result-tier">T{company.tier}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Filter sections — ledger only */}
        {isLedger && (
          <>
            <div className="sidebar-divider" />

            <div className="sidebar-section">
              <p className="sidebar-label">FILTER BY VIOLATION TYPE</p>
              <ul role="list" className="sidebar-checklist">
                {VIOLATION_TYPES.map(({ code, label }) => (
                  <li key={code}>
                    <label className="sidebar-check-label">
                      <input
                        type="checkbox"
                        className="sidebar-checkbox"
                        checked={violationFilters.has(code)}
                        onChange={() => toggleViolation(code)}
                      />
                      <span>{label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section">
              <p className="sidebar-label">FILTER BY TIER</p>
              <ul role="list" className="sidebar-checklist">
                {TIERS.map((tier) => (
                  <li key={tier}>
                    <label className="sidebar-check-label">
                      <input
                        type="checkbox"
                        className="sidebar-checkbox"
                        checked={tierFilters.has(tier)}
                        onChange={() => toggleTier(tier)}
                      />
                      <span>TIER {tier}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

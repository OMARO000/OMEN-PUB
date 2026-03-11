'use client';

import { useState } from 'react';

const VIOLATION_TYPES = [
  'FINANCIAL',
  'ENVIRONMENTAL',
  'LABOR',
  'PRIVACY',
  'ANTITRUST',
  'SAFETY',
  'HUMAN RIGHTS',
  'CORRUPTION',
] as const;

const TIERS = [1, 2, 3, 4, 5] as const;

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [violationFilters, setViolationFilters] = useState<Set<string>>(new Set());
  const [tierFilters, setTierFilters] = useState<Set<number>>(new Set());

  function toggleViolation(type: string) {
    setViolationFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleTier(tier: number) {
    setTierFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close filters' : 'Open filters'}
        aria-expanded={isOpen}
        aria-controls="sidebar-panel"
      >
        {isOpen ? '[CLOSE]' : '[FILTER]'}
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
        </div>

        <div className="sidebar-divider" />

        {/* Violation Type Filters */}
        <div className="sidebar-section">
          <p className="sidebar-label">FILTER BY VIOLATION TYPE</p>
          <ul role="list" className="sidebar-checklist">
            {VIOLATION_TYPES.map((type) => (
              <li key={type}>
                <label className="sidebar-check-label">
                  <input
                    type="checkbox"
                    className="sidebar-checkbox"
                    checked={violationFilters.has(type)}
                    onChange={() => toggleViolation(type)}
                  />
                  <span>{type}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-divider" />

        {/* Tier Filters */}
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
      </aside>
    </>
  );
}

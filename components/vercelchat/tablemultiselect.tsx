// components/TableMultiSelect.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface TableMultiSelectProps {
  availableTables: string[];
  selectedTables: string[];
  setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>;
}

const TableMultiSelect: React.FC<TableMultiSelectProps> = ({
  availableTables,
  selectedTables,
  setSelectedTables,
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Options include "All" plus availableTables, filtered by the search query
  const options = useMemo(() => {
    const allOption = 'All';
    const combined = [allOption, ...availableTables];
    return combined.filter((option) =>
      option.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, availableTables]);

  // Handle selection: if "All" is chosen, toggle it; otherwise add/remove the individual table.
  const handleSelect = (option: string) => {
    if (option === 'All') {
      if (selectedTables.includes('All')) {
        setSelectedTables([]);
      } else {
        setSelectedTables(['All']);
      }
    } else {
      let newSelection = selectedTables.includes('All')
        ? []
        : [...selectedTables];
      if (newSelection.includes(option)) {
        newSelection = newSelection.filter((o) => o !== option);
      } else {
        newSelection.push(option);
      }
    }
    setSearch('');
  };

  const removeChip = (option: string) => {
    setSelectedTables(selectedTables.filter((o) => o !== option));
  };

  return (
    <div className="w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select your Data Table
      </label>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500">
          {selectedTables.map((option) => (
            <div
              key={option}
              className="flex items-center bg-blue-100 text-blue-800 rounded px-2 py-1"
            >
              <span>{option}</span>
              <button
                type="button"
                onClick={() => removeChip(option)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                &times;
              </button>
            </div>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search tables..."
            className="flex-grow outline-none py-1"
          />
        </div>
        {open && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white border border-gray-300 shadow-lg">
            {options.map((option) => (
              <li
                key={option}
                onClick={() => handleSelect(option)}
                className="cursor-pointer px-4 py-2 hover:bg-blue-500 hover:text-white"
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TableMultiSelect;

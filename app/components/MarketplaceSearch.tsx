'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

interface MarketplaceSearchProps {
  onSearch: (searchTerm: string, tags: string[]) => void;
  initialSearch?: string;
  initialTags?: string[];
  availableTags?: string[];
  isLoading?: boolean;
}

export default function MarketplaceSearch({ 
  onSearch, 
  initialSearch = '', 
  initialTags = [],
  availableTags = [],
  isLoading = false
}: MarketplaceSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm, selectedTags);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedTags, onSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  const hasActiveFilters = searchTerm.length > 0 || selectedTags.length > 0;

  // Add useMemo to prevent unnecessary re-renders of the loading spinner
  const loadingSpinner = useMemo(() => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
  ), []);

  return (
    <div className="bg-amber-100 border-2 border-black brutal-shadow-left p-6 mb-8">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isLoading ? loadingSpinner : (
                <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              type="text"
              placeholder="Search listings by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm('');
                }
              }}
              className="block w-full pl-10 pr-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
            />
          </div>
        </div>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="button-primary bg-primary px-4 py-2 flex items-center duration-100"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-freeman">Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
            </button>

            {showTagDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-black brutal-shadow-left z-10">
                <div className="py-1 max-h-60 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center px-4 py-2 text-sm font-freeman hover:bg-amber-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="mr-3 h-4 w-4 border-2 border-black focus:ring-primary"
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            onClick={clearSearch}
            className="button-primary bg-white px-4 py-2 flex items-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-freeman">Clear</span>
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {selectedTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm font-freeman">Filtered by tags:</span>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 bg-primary border-2 border-black font-freeman text-sm brutal-shadow-center"
            >
              {tag}
              <button
                onClick={() => handleTagToggle(tag)}
                className="ml-2 hover:text-amber-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 
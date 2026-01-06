interface SelectionModeHeaderProps {
  selectedCount: number;
  totalCount: number;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onCancel: () => void;
}

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function SelectionModeHeader({
  selectedCount,
  totalCount,
  onDeleteSelected,
  onSelectAll,
  onCancel,
}: SelectionModeHeaderProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <div className="flex items-center justify-between mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-carbon-400 hover:text-carbon-200 hover:bg-carbon-800 transition-colors"
          title="Cancel selection"
        >
          <CloseIcon />
        </button>
        <div>
          <h2 className="font-display text-xl text-carbon-100">
            {selectedCount} selected
          </h2>
          <p className="text-carbon-400 text-sm">
            Tap pages to select or deselect
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="btn btn-secondary btn-sm"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          className="btn btn-danger"
        >
          <TrashIcon />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}

import { useRef } from "react";
import {
  ChevronDown,
  Filter,
  LayoutPanelTop,
  LayoutTemplate,
  Settings2,
  Search,
  Table2,
  X,
} from "lucide-react";
import type { SearchFilters, TaxonomyTerm, WorkspaceSummary } from "../../types/models";
import type { WorkspaceScreen } from "../../app/store";
import { termsByCategory } from "../../utils/grouping";

interface WorkspaceControlsProps {
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  archivedCount: number;
  search: string;
  activeScreen: WorkspaceScreen;
  filters: SearchFilters;
  taxonomyTerms: TaxonomyTerm[];
  onSearchChange: (value: string) => void;
  onScreenChange: (screen: WorkspaceScreen) => void;
  onSelectWorkspace: (slug: string) => void;
  onToggleWorkspaceManager: () => void;
  workspaceManagerOpen: boolean;
  onOpenSchemaStudio: () => void;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function WorkspaceControls({
  workspaces,
  activeWorkspace,
  archivedCount,
  search,
  activeScreen,
  filters,
  taxonomyTerms,
  onSearchChange,
  onScreenChange,
  onSelectWorkspace,
  onToggleWorkspaceManager,
  workspaceManagerOpen,
  onOpenSchemaStudio,
  onFiltersChange,
}: WorkspaceControlsProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const groupedTerms = termsByCategory(taxonomyTerms);
  const labels = activeWorkspace?.taxonomy_labels ?? {
    domain: "Domain",
    type: "Type",
    subtype: "Subtype",
    layer: "Layer",
  };

  return (
    <>
      <header className="topbar">
        <div className="database-cluster">
          <label className="field-label">Database</label>
          <div className="database-row">
            <select
              className="themed-select"
              value={activeWorkspace?.slug ?? ""}
              onChange={(event) => onSelectWorkspace(event.target.value)}
            >
              {!workspaces.length ? <option value="">No active workspace</option> : null}
              {workspaces.map((workspace) => (
                <option key={workspace.slug} value={workspace.slug}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <button className={`secondary-button ${workspaceManagerOpen ? "active" : ""}`} onClick={onToggleWorkspaceManager}>
              <Settings2 size={16} />
              Manage databases
              <ChevronDown size={14} />
            </button>
          </div>
          <small className="helper-text">
            {activeWorkspace ? "Choose an active local database or open database management." : "Choose or create a database"}
            {archivedCount ? ` · ${archivedCount} archived` : ""}
          </small>
        </div>

        <div className="search-cluster">
          <div className="segmented-control screen-switcher">
            <button
              className={activeScreen === "atlas" ? "active" : ""}
              title="Atlas"
              onClick={() => onScreenChange("atlas")}
            >
              <LayoutPanelTop size={14} />
              Atlas
            </button>
            <button
              className={activeScreen === "table" ? "active" : ""}
              title="Table View"
              onClick={() => onScreenChange("table")}
            >
              <Table2 size={14} />
              Table View
            </button>
          </div>
          <div className="search-shell">
            <Search size={18} className="search-icon" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="search-input"
              placeholder="Search across titles, body, fields, sources and attachments"
            />
            {search ? (
              <button
                className="search-clear-button"
                title="Clear search"
                onClick={() => {
                  onSearchChange("");
                  searchInputRef.current?.focus();
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <details className="filters-shell">
            <summary className="icon-button filter-button" title="Filters">
              <Filter size={16} />
            </summary>
            <div className="filters-popover">
              <FilterSelect
                label={labels.domain}
                value={filters.domain}
                options={groupedTerms.domain}
                onChange={(value) => onFiltersChange({ ...filters, domain: value })}
              />
              <FilterSelect
                label={labels.type}
                value={filters.type}
                options={groupedTerms.type}
                onChange={(value) => onFiltersChange({ ...filters, type: value })}
              />
              <FilterSelect
                label={labels.subtype}
                value={filters.subtype}
                options={groupedTerms.subtype}
                onChange={(value) => onFiltersChange({ ...filters, subtype: value })}
              />
              <FilterSelect
                label={labels.layer}
                value={filters.layer}
                options={groupedTerms.layer}
                onChange={(value) => onFiltersChange({ ...filters, layer: value })}
              />
              <button className="secondary-button" disabled={!activeWorkspace} onClick={onOpenSchemaStudio}>
                <LayoutTemplate size={14} />
                Manage category
              </button>
            </div>
          </details>
        </div>
      </header>
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number | undefined;
  options: TaxonomyTerm[];
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="field-stack">
      <span>{label}</span>
      <select
        className="themed-select"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
      >
        <option value="">All {label}s</option>
        {options.map((term) => (
          <option key={term.id} value={term.id}>
            {term.label}
          </option>
        ))}
      </select>
    </label>
  );
}

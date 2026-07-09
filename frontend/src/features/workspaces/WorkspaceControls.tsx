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
import { PopoverMenu } from "../../shared/components/PopoverMenu";
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
            <PopoverMenu
              icon={
                <div className="dropdown-trigger-content">
                  <span>{activeWorkspace?.name ?? "Choose database"}</span>
                  <ChevronDown size={14} />
                </div>
              }
              label="Database"
              align="left"
              triggerClassName="dropdown-trigger wide"
            >
              <div className="dropdown-list">
                {!workspaces.length ? <span className="dropdown-empty">No active workspace</span> : null}
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.slug}
                    className={`dropdown-item ${workspace.slug === activeWorkspace?.slug ? "active" : ""}`}
                    onClick={() => onSelectWorkspace(workspace.slug)}
                  >
                    <strong>{workspace.name}</strong>
                    <span>{workspace.card_count} cards</span>
                  </button>
                ))}
                <button
                  className={`dropdown-item dropdown-item-manage ${workspaceManagerOpen ? "active" : ""}`}
                  onClick={onToggleWorkspaceManager}
                >
                  <Settings2 size={14} />
                  <span>Manage databases</span>
                </button>
              </div>
            </PopoverMenu>
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
          <div className="filter-menu-row">
            <PopoverMenu icon={<Filter size={16} />} label="Filters">
              <div className="dropdown-list compact">
                <FilterMenu
                  label={labels.domain}
                  value={filters.domain}
                  options={groupedTerms.domain}
                  onChange={(value) => onFiltersChange({ ...filters, domain: value })}
                  onManage={onOpenSchemaStudio}
                />
                <FilterMenu
                  label={labels.type}
                  value={filters.type}
                  options={groupedTerms.type}
                  onChange={(value) => onFiltersChange({ ...filters, type: value })}
                  onManage={onOpenSchemaStudio}
                />
                <FilterMenu
                  label={labels.subtype}
                  value={filters.subtype}
                  options={groupedTerms.subtype}
                  onChange={(value) => onFiltersChange({ ...filters, subtype: value })}
                  onManage={onOpenSchemaStudio}
                />
                <FilterMenu
                  label={labels.layer}
                  value={filters.layer}
                  options={groupedTerms.layer}
                  onChange={(value) => onFiltersChange({ ...filters, layer: value })}
                  onManage={onOpenSchemaStudio}
                />
              </div>
            </PopoverMenu>
          </div>
        </div>
      </header>
    </>
  );
}

function FilterMenu({
  label,
  value,
  options,
  onChange,
  onManage,
}: {
  label: string;
  value: number | undefined;
  options: TaxonomyTerm[];
  onChange: (value: number | undefined) => void;
  onManage: () => void;
}) {
  return (
    <PopoverMenu
      icon={
        <div className="dropdown-trigger-content">
          <span>{value ? options.find((term) => term.id === value)?.label ?? label : label}</span>
          <ChevronDown size={14} />
        </div>
      }
      label={label}
      triggerClassName="dropdown-trigger"
    >
      <div className="dropdown-list">
        <button className={`dropdown-item ${value === undefined ? "active" : ""}`} onClick={() => onChange(undefined)}>
          <span>All {label}s</span>
        </button>
        {options.map((term) => (
          <button
            key={term.id}
            className={`dropdown-item ${value === term.id ? "active" : ""}`}
            onClick={() => onChange(term.id)}
          >
            <span>{term.label}</span>
          </button>
        ))}
        <button className="dropdown-item dropdown-item-manage" onClick={onManage}>
          <LayoutTemplate size={14} />
          <span>Manage category</span>
        </button>
      </div>
    </PopoverMenu>
  );
}

import { useRef } from "react";
import {
  ChevronDown,
  Filter,
  Globe2,
  LayoutPanelTop,
  LayoutTemplate,
  Images,
  Home,
  MapPin,
  Milestone,
  Settings2,
  Search,
  Swords,
  Table2,
  UserRound,
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
  onManageCategory: (category: string) => void;
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
  onManageCategory,
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
      <PopoverMenu
        icon={<Globe2 size={20} />}
        label="World"
        align="left"
        className="world-rail-menu"
        panelClassName="world-rail-panel"
        triggerClassName="world-rail-button"
      >
        <div className="world-rail-current">
          <span>Active world</span>
          <strong>{activeWorkspace?.name ?? "Choose world"}</strong>
          {activeWorkspace ? (
            <small>
              {activeWorkspace.theme}
              {archivedCount ? ` · ${archivedCount} archived` : ""}
            </small>
          ) : (
            <small>Choose or create a local world.</small>
          )}
        </div>
        <div className="dropdown-list">
          {!workspaces.length ? <span className="dropdown-empty">No active world</span> : null}
          {workspaces.map((workspace) => (
            <button
              key={workspace.slug}
              className={`dropdown-item ${workspace.slug === activeWorkspace?.slug ? "active" : ""}`}
              title={`Switch to ${workspace.name}`}
              onClick={() => onSelectWorkspace(workspace.slug)}
            >
              <strong>{workspace.name}</strong>
              <span>{workspace.theme}</span>
            </button>
          ))}
          <button
            className={`dropdown-item dropdown-item-manage ${workspaceManagerOpen ? "active" : ""}`}
            title="Create, rename, duplicate, delete, archive, import, export, back up, and reorder worlds"
            onClick={onToggleWorkspaceManager}
          >
            <Settings2 size={14} />
            <span>Manage worlds</span>
          </button>
        </div>
      </PopoverMenu>
      <header className="topbar">
        <div className="search-cluster">
          <div className="segmented-control screen-switcher">
            <button
              className={activeScreen === "home" ? "active" : ""}
              title="Open world home"
              onClick={() => onScreenChange("home")}
            >
              <Home size={14} />
              Home
            </button>
            <button
              className={activeScreen === "chapters" || activeScreen === "campaign" ? "active" : ""}
              title="Open Chapters and prepared scenes"
              onClick={() => onScreenChange("chapters")}
            >
              <Swords size={14} />
              Chapters
            </button>
            <button
              className={activeScreen === "atlas" ? "active" : ""}
              title="Open the Wiki entity workspace"
              onClick={() => onScreenChange("atlas")}
            >
              <LayoutPanelTop size={14} />
              Wiki
            </button>
            <button
              className={activeScreen === "characters" ? "active" : ""}
              title="Open Characters"
              onClick={() => onScreenChange("characters")}
            >
              <UserRound size={14} />
              Characters
            </button>
            <button
              className={activeScreen === "locations" ? "active" : ""}
              title="Open Locations"
              onClick={() => onScreenChange("locations")}
            >
              <MapPin size={14} />
              Locations
            </button>
            <button
              className={activeScreen === "plots" ? "active" : ""}
              title="Open Plots and Chronology"
              onClick={() => onScreenChange("plots")}
            >
              <Milestone size={14} />
              Plots
            </button>
            <button
              className={activeScreen === "board" ? "active" : ""}
              title="Open Boards and Moodboards"
              onClick={() => onScreenChange("board")}
            >
              <Images size={14} />
              Boards
            </button>
            <button
              className={activeScreen === "table" ? "active" : ""}
              title="Open the spreadsheet-style entity type table"
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
            <PopoverMenu icon={<Filter size={16} />} label="Filters" className="filter-popover" panelClassName="filter-popover-panel">
              <div className="dropdown-list compact">
                <FilterMenu
                  label={labels.domain}
                  value={filters.domain}
                  options={groupedTerms.domain}
                  onChange={(value) => onFiltersChange({ ...filters, domain: value })}
                  onManage={() => onManageCategory("domain")}
                />
                <FilterMenu
                  label={labels.type}
                  value={filters.type}
                  options={groupedTerms.type}
                  onChange={(value) => onFiltersChange({ ...filters, type: value })}
                  onManage={() => onManageCategory("type")}
                />
                <FilterMenu
                  label={labels.subtype}
                  value={filters.subtype}
                  options={groupedTerms.subtype}
                  onChange={(value) => onFiltersChange({ ...filters, subtype: value })}
                  onManage={() => onManageCategory("subtype")}
                />
                <FilterMenu
                  label={labels.layer}
                  value={filters.layer}
                  options={groupedTerms.layer}
                  onChange={(value) => onFiltersChange({ ...filters, layer: value })}
                  onManage={() => onManageCategory("layer")}
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
      align="left"
      className="filter-submenu"
      panelClassName="filter-submenu-panel"
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

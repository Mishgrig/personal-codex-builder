import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookPlus,
  Copy,
  Filter,
  FolderPlus,
  ImagePlus,
  LayoutTemplate,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { SearchFilters, TaxonomyTerm, WorkspaceSummary } from "../../types/models";
import { termsByCategory } from "../../utils/grouping";

const workspaceSchema = z.object({
  name: z.string().min(2, "Name is too short."),
  description: z.string().default(""),
  theme: z.enum(["classic", "fantasy"]).default("fantasy"),
});

type WorkspaceForm = z.infer<typeof workspaceSchema>;
type WorkspaceFormInput = z.input<typeof workspaceSchema>;

interface WorkspaceControlsProps {
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  archivedCount: number;
  search: string;
  filters: SearchFilters;
  taxonomyTerms: TaxonomyTerm[];
  onSearchChange: (value: string) => void;
  onSelectWorkspace: (slug: string) => void;
  onCreateWorkspace: (payload: WorkspaceForm) => Promise<unknown>;
  onCopyWorkspace: () => Promise<unknown>;
  onDeleteWorkspace: () => Promise<unknown>;
  onOpenSchemaStudio: () => void;
  onCreateCard: () => Promise<unknown>;
  onUploadLogo: (file: File) => Promise<unknown>;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function WorkspaceControls({
  workspaces,
  activeWorkspace,
  archivedCount,
  search,
  filters,
  taxonomyTerms,
  onSearchChange,
  onSelectWorkspace,
  onCreateWorkspace,
  onCopyWorkspace,
  onDeleteWorkspace,
  onOpenSchemaStudio,
  onCreateCard,
  onUploadLogo,
  onFiltersChange,
}: WorkspaceControlsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WorkspaceFormInput, undefined, WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      description: "",
      theme: "fantasy",
    },
  });
  const groupedTerms = termsByCategory(taxonomyTerms);
  const labels = activeWorkspace?.taxonomy_labels ?? {
    domain: "Domain",
    type: "Type",
    subtype: "Subtype",
    layer: "Layer",
  };

  async function submitWorkspace(payload: WorkspaceForm) {
    await onCreateWorkspace(payload);
    reset();
    setCreateOpen(false);
  }

  return (
    <>
      <header className="topbar">
        <div className="database-cluster">
          <label className="field-label">Workspace</label>
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
            <button className="icon-button" title="Create workspace" onClick={() => setCreateOpen(true)}>
              <FolderPlus size={16} />
            </button>
            <button
              className="icon-button"
              title="Copy workspace"
              disabled={!activeWorkspace}
              onClick={() => void onCopyWorkspace()}
            >
              <Copy size={16} />
            </button>
            <button
              className="icon-button danger"
              title="Delete workspace"
              disabled={!activeWorkspace}
              onClick={() => void onDeleteWorkspace()}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <small className="helper-text">
            {activeWorkspace ? `${activeWorkspace.card_count} cards in the active workspace` : "Choose or create a workspace"}
            {archivedCount ? ` · ${archivedCount} archived` : ""}
          </small>
        </div>

        <div className="search-cluster">
          <div className="search-shell">
            <Search size={18} className="search-icon" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="search-input"
              placeholder="Search across titles, body, fields, sources and attachments"
            />
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
                Manage taxonomy
              </button>
            </div>
          </details>
        </div>

        <div className="toolbar-actions">
          <button className="icon-button" title="New card" disabled={!activeWorkspace} onClick={() => void onCreateCard()}>
            <Plus size={16} />
          </button>
          <button className="icon-button" title="Schema studio" disabled={!activeWorkspace} onClick={onOpenSchemaStudio}>
            <BookPlus size={16} />
          </button>
          <label className="logo-button" title="Upload database logo">
            {activeWorkspace?.logo_url ? (
              <img src={activeWorkspace.logo_url} alt={activeWorkspace.name} className="workspace-logo" />
            ) : (
              <ImagePlus size={18} />
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={!activeWorkspace}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void onUploadLogo(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </header>

      {createOpen ? (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal-card compact-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Create database</h2>
            <form className="stack-form" onSubmit={handleSubmit(submitWorkspace)}>
              <label className="field-stack">
                <span>Name</span>
                <input className="themed-input" {...register("name")} />
                {errors.name ? <small className="error-text">{errors.name.message}</small> : null}
              </label>
              <label className="field-stack">
                <span>Description</span>
                <textarea className="themed-textarea" rows={3} {...register("description")} />
              </label>
              <label className="field-stack">
                <span>Theme</span>
                <select className="themed-select" {...register("theme")}>
                  <option value="fantasy">Fantasy</option>
                  <option value="classic">Classic</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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

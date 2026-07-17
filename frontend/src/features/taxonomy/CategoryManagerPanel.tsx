import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import type { TaxonomyTerm, WorkspaceSummary } from "../../types/models";
import { IconButton } from "../../shared/components/IconButton";
import { StateNotice } from "../../shared/components/StateNotice";

const DEFAULT_CATEGORIES = ["domain", "type", "subtype", "layer"];

interface CategoryManagerPanelProps {
  workspaceSlug: string;
  activeWorkspace: WorkspaceSummary;
  terms: TaxonomyTerm[];
  initialCategory: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function CategoryManagerPanel({
  workspaceSlug,
  activeWorkspace,
  terms,
  initialCategory,
  onClose,
  onSaved,
}: CategoryManagerPanelProps) {
  const categories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...terms.map((term) => term.category)])),
    [terms],
  );
  const [category, setCategory] = useState(initialCategory || categories[0] || "domain");
  const [categoryLabel, setCategoryLabel] = useState(activeWorkspace.taxonomy_labels[category] ?? capitalize(category));
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const categoryTerms = terms
    .filter((term) => term.category === category)
    .sort((left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label));

  useEffect(() => {
    setCategory(initialCategory || categories[0] || "domain");
  }, [categories, initialCategory]);

  useEffect(() => {
    setCategoryLabel(activeWorkspace.taxonomy_labels[category] ?? capitalize(category));
  }, [activeWorkspace.taxonomy_labels, category]);

  async function saveCategoryLabel() {
    await api.updateWorkspace(workspaceSlug, {
      taxonomy_labels: {
        ...activeWorkspace.taxonomy_labels,
        [category]: categoryLabel.trim() || capitalize(category),
      },
    });
    await onSaved();
  }

  async function createTerm() {
    if (!newLabel.trim() || !newSlug.trim()) {
      return;
    }
    await api.createTaxonomyTerm(workspaceSlug, {
      category,
      label: newLabel.trim(),
      slug: newSlug.trim(),
      sort_order: categoryTerms.length,
    });
    setNewLabel("");
    setNewSlug("");
    await onSaved();
  }

  async function updateTerm(term: TaxonomyTerm, patch: Partial<TaxonomyTerm>) {
    await api.updateTaxonomyTerm(workspaceSlug, term.id, patch);
    await onSaved();
  }

  async function moveTerm(term: TaxonomyTerm, direction: -1 | 1) {
    const currentIndex = categoryTerms.findIndex((item) => item.id === term.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= categoryTerms.length) {
      return;
    }
    const reordered = [...categoryTerms];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    await Promise.all(
      reordered.map((item, index) => api.updateTaxonomyTerm(workspaceSlug, item.id, { sort_order: index })),
    );
    await onSaved();
  }

  async function deleteTerm(term: TaxonomyTerm) {
    const confirmed = window.confirm(`Delete "${term.label}" from ${categoryLabel}? Existing cards may lose this tag.`);
    if (!confirmed) {
      return;
    }
    await api.deleteTaxonomyTerm(workspaceSlug, term.id);
    await onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card compact-modal category-manager-modal" onClick={(event) => event.stopPropagation()}>
        <div className="workspace-manager-header">
          <div>
            <h2>Manage category</h2>
            <p>Rename filter categories and edit their labels, slugs, and display order.</p>
          </div>
          <IconButton title="Close category manager" aria-label="Close category manager" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="category-manager-layout">
          <aside className="category-sidebar">
            {categories.map((item) => (
              <button
                key={item}
                className={`category-tab ${item === category ? "active" : ""}`}
                onClick={() => setCategory(item)}
              >
                <strong>{activeWorkspace.taxonomy_labels[item] ?? capitalize(item)}</strong>
                <span>{item}</span>
              </button>
            ))}
          </aside>

          <section className="category-editor">
            <div className="field-row">
              <label className="field-stack grow-field">
                <span>Category name</span>
                <input
                  className="themed-input"
                  value={categoryLabel}
                  onChange={(event) => setCategoryLabel(event.target.value)}
                />
              </label>
              <button className="primary-button" onClick={() => void saveCategoryLabel()}>
                Save category
              </button>
            </div>

            <div className="category-term-list">
              {categoryTerms.length ? (
                categoryTerms.map((term, index) => (
                  <div className="category-term-row" key={term.id}>
                    <input
                      className="themed-input"
                      aria-label={`${term.label} name`}
                      defaultValue={term.label}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next && next !== term.label) {
                          void updateTerm(term, { label: next });
                        }
                      }}
                    />
                    <input
                      className="themed-input"
                      aria-label={`${term.label} slug`}
                      defaultValue={term.slug}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next && next !== term.slug) {
                          void updateTerm(term, { slug: next });
                        }
                      }}
                    />
                    <div className="row-actions">
                      <IconButton
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => void moveTerm(term, -1)}
                      >
                        <ArrowUp size={14} />
                      </IconButton>
                      <IconButton
                        title="Move down"
                        disabled={index === categoryTerms.length - 1}
                        onClick={() => void moveTerm(term, 1)}
                      >
                        <ArrowDown size={14} />
                      </IconButton>
                      <IconButton danger title="Delete term" onClick={() => void deleteTerm(term)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))
              ) : (
                <StateNotice title="No terms yet" description="Create the first option for this category below." />
              )}
            </div>

            <div className="category-term-row new-term-row">
              <input
                className="themed-input"
                placeholder="New option name"
                value={newLabel}
                onChange={(event) => {
                  setNewLabel(event.target.value);
                  if (!newSlug.trim()) {
                    setNewSlug(slugify(event.target.value));
                  }
                }}
              />
              <input
                className="themed-input"
                placeholder="new-option-slug"
                value={newSlug}
                onChange={(event) => setNewSlug(event.target.value)}
              />
              <button className="primary-button" disabled={!newLabel.trim() || !newSlug.trim()} onClick={() => void createTerm()}>
                <Plus size={14} />
                Add option
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

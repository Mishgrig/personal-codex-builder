import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { queryClient } from "../app/queryClient";
import { useUIStore } from "../app/store";
import { AtlasPane } from "../features/atlas/AtlasPane";
import { DetailPane } from "../features/detail/DetailPane";
import { WorkspaceControls } from "../features/workspaces/WorkspaceControls";
import { StateNotice } from "../shared/components/StateNotice";

const SchemaStudio = lazy(() =>
  import("../components/SchemaStudio").then((module) => ({ default: module.SchemaStudio })),
);
const TableViewPane = lazy(() =>
  import("../features/table/TableViewPane").then((module) => ({ default: module.TableViewPane })),
);
const WorkspaceManagerPanel = lazy(() =>
  import("../features/workspaces/WorkspaceManagerPanel").then((module) => ({ default: module.WorkspaceManagerPanel })),
);
const WorkspaceNotebookPanel = lazy(() =>
  import("../features/workspaces/WorkspaceNotebookPanel").then((module) => ({ default: module.WorkspaceNotebookPanel })),
);

export function CodexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const notebookDividerRef = useRef<HTMLDivElement | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSortBy, setTableSortBy] = useState("manual");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("asc");
  const [tableStatusFilter, setTableStatusFilter] = useState("");
  const [assetLibrarySearch, setAssetLibrarySearch] = useState("");
  const [assetLibraryType, setAssetLibraryType] = useState("");
  const {
    activeWorkspaceSlug,
    selectedCardId,
    activeScreen,
    selectedCardTypeSlug,
    search,
    filters,
    viewMode,
    sortMode,
    showSummary,
    showCover,
    groupByCategory,
    dividerRatio,
    detailPanePosition,
    showNotebook,
    notebookRatio,
    showWorkspaceManager,
    schemaStudioOpen,
    setActiveWorkspaceSlug,
    setSelectedCardId,
    setActiveScreen,
    setSelectedCardTypeSlug,
    setSearch,
    setFilters,
    setViewMode,
    setSortMode,
    setShowSummary,
    setShowCover,
    setGroupByCategory,
    setDividerRatio,
    setDetailPanePosition,
    setShowNotebook,
    setNotebookRatio,
    setShowWorkspaceManager,
    setSchemaStudioOpen,
  } = useUIStore();

  const deferredSearch = useDeferredValue(search);

  const backendHealthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 15_000,
  });

  const appInfoQuery = useQuery({
    queryKey: ["app-info"],
    queryFn: api.appInfo,
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces", "all"],
    queryFn: () => api.listWorkspaces(true),
  });

  const allWorkspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);
  const activeWorkspaces = useMemo(
    () => allWorkspaces.filter((workspace) => !workspace.archived),
    [allWorkspaces],
  );
  const archivedWorkspaces = useMemo(
    () => allWorkspaces.filter((workspace) => workspace.archived),
    [allWorkspaces],
  );
  const activeWorkspace =
    activeWorkspaces.find((workspace) => workspace.slug === activeWorkspaceSlug) ??
    activeWorkspaces[0] ??
    null;

  useEffect(() => {
    const activeWorkspaceExists = Boolean(
      activeWorkspaceSlug &&
        allWorkspaces.some(
          (workspace) => workspace.slug === activeWorkspaceSlug && !workspace.archived,
        ),
    );

    if (activeWorkspaceExists) {
      return;
    }

    const nextActiveWorkspaceSlug = activeWorkspaces[0]?.slug ?? null;

    if (activeWorkspaceSlug !== nextActiveWorkspaceSlug) {
      setActiveWorkspaceSlug(nextActiveWorkspaceSlug);
    }
  }, [activeWorkspaceSlug, activeWorkspaces, allWorkspaces, setActiveWorkspaceSlug]);

  const workspaceSlug = activeWorkspace?.slug ?? null;

  useEffect(() => {
    if (!workspaceSlug) {
      return;
    }
    void api.openWorkspace(workspaceSlug)
      .then(() => queryClient.invalidateQueries({ queryKey: ["workspaces"] }))
      .catch(() => undefined);
  }, [workspaceSlug]);

  const taxonomyQuery = useQuery({
    queryKey: ["taxonomy", workspaceSlug],
    queryFn: () => api.listTaxonomy(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const schemasQuery = useQuery({
    queryKey: ["schemas", workspaceSlug],
    queryFn: () => api.listSchemas(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const cardsQuery = useQuery({
    queryKey: ["cards", workspaceSlug, deferredSearch, filters, sortMode],
    queryFn: () => api.searchCards(workspaceSlug!, filters, deferredSearch, sortMode),
    enabled: Boolean(workspaceSlug),
  });

  const backupsQuery = useQuery({
    queryKey: ["backups", workspaceSlug],
    queryFn: () => api.listBackups(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceHealthQuery = useQuery({
    queryKey: ["workspace-health", workspaceSlug],
    queryFn: () => api.getWorkspaceHealth(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceAssetHealthQuery = useQuery({
    queryKey: ["workspace-asset-health", workspaceSlug],
    queryFn: () => api.getWorkspaceAssetHealth(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceNotebookQuery = useQuery({
    queryKey: ["workspace-notebook", workspaceSlug],
    queryFn: () => api.getWorkspaceNotebook(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceAssetsQuery = useQuery({
    queryKey: ["workspace-assets", workspaceSlug],
    queryFn: () => api.listWorkspaceAssets(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const cardTypesQuery = useQuery({
    queryKey: ["card-types", workspaceSlug],
    queryFn: () => api.listCardTypes(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  useEffect(() => {
    if (!cardTypesQuery.data?.length) {
      return;
    }
    const selectedExists = selectedCardTypeSlug
      ? cardTypesQuery.data.some((item) => item.slug === selectedCardTypeSlug)
      : false;
    if (!selectedExists) {
      setSelectedCardTypeSlug(cardTypesQuery.data[0].slug);
    }
  }, [cardTypesQuery.data, selectedCardTypeSlug, setSelectedCardTypeSlug]);

  const tableDataQuery = useQuery({
    queryKey: [
      "card-type-table",
      workspaceSlug,
      selectedCardTypeSlug,
      tableSearch,
      tableSortBy,
      tableSortDir,
      tableStatusFilter,
    ],
    queryFn: () =>
      api.getCardTypeTable(
        workspaceSlug!,
        selectedCardTypeSlug!,
        tableSearch,
        tableSortBy,
        tableSortDir,
        tableStatusFilter,
      ),
    enabled: Boolean(workspaceSlug && selectedCardTypeSlug),
  });

  const selectedIdFromRoute = (() => {
    const match = location.pathname.match(/^\/cards\/(\d+)$/);
    return match ? Number(match[1]) : null;
  })();
  const effectiveSelectedCardId = selectedIdFromRoute ?? selectedCardId;

  useEffect(() => {
    if (!workspaceSlug || !cardsQuery.data) {
      return;
    }
    if (!cardsQuery.data.items.length) {
      setSelectedCardId(null);
      navigate("/", { replace: true });
      return;
    }
    const routedExists = selectedIdFromRoute
      ? cardsQuery.data.items.some((item) => item.id === selectedIdFromRoute)
      : false;
    if (routedExists && selectedIdFromRoute !== selectedCardId) {
      setSelectedCardId(selectedIdFromRoute);
      return;
    }
    if (selectedIdFromRoute) {
      return;
    }
    const currentExists = effectiveSelectedCardId
      ? cardsQuery.data.items.some((item) => item.id === effectiveSelectedCardId)
      : false;
    if (!currentExists) {
      const nextId = cardsQuery.data.items[0].id;
      setSelectedCardId(nextId);
      navigate(`/cards/${nextId}`, { replace: true });
    }
  }, [
    cardsQuery.data,
    effectiveSelectedCardId,
    navigate,
    selectedCardId,
    selectedIdFromRoute,
    setSelectedCardId,
    workspaceSlug,
  ]);

  const cardQuery = useQuery({
    queryKey: ["card", workspaceSlug, effectiveSelectedCardId],
    queryFn: () => api.getCard(workspaceSlug!, effectiveSelectedCardId!),
    enabled: Boolean(workspaceSlug && effectiveSelectedCardId),
  });

  const refreshWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["app-info"] }),
      queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
      queryClient.invalidateQueries({ queryKey: ["taxonomy", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["schemas", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["cards", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["card", workspaceSlug, effectiveSelectedCardId] }),
      queryClient.invalidateQueries({ queryKey: ["backups", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-health", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-asset-health", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-notebook", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["card-types", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["card-type-table", workspaceSlug] }),
    ]);
  };

  const createWorkspaceMutation = useMutation({
    mutationFn: api.createWorkspace,
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Workspace "${workspace.name}" is ready.`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const importWorkspaceMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) => api.importWorkspace(file, name),
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Imported "${workspace.name}" from a local archive.`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const copyWorkspaceMutation = useMutation({
    mutationFn: ({ slug, name }: { slug: string; name: string }) => api.copyWorkspace(slug, name),
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Copied workspace as "${workspace.name}".`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.deleteWorkspace(slug),
    onSuccess: async () => {
      setWorkspaceMessage("Workspace deleted.");
      setActiveWorkspaceSlug(null);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
    },
  });

  const archiveWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.archiveWorkspace(slug),
    onSuccess: async () => {
      setWorkspaceMessage("Workspace moved to archive.");
      setActiveWorkspaceSlug(null);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
    },
  });

  const unarchiveWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.unarchiveWorkspace(slug),
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Workspace "${workspace.name}" is active again.`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: (slug: string) => api.createBackup(slug),
    onSuccess: async (backup) => {
      setWorkspaceMessage(`Backup created: ${backup.filename}`);
      await refreshWorkspace();
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: ({ slug, filename }: { slug: string; filename: string }) => api.deleteBackup(slug, filename),
    onSuccess: async () => {
      setWorkspaceMessage("Backup deleted.");
      await refreshWorkspace();
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: ({ slug, filename }: { slug: string; filename: string }) => api.restoreBackup(slug, filename),
    onSuccess: async (result) => {
      setWorkspaceMessage(`Workspace restored. Safety backup: ${result.safety_backup.filename}`);
      setActiveWorkspaceSlug(result.workspace.slug);
      await refreshWorkspace();
    },
  });

  const exportWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.exportWorkspace(slug),
    onSuccess: async (result) => {
      setWorkspaceMessage(`Archive created at ${result.path}`);
      await refreshWorkspace();
    },
  });

  const createCardMutation = useMutation({
    mutationFn: () => api.createCard(workspaceSlug!, { title: "Untitled Card" }),
    onSuccess: async (card) => {
      await refreshWorkspace();
      setSelectedCardId(card.id);
      navigate(`/cards/${card.id}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => api.reorderCards(workspaceSlug!, orderedIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cards", workspaceSlug] });
    },
  });

  const detailWidth = `${Math.round((1 - dividerRatio) * 100)}%`;
  const atlasWidth = `${Math.round(dividerRatio * 100)}%`;
  const workspaceBusy =
    createWorkspaceMutation.isPending ||
    importWorkspaceMutation.isPending ||
    copyWorkspaceMutation.isPending ||
    deleteWorkspaceMutation.isPending ||
    archiveWorkspaceMutation.isPending ||
    unarchiveWorkspaceMutation.isPending ||
    createBackupMutation.isPending ||
    deleteBackupMutation.isPending ||
    restoreBackupMutation.isPending ||
    exportWorkspaceMutation.isPending;

  function beginDividerDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = dividerRatio;
    const onMove = (moveEvent: MouseEvent) => {
      if (detailPanePosition === "bottom") {
        const delta = moveEvent.clientY - startY;
        const height = window.innerHeight;
        setDividerRatio(initial + delta / height);
        return;
      }
      const delta = moveEvent.clientX - startX;
      const width = window.innerWidth;
      setDividerRatio(initial + delta / width);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function beginNotebookDividerDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const initial = notebookRatio;
    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const width = window.innerWidth;
      setNotebookRatio(initial + delta / width);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const filteredAssets = useMemo(() => {
    const items = workspaceAssetsQuery.data?.items ?? [];
    return items.filter((asset) => {
      const queryMatches =
        !assetLibrarySearch ||
        `${asset.id} ${asset.original_filename} ${asset.stored_filename}`
          .toLowerCase()
          .includes(assetLibrarySearch.toLowerCase());
      const typeMatches = !assetLibraryType || asset.asset_type === assetLibraryType;
      return queryMatches && typeMatches;
    });
  }, [assetLibrarySearch, assetLibraryType, workspaceAssetsQuery.data]);

  function downloadExportArtifact(exported: {
    filename: string;
    format: string;
    content_text?: string;
    content_json?: Array<Record<string, unknown>>;
    content_base64?: string;
  }) {
    let blob: Blob;
    if (exported.format === "xlsx" && exported.content_base64) {
      const binary = atob(exported.content_base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } else if (exported.format === "json") {
      blob = new Blob([JSON.stringify(exported.content_json ?? [], null, 2)], {
        type: "application/json",
      });
    } else {
      blob = new Blob([exported.content_text ?? ""], {
        type: "text/csv;charset=utf-8",
      });
    }
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = exported.filename;
    link.click();
    URL.revokeObjectURL(href);
  }

  async function exportCardTypeStructure(format: "json" | "csv" | "xlsx") {
    if (!workspaceSlug || !selectedCardTypeSlug) {
      return;
    }
    const exported = await api.exportCardTypeStructure(workspaceSlug, selectedCardTypeSlug, format);
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  async function exportCardTypeStructureForSlug(cardTypeSlug: string, format: "json" | "csv" | "xlsx") {
    if (!workspaceSlug || !cardTypeSlug) {
      return;
    }
    const exported = await api.exportCardTypeStructure(workspaceSlug, cardTypeSlug, format);
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  async function exportCardTypeTable(format: "json" | "csv" | "xlsx") {
    if (!workspaceSlug || !selectedCardTypeSlug) {
      return;
    }
    const exported = await api.exportCardTypeTable(
      workspaceSlug,
      selectedCardTypeSlug,
      format,
      tableSearch,
    );
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  async function exportWorkspaceData(
    format: "json" | "csv",
    includeAssetIds: boolean,
    selectedCardIds: number[] = [],
  ) {
    if (!workspaceSlug) {
      return;
    }
    const exported = await api.exportWorkspaceData(workspaceSlug, format, includeAssetIds, selectedCardIds);
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  return (
    <div className={`app-shell theme-${activeWorkspace?.theme ?? "fantasy"}`}>
      <div className="constellation" />
      <WorkspaceControls
        workspaces={activeWorkspaces}
        activeWorkspace={activeWorkspace}
        archivedCount={archivedWorkspaces.length}
        search={search}
        activeScreen={activeScreen}
        filters={filters}
        taxonomyTerms={taxonomyQuery.data ?? []}
        onSearchChange={setSearch}
        onScreenChange={setActiveScreen}
        onSelectWorkspace={(slug) => {
          setActiveWorkspaceSlug(slug || null);
          setWorkspaceMessage(null);
        }}
        onToggleWorkspaceManager={() => setShowWorkspaceManager(!showWorkspaceManager)}
        workspaceManagerOpen={showWorkspaceManager}
        onOpenSchemaStudio={() => setSchemaStudioOpen(true)}
        onFiltersChange={setFilters}
      />

      {showWorkspaceManager ? (
        <Suspense fallback={<div className="modal-backdrop"><div className="modal-card compact-modal"><h2>Loading workspace tools…</h2></div></div>}>
          <WorkspaceManagerPanel
          appInfo={appInfoQuery.data ?? null}
          backendStatus={backendHealthQuery.data?.status ?? "offline"}
          workspaces={activeWorkspaces}
          activeWorkspace={activeWorkspace}
          selectedCard={cardQuery.data ?? null}
          archivedWorkspaces={archivedWorkspaces}
          backups={backupsQuery.data ?? []}
          health={workspaceHealthQuery.data ?? null}
          assetHealth={workspaceAssetHealthQuery.data ?? null}
          assets={filteredAssets}
          message={workspaceMessage}
          busy={workspaceBusy}
          assetLibraryQuery={assetLibrarySearch}
          assetLibraryType={assetLibraryType}
          onClose={() => setShowWorkspaceManager(false)}
          onSelectWorkspace={(slug) => {
            setActiveWorkspaceSlug(slug);
            setWorkspaceMessage(null);
          }}
          onCreateWorkspace={async (payload) => {
            const workspace = await createWorkspaceMutation.mutateAsync(payload);
            setShowWorkspaceManager(false);
            return workspace;
          }}
          onReorderWorkspaces={async (orderedSlugs) => {
            await api.reorderWorkspaces(orderedSlugs);
            await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
          }}
          onAssetLibraryQueryChange={setAssetLibrarySearch}
          onAssetLibraryTypeChange={setAssetLibraryType}
          onAttachAsset={async (assetId, role) => {
            if (!workspaceSlug || !effectiveSelectedCardId) {
              setWorkspaceMessage("Choose a card first.");
              return;
            }
            await api.attachWorkspaceAsset(workspaceSlug, assetId, {
              card_id: effectiveSelectedCardId,
              role,
              set_as_cover: role === "gallery",
            });
            await refreshWorkspace();
            setWorkspaceMessage(`Asset attached to ${role}.`);
          }}
          onAttachSourceAsset={async (assetId, sourceId) => {
            if (!workspaceSlug) {
              return;
            }
            await api.attachExistingSourceAsset(workspaceSlug, sourceId, assetId);
            await refreshWorkspace();
            setWorkspaceMessage("Asset attached to source.");
          }}
          onDeleteAsset={async (assetId) => {
            if (!workspaceSlug) {
              return;
            }
            await api.deleteWorkspaceAsset(workspaceSlug, assetId);
            await refreshWorkspace();
            setWorkspaceMessage("Unused asset deleted.");
          }}
          onRepairWorkspaceHealth={async (action) => {
            if (!workspaceSlug) {
              return;
            }
            const result = await api.repairWorkspaceHealth(workspaceSlug, action);
            await refreshWorkspace();
            setWorkspaceMessage(result.message);
          }}
          onRepairAssetHealth={async (action) => {
            if (!workspaceSlug) {
              return;
            }
            const result = await api.repairWorkspaceAssetHealth(workspaceSlug, action);
            await refreshWorkspace();
            setWorkspaceMessage(result.message);
          }}
          onRenameWorkspace={async (name, description) => {
            if (!workspaceSlug) {
              return;
            }
            await api.updateWorkspace(workspaceSlug, { name, description });
            await refreshWorkspace();
            setWorkspaceMessage(`Database "${name}" updated.`);
          }}
          onDuplicateWorkspace={async (name) => {
            if (!workspaceSlug) {
              return;
            }
            await copyWorkspaceMutation.mutateAsync({ slug: workspaceSlug, name });
          }}
          onDeleteWorkspace={async () => {
            if (!workspaceSlug || !activeWorkspace) {
              return;
            }
            const confirmed = window.confirm(
              `Delete "${activeWorkspace.name}" permanently? A safety archive will be created first.`,
            );
            if (!confirmed) {
              return;
            }
            await deleteWorkspaceMutation.mutateAsync(workspaceSlug);
          }}
          onCreateBackup={async () => {
            if (!workspaceSlug) {
              return;
            }
            await createBackupMutation.mutateAsync(workspaceSlug);
          }}
          onExportWorkspace={async () => {
            if (!workspaceSlug) {
              return;
            }
            await exportWorkspaceMutation.mutateAsync(workspaceSlug);
          }}
          onExportWorkspaceData={async (includeAssetIds) => {
            await exportWorkspaceData("json", includeAssetIds);
          }}
          onArchiveWorkspace={async () => {
            if (!workspaceSlug || !activeWorkspace) {
              return;
            }
            const confirmed = window.confirm(
              `Archive "${activeWorkspace.name}"? Its local files will stay on disk, but it will leave the active list.`,
            );
            if (!confirmed) {
              return;
            }
            await archiveWorkspaceMutation.mutateAsync(workspaceSlug);
          }}
          onUnarchiveWorkspace={async (slug) => {
            await unarchiveWorkspaceMutation.mutateAsync(slug);
          }}
          onImportWorkspace={(file, name) => importWorkspaceMutation.mutateAsync({ file, name })}
          onRestoreBackup={async (filename) => {
            if (!workspaceSlug) {
              return;
            }
            const confirmed = window.confirm(
              "Restore this backup? Current data will be replaced and a safety backup will be created first.",
            );
            if (!confirmed) {
              return;
            }
            await restoreBackupMutation.mutateAsync({ slug: workspaceSlug, filename });
          }}
          onDeleteBackup={async (filename) => {
            if (!workspaceSlug) {
              return;
            }
            const confirmed = window.confirm("Delete this backup permanently?");
            if (!confirmed) {
              return;
            }
            await deleteBackupMutation.mutateAsync({ slug: workspaceSlug, filename });
          }}
          />
        </Suspense>
      ) : null}

      {activeWorkspace && workspaceSlug ? (
        <main className="workspace-main-layout">
          {showNotebook ? (
            <>
              <div className="notebook-column" style={{ width: `${Math.round(notebookRatio * 100)}%` }}>
                <Suspense fallback={<div className="empty-block">Loading notebook…</div>}>
                  <WorkspaceNotebookPanel
                    notebook={workspaceNotebookQuery.data ?? null}
                    visible={showNotebook}
                    onToggleVisible={() => setShowNotebook(false)}
                    onSave={async (payload) => {
                      await api.updateWorkspaceNotebook(workspaceSlug, payload);
                      await refreshWorkspace();
                      setWorkspaceMessage("Notebook saved.");
                    }}
                  />
                </Suspense>
              </div>
              <div
                ref={notebookDividerRef}
                className="drag-divider notebook-divider"
                onMouseDown={beginNotebookDividerDrag}
                role="separator"
                aria-orientation="vertical"
              />
            </>
          ) : (
            <Suspense fallback={<div className="empty-block">Loading notebook…</div>}>
              <WorkspaceNotebookPanel
                notebook={workspaceNotebookQuery.data ?? null}
                visible={showNotebook}
                onToggleVisible={() => setShowNotebook(true)}
                onSave={async (payload) => {
                  await api.updateWorkspaceNotebook(workspaceSlug, payload);
                  await refreshWorkspace();
                  setWorkspaceMessage("Notebook saved.");
                }}
              />
            </Suspense>
          )}
          <div className="workspace-content-column">
            <div className={`atlas-layout ${detailPanePosition === "bottom" ? "stacked" : ""}`}>
              <div className="atlas-column" style={{ width: atlasWidth }}>
                {activeScreen === "table" ? (
                  <Suspense fallback={<div className="empty-block">Loading table view…</div>}>
                    <TableViewPane
                      cardTypes={cardTypesQuery.data ?? []}
                      selectedCardTypeSlug={selectedCardTypeSlug}
                      tableData={tableDataQuery.data ?? null}
                      query={tableSearch}
                      sortBy={tableSortBy}
                      sortDir={tableSortDir}
                      statusFilter={tableStatusFilter}
                      onCardTypeChange={(slug) => setSelectedCardTypeSlug(slug || null)}
                      onQueryChange={setTableSearch}
                      onSortChange={(sortBy, sortDir) => {
                        setTableSortBy(sortBy);
                        setTableSortDir(sortDir);
                      }}
                      onStatusFilterChange={setTableStatusFilter}
                      onSelectCard={(cardId) => {
                        setSelectedCardId(cardId);
                        navigate(`/cards/${cardId}`);
                      }}
                      onExportStructure={exportCardTypeStructure}
                      onExportTable={exportCardTypeTable}
                      onExportSelected={(selectedCardIds, includeAssetIds) =>
                        exportWorkspaceData("json", includeAssetIds, selectedCardIds)
                      }
                      onCreateRow={async (payload) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        const result = await api.createCardTypeRow(workspaceSlug, selectedCardTypeSlug, payload);
                        await refreshWorkspace();
                        setWorkspaceMessage("Table row created.");
                        return result;
                      }}
                      onUpdateRow={async (cardId, payload) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        const result = await api.updateCardTypeRow(workspaceSlug, selectedCardTypeSlug, cardId, payload);
                        await refreshWorkspace();
                        setWorkspaceMessage("Table row saved.");
                        return result;
                      }}
                      onDeleteRow={async (cardId) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        await api.deleteCardTypeRow(workspaceSlug, selectedCardTypeSlug, cardId);
                        await refreshWorkspace();
                        setWorkspaceMessage("Table row archived.");
                      }}
                      onPreviewImport={async (format, contentText, contentBase64, filename) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        return api.previewCardTypeImport(
                          workspaceSlug,
                          selectedCardTypeSlug,
                          format,
                          contentText,
                          contentBase64,
                          filename,
                        );
                      }}
                      onApplyImport={async (format, contentText, contentBase64, filename) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        const result = await api.applyCardTypeImport(
                          workspaceSlug,
                          selectedCardTypeSlug,
                          format,
                          contentText,
                          contentBase64,
                          filename,
                        );
                        await refreshWorkspace();
                        setWorkspaceMessage(
                          `Import complete: ${result.rows_created} created, ${result.rows_updated} updated, ${result.rows_skipped} skipped.`,
                        );
                        return result;
                      }}
                    />
                  </Suspense>
                ) : (
                  <AtlasPane
                    cards={cardsQuery.data?.items ?? []}
                    totalCards={activeWorkspace?.card_count ?? cardsQuery.data?.items.length ?? 0}
                    query={deferredSearch}
                    filters={filters}
                    selectedCardId={effectiveSelectedCardId}
                    viewMode={viewMode}
                    sortMode={sortMode}
                    showSummary={showSummary}
                    showCover={showCover}
                    groupByCategory={groupByCategory}
                    schemas={schemasQuery.data ?? []}
                    detailPanePosition={detailPanePosition}
                    onSelectCard={(cardId) => {
                      setSelectedCardId(cardId);
                      navigate(`/cards/${cardId}`);
                    }}
                    onReorderGroup={(orderedIds) => reorderMutation.mutate(orderedIds)}
                    onViewModeChange={setViewMode}
                    onSortModeChange={setSortMode}
                    onShowSummaryChange={setShowSummary}
                    onShowCoverChange={setShowCover}
                    onGroupByCategoryChange={setGroupByCategory}
                    onCreateCard={() => void createCardMutation.mutateAsync()}
                    onOpenCardTypeStudio={() => setSchemaStudioOpen(true)}
                    onExportSelectedCardTypeStructure={(schemaId) => {
                      void exportCardTypeStructureForSlug(schemaId, "csv");
                    }}
                    onDetailPanePositionChange={setDetailPanePosition}
                    onOpenTableView={() => setActiveScreen("table")}
                  />
                )}
              </div>
              <div
                ref={dividerRef}
                className="drag-divider"
                onMouseDown={beginDividerDrag}
                role="separator"
                aria-orientation={detailPanePosition === "bottom" ? "horizontal" : "vertical"}
              />
              <div className="detail-column" style={detailPanePosition === "bottom" ? { height: detailWidth } : { width: detailWidth }}>
                <DetailPane
                  workspaceSlug={workspaceSlug}
                  card={cardQuery.data ?? null}
                  query={deferredSearch}
                  taxonomyTerms={taxonomyQuery.data ?? []}
                  schemas={schemasQuery.data ?? []}
                  allCards={cardsQuery.data?.items ?? []}
                  onRefresh={refreshWorkspace}
                  onDeleteCurrent={async () => {
                    if (!workspaceSlug || !effectiveSelectedCardId) {
                      return;
                    }
                    const confirmed = window.confirm("Delete this card?");
                    if (!confirmed) {
                      return;
                    }
                    await api.deleteCard(workspaceSlug, effectiveSelectedCardId);
                    await refreshWorkspace();
                  }}
                  onOpenCard={(cardId) => {
                    setSelectedCardId(cardId);
                    navigate(`/cards/${cardId}`);
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      ) : (
        <section className="empty-stage">
          <StateNotice
            title="No active workspace selected"
            description="Create a new workspace, import a local archive, or unarchive an existing workspace to continue."
          />
        </section>
      )}

      {schemaStudioOpen && workspaceSlug ? (
        <Suspense fallback={<div className="modal-backdrop"><div className="modal-card compact-modal"><h2>Loading studio…</h2></div></div>}>
          <SchemaStudio
            workspaceSlug={workspaceSlug}
            terms={taxonomyQuery.data ?? []}
            schemas={schemasQuery.data ?? []}
            onClose={() => setSchemaStudioOpen(false)}
            onSaved={refreshWorkspace}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

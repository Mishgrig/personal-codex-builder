import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { queryClient } from "../app/queryClient";
import { useUIStore } from "../app/store";
import { SchemaStudio } from "../components/SchemaStudio";
import { AtlasPane } from "../features/atlas/AtlasPane";
import { DetailPane } from "../features/detail/DetailPane";
import { WorkspaceControls } from "../features/workspaces/WorkspaceControls";
import { WorkspaceManagerPanel } from "../features/workspaces/WorkspaceManagerPanel";
import { StateNotice } from "../shared/components/StateNotice";

export function CodexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const {
    activeWorkspaceSlug,
    selectedCardId,
    search,
    filters,
    viewMode,
    sortMode,
    showSummary,
    showCover,
    dividerRatio,
    schemaStudioOpen,
    setActiveWorkspaceSlug,
    setSelectedCardId,
    setSearch,
    setFilters,
    setViewMode,
    setSortMode,
    setShowSummary,
    setShowCover,
    setDividerRatio,
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

  const uploadLogoMutation = useMutation({
    mutationFn: ({ slug, file }: { slug: string; file: File }) => api.uploadWorkspaceLogo(slug, file),
    onSuccess: async () => {
      setWorkspaceMessage("Workspace logo updated.");
      await refreshWorkspace();
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
    uploadLogoMutation.isPending ||
    archiveWorkspaceMutation.isPending ||
    unarchiveWorkspaceMutation.isPending ||
    createBackupMutation.isPending ||
    deleteBackupMutation.isPending ||
    restoreBackupMutation.isPending ||
    exportWorkspaceMutation.isPending;

  function beginDividerDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const initial = dividerRatio;
    const onMove = (moveEvent: MouseEvent) => {
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

  return (
    <div className={`app-shell theme-${activeWorkspace?.theme ?? "fantasy"}`}>
      <div className="constellation" />
      <WorkspaceControls
        workspaces={activeWorkspaces}
        activeWorkspace={activeWorkspace}
        archivedCount={archivedWorkspaces.length}
        search={search}
        filters={filters}
        taxonomyTerms={taxonomyQuery.data ?? []}
        onSearchChange={setSearch}
        onSelectWorkspace={(slug) => {
          setActiveWorkspaceSlug(slug || null);
          setWorkspaceMessage(null);
        }}
        onCreateWorkspace={(payload) => createWorkspaceMutation.mutateAsync(payload)}
        onCopyWorkspace={async () => {
          if (!activeWorkspace) {
            return;
          }
          const name = window.prompt("Name for the copied workspace", `${activeWorkspace.name} Copy`);
          if (!name) {
            return;
          }
          await copyWorkspaceMutation.mutateAsync({ slug: activeWorkspace.slug, name });
        }}
        onDeleteWorkspace={async () => {
          if (!activeWorkspace) {
            return;
          }
          const confirmed = window.confirm(`Delete "${activeWorkspace.name}" and all local files?`);
          if (!confirmed) {
            return;
          }
          await deleteWorkspaceMutation.mutateAsync(activeWorkspace.slug);
        }}
        onOpenSchemaStudio={() => setSchemaStudioOpen(true)}
        onCreateCard={() => createCardMutation.mutateAsync()}
        onUploadLogo={(file) => uploadLogoMutation.mutateAsync({ slug: workspaceSlug!, file })}
        onFiltersChange={setFilters}
      />

      <WorkspaceManagerPanel
        appInfo={appInfoQuery.data ?? null}
        backendStatus={backendHealthQuery.data?.status ?? "offline"}
        activeWorkspace={activeWorkspace}
        archivedWorkspaces={archivedWorkspaces}
        backups={backupsQuery.data ?? []}
        health={workspaceHealthQuery.data ?? null}
        message={workspaceMessage}
        busy={workspaceBusy}
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

      {activeWorkspace && workspaceSlug ? (
        <main className="atlas-layout">
          <div className="atlas-column" style={{ width: atlasWidth }}>
            <AtlasPane
              cards={cardsQuery.data?.items ?? []}
              query={deferredSearch}
              filters={filters}
              selectedCardId={effectiveSelectedCardId}
              viewMode={viewMode}
              sortMode={sortMode}
              showSummary={showSummary}
              showCover={showCover}
              schemas={schemasQuery.data ?? []}
              onSelectCard={(cardId) => {
                setSelectedCardId(cardId);
                navigate(`/cards/${cardId}`);
              }}
              onReorderGroup={(orderedIds) => reorderMutation.mutate(orderedIds)}
              onViewModeChange={setViewMode}
              onSortModeChange={setSortMode}
              onShowSummaryChange={setShowSummary}
              onShowCoverChange={setShowCover}
            />
          </div>
          <div
            ref={dividerRef}
            className="drag-divider"
            onMouseDown={beginDividerDrag}
            role="separator"
            aria-orientation="vertical"
          />
          <div className="detail-column" style={{ width: detailWidth }}>
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
            />
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
        <SchemaStudio
          workspaceSlug={workspaceSlug}
          terms={taxonomyQuery.data ?? []}
          schemas={schemasQuery.data ?? []}
          onClose={() => setSchemaStudioOpen(false)}
          onSaved={refreshWorkspace}
        />
      ) : null}
    </div>
  );
}

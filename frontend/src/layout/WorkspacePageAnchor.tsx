import { type ReactNode } from "react";
import { BookOpen, Home, Images, MapPin, Milestone, Settings2, Swords, Table2, Users } from "lucide-react";
import type { WorkspaceScreen } from "../app/store";

export function WorkspacePageAnchor({
  workspaceName,
  workspaceDescription,
  activeScreen,
  onScreenChange,
  onOpenManager,
}: {
  workspaceName: string;
  workspaceDescription?: string;
  activeScreen: WorkspaceScreen;
  onScreenChange: (screen: WorkspaceScreen) => void;
  onOpenManager: () => void;
}) {
  const anchor = pageAnchorMetadata(activeScreen, workspaceName, workspaceDescription);
  const actions: Array<{ screen: WorkspaceScreen; label: string; icon: ReactNode; title: string }> = [
    { screen: "home", label: "Homepage", icon: <Home size={14} />, title: "Open world homepage" },
    { screen: "chapters", label: "Chapters", icon: <Swords size={14} />, title: "Open Chapters and scenes" },
    { screen: "atlas", label: "Wiki", icon: <BookOpen size={14} />, title: "Open Wiki workspace" },
    { screen: "characters", label: "Characters", icon: <Users size={14} />, title: "Open Characters" },
    { screen: "locations", label: "Locations", icon: <MapPin size={14} />, title: "Open Locations" },
    { screen: "plots", label: "Plots", icon: <Milestone size={14} />, title: "Open Plots and Chronology" },
    { screen: "board", label: "Boards", icon: <Images size={14} />, title: "Open Boards and Moodboards" },
    { screen: "table", label: "Table View", icon: <Table2 size={14} />, title: "Open table view" },
  ];

  return (
    <section className="home-hero page-anchor">
      <div className="home-hero-utility">
        <button className="secondary-button" title="Open world management" onClick={onOpenManager}>
          <Settings2 size={14} />
          Manage world
        </button>
      </div>
      <div>
        <span className="eyebrow">{anchor.eyebrow}</span>
        <h1>{anchor.title}</h1>
        <p>{anchor.description}</p>
        <div className="home-hero-actions">
          {actions.map((action) => {
            const active = action.screen === activeScreen || (activeScreen === "campaign" && action.screen === "chapters");
            return (
              <button
                key={action.screen}
                className={active ? "primary-button" : "secondary-button"}
                title={action.title}
                onClick={() => onScreenChange(action.screen)}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function pageAnchorMetadata(screen: WorkspaceScreen, workspaceName: string, workspaceDescription?: string) {
  if (screen === "atlas") {
    return {
      eyebrow: workspaceName,
      title: "Wiki",
      description: "Browse and prepare lore, factions, items, history and custom entities for this world.",
    };
  }
  if (screen === "characters") {
    return {
      eyebrow: workspaceName,
      title: "Characters",
      description: "Work with player characters, NPCs, creatures, roles and relationship-ready profiles.",
    };
  }
  if (screen === "locations") {
    return {
      eyebrow: workspaceName,
      title: "Locations",
      description: "Collect places, regions, settlements and map-ready location notes.",
    };
  }
  if (screen === "plots") {
    return {
      eyebrow: workspaceName,
      title: "Plots",
      description: "Arrange timelines, corkboards, events and story threads connected to world entities.",
    };
  }
  if (screen === "chapters" || screen === "campaign") {
    return {
      eyebrow: workspaceName,
      title: "Chapters",
      description: "Prepare chapters, scenes, linked materials and local Play Mode structure.",
    };
  }
  if (screen === "board") {
    return {
      eyebrow: workspaceName,
      title: "Boards",
      description: "Use visual boards and moodboards for spatial references, links, images and entity arrangements.",
    };
  }
  if (screen === "table") {
    return {
      eyebrow: workspaceName,
      title: "Table View",
      description: "Review and edit entities in a structured table for fast cleanup and comparison.",
    };
  }
  return {
    eyebrow: workspaceName,
    title: "Homepage",
    description: "Sweet home of your mind.",
  };
}

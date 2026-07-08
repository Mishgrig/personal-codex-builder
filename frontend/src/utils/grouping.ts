import type { CardListItem, SearchFilters, TaxonomyTerm } from "../types/models";

export interface CardGroup {
  key: string;
  label: string;
  cards: CardListItem[];
}

export function termLabel(card: CardListItem, category: string) {
  return card.taxonomy_terms.find((term) => term.category === category)?.label ?? "Uncategorized";
}

export function groupCards(cards: CardListItem[], filters: SearchFilters): CardGroup[] {
  const category = filters.domain ? "type" : "domain";
  const groups = new Map<string, CardListItem[]>();
  for (const card of cards) {
    const label = termLabel(card, category);
    const bucket = groups.get(label) ?? [];
    bucket.push(card);
    groups.set(label, bucket);
  }
  return Array.from(groups.entries()).map(([label, groupCards]) => ({
    key: label,
    label,
    cards: groupCards,
  }));
}

export function termsByCategory(terms: TaxonomyTerm[]) {
  return {
    domain: terms.filter((term) => term.category === "domain"),
    type: terms.filter((term) => term.category === "type"),
    subtype: terms.filter((term) => term.category === "subtype"),
    layer: terms.filter((term) => term.category === "layer"),
  };
}


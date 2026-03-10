import 'server-only';

import { sha256 } from '@/lib/server/security';
import { type Project, type RefinedOutput, normalizeProject } from '@/lib/project-types';

const STOP_WORDS = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'and', 'in', 'on', 'with', 'by']);

export interface ExportStory {
  storyId: string;
  storyTitle: string;
  output: RefinedOutput;
}

export interface FeatureGroup {
  logicalKey: string;
  title: string;
  stories: ExportStory[];
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((part) => part && !STOP_WORDS.has(part));
}

function toTitleCase(input: string): string {
  return input
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function featureKeyFromTitle(title: string): string {
  const words = normalizeWords(title).slice(0, 3);
  if (words.length === 0) {
    return 'general';
  }
  return words.join('-');
}

export function collectStoriesForExport(rawProject: unknown): ExportStory[] {
  const project = normalizeProject(rawProject as Partial<Project>);
  const allStories = [...project.storyCandidates, ...project.customStories];

  return allStories
    .filter((story) => project.selectedStoryIds.includes(story.id))
    .map((story) => ({
      storyId: story.id,
      storyTitle: story.title,
      output: project.finalOutputByStoryId[story.id],
    }))
    .filter((entry): entry is ExportStory => Boolean(entry.output));
}

export function groupStoriesIntoFeatures(stories: ExportStory[]): FeatureGroup[] {
  const grouped = new Map<string, FeatureGroup>();
  for (const story of stories) {
    const key = featureKeyFromTitle(story.output.storyTitle || story.storyTitle);
    const title = toTitleCase(key.replace(/-/g, ' '));
    const logicalKey = `feature:${key}`;
    const existing = grouped.get(logicalKey);
    if (existing) {
      existing.stories.push(story);
    } else {
      grouped.set(logicalKey, {
        logicalKey,
        title,
        stories: [story],
      });
    }
  }
  return Array.from(grouped.values());
}

export function makeFeatureContentHash(group: FeatureGroup): string {
  const text = `${group.title}|${group.stories
    .map((story) => `${story.storyId}:${makeStoryContentHash(story)}`)
    .sort()
    .join('|')}`;
  return sha256(text);
}

export function makeStoryContentHash(story: ExportStory): string {
  const output = story.output;
  const text = [
    output.storyTitle,
    output.userStoryStatement,
    ...(output.acceptanceCriteria || []),
    ...(output.technicalNotes || []),
    ...(output.notIncluded || []),
    ...(output.assumptions || []),
    ...(output.openQuestions || []),
  ].join('|');
  return sha256(text);
}

export function toWorkItemDescription(story: ExportStory): string {
  const output = story.output;
  const sections = [
    `<p><b>User Story</b>: ${escapeHtml(output.userStoryStatement || story.storyTitle)}</p>`,
    output.technicalNotes.length > 0
      ? `<p><b>Technical Notes</b>: ${escapeHtml(output.technicalNotes.join(' | '))}</p>`
      : '',
    output.notIncluded.length > 0
      ? `<p><b>Not Included</b>: ${escapeHtml(output.notIncluded.join(' | '))}</p>`
      : '',
    output.assumptions.length > 0
      ? `<p><b>Assumptions</b>: ${escapeHtml(output.assumptions.join(' | '))}</p>`
      : '',
    output.openQuestions.length > 0
      ? `<p><b>Open Questions</b>: ${escapeHtml(output.openQuestions.join(' | '))}</p>`
      : '',
  ];
  return sections.filter(Boolean).join('');
}

export function toAcceptanceCriteria(output: RefinedOutput): string {
  if (!output.acceptanceCriteria || output.acceptanceCriteria.length === 0) {
    return '';
  }
  const rows = output.acceptanceCriteria.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<ul>${rows}</ul>`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

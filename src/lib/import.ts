import { strFromU8, unzipSync } from 'fflate';
import type { Difficulty } from './problem-references';
export type Section = { id: string; title: string; content: string };
export type ImportedProblem = { id: string; title: string; category: string; difficulty?: Difficulty; sourcePath: string; original: string; description: string; url: string; sections: Section[] };
export const PARSER_VERSION = 2;
const clean = (s: string) => s.replace(/\s+[a-f0-9]{32}$/i, '').trim();
export function parseMarkdown(path: string, original: string): ImportedProblem {
  const lines = original.replace(/\r\n/g, '\n').split('\n');
  const title = lines.find(l => /^#\s/.test(l))?.replace(/^#\s+/, '').trim() || clean(path.split('/').pop()!.replace(/\.md$/i, ''));
  const category = clean(path.split('/').at(-2) || 'Uncategorized');
  const sections: Section[] = [];
  let approach = '', label = 'Notes', buffer: string[] = [], fence = '', code: string[] = [], skippedTitle = false;
  const push = (title: string, content: string) => { if (content.trim()) sections.push({ id: String(sections.length), title, content: content.trim() }); };
  const flush = () => { push(label, buffer.join('\n')); buffer = []; };
  const finishCode = (closed: boolean) => {
    // Keep the full code untouched and additionally expose explicit complexity comments.
    push(`${approach ? approach + ' ' : ''}Code`, code.join('\n'));
    const body = code.slice(1, closed ? -1 : undefined);
    let start = body.length;
    while (start > 0 && (/^\s*#/.test(body[start - 1]) || !body[start - 1].trim())) start--;
    let field = '', notes: string[] = [];
    const save = () => { if (field) push(`${approach ? approach + ' ' : ''}${field}`, notes.join('\n')); };
    for (const line of body.slice(start)) {
      const comment = line.replace(/^\s*#\s?/, '');
      const match = line.match(/^\s*#\s*(runtime|run|time|space)(?:\s+complexity)?(?:\s*[:=]\s*|\s+)(\S.*)$/i);
      if (match) {
        save(); field = /^space$/i.test(match[1]) ? 'Space complexity' : 'Runtime'; notes = [comment];
      } else if (field) notes.push(comment);
    }
    save();
    fence = ''; code = [];
  };

  for (const line of lines) {
    if (!skippedTitle && /^#\s/.test(line)) { skippedTitle = true; continue; }
    if (fence) {
      code.push(line);
      if (new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line)) { finishCode(true); }
      continue;
    }
    const opening = line.match(/^\s*(`{3,}|~{3,})/);
    if (opening) { flush(); fence = opening[1]; code = [line]; continue; }
    const heading = line.match(/^#{2,6}\s+(.+)/);
    const followup = line.match(/^\s*[-*]?\s*(follow[ -]?up\b.*)/i);
    if (heading || followup) { flush(); const name = heading?.[1] || 'Follow-up'; approach = name.replace(/\s+(notes?|code|complexity)$/i, ''); label = name; if (followup) buffer.push(line); continue; }
    const complexity = line.match(/^\s*[-*]?\s*(runtime|time(?: complexity)?|space(?: complexity)?)\s*[:=]/i);
    if (complexity) { flush(); push(`${approach ? approach + ' ' : ''}${/^space/i.test(complexity[1]) ? 'Space complexity' : 'Runtime'}`, line); continue; }
    buffer.push(line);
  }
  if (fence) finishCode(false);
  flush();
  for (const [title, pattern] of [['Runtime', /runtime|time complexity/i], ['Space complexity', /space complexity/i]] as const) {
    if (!sections.some(s => pattern.test(s.title))) sections.push({ id: String(sections.length), title, content: '' });
  }
  const approaches = Array.from(new Set(sections.filter(s => / Code$/.test(s.title)).map(s => s.title.replace(/ Code$/, ''))));
  for (const name of approaches) for (const field of ['Runtime', 'Space complexity']) {
    if (!sections.some(s => s.title.toLowerCase() === `${name} ${field}`.toLowerCase())) sections.push({ id: String(sections.length), title: `${name} ${field}`, content: '' });
  }
  const url = original.match(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/[^\s)\]<>]+/)?.[0] || '';
  const slug = url.match(/\/problems\/([^/]+)/)?.[1];
  const notionId = path.match(/([a-f0-9]{32})\.md$/i)?.[1];
  const normalized = title.toLowerCase().replace(/^\d+[.\s]*/, '').replace(/[^a-z0-9]/g, '');
  return { id: slug ? `leetcode:${slug}` : notionId ? `notion:${notionId}` : `title:${normalized}`, title, category, sourcePath: path, original, description: '', url, sections };
}
export function readArchive(data: Uint8Array) {
  const files = unzipSync(data);
  const markdown = Object.keys(files).filter(p => /\.md$/i.test(p) && !p.startsWith('__MACOSX/'));
  const pages = markdown.filter(path => {
    const prefix = path.slice(0, path.lastIndexOf('/') + 1) + clean(path.split('/').pop()!.replace(/\.md$/i, '')) + '/';
    return !markdown.some(other => other.startsWith(prefix));
  });
  return { problems: pages.map(p => parseMarkdown(p, strFromU8(files[p]))), assets: Object.entries(files).filter(([p]) => /\.(png|jpe?g|gif|webp)$/i.test(p)), skipped: markdown.length - pages.length };
}

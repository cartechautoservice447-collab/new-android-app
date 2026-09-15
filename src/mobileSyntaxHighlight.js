import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

const LANGUAGE_ALIASES = {
  py: 'python',
  python3: 'python',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
};

function normalizeLanguage(language = '') {
  const normalized = String(language).trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

export function highlightCode(code = '', language = 'python') {
  const normalized = normalizeLanguage(language || 'python');
  const grammar = Prism.languages[normalized] || Prism.languages.plain;
  const html = Prism.highlight(String(code), grammar, normalized);
  return html || Prism.util.encode(String(code));
}

export function getCodeLanguage(language = '') {
  const normalized = normalizeLanguage(language);
  return normalized || 'text';
}

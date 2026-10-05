import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeItemMarkdown } from '../dist/normalize.js';

function wrap(body) {
  return `<collectionItem>\n  <title>Metadata title</title>\n  <property name="field">Metadata value</property>\n  <content>\n${body.split('\n').map((line) => `    ${line}`).join('\n')}\n  </content>\n</collectionItem>\n`;
}

test('extracts body without metadata and preserves lists, fenced code, and hard line breaks', () => {
  const body = '## Heading\n\n- Parent\n  - Child\n\n```js\n  const value = 1;\n```\n\nLine  \nbreak';
  assert.equal(normalizeItemMarkdown(wrap(body)), body);
  assert.equal(normalizeItemMarkdown(wrap(body).replaceAll('\n', '\r\n')), body);
});

test('empty item metadata does not become a body', () => {
  assert.equal(normalizeItemMarkdown('<collectionItem>\n  <title>Empty</title>\n</collectionItem>'), '');
  assert.equal(normalizeItemMarkdown(''), '');
});

test('nested pages become headings and body Markdown with preserved relative indentation', () => {
  const page = '<page textStyle="card">\n  <pageTitle>Nested page</pageTitle>\n  <content>\n    - Parent\n      - Child\n    <page>\n      <pageTitle>Deeper</pageTitle>\n      <content>\n        **Deep body**\n      </content>\n    </page>\n  </content>\n</page>';
  assert.equal(normalizeItemMarkdown(wrap(page)), '### Nested page\n\n- Parent\n  - Child\n\n### Deeper\n\n**Deep body**');
});

test('literal wrapper tags in fenced code remain untouched', () => {
  const body = '````html\n<page>\n  <content>\n    example\n  </content>\n</page>\n```\n````';
  assert.equal(normalizeItemMarkdown(wrap(body)), body);
});

test('standalone callouts become asides without swallowing neighboring paragraphs', () => {
  const body = 'Before\n<callout>Keep **emphasis** and `code`.</callout>\nAfter';
  assert.equal(normalizeItemMarkdown(wrap(body)), 'Before\n\n<aside data-craft-callout role="note">\n\nKeep **emphasis** and `code`.\n\n</aside>\n\nAfter');
  const nested = '<page>\n  <pageTitle>Nested</pageTitle>\n  <content>\n    <callout>Nested note.</callout>\n  </content>\n</page>';
  assert.equal(normalizeItemMarkdown(wrap(nested)), '### Nested\n\n<aside data-craft-callout role="note">\n\nNested note.\n\n</aside>');
});

test('callout tags in code and inline examples remain literal', () => {
  const body = '```html\n<callout>Example</callout>\n```\n\n~~~html\n<callout>Example</callout>\n~~~\n\n    <callout>Indented code</callout>\n\nUse `<callout>Example</callout>` in documentation.';
  assert.equal(normalizeItemMarkdown(wrap(body), {
    callout() { assert.fail('Code examples must never reach the renderer'); },
  }), body);
});

test('consumer callout output is inserted once, including inside a nested page', () => {
  const body = '<page>\n  <pageTitle>Nested</pageTitle>\n  <content>\n    <callout>Keep **emphasis**.</callout>\n  </content>\n</page>';
  let calls = 0;
  assert.equal(normalizeItemMarkdown(wrap(body), {
    callout({ markdown }) {
      calls++;
      assert.equal(markdown, 'Keep **emphasis**.');
      return '<callout>Consumer-owned output</callout>';
    },
  }), '### Nested\n\n<callout>Consumer-owned output</callout>');
  assert.equal(calls, 1);
});

test('consumer callout renderer can fall back or omit, and rejects invalid return values', () => {
  const body = wrap('<callout>Keep</callout>');
  assert.equal(normalizeItemMarkdown(body, { callout: () => undefined }), '<aside data-craft-callout role="note">\n\nKeep\n\n</aside>');
  assert.equal(normalizeItemMarkdown(body, { callout: () => '' }), '');
  for (const value of [null, 42, {}]) {
    assert.throws(() => normalizeItemMarkdown(body, { callout: () => value }), /renderer must return/);
  }
});

test('fails explicitly for malformed wrappers, indentation, or truncated previews', () => {
  for (const input of [
    'unexpected response', '<collectionItem>\n  <title>Missing close</title>',
    '<collectionItem>\n  <contentPreview>truncated</contentPreview>\n</collectionItem>',
    '<collectionItem>\n  <content>\ninvalid indentation\n  </content>\n</collectionItem>',
    '<collectionItem>\n  <content>\n    Missing close\n</collectionItem>',
    wrap('<page>\n  <pageTitle>Missing close</pageTitle>'),
  ]) assert.throws(() => normalizeItemMarkdown(input), /Craft/);
});

test('native toggles consume only their indented descendants and start closed', () => {
  const body = '+ Why this matters\n  - First **point**\n  - Second point\n\nAfter.\n\n+ Empty toggle';
  assert.equal(normalizeItemMarkdown(wrap(body)), '<details>\n<summary>Why this matters</summary>\n\n- First **point**\n- Second point\n\n</details>\n\n\nAfter.\n\n\n<details>\n<summary>Empty toggle</summary>\n\n\n\n</details>');
});

test('nested toggles are normalized bottom-up and consumer output is not reinterpreted', () => {
  const calls = [];
  const body = '+ Outer\n  + Inner\n    - Child\n  - Outer child\n+ Sibling\n  - Last';
  const result = normalizeItemMarkdown(wrap(body), { toggle(block) {
    calls.push(block);
    return `CUSTOM(${block.summary})\n${block.markdown}`;
  } });
  assert.deepEqual(calls.map(({ summary }) => summary), ['Inner', 'Outer', 'Sibling']);
  assert.equal(calls[0].markdown, '- Child');
  assert.match(calls[1].markdown, /CUSTOM\(Inner\)[\s\S]*- Outer child/);
  assert.match(result, /CUSTOM\(Sibling\)\n- Last/);
});

test('toggles inside lists and blockquotes preserve their containers', () => {
  const result = normalizeItemMarkdown(wrap('- Parent\n  + Details\n    - Child\n- Next\n\n> + Quoted toggle\n>   - Quoted child'));
  assert.match(result, /- Parent\n\n  <details>[\s\S]*  - Child[\s\S]*  <\/details>\n- Next/);
  assert.match(result, /> <details>[\s\S]*> - Quoted child[\s\S]*> <\/details>/);
});

test('multiline callouts preserve paragraphs, lists, and fenced examples', () => {
  const body = '<callout>\n  First **paragraph**.\n\n  - One\n    - Two\n\n  ```html\n  </callout>\n  ```\n</callout>\nAfter';
  const result = normalizeItemMarkdown(wrap(body));
  assert.match(result, /First \*\*paragraph\*\*\.\n\n- One\n  - Two/);
  assert.match(result, /```html\n<\/callout>\n```/);
  assert.match(result, /\n\nAfter$/);
  assert.equal(normalizeItemMarkdown(wrap('<callout>First\nSecond</callout>')), '<aside data-craft-callout role="note">\n\nFirst\nSecond\n\n</aside>');
});

test('highlights and captions use standard HTML, keep inline formatting, and expose metadata', () => {
  const body = 'Use <highlight color="mint">**this**</highlight> and ==that==.\n\n<caption>A *caption*.</caption>';
  assert.equal(normalizeItemMarkdown(wrap(body)), 'Use <mark>**this**</mark> and <mark>that</mark>.\n\n\n<em>A *caption*.</em>');
  const colors = [];
  assert.equal(normalizeItemMarkdown(wrap('A <highlight color="blue">word</highlight>.'), {
    highlight: ({ markdown, color }) => { colors.push(color); return `**${markdown}**`; },
  }), 'A **word**.');
  assert.deepEqual(colors, ['blue']);
  assert.equal(normalizeItemMarkdown(wrap('<caption>Text</caption>'), { caption: ({markdown}) => `Caption: ${markdown}` }), 'Caption: Text');
});

test('inline code, escaping, fenced and indented code protect Craft-like syntax', () => {
  const body = 'Use `<highlight>literal</highlight>` and ``==`literal`==``; \\==escaped==.\n\n```md\n+ Not a toggle\n  - Literal child\n<caption>Literal</caption>\n```\n\n    + Indented code\n      - Literal child';
  assert.equal(normalizeItemMarkdown(wrap(body)), body);
});

test('all renderers share fallback, omission, and invalid-output behavior', () => {
  const cases = [
    ['toggle', '+ Title\n  Text'],
    ['caption', '<caption>Caption</caption>'],
    ['highlight', '<highlight>Highlight</highlight>'],
    ['page', '<page>\n  <pageTitle>Page</pageTitle>\n  <content>\n    Body\n  </content>\n</page>'],
  ];
  for (const [name, body] of cases) {
    assert.equal(normalizeItemMarkdown(wrap(body), { [name]: () => undefined }), normalizeItemMarkdown(wrap(body)));
    assert.equal(normalizeItemMarkdown(wrap(body), { [name]: () => '' }), '');
    assert.throws(() => normalizeItemMarkdown(wrap(body), { [name]: () => 3 }), /renderer must return/);
  }
});

test('default summaries escape HTML and page renderers receive normalized child content', () => {
  const result = normalizeItemMarkdown(wrap('+ A <script> & "title"\n  Text'));
  assert.match(result, /<summary>A &lt;script&gt; &amp; &quot;title&quot;<\/summary>/);
  const body = '<page>\n  <pageTitle>Page</pageTitle>\n  <content>\n    <callout>Note</callout>\n  </content>\n</page>';
  assert.equal(normalizeItemMarkdown(wrap(body), { page: ({title,markdown}) => `${title}: ${markdown}` }), 'Page: <aside data-craft-callout role="note">\n\nNote\n\n</aside>');
});

test('malformed Craft extensions fail without silently losing content', () => {
  for (const body of ['<callout>Missing close', '<caption>Missing close', '<highlight>Missing close', '</highlight>', '<contentPreview>truncated</contentPreview>']) {
    assert.throws(() => normalizeItemMarkdown(wrap(body)), /Craft/);
  }
});

test('multiline code spans, HTML literals, and URL destinations are never normalized', () => {
  const examples = [
    'Use `literal\n<highlight>example</highlight>\nend` here.',
    '[A link](https://example.com/==literal== "==title==")',
    '![Image](https://example.com/a(b)/==literal==.png)',
    '[ref]: https://example.com/==literal==',
    'https://example.com/==literal==',
    '<pre>\n<callout>Literal</callout>\n+ Literal\n</pre>',
    '<!--\n<callout>Literal</callout>\n-->',
  ];
  for (const body of examples) assert.equal(normalizeItemMarkdown(wrap(body)), body);
});

test('nested callout wrappers and quoted HTML attributes retain their boundaries', () => {
  assert.equal(normalizeItemMarkdown(wrap('<callout>\n<callout>Inner</callout>\nAfter inner\n</callout>')), '<aside data-craft-callout role="note">\n\n<aside data-craft-callout role="note">\n\nInner\n\n</aside>\n\nAfter inner\n\n</aside>');
  const html = '<span title="1 > ==literal==">Text</span>';
  assert.equal(normalizeItemMarkdown(wrap(html)), html);
  assert.throws(() => normalizeItemMarkdown('<collectionItem>\n <content>\n   Body\n </content>\n</collectionItem>'), /Craft/);
});


test('multiline wrappers may close directly after a fenced code delimiter', () => {
  for (const tag of ['callout', 'caption']) {
    for (const marker of ['```', '~~~~']) {
      for (const prefix of ['Intro\n\n', '']) {
        const inner = `${prefix}${marker}html\n</${tag}>\n<highlight>literal</highlight>\n${marker}`;
        const body = `<${tag}>${inner}</${tag}>\nAfter`;
        const seen = [];
        const result = normalizeItemMarkdown(wrap(body), { [tag]: ({ markdown }) => { seen.push(markdown); return `RENDERED\n${markdown}`; } });
        assert.deepEqual(seen, [inner]);
        assert.equal(result, `RENDERED\n${inner}\n\nAfter`);
      }
    }
  }
  assert.throws(() => normalizeItemMarkdown(wrap('<callout>Intro\n```html\nLiteral\n```')), /unclosed callout/);
  assert.throws(() => normalizeItemMarkdown(wrap('<callout>````html\nLiteral\n```</callout>')), /unclosed callout/);
});

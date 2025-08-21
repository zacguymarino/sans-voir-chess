export const themeSheet = new CSSStyleSheet();
themeSheet.replaceSync(`
  :host { display:block; }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-3);
  }

  .title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 var(--space-2);
  }

  .row { display:flex; gap:var(--space-2); align-items:center; flex-wrap:wrap; }
  .stack > * + * { margin-top: var(--space-2); }

  .muted { color: var(--muted-fg); }
  .mono  { font-family: var(--font-mono); }

  .btn {
    appearance:none; border:1px solid var(--border); background:transparent; color:var(--fg);
    padding:8px 12px; border-radius:8px; cursor:pointer;
  }
  .btn:hover { filter:brightness(0.98); }
  .btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .btn-primary { background:var(--accent); color:var(--accent-contrast); border-color:transparent; }
  .btn-secondary { background:var(--secondary); color:var(--accent-contrast); border-color:transparent; }
  .btn-white { background:var(--off-white); color:var(--off-black); border-color:transparent; }
  .btn-black { background:var(--off-black); color:var(--off-white); border-color:transparent; }

  /* Inputs: make width auto by default so fields can be compact
     (widgets can still set width:100% on their own wrapper) */
  .input, input[type="number"], input[type="text"] {
    width: var(--input-width, auto);
    min-width: 8ch;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--off-white);
    color: var(--fg);
  }
  .input:focus-visible, select:focus-visible, input:focus-visible {
    outline:2px solid var(--accent); outline-offset:2px;
  }

  select {
    width: auto;
    padding:8px 10px;
    border:1px solid var(--border);
    border-radius:8px;
    background: var(--off-white);
    color:var(--fg);
  }

  .field { display:grid; gap:4px; }

  .divider { height:1px; background:var(--border); margin:var(--space-3) 0; }

  .component-container {
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-lg, var(--radius));
    padding: var(--space-2);
    background-color: var(--color-surface, var(--card));
    box-shadow: var(--shadow-lg, 0 6px 18px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06));
  }

  .big-square   { font-size:2rem; font-weight:700; text-align:center; margin: var(--space-sm, 10px) 0; }
  .shortcuts    { margin-top: var(--space-xs, 6px); font-size:.85rem; }

  .ok    { color: var(--success); }
  .warn  { color: var(--danger); }
  .status{ min-height:1.25em; }

  .log {
    white-space:pre-line; background:transparent; border:1px solid var(--border);
    border-radius:8px; padding:8px; max-height:300px; overflow:auto;
  }

  .content-narrow { max-width:360px; margin-inline:auto; }
  .content-medium { max-width:520px; margin-inline:auto; }
`);

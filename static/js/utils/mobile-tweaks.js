export function hardenTextInputs(root) {
  // Disable mobile auto-features for text-like inputs
  root.querySelectorAll('input[type="text"], input[type="search"]').forEach(el => {
    el.setAttribute('autocapitalize', 'off');   // iOS/Safari
    el.setAttribute('autocorrect',   'off');    // iOS/Safari (non-standard but works)
    el.setAttribute('spellcheck',    'false');  // most browsers
    el.setAttribute('autocomplete',  'off');
    el.setAttribute('inputmode',     'text');   // keep a text keyboard
    // Optional visual cue:
    el.style.textTransform = 'lowercase';
  });
}

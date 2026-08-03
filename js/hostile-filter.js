/**
 * CRICRI · filtro client-side de linguagem hostil (MEOW)
 * Lista em FASC_CONFIG.hostileTerms — bloqueia, não suaviza.
 */
(function (global) {
  'use strict';

  var DEFAULT_MSG =
    'Esse texto soa hostil demais pra caixinha. Reformula com carinho — a roda é pra acolher.';

  function terms() {
    var cfg = global.FASC_CONFIG || {};
    var list = cfg.hostileTerms;
    if (!list || !list.length) return [];
    return list.map(function (t) { return String(t || '').trim().toLowerCase(); }).filter(Boolean);
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents for match
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * @returns {{ ok: true } | { ok: false, term: string, message: string }}
   */
  function checkHostile(text) {
    var raw = String(text || '');
    var n = normalize(raw);
    if (!n) return { ok: true };
    var list = terms();
    for (var i = 0; i < list.length; i++) {
      var term = list[i];
      var tn = normalize(term);
      if (!tn) continue;
      // multi-word: substring; single: word-ish boundary
      var hit = false;
      if (tn.indexOf(' ') >= 0) {
        hit = n.indexOf(tn) >= 0;
      } else {
        // word boundary approximate for PT
        var re = new RegExp('(?:^|[^a-z0-9])' + tn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z0-9]|$)', 'i');
        hit = re.test(n);
      }
      if (hit) {
        return {
          ok: false,
          term: term,
          message: DEFAULT_MSG
        };
      }
    }
    return { ok: true };
  }

  function assertClean(text) {
    var r = checkHostile(text);
    if (!r.ok) {
      var err = new Error(r.message);
      err.code = 'HOSTILE_LANGUAGE';
      err.term = r.term;
      throw err;
    }
    return true;
  }

  global.CricriHostileFilter = {
    check: checkHostile,
    assertClean: assertClean,
    message: DEFAULT_MSG
  };
})(typeof window !== 'undefined' ? window : globalThis);

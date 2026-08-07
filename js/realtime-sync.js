/* CRICRI · realtime-sync stub (arquivo opcional — evita 404 no dev local) */
(function (global) {
  'use strict';
  if (global.CricriRealtime) return;
  global.CricriRealtime = {
    ready: false,
    subscribe: function () { return function () {}; },
    unsubscribeAll: function () {}
  };
})(typeof window !== 'undefined' ? window : this);

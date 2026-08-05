/**
 * CRICRI · amizade (conexões mútuas)
 * Amigo = A→B e B→A na tabela public.connections
 */
(function () {
  'use strict';

  var cache = {
    me: null,
    friendIds: null, // Set-like array
    at: 0
  };
  var TTL = 60 * 1000;

  function db() {
    return window.fascDb || null;
  }

  async function currentUserId() {
    if (cache.me && Date.now() - cache.at < TTL) return cache.me;
    try {
      if (!window.fascAuth || !window.fascAuth.user) return null;
      var u = await window.fascAuth.user();
      cache.me = u && u.id ? u.id : null;
      cache.at = Date.now();
      return cache.me;
    } catch (_) {
      return null;
    }
  }

  /**
   * IDs de amigos mútuos (array de uuid string).
   */
  async function listMutualFriendIds(force) {
    if (!force && cache.friendIds && Date.now() - cache.at < TTL) {
      return cache.friendIds.slice();
    }
    var client = db();
    var me = await currentUserId();
    if (!client || !me) {
      cache.friendIds = [];
      return [];
    }
    try {
      var out = await client
        .from('connections')
        .select('to_id')
        .eq('from_id', me);
      if (out.error) throw out.error;
      var iFollow = (out.data || []).map(function (r) { return r.to_id; }).filter(Boolean);
      if (!iFollow.length) {
        cache.friendIds = [];
        cache.at = Date.now();
        return [];
      }
      // quem me adicionou dentre os que eu sigo
      var back = await client
        .from('connections')
        .select('from_id')
        .eq('to_id', me)
        .in('from_id', iFollow);
      if (back.error) throw back.error;
      var mutual = (back.data || []).map(function (r) { return r.from_id; }).filter(Boolean);
      // unique
      var seen = {};
      var ids = [];
      for (var i = 0; i < mutual.length; i++) {
        if (!seen[mutual[i]]) {
          seen[mutual[i]] = 1;
          ids.push(mutual[i]);
        }
      }
      cache.friendIds = ids;
      cache.at = Date.now();
      return ids.slice();
    } catch (e) {
      console.warn('[CRICRI friends]', e && e.message || e);
      cache.friendIds = [];
      return [];
    }
  }

  async function isMutualFriend(otherId) {
    if (!otherId) return false;
    var me = await currentUserId();
    if (!me || otherId === me) return false;
    var ids = await listMutualFriendIds();
    return ids.indexOf(otherId) !== -1;
  }

  /** Eu + amigos mútuos — útil pra filtrar feed privado */
  async function visibleAuthorIds() {
    var me = await currentUserId();
    var friends = await listMutualFriendIds();
    if (!me) return friends;
    return [me].concat(friends);
  }

  function invalidate() {
    cache.friendIds = null;
    cache.me = null;
    cache.at = 0;
  }

  window.CricriFriends = {
    listMutualFriendIds: listMutualFriendIds,
    isMutualFriend: isMutualFriend,
    visibleAuthorIds: visibleAuthorIds,
    currentUserId: currentUserId,
    invalidate: invalidate
  };
})();

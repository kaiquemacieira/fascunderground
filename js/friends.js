/**
 * CRICRI · amizade (pedidos + mútuos)
 *
 * Fluxo:
 *  1) A pede amizade → connections(from=A, to=B, status='pending')
 *  2) B aceita → status='accepted' + linha inversa B→A accepted
 *  3) B recusa → remove o pedido (ou status='rejected')
 *
 * Amigo = mútuo com status accepted (ou legado sem coluna status: A↔B)
 */
(function () {
  'use strict';

  var cache = {
    me: null,
    friendIds: null,
    at: 0
  };
  var TTL = 30 * 1000;
  var hasStatusCol = null; // null = unknown, true/false after probe

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

  function invalidate() {
    cache.friendIds = null;
    cache.me = null;
    cache.at = 0;
  }

  async function probeStatusColumn() {
    if (hasStatusCol !== null) return hasStatusCol;
    var client = db();
    if (!client) return false;
    try {
      var res = await client.from('connections').select('status').limit(1);
      if (res.error && /status|column|schema/i.test(res.error.message || '')) {
        hasStatusCol = false;
      } else {
        hasStatusCol = true;
      }
    } catch (_) {
      hasStatusCol = false;
    }
    return hasStatusCol;
  }

  /**
   * IDs de amigos mútuos aceitos.
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
      var withStatus = await probeStatusColumn();
      var out = await client.from('connections').select(withStatus ? 'to_id,status' : 'to_id').eq('from_id', me);
      if (out.error) throw out.error;
      var iFollow = (out.data || []).filter(function (r) {
        if (!r.to_id) return false;
        if (!withStatus) return true;
        return !r.status || r.status === 'accepted';
      }).map(function (r) { return r.to_id; });

      if (!iFollow.length) {
        cache.friendIds = [];
        cache.at = Date.now();
        return [];
      }

      var back = await client
        .from('connections')
        .select(withStatus ? 'from_id,status' : 'from_id')
        .eq('to_id', me)
        .in('from_id', iFollow);
      if (back.error) throw back.error;

      var mutual = (back.data || []).filter(function (r) {
        if (!r.from_id) return false;
        if (!withStatus) return true;
        return !r.status || r.status === 'accepted';
      }).map(function (r) { return r.from_id; });

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

  async function visibleAuthorIds() {
    var me = await currentUserId();
    var friends = await listMutualFriendIds();
    if (!me) return friends;
    return [me].concat(friends);
  }

  /**
   * Pedidos recebidos (pending, to_id = eu)
   * Retorna [{ id, from_id, created_at, profile: { name, handle, photo_url } }]
   */
  async function listIncomingRequests() {
    var client = db();
    var me = await currentUserId();
    if (!client || !me) return [];
    var withStatus = await probeStatusColumn();
    if (!withStatus) {
      // legado: quem me seguiu e eu ainda não segui de volta = "pedido"
      try {
        var incoming = await client.from('connections').select('id,from_id,created_at').eq('to_id', me);
        if (incoming.error) throw incoming.error;
        var outgoing = await client.from('connections').select('to_id').eq('from_id', me);
        if (outgoing.error) throw outgoing.error;
        var iFollow = {};
        (outgoing.data || []).forEach(function (r) { if (r.to_id) iFollow[r.to_id] = 1; });
        var pending = (incoming.data || []).filter(function (r) {
          return r.from_id && !iFollow[r.from_id];
        });
        return await hydrateProfiles(pending);
      } catch (e) {
        console.warn('[friends] incoming legacy', e && e.message);
        return [];
      }
    }
    try {
      var res = await client
        .from('connections')
        .select('id,from_id,to_id,status,created_at')
        .eq('to_id', me)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(30);
      if (res.error) throw res.error;
      return await hydrateProfiles(res.data || []);
    } catch (e) {
      console.warn('[friends] incoming', e && e.message);
      return [];
    }
  }

  async function hydrateProfiles(rows) {
    if (!rows.length) return [];
    var client = db();
    var ids = rows.map(function (r) { return r.from_id; }).filter(Boolean);
    var map = {};
    if (ids.length && client) {
      try {
        var pr = await client.from('profiles').select('id,name,handle,photo_url').in('id', ids);
        if (!pr.error && pr.data) {
          pr.data.forEach(function (p) { map[p.id] = p; });
        }
      } catch (_) {}
    }
    return rows.map(function (r) {
      return {
        id: r.id,
        from_id: r.from_id,
        created_at: r.created_at,
        profile: map[r.from_id] || { name: 'alguém', handle: '', photo_url: '' }
      };
    });
  }

  /** Envia pedido de amizade (A → B pending) */
  async function requestFriend(toId) {
    var client = db();
    var me = await currentUserId();
    if (!client || !me) throw new Error('Faça login');
    if (!toId || toId === me) throw new Error('Usuário inválido');

    var withStatus = await probeStatusColumn();
    // já somos amigos?
    if (await isMutualFriend(toId)) throw new Error('Vocês já são amigos');

    var payload = withStatus
      ? { from_id: me, to_id: toId, status: 'pending' }
      : { from_id: me, to_id: toId };

    var res = await client.from('connections').insert(payload).select('id').single();
    if (res.error) {
      if (/duplicate|unique|already/i.test(res.error.message || '')) {
        throw new Error('Pedido já enviado ou conexão existe');
      }
      throw res.error;
    }
    invalidate();
    try {
      window.dispatchEvent(new CustomEvent('cricri:friend-request-sent', { detail: { toId: toId } }));
    } catch (_) {}
    // push pro destinatário
    try {
      if (window.CricriPush && window.CricriPush.notifyUser) {
        var me = await currentUserId();
        var label = 'Alguém';
        try {
          var pr = await client.from('profiles').select('handle,name').eq('id', me).maybeSingle();
          if (pr.data) label = pr.data.handle ? '@' + pr.data.handle : (pr.data.name || label);
        } catch (_) {}
        window.CricriPush.notifyUser(toId, {
          title: 'Pedido de amizade',
          body: label + ' quer conectar com você no CRICRI',
          url: '/profile.html',
          tag: 'friend-request'
        }).then(function (r) {
          if (r && !r.ok) console.info('[friends] push', r.error);
        });
      }
    } catch (_) {}
    return res.data;
  }

  /** Aceita pedido: marca accepted + cria linha inversa */
  async function acceptRequest(fromId, rowId) {
    var client = db();
    var me = await currentUserId();
    if (!client || !me || !fromId) throw new Error('Dados inválidos');

    var withStatus = await probeStatusColumn();
    if (withStatus) {
      if (rowId) {
        var up = await client.from('connections').update({ status: 'accepted' }).eq('id', rowId).eq('to_id', me);
        if (up.error) throw up.error;
      } else {
        var up2 = await client.from('connections').update({ status: 'accepted' })
          .eq('from_id', fromId).eq('to_id', me).eq('status', 'pending');
        if (up2.error) throw up2.error;
      }
      // linha inversa
      var inv = await client.from('connections').upsert({
        from_id: me,
        to_id: fromId,
        status: 'accepted'
      }, { onConflict: 'from_id,to_id' });
      if (inv.error && !/duplicate|unique/i.test(inv.error.message || '')) {
        // tenta insert simples
        await client.from('connections').insert({ from_id: me, to_id: fromId, status: 'accepted' });
      }
    } else {
      // legado: só adiciona eu → from
      var ins = await client.from('connections').insert({ from_id: me, to_id: fromId });
      if (ins.error && !/duplicate|unique/i.test(ins.error.message || '')) throw ins.error;
    }

    invalidate();
    try {
      window.dispatchEvent(new CustomEvent('cricri:friend-accepted', {
        detail: { friendId: fromId }
      }));
    } catch (_) {}
    try {
      if (window.CricriPush && window.CricriPush.notifyUser) {
        window.CricriPush.notifyUser(fromId, {
          title: 'Amizade aceita',
          body: 'Vocês estão conectados na roda CRICRI',
          url: '/profile.html',
          tag: 'friend-accepted'
        });
      }
    } catch (_) {}
    // refresh presença
    if (typeof window.__cricriLoadFriendsOnline === 'function') {
      try { window.__cricriLoadFriendsOnline(); } catch (_) {}
    }
    if (typeof window.__cricriReloadConnections === 'function') {
      try { window.__cricriReloadConnections(); } catch (_) {}
    }
    return true;
  }

  /** Recusa: remove o pedido */
  async function rejectRequest(fromId, rowId) {
    var client = db();
    var me = await currentUserId();
    if (!client || !me || !fromId) throw new Error('Dados inválidos');

    if (rowId) {
      var del = await client.from('connections').delete().eq('id', rowId).eq('to_id', me);
      if (del.error) throw del.error;
    } else {
      var del2 = await client.from('connections').delete()
        .eq('from_id', fromId).eq('to_id', me);
      if (del2.error) throw del2.error;
    }
    invalidate();
    try {
      window.dispatchEvent(new CustomEvent('cricri:friend-rejected', { detail: { fromId: fromId } }));
    } catch (_) {}
    return true;
  }

  window.CricriFriends = {
    listMutualFriendIds: listMutualFriendIds,
    isMutualFriend: isMutualFriend,
    visibleAuthorIds: visibleAuthorIds,
    currentUserId: currentUserId,
    invalidate: invalidate,
    listIncomingRequests: listIncomingRequests,
    requestFriend: requestFriend,
    acceptRequest: acceptRequest,
    rejectRequest: rejectRequest,
    probeStatusColumn: probeStatusColumn
  };
})();

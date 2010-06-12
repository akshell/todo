// Copyright (c) 2010, Anton Korenyushkin
// All rights reserved.

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the author nor the names of contributors may be
//       used to endorse or promote products derived from this software
//       without specific prior written permission.

// THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

require('ak', '0.2').setup();


exports.init = function () {
  rv.List.create(
    {
      id: 'unique serial',
      user: 'string',
      name: 'string',
      descr: ['string', '']
    });
  rv.Item.create(
    {
      id: 'unique serial',
      list: 'integer -> List.id',
      pos: 'integer',
      name: 'string'
    },
    'unique [list, pos]');
};


var IndexHandler = Handler.subclass(
  function (request) {
    this._user = request.user ? 'u' + request.user : 's' + request.session;
  },
  {
    get: function (request) {
      if (request.get.session) {
        rv.List.where({user: 's' + request.get.session}).set(
          {user: this._user});
        return redirect('/');
      }
      var lists = rv.List.where({user: this._user}).get(
        {by: '-id', only: ['id', 'name', 'descr']});
      var items = rv.Item.where('list->user == $', this._user).get(
        {by: ['-list', 'pos']});
      var i = 0;
      lists.forEach(
        function (list) {
          list.open = [];
          list.done = [];
          for (; i < items.length && items[i].list == list.id; ++i)
            (items[i].pos > 0 ? list.open : list.done).push(
              {id: items[i].id, name: items[i].name});
        });
      assert(i == items.length);
      var context = {user: request.user, lists: JSON.stringify(lists)};
      if (!request.user)
        context.path = '/?session=' + request.session;
      return render('index.html', context);
    },

    post: function (request) {
      var name = request.data + '';
      if (!name)
        throw Failure();
      var list = rv.List.insert({user: this._user, name: name});
      return new Response(list.id + '', http.CREATED);
    }
  }).decorated(obtainingSession);


var ListHandler = IndexHandler.subclass(
  function (request, listId) {
    IndexHandler.call(this, request);
    if (!rv.List.where({id: listId, user: this._user}).count())
      throw NotFound();
  },
  {
    post: function (request, listId) {
      var name = request.data + '';
      if (!name)
        throw Failure();
      var max = rv.Item.where('list == $ && pos > 0', listId).get(
        {by: '-pos', attr: 'pos', length: 1})[0];
      var item = rv.Item.insert(
        {list: listId, pos: (max || 0) + 1, name: name});
      return new Response(item.id + '', http.CREATED);
    },

    put: function (request, listId) {
      var list = JSON.parse(request.data + '');
      if (!list.name)
        throw Failure();
      rv.List.where({id: listId}).set({name: list.name, descr: list.descr});
      rv.Item.where('list == $ && pos > 0', listId).del();
      for (var i = 0; i < list.open.length; ++i) {
        var item = list.open[i];
        if (!item.name)
          throw Failure();
        rv.Item.insert(
          {id: item.id, list: listId, pos: i + 1, name: item.name});
      }
      return new Response();
    },

    del: function (request, listId) {
      rv.Item.where({list: listId}).del();
      rv.List.where({id: listId}).del();
      return new Response();
    }
  });


var ItemHandler = IndexHandler.subclass(
  {
    post: function (request, listId, itemId) {
      var pos = rv.Item.where(
        'list == $1 && list->user == $2 && id == $3',
        listId, this._user, itemId).getOne({attr: 'pos'});
      var d = pos > 0 ? 1 : -1;
      var sup = rv.Item.where('list == $1 && pos * $2 < 0', listId, d).get(
        {by: 'pos * $', attr: 'pos', length: 1}, d)[0];
      rv.Item.where({id: itemId}).set({pos: (sup || 0) - d});
      return new Response();
    }
  });


exports.root = new URLMap(
  IndexHandler,
  [/\d+/, ListHandler,
   [/\/(\d+)/, ItemHandler]]);


exports.tests = require('tests');

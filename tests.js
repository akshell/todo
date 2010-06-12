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

var main = require('main');


var BaseTestCase = TestCase.subclass(
  {
    setUp: function () {
      db.drop(db.list());
      main.init();
      this._client = new TestClient();
      this._client.login('Bob');
      with (this._client) {
        var path = '/' + post({data: 'Bad'}).content;
        put(
          {
            path: path,
            data: JSON.stringify(
              {name: 'First', descr: 'Description', open: []})
          });
        post({path: path, data: 'Zero'});
        post({path: path, data: 'One'});
        post({path: path, data: 'Two'});
        path = path + '/' + post({path: path, data: 'Three'}).content;
        post({path: path});
        post({data: 'Second'});
        post({user: 'Alice', data: 'Third'});
        path = '/' + post({user: '', session: '123', data: 'Fourth'}).content;
        post({user: '', path: path, session: '123', data: 'Hello'});
      }
    },

    tearDown: function () {
      db.drop(db.list());
    }
  });


exports.TestIndexHandler = BaseTestCase.subclass(
  {
    name: 'IndexHandler',

    testGet: function () {
      assertSame(
        this._client.get({get: {session: '123'}}).status,
        http.FOUND);
      var context = this._client.get().context;
      assertSame(
        context.lists,
        JSON.stringify(
          [
            {
              id: 3, name: 'Fourth', descr: '',
              open: [{id: 4, name: 'Hello'}],
              done: []
            },
            {
              id: 1, name: 'Second', descr: '', open: [], done: []
            },
            {
              id: 0, name: 'First', descr: 'Description',
              open: [
                {id: 0, name: 'Zero'},
                {id: 1, name: 'One'},
                {id: 2, name: 'Two'}
              ],
              done: [{id: 3, name: 'Three'}]
            }
          ]));
    },

    testPost: function () {
      assertSame(this._client.post().status, http.BAD_REQUEST);
    }
  });


exports.TestListHandler = BaseTestCase.subclass(
  {
    name: 'ListHandler',

    testPost: function () {
      assertSame(this._client.post({path: '/1'}).status, http.BAD_REQUEST);
      assertSame(this._client.post({path: '/42', data: 'Test'}).status,
                 http.NOT_FOUND);
      assertSame(this._client.post({path: '/2', data: 'Test'}).status,
                 http.NOT_FOUND);
      assertSame(this._client.post({path: '/0', data: 'Zero'}).status,
                 http.CREATED);
    },

    testPut: function () {
      assertSame(this._client.put({path: '/0', data: '{}'}).status,
                 http.BAD_REQUEST);
      this._client.put(
        {
          path: '/0',
          data: JSON.stringify(
            {name: '1st', descr: '', open: [{id: 2, name: '2'}, {id: 0, name: '0'}]})
        });
      var lists = JSON.parse(this._client.get().context.lists);
      assertSame(
        JSON.stringify(lists[1]),
        JSON.stringify(
          {
            id: 0,
            name: '1st',
            descr: '',
            open: [{id: 2, name: '2'}, {id: 0, name: '0'}],
            done: [{id: 3, name: 'Three'}]
          }));
    },

    testDel: function () {
      assertSame(this._client.del({path: '/2'}).status, http.NOT_FOUND);
      this._client.del({path: '/0'});
      assertSame(JSON.parse(this._client.get().context.lists).length, 1);
    }
  });


exports.TestItemHandler = BaseTestCase.subclass(
  {
    name: 'ItemHandler',

    testPost: function () {
      assertSame(this._client.post({path: '/0/42'}).status, http.NOT_FOUND);
      assertSame(this._client.post({path: '/0/0'}).status, http.OK);
      assertSame(this._client.post({path: '/0/3'}).status, http.OK);
      assertSame(this._client.post({path: '/0/1'}).status, http.OK);
      assertSame(this._client.post({path: '/0/1'}).status, http.OK);
      var list = JSON.parse(this._client.get().context.lists)[1];
      assertEqual(list.open.map(values),
                  [[2, 'Two'], [3, 'Three'], [1, 'One']]);
      assertEqual(list.done.map(values), [[0, 'Zero']]);
    }
  });

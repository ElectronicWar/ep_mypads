/**
*  # API Module
*
*  ## License
*
*  Licensed to the Apache Software Foundation (ASF) under one
*  or more contributor license agreements.  See the NOTICE file
*  distributed with this work for additional information
*  regarding copyright ownership.  The ASF licenses this file
*  to you under the Apache License, Version 2.0 (the
*  "License"); you may not use this file except in compliance
*  with the License.  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing,
*  software distributed under the License is distributed on an
*  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
*  KIND, either express or implied.  See the License for the
*  specific language governing permissions and limitations
*  under the License.
*
*  ## Description
*
*  This module holds all public functions, used for the API of mypads.
*  Please refer to binded function when no details are given.
*/

var ld = require('lodash');
var conf = require('./configuration.js');
var user = require('./model/user.js');
var group = require('./model/group.js');

module.exports = (function () {
  'use strict';

  var api = {};
  api.initialRoute = '/mypads/api/';

  /**
  * `init` is the first function that takes an Express app as argument.
  * It initializes all mypads routes.
  */

  api.init = function (app) {
    // FIXME: authentification
    configurationAPI(app);
    userAPI(app);
    groupAPI(app);
  };

  /**
  * ## Internal functions helpers
  */

  var fn = {};

  /**
  * `get` internal takes a mandatory `module` argument to call its get method.
  * Otherwise, it will use `req.params.key` to get the database record.
  */

  fn.get = function (module, req, res) {
    try {
      module.get(req.params.key, function (err, val) {
        if (err) {
          return res.send(404, { error: err.message, key: req.params.key });
        }
        res.send({ key: req.params.key, value: val });
      });
    }
    catch (e) {
      res.send(400, { error: e.message });
    }
  };

  /**
  * `set` internal takes the values of key and val that will be given to the
  * `setFn` bounded function targetted the original `set` from the module used
  * in the case of this public API
  */

  fn.set = function (setFn, key, value, req, res) {
    try {
      setFn(function (err, data) {
        if (err) { return res.send(400, { error: err.message }); }
        res.send({ success: true, key: key || data._id, value: data || value });
      });
    }
    catch (e) {
      res.send(400, { error: e.message });
    }
  };

  /**
  * `del` internal takes four arguments :
  *
  * - `delFn` bounded function targetted the original `del` method from the
  *   module used
  * - classical `req` and `res` express parameters, with mandatory
  *   *req.params.key*.
  */

  fn.del = function (delFn, req, res) {
    var key = req.params.key;
    delFn(key, function (err) {
      if (err) { return res.send(404, { error: err.message }); }
      res.send({ success: true, key: key });
    });
  };

  /**
  * ## Configuration API
  */

  var configurationAPI = function (app) {
    var confRoute = api.initialRoute + 'configuration';

    /**
    * GET method : get all configuration
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/configuration
    */

    app.get(confRoute, function (req, res) {
      conf.all(function (err, value) {
        if (err) { return res.send(400, { error: err }); }
        res.send({ value: value });
      });
    });

    /**
    * GET method : `configuration.get` key
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/configuration/something
    */

    app.get(confRoute + '/:key', function (req, res) {
      conf.get(req.params.key, function (err, value) {
        if (err) {
          return res.send(404, { error: err.message, key: req.params.key });
        }
        res.send({ key: req.params.key, value: value });
      });
    });

    /**
    * POST/PUT methods : `configuration.set` key and value on initial
    * Sample URL for POST:
    * http://etherpad.ndd/mypads/api/configuration
    *
    * for PUT
    * http://etherpad.ndd/mypads/api/configuration/something
    */

    var _set = function (req, res) {
      var key = (req.method === 'POST') ? req.body.key : req.params.key;
      var value = req.body.value;
      var setFn = ld.partial(conf.set, key, value);
      fn.set(setFn, key, value, req, res);
    };

    app.post(confRoute, _set);
    app.put(confRoute + '/:key', _set);

    /**
    * DELETE method : `configuration.del` key
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/configuration/something
    */

    app.delete(confRoute + '/:key', ld.partial(fn.del, conf.del));
  };

  /**
  *  ## User API
  */

  var userAPI = function (app) {
    var userRoute = api.initialRoute + 'user';

    /**
    * GET method : `user.get` login (key)
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/user/someone
    */

    app.get(userRoute + '/:key', ld.partial(fn.get, user));

    // `set` for POST and PUT, see below
    var _set = function (req, res) {
      var key;
      var value = req.body;
      if (req.method === 'POST') {
        key = req.body.login;
      } else {
        key = req.params.key;
        value.login = key;
        value._id = user.ids[key];
      }
      var setFn = ld.partial(user.set, value);
      fn.set(setFn, key, value, req, res);
    };

    /**
    * POST method : `user.set` with user value for user creation
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/user
    */

    app.post(userRoute, _set);

    /**
    * PUT method : `user.set` with user key/login plus value for existing user
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/user/someone
    */

    app.put(userRoute + '/:key', _set);

    /**
    * DELETE method : `user.del` with user key/login
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/user/someone
    */

    app.delete(userRoute + '/:key', ld.partial(fn.del, user.del));
  };

  /**
  * ## Group API
  */

  var groupAPI = function (app) {
    var groupRoute = api.initialRoute + 'group';

    /**
    * GET method : `group.get` unique id
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/group/xxxx
    */

    app.get(groupRoute + '/:key', ld.partial(fn.get, group));

    // `set` for POST and PUT, see below
    var _set = function (req, res) {
      var setFn = ld.partial(group.set, req.body);
      fn.set(setFn, req.body._id, req.body, req, res);
    };

    /**
    * POST method : `group.set` with user value for user creation
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/group
    */

    app.post(groupRoute, _set);

    /**
    * PUT method : `group.set` with group id plus value for existing group
    * Sample URL:
    *
    * http://etherpad.ndd/mypads/api/user/xxx
    */

    app.put(groupRoute + '/:key', _set);

  };


  return api;

}).call(this);

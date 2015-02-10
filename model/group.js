/**
* # Group Model
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
*/

module.exports = (function () {
  'use strict';

  // Dependencies
  var ld = require('lodash');
  var cuid = require('cuid');
  var storage = require('../storage.js');
  //var conf = require('../configuration.js');
  var common = require('./common.js');
  var user = require('./user.js');

  /**
  * ## Description
  *
  * Groups belong to users. Each user can have multiple groups of pads.
  * DBPREFIX is fixed for database key work.
  */

  var group = { DBPREFIX: 'mypads:group:' };

  /**
  * ## Public Functions
  *
  * ### add
  *
  * Adding checks the fields, throws error if needed, set defaults options. As
  * arguments, it takes mandatory :
  *
  * - `params` object, with
  *
  *   - a `name` string that can't be empty
  *   - an `admin` string, the unique key identifying the initial administrator
  *   of the group
  *   - `visibility`, a string defined as *restricted* by default to invited
  *   users. Can be set to *public*, letting non authenticated users access to
  *   all pads in the group with the URL, or *private*, protected by a password
  *   phrase chosen by the administrator
  *   - `readonly`, *false* on creation. If *true*, pads that will be linked to
  *   the group will be set on readonly mode
  *   - `password` string field, only usefull if visibility fixed to private,
  *   by default to an empty string
  *
  * - `callback` function returning error if error, null otherwise and the
  *   group object;
  * - a special `edit` boolean, defaults to *false* for reusing the function for
  *   set (edit) an existing group.
  *
  * `add` sets other defaults
  *
  * - an empty `pads` array, will contain ids of pads attached to the group
  * - an empty `users` array, with ids of users invited to read and/or edit the
  *   pad, for restricted visibility only
  *
  *   Finally, a group object can be represented like :
  *
  * var group = {
  *   _id: 'autoGeneratedUniqueString',
  *   name: 'group1',
  *   pads: [ 'padkey1', 'padkey2' ],
  *   admins: [ 'userkey1', 'userkey2' ],
  *   users: [ 'ukey1' ],
  *   visibility: 'restricted' || 'public' || 'private',
  *   password: '',
  *   readonly: false
  * };
  *
  */

  group.add = function (params, callback, edit) {
    edit = !!edit;
    common.addSetInit(params, callback);
    var isFullStr = function (s) { return (ld.isString(s) && !ld.isEmpty(s)); };
    if (!(isFullStr(params.name) && isFullStr(params.admin))) {
      throw(new TypeError('name and admin must be strings'));
    }
    if (edit && !ld.isString(params._id)) {
      throw(new TypeError('unique _id must be given in params object'));
    }
    var adminKey = user.DBPREFIX + params.admin;
    var g = group.fn.assignProps(params);
    common.checkExistence(adminKey, function (err, res) {
      if (err) { return callback(err); }
      if (!res) {
        var e = 'admin user does not exist';
        return callback(new Error(e));
      }
      var _final = function () {
        storage.db.set(g._id, g, function (err) {
          if (err) { return callback(err); }
          return callback(null, g);
        });
      };
      if (edit) {
        g._id = params._id;
        common.checkExistence(g._id, function (err, res) {
          if (err) { return callback(err); }
          if (!res) { return callback(new Error('group does not exist')); }
          _final();
        });
      } else {
        g._id = cuid();
        _final();
      }
    });
  };

  /**
  * ### get
  */

  group.get = ld.noop;

  /**
  * ### set
  *
  *  The modification of a group can be done for every field.
  *  In fact `group.add` with special attribute `add` to *false*.
  *  Please refer to `group.add` for documentation.
  */

  group.set = ld.partialRight(group.add, true);

  /**
  * ### del
  */

  group.del = ld.noop;

  /**
  *  ## Helpers Functions
  *
  *  Helpers here are public functions created to facilitate interaction with
  *  the API.
  */

  group.helpers = {};

  /**
  * ### attachPads
  *  string or array
  */

  group.helpers.attachPads = ld.noop;

  /**
  * ### inviteUsers
  * string or array
  */

  group.helpers.inviteUsers = ld.noop;

  /**
  * ### setAdmins
  * string or array
  */

  group.helpers.setAdmins = ld.noop;

  /**
  * ### setPassword
  * string of false
  */

  group.helpers.setPassword = ld.noop;

  /**
  * ### setPublic
  * boolean
  */

  group.helpers.setPublic = ld.noop;

  /**
  *  ## Internal Functions
  */

  group.fn = {};

  /**
  * ### assignProps
  *
  * `assignProps` takes params object and assign defaults if needed.
  * For performance reasons, it won't check existence for all pads, users,
  * admins given.
  * It creates :
  *
  * - an `admins` array, unioning admin key to optional others admins,
  * - a `users` array, empty or with given keys,
  * - a `pads` array, empty or with given keys,
  * - a `visibility` string, defaults to *restricted*, with only two other
  *   possibilities : *private* or *public*
  * - a `password` string, empty by default
  * - a `readonly` boolean, *false* by default
  *
  * It returns the group object.
  */

  group.fn.assignProps = function (params) {
    var p = params;
    var g = { name: p.name };
    p.admins = ld.isArray(p.admins) ? ld.filter(p.admins, ld.isString) : [];
    g.admins = ld.union([ p.admin ], p.admins);
    ld.forEach(['pads', 'users'], function (k) { g[k] = ld.uniq(p[k]); });
    var v = p.visibility;
    var vVal = ['restricted', 'private', 'public'];
    g.visibility = (ld.isString(v) && ld.includes(vVal, v)) ? v : 'restricted';
    g.password = ld.isString(p.password) ? p.password : '';
    g.readonly = ld.isBoolean(p.readonly) ? p.readonly : false;
    return g;
  };

  return group;


}).call(this);

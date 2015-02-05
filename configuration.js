/**
* # Configuration Module
* 
* ## License
* 
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
* 
*   http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
* 
* ## Description
*
* This is the module for MyPads configuration.
*/

module.exports = (function() {
  'use strict';

  // Dependencies
  var ld = require('lodash');
  var storage = require('./storage.js');
  var db = storage.db;

  /**
  * The closure contains a private `defaults` field, holding defaults settings.
  * Configuration data is taken from the database, applying defaults when
  * necessary, for example at the plugin initialization.
  */

  var defaults = { passwordMin: 8, passwordMax: 30 };
  var PREFIX = 'mypads:configuration:';

  /**
  * `configuration` object is a closure to interact with the whole
  * config. It will be exported.
  */

  var configuration = {
    PREFIX: PREFIX,
    /**
    * `init` is called when mypads plugin is initialized. It fixes the default
    * data for the configuration into the database.
    * It takes an optional `callback` function used after db.set abstraction to
    * return an eventual error.
    */
    init: function (callback) {
      callback = callback || function () {};
      if (!ld.isFunction(callback)) {
        throw(new TypeError('callback must be a function'));
      }
      // Would like to use doBulk but not supported for all *ueberDB* backends
      storage.fn.setKeys(ld.transform(defaults, function (memo, val, key) {
        memo[PREFIX + key] = val; }), callback);
    },
    /**
    * `get` is an asynchronous function taking :
    * - a mandatory `key` string argument,
    * - a mandatory `callback` function argument returning error if error, null
    *   otherwise and the result
    */
    get: function (key, callback) {
      if (!ld.isString(key)) {
        throw(new TypeError('key must be a string'));
      }
      if (!ld.isFunction(callback)) {
        throw(new TypeError('callback must be a function'));
      }
      db.get(PREFIX + key, function (err, res) {
        if (err) { return callback(err); }
        if (ld.isUndefined(res)) {
          return callback(new Error('Key doesn\'t exist'));
        }
        callback(null, res);
      });
    },
    /**
    * `set` is an asynchronous function taking two mandatory arguments:
    *
    * - `key` string;
    * - `value`.
    * - `callback` function argument returning error if error, null otherwise
    *
    * `set` sets the value for the configuration key.
    */
    set: function (key, value, callback) {
      if (!ld.isString(key)) {
        throw(new TypeError('key must be a string'));
      }
      if (ld.isUndefined(value)) {
        throw(new TypeError('value is mandatory'));
      }
      if (!ld.isFunction(callback)) {
        throw(new TypeError('callback must be a function'));
      }
      db.set(PREFIX + key, value, callback);
    },
    /**
    * `del` is an asynchronous function that removes a configuration option.
    * It takes two mandatory arguments :
    * - a `key` string,
    * - a `callback` function argument returning error if error
    */
    del: function (key, callback) {
      if (!ld.isString(key)) {
        throw(new TypeError('key must be a string'));
      }
      if (!ld.isFunction(callback)) {
        throw(new TypeError('callback must be a function'));
      }
      db.remove(PREFIX + key, callback);
    },
    /**
    * `all` is an asynchronous function that returns the whole configuration
    * from database. Fields / keys are unprefixed. It needs a `callback`
    * function returning error if error, null otherwise and the result.
    */
    all: function(callback) {
      if (!ld.isFunction(callback)) {
        throw(new TypeError('callback must be a function'));
      }
      db.findKeys(PREFIX + '*', null, function (err, keys) {
        if (err) { return callback(err); }
        storage.fn.getKeys(keys, function (err, results) {
          if (results) {
            results = ld.transform(results, function (memo, val, key) {
              memo[key.replace(PREFIX, '')] = val;
            });
          }
          callback(arguments[0], results);
        });
      });
    }
  };
  return configuration;
}).call(this);


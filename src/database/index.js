'use strict';

const nconf = require('nconf');

const databaseName = 'postgres';
const primaryDB = require('./postgres');
const utils = require('../utils');

primaryDB.parseIntFields = function (data, intFields, requestedFields) {
	intFields.forEach((field) => {
		if (!requestedFields || !requestedFields.length || requestedFields.includes(field)) {
			data[field] = utils.isNumber(data[field]) ?
				parseInt(data[field], 10) :
				data[field] || 0;
		}
	});
};

primaryDB.initSessionStore = async function () {
	const sessionStoreConfig = nconf.get('session_store') || nconf.get(databaseName);
	primaryDB.sessionStore = await primaryDB.createSessionStore(sessionStoreConfig);
};

function promisifySessionStoreMethod(method, sid) {
	return new Promise((resolve, reject) => {
		if (!primaryDB.sessionStore) {
			resolve(method === 'get' ? null : undefined);
			return;
		}

		primaryDB.sessionStore[method](sid, (err, result) => {
			if (err) reject(err);
			else resolve(method === 'get' ? result || null : undefined);
		});
	});
}

primaryDB.sessionStoreGet = function (sid) {
	return promisifySessionStoreMethod('get', sid);
};

primaryDB.sessionStoreDestroy = function (sid) {
	return promisifySessionStoreMethod('destroy', sid);
};

module.exports = primaryDB;

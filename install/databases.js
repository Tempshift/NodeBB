'use strict';

const prompt = require('prompt');
const winston = require('winston');

const questions = {
	postgres: require('../src/database/postgres').questions,
};

module.exports = async function (config) {
	winston.info(`\nNow configuring postgres database:`);
	const databaseConfig = await getDatabaseConfig(config);
	return saveDatabaseConfig(config, databaseConfig);
};

async function getDatabaseConfig(config) {
	if (!config) {
		throw new Error('invalid config, aborted');
	}

	if (config['postgres:host'] && config['postgres:port']) {
		return config;
	}
	return await prompt.get(questions.postgres);
}

function saveDatabaseConfig(config, databaseConfig) {
	if (!databaseConfig) {
		throw new Error('invalid config, aborted');
	}

	config.postgres = {
		host: databaseConfig['postgres:host'],
		port: databaseConfig['postgres:port'],
		username: databaseConfig['postgres:username'],
		password: databaseConfig['postgres:password'],
		database: databaseConfig['postgres:database'],
		ssl: databaseConfig['postgres:ssl'],
	};

	const allQuestions = questions.postgres;
	for (let x = 0; x < allQuestions.length; x += 1) {
		delete config[allQuestions[x].name];
	}

	return config;
}

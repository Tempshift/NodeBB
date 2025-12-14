'use strict';

const path = require('path');

const fs = require('fs');
const cproc = require('child_process');

const { paths, pluginNamePattern } = require('../constants');

const pkgInstall = module.exports;

function sortDependencies(dependencies) {
	return Object.entries(dependencies)
		.sort((a, b) => (a < b ? -1 : 1))
		.reduce((memo, pkg) => {
			memo[pkg[0]] = pkg[1];
			return memo;
		}, {});
}

pkgInstall.updatePackageFile = () => {
	let oldPackageContents;

	try {
		oldPackageContents = JSON.parse(fs.readFileSync(paths.currentPackage, 'utf8'));
	} catch (e) {
		if (e.code !== 'ENOENT') {
			throw e;
		} else {
			// No local package.json, copy from install/package.json
			fs.copyFileSync(paths.installPackage, paths.currentPackage);
			return;
		}
	}

	const _ = require('lodash');
	const defaultPackageContents = JSON.parse(fs.readFileSync(paths.installPackage, 'utf8'));

	let dependencies = {};
	Object.entries(oldPackageContents.dependencies || {}).forEach(([dep, version]) => {
		if (pluginNamePattern.test(dep)) {
			dependencies[dep] = version;
		}
	});

	const { devDependencies } = defaultPackageContents;

	// Sort dependencies alphabetically
	dependencies = sortDependencies({ ...dependencies, ...defaultPackageContents.dependencies });

	const packageContents = { ..._.merge(oldPackageContents, defaultPackageContents), dependencies, devDependencies };
	fs.writeFileSync(paths.currentPackage, JSON.stringify(packageContents, null, 4));
};

pkgInstall.supportedPackageManager = ['bun'];

pkgInstall.getPackageManager = () => 'bun';

pkgInstall.installAll = () => {
	const prod = process.env.NODE_ENV !== 'development';
	const command = `bun install${prod ? ' --production' : ''}`;

	try {
		cproc.execSync(command, {
			cwd: path.join(__dirname, '../../'),
			stdio: [0, 1, 2],
		});
	} catch (e) {
		console.log('Error installing dependencies!');
		console.log(`message: ${e.message}`);
		console.log(`stdout: ${e.stdout}`);
		console.log(`stderr: ${e.stderr}`);
		throw e;
	}
};

pkgInstall.preserveExtraneousPlugins = () => {
	// Skip if `node_modules/` is not found or inaccessible
	try {
		fs.accessSync(paths.nodeModules, fs.constants.R_OK);
	} catch (e) {
		return;
	}

	const packages = fs.readdirSync(paths.nodeModules)
		.filter(pkgName => pluginNamePattern.test(pkgName));

	const packageContents = JSON.parse(fs.readFileSync(paths.currentPackage, 'utf8'));

	const extraneous = packages
		// only extraneous plugins (ones not in package.json) which are not links
		.filter((pkgName) => {
			const extraneous = !packageContents.dependencies.hasOwnProperty(pkgName);
			const isLink = fs.lstatSync(path.join(paths.nodeModules, pkgName)).isSymbolicLink();

			return extraneous && !isLink;
		})
		// reduce to a map of package names to package versions
		.reduce((map, pkgName) => {
			const pkgConfig = JSON.parse(fs.readFileSync(path.join(paths.nodeModules, pkgName, 'package.json'), 'utf8'));
			map[pkgName] = pkgConfig.version;
			return map;
		}, {});

	// Add those packages to package.json
	packageContents.dependencies = sortDependencies({ ...packageContents.dependencies, ...extraneous });

	fs.writeFileSync(paths.currentPackage, JSON.stringify(packageContents, null, 4));
};

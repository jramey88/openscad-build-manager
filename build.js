const { OpenScadBuildManager } = require('openscad-build-manager');
const buildManager = new OpenScadBuildManager;
const args = process.argv.slice(2);

buildManager.init();
buildManager.run(args);
#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const kill = require('tree-kill');
const fs = require('fs');
const isWsl = require('is-wsl');
const activeProcesses = new Set();

const killChildProcesses = () => {
	if (activeProcesses.size > 0) {
		console.log(`\nStopping ${activeProcesses.size} child processes`);
		
		if (isWsl) {
			//this doesn't work yet, not sure why
			try {
				//const command = `taskkill.exe /IM "${openScadPath}" /T /F 2> /dev/null || true`;
				const command = `/mnt/c/Windows/system32/taskkill.exe /IM openscad.com /T /F 2> /dev/null || true`;
				console.log(command);
				execSync(command);
			} catch (e) {
				//ignore errors
			}
		} else {
			for (const child of activeProcesses) {
				kill(child.pid);
			}
		}

		activeProcesses.clear();
	}
};

// Ctrl+C in terminal
process.on('SIGINT', () => {
    killChildProcesses();
    process.exit(130); // Standard exit code for SIGINT
});

// Termination signal
process.on('SIGTERM', () => {
    killChildProcesses();
    process.exit(143);
});

// Optional: Catch uncaught exceptions to clean up before crashing
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    killChildProcesses();
    process.exit(1);
});

class OpenScadBuildManager {
	cwd = '';	//absolute file system path, not relative
	config = {};
	openScadPath = '';

	//find config.json in working directory, load into config variable
	loadConfig = () => {
		try {
			const configPath = `${this.cwd}/config.json`;
			console.log("config path", configPath);
			const jsonString = fs.readFileSync(`${this.cwd}/config.json`, 'utf8');
			this.config = JSON.parse(jsonString);
		} catch (err) {
			console.log('Error reading or parsing file:', err);
		}
	}

	getOpenScadPath = () => {
		if (isWsl) return "/mnt/c/Program Files/OpenSCAD/openscad.com";

		if (process.platform === "win32") {
			const defaultWin = "C:\\Program Files\\OpenSCAD\\openscad.com";
			return fs.existsSync(defaultWin) ? defaultWin : "openscad.com";
		}

		return "openscad";
	}

	renderPart = async (part) => {
		const outputDir = this.config.render_dir;
		const stlPrefix = this.config.stl_prefix;
		const source = this.config.source;

		return new Promise((resolve, reject) => {
			const outputFile = `${outputDir}/${stlPrefix}${part}.stl`;
			const commandArgs = [
				'-o',
				outputFile,
				'-D',
				`render_model_name="${part}"`,
				source
			];
			console.log("building", part);
			const child = spawn(this.openScadPath, commandArgs, {});
			activeProcesses.add(child);

			child.on('close', (code) => {
				activeProcesses.delete(child);

				if (code === 0) {
					console.log(`Part '${part}' rendered to file '${outputFile}'`);
					resolve();
				} else {
					reject(`Part '${part}' failed to render with code ${code}`);
				}
			});

			child.on('error', (err) => {
				activeProcesses.delete(child);
				console.log('Child process failed to spawn');
				reject(err);
			});
		});
	}

	run = async (args) => {
		const outputDir = this.config.render_dir;

		if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

		//queue parts for build, only queue parts in config
		const parts = args.length > 0 ? this.config.parts.filter(p => args.includes(p)) : this.config.parts;
		const queue = [...parts];
		const active = [];
		const buildLabel = "Total build time";

		console.time(buildLabel);

		while (queue.length>0 || active.length>0) {
			while (queue.length > 0 && active.length < this.config.max_threads) {
				const part = queue.shift();
				const promise = this.renderPart(part).then(() => {
					active.splice(active.indexOf(promise), 1);
				});
				active.push(promise);
			}
			await Promise.race(active);
		}

		console.timeEnd(buildLabel);
		console.log("All renders complete!");
	}

	init = () => {
		this.cwd = process.env.INIT_CWD;
		this.openScadPath = this.getOpenScadPath();
		this.loadConfig();
	}
}

module.exports = {
	OpenScadBuildManager
};
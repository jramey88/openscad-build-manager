#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const kill = require('tree-kill');
const fs = require('fs');
const isWsl = require('is-wsl');
const config = require('./config.json');
const output_dir = `./${config.render_dir}`;
const activeProcesses = new Set();

function getOpenScadPath() {
	if (isWsl) return "/mnt/c/Program Files/OpenSCAD/openscad.com";

	if (process.platform === "win32") {
		const defaultWin = "C:\\Program Files\\OpenSCAD\\openscad.com";
        return fs.existsSync(defaultWin) ? defaultWin : "openscad.com";
    }

	return "openscad";
}

const openScadPath = getOpenScadPath();

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

async function renderPart(part) {
	return new Promise((resolve, reject) => {
		const output_file = `${output_dir}/${config.stl_prefix}${part}.stl`;
		const command_args = [
			'-o',
			output_file,
			'-D',
			`render_model_name="${part}"`,
			config.source
		];
		console.log("building", part);
		const child = spawn(openScadPath, command_args, {});
		activeProcesses.add(child);

		child.on('close', (code) => {
			activeProcesses.delete(child);

			if (code === 0) {
				console.log(`Part '${part}' rendered to file '${output_file}'`);
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

async function run() {
	if (!fs.existsSync(output_dir)) fs.mkdirSync(output_dir);

	const args = process.argv.slice(2);
	//queue parts for build, only queue parts in config
	const parts = args.length > 0 ? config.parts.filter(p => args.includes(p)) : config.parts;
	const queue = [...parts];
	const active = [];
	const build_label = "Total build time";

	console.time(build_label);

	while (queue.length>0 || active.length>0) {
		while (queue.length > 0 && active.length < config.max_threads) {
			const part = queue.shift();
			const promise = renderPart(part).then(() => {
				active.splice(active.indexOf(promise), 1);
			});
			active.push(promise);
		}
		await Promise.race(active);
	}

	console.timeEnd(build_label);

	console.log("All renders complete!");
}

run();
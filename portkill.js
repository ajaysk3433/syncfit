#!/usr/bin/env node

const { execSync } = require("child_process");
const readline = require("readline");

const port = process.argv[2];

if (!port || !/^\d+$/.test(port)) {
    console.log("Usage: portkill <port>");
    console.log("Example: portkill 3000");
    process.exit(1);
}

function findProcess(port) {
    try {
        if (process.platform === "win32") {
            const output = execSync(`netstat -ano | findstr :${port}`, {
                encoding: "utf8",
            });

            const lines = output.trim().split("\n");

            return lines
                .map(line => {
                    const parts = line.trim().split(/\s+/);

                    return {
                        pid: parts[parts.length - 1],
                        address: parts[1],
                        state: parts[3],
                    };
                })
                .filter(p => p.pid && p.pid !== "0");
        }

        // macOS / Linux
        const output = execSync(`lsof -nP -i :${port} -sTCP:LISTEN`, {
            encoding: "utf8",
        });

        const lines = output.trim().split("\n");

        // Remove header
        lines.shift();

        return lines.map(line => {
            const parts = line.trim().split(/\s+/);

            return {
                command: parts[0],
                pid: parts[1],
                user: parts[2],
                address: parts[8],
            };
        });
    } catch {
        return [];
    }
}

function killProcess(pid) {
    try {
        if (process.platform === "win32") {
            execSync(`taskkill /PID ${pid} /F`);
        } else {
            process.kill(Number(pid), "SIGTERM");
        }

        console.log(`\n✓ Process ${pid} killed.`);
    } catch (error) {
        console.error(`\n✗ Failed to kill process ${pid}`);
        console.error(error.message);
    }
}

const processes = findProcess(port);

if (processes.length === 0) {
    console.log(`No process is listening on port ${port}.`);
    process.exit(0);
}

console.log(`\nProcess(es) using port ${port}:\n`);

processes.forEach((process, index) => {
    console.log(`${index + 1}. PID: ${process.pid}`);

    if (process.command) {
        console.log(`   Program: ${process.command}`);
    }

    if (process.user) {
        console.log(`   User: ${process.user}`);
    }

    if (process.address) {
        console.log(`   Address: ${process.address}`);
    }

    console.log();
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question("Do you want to kill this process? (y/N): ", answer => {
    rl.close();

    if (answer.toLowerCase() === "y") {
        processes.forEach(p => killProcess(p.pid));
    } else {
        console.log("Process was not killed.");
    }
});
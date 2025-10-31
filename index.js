import { spawn } from "child_process";

const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true,
});

child.on("close", (code) => {
    console.log(`npm run dev exited with code ${code}`);
});

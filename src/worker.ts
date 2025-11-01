import { parentPort } from "worker_threads";
import { downloadTrackBuffer } from "./utils/MusicUtils.ts";

if (!parentPort) {
    throw new Error("worker.ts: parentPort is null");
}

parentPort.on("message", async (tracks) => {
    const validTracks = [];

    for (const t of tracks) {
        try {
            const buf = await downloadTrackBuffer(t.url);
            if (buf) validTracks.push(t);
        } catch (_) {}
    }

    parentPort!.postMessage(validTracks);
});

// src/utils/MusicUtils.ts
import { Readable } from "stream";
import scdl from "soundcloud-downloader";
import axios from "axios";

export type Track = {
    title: string;
    author: string;
    url: string;
    duration?: number;
};

async function getClientId(): Promise<string> {
    const page = await axios.get("https://soundcloud.com", {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
    });

    const regex = /client_id=([a-zA-Z0-9]{32})/;
    const match = page.data.match(regex);

    if (match) return match[1];

    const scriptRegex = /<script crossorigin src="([^"]+)"/g;
    let s;
    while ((s = scriptRegex.exec(page.data)) !== null) {
        try {
            const js = await axios.get(s[1]);
            const m2 = js.data.match(regex);
            if (m2) return m2[1];
        } catch {}
    }

    throw new Error("Client ID not found");
}

export async function searchTrack(query: string): Promise<Track[]> {
    try {
        const clientId = await getClientId();
        const encoded = encodeURIComponent(query);
        const url = `https://api-v2.soundcloud.com/search/tracks?q=${encoded}&client_id=${clientId}&limit=10`;

        const resp = await axios.get(url);
        const tracks = resp.data.collection;

        return tracks.map((track: any) => ({
            title: track.title,
            author: track.user?.username || "Unknown",
            url: track.permalink_url || track.permalink,
            duration: Math.floor(track.duration / 1000),
        })) as Track[];
    } catch (err: any) {
        console.error("SoundCloud SEARCH error:", err.message || err);
        return [];
    }
}

export async function downloadTrackBuffer(url: string): Promise<Buffer | null> {
    try {
        const stream: Readable = await scdl.default.download(url);

        const chunks: Buffer[] = [];
        return await new Promise((resolve, reject) => {
            stream.on("data", (chunk: Buffer) => {
                chunks.push(
                    Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                );
            });
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", (err) => {
                console.error("SCDL stream error:", err);
                reject(err);
            });
        });
    } catch (err: any) {
        return null;
    }
}

import fs from "fs";
import path from "path";
import type { Track } from "./MusicUtils.js";

const LIST_FILE = path.join(process.cwd(), "lists.json");

let globalLists: Map<string, Track[]> = new Map();

export function loadLists() {
    try {
        if (!fs.existsSync(LIST_FILE)) return;

        const json = JSON.parse(fs.readFileSync(LIST_FILE, "utf8"));
        globalLists = new Map(Object.entries(json.lists || {}));

        console.log("✅ Загружены списки:", globalLists.size);
    } catch (err) {
        console.error("❌ | Ошибка загрузки lists.json:", err);
    }
}

export function saveLists() {
    try {
        const json = {
            lists: Object.fromEntries(globalLists),
        };
        fs.writeFileSync(LIST_FILE, JSON.stringify(json, null, 2), "utf8");
    } catch (err) {
        console.error("❌ | Ошибка записи lists.json:", err);
    }
}

export function addList(listId: string, tracks: Track[]) {
    globalLists.set(listId, tracks);

    while (globalLists.size > 1000) {
        const firstKey = globalLists.keys().next().value;
        globalLists.delete(firstKey!);
    }

    saveLists();
}

export function getList(listId: string): Track[] | undefined {
    return globalLists.get(listId);
}

export { globalLists };

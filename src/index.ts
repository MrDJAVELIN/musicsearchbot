import { Markup, Telegraf, session } from "telegraf";
import { config } from "dotenv";
import {
    searchTrack,
    downloadTrackBuffer,
    type Track,
} from "./utils/MusicUtils.ts";
import { loadLists, addList, getList } from "./utils/jsonUtils.ts";

config();

const bot = new Telegraf(process.env.token!);
bot.use(session());

loadLists();

function genListId() {
    return Math.random().toString(36).slice(2, 10);
}

bot.start((ctx) => {
    ctx.reply(
        "Бот позволяет искать и скачивать треки с SoundCloud.\n" +
            "Просто отправьте название песни, выберите вариант из списка, и получите трек в формате MP3." +
            "\n\ndeveloped by @djvlnn"
    );
});

bot.on("text", async (ctx) => {
    const query = ctx.message?.text?.trim();

    const isGroup =
        ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

    if (isGroup && !query.startsWith("/msearch")) return;

    const searchQuery = isGroup ? query.replace("/msearch", "").trim() : query;

    if (!searchQuery) {
        return ctx.reply("⚠️ | Введите название песни");
    }

    try {
        console.log(
            `[Поиск] | "${searchQuery}" | от ${ctx.from?.username || "anon"}`
        );

        let seconds = 0;
        const searchmsg = await ctx.reply(`🔎 | Поиск... 0 сек`);

        const timer = setInterval(async () => {
            seconds++;
            try {
                await ctx.telegram.editMessageText(
                    searchmsg.chat.id,
                    searchmsg.message_id,
                    undefined,
                    `🔎 | Поиск... ${seconds} сек`
                );
            } catch {}
        }, 1000);

        const results: Track[] = await searchTrack(searchQuery);

        if (!results.length) {
            clearInterval(timer);
            return ctx.reply("❌ | Ничего не найдено.");
        }

        const filtered: Track[] = [];
        for (const track of results) {
            try {
                const buffer = await downloadTrackBuffer(track.url);
                if (buffer) filtered.push(track);
            } catch {}
        }

        clearInterval(timer);

        await ctx.deleteMessage(searchmsg.message_id).catch(() => {});

        if (!filtered.length)
            return ctx.reply("❌ | Нет доступных для скачивания треков.");

        const listId = genListId();
        addList(listId, filtered);

        const buttons = filtered.map((t, i) => {
            let duration = "";
            if (t.duration) {
                duration = ` | ${Math.floor(t.duration / 60)}:${String(
                    t.duration % 60
                ).padStart(2, "0")}`;
            }
            return Markup.button.callback(
                `${i + 1}. ${t.title} — ${t.author}${duration}`,
                `sc_${listId}_${i}`
            );
        });

        await ctx.reply(
            `Выбери трек: (поиск занял ${seconds} сек)`,
            Markup.inlineKeyboard(buttons, { columns: 1 })
        );
    } catch (err) {
        console.error(err);
        ctx.reply("❌ | Ошибка поиска треков.");
    }
});

bot.on("callback_query", async (ctx) => {
    const cb = ctx.update.callback_query;
    if (!("data" in cb)) return ctx.answerCbQuery("Некорректный callback");

    const parts = cb.data.split("_");
    if (parts.length !== 3) return ctx.answerCbQuery("❌ Ошибка callback");

    const [, listId, indexStr] = parts;
    const index = Number(indexStr);

    const list = getList(listId);
    if (!list) return ctx.answerCbQuery("❌ | Список устарел");

    const track = list[index];
    if (!track) return ctx.answerCbQuery("❌ | Трек не найден");

    await ctx.reply(`🎵 Загружаю трек: <b>${track.title}</b>`, {
        parse_mode: "HTML",
    });

    try {
        const buffer = await downloadTrackBuffer(track.url);
        if (!buffer) return ctx.reply("❌ | Не удалось скачать трек.");

        await ctx.replyWithAudio(
            { source: buffer },
            { title: track.title, performer: track.author }
        );

        ctx.answerCbQuery();
    } catch (err) {
        console.error("Ошибка скачивания:", err);
        ctx.reply("❌ | Не удалось скачать трек.");
    }
});

bot.launch(() => console.log("✅ Bot started"));

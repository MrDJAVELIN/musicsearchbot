import { Markup, Telegraf, session } from "telegraf";
import { config } from "dotenv";
import { downloadTrackBuffer, searchTrack } from "./utils/MusicUtils.ts";
import type { Track } from "./utils/MusicUtils.ts";

config();
const bot = new Telegraf(process.env.token || "");
bot.use(session());

bot.start((ctx) => {
    ctx.reply(
        "Бот позволяет искать и скачивать треки с SoundCloud.\n" +
            "Просто отправьте название песни, выберите вариант из списка, и получите трек в формате MP3." +
            "\n\ndeveloped by @djvlnn"
    );
});

bot.on("text", async (ctx) => {
    const query = ctx.message?.text?.trim();

    const isPrivate = ctx.chat?.type === "private";
    const isGroup =
        ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

    if (isGroup && !query.startsWith("/msearch")) return;

    const searchQuery = isGroup ? query.replace("/msearch", "").trim() : query;

    if (!searchQuery) {
        ctx.reply("⚠️ | Введите название песни");
    }

    try {
        console.log(
            `[Поиск] | "${searchQuery}" | от ${ctx.message.from.username}`
        );
        const results: Track[] = await searchTrack(searchQuery);
        if (!results.length) return ctx.reply("❌ | Ничего не найдено.");

        const searchmsg = await ctx.reply("🔎 | Поиск...");

        const filtered: Track[] = [];
        for (const track of results) {
            try {
                const buffer = await downloadTrackBuffer(track.url);
                if (buffer) filtered.push(track);
            } catch {}
        }

        if (!filtered.length)
            return ctx.reply("❌ | Нет доступных для скачивания треков.");

        ctx.session ??= {};
        ctx.session.scList = filtered.map((t) => ({
            title: t.title,
            author: t.author || "Unknown",
            url: t.url,
        }));

        const buttons = filtered.map((t, i) => {
            let duration = "";
            if (t.duration) {
                const minutes = Math.floor(t.duration / 60);
                const seconds = t.duration % 60;
                duration = ` | ${minutes}:${seconds}`;
            }
            return Markup.button.callback(
                `${i + 1}. ${t.title} — ${t.author}${duration}`,
                `sc_${i}`
            );
        });

        const listMsg = await ctx.reply(
            "Выбери трек:",
            Markup.inlineKeyboard(buttons, { columns: 1 })
        );
        ctx.session.listMessageId = listMsg.message_id;

        await ctx.deleteMessage(searchmsg.message_id);
    } catch (err) {
        console.error(err);
        ctx.reply("❌ | Ошибка поиска треков.");
    }
});

bot.on("callback_query", async (ctx) => {
    const cb = ctx.update.callback_query;
    if (!("data" in cb)) return ctx.answerCbQuery("❌ | Некорректный callback");

    const index = Number(cb.data.replace("sc_", ""));
    const track = ctx.session?.scList?.[index];
    if (!track) return ctx.answerCbQuery("❌ | Список устарел");

    await ctx.reply(`🎵 | Загружаю трек: <b>${track.title}</b>`, {
        parse_mode: "HTML",
    });

    try {
        const buffer = await downloadTrackBuffer(track.url);
        if (!buffer) return ctx.reply("❌ | Не удалось скачать трек.");

        await ctx.replyWithAudio(
            { source: buffer },
            { title: track.title, performer: track.author }
        );

        delete ctx.session.scList;

        if (ctx.session.listMessageId) {
            try {
                await ctx.deleteMessage(ctx.session.listMessageId);
            } catch {}
            delete ctx.session.listMessageId;
        }

        ctx.answerCbQuery();
    } catch (err) {
        console.error("❌ | Ошибка скачивания:", err);
        ctx.reply("❌ | Не удалось скачать трек.");
    }
});

bot.launch(() => console.log("✅ - Bot started"));

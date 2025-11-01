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
            "\n\nРазработчик: @djvlnn"
    );
});

bot.on("text", async (ctx) => {
    const query = ctx.message?.text?.trim();
    if (!query || query.length < 2 || ctx.message.text.startsWith("/")) return;

    try {
        let results: Track[] = await searchTrack(query);
        if (!results.length) return ctx.reply("Ничего не найдено.");

        const searchmsg = await ctx.reply("🔎Поиск");

        const filtered: Track[] = [];
        for (const track of results) {
            try {
                const buffer = await downloadTrackBuffer(track.url);
                if (buffer) filtered.push(track);
            } catch {}
        }

        if (!filtered.length)
            return ctx.reply("Нет доступных для скачивания треков.");

        ctx.session ??= {};
        ctx.session.scList = filtered;

        const buttons = filtered.map((t, i) => {
            let duration = "";
            if (t.duration) {
                const minutes = Math.floor(t.duration / 60);
                const seconds = t.duration % 60;
                duration = ` | ${minutes}:${seconds}`;
            }
            return Markup.button.callback(
                `${i + 1}. ${t.title} — ${t.author}${duration}`,
                `track_${i}`
            );
        });

        await ctx.deleteMessage(searchmsg.message_id);

        await ctx.reply(
            "Выбери трек:",
            Markup.inlineKeyboard(buttons, { columns: 1 })
        );
    } catch (err) {
        console.error(err);
        ctx.reply("Ошибка поиска треков.");
    }
});

bot.on("callback_query", async (ctx) => {
    const cb = ctx.update.callback_query;
    if (!("data" in cb)) return ctx.answerCbQuery("Некорректный callback");

    const index = Number(cb.data.replace("track_", ""));
    const track = ctx.session?.scList?.[index];
    if (!track) return ctx.answerCbQuery("Список устарел");

    await ctx.reply(`🎵 Загружаю трек: <b>${track.title}</b>`, {
        parse_mode: "HTML",
    });

    const buffer = await downloadTrackBuffer(track.url);
    if (!buffer) return ctx.reply("❌ Не удалось скачать трек.");

    await ctx.replyWithAudio(
        { source: buffer },
        { title: track.title, performer: track.author }
    );
    ctx.answerCbQuery();
});

bot.launch(() => console.log("Bot started"));

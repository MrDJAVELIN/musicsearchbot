import "telegraf";

declare module "telegraf" {
    interface Context {
        session: {
            [x: string]: string;
            scLists?: Map<string, Track[]>;
            listMessageId?: number;
        };
    }
}

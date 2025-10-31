import "telegraf";

declare module "telegraf" {
    interface Context {
        session: {
            scList?: {
                title: string;
                author: string;
                url: string;
            }[];
        };
    }
}

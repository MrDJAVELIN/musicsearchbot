import "telegraf";

declare module "telegraf" {
    interface Context {
        session: {
            [x: string]: number;
            scList?: {
                title: string;
                author: string;
                url: string;
            }[];
        };
    }
}

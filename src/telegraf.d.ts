import "telegraf";

declare module "telegraf" {
    interface Context {
        session: {
            [x: string]: any;
            scList?: {
                title: string;
                author: string;
                url: string;
            }[];
        };
    }
}

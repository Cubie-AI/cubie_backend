import { z } from "zod";

const twitterConfig = z.object({
  username: z.string().transform((value) => value.replace("@", "")),
  password: z.string(),
  email: z.string(),
});

const telegramConfig = z.object({
  username: z.string().transform((value) => value.replace("@", "")),
  botToken: z.string(),
});

export const launchSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .max(32, { message: "Name must be less than 32 characters" }),
  ticker: z
    .string({
      required_error: "Ticker is required",
    })
    .max(10, { message: "Ticker must be less than 10 characters" }),
  bio: z
    .string({
      required_error: "Bio is required",
    })
    .max(256, { message: "Bio must be less than 256 characters" }),
  api: z.string({}).optional().default(""),
  twitterConfig: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Twitter configuration is required",
        });
        return undefined;
      }
      const parsed = twitterConfig.safeParse(JSON.parse(value));

      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid Twitter configuration",
        });
        return undefined;
      }

      return parsed.data;
    }),
  telegramConfig: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) {
        return undefined;
      }
      const parsed = telegramConfig.safeParse(JSON.parse(value));

      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid Telegram configuration",
        });
        return undefined;
      }

      return parsed.data;
    }),
  // people: z.array(z.string()).optional().default([]),
  knowledge: z.array(z.string()).optional().default([]),
  style: z.array(z.string()).optional().default([]),
  twitterStyle: z.array(z.string()).optional().default([]),
  telegramStyle: z.array(z.string()).optional().default([]),
  devBuy: z
    .string({
      required_error: "Dev buy amount is required",
    })
    .transform((value) => parseFloat(value)),
});

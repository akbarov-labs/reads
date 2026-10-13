import { describe, expect, it } from "vitest";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

type Tree = { [key: string]: string | Tree };

/** Every message as "namespace.key" → text. */
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === "string" ? [[`${prefix}${key}`, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

/** The argument names a message takes, plural and select options included. */
function placeholders(elements: MessageFormatElement[]): string[] {
  return elements.flatMap((element) => {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        return [element.value];
      case TYPE.plural:
      case TYPE.select:
        return [element.value, ...Object.values(element.options).flatMap((option) => placeholders(option.value))];
      case TYPE.tag:
        return [`<${element.value}>`, ...placeholders(element.children)];
      default:
        return [];
    }
  });
}

const LOCALES = { uz: flatten(uz), ru: flatten(ru), en: flatten(en) };

describe("messages", () => {
  it("have exactly the same keys in uz, ru and en", () => {
    const keys = Object.keys(LOCALES.uz).sort();
    expect(keys.length).toBeGreaterThan(0);
    expect(Object.keys(LOCALES.ru).sort()).toEqual(keys);
    expect(Object.keys(LOCALES.en).sort()).toEqual(keys);
  });

  it.each(Object.entries(LOCALES))("%s: every message parses as ICU", (_, messages) => {
    const broken = Object.entries(messages).flatMap(([key, text]) => {
      try {
        parse(text);
        return [];
      } catch (error) {
        return [`${key}: ${(error as Error).message}`];
      }
    });
    expect(broken).toEqual([]);
  });

  it("take the same placeholders in every language", () => {
    const args = (text: string) => [...new Set(placeholders(parse(text)))].sort().join(", ");
    const mismatched = Object.entries(LOCALES.uz).flatMap(([key, text]) => {
      const expected = args(text);
      return (["ru", "en"] as const)
        .filter((locale) => args(LOCALES[locale][key] ?? "") !== expected)
        .map((locale) => `${key} (${locale}): {${args(LOCALES[locale][key] ?? "")}} vs uz {${expected}}`);
    });
    expect(mismatched).toEqual([]);
  });

  it("write Uzbek with ʻ and ʼ, never a straight or curly quote between letters", () => {
    const offenders = Object.entries(LOCALES.uz).filter(([, text]) => /\p{L}['‘’`]\p{L}/u.test(text));
    expect(offenders).toEqual([]);
  });
});

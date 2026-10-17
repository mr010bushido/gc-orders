import { expect, it } from "vitest";
import { normaliseZambianMobile } from "./phone";

it.each([
  ["0977 123 456", "+260977123456"],
  ["+260 96 622 2440", "+260966222440"],
  ["260966222440", "+260966222440"],
  ["00260-966-222-440", "+260966222440"],
  ["(0)955 123456", "+260955123456"],
  ["771234567", "+260771234567"],
])("normalises %s", (input, expected) => {
  expect(normaliseZambianMobile(input)).toBe(expected);
});

it.each([
  ["foreign", "+254712345678"],
  ["landline", "0211 123 456"],
  ["eight digits after the country code", "+26097712345"],
  ["ten digits after the country code", "+2609771234567"],
  ["letters", "0977 12a 456"],
  ["plus without country code", "+977123456"],
  ["empty", ""],
])("rejects %s", (_name, input) => {
  expect(normaliseZambianMobile(input)).toBeNull();
});

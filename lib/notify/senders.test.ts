import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { consoleEmail, createEmailSender, resendEmail } from "./email";
import { consoleSms, createSmsSender, twilioSms } from "./sms";

// Built at runtime so secret scanners do not mistake the fake SID for a real one.
const SID = "AC" + "0123456789abcdef".repeat(2);
const TOKEN = "fake-twilio-auth-token-123";
const KEY = "re_fake_resend_key_456";
const twilioEnv = { TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN, TWILIO_FROM: "+15005550006" };
const resendEnv = { RESEND_API_KEY: KEY, EMAIL_FROM: "Giuseppe's Cakes <orders@example.com>" };
const email = { to: "mwila@example.com", subject: "Booking received", text: "Hello", html: "<p>Hello</p>" };

const fetchMock = vi.fn<typeof fetch>();
const info = vi.spyOn(console, "info").mockImplementation(() => {});
beforeEach(() => {
  fetchMock.mockReset();
  info.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const errorOf = (promise: Promise<unknown>) => promise.then(() => { throw new Error("expected a rejection"); }, (error: Error) => error);

it.each([{}, { TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN }, { ...twilioEnv, TWILIO_AUTH_TOKEN: "" }])("uses the console SMS sender without full credentials %#", async (env) => {
  const sender = createSmsSender(env);
  expect(sender).toBe(consoleSms);
  expect((await sender.send({ to: "+260977123456", text: "Hi" })).id).toMatch(/^console-/);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(info.mock.calls.join()).toContain("+260 ••• ••• 456");
  expect(info.mock.calls.join()).not.toContain("977123");
});

it.each([{}, { RESEND_API_KEY: KEY }, { EMAIL_FROM: "orders@example.com" }])("uses the console email sender without full credentials %#", async (env) => {
  const sender = createEmailSender(env);
  expect(sender).toBe(consoleEmail);
  expect((await sender.send(email)).id).toMatch(/^console-/);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(info.mock.calls.join()).toContain("•••@example.com");
  expect(info.mock.calls.join()).not.toContain("mwila");
});

it("hides message text from console logs in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  try {
    await consoleSms.send({ to: "+260977123456", text: "link ?t=secret-token" });
    await consoleEmail.send({ ...email, text: "link ?t=secret-token" });
    expect(info.mock.calls.join()).not.toContain("secret-token");
  } finally {
    vi.unstubAllEnvs();
  }
});

it("sends through Twilio with basic auth and returns the message SID", async () => {
  fetchMock.mockResolvedValue(json(201, { sid: "SM123" }));
  expect(await createSmsSender(twilioEnv).send({ to: "+260977123456", text: "Booking CAKE-2026-0001" })).toEqual({ id: "SM123" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`);
  expect(init?.method).toBe("POST");
  expect((init?.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`);
  expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({ To: "+260977123456", From: "+15005550006", Body: "Booking CAKE-2026-0001" });
});

it.each([
  ["an error response", () => fetchMock.mockResolvedValue(json(401, { code: 20003, message: `Authenticate ${SID} ${TOKEN}` })), "Twilio responded 401 (code 20003)"],
  ["a non-JSON response", () => fetchMock.mockResolvedValue(new Response(`<html>${SID}</html>`, { status: 500 })), "Twilio responded 500"],
  ["a network failure", () => fetchMock.mockRejectedValue(new TypeError(`fetch failed for https://api.twilio.com/Accounts/${SID}`)), "Twilio request failed"],
])("keeps credentials out of Twilio errors on %s", async (_, arrange, message) => {
  arrange();
  const error = await errorOf(twilioSms(SID, TOKEN, "+15005550006").send({ to: "+260977123456", text: "Hi" }));
  expect(error.message).toBe(message);
  expect(JSON.stringify([error.message, error.stack, error.cause])).not.toMatch(new RegExp(`${SID}|${TOKEN}`));
});

it("sends through Resend with a bearer key and returns the email id", async () => {
  fetchMock.mockResolvedValue(json(200, { id: "em_123" }));
  expect(await createEmailSender(resendEnv).send(email)).toEqual({ id: "em_123" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
  expect(JSON.parse(init?.body as string)).toEqual({ from: resendEnv.EMAIL_FROM, ...email, to: [email.to] });
});

it.each([
  ["an error response", () => fetchMock.mockResolvedValue(json(403, { message: `API key ${KEY} is invalid` })), "Resend responded 403"],
  ["a network failure", () => fetchMock.mockRejectedValue(new TypeError(`fetch failed ${KEY}`)), "Resend request failed"],
])("keeps the key out of Resend errors on %s", async (_, arrange, message) => {
  arrange();
  const error = await errorOf(resendEmail(KEY, "orders@example.com").send(email));
  expect(error.message).toBe(message);
  expect(JSON.stringify([error.message, error.stack, error.cause])).not.toContain(KEY);
});

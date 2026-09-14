import { describe, expect, it } from "vitest";

import { parseOcrFormData } from "@/lib/ocr/form";

function jpegFile(name: string, bytes: Uint8Array): File {
  return new File([bytes as unknown as BlobPart], name, { type: "image/jpeg" });
}

function baseForm(extra?: (form: FormData) => void): FormData {
  const form = new FormData();
  form.set("sessionId", "s1");
  form.set("matchNo", "1");
  extra?.(form);
  return form;
}

describe("parseOcrFormData", () => {
  it("happy path: 2 jpegs decode back to the original bytes", async () => {
    const a = new Uint8Array([1, 2, 3, 255, 0, 128]);
    const b = new Uint8Array([9, 8, 7]);
    const form = baseForm((f) => {
      f.append("images", jpegFile("a.jpg", a));
      f.append("images", jpegFile("b.jpg", b));
    });

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessionId).toBe("s1");
    expect(result.matchNo).toBe(1);
    expect(result.images).toHaveLength(2);
    expect(result.images[0]?.mimeType).toBe("image/jpeg");
    expect(Buffer.from(result.images[0]?.dataBase64 ?? "", "base64")).toEqual(
      Buffer.from(a),
    );
    expect(Buffer.from(result.images[1]?.dataBase64 ?? "", "base64")).toEqual(
      Buffer.from(b),
    );
  });

  it("missing sessionId → BAD_REQUEST", async () => {
    const form = new FormData();
    form.set("matchNo", "1");
    form.append("images", jpegFile("a.jpg", new Uint8Array([1])));

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/sessionId/i);
  });

  it('matchNo "abc" → BAD_REQUEST', async () => {
    const form = baseForm((f) => {
      f.set("matchNo", "abc");
      f.append("images", jpegFile("a.jpg", new Uint8Array([1])));
    });

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/matchNo/i);
  });

  it("0 images → BAD_REQUEST", async () => {
    const result = await parseOcrFormData(baseForm());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/at least 1 image/i);
  });

  it("15 images → BAD_REQUEST", async () => {
    const form = baseForm((f) => {
      for (let i = 0; i < 15; i++) {
        f.append("images", jpegFile(`s${i}.jpg`, new Uint8Array([i])));
      }
    });

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/15.*max 14/i);
  });

  it("wrong mime (image/webp) → BAD_REQUEST", async () => {
    const form = baseForm((f) => {
      f.append(
        "images",
        new File([new Uint8Array([1, 2])], "a.webp", { type: "image/webp" }),
      );
    });

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/image\/webp/i);
  });

  it("empty file → BAD_REQUEST", async () => {
    const form = baseForm((f) => {
      f.append("images", jpegFile("empty.jpg", new Uint8Array(0)));
    });

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/empty/i);
  });

  it("6MB file → BAD_REQUEST", async () => {
    const form = baseForm((f) => {
      f.append(
        "images",
        jpegFile("big.jpg", new Uint8Array(6 * 1024 * 1024)),
      );
    });

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/max 5MB/i);
  });
});

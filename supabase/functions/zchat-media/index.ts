
import { initializeApp, cert, getApps } from "npm:firebase-admin@13/app";
import { getAuth } from "npm:firebase-admin@13/auth";
import { getFirestore } from "npm:firebase-admin@13/firestore";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://22pzwgryrk-dot.github.io",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function getFirebase() {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("Firebase credentials missing");

  const account = JSON.parse(raw);
  if (!getApps().length) {
    initializeApp({ credential: cert(account) });
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const bucket = Deno.env.get("MEDIA_BUCKET") ?? "zchat-media";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return reply({ error: "Method not allowed" }, 405);
  }

  try {
    if (!supabaseUrl || !serviceKey) {
      return reply({ error: "Storage configuration missing" }, 500);
    }

    const token = req.headers.get("Authorization")?.replace(
      /^Bearer\s+/i,
      "",
    );

    if (!token) return reply({ error: "Unauthorized" }, 401);

    const { auth, db } = getFirebase();
    const decoded = await auth.verifyIdToken(token, true);
    const uid = decoded.uid;

    const contentType = req.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return reply({ error: "Expected JSON" }, 415);
    }

    const body = await req.json();
    const action = body.action;
    const chatId = body.chatId;

    if (
      typeof chatId !== "string" ||
      chatId.length < 3 ||
      chatId.length > 300 ||
      !/^[a-zA-Z0-9_-]+$/.test(chatId)
    ) {
      return reply({ error: "Invalid chat ID" }, 400);
    }

    const chatDoc = await db.collection("chats").doc(chatId).get();

    if (!chatDoc.exists) {
      return reply({ error: "Chat not found" }, 404);
    }

    const participants = chatDoc.data()?.participants;

    if (!Array.isArray(participants) || !participants.includes(uid)) {
      return reply({ error: "Access denied" }, 403);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "upload") {
      const mime = body.mime;
      const data = body.data;

      if (
        typeof mime !== "string" ||
        typeof data !== "string" ||
        !/^(image\/(jpeg|png|webp|gif)|audio\/(webm|mp4|mpeg|ogg|wav|aac|x-m4a))$/.test(
          mime,
        )
      ) {
        return reply({ error: "Unsupported file type" }, 400);
      }

      // Base64 payload capped at approximately 8 MB.
      if (data.length > 11_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
        return reply({ error: "Invalid or oversized file" }, 413);
      }

      const binary = Uint8Array.from(
        atob(data),
        (character) => character.charCodeAt(0),
      );

      if (binary.byteLength > 8 * 1024 * 1024) {
        return reply({ error: "File too large" }, 413);
      }

      const extensions: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/aac": "aac",
        "audio/x-m4a": "m4a",
      };

      const ext = extensions[mime];
      const path = `chats/${chatId}/${uid}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, binary, {
          contentType: mime,
          upsert: false,
        });

      if (error) throw error;

      return reply({
        success: true,
        path,
        kind: mime.startsWith("image/") ? "image" : "audio",
      });
    }

    if (action === "download") {
      const path = body.path;

      if (
        typeof path !== "string" ||
        path.length > 600 ||
        !path.startsWith(`chats/${chatId}/`) ||
        path.includes("..")
      ) {
        return reply({ error: "Invalid path" }, 400);
      }

      // Only allow media referenced by a message in this chat.
      const messageQuery = await db
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .where("mediaPath", "==", path)
        .limit(1)
        .get();

      if (messageQuery.empty) {
        return reply({ error: "Media not found in chat" }, 404);
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60);

      if (error || !data?.signedUrl) {
        return reply({ error: "Could not open media" }, 404);
      }

      return reply({ url: data.signedUrl });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("ZChat media error:", error);
    return reply({ error: "Request failed" }, 500);
  }
});

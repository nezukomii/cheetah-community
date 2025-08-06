import { Hono } from 'hono';
import { PartyKitServer } from "partykit/server";
import party from '../party/chat.js';
import bcrypt from 'bcryptjs';
import { handleUpload } from '@vercel/blob/client';

// 1. Inicializa tu API con Hono
const app = new Hono();

// 2. Endpoint para el registro de usuarios
app.post('/api/register', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password || password.length < 4) {
      return c.json({ success: false, error: 'Usuario y contraseña (mín. 4 caracteres) son requeridos.' }, 400);
    }

    const saltRounds = parseInt(c.env.BCRYPT_SALT_ROUNDS, 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = crypto.randomUUID();

    await c.env.DB.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)')
      .bind(userId, username.toLowerCase(), passwordHash)
      .run();

    return c.json({ success: true, message: 'Usuario registrado con éxito.' }, 201);
  } catch (e) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'El nombre de usuario ya está en uso.' }, 409);
    }
    console.error('Error de registro:', e);
    return c.json({ success: false, error: 'Ocurrió un error en el servidor.' }, 500);
  }
});

// 3. Endpoint para el inicio de sesión
app.post('/api/login', async (c) => {
    try {
        const { username, password } = await c.req.json();
        if (!username || !password) {
            return c.json({ success: false, error: 'Usuario y contraseña requeridos.' }, 400);
        }
        
        const userQuery = await c.env.DB.prepare('SELECT id, password_hash, username FROM users WHERE username = ?').bind(username.toLowerCase()).first();

        if (!userQuery) {
            return c.json({ success: false, error: 'Credenciales inválidas.' }, 401);
        }

        const passwordMatch = await bcrypt.compare(password, userQuery.password_hash);
        if (passwordMatch) {
            return c.json({ success: true, username: userQuery.username, userId: userQuery.id });
        } else {
            return c.json({ success: false, error: 'Credenciales inválidas.' }, 401);
        }
    } catch(e) {
        console.error('Error de login:', e);
        return c.json({ success: false, error: 'Ocurrió un error en el servidor.' }, 500);
    }
});

// 4. Endpoint para manejar la subida de archivos a Vercel Blob
app.post('/api/upload', async (c) => {
    const request = c.req.raw;
    try {
        const jsonResponse = await handleUpload({
            body: request.body,
            request: request,
            token: c.env.VERCEL_BLOB_READ_WRITE_TOKEN,
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            onBeforeUpload: async (pathname) => {
                const newPathname = `${crypto.randomUUID()}-${pathname}`;
                return {
                    pathname: newPathname,
                    cacheControlMaxAge: 60,
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Archivo subido exitosamente:', blob.url);
            },
        });

        return c.json(jsonResponse);

    } catch (error) {
        console.error('Error en Vercel Blob Upload:', error);
        return c.json({ message: 'Error al subir el archivo.', error: error.message }, 500);
    }
});

// 5. Enrutador principal que combina Hono y PartyKit
const partykitServer = new PartyKitServer({ party });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Si la petición es para el chat, la maneja PartyKit
    if (url.pathname.startsWith("/party/")) {
      return partykitServer.fetch(request, env, ctx);
    }

    // Para todo lo demás, la maneja la API de Hono
    return app.fetch(request, env, ctx);
  },
};
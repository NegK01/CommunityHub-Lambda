import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Db } from "mongodb";
import { Context } from "aws-lambda";

let isConnected = false;

const connectDb = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("falta la variable de entorno mongodb_uri");
  }

  await mongoose.connect(mongoUri);
  isConnected = true;
};

const enviarRecordatorios = async (db: Db): Promise<{ eventosProximos: number; notificacionesCreadas: number }> => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingEvents = await db
    .collection("events")
    .find({
      estado: "activo",
      fecha: { $gte: now, $lte: in24Hours }
    })
    .toArray();

  let totalNotificaciones = 0;

  for (const ev of upcomingEvents) {
    const registrations = await db
      .collection("registrations")
      .find({
        evento: ev._id,
        estado: "activa"
      })
      .toArray();

    for (const reg of registrations) {
      const alreadyNotified = await db.collection("notifications").findOne({
        usuario: reg.usuario,
        evento: ev._id,
        tipo: "recordatorio"
      });

      if (!alreadyNotified) {
        const fechaFormateada = new Date(ev.fecha).toISOString().split("T")[0];
        await db.collection("notifications").insertOne({
          usuario: reg.usuario,
          evento: ev._id,
          tipo: "recordatorio",
          titulo: `¡recordatorio: ${ev.titulo}!`,
          mensaje: `tu actividad comenzara pronto el ${fechaFormateada} a las ${ev.hora} en ${ev.ubicacion}.`,
          leida: false,
          createdAt: new Date()
        });
        totalNotificaciones++;
      }
    }
  }

  return {
    eventosProximos: upcomingEvents.length,
    notificacionesCreadas: totalNotificaciones
  };
};

const finalizarEventosPasados = async (db: Db): Promise<number> => {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const result = await db.collection("events").updateMany(
    {
      estado: "activo",
      fecha: { $lt: todayStart }
    },
    {
      $set: { estado: "finalizado" }
    }
  );

  return result.modifiedCount;
};

export const handler = async (event: any, context?: Context) => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  try {
    await connectDb();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("no se pudo acceder a la base de datos");
    }

    const { eventosProximos, notificacionesCreadas } = await enviarRecordatorios(db);
    const eventosFinalizados = await finalizarEventosPasados(db);

    const result = {
      message: "proceso de recordatorios y actualizacion completado con exito",
      eventosProximosEncontrados: eventosProximos,
      notificacionesCreadas,
      eventosFinalizados
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error("Error ejecutando la funcion Lambda:", error?.message || error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.message || "error interno en ejecucion serverless"
      })
    };
  }
};

export default handler;

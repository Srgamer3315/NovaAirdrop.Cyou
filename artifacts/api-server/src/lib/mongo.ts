import { MongoClient, type Collection, type Document } from "mongodb";
import MongoStore from "connect-mongo";
import session from "express-session";

export interface ParticipantRecord extends Document {
  xUserId: string;
  username: string;
  name: string;
  profileImageUrl: string | null;
  xVerified: boolean | null;
  xVerifiedType: string | null;
  eligibilityStatus: "eligible";
  firstAuthenticatedAt: Date;
  lastAuthenticatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mongoUri = process.env.MONGODB_URI?.trim();

// In-memory mock collection for local/ephemeral development
class InMemoryParticipantsCollection {
  private store = new Map<string, ParticipantRecord>();

  async createIndex(): Promise<string> {
    return "xUserId_1";
  }

  async findOne(query: { xUserId?: string }): Promise<ParticipantRecord | null> {
    if (!query?.xUserId) return null;
    return this.store.get(query.xUserId) || null;
  }

  async updateOne(
    query: { xUserId: string },
    update: { $set?: Partial<ParticipantRecord>; $setOnInsert?: Partial<ParticipantRecord> },
    options?: { upsert?: boolean },
  ): Promise<{ acknowledged: boolean; modifiedCount: number; upsertedCount: number }> {
    const existing = this.store.get(query.xUserId);
    if (!existing) {
      if (options?.upsert) {
        const record = {
          ...update.$setOnInsert,
          ...update.$set,
          xUserId: query.xUserId,
        } as ParticipantRecord;
        this.store.set(query.xUserId, record);
      }
    } else {
      const updated = {
        ...existing,
        ...update.$set,
      } as ParticipantRecord;
      this.store.set(query.xUserId, updated);
    }
    return { acknowledged: true, modifiedCount: 1, upsertedCount: existing ? 0 : 1 };
  }
}

const inMemoryParticipants = new InMemoryParticipantsCollection();

let realCollectionPromise: Promise<Collection<ParticipantRecord>> | undefined;

export async function getParticipantsCollection(): Promise<Collection<ParticipantRecord>> {
  if (!mongoUri) {
    return inMemoryParticipants as unknown as Collection<ParticipantRecord>;
  }

  if (!realCollectionPromise) {
    realCollectionPromise = (async () => {
      try {
        const uri = new URL(mongoUri);
        const mongoDatabaseName =
          decodeURIComponent(uri.pathname.replace(/^\/+/, "")) || "nova_airdrop";
        const client = new MongoClient(mongoUri, {
          serverSelectionTimeoutMS: 3_000,
        });
        await client.connect();
        const participants = client
          .db(mongoDatabaseName)
          .collection<ParticipantRecord>("participants");
        await participants.createIndex({ xUserId: 1 }, { unique: true });
        return participants;
      } catch (err) {
        console.warn("[AI Studio] MongoDB connection failed, falling back to in-memory store:", err);
        return inMemoryParticipants as unknown as Collection<ParticipantRecord>;
      }
    })();
  }

  return realCollectionPromise;
}

function createSessionStore(): session.Store {
  if (mongoUri) {
    try {
      const uri = new URL(mongoUri);
      const mongoDatabaseName =
        decodeURIComponent(uri.pathname.replace(/^\/+/, "")) || "nova_airdrop";
      return MongoStore.create({
        mongoUrl: mongoUri,
        dbName: mongoDatabaseName,
        collectionName: "nova_airdrop_sessions",
        ttl: 60 * 60 * 24 * 7,
        autoRemove: "interval",
        autoRemoveInterval: 10,
      });
    } catch (err) {
      console.warn("[AI Studio] MongoStore initialization failed, using MemoryStore:", err);
      return new session.MemoryStore();
    }
  }
  return new session.MemoryStore();
}

export const mongoSessionStore = createSessionStore();

import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, createTestUser } from "./helpers";

beforeEach(resetDb);

describe("rooms API", () => {
  it("lets a worker list rooms but not create one", async () => {
    const { token } = await createTestUser("WORKER");

    const create = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomNumber: "201", pricePerNight: 25000 });
    expect(create.status).toBe(403);

    const list = await request(app).get("/api/rooms").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
  });

  it("lets an admin create and update a room", async () => {
    const { token } = await createTestUser("ADMIN");

    const create = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomNumber: "201", type: "Standard", pricePerNight: 25000 });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe("AVAILABLE");

    const update = await request(app)
      .put(`/api/rooms/${create.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "MAINTENANCE" });
    expect(update.status).toBe(200);
    expect(update.body.status).toBe("MAINTENANCE");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/rooms");
    expect(res.status).toBe(401);
  });
});

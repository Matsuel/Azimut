import { afterAll, beforeAll, expect, test } from "bun:test"
import {
    AppError,
    BadGatewayError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    InternalError,
    NotFoundError,
    UnauthorizedError,
} from "../src"
import { startApp } from "../src/testing"

test("chaque erreur porte son statut HTTP, son code et le message anglais du code", () => {
    const cases: [AppError, number, string][] = [
        [new BadRequestError("INVALID_QUERY"), 400, "INVALID_QUERY"],
        [new UnauthorizedError(), 401, "UNAUTHORIZED"],
        [new ForbiddenError(), 403, "ACCESS_DENIED"],
        [new NotFoundError("BACKTEST_NOT_FOUND"), 404, "BACKTEST_NOT_FOUND"],
        [new ConflictError("EXECUTION_IN_PROGRESS"), 409, "EXECUTION_IN_PROGRESS"],
        [new InternalError(), 500, "INTERNAL_ERROR"],
        [new BadGatewayError(), 502, "SERVICE_UNAVAILABLE"],
    ]
    for (const [error, status, code] of cases) {
        expect(error).toBeInstanceOf(AppError)
        expect(error).toMatchObject({ statusCode: status, code })
        expect(error.message.length).toBeGreaterThan(0)
    }
})

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp([
        {
            method: "get",
            path: "/conflict",
            handler: () => {
                throw new ConflictError("EXECUTION_IN_PROGRESS", { executionId: "e1" })
            },
        },
        {
            method: "get",
            path: "/boom",
            handler: () => {
                throw new Error("secret detail")
            },
        },
    ])
})
afterAll(() => app.close())

test("errorMiddleware : AppError → statut et { error, code, ...data }", async () => {
    const response = await app.request("/conflict")
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "An execution is already in progress", code: "EXECUTION_IN_PROGRESS", executionId: "e1" })
})

test("errorMiddleware : erreur inattendue → 500 générique, sans le message interne", async () => {
    const response = await app.request("/boom")
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Internal server error", code: "INTERNAL_ERROR" })
})

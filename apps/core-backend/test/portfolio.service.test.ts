import { expect, test } from "bun:test"
import PortfolioService from "../services/portfolio.service"
import type { IPortfolioRepository } from "../repositories/portfolio.repository"

const portfolioOf = (userId: string) => ({ id: "p1", userId, name: "Principal" }) as never

function serviceWith(getById: IPortfolioRepository["getById"]) {
    const service = new PortfolioService()
    service.repo = { getById } as unknown as IPortfolioRepository
    return service
}

test("un portefeuille est lisible par son propriétaire", async () => {
    const service = serviceWith(async () => portfolioOf("u1"))

    expect(await service.getById("p1", "u1")).toMatchObject({ id: "p1" })
})

test("le portefeuille d'un autre est refusé (403 ACCESS_DENIED)", async () => {
    const service = serviceWith(async () => portfolioOf("autre"))

    expect(await service.getById("p1", "u1").catch((e) => e)).toMatchObject({ code: "ACCESS_DENIED", statusCode: 403 })
})

test("un portefeuille inconnu est introuvable (404 PORTFOLIO_NOT_FOUND)", async () => {
    const service = serviceWith(async () => null)

    expect(await service.getById("p1", "u1").catch((e) => e)).toMatchObject({ code: "PORTFOLIO_NOT_FOUND", statusCode: 404 })
})

function serviceWithRepo(repo: Partial<IPortfolioRepository>) {
    const service = new PortfolioService()
    service.repo = repo as IPortfolioRepository
    return service
}

test("créer un portefeuille l'enregistre au nom de l'utilisateur", async () => {
    const created: unknown[] = []
    const service = serviceWithRepo({
        create: async (data) => {
            created.push(data)
            return { id: "p1", ...data } as never
        },
    })

    expect(await service.create("u1", { name: "Principal" })).toMatchObject({ id: "p1", userId: "u1" })
    expect(created).toEqual([{ userId: "u1", name: "Principal" }])
})

test("la liste renvoie la page demandée avec le total", async () => {
    const service = serviceWithRepo({ getAllByUserId: async () => ({ data: [portfolioOf("u1")], count: 1 }) as never })

    expect(await service.getAll("u1", { page: 2, pageSize: 10 })).toEqual({ data: [portfolioOf("u1")], count: 1, page: 2, pageSize: 10 } as never)
})

test("le propriétaire renomme son portefeuille", async () => {
    const updates: unknown[] = []
    const service = serviceWithRepo({
        getById: async () => portfolioOf("u1"),
        update: async (id, data) => {
            updates.push([id, data])
            return { id, userId: "u1", ...data } as never
        },
    })

    expect(await service.update("p1", "u1", { name: "Retraite" })).toMatchObject({ name: "Retraite" })
    expect(updates).toEqual([["p1", { name: "Retraite" }]])
})

test("renommer ou supprimer le portefeuille d'un autre est refusé sans écriture", async () => {
    let writes = 0
    const service = serviceWithRepo({
        getById: async () => portfolioOf("autre"),
        update: async () => {
            writes++
            return null as never
        },
        delete: async () => {
            writes++
            return null as never
        },
    })

    expect(await service.update("p1", "u1", { name: "x" }).catch((e) => e)).toMatchObject({ statusCode: 403 })
    expect(await service.delete("p1", "u1").catch((e) => e)).toMatchObject({ statusCode: 403 })
    expect(writes).toBe(0)
})

test("le propriétaire supprime son portefeuille", async () => {
    const deleted: string[] = []
    const service = serviceWithRepo({
        getById: async () => portfolioOf("u1"),
        delete: async (id) => {
            deleted.push(id)
            return null as never
        },
    })

    await service.delete("p1", "u1")

    expect(deleted).toEqual(["p1"])
})

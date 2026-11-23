import { beforeEach, expect, test } from "bun:test"
import PricingRepository from "../repositories/pricing.repository"
import { createUser, describeWithDb, resetDatabase } from "./database"
import { optionInput, optionResult, pricingInput, pricingResult } from "./pricing.fixture"

const repo = new PricingRepository()

describeWithDb("PricingRepository (base de test)", () => {
    let userId: string
    beforeEach(async () => {
        await resetDatabase()
        userId = await createUser()
    })

    test("create : demande PENDING avec sa saisie", async () => {
        const record = await repo.create(userId, pricingInput)

        expect(record).toMatchObject({ userId, kind: "BOND", status: "PENDING", input: pricingInput, result: null, error: null })
        expect((await repo.getById(record.id))?.id).toBe(record.id)
    })

    test("complete : première réception gagne, un rejeu ou un échec tardif ne change rien", async () => {
        const { id } = await repo.create(userId, pricingInput)

        expect(await repo.complete(id, pricingResult, new Date())).toBe(true)
        expect(await repo.complete(id, { ...pricingResult }, new Date())).toBe(false)
        expect(await repo.fail(id, "late", new Date())).toBe(false)

        expect(await repo.getById(id)).toMatchObject({ status: "COMPLETED", result: pricingResult, error: null })
    })

    test("fail : PENDING → FAILED avec la cause, un résultat tardif est ignoré", async () => {
        const { id } = await repo.create(userId, pricingInput)

        expect(await repo.fail(id, "outside the rate curve", new Date())).toBe(true)
        expect(await repo.complete(id, pricingResult, new Date())).toBe(false)

        expect(await repo.getById(id)).toMatchObject({ status: "FAILED", error: "outside the rate curve", result: null })
    })

    test("OPTION : saisie et résultat d'option écrits puis relus", async () => {
        const record = await repo.create(userId, optionInput)

        expect(record).toMatchObject({ kind: "OPTION", status: "PENDING", input: optionInput })
        expect(await repo.complete(record.id, optionResult, new Date())).toBe(true)
        expect(await repo.getById(record.id)).toMatchObject({ kind: "OPTION", status: "COMPLETED", result: optionResult })
    })
})

import { expect, test } from "bun:test"
import type { UserDataResetPayload } from "@azimut/contracts"
import type { IAccountRepository } from "../repositories/account.repository"
import AccountService from "../services/account.service"

function setup(deleteUserData: IAccountRepository["deleteUserData"] = async () => {}) {
    const calls: string[] = []
    const published: UserDataResetPayload[] = []
    const service = new AccountService()
    service.repo = {
        deleteUserData: async (userId) => {
            calls.push(userId)
            return deleteUserData(userId)
        },
    }
    service.publish = async (payload) => void published.push(payload)
    return { service, calls, published }
}

test("resetData supprime les données puis publie user.data.reset", async () => {
    const { service, calls, published } = setup()

    await service.resetData("u1")

    expect(calls).toEqual(["u1"])
    expect(published).toEqual([{ userId: "u1" }])
})

test("resetData : la transaction échoue, l'erreur remonte et rien n'est publié", async () => {
    const { service, published } = setup(async () => {
        throw new Error("db down")
    })

    await expect(service.resetData("u1")).rejects.toThrow("db down")
    expect(published).toEqual([])
})

test("resetData : un échec de publication fait échouer l'appel (relançable, la suppression est idempotente)", async () => {
    const { service, calls } = setup()
    service.publish = async () => {
        throw new Error("kafka down")
    }

    await expect(service.resetData("u1")).rejects.toThrow("kafka down")
    expect(calls).toEqual(["u1"])
})
